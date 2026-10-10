-- Approved community stickers are intentionally public; RLS still limits anon reads to approved rows.
grant select on table public.stickers to anon, authenticated;
