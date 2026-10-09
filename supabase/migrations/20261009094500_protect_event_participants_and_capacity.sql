drop policy if exists "Event participants are visible" on public.community_event_participants;
create policy "Members can see their own event registrations"
  on public.community_event_participants for select to authenticated
  using (user_id = (select auth.uid()));

create or replace view public.community_event_counts as
  select event_id, count(*)::integer as participant_count
  from public.community_event_participants
  group by event_id;

grant select on public.community_event_counts to anon, authenticated;

create schema if not exists private;

create or replace function private.enforce_community_event_capacity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_capacity integer;
  current_count integer;
begin
  perform 1
  from public.community_events
  where id = new.event_id and status = 'scheduled' and starts_at > now()
  for update;

  if not found then
    raise exception 'This community event is no longer open for registration';
  end if;

  select capacity into event_capacity
  from public.community_events
  where id = new.event_id;

  if event_capacity is not null then
    select count(*) into current_count
    from public.community_event_participants
    where event_id = new.event_id;

    if current_count >= event_capacity then
      raise exception 'This community event is full';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_community_event_capacity() from public, anon, authenticated;

drop trigger if exists enforce_community_event_capacity on public.community_event_participants;
create trigger enforce_community_event_capacity
before insert on public.community_event_participants
for each row execute function private.enforce_community_event_capacity();

drop policy if exists "Members can join upcoming events" on public.community_event_participants;
create policy "Members can join upcoming events"
  on public.community_event_participants for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.community_events e
      where e.id = event_id and e.status = 'scheduled' and e.starts_at > now()
    )
  );