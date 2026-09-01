-- ============================================================
-- 0023_sale_campaign_admin.sql
--   Кампанит ажлыг админ хэсгээс удирдах бэлтгэл.
--
--   sync_sale_campaign()-ийг бэхжүүлэв. Өмнөх хувилбар нь тохиргоо
--   ДУНДУУР өөрчлөгдөх тохиолдлыг бүрэн зохицуулдаггүй байсан:
--     · брэнд солигдвол хуучин брэндийн бараа хямдралтай гацна
--       (sale_campaign нь ижил код тул буцаалтад өртөхгүй)
--     · хувь өөрчлөгдвөл хямдарсан бараанууд хуучин хувиараа үлдэнэ
--
--   Одоо: ЭХЛЭЭД буцаах ёстойг нь бүгдийг буцаана, ДАРАА нь хямдруулна.
--   Ингэснээр нэг дуудалтаар хувь/брэнд солих нь зөв тусна.
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
  v_ends    := (v_cfg->>'ends_at')::timestamptz;
  v_enabled := coalesce((v_cfg->>'enabled')::boolean, false);

  select id into v_brand_id from public.brands where slug = v_cfg->>'brand_slug';

  v_active_now := v_enabled
              and v_brand_id is not null
              and v_percent > 0 and v_percent < 100
              and v_starts is not null and v_ends is not null
              and now() >= v_starts
              and now() <  v_ends;

  -- ---------- 1) БУЦААХ ----------
  -- Хугацаа дууссан / унтраасан / код солигдсон / брэнд солигдсон /
  -- хувь өөрчлөгдсөн (одоогийн үнэ шинэ хувьтай таарахгүй) бүх тохиолдол.
  -- ЗӨВХӨН энэ механизмаар хямдруулсан бараанууд (sale_campaign тэмдэгтэй).
  update public.products
  set price         = coalesce(old_price, price),
      old_price     = null,
      sale_campaign = null,
      updated_at    = now()
  where sale_campaign is not null
    and (
         not v_active_now
      or sale_campaign is distinct from v_code
      or brand_id is distinct from v_brand_id
      or price is distinct from round(old_price * (1 - v_percent / 100.0))::bigint
    );
  get diagnostics v_reverted = row_count;

  -- ---------- 2) ХЯМДРУУЛАХ ----------
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

  return jsonb_build_object(
    'campaign',   v_code,
    'active',     v_active_now,
    'applied',    v_applied,
    'reverted',   v_reverted,
    'checked_at', now()
  );
end $$;

-- Админ хэсгээс (server action → service_role) шууд дуудаж,
-- хадгалмагц үр дүн нь тэр дороо тусна — cron хүлээхгүй.
grant execute on function public.sync_sale_campaign() to service_role;
