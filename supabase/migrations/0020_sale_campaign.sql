-- ============================================================
-- 0020_sale_campaign.sql
--   Хугацаатай хямдралын кампанит ажил — автоматаар асаж, унтарна.
--
--   ЯАГААД DB-д ҮНИЙГ ӨӨРЧИЛДӨГ ВЭ: place_order RPC захиалгын дүнг
--   products.price-аас шууд уншдаг. Хямдралыг зөвхөн дэлгэц дээр бодвол
--   хэрэглэгч хямдралтай үнэ хараад бүтэн үнээр төлбөр төлнө. Тиймээс
--   үнийг бодитоор солино:
--     old_price ← хуучин үнэ (хямдралын зураас энд харагдана)
--     price     ← хямдруулсан үнэ
--
--   sale_campaign багана нь ЗӨВХӨН кампанит ажлын хямдруулсан барааг
--   тэмдэглэнэ. Ингэснээр буцаахдаа админаас гараар тавьсан хямдралд
--   хүрэхгүй.
--
--   sync_sale_campaign() нь ИДЕМПОТЕНТ — хэдэн ч удаа дуудаж болно.
--   Хугацаа дуусмагц дараагийн дуудалтад автоматаар буцаана.
-- ============================================================

alter table public.products
  add column if not exists sale_campaign text;

comment on column public.products.sale_campaign is
  'Хямдралын кампанит ажлын код — тухайн кампанит ажил хямдруулсан бол. Буцаахдаа зөвхөн үүгээр тэмдэглэгдсэнийг хөндөнө';

create index if not exists products_sale_campaign_idx
  on public.products (sale_campaign)
  where sale_campaign is not null;

-- ============================================================
-- Кампанит ажлын тохиргоо — админаас ч засаж болно
-- ============================================================
insert into public.site_settings (key, value)
values (
  'sale_campaign',
  jsonb_build_object(
    'code',       'vidan-sep-2026',
    'name',       'VIDAN 10% хямдрал',
    'brand_slug', 'vidan',
    'percent',    10,
    -- Монголын цагаар 9-р сарын 1, 00:00 → UTC 8-р сарын 31, 16:00
    'starts_at',  '2026-08-31T16:00:00+00:00',
    -- Монголын цагаар 9-р сарын 8, 00:00 → UTC 9-р сарын 7, 16:00
    -- (өөрөөр хэлбэл 9-р сарын 7 бүтэн өдөр хямдралтай)
    'ends_at',    '2026-09-07T16:00:00+00:00',
    'enabled',    true
  )
)
on conflict (key) do update set value = excluded.value, updated_at = now();

-- ============================================================
-- Идемпотент синк — хугацаанд нь тааруулж асаана/унтраана
-- ============================================================
create or replace function public.sync_sale_campaign()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_cfg        jsonb;
  v_code       text;
  v_brand_id   uuid;
  v_percent    numeric;
  v_starts     timestamptz;
  v_ends       timestamptz;
  v_enabled    boolean;
  v_active_now boolean;
  v_applied    int := 0;
  v_reverted   int := 0;
begin
  select value into v_cfg from public.site_settings where key = 'sale_campaign';
  if v_cfg is null then
    return jsonb_build_object('status', 'no_campaign');
  end if;

  v_code    := v_cfg->>'code';
  v_percent := coalesce((v_cfg->>'percent')::numeric, 0);
  v_starts  := (v_cfg->>'starts_at')::timestamptz;
  v_ends     := (v_cfg->>'ends_at')::timestamptz;
  v_enabled := coalesce((v_cfg->>'enabled')::boolean, false);

  select id into v_brand_id from public.brands where slug = v_cfg->>'brand_slug';

  v_active_now := v_enabled
              and v_brand_id is not null
              and v_percent > 0 and v_percent < 100
              and now() >= v_starts
              and now() <  v_ends;

  -- 1) Хугацаандаа бол хямдруулна (хямдраагүй бараанууд дээр л)
  if v_active_now then
    update public.products
    set old_price     = price,
        price         = round(price * (1 - v_percent / 100.0))::bigint,
        sale_campaign = v_code,
        updated_at    = now()
    where brand_id = v_brand_id
      and is_active = true
      and sale_campaign is null
      and old_price is null;   -- гараар тавьсан хямдралд хүрэхгүй
    get diagnostics v_applied = row_count;
  end if;

  -- 2) Хугацаа дууссан / унтраасан / кампанит ажил солигдсон бол буцаана.
  --    ЗӨВХӨН энэ механизмаар хямдруулсан бараанууд.
  update public.products
  set price         = coalesce(old_price, price),
      old_price     = null,
      sale_campaign = null,
      updated_at    = now()
  where sale_campaign is not null
    and (not v_active_now or sale_campaign is distinct from v_code);
  get diagnostics v_reverted = row_count;

  return jsonb_build_object(
    'campaign', v_code,
    'active',   v_active_now,
    'applied',  v_applied,
    'reverted', v_reverted,
    'checked_at', now()
  );
end $$;

comment on function public.sync_sale_campaign is
  'Хямдралын кампанит ажлыг хугацаанд нь тааруулж асаана/унтраана. Идемпотент — хэдэн ч удаа дуудаж болно';

revoke all on function public.sync_sale_campaign() from public, anon, authenticated;
