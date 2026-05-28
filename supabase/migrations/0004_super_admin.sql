-- ============================================================
-- Super admin bootstrap
-- onlinevidan@gmail.com → admin role-той staff
-- Мөн ирээдүйд auth.users-д энэ email-ээр бүртгүүлэх бүх хэрэглэгч
-- автоматаар admin болно (хэрэв staff row устгасан тохиолдолд)
-- ============================================================

-- 1) Одоо байгаа хэрэглэгчийг promote хийх (хэрэв байвал)
insert into public.staff (id, email, full_name, role, is_active)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data ->> 'full_name', 'Super Admin'),
  'admin',
  true
from auth.users u
where u.email = 'onlinevidan@gmail.com'
on conflict (id) do update set
  role = 'admin',
  is_active = true;

-- 2) Trigger-ийг шинэчилж, ирээдүйн "super admin" email-уудыг автомат promote
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  -- profile үүсгэх (өмнөх логик)
  insert into public.profiles (id, phone, email, full_name)
  values (
    new.id,
    new.phone,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;

  -- super admin email бол шууд admin staff болгох
  if new.email = 'onlinevidan@gmail.com' then
    insert into public.staff (id, email, full_name, role, is_active)
    values (
      new.id,
      new.email,
      coalesce(new.raw_user_meta_data ->> 'full_name', 'Super Admin'),
      'admin',
      true
    )
    on conflict (id) do update set role = 'admin', is_active = true;
  end if;

  return new;
end $$;
