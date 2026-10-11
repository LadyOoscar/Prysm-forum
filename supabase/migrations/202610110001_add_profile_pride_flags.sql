alter table public.profiles
  add column if not exists community_flags text[] not null default '{}'::text[];
