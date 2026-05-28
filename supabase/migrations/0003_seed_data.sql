-- ============================================================
-- VIDAN Shop · Seed data
-- 6 категори, 8 бүтээгдэхүүн, 4 promotion
-- ============================================================

-- Категориуд
insert into public.categories (name_mn, name_en, slug, emoji, color_gradient, sort_order, is_featured) values
  ('Даршилсан ногоо',  'Pickled vegetables', 'darshilsan',   '🥒', 'linear-gradient(135deg,#f0f7d8,#d6e88a)', 1, true),
  ('Чанамал',          'Jams',              'jam',          '🫙', 'linear-gradient(135deg,#fde6e6,#fbc4c4)', 2, true),
  ('Компот',           'Compote',           'compote',      '🥤', 'linear-gradient(135deg,#f5efe3,#e6d8be)', 3, true),
  ('Алимны нухаш',     'Apple puree',       'apple-puree',  '🍎', 'linear-gradient(135deg,#fff2e9,#ffd9c0)', 4, true),
  ('Хүүхдийн тэжээл',  'Baby food',         'baby-food',    '👶', 'linear-gradient(135deg,#fff2f8,#ffd6e9)', 5, true),
  ('Бэлгийн багц',     'Gift packs',        'gift-pack',    '🎁', 'linear-gradient(135deg,#fff8d8,#ffe899)', 6, true);

-- Бүтээгдэхүүнүүд
insert into public.products
  (category_id, sku, name_mn, slug, short_description, price, old_price, cost_price, stock, is_featured, is_new, is_bio, tags)
select c.id, vals.sku, vals.name, vals.slug, vals.short_desc, vals.price, vals.old_price, vals.cost, vals.stock,
       vals.featured, vals.is_new, vals.is_bio, vals.tags
from public.categories c
join (values
  ('darshilsan',  'VDN-001', 'Даршилсан өргөст хэмх', 'darshilsan-orgost-khemkh-720', 'Польш сортын үрийг Монгол хөрсөнд тариалсан 720мл шилэн сав', 8500::bigint, 10000::bigint, 4200::bigint, 148, true,  false, true,  array['шилэн сав','даршилсан','BIO']),
  ('jam',         'VDN-014', 'Гүзээлзгэний чанамал',  'guzeelzgenii-chanamal-450',   '100% цэвэр гүзээлзгэн, 450г',                                12900::bigint, null,           5800::bigint,  72, true,  false, true,  array['чанамал','BIO']),
  ('baby-food',   'VDN-022', 'Алим-луувангийн нухаш', 'alim-luuvangiin-nukhash-200', 'Хүүхдийн амин дэмтэй нухаш, 200г',                            4500::bigint, null,           2100::bigint, 215, true,  true,  true,  array['хүүхдийн','BIO']),
  ('compote',     'VDN-008', 'Чавганы компот',        'chavganii-compot-1l',         '100% жимстэй компот, 1л',                                     9900::bigint, 11000::bigint, 4400::bigint,   5, true,  false, false, array['компот']),
  ('gift-pack',   'VDN-100', 'VIDAN Премиум багц',    'vidan-premium-pack',          '5 ширхэг бүтээгдэхүүн агуулсан бэлгийн багц',                45000::bigint, null,          22000::bigint,  28, true,  false, false, array['бэлэг','premium']),
  ('jam',         'VDN-016', 'Үхрийн нүдний чанамал', 'ukhriin-nudnii-chanamal-450', '450г, шинээр гарсан',                                        14500::bigint, null,           6500::bigint,  42, true,  true,  true,  array['чанамал','шинэ','BIO']),
  ('darshilsan',  'VDN-005', 'Лоолийн салат',         'loolii-salat-500',            '500г шилэн сав',                                              7200::bigint, null,           3100::bigint,  96, false, true,  false, array['салат','шинэ']),
  ('baby-food',   'VDN-024', 'Алим-чавганы нухаш',    'alim-chavganii-nukhash-200',  '200г хүүхдийн нухаш',                                         4800::bigint, null,           2200::bigint,   0, false, true,  true,  array['хүүхдийн','шинэ'])
) as vals(cat_slug, sku, name, slug, short_desc, price, old_price, cost, stock, featured, is_new, is_bio, tags)
  on c.slug = vals.cat_slug;

-- Урамшуулал
insert into public.promotions
  (code, name, description, type, value, min_order, max_discount, segment, starts_at, ends_at, usage_limit, visual_style)
values
  ('NEW10',   'Шинэ хэрэглэгчийн урамшуулал', 'Эхний захиалгад 10% хямдрал', 'percent', 10, 0,     50000, 'new',  now(), now() + interval '1 year', 1000, 'red'),
  ('BABY20',  'Хүүхдийн тэжээлийн 7 хоног',   'Бүх хүүхдийн нухаш, тэжээлд 20% хямдрал', 'percent', 20, 10000, 30000, 'all', now(), now() + interval '7 days',  500,  'lime'),
  ('JAM2025', 'Чанамал 1+1',                  '2 чанамал захиалбал 1 нь үнэгүй',         'bogo',     0, 0,     null,  'all', now(), now() + interval '14 days', 300,  'dark'),
  ('VIP5K',   'VIP хэрэглэгчийн купон',       '10+ захиалгатай хэрэглэгчдэд 5,000₮',     'fixed',  5000, 20000, 5000,  'vip', now(), null,                       null,'red');
