-- ============================================================
-- 0013_brands.sql
--   Олон брэндтэй дэлгүүр: brands хүснэгт + products.brand_id.
--   Брэнд бүр нүүр хуудсанд логотойгоо харагдана; дотогш ороход тухайн
--   брэндийн бүтээгдэхүүнүүд. "Бүгд" = бүх брэндийн бүтээгдэхүүн.
-- ============================================================

create table if not exists public.brands (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text unique not null,
  logo_url    text,
  card_from   text,                 -- картын gradient эхлэл (hex)
  card_to     text,                 -- картын gradient төгсгөл (hex)
  logo_mode   text not null default 'contain'  -- 'contain' (лого) | 'cover' (банер дүүрэн)
                check (logo_mode in ('contain', 'cover')),
  sort_order  int  not null default 0,
  is_active   bool not null default true,
  created_at  timestamptz not null default now()
);

alter table public.products
  add column if not exists brand_id uuid references public.brands(id) on delete set null;
create index if not exists products_brand_idx on public.products (brand_id);

-- RLS: brands нийтэд уншигдана, зөвхөн staff бичнэ
alter table public.brands enable row level security;
drop policy if exists "Brands: public read" on public.brands;
create policy "Brands: public read" on public.brands
  for select using (true);
drop policy if exists "Brands: staff write" on public.brands;
create policy "Brands: staff write" on public.brands
  for all using (public.is_staff()) with check (public.is_staff());

-- ============================================================
-- Брэндүүд
-- ============================================================
insert into public.brands (slug, name, logo_url, card_from, card_to, logo_mode, sort_order)
values
  ('vidan',   'VIDAN',   'BASE/brands/vidan.png',   '#e12b2a', '#b81e22', 'contain', 1),
  ('mangas',  'Мангас',  'BASE/brands/mangas.png',  '#141414', '#000000', 'contain', 2),
  ('alimhan', 'Алимхан', 'BASE/brands/alimhan.png', '#f0f7d8', '#b5d33d', 'contain', 3),
  ('owolovo', 'Owolovo', 'BASE/brands/owolovo.png', '#2d6a4f', '#1b4332', 'contain', 4),
  ('black',   'Black',   'BASE/brands/black.png',   '#2a2a2a', '#050505', 'contain', 5)
on conflict (slug) do update set
  logo_url = excluded.logo_url,
  card_from = excluded.card_from,
  card_to = excluded.card_to,
  logo_mode = excluded.logo_mode,
  sort_order = excluded.sort_order;

-- ============================================================
-- Бүтээгдэхүүн → брэнд хуваарилалт (SKU-гаар)
-- ============================================================
-- Owolovo (Польш органик pouch-ууд)
update public.products set brand_id = (select id from public.brands where slug='owolovo')
  where sku in ('VIDAN033','VIDAN034','VIDAN035','VIDAN036','VIDAN037','VIDAN038','VIDAN039','VIDAN040');

-- Алимхан (хүүхдийн нухаш)
update public.products set brand_id = (select id from public.brands where slug='alimhan')
  where sku in ('VIDAN028','VIDAN029','VIDAN030');

-- Мангас (соус)
update public.products set brand_id = (select id from public.brands where slug='mangas')
  where sku in ('VIDAN011','VIDAN012');

-- Үлдсэн бүгд → VIDAN
update public.products set brand_id = (select id from public.brands where slug='vidan')
  where brand_id is null;
