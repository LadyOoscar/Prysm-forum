CREATE OR REPLACE FUNCTION public.get_orbit_members()
RETURNS TABLE(id uuid, username text, display_name text, avatar_url text, distance_band integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT p.id, p.username, p.display_name, p.avatar_url,
    CASE
      WHEN d.km <= 5 THEN 1
      WHEN d.km <= 10 THEN 2
      WHEN d.km <= 25 THEN 3
      ELSE 4
    END AS distance_band
  FROM public.orbit_locations me
  JOIN public.orbit_locations other
    ON other.user_id <> me.user_id AND other.enabled = true
  JOIN public.profiles p
    ON p.id = other.user_id
  CROSS JOIN LATERAL (
    SELECT 2 * 6371 * asin(sqrt(least(1.0, greatest(0.0,
      power(sin(radians(other.latitude - me.latitude) / 2), 2) +
      cos(radians(me.latitude)) * cos(radians(other.latitude)) *
      power(sin(radians(other.longitude - me.longitude) / 2), 2)
    )))) AS km
  ) d
  WHERE me.user_id = (SELECT auth.uid())
    AND me.enabled = true
    AND p.profile_visibility = 'public'
    AND d.km <= 50
  ORDER BY distance_band, p.username;
$function$;
