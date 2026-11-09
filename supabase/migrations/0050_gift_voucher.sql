-- ============================================================
-- 0050_gift_voucher.sql
--   Эрхийн бичиг (gift voucher) — тодорхой дүнгийн (жнь. 200,000₮)
--   худалдан авалтын эрх.
--
--   Эзний шийдвэр (2026-11-09):
--     · Хэд хуваан ашиглана — үлдэгдэл хадгалагдана.
--     · Хүргэлтийн төлбөрийг ч хаана (бараа + хүргэлт + НӨАТ — нийт дүнгээс).
--     · Хүчинтэй хугацаатай (эхнийх нь 2026-12-31).
--
--   Ажиллах зарчим:
--     1) Хэрэглэгч нэвтрээд захиалга дээр промо кодын талбарт кодоо бичнэ.
--     2) place_order кодыг эхлээд эрхийн бичгээс хайна. Олдвол:
--        · анх ашиглаж буй хүнд эрхийн бичгийг холбоно (user_id) —
--          дараа нь өөр хүн ашиглаж чадахгүй;
--        · үлдэгдлээс захиалгын НИЙТ дүн хүртэлх хэсгийг хасна
--          (orders.voucher_amount); total = төлөх үлдэгдэл.
--     3) total = 0 бол QPay-гүйгээр шууд төлөгдсөнд тооцогдоно
--        (mark_order_paid_by_voucher — серверээс л дуудна).
--     4) Үлдэгдэл = дүн − цуцлагдаагүй захиалгад зарцуулсан. Төлөөгүй
--        орхисон захиалга цуцлагдвал (0029) үлдэгдэл өөрөө буцна.
--
--   Хөнгөлөлтийн карт (0049) бараанаас 5% хасаад, эрхийн бичиг үлдсэн
--   нийт дүнг хаана. Нэг захиалгад промо код ба эрхийн бичиг хоёр зэрэг
--   орохгүй (нэг л талбар).
--   Идемпотент.
-- ============================================================

-- ---------- 1) Хүснэгтүүд ----------
create table if not exists public.gift_vouchers (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique check (code ~ '^[A-Z0-9]{6,20}$'),
  amount     bigint not null check (amount > 0),
  ends_at    timestamptz,
  is_active  boolean not null default true,
  -- Анх ашигласан хэрэглэгч — түүнээс хойш зөвхөн тэр ашиглана
  user_id    uuid references public.profiles(id) on delete set null,
  note       text check (note is null or length(note) <= 200),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.gift_voucher_uses (
  id         uuid primary key default gen_random_uuid(),
  voucher_id uuid not null references public.gift_vouchers(id) on delete restrict,
  order_id   uuid not null unique references public.orders(id) on delete cascade,
  user_id    uuid references public.profiles(id) on delete set null,
  amount     bigint not null check (amount > 0),
  created_at timestamptz not null default now()
);
create index if not exists gift_voucher_uses_voucher_idx on public.gift_voucher_uses (voucher_id);

alter table public.gift_vouchers     enable row level security;
alter table public.gift_voucher_uses enable row level security;

drop policy if exists "Vouchers: staff read"  on public.gift_vouchers;
drop policy if exists "Vouchers: admin write" on public.gift_vouchers;
drop policy if exists "Voucher uses: staff read" on public.gift_voucher_uses;
create policy "Vouchers: staff read" on public.gift_vouchers
  for select using (public.is_staff());
create policy "Vouchers: admin write" on public.gift_vouchers
  for all using (public.is_admin()) with check (public.is_admin());
create policy "Voucher uses: staff read" on public.gift_voucher_uses
  for select using (public.is_staff());
-- Хэрэглэгч өөрийн эрхийн бичгийг my_gift_voucher()-аар л харна

-- ---------- 2) Захиалга дээрх эрхийн бичгээр төлсөн дүн ----------
alter table public.orders
  add column if not exists voucher_amount bigint not null default 0;
alter table public.orders drop constraint if exists orders_voucher_amount_check;
alter table public.orders
  add constraint orders_voucher_amount_check check (voucher_amount >= 0);

-- ---------- 3) Үлдэгдэл ----------
create or replace function public.gift_voucher_balance(p_voucher_id uuid)
returns bigint
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select v.amount - coalesce((
    select sum(u.amount)
      from public.gift_voucher_uses u
      join public.orders o on o.id = u.order_id
     where u.voucher_id = v.id and o.status <> 'cancelled'
  ), 0)::bigint
  from public.gift_vouchers v
  where v.id = p_voucher_id;
$$;
revoke all on function public.gift_voucher_balance(uuid) from public, anon, authenticated;

-- ---------- 4) Checkout-д: кодоо бичихэд үлдэгдлийг харуулна ----------
-- error: NOT_FOUND / INACTIVE / EXPIRED / OTHER_USER / EMPTY
create or replace function public.my_gift_voucher(p_code text)
returns table(valid boolean, code text, balance bigint, ends_at timestamptz, error text)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v      record;
  v_bal  bigint;
begin
  select * into v from public.gift_vouchers g
   where g.code = upper(btrim(coalesce(p_code, '')));
  if not found or v_user is null then
    return query select false, null::text, 0::bigint, null::timestamptz, 'NOT_FOUND'::text; return;
  end if;
  if not v.is_active then
    return query select false, v.code, 0::bigint, v.ends_at, 'INACTIVE'::text; return;
  end if;
  if v.ends_at is not null and now() > v.ends_at then
    return query select false, v.code, 0::bigint, v.ends_at, 'EXPIRED'::text; return;
  end if;
  if v.user_id is not null and v.user_id <> v_user then
    return query select false, v.code, 0::bigint, v.ends_at, 'OTHER_USER'::text; return;
  end if;
  v_bal := public.gift_voucher_balance(v.id);
  if v_bal <= 0 then
    return query select false, v.code, 0::bigint, v.ends_at, 'EMPTY'::text; return;
  end if;
  return query select true, v.code, v_bal, v.ends_at, null::text;
end $$;
revoke all on function public.my_gift_voucher(text) from public, anon;
grant execute on function public.my_gift_voucher(text) to authenticated;

-- ---------- 5) place_order — эрхийн бичиг ----------
-- 0049-ийнхтэй ижил; промо кодын талбарт эрхийн бичгийн код ирвэл
-- промо биш эрхийн бичгээр бодно.
create or replace function public.place_order(
  p_address_id uuid,
  p_payment_method text,
  p_items jsonb,
  p_driver_notes text default null,
  p_promo_code text default null
)
returns table(order_id uuid, order_number text, total bigint)
language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  v_user_id uuid := auth.uid();
  v_item jsonb;
  v_pid uuid;
  v_qty int;
  v_subtotal bigint := 0;
  v_item_count int := 0;
  v_totals record;
  v_order_id uuid;
  v_order_number text;
  v_rowcount int;
  v_address_owner uuid;
  v_promo record;
  v_discount bigint := 0;
  v_promo_disc bigint := 0;
  v_promo_id uuid;
  v_code text;
  v_card record;
  v_voucher record;
  v_voucher_bal bigint := 0;
  v_voucher_amt bigint := 0;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = 'P0001';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_CART' using errcode = 'P0001';
  end if;
  if p_address_id is not null then
    select user_id into v_address_owner from public.addresses where id = p_address_id;
    if v_address_owner is null or v_address_owner <> v_user_id then
      raise exception 'INVALID_ADDRESS' using errcode = 'P0001';
    end if;
  end if;
  if p_payment_method not in ('qpay','card','cash','toki','socialpay') then
    raise exception 'INVALID_PAYMENT_METHOD' using errcode = 'P0001';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_pid := (v_item->>'product_id')::uuid;
    v_qty := (v_item->>'quantity')::int;
    if v_qty <= 0 then
      raise exception 'INVALID_QUANTITY' using errcode = 'P0001';
    end if;

    update public.products
      set stock = stock - v_qty
      where id = v_pid and is_active = true and stock >= v_qty;

    get diagnostics v_rowcount = row_count;
    if v_rowcount = 0 then
      raise exception 'INSUFFICIENT_STOCK:%', v_pid using errcode = 'P0001';
    end if;

    select v_subtotal + (price * v_qty) into v_subtotal
      from public.products where id = v_pid;
    v_item_count := v_item_count + v_qty;
  end loop;

  v_code := nullif(btrim(coalesce(p_promo_code, '')), '');

  -- ---------- ЭРХИЙН БИЧИГ ----------
  -- Мөрийг түгжинэ: зэрэг хоёр захиалга нэг үлдэгдлийг давхар зарцуулахгүй
  -- Код байхгүй үед ч ажиллуулна — record хоосон (null) утгаар оноогдоно
  select * into v_voucher from public.gift_vouchers g
   where v_code is not null and g.code = upper(v_code)
   for update;

  if v_voucher.id is not null then
    if not v_voucher.is_active then
      raise exception 'VOUCHER_INVALID:INACTIVE' using errcode = 'P0001';
    end if;
    if v_voucher.ends_at is not null and now() > v_voucher.ends_at then
      raise exception 'VOUCHER_INVALID:EXPIRED' using errcode = 'P0001';
    end if;
    if v_voucher.user_id is not null and v_voucher.user_id <> v_user_id then
      raise exception 'VOUCHER_INVALID:OTHER_USER' using errcode = 'P0001';
    end if;
    v_voucher_bal := public.gift_voucher_balance(v_voucher.id);
    if v_voucher_bal <= 0 then
      raise exception 'VOUCHER_INVALID:EMPTY' using errcode = 'P0001';
    end if;
  elsif v_code is not null then
    -- ---------- ПРОМО КОД ----------
    select * into v_promo
      from public.validate_promo(v_code, v_user_id, v_subtotal);
    if not v_promo.valid then
      raise exception 'PROMO_INVALID:%', v_promo.error using errcode = 'P0001';
    end if;
    v_promo_disc := v_promo.discount;
    v_promo_id := v_promo.promo_id;
  end if;

  -- ---------- КАРТ (QR-аар идэвхжүүлсэн) ----------
  select * into v_card
    from public.card_discount_for(v_user_id, v_subtotal, true);
  if v_card.promo_id is not null then
    v_card.discount := least(v_card.discount, v_subtotal - v_promo_disc);
  end if;
  v_discount := v_promo_disc + coalesce(greatest(v_card.discount, 0), 0);

  select * into v_totals
    from public.calc_order_totals(v_subtotal, v_item_count, v_discount);

  -- Эрхийн бичиг НИЙТ дүнгээс (хүргэлт, НӨАТ орно)
  if v_voucher.id is not null then
    v_voucher_amt := least(v_voucher_bal, v_totals.total);
  end if;

  insert into public.orders (
    user_id, address_id, status, payment_method, payment_status,
    subtotal, discount, shipping, tax, total, promo_code, driver_notes,
    voucher_amount
  )
  values (
    v_user_id, p_address_id, 'new', p_payment_method, 'pending',
    v_totals.subtotal, v_totals.discount, v_totals.shipping, v_totals.tax,
    v_totals.total - v_voucher_amt,
    case when v_voucher.id is null then v_code end,
    p_driver_notes,
    v_voucher_amt
  )
  returning id, public.orders.order_number into v_order_id, v_order_number;

  insert into public.order_items (order_id, product_id, product_name, product_sku, quantity, unit_price, subtotal)
  select v_order_id, p.id, p.name_mn, p.sku,
    (item->>'quantity')::int, p.price, p.price * (item->>'quantity')::int
  from jsonb_array_elements(p_items) item
  join public.products p on p.id = (item->>'product_id')::uuid;

  insert into public.stock_movements (product_id, kind, quantity, order_id, note, created_by)
  select (item->>'product_id')::uuid,
         'out',
         -((item->>'quantity')::int),
         v_order_id,
         'Захиалга ' || v_order_number,
         v_user_id
  from jsonb_array_elements(p_items) item;

  if v_promo_id is not null then
    insert into public.promo_redemptions (promo_id, order_id, user_id, discount)
    values (v_promo_id, v_order_id, v_user_id, v_promo_disc);

    update public.promotions
       set usage_count = usage_count + 1
     where id = v_promo_id;
  end if;

  if v_card.promo_id is not null and v_card.discount > 0 then
    insert into public.promo_redemptions (promo_id, order_id, user_id, discount)
    values (v_card.promo_id, v_order_id, v_user_id, v_card.discount);

    update public.promotions
       set usage_count = usage_count + 1
     where id = v_card.promo_id;
  end if;

  if v_voucher_amt > 0 then
    update public.gift_vouchers
       set user_id = coalesce(user_id, v_user_id)
     where id = v_voucher.id;

    insert into public.gift_voucher_uses (voucher_id, order_id, user_id, amount)
    values (v_voucher.id, v_order_id, v_user_id, v_voucher_amt);
  end if;

  insert into public.order_events (order_id, event_type, description)
  values (v_order_id, 'created', 'Захиалга үүссэн');

  if v_voucher_amt > 0 then
    insert into public.order_events (order_id, event_type, description)
    values (v_order_id, 'voucher_applied',
            'Эрхийн бичиг ' || v_voucher.code || ': ' || v_voucher_amt || '₮');
  end if;

  return query select v_order_id, v_order_number, v_totals.total - v_voucher_amt;
end $$;
grant execute on function public.place_order(uuid, text, jsonb, text, text) to authenticated;

-- ---------- 6) Бүтэн дүнг эрхийн бичиг хаасан захиалга → шууд төлөгдсөн ----------
-- Буцаах утга: энэ дуудлагаар ШИНЭЭР төлөгдсөн эсэх (true үед л мэдэгдэл илгээнэ).
-- Зөвхөн сервер (service_role) дуудна. total = 0, эрхийн бичигтэй, хүлээгдэж
-- буй захиалгад л ажиллана — өөр захиалгыг "төлөгдсөн" болгох боломжгүй.
create or replace function public.mark_order_paid_by_voucher(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v record;
begin
  select id, total, voucher_amount, payment_status, status
    into v from public.orders where id = p_order_id for update;
  if not found then return false; end if;
  -- Аль хэдийн төлөгдсөн бол false — мэдэгдэл давхар явахгүй
  if v.payment_status = 'paid' then return false; end if;
  if v.total <> 0 or v.voucher_amount <= 0
     or v.payment_status <> 'pending' or v.status = 'cancelled' then
    return false;
  end if;

  update public.orders
     set payment_status = 'paid',
         payment_ref = 'VOUCHER'
   where id = p_order_id;

  insert into public.order_events (order_id, event_type, description)
  values (p_order_id, 'payment_paid', 'Бүтэн дүнг эрхийн бичгээр төлсөн');

  return true;
end $$;
revoke all on function public.mark_order_paid_by_voucher(uuid) from public, anon, authenticated;
grant execute on function public.mark_order_paid_by_voucher(uuid) to service_role;

-- ---------- 7) Өөрийгөө шалгах ----------
do $$
declare r record;
begin
  -- Нэвтрээгүй үед эрхийн бичгийн мэдээлэл гарахгүй
  select * into r from public.my_gift_voucher('ANYCODE1');
  if r.valid or r.error <> 'NOT_FOUND' then
    raise exception 'my_gift_voucher нэвтрээгүйд %', r.error;
  end if;
end $$;
