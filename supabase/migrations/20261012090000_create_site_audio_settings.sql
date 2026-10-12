create table if not exists public.site_audio_settings (
  id integer primary key default 1 check (id = 1),
  audio_url text not null,
  audio_path text not null,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.site_audio_settings enable row level security;
drop policy if exists "Anyone can read site audio settings" on public.site_audio_settings;
create policy "Anyone can read site audio settings" on public.site_audio_settings
  for select to anon, authenticated using (true);
drop policy if exists "Admins manage site audio settings" on public.site_audio_settings;
create policy "Admins manage site audio settings" on public.site_audio_settings
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_admin = true))
  with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_admin = true));
grant select on public.site_audio_settings to anon, authenticated;
grant insert, update, delete on public.site_audio_settings to authenticated;
