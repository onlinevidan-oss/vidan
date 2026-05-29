-- ============================================================
-- Storage policies for "products" bucket
-- - Public read (catalog page-д харагдана)
-- - Staff бичих эрхтэй
-- ============================================================

-- Public read
create policy "Product images: public read"
  on storage.objects for select
  using (bucket_id = 'products');

-- Staff insert
create policy "Product images: staff insert"
  on storage.objects for insert
  with check (bucket_id = 'products' and public.is_staff());

-- Staff update
create policy "Product images: staff update"
  on storage.objects for update
  using (bucket_id = 'products' and public.is_staff());

-- Staff delete
create policy "Product images: staff delete"
  on storage.objects for delete
  using (bucket_id = 'products' and public.is_staff());
