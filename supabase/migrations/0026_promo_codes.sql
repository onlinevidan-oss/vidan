-- ============================================================
-- 0026_promo_codes.sql
--   Промо кодоор хөнгөлөлт — СЕРВЕР талд тооцно.
--
--   ЯАГААД СЕРВЕРТ: QPay-ийн нэхэмжлэл orders.total-оос үүсдэг. Хэрэв
--   хөнгөлөлтийг зөвхөн дэлгэц дээр бодвол хэрэглэгч хямдарсан үнэ
--   хараад бүтэн үнээр төлнө. Мөн client талд бодвол кодыг өөрчилж
--   дурын хөнгөлөлт авах боломжтой болно.
--
--   ӨМНӨ НЬ: place_order нь p_promo_code-ыг зөвхөн ТЕКСТЭЭР хадгалж,
--   discount-д 0 бичдэг байсан — код ажилладаггүй байв.
--
--   НӨАТ: хөнгөлсний ДАРААХ дүнгээс тооцно (бодит төлсөн дүн).
--   pricing.ts (client) аль хэдийн ингэж бодож байсан — DB нь хоцорч
--   байсныг энд нийцүүлэв. E-barimt баримт мөн энэ дүнг дагана.
-- ============================================================

-- ============================================================
-- 1) Ашиглалтын бүртгэл
--    usage_count тоолуур дангаараа зэрэг захиалгад найдваргүй тул
--    хэн, аль захиалгад ашигласныг мөрөөр хадгална.
-- ============================================================
create table if not exists public.promo_redemptions (
  id         uuid primary key default gen_random_uuid(),
  promo_id   uuid not null references public.promotions(id) on delete cascade,
  order_id   uuid not null references public.orders(id)     on delete cascade,
  user_id    uuid references public.profiles(id)            on delete set null,
  discount   bigint not null default 0,
  created_at timestamptz not null default now(),
  unique (order_id)   -- нэг захиалгад нэг л промо
);

create index if not exists promo_redemptions_promo_user_idx
  on public.promo_redemptions (promo_id, user_id);

alter table public.promo_redemptions enable row level security;

drop policy if exists "Redemptions: self read"  on public.promo_redemptions;
drop policy if exists "Redemptions: staff read" on public.promo_redemptions;

create policy "Redemptions: self read" on public.promo_redemptions
  for select using (user_id = auth.uid());

create policy "Redemptions: staff read" on public.promo_redemptions
  for select using (public.is_staff());

-- ============================================================
-- 2) Промо кодыг шалгаж, хөнгөлөлтийг тооцох
--    Checkout-ийн урьдчилсан харуулалт БОЛОН place_order хоёулаа
--    ЭНЭ функцийг дуудна — нэг эх сурвалж, зөрөх боломжгүй.
-- ============================================================
create or replace function public.validate_promo(
  p_code     text,
  p_user_id  uuid,
  p_subtotal bigint
)
returns table(valid boolean, promo_id uuid, discount bigint, error text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_p        record;
  v_used     int;
  v_seg      text;
  v_discount bigint;
begin
  if p_code is null or btrim(p_code) = '' then
    return query select false, null::uuid, 0::bigint, 'EMPTY'::text;
    return;
  end if;

  select * into v_p from public.promotions
   where upper(code) = upper(btrim(p_code));

  if not found then
    return query select false, null::uuid, 0::bigint, 'NOT_FOUND'::text;
    return;
  end if;

  if not v_p.is_active then
    return query select false, v_p.id, 0::bigint, 'INACTIVE'::text; return;
  end if;
  if v_p.starts_at is not null and now() < v_p.starts_at then
    return query select false, v_p.id, 0::bigint, 'NOT_STARTED'::text; return;
  end if;
  if v_p.ends_at is not null and now() > v_p.ends_at then
    return query select false, v_p.id, 0::bigint, 'EXPIRED'::text; return;
  end if;
  if p_subtotal < coalesce(v_p.min_order, 0) then
    return query select false, v_p.id, 0::bigint, 'MIN_ORDER'::text; return;
  end if;
  if v_p.usage_limit is not null and v_p.usage_count >= v_p.usage_limit then
    return query select false, v_p.id, 0::bigint, 'LIMIT_REACHED'::text; return;
  end if;

  -- Хэрэглэгч тус бүрийн хязгаар
  if p_user_id is not null and v_p.usage_per_user is not null then
    select count(*) into v_used
      from public.promo_redemptions r
     where r.promo_id = v_p.id and r.user_id = p_user_id;
    if v_used >= v_p.usage_per_user then
      return query select false, v_p.id, 0::bigint, 'USER_LIMIT'::text; return;
    end if;
  end if;

  -- Сегмент (all / new / vip)
  if v_p.segment is not null and v_p.segment <> 'all' and p_user_id is not null then
    select segment into v_seg from public.profiles where id = p_user_id;
    if coalesce(v_seg, 'new') <> v_p.segment then
      return query select false, v_p.id, 0::bigint, 'SEGMENT'::text; return;
    end if;
  end if;

  -- Хөнгөлөлт. Одоогоор percent болон fixed хоёрыг дэмжинэ;
  -- bogo / free_shipping нь нэмэлт дүрэм шаарддаг тул хойш.
  v_discount := case v_p.type
    when 'percent' then round(p_subtotal * v_p.value / 100.0)::bigint
    when 'fixed'   then least(v_p.value::bigint, p_subtotal)
    else 0::bigint
  end;

  if v_p.max_discount is not null then
    v_discount := least(v_discount, v_p.max_discount);
  end if;
  v_discount := greatest(0::bigint, least(v_discount, p_subtotal));

  if v_discount <= 0 then
    return query select false, v_p.id, 0::bigint, 'UNSUPPORTED_TYPE'::text; return;
  end if;

  return query select true, v_p.id, v_discount, null::text;
end $$;

grant execute on function public.validate_promo(text, uuid, bigint)
  to authenticated, service_role;

-- ============================================================
-- 3) calc_order_totals — хөнгөлөлт хүлээж авна
--    НӨАТ ба нийт дүн хөнгөлсний дараах дүнгээс тооцогдоно.
--    pricing.ts дэх client талын тооцоотой ЯГ ижил дараалал.
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

  -- Захиалгын доод дүн нь БАРААНЫ дүнд хамаарна (хөнгөлөлтөөс өмнө)
  if p_subtotal < v_min then
    raise exception 'MIN_ORDER_NOT_MET' using errcode = 'P0001';
  end if;

  v_disc  := greatest(0::bigint, least(coalesce(p_discount, 0), p_subtotal));
  v_after := p_subtotal - v_disc;

  v_shipping := case when p_item_count > v_qty_thresh then v_ship_over else v_ship_base end;
  if v_free_on and v_after >= v_free_min then
    v_shipping := 0;
  end if;

  v_tax := round(v_after * 0.1);
  return query select p_subtotal, v_disc, v_shipping, v_tax, v_after + v_shipping + v_tax;
end $$;

-- ============================================================
-- 4) place_order — промо кодыг шалгаж, хөнгөлөлтийг тооцно
--    Бусад бүх логик (нөөц хасах, хаяг шалгах, items бичих) ХЭВЭЭР.
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
  v_item_count int := 0;
  v_totals record;
  v_order_id uuid;
  v_order_number text;
  v_rowcount int;
  v_address_owner uuid;
  v_promo record;
  v_discount bigint := 0;
  v_promo_id uuid;
  v_code text;
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

  -- ---------- ПРОМО КОД ----------
  v_code := nullif(btrim(coalesce(p_promo_code, '')), '');
  if v_code is not null then
    select * into v_promo
      from public.validate_promo(v_code, v_user_id, v_subtotal);
    if not v_promo.valid then
      raise exception 'PROMO_INVALID:%', v_promo.error using errcode = 'P0001';
    end if;
    v_discount := v_promo.discount;
    v_promo_id := v_promo.promo_id;
  end if;

  -- Үнэ тооцоолол (хөнгөлөлт орсон)
  select * into v_totals
    from public.calc_order_totals(v_subtotal, v_item_count, v_discount);

  insert into public.orders (
    user_id, address_id, status, payment_method, payment_status,
    subtotal, discount, shipping, tax, total, promo_code, driver_notes
  )
  values (
    v_user_id, p_address_id, 'new', p_payment_method, 'pending',
    v_totals.subtotal, v_totals.discount, v_totals.shipping, v_totals.tax,
    v_totals.total, v_code, p_driver_notes
  )
  returning id, public.orders.order_number into v_order_id, v_order_number;

  insert into public.order_items (order_id, product_id, product_name, product_sku, quantity, unit_price, subtotal)
  select v_order_id, p.id, p.name_mn, p.sku,
    (item->>'quantity')::int, p.price, p.price * (item->>'quantity')::int
  from jsonb_array_elements(p_items) item
  join public.products p on p.id = (item->>'product_id')::uuid;

  -- Промо ашиглалт бүртгэх (unique(order_id) тул давхардахгүй)
  if v_promo_id is not null then
    insert into public.promo_redemptions (promo_id, order_id, user_id, discount)
    values (v_promo_id, v_order_id, v_user_id, v_discount);

    update public.promotions
       set usage_count = usage_count + 1
     where id = v_promo_id;
  end if;

  insert into public.order_events (order_id, event_type, description)
  values (v_order_id, 'created', 'Захиалга үүссэн');

  return query select v_order_id, v_order_number, v_totals.total;
end $$;
