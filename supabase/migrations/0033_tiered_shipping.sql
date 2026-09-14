-- ============================================================
-- 0033 · Хүргэлтийн шатлалт үнэ
-- ============================================================
--   1 … 7 ш    → 7,000₮
--   8 … 15 ш   → 14,000₮
--   15-аас дээш → 10 ширхэг тутамд +7,000₮
--                 (16–25ш → 21,000 · 26–35ш → 28,000 · 36–45ш → 35,000)
--
-- Шинэ тохиргоо (site_settings.commerce):
--   shipping_tier2_max   — 2-р шатны дээд ширхэг (15)
--   shipping_step_qty    — дээш нь хэдэн ширхэг тутамд (10)
--   shipping_step_price  — тэр тутамд нэмэгдэх төлбөр (7,000)
--
-- src/lib/pricing.ts::shippingForQty-тэй яг ижил логиктой байх ёстой.
-- ============================================================

-- 1) Одоо байгаа тохиргоонд шинэ түлхүүрүүдийг нэмнэ (байхгүй бол)
update public.site_settings
set value = value
      || jsonb_build_object(
           'shipping_tier2_max',  coalesce(value->'shipping_tier2_max',  '15'::jsonb),
           'shipping_step_qty',   coalesce(value->'shipping_step_qty',   '10'::jsonb),
           'shipping_step_price', coalesce(value->'shipping_step_price', '7000'::jsonb)
         ),
    updated_at = now()
where key = 'commerce';

-- 2) Тооцооллын функц
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
  v_tier2_max  int;
  v_step_qty   int;
  v_step_price bigint;
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
  v_tier2_max  := coalesce((v_cfg->>'shipping_tier2_max')::int, 15);
  v_step_qty   := greatest(1, coalesce((v_cfg->>'shipping_step_qty')::int, 10));
  v_step_price := coalesce((v_cfg->>'shipping_step_price')::bigint, 7000);
  v_free_on    := coalesce((v_cfg->>'free_shipping_enabled')::boolean, false);
  v_free_min   := coalesce((v_cfg->>'free_shipping_min')::bigint, 50000);

  -- Захиалгын доод дүн нь БАРААНЫ дүнд хамаарна (хөнгөлөлтөөс өмнө).
  -- Ажилтан (staff) энэ хязгаарлалтад үл хамаарна.
  if p_subtotal < v_min and not public.is_staff() then
    raise exception 'MIN_ORDER_NOT_MET' using errcode = 'P0001';
  end if;

  v_disc  := greatest(0::bigint, least(coalesce(p_discount, 0), p_subtotal));
  v_after := p_subtotal - v_disc;

  -- Хүргэлт: гурван шаттай
  if p_item_count <= v_qty_thresh then
    v_shipping := v_ship_base;
  elsif p_item_count <= v_tier2_max then
    v_shipping := v_ship_over;
  else
    v_shipping := v_ship_over
      + ceil((p_item_count - v_tier2_max)::numeric / v_step_qty)::bigint * v_step_price;
  end if;

  if v_free_on and v_after >= v_free_min then
    v_shipping := 0;
  end if;

  -- Бараанд НӨАТ нэмэгдэхгүй (үнэд шингэсэн). Зөвхөн хүргэлтийн үнэн дээр.
  v_tax := round(v_shipping * 0.1);

  return query select p_subtotal, v_disc, v_shipping, v_tax, (v_after + v_shipping + v_tax);
end;
$$;
