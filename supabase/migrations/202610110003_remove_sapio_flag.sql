-- Remove the retired sapio flag from existing profile selections.
UPDATE public.profiles
SET community_flags = array_remove(COALESCE(community_flags, ARRAY[]::text[]), 'sapio')
WHERE COALESCE(community_flags, ARRAY[]::text[]) @> ARRAY['sapio']::text[];
