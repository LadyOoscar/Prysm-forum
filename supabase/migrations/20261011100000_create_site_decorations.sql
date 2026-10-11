create table if not exists public.site_decorations (
  id uuid primary key default gen_random_uuid(),
  slot text not null unique check (slot in (
    'tab-forum','tab-rencontres','tab-orbite','tab-messages','tab-profil',
    'header-forum','header-rencontres','header-orbite','header-messages','header-profil',
    'panel-home','panel-forum','panel-rencontres','panel-orbite','panel-profil'
  )),
  image_url text not null,
  image_path text not null,
  alt_text text not null default '',
  width_px integer not null default 42 check (width_px between 12 and 240),
  height_px integer not null default 42 check (height_px between 12 and 240),
  alignment text not null default 'after' check (alignment in ('before','after')),
  mobile_visible boolean not null default true,
  desktop_visible boolean not null default true,
  enabled boolean not null default true,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.site_decorations enable row level security;
drop policy if exists "Anyone can read enabled site decorations" on public.site_decorations;
create policy "Anyone can read enabled site decorations" on public.site_decorations for select to anon, authenticated using (enabled = true);
drop policy if exists "Admins manage site decorations" on public.site_decorations;
create policy "Admins manage site decorations" on public.site_decorations for all to authenticated
using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_admin = true))
with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_admin = true));
grant select on public.site_decorations to anon, authenticated;
grant insert, update, delete on public.site_decorations to authenticated;
