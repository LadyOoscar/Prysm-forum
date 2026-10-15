-- Keep sensitive profile attributes out of direct table reads.
REVOKE SELECT ON TABLE public.profiles FROM authenticated;
GRANT SELECT (
  id, username, display_name, bio, avatar_url, reputation, created_at,
  updated_at, banner_url, interests, looking_for, dating_enabled,
  is_moderator, profile_visibility, is_admin, xp, level, title, last_seen_at,
  match_discovery_enabled, dating_intentions, dating_open_to
) ON TABLE public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_sensitive_profile()
RETURNS TABLE (
  pronouns text,
  identity text,
  age smallint,
  location text,
  orientation text,
  community_flags text[],
  sensitive_profile_visible boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.pronouns, p.identity, p.age, p.location, p.orientation,
         p.community_flags, p.sensitive_profile_visible
  FROM public.profiles AS p
  WHERE (SELECT auth.uid()) IS NOT NULL
    AND p.id = (SELECT auth.uid())
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_my_sensitive_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_sensitive_profile() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_public_discovery_profiles()
RETURNS TABLE (
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
  dating_intentions text[],
  dating_open_to text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.id, p.username, p.display_name, p.bio, p.avatar_url,
         CASE WHEN p.sensitive_profile_visible AND consent.action = 'granted' THEN p.age ELSE NULL END,
         p.location,
         CASE WHEN p.sensitive_profile_visible AND consent.action = 'granted' THEN p.identity ELSE NULL END,
         CASE WHEN p.sensitive_profile_visible AND consent.action = 'granted' THEN p.orientation ELSE NULL END,
         p.looking_for, p.interests, p.dating_intentions, p.dating_open_to
  FROM public.profiles AS p
  LEFT JOIN LATERAL (
    SELECT e.action
    FROM public.profile_sensitive_consent_events AS e
    WHERE e.user_id = p.id
    ORDER BY e.created_at DESC, e.id DESC
    LIMIT 1
  ) AS consent ON true
  WHERE (SELECT auth.uid()) IS NOT NULL
    AND p.id <> (SELECT auth.uid())
    AND p.match_discovery_enabled = true
    AND p.profile_visibility = 'public'
    AND NOT private.is_blocked_between(p.id)
  ORDER BY p.updated_at DESC
  LIMIT 100;
$$;
REVOKE ALL ON FUNCTION public.get_public_discovery_profiles() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_public_discovery_profiles() TO authenticated;

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
    AND p.profile_visibility = 'public'
    AND p.sensitive_profile_visible = true
    AND consent.action = 'granted'
    AND NOT private.is_blocked_between(p.id);
$$;
REVOKE ALL ON FUNCTION public.get_public_profile_flags(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profile_flags(uuid[]) TO anon, authenticated;
