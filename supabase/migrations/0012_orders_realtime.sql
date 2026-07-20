-- ============================================================
-- 0012_orders_realtime.sql
--   orders хүснэгтэд Supabase Realtime идэвхжүүлнэ.
--   Хэрэглэгч өөрийн захиалгын төлөв (шинэ → бэлтгэж буй → жолоочид →
--   хүргэгдсэн) real-time өөрчлөгдөхийг хуудсаа сэргээхгүйгээр харна.
--   RLS "Orders: self read" мөрдөгдсөн хэвээр — хэрэглэгч зөвхөн өөрийн
--   захиалгын update-ийг л хүлээж авна.
-- ============================================================

alter publication supabase_realtime add table public.orders;

-- Realtime UPDATE event-д хуучин болон шинэ мөрийг бүрэн дамжуулна
-- (RLS шалгалт зөв ажиллахад шаардлагатай)
alter table public.orders replica identity full;
