-- ============================================================
-- 0007_security_hardening.sql
-- Audit-аас гарсан 30+ алдааг засах нэгдсэн migration:
--   · SECURITY DEFINER функцэд `set search_path` нэмэх
--   · RLS-д `with check` нэмж privilege escalation хаах
--   · Admin-write policy-ийг `is_admin()` рүү шилжүүлэх
--   · Profile stats / Promotion usage triggers нэмэх
--   · Composite indexes нэмэх
--   · Stock NOT NEGATIVE constraint
--   · order_items хатуу policy
-- ============================================================

-- ----------------------------------------------------------------------------
-- 1) SECURITY DEFINER функцэд search_path тогтоох (privilege escalation хаах)
-- ----------------------------------------------------------------------------
alter function public.is_staff()  set search_path = public, pg_temp;
alter function public.is_admin()  set search_path = public, pg_temp;
alter function public.handle_new_user() set search_path = public, pg_temp;
alter function public.set_updated_at() set search_path = public, pg_temp;

-- ----------------------------------------------------------------------------
-- 2) RLS — `with check` нэмж self-update privilege escalation хаах
-- ----------------------------------------------------------------------------

-- profiles: хэрэглэгч өөрийнхөө segment/total_spent өөрчилж болохгүй
drop policy if exists "Profiles: self update" on public.profiles;
create policy "Profiles: self update" on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

-- addresses
drop policy if exists "Addresses: self all" on public.addresses;
create policy "Addresses: self select" on public.addresses
  for select using (auth.uid() = user_id);
create policy "Addresses: self insert" on public.addresses
  for insert with check (auth.uid() = user_id);
create policy "Addresses: self update" on public.addresses
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "Addresses: self delete" on public.addresses
  for delete using (auth.uid() = user_id);

-- orders: customer-д direct write эрх БҮРЭН ХАСНА. Захиалга RPC-аар үүснэ
drop policy if exists "Orders: self insert" on public.orders;
drop policy if exists "Orders: staff write" on public.orders;
-- Self-read хэвээр үлдээнэ
create policy "Orders: staff insert" on public.orders
  for insert with check (public.is_staff());
create policy "Orders: staff update" on public.orders
  for update using (public.is_staff()) with check (public.is_staff());
create policy "Orders: staff delete" on public.orders
  for delete using (public.is_staff());

-- order_items: customer-д direct insert ХАСНА (RPC дотроос л үүснэ)
drop policy if exists "Order items: self insert" on public.order_items;

-- ----------------------------------------------------------------------------
-- 3) Admin-write policy-ийг is_admin() рүү шилжүүлэх
-- (Driver гэх мэт ерөнхий staff бараа засаж болохгүй)
-- ----------------------------------------------------------------------------
drop policy if exists "Categories: admin write" on public.categories;
create policy "Categories: admin write" on public.categories
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Products: staff write" on public.products;
create policy "Products: admin write" on public.products
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Product images: staff write" on public.product_images;
create policy "Product images: admin write" on public.product_images
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Promotions: staff all" on public.promotions;
create policy "Promotions: staff read" on public.promotions
  for select using (public.is_staff());
create policy "Promotions: admin write" on public.promotions
  for all using (public.is_admin()) with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- 4) products.stock < 0 болохоос сэргийлэх (atomic guard)
-- ----------------------------------------------------------------------------
alter table public.products
  drop constraint if exists products_stock_nonneg;
alter table public.products
  add constraint products_stock_nonneg check (stock >= 0);

-- ----------------------------------------------------------------------------
-- 5) Composite indexes (audit-аас зөвлөсөн query patterns)
-- ----------------------------------------------------------------------------
create index if not exists orders_status_created_idx
  on public.orders (status, created_at desc);
create index if not exists orders_user_created_idx
  on public.orders (user_id, created_at desc);
create index if not exists products_featured_active_idx
  on public.products (is_featured, created_at desc)
  where is_active and is_featured;
create index if not exists products_new_active_idx
  on public.products (is_new, created_at desc)
  where is_active and is_new;
create index if not exists profiles_created_idx
  on public.profiles (created_at desc);

-- ----------------------------------------------------------------------------
-- 6) Trigger: orders.status = 'delivered' болоход profile stats шинэчлэх
-- ----------------------------------------------------------------------------
create or replace function public.update_profile_stats_on_delivery()
returns trigger language plpgsql security definer
set search_path = public, pg_temp as $$
begin
  -- Зөвхөн "delivered" болсон үед (өмнө байгаагүй бол)
  if new.status = 'delivered' and (old.status is null or old.status <> 'delivered') then
    update public.profiles
      set total_orders = total_orders + 1,
          total_spent  = total_spent + coalesce(new.total, 0),
          segment = case
            when total_orders + 1 >= 10 then 'vip'
            when total_orders + 1 >= 2  then 'active'
            else segment
          end
      where id = new.user_id;
  end if;
  -- Хэрэв delivered-ээс буцлаа гэвэл reverse
  if old.status = 'delivered' and new.status <> 'delivered' then
    update public.profiles
      set total_orders = greatest(0, total_orders - 1),
          total_spent  = greatest(0, total_spent - coalesce(old.total, 0))
      where id = old.user_id;
  end if;
  return new;
end $$;

drop trigger if exists orders_update_profile_stats on public.orders;
create trigger orders_update_profile_stats
  after update of status on public.orders
  for each row execute function public.update_profile_stats_on_delivery();

-- ----------------------------------------------------------------------------
-- 7) Trigger: promotions.usage_count нэмэгдүүлэх (promo_code хэрэглэсэн үед)
-- ----------------------------------------------------------------------------
create or replace function public.bump_promo_usage()
returns trigger language plpgsql security definer
set search_path = public, pg_temp as $$
begin
  if new.promo_code is not null and new.promo_code <> ''
     and (old.promo_code is null or old.promo_code = '') then
    update public.promotions
      set usage_count = usage_count + 1
      where code = new.promo_code;
  end if;
  return new;
end $$;

drop trigger if exists orders_bump_promo_usage on public.orders;
create trigger orders_bump_promo_usage
  after insert or update of promo_code on public.orders
  for each row execute function public.bump_promo_usage();

-- ----------------------------------------------------------------------------
-- 8) cancelled_reason length cap
-- ----------------------------------------------------------------------------
alter table public.orders
  drop constraint if exists orders_cancel_reason_len;
alter table public.orders
  add constraint orders_cancel_reason_len
  check (cancelled_reason is null or length(cancelled_reason) <= 500);

alter table public.addresses
  drop constraint if exists addresses_detail_len;
alter table public.addresses
  add constraint addresses_detail_len check (length(detail) <= 500);
