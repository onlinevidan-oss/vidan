-- ============================================================
-- 0039_no_night_cancel.sql
--   ШӨНӨ ЗАХИАЛГА ЦУЦЛАХГҮЙ
--
--   БОДИТ ТОХИОЛДОЛ: 2026-09-16-нд UB цагаар 23:03-д өгсөн
--   379,900₮-ийн захиалга (#10306, 60 ширхэг, 11 нэр төрөл)
--   шөнийн 01:15-д автоматаар цуцлагдсан. Захиалагч нэхэмжлэхийн
--   хуудас хүртэл очсон (qpay_invoices үүссэн) боловч төлөөгүй —
--   унтсан байх магадлалтай. Өглөө сэрээд төлөх гэхэд захиалга нь
--   алга болсон байна.
--
--   ХЭМЖИЛТ (2026-09-17, захиалгыг UB цагаар нь ангилахад):
--     09:00–12:00   8 захиалга, 25% төлсөн, алдсан   519,895₮
--     12:00–18:00  23 захиалга, 13% төлсөн, алдсан   800,121₮
--     18:00–22:00  16 захиалга, 25% төлсөн, алдсан   483,170₮
--     22:00–09:00  11 захиалга, 18% төлсөн, алдсан 1,916,808₮  ←
--   Шөнийн 11 захиалга нийт алдагдлын 51%-ийг эзэлж байв.
--
--   ШИЙДЭЛ: UB цагаар 22:00–09:00 хооронд цуцлалт хийхгүй. Шөнө
--   хугацаа нь дуусах захиалга өглөөний 09:00 хүртэл амьд үлдэнэ.
--
--   ЗАРДАЛ: нөөц шөнөжин баригдана. Гэвч шөнө хүргэлт байхгүй,
--   шөнийн захиалга ховор (58-аас 11) тул бодит алдагдал бага.
--   Харин 380 мянган төгрөгийн захиалга шөнө үхэх нь тодорхой алдагдал.
--
--   ⚠️ ЭНЭ ДҮРЭМ `src/lib/order-hold.ts`-ТЭЙ ИЖИЛ БАЙХ ЁСТОЙ.
--   Зөрвөл хэрэглэгчид тоолуур дээр "хугацаа дууслаа" гэж худал
--   хэлж, төлөхөө болино.
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
  v_ub_hour int := extract(hour from (now() at time zone 'Asia/Ulaanbaatar'));
begin
  -- ШӨНИЙН ХАМГААЛАЛТ: 22:00–09:00 хооронд юу ч цуцлахгүй.
  -- Өглөө 09:00-д cron дахин ажиллаж, хугацаа нь хэтэрсэн бүхнийг
  -- нэг дор цуцална.
  if v_ub_hour >= 22 or v_ub_hour < 9 then
    return query select 0, 0;
    return;
  end if;

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

  -- 2) Хөдөлгөөнд бүртгэнэ
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
