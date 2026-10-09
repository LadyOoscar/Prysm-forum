-- The public profile SELECT policy calls this private helper for both anon and authenticated roles.
grant usage on schema private to anon, authenticated;
