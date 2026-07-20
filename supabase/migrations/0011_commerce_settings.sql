-- ============================================================
-- 0011_commerce_settings.sql
--   Худалдааны тохиргоог site_settings('commerce')-д төвлөрүүлж,
--   админ хэсгээс удирддаг болгов:
--     · min_order_amount      — захиалгын доод дүн (₮)
--     · shipping_base         — хүргэлтийн төлбөр (₮)
--     · free_shipping_enabled — үнэгүй хүргэлт идэвхтэй эсэх
--     · free_shipping_min     — үнэгүй хүргэлтийн босго (₮)
--   calc_order_totals эдгээрийг DB-ээс уншина (hardcode байхгүй).
-- ============================================================

insert into public.site_settings (key, value)
values (
  'commerce',
  jsonb_build_object(
    'min_order_amount',      20000,
    'shipping_base',         8000,
    'free_shipping_enabled', false,
    'free_shipping_min',     50000
  )
)
on conflict (key) do nothing;

create or replace function public.calc_order_totals(p_subtotal bigint)
returns table(subtotal bigint, shipping bigint, tax bigint, total bigint)
language plpgsql stable
set search_path = public, pg_temp as $$
declare
  v_cfg       jsonb;
  v_min       bigint;
  v_ship_base bigint;
  v_free_on   boolean;
  v_free_min  bigint;
  v_shipping  bigint;
  v_tax       bigint;
begin
  select value into v_cfg from public.site_settings where key = 'commerce';
  v_min       := coalesce((v_cfg->>'min_order_amount')::bigint, 20000);
  v_ship_base := coalesce((v_cfg->>'shipping_base')::bigint, 8000);
  v_free_on   := coalesce((v_cfg->>'free_shipping_enabled')::boolean, false);
  v_free_min  := coalesce((v_cfg->>'free_shipping_min')::bigint, 50000);

  if p_subtotal < v_min then
    raise exception 'MIN_ORDER_NOT_MET' using errcode = 'P0001';
  end if;

  v_shipping := case
    when v_free_on and p_subtotal >= v_free_min then 0
    else v_ship_base
  end;
  v_tax := round(p_subtotal * 0.1);
  return query select p_subtotal, v_shipping, v_tax, p_subtotal + v_shipping + v_tax;
end $$;
