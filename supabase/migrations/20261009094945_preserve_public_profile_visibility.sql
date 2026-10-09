grant execute on function private.is_blocked_between(uuid) to anon, authenticated;

drop policy if exists "Profiles visible by privacy setting" on public.profiles;
create policy "Profiles visible by privacy setting"
on public.profiles
for select
to anon, authenticated
using (
  id = (select auth.uid())
  or (
    profile_visibility = 'public'
    and not private.is_blocked_between(id)
  )
);
