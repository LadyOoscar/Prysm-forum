-- Remove stale default/table and column grants from anonymous access.
REVOKE ALL PRIVILEGES ON TABLE public.profiles FROM anon;
DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles'
  LOOP
    EXECUTE format('REVOKE SELECT (%I) ON TABLE public.profiles FROM anon', c.column_name);
    EXECUTE format('REVOKE INSERT (%I) ON TABLE public.profiles FROM anon', c.column_name);
    EXECUTE format('REVOKE UPDATE (%I) ON TABLE public.profiles FROM anon', c.column_name);
    EXECUTE format('REVOKE REFERENCES (%I) ON TABLE public.profiles FROM anon', c.column_name);
  END LOOP;
END $$;

GRANT SELECT (
  id, username, display_name, bio, avatar_url, reputation, created_at,
  updated_at, banner_url, interests, is_admin, xp, level, title, is_moderator
) ON TABLE public.profiles TO anon;

-- Consent history is append-only from the user's perspective.
REVOKE ALL PRIVILEGES ON TABLE public.profile_sensitive_consent_events FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.profile_sensitive_consent_events TO authenticated;
