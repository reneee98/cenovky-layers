-- Supabase Storage bucket + policies for company logo/signature assets.
-- Bucket is public so PDF renderer can fetch image bytes without service role key.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'company-assets',
  'company-assets',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "company_assets_public_read" on storage.objects;
drop policy if exists "company_assets_auth_insert" on storage.objects;
drop policy if exists "company_assets_auth_update" on storage.objects;
drop policy if exists "company_assets_auth_delete" on storage.objects;

create policy "company_assets_public_read"
on storage.objects
for select
to public
using (bucket_id = 'company-assets');

create policy "company_assets_auth_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'company-assets'
  and (storage.foldername(name))[1] = 'settings'
  and (storage.foldername(name))[2] = auth.uid()::text
);

create policy "company_assets_auth_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'company-assets'
  and (storage.foldername(name))[1] = 'settings'
  and (storage.foldername(name))[2] = auth.uid()::text
)
with check (
  bucket_id = 'company-assets'
  and (storage.foldername(name))[1] = 'settings'
  and (storage.foldername(name))[2] = auth.uid()::text
);

create policy "company_assets_auth_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'company-assets'
  and (storage.foldername(name))[1] = 'settings'
  and (storage.foldername(name))[2] = auth.uid()::text
);
