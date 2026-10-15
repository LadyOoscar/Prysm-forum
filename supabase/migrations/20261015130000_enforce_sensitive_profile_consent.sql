create or replace function public.enforce_sensitive_profile_consent()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  latest_action text;
  has_sensitive_values boolean;
begin
  -- This guard protects a member's own writes through the Data API as well as
  -- writes through the profile form. Privileged server-side maintenance can
  -- still operate, but must follow the documented consent workflow.
  if auth.uid() is distinct from new.id then
    return new;
  end if;

  has_sensitive_values :=
    coalesce(nullif(btrim(new.pronouns), ''), '') <> ''
    or coalesce(nullif(btrim(new.identity), ''), '') <> ''
    or coalesce(nullif(btrim(new.orientation), ''), '') <> ''
    or coalesce(cardinality(new.community_flags), 0) > 0;

  select e.action
    into latest_action
    from public.profile_sensitive_consent_events as e
   where e.user_id = new.id
   order by e.created_at desc, e.id desc
   limit 1;

  if (has_sensitive_values or coalesce(new.sensitive_profile_visible, false))
     and latest_action is distinct from 'granted' then
    raise exception 'Explicit consent is required before saving sensitive profile data'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_sensitive_profile_consent on public.profiles;
create trigger enforce_sensitive_profile_consent
before insert or update of pronouns, identity, orientation, community_flags, sensitive_profile_visible
on public.profiles
for each row
execute function public.enforce_sensitive_profile_consent();

comment on function public.enforce_sensitive_profile_consent() is
  'Rejects direct profile writes containing sensitive identity fields unless the member has a recorded explicit consent event.';
