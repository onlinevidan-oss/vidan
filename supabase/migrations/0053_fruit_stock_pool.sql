-- ============================================================
-- 0053_fruit_stock_pool.sql
--   ЖИМС — ЗАХИАЛГА АВДАГ БОЛОХ (эзэн, 2026-11-18)
--
--   1) Кг-ын нөөц: сорт бүр нэг "нөөц" бараатай (идэвхгүй, POOL-*),
--      үлдэгдэл нь 0.5кг-ын НЭГЖЭЭР. Зарагдах бараанууд (1кг, 1.5кг,
--      8кг, 12кг) stock_source_id-аар нөөцөө заана, stock_unit_qty —
--      нэг ширхэгт хэдэн нэгж (1кг = 2, 8кг = 16, 12кг = 24).
--      Зарагдах барааны stock нь нөөцөөс ТООЦОГДОНО (floor) — сайтын
--      бүх "дууссан / үлдсэн" харуулалт өөрчлөлтгүй ажиллана.
--      Хөдөлгөөн (stock_movements) зөвхөн нөөцөн дээр бичигдэнэ.
--   2) Жимсний доод дүн: сагсан дахь жимсний дүн дангаараа 40,000₮
--      (site_settings.commerce.fruit_min_order_amount).
--   3) Бараа: Бельги Jonagored 1кг/8кг, Kanzi 1кг/8кг, Польш алим
--      1кг/1.5кг/12кг. Анхны орлого: сорт бүр 10 хайрцаг
--      (Jonagored 80кг, Kanzi 80кг, Польш 120кг) — эзэн, 11-18.
--   Баримт Дөрвөн-Өлзийн нэр дээр (одоогийн QPay, и-баримт).
-- ============================================================

alter table public.products
  add column if not exists stock_source_id uuid references public.products(id) on delete restrict,
  add column if not exists stock_unit_qty int not null default 1;

alter table public.products drop constraint if exists products_stock_unit_qty_pos;
alter table public.products add constraint products_stock_unit_qty_pos check (stock_unit_qty > 0);
alter table public.products drop constraint if exists products_stock_source_not_self;
alter table public.products add constraint products_stock_source_not_self
  check (stock_source_id is null or stock_source_id <> id);

create index if not exists products_stock_source_idx
  on public.products (stock_source_id) where stock_source_id is not null;

-- Зарагдах барааны үлдэгдэл = floor(нөөц / нэгж). Гараар засагдахгүй.
create or replace function public.products_pooled_stock()
returns trigger language plpgsql
set search_path = public, pg_temp as $$
declare
  v_pool_stock int;
  v_pool_src uuid;
begin
  if new.stock_source_id is not null then
    select stock, stock_source_id into v_pool_stock, v_pool_src
      from public.products where id = new.stock_source_id;
    if v_pool_src is not null then
      raise exception 'POOL_OF_POOL' using errcode = 'P0001';
    end if;
    new.stock := floor(coalesce(v_pool_stock, 0)::numeric / new.stock_unit_qty)::int;
  end if;
  return new;
end $$;

drop trigger if exists products_pooled_stock on public.products;
create trigger products_pooled_stock
  before insert or update on public.products
  for each row execute function public.products_pooled_stock();

-- Нөөц өөрчлөгдвөл түүнээс хамаарах бараануудыг дахин тооцно
create or replace function public.products_pool_sync()
returns trigger language plpgsql
set search_path = public, pg_temp as $$
begin
  if new.stock is distinct from old.stock then
    update public.products set stock = stock where stock_source_id = new.id;
  end if;
  return null;
end $$;

drop trigger if exists products_pool_sync on public.products;
create trigger products_pool_sync
  after update of stock on public.products
  for each row execute function public.products_pool_sync();

-- Нөөцтэй барааны хөдөлгөөнийг нөөцөн дээр л бичнэ
create or replace function public.stock_movements_no_pooled()
returns trigger language plpgsql
set search_path = public, pg_temp as $$
begin
  if exists (select 1 from public.products
              where id = new.product_id and stock_source_id is not null) then
    raise exception 'POOLED_PRODUCT' using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists stock_movements_no_pooled on public.stock_movements;
create trigger stock_movements_no_pooled
  before insert on public.stock_movements
  for each row execute function public.stock_movements_no_pooled();

-- Жимсний доод дүнгийн тохиргоо
update public.site_settings
   set value = value || jsonb_build_object(
         'fruit_min_order_amount', coalesce(value->'fruit_min_order_amount', '40000'::jsonb)),
       updated_at = now()
 where key = 'commerce';

-- place_order — 0052-тэй ижил; жимсний кг-ын нөөц ба жимсний доод дүн нэмэгдсэн
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
    select coalesce(p.stock_source_id, p.id), p.stock_unit_qty, p.price, b.slug
      into v_src, v_unit, v_price, v_brand
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
    v_item_count := v_item_count + v_qty;
  end loop;

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
    from public.calc_order_totals(v_subtotal, v_item_count, v_discount);

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

-- ============================================================
-- release_stale_orders — 0052-тэй ижил; нөөцтэй бараа (0053) нөөцөндөө
-- нэгжээр буцна.
-- ============================================================
create or replace function public.release_stale_orders(p_minutes int default 120)
returns table(released_orders int, restored_units int)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_orders int := 0;
  v_units  int := 0;
  v_cutoff timestamptz := now() - make_interval(mins => greatest(p_minutes, 1));
  v_ub_hour int := extract(hour from (now() at time zone 'Asia/Ulaanbaatar'));
begin
  -- ШӨНИЙН ХАМГААЛАЛТ (0039): 22:00–09:00 хооронд юу ч цуцлахгүй.
  if v_ub_hour >= 22 or v_ub_hour < 9 then
    return query select 0, 0;
    return;
  end if;

  drop table if exists _stale;
  create temp table _stale on commit drop as
  select id, order_number, (payment_method = 'invoice') as is_invoice
    from public.orders
   where payment_status = 'pending'
     and status <> 'cancelled'
     and (
       (payment_method is distinct from 'invoice' and created_at < v_cutoff)
       or (payment_method = 'invoice'
           and coalesce(invoice_due_at, created_at + interval '24 hours') <= now())
     );

  if not exists (select 1 from _stale) then
    return query select 0, 0;
    return;
  end if;

  -- 1) Нөөцийг буцаана
  with back as (
    select coalesce(pr.stock_source_id, oi.product_id) as pid,
           sum(oi.quantity * coalesce(pr.stock_unit_qty, 1))::int as qty
      from public.order_items oi
      join _stale s on s.id = oi.order_id
      left join public.products pr on pr.id = oi.product_id
     where oi.product_id is not null
     group by 1
  )
  update public.products p
     set stock = p.stock + b.qty,
         updated_at = now()
    from back b
   where p.id = b.pid;

  select coalesce(sum(oi.quantity), 0)::int into v_units
    from public.order_items oi
    join _stale s on s.id = oi.order_id
   where oi.product_id is not null;

  -- 2) Хөдөлгөөнд бүртгэнэ
  if to_regclass('public.stock_movements') is not null then
    insert into public.stock_movements (product_id, kind, quantity, order_id, note)
    select coalesce(pr.stock_source_id, oi.product_id), 'in',
           oi.quantity * coalesce(pr.stock_unit_qty, 1), s.id,
           'Төлөгдөөгүй захиалга цуцлагдав ' || s.order_number
      from public.order_items oi
      join _stale s on s.id = oi.order_id
      left join public.products pr on pr.id = oi.product_id
     where oi.product_id is not null;
  end if;

  -- 3) Захиалгыг цуцална
  update public.orders o
     set status = 'cancelled',
         payment_status = 'failed',
         cancelled_at = now(),
         cancelled_reason = case when s.is_invoice
           then 'Нэхэмжлэлийн төлбөр 24 цагийн дотор баталгаажаагүй тул автоматаар цуцлагдав'
           else 'Төлбөр хийгдээгүй тул автоматаар цуцлагдав' end,
         updated_at = now()
    from _stale s
   where o.id = s.id;

  get diagnostics v_orders = row_count;

  insert into public.order_events (order_id, event_type, description)
  select s.id, 'cancelled',
         case when s.is_invoice
           then 'Нэхэмжлэлийн төлбөр 24 цагийн дотор баталгаажаагүй тул автоматаар цуцлагдаж, нөөц буцаагдав'
           else 'Төлбөр ' || p_minutes || ' минутын дотор хийгдээгүй тул автоматаар цуцлагдаж, нөөц буцаагдав' end
    from _stale s;

  return query select v_orders, v_units;
end $$;

grant execute on function public.release_stale_orders(int) to service_role;

-- ============================================================
-- Бараа ба анхны орлого
-- ============================================================
do $$
declare
  v_brand uuid;
  v_cat uuid;
  v_bj uuid; v_bk uuid; v_pl uuid;
  v_p uuid;
  v_img_jona text;
  v_img_red text;
  v_img_kanzi text := 'https://cppqssgojhonkhvavfth.supabase.co/storage/v1/object/public/products/fruit/belgi-kanzi-1794988568207.jpg';
begin
  select id into v_brand from public.brands where slug = 'vidan-fruit';
  select id into v_cat from public.categories where slug = 'shinekhen-jims';
  if v_brand is null then raise exception 'NO_FRUIT_BRAND'; end if;

  select pi.url into v_img_jona from public.product_images pi
    join public.products p on p.id = pi.product_id
   where p.sku = 'VIDAN051' order by pi.sort_order limit 1;
  select pi.url into v_img_red from public.product_images pi
    join public.products p on p.id = pi.product_id
   where p.sku = 'VIDAN048' order by pi.sort_order limit 1;

  -- Нөөцүүд (идэвхгүй — дэлгүүрт харагдахгүй)
  insert into public.products (sku, name_mn, slug, price, is_active, brand_id, category_id, short_description)
  values ('POOL-BJ', 'Нөөц · Бельги алим Jonagored (0.5кг нэгж)', 'pool-belgi-jonagored', 0, false, v_brand, v_cat, 'Жимсний агуулахын нөөц — зарагдахгүй')
  returning id into v_bj;
  insert into public.products (sku, name_mn, slug, price, is_active, brand_id, category_id, short_description)
  values ('POOL-BK', 'Нөөц · Бельги алим Kanzi (0.5кг нэгж)', 'pool-belgi-kanzi', 0, false, v_brand, v_cat, 'Жимсний агуулахын нөөц — зарагдахгүй')
  returning id into v_bk;
  insert into public.products (sku, name_mn, slug, price, is_active, brand_id, category_id, short_description)
  values ('POOL-PL', 'Нөөц · Польш алим (0.5кг нэгж)', 'pool-polsh-alim', 0, false, v_brand, v_cat, 'Жимсний агуулахын нөөц — зарагдахгүй')
  returning id into v_pl;

  -- Байгаа хоёр барааг шинэ үнэ, нөөцтэй болгоно
  update public.products
     set name_mn = 'Бельги алим Jonagored 8кг хайрцаг', price = 92000,
         short_description = 'Бельгиэс импортолсон шинэхэн Jonagored алим, 8кг бүтэн хайрцаг.',
         stock_source_id = v_bj, stock_unit_qty = 16, is_active = true, updated_at = now()
   where sku = 'VIDAN051';
  update public.products
     set name_mn = 'Польш алим 12кг хайрцаг', slug = 'polsh-alim-12kg', price = 90000,
         short_description = 'Польшоос импортолсон шинэхэн алим, 12кг бүтэн хайрцаг.',
         stock_source_id = v_pl, stock_unit_qty = 24, is_active = true, updated_at = now()
   where sku = 'VIDAN048';

  -- Шинэ бараанууд
  insert into public.products (sku, name_mn, slug, price, is_active, brand_id, category_id,
                               classification_code, short_description, stock_source_id, stock_unit_qty)
  values ('VIDAN052', 'Бельги алим Jonagored 1кг', 'belgi-alim-jonagored-1kg', 12000, true, v_brand, v_cat,
          '0135100', 'Бельгиэс импортолсон шинэхэн Jonagored алим, 1кг савлагаа.', v_bj, 2)
  returning id into v_p;
  insert into public.product_images (product_id, url, sort_order) values (v_p, v_img_jona, 0);

  insert into public.products (sku, name_mn, slug, price, is_active, brand_id, category_id,
                               classification_code, short_description, stock_source_id, stock_unit_qty)
  values ('VIDAN053', 'Бельги алим Kanzi 8кг хайрцаг', 'belgi-alim-kanzi-8kg', 120000, true, v_brand, v_cat,
          '0135100', 'Бельгиэс импортолсон шинэхэн Kanzi алим, 8кг бүтэн хайрцаг.', v_bk, 16)
  returning id into v_p;
  insert into public.product_images (product_id, url, sort_order) values (v_p, v_img_kanzi, 0);

  insert into public.products (sku, name_mn, slug, price, is_active, brand_id, category_id,
                               classification_code, short_description, stock_source_id, stock_unit_qty)
  values ('VIDAN054', 'Бельги алим Kanzi 1кг', 'belgi-alim-kanzi-1kg', 15500, true, v_brand, v_cat,
          '0135100', 'Бельгиэс импортолсон шинэхэн Kanzi алим, 1кг савлагаа.', v_bk, 2)
  returning id into v_p;
  insert into public.product_images (product_id, url, sort_order) values (v_p, v_img_kanzi, 0);

  insert into public.products (sku, name_mn, slug, price, is_active, brand_id, category_id,
                               classification_code, short_description, stock_source_id, stock_unit_qty)
  values ('VIDAN055', 'Польш алим 1кг', 'polsh-alim-1kg', 7900, true, v_brand, v_cat,
          '0135100', 'Польшоос импортолсон шинэхэн алим, 1кг савлагаа.', v_pl, 2)
  returning id into v_p;
  insert into public.product_images (product_id, url, sort_order) values (v_p, v_img_red, 0);

  insert into public.products (sku, name_mn, slug, price, is_active, brand_id, category_id,
                               classification_code, short_description, stock_source_id, stock_unit_qty)
  values ('VIDAN056', 'Польш алим 1.5кг', 'polsh-alim-1-5kg', 11850, true, v_brand, v_cat,
          '0135100', 'Польшоос импортолсон шинэхэн алим, 1.5кг савлагаа.', v_pl, 3)
  returning id into v_p;
  insert into public.product_images (product_id, url, sort_order) values (v_p, v_img_red, 0);

  -- Анхны орлого: сорт бүр 10 хайрцаг (0.5кг нэгжээр)
  insert into public.stock_movements (product_id, kind, quantity, note)
  values (v_bj, 'in', 160, 'Анхны орлого: 10 хайрцаг × 8кг = 80кг'),
         (v_bk, 'in', 160, 'Анхны орлого: 10 хайрцаг × 8кг = 80кг'),
         (v_pl, 'in', 240, 'Анхны орлого: 10 хайрцаг × 12кг = 120кг');
  update public.products set stock = 160 where id = v_bj;
  update public.products set stock = 160 where id = v_bk;
  update public.products set stock = 240 where id = v_pl;
end $$;
