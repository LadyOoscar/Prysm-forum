-- Remove a permissive SELECT policy whose tautological predicate exposed membership rows
-- from unrelated conversations to any user with at least one conversation membership.
drop policy if exists "members manage membership" on public.conversation_members;
