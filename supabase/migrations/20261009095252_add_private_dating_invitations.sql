create table if not exists public.dating_invitations (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  intention text not null check (intention in ('friendship','romance','discussion','community')),
  message text not null default '' check (char_length(message) <= 500),
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint dating_invitations_no_self check (sender_id <> recipient_id)
);

create index if not exists dating_invitations_recipient_status_idx
  on public.dating_invitations (recipient_id, status, created_at desc);
create index if not exists dating_invitations_sender_idx
  on public.dating_invitations (sender_id, created_at desc);
create unique index if not exists dating_invitations_one_pending_pair
  on public.dating_invitations (sender_id, recipient_id)
  where status = 'pending';

alter table public.dating_invitations enable row level security;
revoke all on public.dating_invitations from anon, authenticated;
grant select, insert, update on public.dating_invitations to authenticated;

create policy "Users can read their dating invitations"
on public.dating_invitations for select to authenticated
using (sender_id = (select auth.uid()) or recipient_id = (select auth.uid()));

create policy "Members send private dating invitations"
on public.dating_invitations for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and recipient_id <> (select auth.uid())
  and status = 'pending'
  and responded_at is null
  and exists (
    select 1 from public.profiles p
    where p.id = recipient_id
      and p.profile_visibility = 'public'
      and p.match_discovery_enabled = true
      and not private.is_blocked_between(p.id)
  )
);

create policy "Recipients respond to dating invitations"
on public.dating_invitations for update to authenticated
using (recipient_id = (select auth.uid()) and status = 'pending')
with check (
  recipient_id = (select auth.uid())
  and status in ('accepted','declined')
  and responded_at is not null
);

create or replace function private.guard_dating_invitation_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.sender_id <> new.sender_id
     or old.recipient_id <> new.recipient_id
     or old.intention <> new.intention
     or old.message <> new.message
     or old.created_at <> new.created_at
     or old.status <> 'pending'
     or new.status not in ('accepted','declined')
     or new.responded_at is null then
    raise exception 'DATING_INVITATION_UPDATE_NOT_ALLOWED';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_dating_invitation_update() from public, anon, authenticated;

create trigger guard_dating_invitation_update
before update on public.dating_invitations
for each row execute function private.guard_dating_invitation_update();

create or replace function private.create_match_on_accepted_invitation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  a uuid;
  b uuid;
begin
  if old.status = 'pending' and new.status = 'accepted' then
    if private.is_blocked_between(new.sender_id) then
      raise exception 'DATING_INVITATION_BLOCKED';
    end if;
    a := least(new.sender_id, new.recipient_id);
    b := greatest(new.sender_id, new.recipient_id);
    insert into public.dating_matches(user_a, user_b)
    values (a,b)
    on conflict (user_a,user_b) do nothing;
  end if;
  return new;
end;
$$;
revoke all on function private.create_match_on_accepted_invitation() from public, anon, authenticated;

create trigger create_match_on_accepted_invitation
after update of status on public.dating_invitations
for each row execute function private.create_match_on_accepted_invitation();

drop trigger if exists dating_match_on_like on public.dating_likes;
