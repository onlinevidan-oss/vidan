-- ============================================================
-- 0022_sale_campaign_selftest.sql
--   sync_sale_campaign()-ийг АМЬД өгөгдөл дээр хоёр чиглэлд туршиж,
--   БУЦААЛТ нь үнийг ЯГ хэвэндээ сэргээж байгааг батална.
--
--   Яагаад заавал урьдчилж туршив: хямдрал 9-р сарын 7-нд дуусахад
--   буцаалт ажиллахгүй бол алдаа нь тэр өдөр л илэрнэ — хэтэрхий
--   оройтсон байна. Тиймээс одоо:
--     1) цонхыг өнгөрсөн болгож → цэвэр эхлэл
--     2) жинхэнэ цонх → хямдруулна, яг 10% эсэхийг шалгана
--     3) цонхыг өнгөрсөн болгож → буцаалт, үнэ бүрийг тулгана
--     4) жинхэнэ цонх → эцсийн төлөв (хямдрал идэвхтэй)
--
--   Аль ч алхамд зөрвөл exception → бүх migration rollback болно.
-- ============================================================

do $$
declare
  v_cfg        jsonb;
  v_past       jsonb;
  v_discounted int;
  v_mismatch   int;
  v_result     jsonb;
begin
  select value into v_cfg from public.site_settings where key = 'sale_campaign';
  if v_cfg is null then
    raise exception 'sale_campaign тохиргоо олдсонгүй';
  end if;

  -- Өнгөрсөн цонх — хямдрал идэвхгүй байх ёстой төлөв
  v_past := v_cfg || jsonb_build_object(
    'starts_at', '2020-01-01T00:00:00+00:00',
    'ends_at',   '2020-01-02T00:00:00+00:00'
  );

  create temp table _snap on commit drop as
  select id, price, old_price, sale_campaign from public.products;

  -- ---------- 1) Цэвэр эхлэл ----------
  update public.site_settings set value = v_past where key = 'sale_campaign';
  perform public.sync_sale_campaign();

  -- ---------- 2) Жинхэнэ цонх → хямдруулна ----------
  update public.site_settings set value = v_cfg where key = 'sale_campaign';
  v_result := public.sync_sale_campaign();
  raise notice '[2] ХЯМДРУУЛАВ: %', v_result;

  if not (v_result->>'active')::boolean then
    raise exception 'Хямдралын цонх идэвхгүй байна — огноог шалгана уу (%)', v_result;
  end if;

  select count(*) into v_discounted
  from public.products where sale_campaign is not null;
  if v_discounted = 0 then
    raise exception 'Нэг ч бараа хямдраагүй';
  end if;

  -- Яг 10% мөн эсэх, old_price нь хуучин үнэ мөн эсэх
  select count(*) into v_mismatch
  from public.products p join _snap s on s.id = p.id
  where p.sale_campaign is not null
    and (p.price <> round(s.price * 0.9)::bigint or p.old_price <> s.price);
  if v_mismatch > 0 then
    raise exception '% барааны хямдруулсан үнэ буруу', v_mismatch;
  end if;
  raise notice '[2] % бараа яг 10%% хямдарлаа', v_discounted;

  -- ---------- 3) Цонх дуусав → БУЦААЛТ ----------
  update public.site_settings set value = v_past where key = 'sale_campaign';
  v_result := public.sync_sale_campaign();
  raise notice '[3] БУЦААВ: %', v_result;

  if (v_result->>'reverted')::int <> v_discounted then
    raise exception '% хямдарсан ч зөвхөн % нь буцсан', v_discounted, v_result->>'reverted';
  end if;

  select count(*) into v_mismatch
  from public.products p join _snap s on s.id = p.id
  where p.price is distinct from s.price
     or p.old_price is distinct from s.old_price
     or p.sale_campaign is distinct from s.sale_campaign;
  if v_mismatch > 0 then
    raise exception 'БУЦААЛТ БУРУУ: % барааны үнэ хэвэндээ ороогүй', v_mismatch;
  end if;
  raise notice '[3] Бүх % барааны үнэ ЯГ хэвэндээ буцлаа', v_discounted;

  -- ---------- 4) Эцсийн төлөв — жинхэнэ цонх ----------
  update public.site_settings set value = v_cfg where key = 'sale_campaign';
  v_result := public.sync_sale_campaign();
  raise notice '[4] ЭЦСИЙН ТӨЛӨВ: %', v_result;

  raise notice 'ТУРШИЛТ АМЖИЛТТАЙ — хямдруулах ба буцаах хоёулаа зөв ажиллаж байна';
end $$;
