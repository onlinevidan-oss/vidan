-- ============================================================
-- 0048_fruit_role.sql
--   "Vidan fruit" — жимсний компанийн ажилтны эрх.
--
--   Жимсний компани VIDAN-аас өөр тул VIDAN-ы захиалга, хэрэглэгч,
--   тайланг харж БОЛОХГҮЙ. Иймээс:
--
--   1) staff.role-д 'fruit' нэмнэ.
--   2) is_staff()-ээс 'fruit'-ийг ХАСНА. 22 хүснэгтийн RLS бүгд
--      is_staff()-д тулгуурладаг тул жимсний ажилтан PostgREST-ээр шууд
--      хандсан ч VIDAN-ы өгөгдлөөс зөвхөн олон нийтийнхийг (идэвхтэй
--      бараа гэх мэт) харна — fail-closed.
--      Жимсний админы хуудсууд серверт эрхийг шалгаад, зөвхөн жимсний
--      өгөгдлийг шүүж уншина.
--   3) is_fruit_staff() — жимсний хуудас, үйлдлийн эрх шалгалтад.
--   4) staff_activity — жимсний ажилтны үйлдэл ч бичигдэнэ.
--   5) mark_courier_entered — жимсний ажилтан зөвхөн жимс орсон
--      захиалгыг "Шивсэн" болгоно.
--   6) "Vidan fruit" брэнд — ИДЭВХГҮЙ (дэлгүүрт харагдахгүй).
--
--   Идемпотент.
-- ============================================================

-- ---------- 1) Эрх ----------
-- 0001-д багана дээр нэргүй бичсэн тул нэрээр нь биш, агуулгаар нь олж хасна
do $$
declare r record;
begin
  for r in
    select conname from pg_constraint
     where conrelid = 'public.staff'::regclass and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%role%'
  loop
    execute format('alter table public.staff drop constraint %I', r.conname);
  end loop;
end $$;
alter table public.staff add constraint staff_role_check
  check (role in ('admin', 'manager', 'staff', 'driver', 'fruit'));

-- ---------- 2) is_staff — жимсний ажилтныг хасна ----------
create or replace function public.is_staff()
returns bool
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.staff
    where id = auth.uid() and is_active and role <> 'fruit'
  );
$$;

-- ---------- 3) is_fruit_staff ----------
create or replace function public.is_fruit_staff()
returns bool
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.staff
    where id = auth.uid() and is_active and role = 'fruit'
  );
$$;

-- Захиалгад жимсний бараа орсон эсэх (брэнд slug 'vidan-fruit')
create or replace function public.order_has_fruit(p_order_id uuid)
returns bool
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
      from public.order_items oi
      join public.products p on p.id = oi.product_id
      join public.brands b on b.id = p.brand_id
     where oi.order_id = p_order_id and b.slug = 'vidan-fruit'
  );
$$;

-- ---------- 4) Үйлдлийн түүх ----------
drop policy if exists "Activity: fruit insert own" on public.staff_activity;
create policy "Activity: fruit insert own" on public.staff_activity
  for insert with check (public.is_fruit_staff());

-- ---------- 5) "Шивсэн" — жимсний ажилтанд зөвхөн жимсний захиалга ----------
create or replace function public.mark_courier_entered(p_order_id uuid)
returns table(newly_marked boolean, entered_at timestamptz, entered_by_name text, order_number text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_name   text;
  v_role   text;
  v_order  record;
  v_now    timestamptz := now();
begin
  select full_name, role into v_name, v_role
    from public.staff where id = auth.uid() and is_active;
  if v_name is null then
    raise exception 'NOT_STAFF' using errcode = 'P0001';
  end if;
  if v_role = 'fruit' and not public.order_has_fruit(p_order_id) then
    raise exception 'NOT_STAFF' using errcode = 'P0001';
  end if;

  select o.order_number, o.payment_status, o.status,
         o.courier_entered_at, o.courier_entered_by_name
    into v_order
    from public.orders o where o.id = p_order_id
    for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_order.courier_entered_at is not null then
    return query select false, v_order.courier_entered_at,
                        v_order.courier_entered_by_name, v_order.order_number;
    return;
  end if;

  if v_order.payment_status <> 'paid' or v_order.status = 'cancelled' then
    raise exception 'ORDER_NOT_ACTIVE' using errcode = 'P0001';
  end if;

  update public.orders
     set courier_entered_at      = v_now,
         courier_entered_by      = auth.uid(),
         courier_entered_by_name = v_name
   where id = p_order_id;

  insert into public.order_events (order_id, event_type, description, created_by)
  values (p_order_id, 'courier_entered',
          'Хүргэлтийн компанид шивсэн — ' || v_name, auth.uid());

  insert into public.staff_activity (action, summary, entity_type, entity_id)
  values ('courier_entered', v_order.order_number || ' захиалгыг шивсэн',
          'order', p_order_id::text);

  return query select true, v_now, v_name, v_order.order_number;
end $$;

revoke all on function public.mark_courier_entered(uuid) from public, anon;
grant execute on function public.mark_courier_entered(uuid) to authenticated;

-- ---------- 5б) Агуулахын хөдөлгөөн — жимсний ажилтан зөвхөн жимсний бараанд ----------
-- 0034-ийнхтэй ижил, зөвхөн эрхийн шалгалт өргөжсөн
create or replace function public.record_stock_movement(
  p_product_id  uuid,
  p_kind        text,
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
  v_user  uuid := auth.uid();
  v_delta int;
  v_new   int;
  v_mid   uuid;
begin
  if not (
    public.is_staff()
    or (
      public.is_fruit_staff()
      and exists (
        select 1 from public.products p join public.brands b on b.id = p.brand_id
         where p.id = p_product_id and b.slug = 'vidan-fruit'
      )
    )
  ) then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;

  if p_kind not in ('in', 'out', 'adjust') then
    raise exception 'INVALID_KIND' using errcode = 'P0001';
  end if;

  if p_qty is null or p_qty = 0 then
    raise exception 'INVALID_QUANTITY' using errcode = 'P0001';
  end if;

  v_delta := case
    when p_kind = 'in'  then abs(p_qty)
    when p_kind = 'out' then -abs(p_qty)
    else p_qty
  end;

  update public.products
     set stock = stock + v_delta,
         updated_at = now()
   where id = p_product_id
  returning stock into v_new;

  if v_new is null then
    raise exception 'PRODUCT_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_new < 0 then
    raise exception 'INSUFFICIENT_STOCK' using errcode = 'P0001';
  end if;

  insert into public.stock_movements
    (product_id, kind, quantity, note, occurred_at, created_by)
  values (
    p_product_id,
    p_kind,
    v_delta,
    nullif(btrim(coalesce(p_note, '')), ''),
    coalesce(p_occurred_at, now()),
    v_user
  )
  returning id into v_mid;

  return query select p_product_id, v_new, v_mid;
end $$;

-- ---------- 6) Брэнд — идэвхгүй ----------
insert into public.brands (name, slug, is_active, sort_order)
select 'Vidan fruit', 'vidan-fruit', false,
       coalesce((select max(sort_order) from public.brands), 0) + 1
 where not exists (select 1 from public.brands where slug = 'vidan-fruit');

-- ---------- 7) Өөрийгөө шалгах ----------
do $$
begin
  -- Нэвтрээгүй үед (auth.uid() = null) аль аль нь false
  if public.is_staff() or public.is_fruit_staff() then
    raise exception 'is_staff/is_fruit_staff нэвтрээгүй хүнд true буцаалаа';
  end if;
  if not exists (select 1 from public.brands where slug = 'vidan-fruit' and not is_active) then
    raise exception 'Vidan fruit брэнд идэвхгүйгээр үүссэнгүй';
  end if;
  -- Одоогийн бүх админ, менежер is_staff хэвээр (fruit л хасагдсан)
  if exists (select 1 from public.staff where role = 'fruit' and is_active) then
    raise notice 'Идэвхтэй fruit ажилтан байна — VIDAN-ы эрхгүй болно';
  end if;
end $$;
