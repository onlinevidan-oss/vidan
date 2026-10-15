-- Барааны SEO талбарууд
--
-- meta_title      — хайлтын үр дүнд гарах гарчиг. Хуудсан дээрх name_mn-ийг
--                   огт хөндөхгүй; зөвхөн <title> ба og:title-д хэрэглэнэ.
--                   Хоосон бол name_mn руу уначихна.
--
-- search_keywords — ижил утгатай үгс (монгол кирилл, орос, латин галиг).
--                   ЗӨВХӨН СЕРВЕР ТАЛД: сайтын дотоод хайлтад шүүлт болгож,
--                   бүтээгдэхүүний JSON-LD-д товчилж оруулна. Хуудасны биед
--                   хэзээ ч бичигдэхгүй — нуусан текст нь Google-ийн спам
--                   бодлого зөрчдөг.
--
-- Дахин ажиллуулахад аюулгүй.

alter table public.products
  add column if not exists meta_title text,
  add column if not exists search_keywords text;

comment on column public.products.meta_title is
  'Хайлтад гарах гарчиг. Хоосон бол name_mn хэрэглэнэ. name_mn-ийг солихгүй.';

comment on column public.products.search_keywords is
  'Таслалаар тусгаарласан ижил утгатай үгс (монгол/орос/галиг). Зөвхөн сервер талд: дотоод хайлт + JSON-LD. Хуудасны биед гаргахгүй.';

-- Дотоод хайлтыг түргэсгэнэ (ilike '%...%' тул trigram индекс)
create extension if not exists pg_trgm;

create index if not exists products_search_keywords_trgm_idx
  on public.products using gin (search_keywords gin_trgm_ops);
