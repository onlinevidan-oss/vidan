-- ============================================================
-- 0018_order_contact_phone.sql
--   Хүргэлтийн холбоо барих утас захиалга дээр хадгалагдана.
--
--   ШАЛТГААН: өмнө нь утас зөвхөн profiles.phone-оос уншигддаг байсан.
--   Дугаараар нэвтэрсэн хэрэглэгчид энэ талбар бөглөгддөг ч Google/имэйлээр
--   нэвтэрсэн хэрэглэгчид хоосон үлддэг → жолооч холбогдох дугааргүй,
--   SMS мэдэгдэл ч илгээгдэхгүй, захиалга хүргэгдэх боломжгүй болдог.
--
--   Зөвхөн НЭМЭЛТ багана. place_order RPC-г ӨӨРЧЛӨХГҮЙ — утсыг захиалга
--   үүссэний дараа тусад нь бичнэ (0016-тай ижил хандлага).
-- ============================================================

alter table public.orders
  add column if not exists contact_phone  text,  -- үндсэн дугаар (заавал)
  add column if not exists contact_phone2 text;  -- нэмэлт дугаар (сонголт)

comment on column public.orders.contact_phone is
  'Хүргэлтийн үндсэн холбоо барих утас — checkout дээр авна';
comment on column public.orders.contact_phone2 is
  'Хүргэлтийн нэмэлт утас (сонголтоор)';

-- Хуучин захиалгуудад профайлын дугаарыг нөхөж бичнэ (байгаа бол)
update public.orders o
set contact_phone = p.phone
from public.profiles p
where o.user_id = p.id
  and o.contact_phone is null
  and p.phone is not null;
