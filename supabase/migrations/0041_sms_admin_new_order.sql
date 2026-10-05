-- ============================================================
-- 0041_sms_admin_new_order.sql
--   ШИНЭ ЗАХИАЛГЫН МЭДЭГДЭЛ — админы утас руу SMS
--
--   Төлбөр баталгаажсан даруйд админы дугаарууд руу SMS явна.
--   Өмнө нь захиалга орж ирснийг админ хэсгийг нээж байж л мэддэг байв.
--
--   QPay-ийн callback болон polling зэрэг ажилладаг (0024-ийн алдаа) тул
--   энэ мэдэгдэл ч мөн нэг захиалгад НЭГ Л УДАА явах ёстой. 0036-тай
--   адил байгаа индексийг хөндөхгүй, тусдаа хэсэгчилсэн индекс нэмнэ.
-- ============================================================

create unique index if not exists order_events_sms_admin_once_idx
  on public.order_events (order_id, event_type)
  where event_type = 'sms_admin';

-- Хүлээн авах дугаарууд — дараа нь /admin/settings-ээс өөрчилнө.
-- Аль хэдийн тохируулсан бол дарж бичихгүй (дахин ажиллуулахад аюулгүй).
update public.site_settings
set value = value || jsonb_build_object(
      'admin_enabled',  true,
      'admin_phones',   '94070800, 80012476',
      'admin_template', 'Шинэ захиалга {order}, {total}. Утас {phone}'
    )
where key = 'sms_settings'
  and not (value ? 'admin_phones');
