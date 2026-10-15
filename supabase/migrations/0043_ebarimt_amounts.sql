-- ============================================================
-- 0043_ebarimt_amounts.sql
--   И-БАРИМТЫН БОДИТ ДҮНГ ХАДГАЛАХ — /admin/ebarimt жагсаалтад
--
--   Өмнө нь баримт үүсэхэд зөвхөн ДДТД, сугалаа, QR хадгалагддаг байсан
--   тул "ямар дүнгээр баримт үүссэн бэ" гэдгийг админ харах боломжгүй
--   байв. QPay-ийн /ebarimt_v3/create (ба GET /ebarimt_v3/{id}) хариунд
--   ирдэг дүнг энд хадгалж, захиалгын төлсөн дүнтэй тулгана.
--
--   Бүгд nullable: хуучин захиалгад админы "QPay-ээс шалгах" товчоор
--   нөхөгдөнө. Шинэ баримтад үүсэх мөчид бичигдэнэ.
-- ============================================================

alter table public.orders
  add column if not exists ebarimt_amount     numeric(14,2),
  add column if not exists ebarimt_vat        numeric(14,4),
  add column if not exists ebarimt_city_tax   numeric(14,4),
  add column if not exists ebarimt_status     text,
  add column if not exists ebarimt_checked_at timestamptz;

comment on column public.orders.ebarimt_amount is
  'И-баримтын нийт дүн — QPay-ийн хариу (amount). Захиалгын total-той таарах ёстой';
comment on column public.orders.ebarimt_vat is
  'И-баримтын НӨАТ — QPay-ийн хариу (vat_amount). Үнэ НӨАТ-тэй тул ойролцоогоор total/11';
comment on column public.orders.ebarimt_city_tax is
  'И-баримтын НХАТ — QPay-ийн хариу (city_tax_amount)';
comment on column public.orders.ebarimt_status is
  'И-баримтын бүртгэлийн төлөв — QPay-ийн хариу (REGISTERED гэх мэт)';
comment on column public.orders.ebarimt_checked_at is
  'Дээрх дүнг QPay-ээс хамгийн сүүлд авсан агшин';
