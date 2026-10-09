create or replace function private.is_blocked_between(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_blocks b
    where (b.blocker_id = (select auth.uid()) and b.blocked_id = target_profile_id)
       or (b.blocked_id = (select auth.uid()) and b.blocker_id = target_profile_id)
  );
$$;

revoke all on function private.is_blocked_between(uuid) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_blocked_between(uuid) to authenticated;

drop policy if exists "Profiles visible by privacy setting" on public.profiles;
create policy "Profiles visible by privacy setting"
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or (
    profile_visibility = 'public'
    and not private.is_blocked_between(id)
  )
);
