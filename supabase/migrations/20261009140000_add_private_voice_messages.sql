insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'prysm-voice-messages',
  'prysm-voice-messages',
  false,
  12582912,
  array['audio/webm','audio/webm;codecs=opus','audio/mp4','audio/ogg','audio/ogg;codecs=opus','audio/mpeg','audio/wav']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 12582912,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Conversation members can upload voice messages" on storage.objects;
create policy "Conversation members can upload voice messages"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'prysm-voice-messages'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id::text = (storage.foldername(name))[1]
      and cm.user_id = (select auth.uid())
  )
);

drop policy if exists "Conversation members can listen to voice messages" on storage.objects;
create policy "Conversation members can listen to voice messages"
on storage.objects for select to authenticated
using (
  bucket_id = 'prysm-voice-messages'
  and exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id::text = (storage.foldername(name))[1]
      and cm.user_id = (select auth.uid())
  )
);

drop policy if exists "Owners can remove their voice message uploads" on storage.objects;
create policy "Owners can remove their voice message uploads"
on storage.objects for delete to authenticated
using (
  bucket_id = 'prysm-voice-messages'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id::text = (storage.foldername(name))[1]
      and cm.user_id = (select auth.uid())
  )
);