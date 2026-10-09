-- Keep aggregate event counts available without exposing participant rows through a definer view.
create or replace function private.community_event_counts()
returns table(event_id uuid, participant_count integer)
language sql
stable
security definer
set search_path = ''
as $$
  select cep.event_id, count(*)::integer
  from public.community_event_participants cep
  group by cep.event_id;
$$;

revoke all on function private.community_event_counts() from public;
grant usage on schema private to anon, authenticated;
grant execute on function private.community_event_counts() to anon, authenticated;

create or replace view public.community_event_counts
with (security_invoker = true)
as
select event_id, participant_count
from private.community_event_counts();
