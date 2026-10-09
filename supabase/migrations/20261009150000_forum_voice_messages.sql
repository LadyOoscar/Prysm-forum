drop policy if exists "Forum members can upload voice messages" on storage.objects;
create policy "Forum members can upload voice messages"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'prysm-voice-messages'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and exists (
    select 1 from public.forum_topics ft
    where ft.id::text = (storage.foldername(name))[1]
  )
);

drop policy if exists "Authenticated users can listen to forum voice messages" on storage.objects;
create policy "Authenticated users can listen to forum voice messages"
on storage.objects for select to authenticated
using (
  bucket_id = 'prysm-voice-messages'
  and exists (
    select 1 from public.forum_topics ft
    where ft.id::text = (storage.foldername(name))[1]
  )
);

drop policy if exists "Owners can remove their forum voice messages" on storage.objects;
create policy "Owners can remove their forum voice messages"
on storage.objects for delete to authenticated
using (
  bucket_id = 'prysm-voice-messages'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and exists (
    select 1 from public.forum_topics ft
    where ft.id::text = (storage.foldername(name))[1]
  )
);