-- ============================================================
-- 0009_qpay.sql
-- QPay v2 онлайн төлбөрийн интеграц
--   · qpay_tokens   — access token-ийн DB cache (timestamp-аар нэг л удаа авна)
--   · qpay_invoices — order ↔ qPay invoice холбоос + QR мэдээлэл
--   · mark_order_paid() — callback/check-ээс төлбөр баталгаажуулах
-- ============================================================

-- ------------------------------------------------------------
-- QPay access token cache (singleton row, id = 1)
--   Серверлесс орчинд memory cache найдваргүй тул DB-д хадгална.
--   getAccessToken() нь expires_at > now() үед дахин авахгүй.
-- ------------------------------------------------------------
create table if not exists public.qpay_tokens (
  id            int primary key default 1 check (id = 1),
  access_token  text not null,
  refresh_token text,
  expires_at    timestamptz not null,
  updated_at    timestamptz not null default now()
);

-- Зөвхөн service_role (admin client) хандана. authenticated/anon-д policy өгөхгүй.
alter table public.qpay_tokens enable row level security;

-- ------------------------------------------------------------
-- QPay invoices — захиалга бүрийн нэхэмжлэлийн мэдээлэл
-- ------------------------------------------------------------
create table if not exists public.qpay_invoices (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null unique references public.orders(id) on delete cascade,
  invoice_id      text not null,            -- qPay invoice_id
  qr_text         text,                     -- QR-ийн түүхий текст
  qr_image        text,                     -- base64 PNG (data URI-гүй)
  qpay_short_url  text,                     -- богино холбоос
  urls            jsonb,                    -- банкны апп-уудын deeplink жагсаалт
  amount          bigint not null,
  status          text not null default 'pending'
                    check (status in ('pending', 'paid', 'cancelled', 'expired')),
  qpay_payment_id text,                     -- төлөгдсөний дараа QPay payment_id
  paid_at         timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists qpay_invoices_order_idx on public.qpay_invoices (order_id);
create index if not exists qpay_invoices_invoice_idx on public.qpay_invoices (invoice_id);

create trigger qpay_invoices_set_updated_at
  before update on public.qpay_invoices
  for each row execute function public.set_updated_at();

alter table public.qpay_invoices enable row level security;

-- Хэрэглэгч зөвхөн өөрийн захиалгын нэхэмжлэлийг харна (polling-д хэрэгтэй).
drop policy if exists "qpay_invoices_select_own" on public.qpay_invoices;
create policy "qpay_invoices_select_own" on public.qpay_invoices
  for select to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = qpay_invoices.order_id
        and o.user_id = auth.uid()
    )
  );

-- Insert/update нь зөвхөн service_role-оор (admin client) явна — policy өгөхгүй.

-- ------------------------------------------------------------
-- mark_order_paid — төлбөр баталгаажсаны дараа атомик шинэчлэл
--   callback болон polling check хоёулаа дуудна (idempotent).
-- ------------------------------------------------------------
create or replace function public.mark_order_paid(
  p_order_id uuid,
  p_payment_ref text default null,
  p_qpay_payment_id text default null
)
returns boolean
language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  v_already text;
begin
  -- Аль хэдийн төлөгдсөн бол давхар бичихгүй (idempotent)
  select payment_status into v_already from public.orders where id = p_order_id;
  if v_already is null then
    return false;
  end if;
  if v_already = 'paid' then
    return true;
  end if;

  update public.orders
    set payment_status = 'paid',
        payment_ref = coalesce(p_payment_ref, payment_ref)
    where id = p_order_id;

  update public.qpay_invoices
    set status = 'paid',
        qpay_payment_id = coalesce(p_qpay_payment_id, qpay_payment_id),
        paid_at = now()
    where order_id = p_order_id;

  insert into public.order_events (order_id, event_type, description)
  values (p_order_id, 'payment_paid', 'Төлбөр амжилттай төлөгдсөн (QPay)');

  return true;
end $$;

-- Зөвхөн service_role дуудна (callback + polling нь admin client-ээр).
revoke all on function public.mark_order_paid(uuid, text, text) from public;
grant execute on function public.mark_order_paid(uuid, text, text) to service_role;
