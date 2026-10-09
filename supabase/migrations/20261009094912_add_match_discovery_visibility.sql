alter table public.profiles
  add column if not exists match_discovery_enabled boolean not null default true;

-- Preserve existing explicit opt-outs when introducing the independent setting.
update public.profiles
set match_discovery_enabled = dating_enabled;

comment on column public.profiles.match_discovery_enabled is
  'Whether this profile appears in match discovery. Separate from general profile visibility.';
