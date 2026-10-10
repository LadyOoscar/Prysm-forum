-- Allow moderators and admins to create and edit the shared badge catalogue.
-- Badge assignment permissions remain controlled by the existing profile_badges policies.
drop policy if exists "Moderators create badges" on public.badges;
create policy "Moderators create badges"
on public.badges as permissive for insert to authenticated
with check ((select private.is_moderator()));

drop policy if exists "Moderators update badges" on public.badges;
create policy "Moderators update badges"
on public.badges as permissive for update to authenticated
using ((select private.is_moderator()))
with check ((select private.is_moderator()));

drop policy if exists "Moderators delete badges" on public.badges;
create policy "Moderators delete badges"
on public.badges as permissive for delete to authenticated
using ((select private.is_moderator()));
