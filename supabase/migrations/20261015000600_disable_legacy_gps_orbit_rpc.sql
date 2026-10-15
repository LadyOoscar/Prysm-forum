-- PRYSM LAB no longer exposes the legacy GPS-based Orbit RPC.
-- The current Gaydar experience is city-based and must not use precise coordinates.
begin;
revoke execute on function public.get_orbit_members() from public, anon, authenticated;
commit;
