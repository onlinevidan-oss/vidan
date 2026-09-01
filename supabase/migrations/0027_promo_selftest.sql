-- ============================================================
-- 0027_promo_selftest.sql
--   Промо кодын логикийг АМЬД тохиргоон дээр шалгана.
--   Аль нэг шалгалт зөрвөл бүх migration rollback болно.
--
--   place_order-ыг энд шууд дуудах боломжгүй (auth.uid() шаардана),
--   тиймээс түүний ашигладаг ХОЁР функцийг шалгана:
--     · validate_promo    — код зөв эсэх, хөнгөлөлт хэд болох
--     · calc_order_totals — НӨАТ/нийт дүн хөнгөлөлтийг дагаж байгаа эсэх
-- ============================================================

do $$
declare
  r        record;
  t        record;
  v_sub    bigint := 100000;   -- 100,000₮ барааны дүн
begin
  -- ---------- 1) Байхгүй код ----------
  select * into r from public.validate_promo('BAIHGUI_KOD', null, v_sub);
  if r.valid or r.error <> 'NOT_FOUND' then
    raise exception 'Байхгүй код буруу хариу өглөө: %', r;
  end if;

  -- ---------- 2) Хоосон код ----------
  select * into r from public.validate_promo('', null, v_sub);
  if r.valid then raise exception 'Хоосон код зөвшөөрөгдлөө'; end if;

  -- ---------- 3) percent (NEW10 = 10%) ----------
  select * into r from public.validate_promo('NEW10', null, v_sub);
  if not r.valid then
    raise exception 'NEW10 ажиллахгүй байна: %', r.error;
  end if;
  if r.discount <> 10000 then
    raise exception 'NEW10 хөнгөлөлт буруу: 10000 байх ёстой, % гарлаа', r.discount;
  end if;
  raise notice '[3] NEW10 → % ₮ хөнгөлөлт (100,000₮-ийн 10%%)', r.discount;

  -- Жижиг үсгээр бичсэн ч ажиллах ёстой
  select * into r from public.validate_promo('new10', null, v_sub);
  if not r.valid or r.discount <> 10000 then
    raise exception 'Жижиг үсгээр код ажиллахгүй байна';
  end if;

  -- ---------- 4) fixed (VIP5K = 5000₮) ----------
  select * into r from public.validate_promo('VIP5K', null, v_sub);
  if not r.valid or r.discount <> 5000 then
    raise exception 'VIP5K буруу: % (%)', r.discount, r.error;
  end if;
  raise notice '[4] VIP5K → % ₮ хөнгөлөлт', r.discount;

  -- Тогтмол дүн барааны дүнгээс хэтрэхгүй байх ёстой
  select * into r from public.validate_promo('VIP5K', null, 20000);
  if r.valid and r.discount > 20000 then
    raise exception 'Тогтмол хөнгөлөлт барааны дүнгээс хэтэрлээ';
  end if;

  -- ---------- 5) bogo → одоогоор дэмжигдэхгүй ----------
  select * into r from public.validate_promo('JAM2025', null, v_sub);
  if r.valid then
    raise exception 'BOGO дэмжигдэхгүй байх ёстой атлаа зөвшөөрөгдлөө';
  end if;
  raise notice '[5] JAM2025 (bogo) → зөв татгалзлаа: %', r.error;

  -- ---------- 6) Үнэ тооцоолол: хөнгөлөлтгүй ----------
  select * into t from public.calc_order_totals(v_sub, 1, 0);
  if t.tax <> round(v_sub * 0.1) then
    raise exception 'Хөнгөлөлтгүй НӨАТ буруу: %', t.tax;
  end if;
  if t.total <> v_sub + t.shipping + t.tax then
    raise exception 'Хөнгөлөлтгүй нийт дүн буруу: %', t.total;
  end if;
  raise notice '[6] Хөнгөлөлтгүй: бараа % · НӨАТ % · хүргэлт % · нийт %',
    t.subtotal, t.tax, t.shipping, t.total;

  -- ---------- 7) Үнэ тооцоолол: 10% хөнгөлөлттэй ----------
  select * into t from public.calc_order_totals(v_sub, 1, 10000);
  if t.discount <> 10000 then
    raise exception 'Хөнгөлөлт тусаагүй: %', t.discount;
  end if;
  -- НӨАТ нь хөнгөлсний ДАРААХ дүнгээс тооцогдох ёстой
  if t.tax <> round((v_sub - 10000) * 0.1) then
    raise exception 'НӨАТ хөнгөлөлтийг дагаагүй: % (% байх ёстой)',
      t.tax, round((v_sub - 10000) * 0.1);
  end if;
  if t.total <> (v_sub - 10000) + t.shipping + t.tax then
    raise exception 'Нийт дүн буруу: %', t.total;
  end if;
  raise notice '[7] 10%% хөнгөлөлттэй: бараа % · хөнгөлөлт % · НӨАТ % · нийт %',
    t.subtotal, t.discount, t.tax, t.total;

  -- ---------- 8) Хөнгөлөлт барааны дүнгээс хэтрэхгүй ----------
  select * into t from public.calc_order_totals(v_sub, 1, 999999);
  if t.discount > v_sub or t.total < t.shipping then
    raise exception 'Хэт их хөнгөлөлт хязгаарлагдсангүй: %', t;
  end if;
  raise notice '[8] Хэт их хөнгөлөлт → % ₮-оор хязгаарлагдлаа', t.discount;

  raise notice 'ПРОМО ТУРШИЛТ АМЖИЛТТАЙ — код шалгах ба үнэ тооцоолол зөв';
end $$;
