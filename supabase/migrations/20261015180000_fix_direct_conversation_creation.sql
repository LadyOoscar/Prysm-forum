CREATE OR REPLACE FUNCTION public.create_direct_conversation(p_target_username text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_target_id uuid;
  v_conversation_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED' USING ERRCODE = '28000';
  END IF;

  IF p_target_username IS NULL OR btrim(p_target_username) = '' THEN
    RAISE EXCEPTION 'MEMBER_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  SELECT p.id
    INTO v_target_id
  FROM public.profiles AS p
  WHERE lower(p.username) = lower(btrim(p_target_username))
  LIMIT 1;

  IF v_target_id IS NULL THEN
    RAISE EXCEPTION 'MEMBER_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF v_target_id = v_user_id THEN
    RAISE EXCEPTION 'CANNOT_MESSAGE_SELF' USING ERRCODE = '22023';
  END IF;

  IF private.is_blocked_between(v_target_id) THEN
    RAISE EXCEPTION 'MEMBER_BLOCKED' USING ERRCODE = '42501';
  END IF;

  SELECT mine.conversation_id
    INTO v_conversation_id
  FROM public.conversation_members AS mine
  JOIN public.conversation_members AS theirs
    ON theirs.conversation_id = mine.conversation_id
  WHERE mine.user_id = v_user_id
    AND theirs.user_id = v_target_id
  ORDER BY mine.created_at DESC
  LIMIT 1;

  IF v_conversation_id IS NOT NULL THEN
    RETURN v_conversation_id;
  END IF;

  INSERT INTO public.conversations (created_by, direct_recipient_id)
  VALUES (v_user_id, v_target_id)
  RETURNING id INTO v_conversation_id;

  INSERT INTO public.conversation_members (conversation_id, user_id)
  VALUES (v_conversation_id, v_user_id),
         (v_conversation_id, v_target_id)
  ON CONFLICT DO NOTHING;

  RETURN v_conversation_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_direct_conversation(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_direct_conversation(text) TO authenticated;
