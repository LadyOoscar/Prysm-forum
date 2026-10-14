-- Keep notification references aligned with the current forum tables.
-- The legacy topics/posts tables are no longer used by PRYSM's forum UI.
alter table public.notifications drop constraint if exists notifications_topic_id_fkey;
alter table public.notifications
  add constraint notifications_topic_id_fkey
  foreign key (topic_id) references public.forum_topics(id) on delete cascade;

alter table public.notifications drop constraint if exists notifications_post_id_fkey;
alter table public.notifications
  add constraint notifications_post_id_fkey
  foreign key (post_id) references public.forum_posts(id) on delete cascade;
