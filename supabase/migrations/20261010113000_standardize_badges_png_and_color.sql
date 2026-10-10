-- Standardize PRYSM badge visuals and allow moderators/admins to upload PNG artwork.
alter table public.badges
  add column if not exists background_color text not null default '#171b43';

alter table public.badges
  drop constraint if exists badges_background_color_hex_check;

alter table public.badges
  add constraint badges_background_color_hex_check
  check (background_color ~ '^#[0-9A-Fa-f]{6}$');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('prysm-badges', 'prysm-badges', true, 262144, array['image/png'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "PRYSM badge PNGs are public" on storage.objects;
create policy "PRYSM badge PNGs are public"
on storage.objects for select
using (bucket_id = 'prysm-badges');

drop policy if exists "Moderators upload PRYSM badge PNGs" on storage.objects;
create policy "Moderators upload PRYSM badge PNGs"
on storage.objects for insert to authenticated
with check (bucket_id = 'prysm-badges' and (select private.is_moderator()));

drop policy if exists "Moderators update PRYSM badge PNGs" on storage.objects;
create policy "Moderators update PRYSM badge PNGs"
on storage.objects for update to authenticated
using (bucket_id = 'prysm-badges' and (select private.is_moderator()))
with check (bucket_id = 'prysm-badges' and (select private.is_moderator()));

drop policy if exists "Moderators delete PRYSM badge PNGs" on storage.objects;
create policy "Moderators delete PRYSM badge PNGs"
on storage.objects for delete to authenticated
using (bucket_id = 'prysm-badges' and (select private.is_moderator()));
