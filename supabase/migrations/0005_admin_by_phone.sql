-- ============================================================
-- Add phone-based super admin: +976 9407 0800
-- + extend handle_new_user trigger to auto-promote this phone too
-- ============================================================

-- 1) Одоо байгаа phone хэрэглэгчийг promote хийх
insert into public.staff (id, email, full_name, role, is_active)
select
  u.id,
  coalesce(u.email, 'phone-' || u.phone || '@vidan.local'),
  coalesce(u.raw_user_meta_data ->> 'full_name', 'Admin'),
  'admin',
  true
from auth.users u
where u.phone = '97694070800'
on conflict (id) do update set
  role = 'admin',
  is_active = true;

-- 2) Trigger-ийг шинэчилж phone-аар auto-promote
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  v_promote bool := false;
  v_email_for_staff text;
begin
  -- profile үүсгэх
  insert into public.profiles (id, phone, email, full_name)
  values (
    new.id,
    new.phone,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;

  -- super admin шалгуурууд (email эсвэл утас)
  if new.email = 'onlinevidan@gmail.com' then
    v_promote := true;
    v_email_for_staff := new.email;
  elsif new.phone = '97694070800' then
    v_promote := true;
    v_email_for_staff := coalesce(new.email, 'phone-' || new.phone || '@vidan.local');
  end if;

  if v_promote then
    insert into public.staff (id, email, full_name, role, is_active)
    values (
      new.id,
      v_email_for_staff,
      coalesce(new.raw_user_meta_data ->> 'full_name', 'Admin'),
      'admin',
      true
    )
    on conflict (id) do update set role = 'admin', is_active = true;
  end if;

  return new;
end $$;
