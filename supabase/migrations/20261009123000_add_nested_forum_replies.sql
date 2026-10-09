ALTER TABLE public.forum_posts
  ADD COLUMN IF NOT EXISTS parent_post_id uuid NULL
  REFERENCES public.forum_posts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS forum_posts_parent_post_id_idx
  ON public.forum_posts(parent_post_id);

CREATE OR REPLACE FUNCTION public.validate_forum_post_parent()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.parent_post_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.parent_post_id = NEW.id THEN
    RAISE EXCEPTION 'A post cannot reply to itself';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.forum_posts parent
    WHERE parent.id = NEW.parent_post_id
      AND parent.topic_id = NEW.topic_id
  ) THEN
    RAISE EXCEPTION 'A reply must target a post in the same topic';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS forum_posts_validate_parent ON public.forum_posts;
CREATE TRIGGER forum_posts_validate_parent
BEFORE INSERT OR UPDATE OF parent_post_id, topic_id
ON public.forum_posts
FOR EACH ROW EXECUTE FUNCTION public.validate_forum_post_parent();
