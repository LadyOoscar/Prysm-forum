-- Restrict direct reads of sensitive profile fields. Public display remains available only through consent-aware RPCs.
revoke all on table public.profiles from anon;
revoke select on table public.profiles from authenticated;
revoke select (pronouns, identity, orientation, community_flags, sensitive_profile_visible)
  on table public.profiles from anon, authenticated;

grant select (
  id, username, display_name, bio, avatar_url, reputation, created_at,
  updated_at, banner_url, interests, looking_for, is_admin, xp, level,
  title, is_moderator
) on table public.profiles to anon;

grant select (
  id, username, display_name, bio, avatar_url, interests, age, location,
  looking_for, banner_url, dating_enabled, profile_visibility, reputation,
  xp, level, title, is_admin, is_moderator, created_at, updated_at,
  match_discovery_enabled, dating_intentions, dating_open_to, last_seen_at
) on table public.profiles to authenticated;

create or replace function public.get_my_sensitive_profile_fields()
returns table (
  pronouns text,
  identity text,
  orientation text,
  community_flags text[],
  sensitive_profile_visible boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.pronouns, p.identity, p.orientation, p.community_flags,
         (p.sensitive_profile_visible and consent.action = 'granted')
  from public.profiles as p
  left join lateral (
    select e.action
    from public.profile_sensitive_consent_events as e
    where e.user_id = p.id
    order by e.created_at desc, e.id desc
    limit 1
  ) as consent on true
  where p.id = auth.uid()
  limit 1;
$$;
revoke all on function public.get_my_sensitive_profile_fields() from public, anon;
grant execute on function public.get_my_sensitive_profile_fields() to authenticated;

create or replace function public.get_dating_discovery_profiles()
returns table (
  id uuid,
  username text,
  display_name text,
  bio text,
  avatar_url text,
  age smallint,
  location text,
  identity text,
  orientation text,
  looking_for text,
  interests text[],
  match_discovery_enabled boolean,
  dating_intentions text[],
  dating_open_to text[]
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.username, p.display_name, p.bio, p.avatar_url,
    case when p.sensitive_profile_visible and consent.action = 'granted' then p.age else null end,
    case when p.sensitive_profile_visible and consent.action = 'granted' then p.location else null end,
    case when p.sensitive_profile_visible and consent.action = 'granted' then p.identity else null end,
    case when p.sensitive_profile_visible and consent.action = 'granted' then p.orientation else null end,
    p.looking_for, p.interests, p.match_discovery_enabled,
    p.dating_intentions, p.dating_open_to
  from public.profiles as p
  left join lateral (
    select e.action from public.profile_sensitive_consent_events as e
    where e.user_id = p.id
    order by e.created_at desc, e.id desc limit 1
  ) as consent on true
  where p.match_discovery_enabled = true
    and p.profile_visibility = 'public'
    and p.id is distinct from auth.uid()
    and not private.is_blocked_between(p.id)
  order by p.updated_at desc
  limit 100;
$$;
revoke all on function public.get_dating_discovery_profiles() from public, anon;
grant execute on function public.get_dating_discovery_profiles() to authenticated;

create or replace function public.get_public_profile_flags(p_profile_id uuid)
returns table (community_flags text[])
language sql
stable
security definer
set search_path = ''
as $$
  select case when p.sensitive_profile_visible and consent.action = 'granted'
    then p.community_flags else array[]::text[] end
  from public.profiles as p
  left join lateral (
    select e.action from public.profile_sensitive_consent_events as e
    where e.user_id = p.id
    order by e.created_at desc, e.id desc limit 1
  ) as consent on true
  where p.id = p_profile_id
    and p.profile_visibility = 'public'
    and not private.is_blocked_between(p.id)
  limit 1;
$$;
revoke all on function public.get_public_profile_flags(uuid) from public;
grant execute on function public.get_public_profile_flags(uuid) to anon, authenticated;

create or replace function public.enforce_sensitive_profile_consent()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  latest_action text;
  has_sensitive_values boolean;
begin
  if auth.uid() is not null and auth.uid() is distinct from new.id then
    if tg_op = 'INSERT'
       or old.pronouns is distinct from new.pronouns
       or old.identity is distinct from new.identity
       or old.orientation is distinct from new.orientation
       or old.community_flags is distinct from new.community_flags
       or old.sensitive_profile_visible is distinct from new.sensitive_profile_visible then
      raise exception 'Only the profile owner may change sensitive profile fields'
        using errcode = '42501';
    end if;
    return new;
  end if;

  if auth.uid() is null then
    return new;
  end if;

  has_sensitive_values :=
    coalesce(nullif(btrim(new.pronouns), ''), '') <> ''
    or coalesce(nullif(btrim(new.identity), ''), '') <> ''
    or coalesce(nullif(btrim(new.orientation), ''), '') <> ''
    or coalesce(cardinality(new.community_flags), 0) > 0;

  select e.action into latest_action
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
for each row execute function public.enforce_sensitive_profile_consent();
