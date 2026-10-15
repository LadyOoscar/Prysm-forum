create table if not exists public.profile_sensitive_consent_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null check (action in ('granted', 'withdrawn')),
  consent_version text not null,
  created_at timestamptz not null default now()
);

create index if not exists profile_sensitive_consent_events_user_created_idx
  on public.profile_sensitive_consent_events (user_id, created_at desc, id desc);

alter table public.profile_sensitive_consent_events enable row level security;

drop policy if exists "Users read own sensitive consent events" on public.profile_sensitive_consent_events;
create policy "Users read own sensitive consent events"
  on public.profile_sensitive_consent_events for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users record own sensitive consent events" on public.profile_sensitive_consent_events;
create policy "Users record own sensitive consent events"
  on public.profile_sensitive_consent_events for insert to authenticated
  with check ((select auth.uid()) = user_id);

revoke all on public.profile_sensitive_consent_events from anon, public;
grant select, insert on public.profile_sensitive_consent_events to authenticated;
