-- ============================================================
-- 0025_sms_settings.sql
--   SMS мэдэгдлийг админ хэсгээс удирдана: аль SMS явах, ямар
--   текстээр явахыг кодод бус тохиргоонд байлгана.
--
--   Загварт орлуулах утгууд:
--     {order} — захиалгын дугаар (жнь. #10281)
--     {total} — нийт дүн (жнь. 26,690₮)
--
--   Кирилл SMS нэг segment = 70 тэмдэгт. Уртсах тусам төлбөр өснө тул
--   админы форм дээр тэмдэгтийн тоо болон segment харагдана.
-- ============================================================

insert into public.site_settings (key, value)
values (
  'sms_settings',
  jsonb_build_object(
    'paid_enabled',      true,
    'paid_template',     'VIDAN: Захиалга {order} баталгаажлаа. 24 цагийн дотор хүргэгдэнэ.',
    'cancelled_enabled', true,
    'cancelled_template','VIDAN: Захиалга {order} цуцлагдлаа.'
  )
)
on conflict (key) do nothing;
