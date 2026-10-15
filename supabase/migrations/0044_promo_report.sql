-- ============================================================
-- 0044_promo_report.sql
--   Урамшууллын тайланд хэрэгтэй өгөгдөл.
--
--   1) order_items.list_price / sale_campaign — мөр бүрийн ХЯМДРАЛЫН
--      ӨМНӨХ үнэ ба кампанит ажлын код. Кампанит ажил products.price-ийг
--      шууд бууруулдаг (0020) тул өмнө нь захиалгын мөрөнд зөвхөн
--      хямдарсан үнэ үлдэж, "хэдэн төгрөгийн хямдрал эдэлсэн" гэдэг
--      алдагддаг байв (#10305: 2,250 = 2,500 × 0.9).
--      BEFORE INSERT trigger бөглөнө — place_order-т хүрэхгүй, захиалгын
--      дүн, төлбөр огт өөрчлөгдөхгүй.
--
--   2) sale_campaign_log — кампанит ажлын тохиргооны ТҮҮХ. site_settings
--      нь зөвхөн сүүлийн тохиргоог хадгалдаг, код нь ч тогтмол
--      ("vidan-sep-2026") тул хэзээ, хэдэн хувиар зарлагдсаныг эндээс
--      л мэднэ.
--
--   3) Өнгөрсөн өгөгдлийг нөхнө (9-р сарын VIDAN 10%).
--
--   Идемпотент — дахин ажиллуулахад давхардахгүй.
-- ============================================================

-- ---------- 1) Захиалгын мөрийн хямдралын өмнөх үнэ ----------
alter table public.order_items
  add column if not exists list_price bigint,
  add column if not exists sale_campaign text;

comment on column public.order_items.list_price is
  'Хямдралын ӨМНӨХ нэгжийн үнэ (products.old_price эсвэл price). unit_price-аас их бол бараа хямдралтай зарагдсан';
comment on column public.order_items.sale_campaign is
  'Хямдралыг үүсгэсэн кампанит ажлын код (products.sale_campaign) — гараар хямдруулсан бол null';

-- Цэвэр функц — trigger ба доорх өөрийгөө шалгах хэсэг хоёулаа дуудна.
-- Хямдралын өмнөх үнэ: зураастай үнэ (old_price) зарагдсан үнээс их бол
-- тэр (кампанит ажлын кодтой нь), эс бол зарагдсан үнэ өөрөө.
create or replace function public.order_item_list_price(
  p_unit_price bigint,
  p_old_price  bigint,
  p_campaign   text,
  out list_price    bigint,
  out sale_campaign text
)
language sql
immutable
as $$
  select case when p_old_price is not null and p_old_price > p_unit_price
              then p_old_price else p_unit_price end,
         case when p_old_price is not null and p_old_price > p_unit_price
              then p_campaign end
$$;

create or replace function public.order_item_price_snapshot()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_old_price bigint;
  v_campaign  text;
  v_snap      record;
begin
  if new.list_price is not null then
    return new;
  end if;
  select old_price, sale_campaign into v_old_price, v_campaign
    from public.products where id = new.product_id;
  v_snap := public.order_item_list_price(new.unit_price, v_old_price, v_campaign);
  new.list_price    := v_snap.list_price;
  new.sale_campaign := v_snap.sale_campaign;
  return new;
end $$;

drop trigger if exists order_items_price_snapshot on public.order_items;
create trigger order_items_price_snapshot
  before insert on public.order_items
  for each row execute function public.order_item_price_snapshot();

-- ---------- 2) Кампанит ажлын түүх ----------
create table if not exists public.sale_campaign_log (
  id          uuid primary key default gen_random_uuid(),
  code        text not null,
  name        text,
  brand_slug  text,
  percent     numeric,
  starts_at   timestamptz,
  ends_at     timestamptz,
  enabled     boolean not null default false,
  recorded_at timestamptz not null default now()
);
create index if not exists sale_campaign_log_recorded_idx
  on public.sale_campaign_log (recorded_at);

alter table public.sale_campaign_log enable row level security;
drop policy if exists "Campaign log: staff read" on public.sale_campaign_log;
create policy "Campaign log: staff read" on public.sale_campaign_log
  for select using (public.is_staff());

create or replace function public.log_sale_campaign()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.key <> 'sale_campaign' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.value is not distinct from new.value then
    return new;
  end if;
  insert into public.sale_campaign_log
    (code, name, brand_slug, percent, starts_at, ends_at, enabled)
  values (
    coalesce(new.value->>'code', 'campaign'),
    new.value->>'name',
    new.value->>'brand_slug',
    (new.value->>'percent')::numeric,
    (new.value->>'starts_at')::timestamptz,
    (new.value->>'ends_at')::timestamptz,
    coalesce((new.value->>'enabled')::boolean, false)
  );
  return new;
end $$;

drop trigger if exists site_settings_log_sale_campaign on public.site_settings;
create trigger site_settings_log_sale_campaign
  after insert or update on public.site_settings
  for each row execute function public.log_sale_campaign();

-- ---------- 3) Өнгөрсөн өгөгдөл ----------
-- 9-р сарын кампанит ажил хоёр тохиргоотой ажилласан:
--   а) 0020-ийн анхны: УБ 09-01 00:00 → 09-08 00:00
--   б) админ 09-08 13:59-д (УБ) сунгасан: 09-08 00:00 → 09-15 00:00
-- (б) нь site_settings-ийн одоогийн утга ба updated_at-тай яг таарна.
insert into public.sale_campaign_log
  (code, name, brand_slug, percent, starts_at, ends_at, enabled, recorded_at)
select v.code, v.name, v.brand_slug, v.percent, v.starts_at, v.ends_at, true, v.recorded_at
  from (values
    ('vidan-sep-2026', 'VIDAN 10% хямдрал', 'vidan', 10::numeric,
     '2026-08-31T16:00:00+00:00'::timestamptz, '2026-09-07T16:00:00+00:00'::timestamptz,
     '2026-08-31T15:00:00+00:00'::timestamptz),
    ('vidan-sep-2026', 'VIDAN 10% хямдрал', 'vidan', 10::numeric,
     '2026-09-07T16:00:00+00:00'::timestamptz, '2026-09-14T16:00:00+00:00'::timestamptz,
     '2026-09-08T05:59:16.524+00:00'::timestamptz)
  ) as v(code, name, brand_slug, percent, starts_at, ends_at, recorded_at)
 where not exists (
   select 1 from public.sale_campaign_log l
    where l.code = v.code and l.starts_at = v.starts_at and l.ends_at = v.ends_at
 );

-- 9-р сарын хямдралаар зарагдсан мөрүүд: VIDAN брэнд, захиалга кампанит
-- ажлын хугацаанд, зарагдсан үнэ = round(одоогийн үнэ × 0.9).
-- Одоогийн үнэ = хямдралын өмнөх үнэ (тэр цагаас хойш үнэ өөрчлөгдөөгүй —
-- батлагдсан үнийн жагсаалттай 47-уулаа таарсан).
update public.order_items oi
   set list_price    = p.price,
       sale_campaign = 'vidan-sep-2026'
  from public.orders o, public.products p, public.brands b
 where o.id = oi.order_id
   and p.id = oi.product_id
   and b.id = p.brand_id
   and b.slug = 'vidan'
   and oi.list_price is null
   and o.created_at >= '2026-08-31T16:00:00+00:00'
   and o.created_at <  '2026-09-14T16:00:00+00:00'
   and oi.unit_price = round(p.price * 0.9)::bigint
   and oi.unit_price < p.price;

-- Бусад бүх мөр — хямдралын мэдээлэл байхгүй, зарагдсан үнээрээ
update public.order_items
   set list_price = unit_price
 where list_price is null;

-- ---------- 4) Өөрийгөө шалгах — зөрвөл бүх migration rollback ----------
do $$
declare
  v_null   int;
  v_bad    int;
  v_sep    int;
  v_logged int;
  v_snap   record;
begin
  select count(*) into v_null from public.order_items where list_price is null;
  if v_null > 0 then
    raise exception 'list_price хоосон % мөр үлдлээ', v_null;
  end if;

  select count(*) into v_bad from public.order_items where list_price < unit_price;
  if v_bad > 0 then
    raise exception 'list_price < unit_price % мөр', v_bad;
  end if;

  -- #10305 — Хүрэн манжин 180г 2,250 = 2,500 × 0.9
  select count(*) into v_sep
    from public.order_items oi join public.orders o on o.id = oi.order_id
   where o.order_number = '#10305'
     and oi.list_price = 2500 and oi.unit_price = 2250
     and oi.sale_campaign = 'vidan-sep-2026';
  if v_sep <> 1 then
    raise exception '#10305-ийн хямдрал нөхөгдсөнгүй (%)', v_sep;
  end if;

  select count(*) into v_logged from public.sale_campaign_log where code = 'vidan-sep-2026';
  if v_logged < 2 then
    raise exception 'Кампанит ажлын түүх дутуу (%)', v_logged;
  end if;

  -- Trigger-ийн логик — жинхэнэ захиалга үүсгэхгүйгээр цэвэр функцээр
  v_snap := public.order_item_list_price(2250, 2500, 'vidan-sep-2026');
  if v_snap.list_price <> 2500 or v_snap.sale_campaign is distinct from 'vidan-sep-2026' then
    raise exception 'Кампанит хямдралын мөр буруу: %', v_snap;
  end if;
  v_snap := public.order_item_list_price(2500, null, null);
  if v_snap.list_price <> 2500 or v_snap.sale_campaign is not null then
    raise exception 'Хямдралгүй мөр буруу: %', v_snap;
  end if;
  -- Гараар хямдруулсан (кодгүй)
  v_snap := public.order_item_list_price(4000, 4500, null);
  if v_snap.list_price <> 4500 or v_snap.sale_campaign is not null then
    raise exception 'Гар хямдралын мөр буруу: %', v_snap;
  end if;
  -- old_price нь үнээс бага/тэнцүү бол хямдрал биш
  v_snap := public.order_item_list_price(5000, 4000, 'x');
  if v_snap.list_price <> 5000 or v_snap.sale_campaign is not null then
    raise exception 'Буруу old_price хямдрал гэж тооцогдлоо: %', v_snap;
  end if;
end $$;
