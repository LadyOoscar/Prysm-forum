-- PRYSM: admin and moderator powers for the current forum
create index if not exists user_sanctions_user_type_expires_idx
  on public.user_sanctions(user_id, type, expires_at);

create or replace function private.can_manage_forum()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select private.is_moderator());
$$;

revoke all on function private.can_manage_forum() from public, anon;
grant execute on function private.can_manage_forum() to authenticated;

drop policy if exists "Moderators can delete forum posts" on public.forum_posts;
create policy "Moderators can delete forum posts"
on public.forum_posts as permissive for delete to authenticated
using ((select private.can_manage_forum()));

drop policy if exists "Moderators can delete forum topics" on public.forum_topics;
create policy "Moderators can delete forum topics"
on public.forum_topics as permissive for delete to authenticated
using ((select private.can_manage_forum()));

drop policy if exists "Moderators can create forum bans" on public.user_sanctions;
create policy "Moderators can create forum bans"
on public.user_sanctions as permissive for insert to authenticated
with check (
  actor_id = (select auth.uid())
  and (select private.is_moderator())
  and type = 'forum_ban'
  and user_id <> (select auth.uid())
  and community_id is null
);

drop policy if exists "Admins can create global bans" on public.user_sanctions;
create policy "Admins can create global bans"
on public.user_sanctions as permissive for insert to authenticated
with check (
  actor_id = (select auth.uid())
  and (select private.is_admin())
  and type = 'global_ban'
  and user_id <> (select auth.uid())
  and community_id is null
);

drop policy if exists "Admins and moderators can revoke sanctions" on public.user_sanctions;
create policy "Admins and moderators can revoke sanctions"
on public.user_sanctions as permissive for delete to authenticated
using (
  (select private.is_admin())
  or ((select private.is_moderator()) and actor_id = (select auth.uid()))
);

drop policy if exists "Forum posts respect active sanctions" on public.forum_posts;
create policy "Forum posts respect active sanctions"
on public.forum_posts as restrictive for insert to authenticated
with check (
  not exists (
    select 1 from public.user_sanctions s
    where s.user_id = (select auth.uid())
      and s.type in ('forum_ban','global_ban')
      and (s.expires_at is null or s.expires_at > now())
  )
);

drop policy if exists "Forum topics respect active sanctions" on public.forum_topics;
create policy "Forum topics respect active sanctions"
on public.forum_topics as restrictive for insert to authenticated
with check (
  not exists (
    select 1 from public.user_sanctions s
    where s.user_id = (select auth.uid())
      and s.type in ('forum_ban','global_ban')
      and (s.expires_at is null or s.expires_at > now())
  )
);
