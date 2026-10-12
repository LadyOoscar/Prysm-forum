insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('prysm-audio', 'prysm-audio', true, 20971520, array['audio/mpeg']::text[])
on conflict (id) do update set public = true, file_size_limit = 20971520, allowed_mime_types = array['audio/mpeg']::text[];

drop policy if exists "Public can listen to PRYSM ambient audio" on storage.objects;
create policy "Public can listen to PRYSM ambient audio" on storage.objects
for select to anon, authenticated using (bucket_id = 'prysm-audio');

drop policy if exists "Admins upload PRYSM ambient audio" on storage.objects;
create policy "Admins upload PRYSM ambient audio" on storage.objects
for insert to authenticated with check (
  bucket_id = 'prysm-audio'
  and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_admin = true)
);

drop policy if exists "Admins delete PRYSM ambient audio" on storage.objects;
create policy "Admins delete PRYSM ambient audio" on storage.objects
for delete to authenticated using (
  bucket_id = 'prysm-audio'
  and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_admin = true)
);
