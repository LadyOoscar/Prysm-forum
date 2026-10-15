-- PRYSM LAB function definitions reconstructed from production catalog; no data copied.
begin;
CREATE OR REPLACE FUNCTION private.apply_reputation_reaction()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  author_id uuid;
  score_delta integer;
  prior_event_id uuid;
  daily_gain integer;
begin
  select fp.author_id into author_id from public.forum_posts fp where fp.id = coalesce(new.post_id, old.post_id);
  if author_id is null then return coalesce(new, old); end if;

  if tg_op = 'INSERT' then
    if new.user_id = author_id then return new; end if;
    score_delta := case new.reaction when 'like' then 1 when 'love' then 2 when 'laugh' then 1 when 'support' then 2 else 0 end;

    select coalesce(sum(delta),0) into daily_gain
    from public.reputation_events
    where actor_id = new.user_id and user_id = author_id and delta > 0
      and created_at >= date_trunc('day', now());

    if score_delta > 0 and daily_gain < 10 then
      score_delta := least(score_delta, 10 - daily_gain);
      insert into public.reputation_events(user_id, actor_id, post_id, reaction, delta)
      values(author_id, new.user_id, new.post_id, new.reaction, score_delta);
      update public.profiles set reputation = greatest(0, reputation + score_delta), updated_at = now() where id = author_id;
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    if old.user_id = author_id then return old; end if;

    select id, delta into prior_event_id, score_delta
    from public.reputation_events
    where user_id = author_id and actor_id = old.user_id and post_id = old.post_id
      and reaction = old.reaction and delta > 0
    order by created_at desc limit 1;

    if prior_event_id is not null then
      delete from public.reputation_events where id = prior_event_id;
      update public.profiles set reputation = greatest(0, reputation - score_delta), updated_at = now() where id = author_id;
    end if;
    return old;
  end if;
  return coalesce(new, old);
end;
$function$;

CREATE OR REPLACE FUNCTION private.apply_reputation_vote()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare author_id uuid; old_value integer; new_value integer;
begin
  select fp.author_id into author_id from public.forum_posts fp where fp.id = coalesce(new.post_id, old.post_id);
  if author_id is null then return coalesce(new, old); end if;
  if tg_op = 'INSERT' then
    insert into public.reputation_events(user_id, actor_id, post_id, reaction, delta, event_type)
    values (author_id,new.user_id,new.post_id,case when new.value=1 then 'upvote' else 'downvote' end,new.value,'vote');
    update public.profiles set reputation = reputation + new.value, updated_at = now() where id = author_id;
    return new;
  elsif tg_op = 'UPDATE' then
    old_value := old.value; new_value := new.value;
    if old_value <> new_value then
      delete from public.reputation_events where id = (
        select id from public.reputation_events where user_id=author_id and actor_id=old.user_id and post_id=old.post_id and event_type='vote' and delta=old_value order by created_at desc limit 1);
      insert into public.reputation_events(user_id,actor_id,post_id,reaction,delta,event_type)
      values (author_id,new.user_id,new.post_id,case when new.value=1 then 'upvote' else 'downvote' end,new.value,'vote');
      update public.profiles set reputation = reputation + (new_value-old_value), updated_at = now() where id=author_id;
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    delete from public.reputation_events where id = (
      select id from public.reputation_events where user_id=author_id and actor_id=old.user_id and post_id=old.post_id and event_type='vote' and delta=old.value order by created_at desc limit 1);
    update public.profiles set reputation = reputation - old.value, updated_at = now() where id=author_id;
    return old;
  end if;
  return coalesce(new, old);
end; $function$;

CREATE OR REPLACE FUNCTION private.apply_vote_reputation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$ declare target_author uuid; delta integer; begin target_author := coalesce((select author_id from public.topics where id=coalesce(new.topic_id,old.topic_id)),(select author_id from public.posts where id=coalesce(new.post_id,old.post_id))); if tg_op='DELETE' then delta := -old.value; elsif tg_op='UPDATE' then delta := new.value-old.value; else delta := new.value; end if; if target_author is not null then update public.profiles set reputation=reputation+delta where id=target_author; end if; if tg_op='DELETE' then return old; else return new; end if; end; $function$;

CREATE OR REPLACE FUNCTION private.award_forum_xp()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
  update public.profiles set xp = least(xp + 10, 100000000) where id = new.author_id;
  perform private.refresh_profile_level(new.author_id);
  return new;
end; $function$;

CREATE OR REPLACE FUNCTION private.award_reaction_xp()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare v_author uuid;
begin
  select author_id into v_author from public.forum_posts where id=new.post_id;
  if v_author is not null and v_author <> new.user_id then
    update public.profiles set xp=least(xp+2,100000000) where id=v_author;
    perform private.refresh_profile_level(v_author);
  end if;
  return new;
end; $function$;

CREATE OR REPLACE FUNCTION private.can_manage_forum()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (SELECT auth.uid())
      AND (is_moderator = true OR is_admin = true)
  );
$function$;

CREATE OR REPLACE FUNCTION private.check_rate_limit(p_user_id uuid, p_action text, p_window_seconds integer, p_max_count integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  n integer;
begin
  if p_user_id is null or p_action not in ('topic','post','message','reaction','dating_like','vote')
     or p_window_seconds < 1 or p_max_count < 1 then
    return false;
  end if;
  select count(*) into n
  from public.anti_spam_events
  where user_id = p_user_id
    and action = p_action
    and created_at >= now() - make_interval(secs => p_window_seconds);
  if n >= p_max_count then
    return false;
  end if;
  return true;
end;
$function$;

CREATE OR REPLACE FUNCTION private.cleanup_topic_antispam_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
  delete from public.anti_spam_events
  where user_id = OLD.author_id
    and action = 'topic'
    and fingerprint = md5(coalesce(OLD.title,''));
  return OLD;
end;
$function$;

CREATE OR REPLACE FUNCTION private.community_event_counts()
 RETURNS TABLE(event_id uuid, participant_count integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select cep.event_id, count(*)::integer
  from public.community_event_participants cep
  group by cep.event_id;
$function$;

CREATE OR REPLACE FUNCTION private.create_dating_match_on_like()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  a uuid;
  b uuid;
begin
  if new.liker_id is null or new.liked_id is null or new.liker_id = new.liked_id then
    return new;
  end if;

  if exists (
    select 1
    from public.dating_likes
    where liker_id = new.liked_id
      and liked_id = new.liker_id
  ) then
    a := least(new.liker_id, new.liked_id);
    b := greatest(new.liker_id, new.liked_id);

    insert into public.dating_matches(user_a, user_b)
    values (a, b)
    on conflict (user_a, user_b) do nothing;
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION private.create_match_on_accepted_invitation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION private.enforce_anti_spam_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_row jsonb := to_jsonb(new);
  v_user uuid;
  v_action text;
  v_fp text;
  v_count integer;
begin
  v_user := nullif(coalesce(
    case when TG_TABLE_NAME in ('forum_topics','forum_posts') then v_row->>'author_id' end,
    case when TG_TABLE_NAME = 'messages' then v_row->>'sender_id' end,
    case when TG_TABLE_NAME = 'forum_reactions' then v_row->>'user_id' end,
    case when TG_TABLE_NAME = 'dating_likes' then v_row->>'liker_id' end
  ), '')::uuid;

  v_action := case TG_TABLE_NAME
    when 'forum_topics' then 'topic'
    when 'forum_posts' then 'post'
    when 'messages' then 'message'
    when 'forum_reactions' then 'reaction'
    when 'dating_likes' then 'dating_like'
  end;

  if v_user is null or v_action is null then
    return new;
  end if;

  v_fp := case
    when TG_TABLE_NAME in ('forum_topics','forum_posts','messages')
      then md5(coalesce(v_row->>'title', v_row->>'body', ''))
    else null
  end;

  if not private.check_rate_limit(
    v_user,
    v_action,
    case when v_action = 'topic' then 300 else 60 end,
    case when v_action = 'topic' then 5
         when v_action = 'post' then 10
         when v_action = 'message' then 12
         when v_action = 'reaction' then 30
         when v_action = 'dating_like' then 30
         else 30
    end
  ) then
    raise exception 'RATE_LIMIT_EXCEEDED';
  end if;

  select count(*) into v_count
  from public.anti_spam_events
  where user_id = v_user
    and action = v_action
    and fingerprint is not distinct from v_fp
    and created_at >= now() - interval '5 minutes';

  if v_fp is not null and v_count > 0 then
    raise exception 'ANTI_SPAM_DUPLICATE';
  end if;

  insert into public.anti_spam_events(user_id, action, fingerprint)
  values(v_user, v_action, v_fp);

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION private.enforce_community_event_capacity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  event_capacity integer;
  current_count integer;
begin
  perform 1
  from public.community_events
  where id = new.event_id and status = 'scheduled' and starts_at > now()
  for update;

  if not found then
    raise exception 'This community event is no longer open for registration';
  end if;

  select capacity into event_capacity
  from public.community_events
  where id = new.event_id;

  if event_capacity is not null then
    select count(*) into current_count
    from public.community_event_participants
    where event_id = new.event_id;

    if current_count >= event_capacity then
      raise exception 'This community event is full';
    end if;
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION private.enforce_forum_vote()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare author_id uuid;
begin
  select fp.author_id into author_id from public.forum_posts fp where fp.id = new.post_id;
  if author_id is null then raise exception 'POST_NOT_FOUND'; end if;
  if new.user_id = author_id then raise exception 'SELF_VOTE'; end if;
  if tg_op = 'UPDATE' then new.updated_at := now(); end if;
  return new;
end; $function$;

CREATE OR REPLACE FUNCTION private.enforce_vote_rate_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
  perform private.check_rate_limit(new.user_id,'vote',60,60);
  return new;
end; $function$;

CREATE OR REPLACE FUNCTION private.guard_dating_invitation_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION private.increment_sticker_usage()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  update public.stickers set usage_count=usage_count+1 where id=new.sticker_id and status='approved';
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION private.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and is_admin = true
  );
$function$;

CREATE OR REPLACE FUNCTION private.is_blocked_between(target_profile_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1
    from public.user_blocks b
    where (b.blocker_id = (select auth.uid()) and b.blocked_id = target_profile_id)
       or (b.blocked_id = (select auth.uid()) and b.blocker_id = target_profile_id)
  );
$function$;

CREATE OR REPLACE FUNCTION private.is_conversation_member(target_conversation_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = target_conversation_id
      and cm.user_id = (select auth.uid())
  );
$function$;

CREATE OR REPLACE FUNCTION private.is_moderator()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = (SELECT auth.uid())
      AND (is_moderator = true OR is_admin = true)
  );
$function$;

CREATE OR REPLACE FUNCTION private.notify_dating_match()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  user_a_name text;
  user_b_name text;
begin
  select coalesce(nullif(display_name,''), username) into user_a_name
  from public.profiles where id = new.user_a;

  select coalesce(nullif(display_name,''), username) into user_b_name
  from public.profiles where id = new.user_b;

  insert into public.notifications (user_id, actor_id, type, message)
  values
    (new.user_a, new.user_b, 'dating_match',
      'Nouveau match avec ' || coalesce(user_b_name, 'un membre de PRYSM') || ' !'),
    (new.user_b, new.user_a, 'dating_match',
      'Nouveau match avec ' || coalesce(user_a_name, 'un membre de PRYSM') || ' !');

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION private.notify_direct_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare recipient uuid;
begin
  select cm.user_id into recipient
  from public.conversation_members cm
  where cm.conversation_id = new.conversation_id
    and cm.user_id <> new.sender_id
  limit 1;
  if recipient is not null then
    insert into public.notifications(user_id,actor_id,type,message)
    values(recipient,new.sender_id,'direct_message','Vous avez reçu un nouveau message privé.');
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION private.notify_follow()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  insert into public.notifications(user_id,actor_id,type,message)
  values(new.following_id,new.follower_id,'follow','Vous avez un nouvel abonné.');
  return new;
end $function$;

CREATE OR REPLACE FUNCTION private.notify_forum_post_mentions()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
declare
  v_actor_name text;
  v_topic_title text;
  v_username text;
  v_recipient_id uuid;
begin
  select coalesce(p.display_name, p.username, 'Un membre')
    into v_actor_name
  from public.profiles p
  where p.id = new.author_id;

  select t.title
    into v_topic_title
  from public.forum_topics t
  where t.id = new.topic_id;

  for v_username in
    select distinct lower(m[1])
    from regexp_matches(new.body, '(?:^|[^[:alnum:]_])@([A-Za-z0-9_]{1,32})', 'g') as m
  loop
    select p.id
      into v_recipient_id
    from public.profiles p
    where lower(p.username) = v_username
      and p.id <> new.author_id
    limit 1;

    if v_recipient_id is not null then
      insert into public.notifications (user_id, actor_id, type, topic_id, post_id, message)
      values (
        v_recipient_id,
        new.author_id,
        'mention',
        new.topic_id,
        new.id,
        coalesce(v_actor_name, 'Un membre') || ' t’a mentionné dans « ' || coalesce(v_topic_title, 'une discussion') || ' ».'
      );
    end if;
    v_recipient_id := null;
  end loop;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION private.notify_level_up()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
  if new.level > old.level then
    insert into public.notifications(user_id,type,message,actor_id)
    values (
      new.id,
      'level_up',
      'Niveau ' || new.level || ' atteint ! Titre : ' || coalesce(new.title, 'Nouveau') || '.',
      null
    );
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION private.notify_mentions()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  mentioned_username text;
  mentioned_user uuid;
  topic_ref uuid;
begin
  topic_ref := case when tg_table_name = 'topics' then new.id else new.topic_id end;
  for mentioned_username in
    select distinct lower(m[1])
    from regexp_matches(coalesce(new.body,''), '@([A-Za-z0-9_]{3,32})', 'g') as m
  loop
    select id into mentioned_user from public.profiles where lower(username) = mentioned_username limit 1;
    if mentioned_user is not null and mentioned_user <> new.author_id then
      insert into public.notifications(user_id,actor_id,type,topic_id,post_id,message)
      values(mentioned_user,new.author_id,'mention',topic_ref,
        case when tg_table_name = 'posts' then new.id else null end,
        'Vous avez été mentionné dans une discussion.');
    end if;
  end loop;
  return new;
end $function$;

CREATE OR REPLACE FUNCTION private.notify_post_activity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  topic_author uuid;
  topic_title text;
begin
  select author_id, title into topic_author, topic_title from public.topics where id = new.topic_id;
  if topic_author is not null and topic_author <> new.author_id then
    insert into public.notifications(user_id, actor_id, type, topic_id, post_id, message)
    values (topic_author, new.author_id, 'reply', new.topic_id, new.id, 'Quelqu’un a répondu à votre sujet « ' || left(topic_title, 180) || ' ».');
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION private.notify_post_reaction()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_post_author uuid;
  v_actor_name text;
  v_topic_id uuid;
begin
  select author_id, topic_id into v_post_author, v_topic_id from public.forum_posts where id=new.post_id;
  if v_post_author is null or v_post_author=new.user_id then return new; end if;
  select coalesce(display_name, username) into v_actor_name from public.profiles where id=new.user_id;
  insert into public.notifications(user_id,type,message,topic_id,post_id,actor_id)
  values (v_post_author,'reaction',v_actor_name || ' a réagi à ton message.',v_topic_id,new.post_id,new.user_id);
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION private.notify_reaction()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare target_author uuid; target_topic uuid; target_post uuid;
begin
  if new.topic_id is not null then
    select author_id into target_author from public.topics where id = new.topic_id;
    target_topic := new.topic_id;
  else
    select author_id, topic_id into target_author, target_topic from public.posts where id = new.post_id;
    target_post := new.post_id;
  end if;
  if target_author is not null and target_author <> new.user_id then
    insert into public.notifications(user_id,actor_id,type,topic_id,post_id,message)
    values(target_author,new.user_id,'reaction',target_topic,target_post,'Quelqu’un a réagi à votre publication.');
  end if;
  return new;
end $function$;

CREATE OR REPLACE FUNCTION private.notify_topic_reply()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_topic_author uuid;
  v_actor_name text;
  v_topic_title text;
begin
  select author_id, title into v_topic_author, v_topic_title from public.forum_topics where id = new.topic_id;
  select coalesce(display_name, username) into v_actor_name from public.profiles where id = new.author_id;
  if v_topic_author is not null and v_topic_author <> new.author_id then
    insert into public.notifications(user_id,type,message,topic_id,post_id,actor_id)
    values (v_topic_author,'reply',v_actor_name || ' a répondu à « ' || left(v_topic_title,120) || ' ».',new.topic_id,new.id,new.author_id);
    insert into public.notifications(user_id,type,message,topic_id,post_id,actor_id)
    select f.user_id,'followed_topic',v_actor_name || ' a répondu à « ' || left(v_topic_title,120) || ' ».',new.topic_id,new.id,new.author_id
    from public.forum_topic_follows f
    where f.topic_id=new.topic_id and f.user_id<>new.author_id and f.user_id<>v_topic_author;
  end if;
  if v_actor_name is not null then
    insert into public.notifications(user_id,type,message,topic_id,post_id,actor_id)
    select p.id,'mention',v_actor_name || ' t’a mentionné dans une discussion.',new.topic_id,new.id,new.author_id
    from public.profiles p
    where p.id <> new.author_id
      and lower(new.body) like '%@' || lower(p.username) || '%'
      and p.id is distinct from v_topic_author;
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION private.notify_vote_activity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  target_author uuid;
  target_topic uuid;
  target_title text;
  target_kind text;
begin
  if tg_op = 'DELETE' then
    return old;
  end if;

  if new.topic_id is not null then
    select author_id, id, title into target_author, target_topic, target_title
    from public.topics where id = new.topic_id;
    target_kind := 'sujet';
  else
    select p.author_id, p.topic_id, t.title into target_author, target_topic, target_title
    from public.posts p join public.topics t on t.id = p.topic_id
    where p.id = new.post_id;
    target_kind := 'message';
  end if;

  if target_author is not null and target_author <> new.user_id and new.value = 1 then
    insert into public.notifications(user_id, actor_id, type, topic_id, post_id, message)
    values (
      target_author, new.user_id, 'vote', target_topic,
      case when new.post_id is not null then new.post_id else null end,
      'Votre ' || target_kind || ' a reçu un vote positif dans « ' || left(coalesce(target_title,''), 180) || ' ».'
    );
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION private.protect_profile_reputation()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$ begin if new.reputation is distinct from old.reputation then new.reputation := old.reputation; end if; return new; end; $function$;

CREATE OR REPLACE FUNCTION private.protect_profile_roles()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if (new.is_admin is distinct from old.is_admin or new.is_moderator is distinct from old.is_moderator)
     and not private.is_admin() then
    raise exception 'ROLE_CHANGE_FORBIDDEN';
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION private.record_anti_spam_event(p_user_id uuid, p_action text, p_fingerprint text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
  if p_user_id is not null and p_action in ('topic','post','message','reaction','dating_like') then
    insert into public.anti_spam_events(user_id, action, fingerprint)
    values(p_user_id, p_action, p_fingerprint);
  end if;
end;
$function$;

CREATE OR REPLACE FUNCTION private.record_forum_vote_spam_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
  insert into public.anti_spam_events(user_id,action,fingerprint) values (new.user_id,'vote',new.post_id::text);
  return new;
end; $function$;

CREATE OR REPLACE FUNCTION private.refresh_profile_level(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$ declare v_xp integer; v_level integer; v_title text; begin select xp into v_xp from public.profiles where id=p_user_id; if v_xp is null then return; end if; v_level := greatest(1, floor(sqrt(v_xp / 100.0))::integer + 1); v_title := case when v_level >= 50 then 'Légende' when v_level >= 40 then 'Mythique' when v_level >= 30 then 'Vétéran' when v_level >= 20 then 'Pilier' when v_level >= 10 then 'Actif' when v_level >= 5 then 'Habitué' else 'Nouveau' end; update public.profiles set level=v_level, title=v_title where id=p_user_id; end; $function$;

CREATE OR REPLACE FUNCTION private.update_poll_vote_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
begin
  if tg_op = 'INSERT' then
    update public.forum_poll_options set vote_count = vote_count + 1 where id = new.option_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.forum_poll_options set vote_count = greatest(vote_count - 1, 0) where id = old.option_id;
    return old;
  end if;
  return null;
end;
$function$;

CREATE OR REPLACE FUNCTION public.apply_vote_reputation()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$ begin if tg_op='DELETE' then update public.profiles p set reputation=p.reputation-(old.value) where p.id=coalesce((select author_id from public.topics where id=old.topic_id),(select author_id from public.posts where id=old.post_id)); return old; elsif tg_op='UPDATE' then update public.profiles p set reputation=p.reputation-old.value+new.value where p.id=coalesce((select author_id from public.topics where id=old.topic_id),(select author_id from public.posts where id=old.post_id)); return new; else update public.profiles p set reputation=p.reputation+new.value where p.id=coalesce((select author_id from public.topics where id=new.topic_id),(select author_id from public.posts where id=new.post_id)); return new; end if; end; $function$;

CREATE OR REPLACE FUNCTION public.create_dating_match_on_like()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$ declare a uuid; b uuid; begin if exists(select 1 from public.dating_likes where liker_id=new.liked_id and liked_id=new.liker_id) then a:=least(new.liker_id,new.liked_id); b:=greatest(new.liker_id,new.liked_id); insert into public.dating_matches(user_a,user_b) values(a,b) on conflict do nothing; end if; return new; end; $function$;

CREATE OR REPLACE FUNCTION public.create_poll_for_topic(p_topic_id uuid, p_question text, p_options text[], p_multiple_choice boolean DEFAULT false)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_user uuid := auth.uid();
  v_poll uuid;
  i integer;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if not exists (select 1 from public.forum_topics where id=p_topic_id and author_id=v_user) then
    raise exception 'POLL_AUTHOR_REQUIRED';
  end if;
  if p_question is null or char_length(trim(p_question)) < 3 or char_length(p_question) > 500 then raise exception 'POLL_QUESTION_INVALID'; end if;
  if p_options is null or cardinality(p_options) < 2 or cardinality(p_options) > 8 then raise exception 'POLL_OPTIONS_INVALID'; end if;
  if exists (select 1 from unnest(p_options) x where char_length(trim(x)) < 1 or char_length(x) > 180) then raise exception 'POLL_OPTION_INVALID'; end if;
  insert into public.forum_polls(topic_id, question, multiple_choice)
  values (p_topic_id, trim(p_question), coalesce(p_multiple_choice,false))
  returning id into v_poll;
  for i in 1..cardinality(p_options) loop
    insert into public.forum_poll_options(poll_id,label,position)
    values (v_poll, trim(p_options[i]), i);
  end loop;
  return v_poll;
end;
$function$;

CREATE OR REPLACE FUNCTION public.create_topic_with_first_post(p_category_id uuid, p_title text, p_body text)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_user uuid := auth.uid();
  v_topic_id uuid;
begin
  if v_user is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  insert into public.forum_topics(category_id, author_id, title)
  values (p_category_id, v_user, p_title)
  returning id into v_topic_id;

  insert into public.forum_posts(topic_id, author_id, body)
  values (v_topic_id, v_user, p_body);

  return v_topic_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.delete_auth_user_by_id(target_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  deleted_id uuid;
begin
  delete from auth.users where id = target_user_id returning id into deleted_id;
  return deleted_id is not null;
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_orbit_members()
 RETURNS TABLE(id uuid, username text, display_name text, avatar_url text, distance_band integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT p.id, p.username, p.display_name, p.avatar_url,
    CASE
      WHEN d.km <= 5 THEN 1
      WHEN d.km <= 10 THEN 2
      WHEN d.km <= 25 THEN 3
      ELSE 4
    END AS distance_band
  FROM public.orbit_locations me
  JOIN public.orbit_locations other
    ON other.user_id <> me.user_id AND other.enabled = true
  JOIN public.profiles p
    ON p.id = other.user_id
  CROSS JOIN LATERAL (
    SELECT 2 * 6371 * asin(sqrt(least(1.0, greatest(0.0,
      power(sin(radians(other.latitude - me.latitude) / 2), 2) +
      cos(radians(me.latitude)) * cos(radians(other.latitude)) *
      power(sin(radians(other.longitude - me.longitude) / 2), 2)
    )))) AS km
  ) d
  WHERE me.user_id = (SELECT auth.uid())
    AND me.enabled = true
    AND p.profile_visibility = 'public'
    AND d.km <= 50
  ORDER BY distance_band, p.username;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  base_username text;
begin
  base_username := coalesce(nullif(new.raw_user_meta_data->>'username',''), 'membre_' || substr(new.id::text,1,8));
  insert into public.profiles (id, username, display_name)
  values (new.id, base_username, coalesce(nullif(new.raw_user_meta_data->>'display_name',''), base_username))
  on conflict (id) do nothing;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.validate_forum_post_parent()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.vote_poll(p_poll_id uuid, p_option_ids uuid[])
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  v_user uuid := auth.uid();
  v_multiple boolean;
  v_count integer;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  select multiple_choice into v_multiple from public.forum_polls where id=p_poll_id;
  if v_multiple is null then raise exception 'POLL_NOT_FOUND'; end if;
  if p_option_ids is null or cardinality(p_option_ids) < 1 then raise exception 'POLL_OPTION_REQUIRED'; end if;
  select count(*) into v_count from public.forum_poll_options where poll_id=p_poll_id and id = any(p_option_ids);
  if v_count <> cardinality(p_option_ids) then raise exception 'POLL_OPTION_INVALID'; end if;
  if not v_multiple and cardinality(p_option_ids) <> 1 then raise exception 'POLL_SINGLE_CHOICE'; end if;
  delete from public.forum_poll_votes where poll_id=p_poll_id and user_id=v_user;
  insert into public.forum_poll_votes(poll_id,option_id,user_id)
  select p_poll_id, x, v_user from unnest(p_option_ids) x;
end;
$function$;
commit;
