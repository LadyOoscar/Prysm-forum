drop policy if exists "Authenticated users can add reactions with rate limit" on public.forum_reactions;
create policy "Authenticated users can add reactions with rate limit"
on public.forum_reactions
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and private.check_rate_limit((select auth.uid()), 'reaction', 60, 60)
);
