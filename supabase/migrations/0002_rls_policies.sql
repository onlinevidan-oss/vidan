-- ============================================================
-- VIDAN Shop · Row-Level Security policies
-- ============================================================

-- Helper: одоогийн хэрэглэгч ажилтан мөн эсэх
create or replace function public.is_staff()
returns bool language sql stable security definer as $$
  select exists (
    select 1 from public.staff
    where id = auth.uid() and is_active
  );
$$;

-- Helper: одоогийн хэрэглэгч admin/manager эсэх
create or replace function public.is_admin()
returns bool language sql stable security definer as $$
  select exists (
    select 1 from public.staff
    where id = auth.uid() and is_active and role in ('admin', 'manager')
  );
$$;

-- ============================================================
-- PROFILES
-- ============================================================
alter table public.profiles enable row level security;

create policy "Profiles: self select" on public.profiles
  for select using (auth.uid() = id);

create policy "Profiles: staff can see all" on public.profiles
  for select using (public.is_staff());

create policy "Profiles: self update" on public.profiles
  for update using (auth.uid() = id);

create policy "Profiles: staff can update" on public.profiles
  for update using (public.is_staff());

-- ============================================================
-- ADDRESSES — зөвхөн өөрийнхөө хаягийг
-- ============================================================
alter table public.addresses enable row level security;

create policy "Addresses: self all" on public.addresses
  for all using (auth.uid() = user_id);

create policy "Addresses: staff can view" on public.addresses
  for select using (public.is_staff());

-- ============================================================
-- CATEGORIES — нийтийн уншигдах, зөвхөн admin өөрчилнө
-- ============================================================
alter table public.categories enable row level security;

create policy "Categories: public read" on public.categories
  for select using (is_active);

create policy "Categories: staff read all" on public.categories
  for select using (public.is_staff());

create policy "Categories: admin write" on public.categories
  for all using (public.is_admin());

-- ============================================================
-- PRODUCTS — нийтийн уншигдах (идэвхтэй), зөвхөн staff өөрчилнө
-- ============================================================
alter table public.products enable row level security;

create policy "Products: public read active" on public.products
  for select using (is_active);

create policy "Products: staff read all" on public.products
  for select using (public.is_staff());

create policy "Products: staff write" on public.products
  for all using (public.is_staff());

-- ============================================================
-- PRODUCT IMAGES
-- ============================================================
alter table public.product_images enable row level security;

create policy "Product images: public read" on public.product_images
  for select using (true);

create policy "Product images: staff write" on public.product_images
  for all using (public.is_staff());

-- ============================================================
-- ORDERS — хэрэглэгч зөвхөн өөрийнхөө, staff бүгдийг
-- ============================================================
alter table public.orders enable row level security;

create policy "Orders: self read" on public.orders
  for select using (auth.uid() = user_id);

create policy "Orders: self insert" on public.orders
  for insert with check (auth.uid() = user_id);

create policy "Orders: staff read all" on public.orders
  for select using (public.is_staff());

create policy "Orders: staff write" on public.orders
  for all using (public.is_staff());

-- ============================================================
-- ORDER ITEMS — order-тэйгээ адил permission
-- ============================================================
alter table public.order_items enable row level security;

create policy "Order items: self read" on public.order_items
  for select using (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  );

create policy "Order items: self insert" on public.order_items
  for insert with check (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  );

create policy "Order items: staff all" on public.order_items
  for all using (public.is_staff());

-- ============================================================
-- ORDER EVENTS
-- ============================================================
alter table public.order_events enable row level security;

create policy "Order events: self read" on public.order_events
  for select using (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  );

create policy "Order events: staff all" on public.order_events
  for all using (public.is_staff());

-- ============================================================
-- PROMOTIONS — public read идэвхтэйг, staff бүгдийг
-- ============================================================
alter table public.promotions enable row level security;

create policy "Promotions: public read active" on public.promotions
  for select using (is_active and (ends_at is null or ends_at > now()));

create policy "Promotions: staff all" on public.promotions
  for all using (public.is_staff());

-- ============================================================
-- STAFF — зөвхөн admin өөрчилнө, бусад нь өөрийнхөө мөрийг
-- ============================================================
alter table public.staff enable row level security;

create policy "Staff: self read" on public.staff
  for select using (auth.uid() = id);

create policy "Staff: admin read all" on public.staff
  for select using (public.is_admin());

create policy "Staff: admin write" on public.staff
  for all using (public.is_admin());
