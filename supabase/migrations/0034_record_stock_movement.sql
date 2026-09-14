-- ============================================================
-- 0034 · Агуулахын хөдөлгөөнийг ТӨРЛӨӨР нь бүртгэх
-- ============================================================
-- Өмнө нь `record_stock_in` нь тоо ширхгийн ТЭМДГЭЭР төрлийг тааж байв
-- (+ бол 'in', − бол 'adjust'). Улмаас:
--   · Админ зарлага бүртгэхийн тулд сөрөг тоо бичихээ мэдэх шаардлагатай
--   · Гараар хийсэн ЗАРЛАГА нь 'adjust' болж, борлуулалтын 'out'-аас
--     ялгагдахгүй
--
-- Энэ функц төрлийг ИЛ авна:
--   'in'     — орлого. p_qty > 0. Үлдэгдэл нэмэгдэнэ.
--   'out'    — зарлага (гэмтэл, дотоод хэрэглээ). p_qty > 0 өгнө,
--              хөдөлгөөнд −p_qty болж бичигдэнэ. Үлдэгдэл хасагдана.
--   'adjust' — тооллогын засвар. p_qty тэмдэгтэй (+/−).
--
-- Борлуулалтын зарлагыг place_order өөрөө 'out' + order_id-тай бичдэг тул
-- гараар хийсэн зарлага нь order_id = null-аараа ялгагдана.
--
-- `record_stock_in` хэвээр үлдэнэ (хуучин дуудлага эвдрэхгүй).
-- ============================================================

create or replace function public.record_stock_movement(
  p_product_id  uuid,
  p_kind        text,
  p_qty         int,
  p_note        text default null,
  p_occurred_at timestamptz default now()
)
returns table(product_id uuid, new_stock int, movement_id uuid)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user  uuid := auth.uid();
  v_delta int;
  v_new   int;
  v_mid   uuid;
begin
  if not public.is_staff() then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;

  if p_kind not in ('in', 'out', 'adjust') then
    raise exception 'INVALID_KIND' using errcode = 'P0001';
  end if;

  if p_qty is null or p_qty = 0 then
    raise exception 'INVALID_QUANTITY' using errcode = 'P0001';
  end if;

  -- Тэмдэгтэй хөдөлгөөн болгож хөрвүүлнэ
  v_delta := case
    when p_kind = 'in'  then abs(p_qty)
    when p_kind = 'out' then -abs(p_qty)
    else p_qty              -- adjust: өгсөн тэмдгээр нь
  end;

  update public.products
     set stock = stock + v_delta,
         updated_at = now()
   where id = p_product_id
  returning stock into v_new;

  if v_new is null then
    raise exception 'PRODUCT_NOT_FOUND' using errcode = 'P0001';
  end if;

  -- Үлдэгдэл сөрөг болохоос сэргийлнэ — агуулахад сөрөг тоо утгагүй
  if v_new < 0 then
    raise exception 'INSUFFICIENT_STOCK' using errcode = 'P0001';
  end if;

  insert into public.stock_movements
    (product_id, kind, quantity, note, occurred_at, created_by)
  values (
    p_product_id,
    p_kind,
    v_delta,
    nullif(btrim(coalesce(p_note, '')), ''),
    coalesce(p_occurred_at, now()),
    v_user
  )
  returning id into v_mid;

  return query select p_product_id, v_new, v_mid;
end $$;

grant execute on function
  public.record_stock_movement(uuid, text, int, text, timestamptz)
  to authenticated;
