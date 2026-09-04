-- ============================================================
-- 0028_stock_movements.sql
--   АГУУЛАХЫН ХӨДӨЛГӨӨН — орлого / зарлага
--
--   ӨМНӨ НЬ: products.stock нь ганц тоо байсан. Хэн, хэзээ, хэдийг
--   нэмсэн/хассан нь хаана ч үлддэггүй тул үлдэгдэл зөрөхөд шалтгааныг
--   нь олох боломжгүй байв.
--
--   ОДОО: хөдөлгөөн бүр мөр болж үлдэнэ.
--     · орлого  (kind='in')     — эерэг тоо, админ гараар шивнэ
--     · зарлага (kind='out')    — сөрөг тоо, захиалга үүсэхэд автоматаар
--     · тохируулга (kind='adjust') — тооллогын зөрүү
--
--   ТЭНЦЭЛ: sum(quantity) = products.stock байх ёстой. Энэ хоёрын
--   аль нэгийг нь дангаар нь бүү өөрчил — record_stock_in / place_order
--   хоёулаа хоёуланг нь зэрэг шинэчилдэг.
-- ============================================================

create table if not exists public.stock_movements (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  kind        text not null check (kind in ('in', 'out', 'adjust')),
  -- Тэмдэгтэй тоо: орлого +, зарлага −. sum() нь шууд үлдэгдэл өгнө.
  quantity    int  not null check (quantity <> 0),
  note        text,
  order_id    uuid references public.orders(id) on delete set null,
  -- Бодит болсон огноо (буцаж бүртгэх боломжтой), created_at нь бичсэн мөч
  occurred_at timestamptz not null default now(),
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists stock_movements_product_idx
  on public.stock_movements (product_id, occurred_at desc);
create index if not exists stock_movements_occurred_idx
  on public.stock_movements (occurred_at desc);
create index if not exists stock_movements_order_idx
  on public.stock_movements (order_id) where order_id is not null;

comment on table public.stock_movements is
  'Агуулахын орлого/зарлагын бүртгэл. sum(quantity) = products.stock';

-- ============================================================
-- RLS — зөвхөн ажилтан харна, бичих нь RPC-ээр
-- ============================================================
alter table public.stock_movements enable row level security;

drop policy if exists "Stock movements: staff read" on public.stock_movements;
create policy "Stock movements: staff read" on public.stock_movements
  for select using (public.is_staff());

-- ============================================================
-- ОРЛОГО бүртгэх — үлдэгдэл дээр нэмнэ
-- ============================================================
create or replace function public.record_stock_in(
  p_product_id  uuid,
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
  v_user uuid := auth.uid();
  v_new  int;
  v_mid  uuid;
begin
  if not public.is_staff() then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;
  if p_qty is null or p_qty = 0 then
    raise exception 'INVALID_QUANTITY' using errcode = 'P0001';
  end if;

  update public.products
     set stock = stock + p_qty,
         updated_at = now()
   where id = p_product_id
  returning stock into v_new;

  if v_new is null then
    raise exception 'PRODUCT_NOT_FOUND' using errcode = 'P0001';
  end if;

  insert into public.stock_movements (product_id, kind, quantity, note, occurred_at, created_by)
  values (
    p_product_id,
    case when p_qty > 0 then 'in' else 'adjust' end,
    p_qty,
    nullif(btrim(coalesce(p_note, '')), ''),
    coalesce(p_occurred_at, now()),
    v_user
  )
  returning id into v_mid;

  return query select p_product_id, v_new, v_mid;
end $$;

grant execute on function public.record_stock_in(uuid, int, text, timestamptz)
  to authenticated;

-- ============================================================
-- place_order — зарлагыг бүртгэнэ
--   Бусад логик (промо, нөөц шалгах, дүн бодох) 0026-гийнхтэй ИЖИЛ.
--   Ганц нэмэлт нь захиалгын мөр бичсэний дараах stock_movements insert.
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

  -- ---------- ЗАРЛАГА бүртгэх (шинэ) ----------
  insert into public.stock_movements (product_id, kind, quantity, order_id, note, created_by)
  select (item->>'product_id')::uuid,
         'out',
         -((item->>'quantity')::int),
         v_order_id,
         'Захиалга ' || v_order_number,
         v_user_id
  from jsonb_array_elements(p_items) item;

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

grant execute on function public.place_order(uuid, text, jsonb, text, text) to authenticated;

-- ============================================================
-- ЭХНИЙ ҮЛДЭГДЭЛ — 2026-08-01
--   Одоогийн бодит үлдэгдэл дээр түүнээс хойш зарагдсаныг нэмж,
--   8-р сарын 1-ний орлого болгон бүртгэнэ. Ингэснээр:
--       эхний орлого − зарлага = одоогийн үлдэгдэл
--
--   Идемпотент — дахин ажиллуулахад давхардахгүй.
-- ============================================================
do $$
declare
  v_opened timestamptz := '2026-08-01T00:00:00+08:00';  -- УБ цагаар 8-р сарын 1
begin
  -- 1) Төлбөр төлөгдсөн захиалгуудын зарлага (түүхэн)
  insert into public.stock_movements (product_id, kind, quantity, order_id, note, occurred_at)
  select oi.product_id, 'out', -oi.quantity, o.id,
         'Захиалга ' || o.order_number || ' (түүхэн бүртгэл)',
         o.created_at
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
   where o.payment_status = 'paid'
     and o.status <> 'cancelled'
     and o.created_at >= v_opened
     and oi.product_id is not null
     and not exists (
       select 1 from public.stock_movements m
        where m.order_id = o.id and m.product_id = oi.product_id
     );

  -- 2) Эхний үлдэгдэл = одоогийн stock + дээрх зарлага
  insert into public.stock_movements (product_id, kind, quantity, note, occurred_at)
  select p.id, 'in',
         p.stock + coalesce(s.sold, 0),
         'Эхний үлдэгдэл (тооллого)',
         v_opened
    from public.products p
    left join (
      select oi.product_id, sum(oi.quantity)::int as sold
        from public.order_items oi
        join public.orders o on o.id = oi.order_id
       where o.payment_status = 'paid'
         and o.status <> 'cancelled'
         and o.created_at >= v_opened
       group by oi.product_id
    ) s on s.product_id = p.id
   where p.stock + coalesce(s.sold, 0) <> 0
     and not exists (
       select 1 from public.stock_movements m
        where m.product_id = p.id and m.note = 'Эхний үлдэгдэл (тооллого)'
     );
end $$;
