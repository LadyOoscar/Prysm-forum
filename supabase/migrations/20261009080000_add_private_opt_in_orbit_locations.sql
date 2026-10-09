create table if not exists public.orbit_locations (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.orbit_locations enable row level security;
drop policy if exists "Members manage own orbit location" on public.orbit_locations;
create policy "Members manage own orbit location"
on public.orbit_locations for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.orbit_locations to authenticated;

create or replace function public.get_orbit_members()
returns table (id uuid, username text, display_name text, avatar_url text, distance_band integer)
language sql security definer set search_path = '' stable
as $$
  select p.id, p.username, p.display_name, p.avatar_url,
    case when d.km <= 5 then 1 when d.km <= 10 then 2 when d.km <= 25 then 3 else 4 end as distance_band
  from public.orbit_locations me
  join public.orbit_locations other on other.user_id <> me.user_id and other.enabled = true
  join public.profiles p on p.id = other.user_id
  cross join lateral (
    select 6371 * acos(least(1.0, greatest(-1.0,
      sin(radians(me.latitude)) * sin(radians(other.latitude)) +
      cos(radians(me.latitude)) * cos(radians(other.latitude)) *
      cos(radians(other.longitude - me.longitude))
    ))) as km
  ) d
  where me.user_id = (select auth.uid()) and me.enabled = true
    and p.profile_visibility = 'public' and d.km >= 1 and d.km <= 50
  order by distance_band, p.username
$$;
revoke all on function public.get_orbit_members() from public, anon;
grant execute on function public.get_orbit_members() to authenticated;
