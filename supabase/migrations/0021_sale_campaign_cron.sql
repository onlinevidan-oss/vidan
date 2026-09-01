-- ============================================================
-- 0021_sale_campaign_cron.sql
--   Хямдралын кампанит ажлыг цаг тутам шалгаж, хугацаанд нь
--   автоматаар асаана/унтраана.
--
--   Цаг тутам ажилладаг нь санаатай: нэг удаагийн "эхлэх/дуусах" job
--   алгасагдвал хямдрал гацаж үлдэх эрсдэлтэй. Идемпотент синк цаг
--   тутам ажилласнаар алдаа өөрөө засагдана.
-- ============================================================

create extension if not exists pg_cron;

-- Хуучин хуваарь байвал давхардуулахгүй
select cron.unschedule('sale-campaign-sync')
where exists (select 1 from cron.job where jobname = 'sale-campaign-sync');

select cron.schedule(
  'sale-campaign-sync',
  '5 * * * *',
  $$select public.sync_sale_campaign()$$
);
