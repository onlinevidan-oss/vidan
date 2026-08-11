-- ============================================================
-- 0016_ebarimt.sql
--   E-Barimt PosAPI 3.0 интеграц — ЗӨВХӨН НЭМЭЛТ (additive) багана.
--   place_order RPC-г ӨӨРЧЛӨХГҮЙ (амьд checkout-ийн критик замыг хамгаална).
--   Баримтын мэдээллийг захиалга үүссэний дараа тусад нь бичнэ.
--
--   ⚠️ Compliance: lottery/qr нь ЗӨВХӨН тухайн худалдан авагчид баримтаа
--      харуулах (=хэвлэх) зорилгоор хадгалагдана — өөр зорилгоор ашиглахгүй.
-- ============================================================

-- 1) orders — e-barimt талбарууд (бүгд nullable, эргэж болох)
alter table public.orders
  add column if not exists ebarimt_type         text
    check (ebarimt_type in ('B2C_RECEIPT', 'B2B_RECEIPT')),
  add column if not exists ebarimt_customer_tin text,  -- B2B: харилцагчийн ТТД
  add column if not exists ebarimt_consumer_no  text,  -- B2C: иргэний ebarimt дугаар
  add column if not exists ebarimt_id           text,  -- ДДТД (33 орон) — баримт үүссэний дараа
  add column if not exists ebarimt_date         text,  -- баримт үүссэн огноо
  add column if not exists ebarimt_lottery      text,  -- сугалааны дугаар (зөвхөн баримт харуулах)
  add column if not exists ebarimt_qr           text;  -- QR дата (зөвхөн баримт харуулах)

comment on column public.orders.ebarimt_lottery is
  'E-barimt сугалааны дугаар — зөвхөн худалдан авагчид баримт харуулах зорилгоор';
comment on column public.orders.ebarimt_qr is
  'E-barimt QR дата — зөвхөн худалдан авагчид баримт харуулах зорилгоор';

-- 2) products — бараа/үйлчилгээний ангиллын код (e-barimt item.classificationCode)
alter table public.products
  add column if not exists classification_code text;

comment on column public.products.classification_code is
  'E-Barimt бараа/үйлчилгээний нэгдсэн ангиллын код (developer.itc.gov.mn лавлах)';
