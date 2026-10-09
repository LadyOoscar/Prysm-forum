create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  media_path text not null,
  media_type text not null check (media_type in ('image', 'video')),
  caption text not null default '' check (char_length(caption) <= 300),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);
create index if not exists stories_active_created_idx on public.stories (expires_at, created_at desc);
alter table public.stories enable row level security;
grant select, insert, delete on public.stories to authenticated;
drop policy if exists "Members can view active stories" on public.stories;
create policy "Members can view active stories" on public.stories for select to authenticated using (expires_at > now());
drop policy if exists "Members can create own stories" on public.stories;
create policy "Members can create own stories" on public.stories for insert to authenticated with check (user_id = (select auth.uid()) and expires_at > now() and expires_at <= now() + interval '25 hours');
drop policy if exists "Members can delete own stories" on public.stories;
create policy "Members can delete own stories" on public.stories for delete to authenticated using (user_id = (select auth.uid()));
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('prysm-stories', 'prysm-stories', false, 10485760, array['image/jpeg','image/png','image/webp','video/mp4','video/webm'])
on conflict (id) do update set public = false, file_size_limit = 10485760, allowed_mime_types = array['image/jpeg','image/png','image/webp','video/mp4','video/webm'];
drop policy if exists "Authenticated members can view story media" on storage.objects;
create policy "Authenticated members can view story media" on storage.objects for select to authenticated using (bucket_id = 'prysm-stories');
drop policy if exists "Members upload story media to own folder" on storage.objects;
create policy "Members upload story media to own folder" on storage.objects for insert to authenticated with check (bucket_id = 'prysm-stories' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "Members delete own story media" on storage.objects;
create policy "Members delete own story media" on storage.objects for delete to authenticated using (bucket_id = 'prysm-stories' and (storage.foldername(name))[1] = (select auth.uid())::text);