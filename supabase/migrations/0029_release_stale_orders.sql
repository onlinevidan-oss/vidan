-- ============================================================
-- 0029_release_stale_orders.sql
--   ТӨЛӨГДӨӨГҮЙ ЗАХИАЛГЫН НӨӨЦИЙГ СУЛЛАХ
--
--   АСУУДАЛ: place_order нь захиалга үүсэх мөчид products.stock-оос
--   шууд хасдаг. Хэрэглэгч QPay дээр төлбөрөө хийхгүй орхивол тэр нөөц
--   ҮҮРД баригдаж үлддэг — буцаах механизм байхгүй байв.
--
--   ХЭМЖЭЭ (2026-09-08): 43 төлөгдөөгүй захиалга 474 ширхэг нөөц барьж,
--   17 нэр төрөл "дуусах дөхсөн" болж харагдаж байв. Өргөст хэмх 720г
--   6 ширхэг үлдсэн мэт харагдаж байсан ч бодитоор 63 ширхэг байсан.
--   Нөөц 0 болмогц place_order шинэ захиалгыг ТАТГАЛЗдаг тул борлуулалт
--   шууд алдагдана.
--
--   ШИЙДЭЛ: тодорхой хугацаанд төлөгдөөгүй захиалгыг хаягдсан гэж үзэж,
--   цуцлаад нөөцийг нь буцаана. pg_cron-оор 15 минут тутам ажиллана.
--
--   ЯАГААД ХАСАХАА БОЛИХГҮЙ ВЭ: захиалга үүсэх үед нөөц хасдаг нь зөв —
--   эс тэгвэл төлбөр хийж байх хооронд ижил барааг хэд хэдэн хүн
--   захиалж, дараа нь хүргэх бараагүй болно. Асуудал нь хасалт биш,
--   суллах механизм байхгүйд байсан.
-- ============================================================

create extension if not exists pg_cron;

-- ============================================================
-- Хаягдсан захиалгыг цуцалж, нөөцийг буцаана
--   p_minutes — үүнээс удаан төлөгдөөгүй бол хаягдсан гэж үзнэ
-- ============================================================
create or replace function public.release_stale_orders(p_minutes int default 120)
returns table(released_orders int, restored_units int)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_orders int := 0;
  v_units  int := 0;
  v_cutoff timestamptz := now() - make_interval(mins => greatest(p_minutes, 1));
begin
  -- Хаягдсан захиалгууд.
  -- Нэг session-д дахин дуудагдвал мөргөлдөхгүйн тулд эхлээд устгана.
  drop table if exists _stale;
  create temp table _stale on commit drop as
  select id, order_number
    from public.orders
   where payment_status = 'pending'
     and status <> 'cancelled'
     and created_at < v_cutoff;

  if not exists (select 1 from _stale) then
    return query select 0, 0;
    return;
  end if;

  -- 1) Нөөцийг буцаана
  with back as (
    select oi.product_id, sum(oi.quantity)::int as qty
      from public.order_items oi
      join _stale s on s.id = oi.order_id
     where oi.product_id is not null
     group by oi.product_id
  )
  update public.products p
     set stock = p.stock + b.qty,
         updated_at = now()
    from back b
   where p.id = b.product_id;

  select coalesce(sum(oi.quantity), 0)::int into v_units
    from public.order_items oi
    join _stale s on s.id = oi.order_id
   where oi.product_id is not null;

  -- 2) Хөдөлгөөнд бүртгэнэ (0028 ажилласан бол)
  if to_regclass('public.stock_movements') is not null then
    insert into public.stock_movements (product_id, kind, quantity, order_id, note)
    select oi.product_id, 'in', oi.quantity, s.id,
           'Төлөгдөөгүй захиалга цуцлагдав ' || s.order_number
      from public.order_items oi
      join _stale s on s.id = oi.order_id
     where oi.product_id is not null;
  end if;

  -- 3) Захиалгыг цуцална
  update public.orders o
     set status = 'cancelled',
         payment_status = 'failed',
         cancelled_at = now(),
         cancelled_reason = 'Төлбөр хийгдээгүй тул автоматаар цуцлагдав',
         updated_at = now()
    from _stale s
   where o.id = s.id;

  get diagnostics v_orders = row_count;

  insert into public.order_events (order_id, event_type, description)
  select s.id, 'cancelled',
         'Төлбөр ' || p_minutes || ' минутын дотор хийгдээгүй тул автоматаар цуцлагдаж, нөөц буцаагдав'
    from _stale s;

  return query select v_orders, v_units;
end $$;

grant execute on function public.release_stale_orders(int) to service_role;

-- ============================================================
-- 15 минут тутам — хаягдсан захиалга удаан гацахгүй байх
-- ============================================================
select cron.unschedule('release-stale-orders')
where exists (select 1 from cron.job where jobname = 'release-stale-orders');

select cron.schedule(
  'release-stale-orders',
  '*/15 * * * *',
  $$select public.release_stale_orders(120)$$
);

-- ============================================================
-- ХУРИМТЛАГДСАН ЗАХИАЛГЫГ НЭГ УДАА ЦЭВЭРЛЭХ
--   Одоо байгаа 43 хаягдсан захиалгын 474 ширхэг нөөцийг буцаана.
--   2 цагаас дотор үүссэн захиалгад ХҮРЭХГҮЙ — тэдгээр төлөгдөж
--   магадгүй.
-- ============================================================
do $$
declare r record;
begin
  select * into r from public.release_stale_orders(120);
  raise notice 'Цуцлагдсан захиалга: %, буцаагдсан нөөц: % ширхэг',
    r.released_orders, r.restored_units;
end $$;
