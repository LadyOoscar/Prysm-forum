-- Remove the legacy permissive policy that allowed a conversation creator
-- to add arbitrary third parties to a private conversation.
DROP POLICY IF EXISTS "Conversation creator can add members" ON public.conversation_members;

-- Private messaging tables must never be directly accessible to anonymous users.
REVOKE ALL PRIVILEGES ON TABLE public.conversations FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.conversation_members FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.messages FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.user_blocks FROM anon;

-- The app creates direct conversations through the SECURITY DEFINER RPC.
-- Keep authenticated grants explicit and least-privilege.
GRANT SELECT ON TABLE public.conversations TO authenticated;
GRANT SELECT ON TABLE public.conversation_members TO authenticated;
GRANT SELECT, INSERT ON TABLE public.messages TO authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.user_blocks TO authenticated;
