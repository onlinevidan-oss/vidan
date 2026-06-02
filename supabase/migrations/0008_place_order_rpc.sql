-- ============================================================
-- 0008_place_order_rpc.sql
-- Атомик `place_order` функц:
--   · Stock check + decrement атомжуул (overselling шийдэх)
--   · order + items + events нэг transaction-д
--   · Customer-д unit_price/total зэргийг манипуляц хийх боломжгүй
--     (server-side үнэ DB-аас уншина)
-- ============================================================

-- Pricing constants — DB дотор төвлөрүүлэх
create or replace function public.calc_order_totals(p_subtotal bigint)
returns table(subtotal bigint, shipping bigint, tax bigint, total bigint)
language plpgsql immutable
set search_path = public, pg_temp as $$
declare
  v_shipping bigint;
  v_tax      bigint;
begin
  v_shipping := case when p_subtotal >= 50000 then 0 else 5000 end;
  v_tax      := round(p_subtotal * 0.1);
  return query select p_subtotal, v_shipping, v_tax, p_subtotal + v_shipping + v_tax;
end $$;

-- ============================================================
-- place_order(p_address_id, p_payment_method, p_items jsonb, p_notes)
--   p_items :: [{ product_id: uuid, quantity: int }]
-- Returns: { order_id, order_number, total }
-- ============================================================
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
  v_totals record;
  v_order_id uuid;
  v_order_number text;
  v_rowcount int;
  v_address_owner uuid;
begin
  -- 1. Auth check
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = 'P0001';
  end if;
  -- 2. Items хоосон биш
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_CART' using errcode = 'P0001';
  end if;
  -- 3. Address эзэмшил шалгах
  if p_address_id is not null then
    select user_id into v_address_owner from public.addresses where id = p_address_id;
    if v_address_owner is null or v_address_owner <> v_user_id then
      raise exception 'INVALID_ADDRESS' using errcode = 'P0001';
    end if;
  end if;
  -- 4. Payment method whitelist
  if p_payment_method not in ('qpay','card','cash','toki','socialpay') then
    raise exception 'INVALID_PAYMENT_METHOD' using errcode = 'P0001';
  end if;

  -- 5. Атомжуулсан stock decrement (бүх items давталт)
  --    UPDATE ... WHERE stock >= qty RETURNING — гүйцэтгэлийн хувьд хамгийн зөв
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_pid := (v_item->>'product_id')::uuid;
    v_qty := (v_item->>'quantity')::int;
    if v_qty <= 0 then
      raise exception 'INVALID_QUANTITY' using errcode = 'P0001';
    end if;

    update public.products
      set stock = stock - v_qty
      where id = v_pid
        and is_active = true
        and stock >= v_qty;

    get diagnostics v_rowcount = row_count;
    if v_rowcount = 0 then
      raise exception 'INSUFFICIENT_STOCK:%', v_pid using errcode = 'P0001';
    end if;

    -- Subtotal-руу нэмэх (price-ыг DB-ээс)
    select v_subtotal + (price * v_qty) into v_subtotal
      from public.products where id = v_pid;
  end loop;

  -- 6. Үнэ тооцоолох (server-side, customer payload-аас ҮЛ ишилнэ)
  select * into v_totals from public.calc_order_totals(v_subtotal);

  -- 7. Order үүсгэх
  insert into public.orders (
    user_id, address_id, status, payment_method, payment_status,
    subtotal, discount, shipping, tax, total,
    promo_code, driver_notes
  )
  values (
    v_user_id, p_address_id, 'new', p_payment_method, 'pending',
    v_totals.subtotal, 0, v_totals.shipping, v_totals.tax, v_totals.total,
    p_promo_code, p_driver_notes
  )
  returning id, public.orders.order_number into v_order_id, v_order_number;

  -- 8. Order items үүсгэх (price-ыг DB-ээс, customer manipulate-гүй)
  insert into public.order_items (order_id, product_id, product_name, product_sku, quantity, unit_price, subtotal)
  select
    v_order_id,
    p.id,
    p.name_mn,
    p.sku,
    (item->>'quantity')::int,
    p.price,
    p.price * (item->>'quantity')::int
  from jsonb_array_elements(p_items) item
  join public.products p on p.id = (item->>'product_id')::uuid;

  -- 9. Timeline event
  insert into public.order_events (order_id, event_type, description, created_by)
  values (v_order_id, 'created', 'Захиалга үүссэн', v_user_id);

  return query select v_order_id, v_order_number, v_totals.total;
end $$;

-- Гүйцэтгэх эрх
grant execute on function public.place_order(uuid, text, jsonb, text, text) to authenticated;
