create table if not exists public.community_events (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 4 and 100),
  description text not null default '' check (char_length(description) <= 1000),
  starts_at timestamptz not null,
  event_type text not null check (event_type in ('online', 'in_person')),
  location_label text not null default '' check (char_length(location_label) <= 120),
  capacity integer check (capacity is null or capacity between 2 and 500),
  status text not null default 'scheduled' check (status in ('scheduled', 'cancelled')),
  created_at timestamptz not null default now()
);

create index if not exists community_events_starts_at_idx
  on public.community_events (starts_at) where status = 'scheduled';

create table if not exists public.community_event_participants (
  event_id uuid not null references public.community_events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create index if not exists community_event_participants_user_idx
  on public.community_event_participants (user_id);

alter table public.community_events enable row level security;
alter table public.community_event_participants enable row level security;

grant select, insert, update, delete on public.community_events to authenticated;
grant select on public.community_events to anon;
grant select, insert, delete on public.community_event_participants to authenticated;
grant select on public.community_event_participants to anon;

drop policy if exists "Upcoming community events are public" on public.community_events;
create policy "Upcoming community events are public"
  on public.community_events for select to anon, authenticated
  using (status = 'scheduled' or creator_id = (select auth.uid()));

drop policy if exists "Members can create community events" on public.community_events;
create policy "Members can create community events"
  on public.community_events for insert to authenticated
  with check (creator_id = (select auth.uid()) and starts_at > now() and status = 'scheduled');

drop policy if exists "Creators can update their own events" on public.community_events;
create policy "Creators can update their own events"
  on public.community_events for update to authenticated
  using (creator_id = (select auth.uid()))
  with check (creator_id = (select auth.uid()));

drop policy if exists "Creators can delete their own events" on public.community_events;
create policy "Creators can delete their own events"
  on public.community_events for delete to authenticated
  using (creator_id = (select auth.uid()));

drop policy if exists "Event participants are visible" on public.community_event_participants;
create policy "Event participants are visible"
  on public.community_event_participants for select to anon, authenticated
  using (true);

drop policy if exists "Members can join upcoming events" on public.community_event_participants;
create policy "Members can join upcoming events"
  on public.community_event_participants for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.community_events e
      where e.id = event_id and e.status = 'scheduled' and e.starts_at > now()
        and (e.capacity is null or (
          select count(*) from public.community_event_participants p where p.event_id = e.id
        ) < e.capacity)
    )
  );

drop policy if exists "Members can leave events" on public.community_event_participants;
create policy "Members can leave events"
  on public.community_event_participants for delete to authenticated
  using (user_id = (select auth.uid()));
