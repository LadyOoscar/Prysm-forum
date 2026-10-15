-- A visibility flag alone must never override a withdrawn or absent consent.
create or replace function public.get_public_profile_by_username(p_username text)
returns table (
  id uuid, username text, display_name text, bio text, avatar_url text,
  pronouns text, identity text, interests text[], age smallint, location text,
  orientation text, community_flags text[], looking_for text, banner_url text,
  dating_enabled boolean, profile_visibility text, sensitive_profile_visible boolean,
  reputation integer, xp integer, level integer, title text, is_admin boolean,
  is_moderator boolean, created_at timestamptz
)
language sql stable security definer set search_path = ''
as $$
  select p.id, p.username, p.display_name, p.bio, p.avatar_url,
    case when p.sensitive_profile_visible and consent.action = 'granted' then p.pronouns else null end,
    case when p.sensitive_profile_visible and consent.action = 'granted' then p.identity else null end,
    p.interests,
    case when p.sensitive_profile_visible and consent.action = 'granted' then p.age else null end,
    case when p.sensitive_profile_visible and consent.action = 'granted' then p.location else null end,
    case when p.sensitive_profile_visible and consent.action = 'granted' then p.orientation else null end,
    case when p.sensitive_profile_visible and consent.action = 'granted' then p.community_flags else array[]::text[] end,
    p.looking_for, p.banner_url, p.dating_enabled, p.profile_visibility,
    (p.sensitive_profile_visible and consent.action = 'granted'),
    p.reputation, p.xp, p.level, p.title, p.is_admin, p.is_moderator, p.created_at
  from public.profiles as p
  left join lateral (
    select e.action
    from public.profile_sensitive_consent_events as e
    where e.user_id = p.id
    order by e.created_at desc, e.id desc
    limit 1
  ) as consent on true
  where lower(p.username) = lower(trim(p_username))
    and p.profile_visibility = 'public'
    and not private.is_blocked_between(p.id)
  limit 1;
$$;
revoke all on function public.get_public_profile_by_username(text) from public;
grant execute on function public.get_public_profile_by_username(text) to anon, authenticated;
