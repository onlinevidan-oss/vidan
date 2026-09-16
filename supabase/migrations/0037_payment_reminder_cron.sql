-- ============================================================
-- 0037_payment_reminder_cron.sql
--   САНУУЛГЫН CRON — Vercel дээр биш, Supabase-ээс
--
--   ЯАГААД ЭНД ВЭ: Vercel-ийн Hobby багц өдөрт ГАНЦ удаагийн cron
--   зөвшөөрдөг. Сануулга 10 минут тутам шалгах ёстой (захиалга 25
--   минутын дараа сануулга авах ба 120 минутад цуцлагддаг), тул
--   өдөрт нэг удаа огт таарахгүй. release_stale_orders аль хэдийн
--   pg_cron дээр ажиллаж байгаа тул үүнийг ч мөн тэндээс хөтөлнө.
--
--   pg_net нь HTTP хүсэлтийг дараалалд тавиад шууд буцдаг
--   (fire-and-forget) — cron удаан хүлээхгүй.
--
--   НУУЦ ТҮЛХҮҮР: `private` схем PostgREST-ээр гадагш гардаггүй тул
--   API-аар унших боломжгүй. Утгыг migration-д БИЧИХГҮЙ — git-д
--   орно. Тусад нь set_cron_secret()-ээр суулгана.
-- ============================================================

create extension if not exists pg_net;
create schema if not exists private;

create table if not exists private.cron_secrets (
  key   text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

-- ============================================================
-- Нууц түлхүүр суулгах — зөвхөн service_role
-- ============================================================
create or replace function public.set_cron_secret(p_key text, p_value text)
returns void
language plpgsql
security definer
set search_path = private, pg_temp
as $$
begin
  insert into private.cron_secrets (key, value)
  values (p_key, p_value)
  on conflict (key) do update
    set value = excluded.value, updated_at = now();
end $$;

revoke all on function public.set_cron_secret(text, text) from public, anon, authenticated;
grant execute on function public.set_cron_secret(text, text) to service_role;

-- ============================================================
-- Сануулгын замыг дуудна
-- ============================================================
create or replace function private.send_payment_reminders()
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
  select value into v_secret from private.cron_secrets where key = 'cron_secret';
  select value into v_url    from private.cron_secrets where key = 'site_url';

  -- Тохируулаагүй бол чимээгүй өнгөрнө — cron алдаагаар дүүргэхгүй.
  if v_secret is null or v_url is null then
    return null;
  end if;

  select net.http_get(
    url     := v_url || '/api/cron/payment-reminder',
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_secret),
    timeout_milliseconds := 30000
  ) into v_req;

  return v_req;
end $$;

-- ============================================================
-- 10 минут тутам
-- ============================================================
select cron.unschedule('payment-reminder')
where exists (select 1 from cron.job where jobname = 'payment-reminder');

select cron.schedule(
  'payment-reminder',
  '*/10 * * * *',
  $$select private.send_payment_reminders()$$
);
