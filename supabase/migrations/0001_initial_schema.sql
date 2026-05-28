-- ============================================================
-- VIDAN Shop · Initial schema
-- Tables: profiles, addresses, categories, products,
--         product_images, orders, order_items, order_events,
--         promotions, staff
-- ============================================================

-- Helper: updated_at-ыг автоматаар сэргээх trigger function
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ============================================================
-- PROFILES — Supabase Auth-тай 1:1 холбогдсон
-- ============================================================
create table public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  phone           text unique,
  full_name       text,
  email           text,
  avatar_url      text,
  segment         text not null default 'new'
                    check (segment in ('new', 'active', 'vip', 'inactive')),
  total_orders    int  not null default 0,
  total_spent     bigint not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index profiles_phone_idx on public.profiles (phone);
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ============================================================
-- ADDRESSES
-- ============================================================
create table public.addresses (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  label           text not null default 'Гэр',
  district        text,
  khoroo          text,
  detail          text not null,
  is_default      bool not null default false,
  created_at      timestamptz not null default now()
);
create index addresses_user_idx on public.addresses (user_id);

-- ============================================================
-- CATEGORIES
-- ============================================================
create table public.categories (
  id              uuid primary key default gen_random_uuid(),
  name_mn         text not null,
  name_en         text,
  slug            text unique not null,
  emoji           text,
  color_gradient  text,
  sort_order      int  not null default 0,
  parent_id       uuid references public.categories(id) on delete set null,
  is_active       bool not null default true,
  is_featured     bool not null default false,
  created_at      timestamptz not null default now()
);
create index categories_slug_idx on public.categories (slug);
create index categories_parent_idx on public.categories (parent_id);

-- ============================================================
-- PRODUCTS
-- ============================================================
create table public.products (
  id                uuid primary key default gen_random_uuid(),
  category_id       uuid references public.categories(id) on delete set null,
  sku               text unique not null,
  barcode           text,
  name_mn           text not null,
  name_en           text,
  slug              text unique not null,
  short_description text,
  description       text,
  price             bigint not null check (price >= 0),
  old_price         bigint check (old_price >= 0),
  cost_price        bigint check (cost_price >= 0),
  stock             int  not null default 0,
  stock_threshold   int  not null default 20,
  weight_net_g      int,
  weight_gross_g    int,
  shelf_life        text,
  is_active         bool not null default true,
  is_featured       bool not null default false,
  is_new            bool not null default false,
  is_bio            bool not null default false,
  tags              text[] default '{}'::text[],
  meta_description  text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index products_category_idx on public.products (category_id);
create index products_slug_idx on public.products (slug);
create index products_active_idx on public.products (is_active) where is_active;
create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- ============================================================
-- PRODUCT IMAGES
-- ============================================================
create table public.product_images (
  id              uuid primary key default gen_random_uuid(),
  product_id      uuid not null references public.products(id) on delete cascade,
  url             text not null,
  alt             text,
  sort_order      int  not null default 0,
  created_at      timestamptz not null default now()
);
create index product_images_product_idx on public.product_images (product_id);

-- ============================================================
-- ORDERS
-- ============================================================
create sequence if not exists public.order_number_seq start with 10248;

create table public.orders (
  id                uuid primary key default gen_random_uuid(),
  order_number      text unique not null default ('#' || nextval('public.order_number_seq')),
  user_id           uuid references public.profiles(id) on delete set null,
  address_id        uuid references public.addresses(id) on delete set null,
  status            text not null default 'new'
                      check (status in ('new', 'preparing', 'shipping', 'delivered', 'cancelled')),
  payment_method    text check (payment_method in ('qpay', 'card', 'cash', 'toki', 'socialpay')),
  payment_status    text not null default 'pending'
                      check (payment_status in ('pending', 'paid', 'failed', 'refunded')),
  payment_ref       text,
  subtotal          bigint not null default 0,
  discount          bigint not null default 0,
  shipping          bigint not null default 0,
  tax               bigint not null default 0,
  total             bigint not null default 0,
  promo_code        text,
  driver_notes      text,
  internal_notes    text,
  delivery_window   text,
  delivered_at      timestamptz,
  cancelled_at      timestamptz,
  cancelled_reason  text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index orders_user_idx on public.orders (user_id);
create index orders_status_idx on public.orders (status);
create index orders_created_idx on public.orders (created_at desc);
create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- ============================================================
-- ORDER ITEMS
-- ============================================================
create table public.order_items (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references public.orders(id) on delete cascade,
  product_id      uuid references public.products(id) on delete set null,
  product_name    text not null,   -- snapshot үед нь
  product_sku     text,
  quantity        int  not null check (quantity > 0),
  unit_price      bigint not null,
  subtotal        bigint not null,
  created_at      timestamptz not null default now()
);
create index order_items_order_idx on public.order_items (order_id);
create index order_items_product_idx on public.order_items (product_id);

-- ============================================================
-- ORDER EVENTS — timeline-ийн түүх
-- ============================================================
create table public.order_events (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references public.orders(id) on delete cascade,
  event_type      text not null,
  description     text,
  created_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now()
);
create index order_events_order_idx on public.order_events (order_id, created_at);

-- ============================================================
-- PROMOTIONS
-- ============================================================
create table public.promotions (
  id              uuid primary key default gen_random_uuid(),
  code            text unique not null,
  name            text not null,
  description     text,
  type            text not null
                    check (type in ('percent', 'fixed', 'bogo', 'free_shipping')),
  value           numeric(10, 2) not null default 0,
  min_order       bigint default 0,
  max_discount    bigint,
  segment         text default 'all'
                    check (segment in ('all', 'new', 'vip')),
  starts_at       timestamptz not null default now(),
  ends_at         timestamptz,
  usage_limit     int,
  usage_per_user  int default 1,
  usage_count     int  not null default 0,
  is_active       bool not null default true,
  visual_style    text default 'red',
  created_at      timestamptz not null default now()
);
create index promotions_code_idx on public.promotions (code);
create index promotions_active_idx on public.promotions (is_active, ends_at);

-- ============================================================
-- STAFF — Backoffice ажилтан
-- ============================================================
create table public.staff (
  id              uuid primary key references auth.users(id) on delete cascade,
  full_name       text not null,
  email           text unique not null,
  phone           text,
  role            text not null default 'staff'
                    check (role in ('admin', 'manager', 'staff', 'driver')),
  is_active       bool not null default true,
  last_login_at   timestamptz,
  created_at      timestamptz not null default now()
);
create index staff_role_idx on public.staff (role) where is_active;

-- ============================================================
-- Trigger: auth.users үүсэх үед profile автоматаар үүсгэх
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, phone, email, full_name)
  values (
    new.id,
    new.phone,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
