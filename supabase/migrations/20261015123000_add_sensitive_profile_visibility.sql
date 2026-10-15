alter table public.profiles
  add column if not exists sensitive_profile_visible boolean not null default false;

comment on column public.profiles.sensitive_profile_visible is
  'Opt-in distinct from processing consent: whether sensitive identity fields and community flags may be displayed on the public profile.';