-- The previous predicate compared mine.conversation_id to itself, making it true
-- for every row whenever the caller had any conversation membership.
drop policy if exists "members manage membership" on public.conversation_members;
