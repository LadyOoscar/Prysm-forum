ALTER TABLE public.forum_posts ADD COLUMN IF NOT EXISTS parent_post_id uuid NULL REFERENCES public.forum_posts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS forum_posts_parent_post_id_idx ON public.forum_posts(parent_post_id);
