insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'case-models',
  'case-models',
  false,
  104857600,
  array[
    'model/stl',
    'model/obj',
    'model/ply',
    'application/sla',
    'application/octet-stream'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Authenticated users can upload case models" on storage.objects;
create policy "Authenticated users can upload case models"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'case-models'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "Users can read their own case models" on storage.objects;
create policy "Users can read their own case models"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'case-models'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "Users can update their own case models" on storage.objects;
create policy "Users can update their own case models"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'case-models'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'case-models'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "Users can delete their own case models" on storage.objects;
create policy "Users can delete their own case models"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'case-models'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
