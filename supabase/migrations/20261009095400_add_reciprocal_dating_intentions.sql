alter table public.profiles
  add column if not exists dating_intentions text[] not null default array['friendship','discussion','community']::text[],
  add column if not exists dating_open_to text[] not null default array['friendship','discussion','community']::text[];

alter table public.profiles drop constraint if exists profiles_dating_intentions_allowed;
alter table public.profiles add constraint profiles_dating_intentions_allowed
  check (dating_intentions <@ array['friendship','romance','discussion','community']::text[]);

alter table public.profiles drop constraint if exists profiles_dating_open_to_allowed;
alter table public.profiles add constraint profiles_dating_open_to_allowed
  check (dating_open_to <@ array['friendship','romance','discussion','community']::text[]);

drop policy if exists "Members send private dating invitations" on public.dating_invitations;
create policy "Members send private dating invitations"
on public.dating_invitations for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and recipient_id <> (select auth.uid())
  and status = 'pending'
  and responded_at is null
  and exists (
    select 1
    from public.profiles recipient
    join public.profiles sender on sender.id = (select auth.uid())
    where recipient.id = recipient_id
      and recipient.profile_visibility = 'public'
      and recipient.match_discovery_enabled = true
      and not private.is_blocked_between(recipient.id)
      and sender.dating_intentions @> array[dating_invitations.intention]
      and recipient.dating_open_to @> array[dating_invitations.intention]
      and (
        dating_invitations.intention <> 'romance'
        or (
          sender.dating_open_to @> array['romance']::text[]
          and recipient.dating_intentions @> array['romance']::text[]
        )
      )
  )
);
