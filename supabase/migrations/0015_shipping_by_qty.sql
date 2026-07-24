-- ============================================================
-- 0015_shipping_by_qty.sql
--   Хүргэлтийн төлбөр нь сонгосон бүтээгдэхүүний ТОО (ширхэг)-оос хамаарна:
--     · threshold (7) ба түүнээс доош  → shipping_base (7,000₮)
--     · threshold-с дээш               → shipping_over (14,000₮)
--   calc_order_totals-д item_count параметр нэмж, place_order ширхэг тоолж дамжуулна.
-- ============================================================

-- 1) commerce тохиргоонд ширхгийн шатлал нэмэх
update public.site_settings
set value = value
  || jsonb_build_object(
       'shipping_base', 7000,
       'shipping_over', 14000,
       'shipping_qty_threshold', 7
     )
where key = 'commerce';

-- 2) calc_order_totals — item_count параметртэй
drop function if exists public.calc_order_totals(bigint);
create or replace function public.calc_order_totals(
  p_subtotal   bigint,
  p_item_count int default 0
)
returns table(subtotal bigint, shipping bigint, tax bigint, total bigint)
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
begin
  select value into v_cfg from public.site_settings where key = 'commerce';
  v_min        := coalesce((v_cfg->>'min_order_amount')::bigint, 20000);
  v_ship_base  := coalesce((v_cfg->>'shipping_base')::bigint, 7000);
  v_ship_over  := coalesce((v_cfg->>'shipping_over')::bigint, 14000);
  v_qty_thresh := coalesce((v_cfg->>'shipping_qty_threshold')::int, 7);
  v_free_on    := coalesce((v_cfg->>'free_shipping_enabled')::boolean, false);
  v_free_min   := coalesce((v_cfg->>'free_shipping_min')::bigint, 50000);

  if p_subtotal < v_min then
    raise exception 'MIN_ORDER_NOT_MET' using errcode = 'P0001';
  end if;

  -- Ширхгийн шатлалаар хүргэлт
  v_shipping := case when p_item_count > v_qty_thresh then v_ship_over else v_ship_base end;
  -- Үнэгүй хүргэлт идэвхтэй бол (одоогоор идэвхгүй)
  if v_free_on and p_subtotal >= v_free_min then
    v_shipping := 0;
  end if;

  v_tax := round(p_subtotal * 0.1);
  return query select p_subtotal, v_shipping, v_tax, p_subtotal + v_shipping + v_tax;
end $$;

-- 3) place_order — ширхэг тоолж calc_order_totals-д дамжуулах
create or replace function public.place_order(
  p_address_id uuid,
  p_payment_method text,
  p_items jsonb,
  p_driver_notes text default null,
  p_promo_code text default null
)
returns table(order_id uuid, order_number text, total bigint)
language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  v_user_id uuid := auth.uid();
  v_item jsonb;
  v_pid uuid;
  v_qty int;
  v_subtotal bigint := 0;
  v_item_count int := 0;
  v_totals record;
  v_order_id uuid;
  v_order_number text;
  v_rowcount int;
  v_address_owner uuid;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = 'P0001';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_CART' using errcode = 'P0001';
  end if;
  if p_address_id is not null then
    select user_id into v_address_owner from public.addresses where id = p_address_id;
    if v_address_owner is null or v_address_owner <> v_user_id then
      raise exception 'INVALID_ADDRESS' using errcode = 'P0001';
    end if;
  end if;
  if p_payment_method not in ('qpay','card','cash','toki','socialpay') then
    raise exception 'INVALID_PAYMENT_METHOD' using errcode = 'P0001';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_pid := (v_item->>'product_id')::uuid;
    v_qty := (v_item->>'quantity')::int;
    if v_qty <= 0 then
      raise exception 'INVALID_QUANTITY' using errcode = 'P0001';
    end if;

    update public.products
      set stock = stock - v_qty
      where id = v_pid and is_active = true and stock >= v_qty;

    get diagnostics v_rowcount = row_count;
    if v_rowcount = 0 then
      raise exception 'INSUFFICIENT_STOCK:%', v_pid using errcode = 'P0001';
    end if;

    select v_subtotal + (price * v_qty) into v_subtotal
      from public.products where id = v_pid;
    v_item_count := v_item_count + v_qty;
  end loop;

  -- Үнэ тооцоолол (ширхгийн тоог дамжуулна)
  select * into v_totals from public.calc_order_totals(v_subtotal, v_item_count);

  insert into public.orders (
    user_id, address_id, status, payment_method, payment_status,
    subtotal, discount, shipping, tax, total, promo_code, driver_notes
  )
  values (
    v_user_id, p_address_id, 'new', p_payment_method, 'pending',
    v_totals.subtotal, 0, v_totals.shipping, v_totals.tax, v_totals.total,
    p_promo_code, p_driver_notes
  )
  returning id, public.orders.order_number into v_order_id, v_order_number;

  insert into public.order_items (order_id, product_id, product_name, product_sku, quantity, unit_price, subtotal)
  select v_order_id, p.id, p.name_mn, p.sku,
    (item->>'quantity')::int, p.price, p.price * (item->>'quantity')::int
  from jsonb_array_elements(p_items) item
  join public.products p on p.id = (item->>'product_id')::uuid;

  insert into public.order_events (order_id, event_type, description, created_by)
  values (v_order_id, 'created', 'Захиалга үүссэн', v_user_id);

  return query select v_order_id, v_order_number, v_totals.total;
end $$;

grant execute on function public.place_order(uuid, text, jsonb, text, text) to authenticated;
