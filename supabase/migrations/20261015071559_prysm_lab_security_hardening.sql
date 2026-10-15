-- Harden privileged RPCs in the isolated PRYSM LAB environment.
-- This deliberately does not change the production project.
begin;

create or replace function public.delete_auth_user_by_id(target_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path to ''
as $function$
declare
  deleted_id uuid;
begin
  if (select auth.uid()) is null or (select auth.uid()) <> target_user_id then
    raise exception 'You may only delete your own account'
      using errcode = '42501';
  end if;

  delete from auth.users where id = target_user_id returning id into deleted_id;
  return deleted_id is not null;
end;
$function$;

revoke execute on function public.delete_auth_user_by_id(uuid) from public, anon, authenticated;
grant execute on function public.delete_auth_user_by_id(uuid) to authenticated;

revoke execute on function public.get_orbit_members() from public, anon, authenticated;
grant execute on function public.get_orbit_members() to authenticated;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

commit;
