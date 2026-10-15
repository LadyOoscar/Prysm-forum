-- Community flags are displayed automatically when selected, without the separate
-- sensitive-profile visibility switch. Keep the member's recorded consent and
-- public profile setting as safeguards, and keep all other sensitive fields gated.

CREATE OR REPLACE FUNCTION public.get_public_profile_flags(p_profile_ids uuid[])
RETURNS TABLE (profile_id uuid, community_flags text[])
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.id, p.community_flags
  FROM public.profiles AS p
  LEFT JOIN LATERAL (
    SELECT e.action
    FROM public.profile_sensitive_consent_events AS e
    WHERE e.user_id = p.id
    ORDER BY e.created_at DESC, e.id DESC
    LIMIT 1
  ) AS consent ON true
  WHERE p.id = ANY(p_profile_ids)
    AND cardinality(coalesce(p.community_flags, ARRAY[]::text[])) > 0
    AND consent.action = 'granted'
    AND NOT private.is_blocked_between(p.id);
$$;

REVOKE ALL ON FUNCTION public.get_public_profile_flags(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profile_flags(uuid[]) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_public_profile_by_username(p_username text)
RETURNS TABLE (
  id uuid,
  username text,
  display_name text,
  bio text,
  avatar_url text,
  pronouns text,
  identity text,
  interests text[],
  age smallint,
  location text,
  orientation text,
  community_flags text[],
  looking_for text,
  banner_url text,
  dating_enabled boolean,
  profile_visibility text,
  sensitive_profile_visible boolean,
  reputation integer,
  xp integer,
  level integer,
  title text,
  is_admin boolean,
  is_moderator boolean,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    p.id,
    p.username,
    p.display_name,
    p.bio,
    p.avatar_url,
    CASE WHEN p.sensitive_profile_visible THEN p.pronouns ELSE NULL END,
    CASE WHEN p.sensitive_profile_visible THEN p.identity ELSE NULL END,
    p.interests,
    CASE WHEN p.sensitive_profile_visible THEN p.age ELSE NULL END,
    CASE WHEN p.sensitive_profile_visible THEN p.location ELSE NULL END,
    CASE WHEN p.sensitive_profile_visible THEN p.orientation ELSE NULL END,
    CASE WHEN consent.action = 'granted' THEN p.community_flags ELSE ARRAY[]::text[] END,
    p.looking_for,
    p.banner_url,
    p.dating_enabled,
    p.profile_visibility,
    p.sensitive_profile_visible,
    p.reputation,
    p.xp,
    p.level,
    p.title,
    p.is_admin,
    p.is_moderator,
    p.created_at
  FROM public.profiles AS p
  LEFT JOIN LATERAL (
    SELECT e.action
    FROM public.profile_sensitive_consent_events AS e
    WHERE e.user_id = p.id
    ORDER BY e.created_at DESC, e.id DESC
    LIMIT 1
  ) AS consent ON true
  WHERE lower(p.username) = lower(trim(p_username))
    AND p.profile_visibility = 'public'
    AND NOT private.is_blocked_between(p.id)
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_profile_by_username(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profile_by_username(text) TO anon, authenticated;
