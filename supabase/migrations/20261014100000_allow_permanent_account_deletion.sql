-- Keep historical attribution nullable when an account is permanently deleted.
alter table public.user_sanctions
  alter column actor_id drop not null;

alter table public.user_sanctions
  drop constraint if exists user_sanctions_actor_id_fkey;

alter table public.user_sanctions
  add constraint user_sanctions_actor_id_fkey
  foreign key (actor_id) references public.profiles(id) on delete set null;

alter table public.profile_badges
  alter column awarded_by drop not null;

alter table public.profile_badges
  drop constraint if exists profile_badges_awarded_by_fkey;

alter table public.profile_badges
  add constraint profile_badges_awarded_by_fkey
  foreign key (awarded_by) references public.profiles(id) on delete set null;
