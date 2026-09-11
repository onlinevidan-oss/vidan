-- ============================================================
-- 0030 · Захиалгын доод дүнг АЖИЛТНААС үл хамаарах болгох
-- ============================================================
-- Шалтгаан: ажилтан туршилтын буюу гар аргаар захиалга үүсгэхэд
-- 20,000₮-ийн доод дүн саад болдог. Хэрэглэгчид доод дүн хэвээрээ.
--
-- calc_order_totals-ын БУСАД логик (хүргэлт, хөнгөлөлт, НӨАТ) огт
-- өөрчлөгдөөгүй — зөвхөн MIN_ORDER_NOT_MET-ийн нөхцөлд is_staff()
-- нэмэгдэв. Гарын үсэг, буцаах төрөл 0026-тай яг ижил.
-- ============================================================

create or replace function public.calc_order_totals(
  p_subtotal   bigint,
  p_item_count int default 0,
  p_discount   bigint default 0
)
returns table(subtotal bigint, discount bigint, shipping bigint, tax bigint, total bigint)
language plpgsql stable
set search_path = public, pg_temp as $$
declare
  v_cfg        jsonb;
  v_min        bigint;
  v_ship_base  bigint;
  v_ship_over  bigint;
  v_qty_thresh int;
  v_free_on    boolean;
  v_free_min   bigint;
  v_shipping   bigint;
  v_tax        bigint;
  v_disc       bigint;
  v_after      bigint;
begin
  select value into v_cfg from public.site_settings where key = 'commerce';
  v_min        := coalesce((v_cfg->>'min_order_amount')::bigint, 20000);
  v_ship_base  := coalesce((v_cfg->>'shipping_base')::bigint, 7000);
  v_ship_over  := coalesce((v_cfg->>'shipping_over')::bigint, 14000);
  v_qty_thresh := coalesce((v_cfg->>'shipping_qty_threshold')::int, 7);
  v_free_on    := coalesce((v_cfg->>'free_shipping_enabled')::boolean, false);
  v_free_min   := coalesce((v_cfg->>'free_shipping_min')::bigint, 50000);

  -- Захиалгын доод дүн нь БАРААНЫ дүнд хамаарна (хөнгөлөлтөөс өмнө).
  -- Ажилтан (staff) энэ хязгаарлалтад үл хамаарна.
  if p_subtotal < v_min and not public.is_staff() then
    raise exception 'MIN_ORDER_NOT_MET' using errcode = 'P0001';
  end if;

  v_disc  := greatest(0::bigint, least(coalesce(p_discount, 0), p_subtotal));
  v_after := p_subtotal - v_disc;

  v_shipping := case when p_item_count > v_qty_thresh then v_ship_over else v_ship_base end;
  if v_free_on and v_after >= v_free_min then
    v_shipping := 0;
  end if;

  v_tax := round(v_after * 0.1);

  return query select p_subtotal, v_disc, v_shipping, v_tax, (v_after + v_shipping + v_tax);
end;
$$;
