-- Allow everyone to read reaction totals and signed-in users to manage only their own reactions.
ALTER TABLE public.forum_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "forum reactions are publicly readable" ON public.forum_reactions;
CREATE POLICY "forum reactions are publicly readable"
  ON public.forum_reactions
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "users insert their own forum reactions" ON public.forum_reactions;
CREATE POLICY "users insert their own forum reactions"
  ON public.forum_reactions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users delete their own forum reactions" ON public.forum_reactions;
CREATE POLICY "users delete their own forum reactions"
  ON public.forum_reactions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

GRANT SELECT ON public.forum_reactions TO anon, authenticated;
GRANT INSERT, DELETE ON public.forum_reactions TO authenticated;
