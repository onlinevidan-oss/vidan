-- ============================================================
-- 0054 — Жимсний хайрцгийн хүргэлт (эзэн, 2026-11-18)
--
-- "хайрцаг хайрцагаар нэмэгдвэл 3к-р нэмэх": эхний хайрцаг энгийн
-- хүргэлт (7,000 + НӨАТ = 7,700₮), дараагийн хайрцаг бүрт +3,000₮
-- (+ НӨАТ = 3,300₮). 1кг, 1.5кг савлагаа энгийн ширхэг хэвээр.
--
--   * products.shipping_box — бүтэн хайрцаг (8кг, 12кг) эсэх
--   * site_settings.commerce.fruit_box_extra_fee — нэмэлт хайрцгийн
--     төлбөр (НӨАТ-гүй), жимсний админы тохиргооноос засна
--   * calc_order_totals(…, p_extra_boxes) — нэмэлт хайрцгийн тоо
--   * place_order — 0053-ын хуулбар, зөвхөн хайрцаг тоолох нэмэгдсэн
--
-- Сайтын тооцоо: pricing.ts (shippingUnits, calculateOrderTotals).
-- ============================================================

alter table public.products
  add column if not exists shipping_box boolean not null default false;

update public.products set shipping_box = true
 where sku in ('VIDAN051', 'VIDAN053', 'VIDAN048');

update public.site_settings
   set value = value || jsonb_build_object(
         'fruit_box_extra_fee', coalesce(value->'fruit_box_extra_fee', '3000'::jsonb))
 where key = 'commerce';

-- Хуучин (3 аргументтай) хувилбарыг хасна — шинэ нь 4-р аргументтай,
-- анхдагч утгатай тул хуучин дуудлагууд ажилласаар байна.
drop function if exists public.calc_order_totals(bigint, int, bigint);

create or replace function public.calc_order_totals(
  p_subtotal   bigint,
  p_item_count int default 0,
  p_discount   bigint default 0,
  p_extra_boxes int default 0
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
  v_box_fee    bigint;
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
  v_box_fee    := coalesce((v_cfg->>'fruit_box_extra_fee')::bigint, 3000);

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

  -- 0054: хоёр дахь хайрцгаас эхлэн хайрцаг бүрт (НӨАТ-гүй)
  v_shipping := v_shipping + greatest(coalesce(p_extra_boxes, 0), 0) * v_box_fee;

  if v_free_on and v_after >= v_free_min then
    v_shipping := 0;
  end if;

  -- Бараанд НӨАТ нэмэгдэхгүй (үнэд шингэсэн). Зөвхөн хүргэлтийн үнэн дээр.
  v_tax := round(v_shipping * 0.1);

  return query select p_subtotal, v_disc, v_shipping, v_tax, (v_after + v_shipping + v_tax);
end;
$$;

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
  v_promo record;
  v_discount bigint := 0;
  v_promo_disc bigint := 0;
  v_promo_id uuid;
  v_code text;
  v_card record;
  v_voucher record;
  v_voucher_bal bigint := 0;
  v_voucher_amt bigint := 0;
  v_src uuid;
  v_unit int;
  v_price bigint;
  v_brand text;
  v_fruit_sub bigint := 0;
  v_fruit_min bigint;
  v_is_box boolean;
  v_boxes int := 0;
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
  if p_payment_method not in ('qpay','card','cash','toki','socialpay','invoice') then
    raise exception 'INVALID_PAYMENT_METHOD' using errcode = 'P0001';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_pid := (v_item->>'product_id')::uuid;
    v_qty := (v_item->>'quantity')::int;
    if v_qty <= 0 then
      raise exception 'INVALID_QUANTITY' using errcode = 'P0001';
    end if;

    -- 0053: нөөцтэй (stock_source_id) бараа өөрийн биш нөөцийнхөө
    -- үлдэгдлээс stock_unit_qty-аар үржүүлж хасагдана (жимс: 0.5кг нэгж).
    v_src := null;
    select coalesce(p.stock_source_id, p.id), p.stock_unit_qty, p.price, b.slug, p.shipping_box
      into v_src, v_unit, v_price, v_brand, v_is_box
      from public.products p
      left join public.brands b on b.id = p.brand_id
     where p.id = v_pid and p.is_active = true;
    if v_src is null then
      raise exception 'INSUFFICIENT_STOCK:%', v_pid using errcode = 'P0001';
    end if;

    update public.products
      set stock = stock - v_qty * v_unit
      where id = v_src and stock >= v_qty * v_unit;

    get diagnostics v_rowcount = row_count;
    if v_rowcount = 0 then
      raise exception 'INSUFFICIENT_STOCK:%', v_pid using errcode = 'P0001';
    end if;

    v_subtotal := v_subtotal + v_price * v_qty;
    if v_brand = 'vidan-fruit' then
      v_fruit_sub := v_fruit_sub + v_price * v_qty;
    end if;
    -- 0054: бүтэн хайрцаг хүргэлтэд тусад нь тоологдоно
    if v_is_box then
      v_boxes := v_boxes + v_qty;
    else
      v_item_count := v_item_count + v_qty;
    end if;
  end loop;

  -- 0054: эхний хайрцаг энгийн нэг ширхэг шиг (ширхгийн шатлалд) орно,
  -- дараагийн хайрцаг бүр calc_order_totals-д fruit_box_extra_fee нэмнэ
  if v_boxes > 0 then
    v_item_count := v_item_count + 1;
  end if;

  -- Жимсний доод дүн (эзэн, 2026-11-18): сагсан дахь ЖИМСНИЙ барааны дүн
  -- дангаараа 40,000₮ хүрэх ёстой. Ажилтан үл хамаарна (0030-тай ижил).
  if v_fruit_sub > 0 and not public.is_staff() then
    select coalesce((value->>'fruit_min_order_amount')::bigint, 40000)
      into v_fruit_min
      from public.site_settings where key = 'commerce';
    if v_fruit_sub < coalesce(v_fruit_min, 40000) then
      raise exception 'FRUIT_MIN_ORDER_NOT_MET' using errcode = 'P0001';
    end if;
  end if;

  v_code := nullif(btrim(coalesce(p_promo_code, '')), '');

  -- ---------- ЭРХИЙН БИЧИГ ----------
  -- Мөрийг түгжинэ: зэрэг хоёр захиалга нэг үлдэгдлийг давхар зарцуулахгүй
  -- Код байхгүй үед ч ажиллуулна — record хоосон (null) утгаар оноогдоно
  select * into v_voucher from public.gift_vouchers g
   where v_code is not null and g.code = upper(v_code)
   for update;

  if v_voucher.id is not null then
    if not v_voucher.is_active then
      raise exception 'VOUCHER_INVALID:INACTIVE' using errcode = 'P0001';
    end if;
    if v_voucher.ends_at is not null and now() > v_voucher.ends_at then
      raise exception 'VOUCHER_INVALID:EXPIRED' using errcode = 'P0001';
    end if;
    if v_voucher.user_id is not null and v_voucher.user_id <> v_user_id then
      raise exception 'VOUCHER_INVALID:OTHER_USER' using errcode = 'P0001';
    end if;
    v_voucher_bal := public.gift_voucher_balance(v_voucher.id);
    if v_voucher_bal <= 0 then
      raise exception 'VOUCHER_INVALID:EMPTY' using errcode = 'P0001';
    end if;
  elsif v_code is not null then
    -- ---------- ПРОМО КОД ----------
    select * into v_promo
      from public.validate_promo(v_code, v_user_id, v_subtotal);
    if not v_promo.valid then
      raise exception 'PROMO_INVALID:%', v_promo.error using errcode = 'P0001';
    end if;
    v_promo_disc := v_promo.discount;
    v_promo_id := v_promo.promo_id;
  end if;

  -- ---------- КАРТ (QR-аар идэвхжүүлсэн) ----------
  -- Эрхийн бичигтэй захиалгад карт хэрэгжихгүй (эзэн, 2026-11-09) —
  -- картын нэг удаагийн эрх зарцуулагдахгүй, дараагийн захиалгад үлдэнэ.
  -- Хэрэглэгчийг null болгож дуудна — мөр буцахгүй, record хоосон оноогдоно.
  select * into v_card
    from public.card_discount_for(
      case when v_voucher.id is null then v_user_id end, v_subtotal, true);
  if v_card.promo_id is not null then
    v_card.discount := least(v_card.discount, v_subtotal - v_promo_disc);
  end if;
  v_discount := v_promo_disc + coalesce(greatest(v_card.discount, 0), 0);

  select * into v_totals
    from public.calc_order_totals(v_subtotal, v_item_count, v_discount, greatest(v_boxes - 1, 0));

  -- Эрхийн бичиг НИЙТ дүнгээс (хүргэлт, НӨАТ орно)
  if v_voucher.id is not null then
    v_voucher_amt := least(v_voucher_bal, v_totals.total);
  end if;

  insert into public.orders (
    user_id, address_id, status, payment_method, payment_status,
    subtotal, discount, shipping, tax, total, promo_code, driver_notes,
    voucher_amount, invoice_due_at
  )
  values (
    v_user_id, p_address_id, 'new', p_payment_method, 'pending',
    v_totals.subtotal, v_totals.discount, v_totals.shipping, v_totals.tax,
    v_totals.total - v_voucher_amt,
    case when v_voucher.id is null then v_code end,
    p_driver_notes,
    v_voucher_amt,
    -- Нэхэмжлэлийн захиалга: 24 цаг (шөнө таарвал өглөөний 09:00 хүртэл)
    case when p_payment_method = 'invoice' then public.invoice_due_at(now()) end
  )
  returning id, public.orders.order_number into v_order_id, v_order_number;

  insert into public.order_items (order_id, product_id, product_name, product_sku, quantity, unit_price, subtotal)
  select v_order_id, p.id, p.name_mn, p.sku,
    (item->>'quantity')::int, p.price, p.price * (item->>'quantity')::int
  from jsonb_array_elements(p_items) item
  join public.products p on p.id = (item->>'product_id')::uuid;

  -- Нөөцтэй бараа бол хөдөлгөөн нөөцөн дээр, нэгжээр (0053)
  insert into public.stock_movements (product_id, kind, quantity, order_id, note, created_by)
  select coalesce(p.stock_source_id, p.id),
         'out',
         -((item->>'quantity')::int * p.stock_unit_qty),
         v_order_id,
         'Захиалга ' || v_order_number
           || case when p.stock_source_id is not null
                   then ' · ' || p.name_mn || ' ×' || (item->>'quantity') else '' end,
         v_user_id
  from jsonb_array_elements(p_items) item
  join public.products p on p.id = (item->>'product_id')::uuid;

  if v_promo_id is not null then
    insert into public.promo_redemptions (promo_id, order_id, user_id, discount)
    values (v_promo_id, v_order_id, v_user_id, v_promo_disc);

    update public.promotions
       set usage_count = usage_count + 1
     where id = v_promo_id;
  end if;

  if v_card.promo_id is not null and v_card.discount > 0 then
    insert into public.promo_redemptions (promo_id, order_id, user_id, discount)
    values (v_card.promo_id, v_order_id, v_user_id, v_card.discount);

    update public.promotions
       set usage_count = usage_count + 1
     where id = v_card.promo_id;
  end if;

  if v_voucher_amt > 0 then
    update public.gift_vouchers
       set user_id = coalesce(user_id, v_user_id)
     where id = v_voucher.id;

    insert into public.gift_voucher_uses (voucher_id, order_id, user_id, amount)
    values (v_voucher.id, v_order_id, v_user_id, v_voucher_amt);
  end if;

  insert into public.order_events (order_id, event_type, description)
  values (v_order_id, 'created', 'Захиалга үүссэн');

  if p_payment_method = 'invoice' then
    insert into public.order_events (order_id, event_type, description)
    values (v_order_id, 'invoice_created',
            'Байгууллагын нэхэмжлэл үүссэн — 24 цагийн дотор төлөгдөх ёстой');
  end if;

  if v_voucher_amt > 0 then
    insert into public.order_events (order_id, event_type, description)
    values (v_order_id, 'voucher_applied',
            'Эрхийн бичиг ' || v_voucher.code || ': ' || v_voucher_amt || '₮');
  end if;

  return query select v_order_id, v_order_number, v_totals.total - v_voucher_amt;
end $$;
grant execute on function public.place_order(uuid, text, jsonb, text, text) to authenticated;
