create or replace function private.is_conversation_member(target_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = target_conversation_id
      and cm.user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_conversation_member(uuid) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_conversation_member(uuid) to authenticated;

drop policy if exists "Members can read conversation members" on public.conversation_members;
create policy "Members can read conversation members"
on public.conversation_members
for select
to authenticated
using (private.is_conversation_member(conversation_id));
