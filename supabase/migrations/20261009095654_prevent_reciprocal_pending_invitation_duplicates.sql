drop index if exists public.dating_invitations_one_pending_pair;
create unique index dating_invitations_one_pending_pair
  on public.dating_invitations (least(sender_id, recipient_id), greatest(sender_id, recipient_id))
  where status = 'pending';
