-- ============================================================
-- 0047_sms_broadcast.sql
--   Масс SMS — бүртгэлтэй бүх дугаар руу хуваарьт цагт.
--
--   sms_broadcasts      — нэг илгээлт = нэг мөр (текст, хэзээ, төлөв)
--   sms_broadcast_log   — дугаар бүр нэг мөр. (broadcast_id, phone)
--                         unique тул cron давхар ажилласан ч нэг дугаарт
--                         нэг л удаа очно: илгээхээс ӨМНӨ мөрөө авна.
--
--   Cron 5 минут тутам /api/cron/sms-broadcast-ийг дуудна (0037-ийн
--   загвараар, нууц түлхүүр private.cron_secrets-д).
--
--   Идемпотент.
-- ============================================================

create table if not exists public.sms_broadcasts (
  id          uuid primary key default gen_random_uuid(),
  text        text not null check (length(btrim(text)) > 0 and length(text) <= 300),
  send_at     timestamptz not null,
  status      text not null default 'scheduled'
                check (status in ('scheduled', 'sending', 'sent', 'cancelled')),
  recipients  int,
  sent        int not null default 0,
  failed      int not null default 0,
  started_at  timestamptz,
  finished_at timestamptz,
  created_by  uuid references public.staff(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists sms_broadcasts_due_idx
  on public.sms_broadcasts (send_at) where status in ('scheduled', 'sending');

create table if not exists public.sms_broadcast_log (
  broadcast_id uuid not null references public.sms_broadcasts(id) on delete cascade,
  phone        text not null,
  ok           boolean,
  error        text,
  created_at   timestamptz not null default now(),
  primary key (broadcast_id, phone)
);

alter table public.sms_broadcasts enable row level security;
alter table public.sms_broadcast_log enable row level security;

drop policy if exists "Broadcasts: admin read" on public.sms_broadcasts;
create policy "Broadcasts: admin read" on public.sms_broadcasts
  for select using (public.is_admin());
drop policy if exists "Broadcasts: admin insert" on public.sms_broadcasts;
create policy "Broadcasts: admin insert" on public.sms_broadcasts
  for insert with check (public.is_admin());
-- Зөвхөн хүлээгдэж буйг цуцлах — илгээгдэж буй/дууссаныг өөрчлөхгүй
drop policy if exists "Broadcasts: admin cancel" on public.sms_broadcasts;
create policy "Broadcasts: admin cancel" on public.sms_broadcasts
  for update using (public.is_admin() and status = 'scheduled')
  with check (public.is_admin() and status in ('scheduled', 'cancelled'));

drop policy if exists "Broadcast log: admin read" on public.sms_broadcast_log;
create policy "Broadcast log: admin read" on public.sms_broadcast_log
  for select using (public.is_admin());

-- ---------- Cron ----------
create or replace function private.send_sms_broadcasts()
returns bigint
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
declare
  v_secret text;
  v_url    text;
  v_req    bigint;
begin
  -- Цаг нь болсон илгээлт байхгүй бол HTTP дуудахгүй
  if not exists (
    select 1 from public.sms_broadcasts
     where status in ('scheduled', 'sending') and send_at <= now()
  ) then
    return null;
  end if;

  select value into v_secret from private.cron_secrets where key = 'cron_secret';
  select value into v_url    from private.cron_secrets where key = 'site_url';
  if v_secret is null or v_url is null then
    return null;
  end if;

  select net.http_get(
    url     := v_url || '/api/cron/sms-broadcast',
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_secret),
    timeout_milliseconds := 60000
  ) into v_req;
  return v_req;
end $$;

select cron.unschedule('sms-broadcast')
where exists (select 1 from cron.job where jobname = 'sms-broadcast');

select cron.schedule(
  'sms-broadcast',
  '*/5 * * * *',
  $$select private.send_sms_broadcasts()$$
);
