-- ============================================================
-- 0010_min_order_shipping.sql
--   · Хүргэлтийн суурь төлбөр 5,000₮ → 8,000₮
--   · Захиалгын доод дүн 20,000₮ — үүнээс бага бол place_order амжилтгүй
--     (client-ийн шалгалтыг тойрч гарах боломжгүй, server-side хамгаалалт)
-- ============================================================

create or replace function public.calc_order_totals(p_subtotal bigint)
returns table(subtotal bigint, shipping bigint, tax bigint, total bigint)
language plpgsql immutable
set search_path = public, pg_temp as $$
declare
  v_shipping bigint;
  v_tax      bigint;
begin
  -- Захиалгын доод дүн — place_order транзакцыг бүхэлд нь rollback хийнэ
  if p_subtotal < 20000 then
    raise exception 'MIN_ORDER_NOT_MET' using errcode = 'P0001';
  end if;
  v_shipping := case when p_subtotal >= 50000 then 0 else 8000 end;
  v_tax      := round(p_subtotal * 0.1);
  return query select p_subtotal, v_shipping, v_tax, p_subtotal + v_shipping + v_tax;
end $$;
