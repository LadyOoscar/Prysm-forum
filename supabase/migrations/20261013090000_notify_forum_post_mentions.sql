create or replace function private.notify_forum_post_mentions()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
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
$$;

drop trigger if exists forum_post_mentions_notification on public.forum_posts;
create trigger forum_post_mentions_notification
after insert on public.forum_posts
for each row execute function private.notify_forum_post_mentions();
