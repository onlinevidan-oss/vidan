-- ============================================================
-- 0019_profile_details.sql
--   "Миний мэдээлэл" хуудас — хэрэглэгч өөрийн мэдээллээ бүртгэнэ.
--
--   Шинэ талбарууд: нэр/овог тусдаа, хүйс, төрсөн огноо.
--   Төрсөн огноог төрсөн өдрийн урамшуулалд ашиглана.
--
--   full_name-ийг ХЭВЭЭР үлдээнэ — админ, checkout, захиалгын жагсаалт
--   бүгд түүнийг уншдаг. Хадгалахдаа "Овог Нэр" хэлбэрээр давхар бичнэ.
-- ============================================================

alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name  text,
  add column if not exists gender     text
    check (gender in ('male', 'female')),
  add column if not exists birth_date date;

comment on column public.profiles.birth_date is
  'Төрсөн огноо — төрсөн өдрийн урамшуулалд ашиглана. Нэг удаа бөглөсний дараа зөвхөн ажилтан өөрчилнө';

-- Төрсөн өдрөөр хайх (сар/өдрөөр) индекс
create index if not exists profiles_birth_md_idx
  on public.profiles (
    (extract(month from birth_date)),
    (extract(day   from birth_date))
  )
  where birth_date is not null;

-- ============================================================
-- Профайлын зураг — хэрэглэгч өөрийн зургаа байршуулна
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152,
        array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

drop policy if exists "Avatars: public read"   on storage.objects;
drop policy if exists "Avatars: own write"     on storage.objects;
drop policy if exists "Avatars: own update"    on storage.objects;
drop policy if exists "Avatars: own delete"    on storage.objects;

create policy "Avatars: public read"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Зөвхөн өөрийн id-тай фолдерт бичнэ (<user_id>/<file>)
create policy "Avatars: own write"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Avatars: own update"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Avatars: own delete"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
