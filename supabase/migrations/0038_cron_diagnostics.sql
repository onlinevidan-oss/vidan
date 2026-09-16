-- ============================================================
-- 0038_cron_diagnostics.sql
--   CRON-ЫГ ГАРААР ТУРШИХ
--
--   pg_cron 10 минут тутам ажилладаг тул "ажиллаж байна уу?" гэдгийг
--   шалгахын тулд 10 минут хүлээх нь ашиггүй. Мөн pg_net нь хүсэлтийг
--   дараалалд тавиад шууд буцдаг учир алдаа чимээгүй алга болдог —
--   хариуг нь тусад нь уншиж байж л хүрсэн эсэхийг мэднэ.
--
--   Хоёулаа зөвхөн service_role-д нээлттэй.
-- ============================================================

create or replace function public.trigger_payment_reminder()
returns bigint
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
begin
  return private.send_payment_reminders();
end $$;

revoke all on function public.trigger_payment_reminder() from public, anon, authenticated;
grant execute on function public.trigger_payment_reminder() to service_role;

-- pg_net-ийн хариуг уншина (хүсэлтийн дугаараар)
create or replace function public.read_net_response(p_id bigint)
returns jsonb
language sql
security definer
set search_path = net, public, pg_temp
as $$
  select jsonb_build_object(
    'status', status_code,
    'body',   left(coalesce(content, ''), 500),
    'error',  error_msg
  )
  from net._http_response
  where id = p_id;
$$;

revoke all on function public.read_net_response(bigint) from public, anon, authenticated;
grant execute on function public.read_net_response(bigint) to service_role;
