-- ============================================================
-- 0049_discount_card.sql
--   Хэвлэмэл хөнгөлөлтийн карт — QR уншуулаад 5% (нэг удаа).
--
--   Хэвлэлийн газар 300 картад НЭГ л QR хэвлэдэг тул картыг биш
--   ХЭРЭГЛЭГЧИЙГ танина:
--     1) QR → /k/<token> → хэрэглэгч нэвтэрнэ → claim_discount_card()
--        тухайн бүртгэлд картыг холбоно (discount_card_claims).
--     2) Дараагийн захиалгад place_order өөрөө 5%-ийг хасна — код
--        бичих шаардлагагүй. Промо кодтой ДАВХАР хэрэглэж болно.
--     3) Нэг хүн нэг удаа (usage_per_user = 1). Төлөөгүйгээс цуцлагдсан
--        захиалгад зарцуулсан бол дахин ашиглах эрх буцаж ирнэ.
--
--   Картын урамшуулал нь promotions-ийн нэг мөр (kind = 'card'):
--   code = QR дахь token. Ийм мөрийг промо кодын талбарт бичиж
--   ашиглах боломжгүй (validate_promo зөвхөн kind = 'code'-ийг хайна) —
--   эс бөгөөс QR-гүй хүн ч кодоор нь авна.
--
--   Хөнгөлөлт зөвхөн БАРААНЫ үнээс (хүргэлтээс биш), дээд хязгааргүй.
--   Идемпотент.
-- ============================================================

-- ---------- 1) promotions.kind ----------
alter table public.promotions
  add column if not exists kind text not null default 'code';
alter table public.promotions drop constraint if exists promotions_kind_check;
alter table public.promotions
  add constraint promotions_kind_check check (kind in ('code', 'card'));

-- ---------- 2) Нэг захиалгад промо код + карт хоёр зэрэг ----------
alter table public.promo_redemptions
  drop constraint if exists promo_redemptions_order_id_key;
alter table public.promo_redemptions
  drop constraint if exists promo_redemptions_order_promo_key;
alter table public.promo_redemptions
  add constraint promo_redemptions_order_promo_key unique (order_id, promo_id);

-- ---------- 3) Картыг хэн идэвхжүүлсэн ----------
create table if not exists public.discount_card_claims (
  user_id    uuid not null references public.profiles(id)   on delete cascade,
  promo_id   uuid not null references public.promotions(id) on delete cascade,
  claimed_at timestamptz not null default now(),
  primary key (user_id, promo_id)
);

alter table public.discount_card_claims enable row level security;

drop policy if exists "Card claims: self read"  on public.discount_card_claims;
drop policy if exists "Card claims: staff read" on public.discount_card_claims;
create policy "Card claims: self read" on public.discount_card_claims
  for select using (user_id = auth.uid());
create policy "Card claims: staff read" on public.discount_card_claims
  for select using (public.is_staff());
-- Бичих нь зөвхөн claim_discount_card()-аар (security definer)

-- ---------- 4) Хэрэглэгч энэ урамшууллыг хэдэн удаа ашигласан ----------
-- Цуцлагдсан захиалгын хөнгөлөлт тооцогдохгүй: төлөөгүй орхисон захиалга
-- 2 цагийн дараа цуцлагддаг (0029) — тэгэхэд эрх нь буцаж ирэх ёстой.
create or replace function public.promo_used_by(p_promo_id uuid, p_user_id uuid)
returns int
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select count(*)::int
    from public.promo_redemptions r
    join public.orders o on o.id = r.order_id
   where r.promo_id = p_promo_id
     and r.user_id = p_user_id
     and o.status <> 'cancelled';
$$;
revoke all on function public.promo_used_by(uuid, uuid) from public, anon, authenticated;

-- ---------- 5) validate_promo — зөвхөн бичдэг код ----------
-- 0026-аас: kind = 'code' шүүлт, хэрэглэгчийн хязгаарт цуцлагдсаныг тоолохгүй
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
  v_seg      text;
  v_discount bigint;
begin
  if p_code is null or btrim(p_code) = '' then
    return query select false, null::uuid, 0::bigint, 'EMPTY'::text;
    return;
  end if;

  select * into v_p from public.promotions
   where upper(code) = upper(btrim(p_code)) and kind = 'code';

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

  if p_user_id is not null and v_p.usage_per_user is not null
     and public.promo_used_by(v_p.id, p_user_id) >= v_p.usage_per_user then
    return query select false, v_p.id, 0::bigint, 'USER_LIMIT'::text; return;
  end if;

  if v_p.segment is not null and v_p.segment <> 'all' and p_user_id is not null then
    select segment into v_seg from public.profiles where id = p_user_id;
    if coalesce(v_seg, 'new') <> v_p.segment then
      return query select false, v_p.id, 0::bigint, 'SEGMENT'::text; return;
    end if;
  end if;

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

-- ---------- 6) Хэрэглэгчид одоо хэрэгжих картын урамшуулал ----------
-- Идэвхжүүлсэн, хүчинтэй, ашиглаагүй картуудаас хамгийн их хөнгөлөлттэйг.
-- place_order дотроос p_lock = true-гаар дуудна: claim мөрийг түгжиж,
-- зэрэг илгээсэн хоёр захиалга хоёулаа хөнгөлөлт авахаас сэргийлнэ.
create or replace function public.card_discount_for(
  p_user_id  uuid,
  p_subtotal bigint,
  p_lock     boolean default false
)
returns table(promo_id uuid, name text, percent numeric, discount bigint, ends_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_p    record;
  v_disc bigint;
  v_best record;
  v_best_disc bigint := -1;
begin
  if p_user_id is null then return; end if;

  for v_p in
    select p.*
      from public.discount_card_claims c
      join public.promotions p on p.id = c.promo_id
     where c.user_id = p_user_id
       and p.kind = 'card'
       and p.is_active
       and p.type = 'percent'
       and (p.starts_at is null or now() >= p.starts_at)
       and (p.ends_at   is null or now() <= p.ends_at)
       and (p.usage_limit is null or p.usage_count < p.usage_limit)
       and p_subtotal >= coalesce(p.min_order, 0)
  loop
    if p_lock then
      perform 1 from public.discount_card_claims
       where user_id = p_user_id and discount_card_claims.promo_id = v_p.id
       for update;
    end if;
    if v_p.usage_per_user is not null
       and public.promo_used_by(v_p.id, p_user_id) >= v_p.usage_per_user then
      continue;
    end if;

    v_disc := round(p_subtotal * v_p.value / 100.0)::bigint;
    if v_p.max_discount is not null then
      v_disc := least(v_disc, v_p.max_discount);
    end if;
    v_disc := greatest(0::bigint, least(v_disc, p_subtotal));

    if v_disc > v_best_disc then
      v_best := v_p;
      v_best_disc := v_disc;
    end if;
  end loop;

  if v_best_disc > 0 then
    return query select v_best.id, v_best.name, v_best.value, v_best_disc, v_best.ends_at;
  end if;
end $$;
revoke all on function public.card_discount_for(uuid, bigint, boolean) from public, anon, authenticated;

-- Checkout-д харуулах: нэвтэрсэн хэрэглэгчийн картын хувь (дүнг client бодно,
-- place_order дахин серверт бодно)
create or replace function public.my_discount_card()
returns table(promo_id uuid, name text, percent numeric, ends_at timestamptz)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select promo_id, name, percent, ends_at
    from public.card_discount_for(auth.uid(), 9223372036854775807::bigint / 100);
$$;
revoke all on function public.my_discount_card() from public, anon;
grant execute on function public.my_discount_card() to authenticated;

-- ---------- 7) QR уншуулахад картыг бүртгэлд холбох ----------
-- status: claimed — идэвхтэй, дараагийн захиалгад хасагдана
--         used     — аль хэдийн ашигласан
--         expired / inactive / not_found / auth
create or replace function public.claim_discount_card(p_token text)
returns table(status text, name text, percent numeric, ends_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_p    record;
begin
  select * into v_p from public.promotions
   where kind = 'card' and upper(code) = upper(btrim(coalesce(p_token, '')));
  if not found then
    return query select 'not_found'::text, null::text, null::numeric, null::timestamptz;
    return;
  end if;
  if v_user is null then
    return query select 'auth'::text, v_p.name, v_p.value, v_p.ends_at; return;
  end if;
  if not v_p.is_active or (v_p.starts_at is not null and now() < v_p.starts_at) then
    return query select 'inactive'::text, v_p.name, v_p.value, v_p.ends_at; return;
  end if;
  if v_p.ends_at is not null and now() > v_p.ends_at then
    return query select 'expired'::text, v_p.name, v_p.value, v_p.ends_at; return;
  end if;

  insert into public.discount_card_claims (user_id, promo_id)
  values (v_user, v_p.id)
  on conflict do nothing;

  if v_p.usage_per_user is not null
     and public.promo_used_by(v_p.id, v_user) >= v_p.usage_per_user then
    return query select 'used'::text, v_p.name, v_p.value, v_p.ends_at; return;
  end if;

  return query select 'claimed'::text, v_p.name, v_p.value, v_p.ends_at;
end $$;
revoke all on function public.claim_discount_card(text) from public;
grant execute on function public.claim_discount_card(text) to anon, authenticated;

-- ---------- 8) place_order — карт автоматаар ----------
-- 0028-ынхтай ижил, зөвхөн "КАРТ" хэсэг нэмэгдсэн
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
    v_promo_disc := v_promo.discount;
    v_promo_id := v_promo.promo_id;
  end if;

  -- ---------- КАРТ (QR-аар идэвхжүүлсэн) ----------
  -- Промо кодтой давхар: хоёулаа барааны дүнгээс тус тусдаа бодогдоно
  select * into v_card
    from public.card_discount_for(v_user_id, v_subtotal, true);
  if v_card.promo_id is not null then
    v_card.discount := least(v_card.discount, v_subtotal - v_promo_disc);
  end if;
  v_discount := v_promo_disc + coalesce(greatest(v_card.discount, 0), 0);

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

  insert into public.order_events (order_id, event_type, description)
  values (v_order_id, 'created', 'Захиалга үүссэн');

  return query select v_order_id, v_order_number, v_totals.total;
end $$;
grant execute on function public.place_order(uuid, text, jsonb, text, text) to authenticated;

-- ---------- 9) Хэвлэмэл карт — 5%, 2027-04-30-ныг дуустал (УБ) ----------
insert into public.promotions
  (code, name, type, value, min_order, max_discount, segment,
   starts_at, ends_at, usage_limit, usage_per_user, is_active, kind)
select '9Q7M29', 'Хөнгөлөлтийн карт 5%', 'percent', 5, 0, null, 'all',
       now(), '2027-04-30T23:59:59+08:00', null, 1, true, 'card'
 where not exists (select 1 from public.promotions where upper(code) = '9Q7M29');

-- ---------- 10) Өөрийгөө шалгах ----------
do $$
declare v record;
begin
  -- Картын кодыг промо кодын талбарт бичиж болохгүй
  select * into v from public.validate_promo('9Q7M29', null, 100000);
  if v.valid or v.error <> 'NOT_FOUND' then
    raise exception 'Картын код промо код болж ажиллаж байна';
  end if;
  -- Нэвтрээгүй үед claim → auth
  select * into v from public.claim_discount_card('9q7m29');
  if v.status <> 'auth' then
    raise exception 'claim_discount_card нэвтрээгүйд %', v.status;
  end if;
  select * into v from public.claim_discount_card('BURUU1');
  if v.status <> 'not_found' then
    raise exception 'Буруу token-д %', v.status;
  end if;
  -- Хэрэглэгчгүй үед карт хэрэгжихгүй
  if exists (select 1 from public.card_discount_for(null, 100000, false)) then
    raise exception 'card_discount_for null хэрэглэгчид хөнгөлөлт буцаалаа';
  end if;
end $$;
