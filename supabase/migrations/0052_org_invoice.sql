-- ============================================================
-- 0052_org_invoice.sql
--   БАЙГУУЛЛАГЫН НЭХЭМЖЛЭЛ (эзэн, 2026-11-17)
--
--   Байгууллага сайтаас өөрөө РД, нэрээ оруулж "Нэхэмжлэлээр төлөх"
--   сонгоно. Нэхэмжлэл (Сангийн сайдын 347-р тушаалын маягт) дээр
--   данс + QPay QR. 24 цагийн дотор төлөгдөөгүй бол автоматаар
--   цуцлагдана (хэрэглэгчид SMS — апп талын cron илгээнэ).
--   И-баримтыг нягтлан ГАРААР гаргана — систем гаргахгүй.
--
--   Шөнийн дүрэм (0039) хэвээр: хугацаа 22:00–09:00 (UB)-д таарвал
--   өглөөний 09:00 хүртэл сунгана. Хугацааг захиалга дээр ХАДГАЛНА
--   (invoice_due_at) — нэхэмжлэл, админ, цуцлалт бүгд нэг тооноос уншина.
-- ============================================================

alter table public.orders
  add column if not exists invoice_org_name text,
  add column if not exists invoice_email text,
  add column if not exists invoice_due_at timestamptz;

alter table public.orders
  drop constraint if exists orders_invoice_email_len;
alter table public.orders
  add constraint orders_invoice_email_len
  check (invoice_email is null or (length(invoice_email) <= 254 and invoice_email like '%_@_%._%'));

alter table public.orders
  drop constraint if exists orders_invoice_org_name_len;
alter table public.orders
  add constraint orders_invoice_org_name_len
  check (invoice_org_name is null or length(invoice_org_name) <= 200);

alter table public.orders drop constraint if exists orders_payment_method_check;
alter table public.orders add constraint orders_payment_method_check
  check (payment_method in ('qpay','card','cash','toki','socialpay','invoice'));

-- Нэхэмжлэлийн төлөх эцсийн хугацаа: +24 цаг; UB 22:00–09:00-д
-- таарвал дараагийн 09:00.
create or replace function public.invoice_due_at(p_created timestamptz)
returns timestamptz
language sql stable
set search_path = public, pg_temp as $$
  with b as (
    select (p_created + interval '24 hours') as due,
           ((p_created + interval '24 hours') at time zone 'Asia/Ulaanbaatar') as loc
  )
  select case
    when extract(hour from loc) >= 22
      then (date_trunc('day', loc) + interval '1 day 9 hours') at time zone 'Asia/Ulaanbaatar'
    when extract(hour from loc) < 9
      then (date_trunc('day', loc) + interval '9 hours') at time zone 'Asia/Ulaanbaatar'
    else due
  end
  from b
$$;

-- Нэхэмжлэл үүссэн SMS нэг захиалгад нэг л удаа
create unique index if not exists order_events_sms_invoice_once_idx
  on public.order_events (order_id, event_type)
  where event_type = 'sms_invoice';

-- Нэхэмжлэлийг имэйлээр нэг л удаа автоматаар илгээнэ
create unique index if not exists order_events_email_invoice_once_idx
  on public.order_events (order_id, event_type)
  where event_type = 'email_invoice';

-- place_order — 0051-тэй ижил; 'invoice' арга ба invoice_due_at нэмэгдсэн
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
-- release_stale_orders — 0039-тэй ижил; нэхэмжлэлийн захиалга
-- 120 минутаар биш invoice_due_at-аар цуцлагдана.
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
    select oi.product_id, sum(oi.quantity)::int as qty
      from public.order_items oi
      join _stale s on s.id = oi.order_id
     where oi.product_id is not null
     group by oi.product_id
  )
  update public.products p
     set stock = p.stock + b.qty,
         updated_at = now()
    from back b
   where p.id = b.product_id;

  select coalesce(sum(oi.quantity), 0)::int into v_units
    from public.order_items oi
    join _stale s on s.id = oi.order_id
   where oi.product_id is not null;

  -- 2) Хөдөлгөөнд бүртгэнэ
  if to_regclass('public.stock_movements') is not null then
    insert into public.stock_movements (product_id, kind, quantity, order_id, note)
    select oi.product_id, 'in', oi.quantity, s.id,
           'Төлөгдөөгүй захиалга цуцлагдав ' || s.order_number
      from public.order_items oi
      join _stale s on s.id = oi.order_id
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
