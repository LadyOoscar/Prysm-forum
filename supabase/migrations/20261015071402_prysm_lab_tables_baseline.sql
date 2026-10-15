-- PRYSM LAB: table and constraint baseline only; no production row data.
begin;
create schema if not exists private;
create table public."profiles" (
  "id" uuid not null,
  "username" text not null,
  "display_name" text not null,
  "bio" text not null default ''::text,
  "avatar_url" text,
  "pronouns" text,
  "reputation" integer not null default 0,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now(),
  "banner_url" text,
  "identity" text,
  "interests" text[] not null default '{}'::text[],
  "age" smallint,
  "location" text,
  "orientation" text,
  "looking_for" text,
  "dating_enabled" boolean not null default false,
  "is_moderator" boolean not null default false,
  "profile_visibility" text not null default 'public'::text,
  "is_admin" boolean not null default false,
  "xp" integer not null default 0,
  "level" integer not null default 1,
  "title" text,
  "last_seen_at" timestamp with time zone,
  "match_discovery_enabled" boolean not null default true,
  "dating_intentions" text[] not null default ARRAY['friendship'::text, 'discussion'::text, 'community'::text],
  "dating_open_to" text[] not null default ARRAY['friendship'::text, 'discussion'::text, 'community'::text],
  "community_flags" text[] not null default '{}'::text[]
);
create table public."communities" (
  "id" uuid not null default gen_random_uuid(),
  "slug" text not null,
  "name" text not null,
  "description" text not null default ''::text,
  "icon" text not null default '🌈'::text,
  "is_nsfw" boolean not null default false,
  "created_by" uuid,
  "created_at" timestamp with time zone not null default now(),
  "category" text not null default 'Autres'::text,
  "category_order" integer not null default 99,
  "display_order" integer not null default 99,
  "banner_url" text,
  "rules" text not null default ''::text,
  "accent" text
);
create table public."community_members" (
  "community_id" uuid not null,
  "user_id" uuid not null,
  "role" text not null default 'member'::text,
  "created_at" timestamp with time zone not null default now()
);
create table public."topics" (
  "id" uuid not null default gen_random_uuid(),
  "community_id" uuid not null,
  "author_id" uuid not null,
  "title" text not null,
  "body" text not null,
  "is_pinned" boolean not null default false,
  "is_locked" boolean not null default false,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);
create table public."posts" (
  "id" uuid not null default gen_random_uuid(),
  "topic_id" uuid not null,
  "author_id" uuid not null,
  "body" text not null,
  "parent_id" uuid,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);
create table public."votes" (
  "user_id" uuid not null,
  "topic_id" uuid,
  "post_id" uuid,
  "value" smallint not null,
  "created_at" timestamp with time zone not null default now()
);
create table public."reports" (
  "id" uuid not null default gen_random_uuid(),
  "reporter_id" uuid not null,
  "topic_id" uuid,
  "post_id" uuid,
  "reason" text not null,
  "status" text not null default 'pending'::text,
  "reviewed_by" uuid,
  "resolution" text,
  "created_at" timestamp with time zone not null default now(),
  "reviewed_at" timestamp with time zone
);
create table public."moderation_roles" (
  "user_id" uuid not null,
  "role" text not null,
  "community_id" uuid,
  "created_at" timestamp with time zone not null default now()
);
create table public."moderation_logs" (
  "id" uuid not null default gen_random_uuid(),
  "actor_id" uuid,
  "target_user_id" uuid,
  "topic_id" uuid,
  "post_id" uuid,
  "action" text not null,
  "reason" text,
  "metadata" jsonb not null default '{}'::jsonb,
  "created_at" timestamp with time zone not null default now()
);
create table public."pantheon_invocations" (
  "id" uuid not null default gen_random_uuid(),
  "user_id" uuid,
  "deity" text not null,
  "context" text,
  "response" text,
  "created_at" timestamp with time zone not null default now()
);
create table public."user_sanctions" (
  "id" uuid not null default gen_random_uuid(),
  "user_id" uuid not null,
  "actor_id" uuid,
  "type" text not null,
  "community_id" uuid,
  "reason" text not null,
  "expires_at" timestamp with time zone,
  "created_at" timestamp with time zone not null default now()
);
create table public."notifications" (
  "id" uuid not null default gen_random_uuid(),
  "user_id" uuid not null,
  "actor_id" uuid,
  "type" text not null,
  "topic_id" uuid,
  "post_id" uuid,
  "message" text not null,
  "read_at" timestamp with time zone,
  "created_at" timestamp with time zone not null default now()
);
create table public."conversations" (
  "id" uuid not null default gen_random_uuid(),
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now(),
  "created_by" uuid,
  "direct_recipient_id" uuid
);
create table public."conversation_members" (
  "conversation_id" uuid not null,
  "user_id" uuid not null,
  "created_at" timestamp with time zone not null default now(),
  "role" text not null default 'member'::text
);
create table public."messages" (
  "id" uuid not null default gen_random_uuid(),
  "conversation_id" uuid not null,
  "sender_id" uuid not null,
  "body" text not null,
  "created_at" timestamp with time zone not null default now(),
  "edited_at" timestamp with time zone
);
create table public."user_blocks" (
  "blocker_id" uuid not null,
  "blocked_id" uuid not null,
  "created_at" timestamp with time zone not null default now()
);
create table public."reactions" (
  "user_id" uuid not null,
  "topic_id" uuid not null,
  "post_id" uuid not null,
  "reaction" text not null,
  "created_at" timestamp with time zone not null default now()
);
create table public."user_follows" (
  "follower_id" uuid not null,
  "following_id" uuid not null,
  "created_at" timestamp with time zone not null default now()
);
create table public."stickers" (
  "id" uuid not null default gen_random_uuid(),
  "creator_id" uuid not null,
  "name" text not null,
  "tags" text[] not null default '{}'::text[],
  "image_url" text not null,
  "mime_type" text not null,
  "width" integer,
  "height" integer,
  "status" text not null default 'pending'::text,
  "usage_count" integer not null default 0,
  "created_at" timestamp with time zone not null default now(),
  "approved_at" timestamp with time zone,
  "category" text not null default 'Général'::text
);
create table public."sticker_favorites" (
  "sticker_id" uuid not null,
  "user_id" uuid not null,
  "created_at" timestamp with time zone not null default now()
);
create table public."sticker_usage" (
  "id" uuid not null default gen_random_uuid(),
  "sticker_id" uuid not null,
  "user_id" uuid,
  "post_id" uuid,
  "created_at" timestamp with time zone not null default now()
);
create table public."dating_likes" (
  "liker_id" uuid not null,
  "liked_id" uuid not null,
  "created_at" timestamp with time zone not null default now()
);
create table public."dating_matches" (
  "user_a" uuid not null,
  "user_b" uuid not null,
  "created_at" timestamp with time zone not null default now()
);
create table public."forum_categories" (
  "id" uuid not null default gen_random_uuid(),
  "slug" text not null,
  "name" text not null,
  "description" text not null default ''::text,
  "position" integer not null default 0,
  "created_at" timestamp with time zone not null default now()
);
create table public."forum_topics" (
  "id" uuid not null default gen_random_uuid(),
  "category_id" uuid not null,
  "author_id" uuid not null,
  "title" text not null,
  "pinned" boolean not null default false,
  "locked" boolean not null default false,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);
create table public."forum_posts" (
  "id" uuid not null default gen_random_uuid(),
  "topic_id" uuid not null,
  "author_id" uuid not null,
  "body" text not null,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now(),
  "parent_post_id" uuid
);
create table public."forum_reactions" (
  "id" uuid not null default gen_random_uuid(),
  "post_id" uuid not null,
  "user_id" uuid not null,
  "reaction" text not null,
  "created_at" timestamp with time zone not null default now()
);
create table public."forum_reports" (
  "id" uuid not null default gen_random_uuid(),
  "post_id" uuid not null,
  "reporter_id" uuid not null,
  "reason" text not null,
  "details" text not null default ''::text,
  "status" text not null default 'open'::text,
  "created_at" timestamp with time zone not null default now()
);
create table public."moderation_actions" (
  "id" uuid not null default gen_random_uuid(),
  "moderator_id" uuid not null,
  "report_id" uuid,
  "post_id" uuid,
  "action" text not null,
  "created_at" timestamp with time zone not null default now()
);
create table public."anti_spam_events" (
  "id" uuid not null default gen_random_uuid(),
  "user_id" uuid not null,
  "action" text not null,
  "fingerprint" text,
  "created_at" timestamp with time zone not null default now()
);
create table public."reputation_events" (
  "id" uuid not null default gen_random_uuid(),
  "user_id" uuid not null,
  "actor_id" uuid,
  "post_id" uuid,
  "reaction" text,
  "delta" integer not null,
  "created_at" timestamp with time zone not null default now(),
  "event_type" text
);
create table public."forum_votes" (
  "post_id" uuid not null,
  "user_id" uuid not null,
  "value" smallint not null,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);
create table public."badges" (
  "id" uuid not null default gen_random_uuid(),
  "slug" text not null,
  "name" text not null,
  "description" text not null default ''::text,
  "icon" text not null default '🏷️'::text,
  "tone" text not null default 'neutral'::text,
  "created_at" timestamp with time zone not null default now(),
  "background_color" text not null default '#171b43'::text,
  "image_zoom" integer not null default 100,
  "image_position_x" integer not null default 50,
  "image_position_y" integer not null default 50,
  "border_color" text not null default '#45efff'::text,
  "border_width" integer not null default 2,
  "glow_intensity" integer not null default 25
);
create table public."profile_badges" (
  "profile_id" uuid not null,
  "badge_id" uuid not null,
  "awarded_by" uuid,
  "reason" text not null default ''::text,
  "awarded_at" timestamp with time zone not null default now()
);
create table public."forum_polls" (
  "id" uuid not null default gen_random_uuid(),
  "topic_id" uuid not null,
  "question" text not null,
  "multiple_choice" boolean not null default false,
  "created_at" timestamp with time zone not null default now()
);
create table public."forum_poll_options" (
  "id" uuid not null default gen_random_uuid(),
  "poll_id" uuid not null,
  "label" text not null,
  "position" integer not null default 0,
  "vote_count" integer not null default 0
);
create table public."forum_poll_votes" (
  "id" uuid not null default gen_random_uuid(),
  "poll_id" uuid not null,
  "option_id" uuid not null,
  "user_id" uuid not null,
  "created_at" timestamp with time zone not null default now()
);
create table public."forum_topic_follows" (
  "id" uuid not null default gen_random_uuid(),
  "topic_id" uuid not null,
  "user_id" uuid not null,
  "created_at" timestamp with time zone not null default now()
);
create table public."dating_favorites" (
  "user_id" uuid not null,
  "favorite_id" uuid not null,
  "created_at" timestamp with time zone not null default now()
);
create table public."orbit_locations" (
  "user_id" uuid not null,
  "latitude" double precision not null,
  "longitude" double precision not null,
  "enabled" boolean not null default false,
  "updated_at" timestamp with time zone not null default now()
);
create table public."profile_photos" (
  "id" uuid not null default gen_random_uuid(),
  "profile_id" uuid not null,
  "image_url" text not null,
  "storage_path" text not null,
  "caption" text not null default ''::text,
  "created_at" timestamp with time zone not null default now()
);
create table public."community_events" (
  "id" uuid not null default gen_random_uuid(),
  "creator_id" uuid not null,
  "title" text not null,
  "description" text not null default ''::text,
  "starts_at" timestamp with time zone not null,
  "event_type" text not null,
  "location_label" text not null default ''::text,
  "capacity" integer,
  "status" text not null default 'scheduled'::text,
  "created_at" timestamp with time zone not null default now()
);
create table public."community_event_participants" (
  "event_id" uuid not null,
  "user_id" uuid not null,
  "created_at" timestamp with time zone not null default now()
);
create table public."dating_invitations" (
  "id" uuid not null default gen_random_uuid(),
  "sender_id" uuid not null,
  "recipient_id" uuid not null,
  "intention" text not null,
  "message" text not null default ''::text,
  "status" text not null default 'pending'::text,
  "created_at" timestamp with time zone not null default now(),
  "responded_at" timestamp with time zone
);
create table public."stories" (
  "id" uuid not null default gen_random_uuid(),
  "user_id" uuid not null,
  "media_path" text not null,
  "media_type" text not null,
  "caption" text not null default ''::text,
  "created_at" timestamp with time zone not null default now(),
  "expires_at" timestamp with time zone not null default (now() + '24:00:00'::interval)
);
create table public."site_decorations" (
  "id" uuid not null default gen_random_uuid(),
  "slot" text not null,
  "image_url" text not null,
  "image_path" text not null,
  "alt_text" text not null default ''::text,
  "width_px" integer not null default 42,
  "height_px" integer not null default 42,
  "alignment" text not null default 'after'::text,
  "mobile_visible" boolean not null default true,
  "desktop_visible" boolean not null default true,
  "enabled" boolean not null default true,
  "updated_by" uuid,
  "updated_at" timestamp with time zone not null default now()
);
create table public."site_audio_settings" (
  "id" integer not null default 1,
  "audio_url" text not null,
  "audio_path" text not null,
  "updated_by" uuid,
  "updated_at" timestamp with time zone not null default now()
);
alter table public."anti_spam_events" add constraint "anti_spam_events_pkey" PRIMARY KEY (id);
alter table public."badges" add constraint "badges_pkey" PRIMARY KEY (id);
alter table public."communities" add constraint "communities_pkey" PRIMARY KEY (id);
alter table public."community_event_participants" add constraint "community_event_participants_pkey" PRIMARY KEY (event_id, user_id);
alter table public."community_events" add constraint "community_events_pkey" PRIMARY KEY (id);
alter table public."community_members" add constraint "community_members_pkey" PRIMARY KEY (community_id, user_id);
alter table public."conversation_members" add constraint "conversation_members_pkey" PRIMARY KEY (conversation_id, user_id);
alter table public."conversations" add constraint "conversations_pkey" PRIMARY KEY (id);
alter table public."dating_favorites" add constraint "dating_favorites_pkey" PRIMARY KEY (user_id, favorite_id);
alter table public."dating_invitations" add constraint "dating_invitations_pkey" PRIMARY KEY (id);
alter table public."dating_likes" add constraint "dating_likes_pkey" PRIMARY KEY (liker_id, liked_id);
alter table public."dating_matches" add constraint "dating_matches_pkey" PRIMARY KEY (user_a, user_b);
alter table public."forum_categories" add constraint "forum_categories_pkey" PRIMARY KEY (id);
alter table public."forum_poll_options" add constraint "forum_poll_options_pkey" PRIMARY KEY (id);
alter table public."forum_poll_votes" add constraint "forum_poll_votes_pkey" PRIMARY KEY (id);
alter table public."forum_polls" add constraint "forum_polls_pkey" PRIMARY KEY (id);
alter table public."forum_posts" add constraint "forum_posts_pkey" PRIMARY KEY (id);
alter table public."forum_reactions" add constraint "forum_reactions_pkey" PRIMARY KEY (id);
alter table public."forum_reports" add constraint "forum_reports_pkey" PRIMARY KEY (id);
alter table public."forum_topic_follows" add constraint "forum_topic_follows_pkey" PRIMARY KEY (id);
alter table public."forum_topics" add constraint "forum_topics_pkey" PRIMARY KEY (id);
alter table public."forum_votes" add constraint "forum_votes_pkey" PRIMARY KEY (post_id, user_id);
alter table public."messages" add constraint "messages_pkey" PRIMARY KEY (id);
alter table public."moderation_actions" add constraint "moderation_actions_pkey" PRIMARY KEY (id);
alter table public."moderation_logs" add constraint "moderation_logs_pkey" PRIMARY KEY (id);
alter table public."moderation_roles" add constraint "moderation_roles_pkey" PRIMARY KEY (user_id);
alter table public."notifications" add constraint "notifications_pkey" PRIMARY KEY (id);
alter table public."orbit_locations" add constraint "orbit_locations_pkey" PRIMARY KEY (user_id);
alter table public."pantheon_invocations" add constraint "pantheon_invocations_pkey" PRIMARY KEY (id);
alter table public."posts" add constraint "posts_pkey" PRIMARY KEY (id);
alter table public."profile_badges" add constraint "profile_badges_pkey" PRIMARY KEY (profile_id, badge_id);
alter table public."profile_photos" add constraint "profile_photos_pkey" PRIMARY KEY (id);
alter table public."profiles" add constraint "profiles_pkey" PRIMARY KEY (id);
alter table public."reactions" add constraint "reactions_pkey" PRIMARY KEY (user_id, topic_id, post_id, reaction);
alter table public."reports" add constraint "reports_pkey" PRIMARY KEY (id);
alter table public."reputation_events" add constraint "reputation_events_pkey" PRIMARY KEY (id);
alter table public."site_audio_settings" add constraint "site_audio_settings_pkey" PRIMARY KEY (id);
alter table public."site_decorations" add constraint "site_decorations_pkey" PRIMARY KEY (id);
alter table public."sticker_favorites" add constraint "sticker_favorites_pkey" PRIMARY KEY (sticker_id, user_id);
alter table public."sticker_usage" add constraint "sticker_usage_pkey" PRIMARY KEY (id);
alter table public."stickers" add constraint "stickers_pkey" PRIMARY KEY (id);
alter table public."stories" add constraint "stories_pkey" PRIMARY KEY (id);
alter table public."topics" add constraint "topics_pkey" PRIMARY KEY (id);
alter table public."user_blocks" add constraint "user_blocks_pkey" PRIMARY KEY (blocker_id, blocked_id);
alter table public."user_follows" add constraint "user_follows_pkey" PRIMARY KEY (follower_id, following_id);
alter table public."user_sanctions" add constraint "user_sanctions_pkey" PRIMARY KEY (id);
alter table public."badges" add constraint "badges_slug_key" UNIQUE (slug);
alter table public."communities" add constraint "communities_name_key" UNIQUE (name);
alter table public."communities" add constraint "communities_slug_key" UNIQUE (slug);
alter table public."forum_categories" add constraint "forum_categories_slug_key" UNIQUE (slug);
alter table public."forum_poll_votes" add constraint "forum_poll_votes_poll_id_option_id_user_id_key" UNIQUE (poll_id, option_id, user_id);
alter table public."forum_polls" add constraint "forum_polls_topic_id_key" UNIQUE (topic_id);
alter table public."forum_reports" add constraint "forum_reports_post_id_reporter_id_key" UNIQUE (post_id, reporter_id);
alter table public."forum_topic_follows" add constraint "forum_topic_follows_topic_id_user_id_key" UNIQUE (topic_id, user_id);
alter table public."profile_photos" add constraint "profile_photos_storage_path_unique" UNIQUE (storage_path);
alter table public."profiles" add constraint "profiles_username_key" UNIQUE (username);
alter table public."site_decorations" add constraint "site_decorations_slot_key" UNIQUE (slot);
alter table public."anti_spam_events" add constraint "anti_spam_events_action_check" CHECK ((action = ANY (ARRAY['topic'::text, 'post'::text, 'message'::text, 'reaction'::text, 'dating_like'::text, 'vote'::text])));
alter table public."badges" add constraint "badges_background_color_hex_check" CHECK ((background_color ~ '^#[0-9A-Fa-f]{6}$'::text));
alter table public."badges" add constraint "badges_border_color_format" CHECK ((border_color ~ '^#[0-9A-Fa-f]{6}$'::text));
alter table public."badges" add constraint "badges_border_width_range" CHECK (((border_width >= 0) AND (border_width <= 8)));
alter table public."badges" add constraint "badges_glow_intensity_range" CHECK (((glow_intensity >= 0) AND (glow_intensity <= 100)));
alter table public."badges" add constraint "badges_image_position_x_range" CHECK (((image_position_x >= 0) AND (image_position_x <= 100)));
alter table public."badges" add constraint "badges_image_position_y_range" CHECK (((image_position_y >= 0) AND (image_position_y <= 100)));
alter table public."badges" add constraint "badges_image_zoom_range" CHECK (((image_zoom >= 100) AND (image_zoom <= 200)));
alter table public."badges" add constraint "badges_tone_check" CHECK ((tone = ANY (ARRAY['positive'::text, 'negative'::text, 'neutral'::text])));
alter table public."communities" add constraint "communities_slug_check" CHECK ((slug ~ '^[a-z0-9-]+$'::text));
alter table public."community_events" add constraint "community_events_capacity_check" CHECK (((capacity IS NULL) OR ((capacity >= 2) AND (capacity <= 500))));
alter table public."community_events" add constraint "community_events_description_check" CHECK ((char_length(description) <= 1000));
alter table public."community_events" add constraint "community_events_event_type_check" CHECK ((event_type = ANY (ARRAY['online'::text, 'in_person'::text])));
alter table public."community_events" add constraint "community_events_location_label_check" CHECK ((char_length(location_label) <= 120));
alter table public."community_events" add constraint "community_events_status_check" CHECK ((status = ANY (ARRAY['scheduled'::text, 'cancelled'::text])));
alter table public."community_events" add constraint "community_events_title_check" CHECK (((char_length(title) >= 4) AND (char_length(title) <= 100)));
alter table public."community_members" add constraint "community_members_role_check" CHECK ((role = ANY (ARRAY['member'::text, 'moderator'::text])));
alter table public."conversation_members" add constraint "conversation_members_role_check" CHECK ((role = 'member'::text));
alter table public."dating_favorites" add constraint "dating_favorites_check" CHECK ((user_id <> favorite_id));
alter table public."dating_invitations" add constraint "dating_invitations_intention_check" CHECK ((intention = ANY (ARRAY['friendship'::text, 'romance'::text, 'discussion'::text, 'community'::text])));
alter table public."dating_invitations" add constraint "dating_invitations_message_check" CHECK ((char_length(message) <= 500));
alter table public."dating_invitations" add constraint "dating_invitations_no_self" CHECK ((sender_id <> recipient_id));
alter table public."dating_invitations" add constraint "dating_invitations_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'declined'::text])));
alter table public."dating_likes" add constraint "dating_likes_check" CHECK ((liker_id <> liked_id));
alter table public."dating_matches" add constraint "dating_matches_check" CHECK ((user_a < user_b));
alter table public."forum_poll_options" add constraint "forum_poll_options_label_check" CHECK (((char_length(label) >= 1) AND (char_length(label) <= 180)));
alter table public."forum_poll_options" add constraint "forum_poll_options_vote_count_check" CHECK ((vote_count >= 0));
alter table public."forum_polls" add constraint "forum_polls_question_check" CHECK (((char_length(question) >= 3) AND (char_length(question) <= 500)));
alter table public."forum_posts" add constraint "forum_posts_body_check" CHECK (((char_length(body) >= 1) AND (char_length(body) <= 10000)));
alter table public."forum_reactions" add constraint "forum_reactions_reaction_check" CHECK ((reaction = ANY (ARRAY['like'::text, 'love'::text, 'laugh'::text, 'support'::text, 'disagree'::text, 'angry'::text, 'cuck'::text, 'cringe'::text, 'absurd'::text])));
alter table public."forum_reports" add constraint "forum_reports_details_check" CHECK ((char_length(details) <= 2000));
alter table public."forum_reports" add constraint "forum_reports_reason_check" CHECK ((reason = ANY (ARRAY['spam'::text, 'harassment'::text, 'hate'::text, 'sexual'::text, 'illegal'::text, 'other'::text])));
alter table public."forum_reports" add constraint "forum_reports_status_check" CHECK ((status = ANY (ARRAY['open'::text, 'reviewed'::text, 'resolved'::text, 'dismissed'::text])));
alter table public."forum_topics" add constraint "forum_topics_title_check" CHECK (((char_length(title) >= 3) AND (char_length(title) <= 180)));
alter table public."forum_votes" add constraint "forum_votes_value_check" CHECK ((value = ANY (ARRAY['-1'::integer, 1])));
alter table public."messages" add constraint "messages_body_check" CHECK (((char_length(TRIM(BOTH FROM body)) >= 1) AND (char_length(TRIM(BOTH FROM body)) <= 2000)));
alter table public."moderation_actions" add constraint "moderation_actions_action_check" CHECK ((action = ANY (ARRAY['lock_topic'::text, 'unlock_topic'::text, 'resolve_report'::text, 'dismiss_report'::text, 'review_report'::text])));
alter table public."moderation_roles" add constraint "moderation_roles_check" CHECK ((((role = 'community_moderator'::text) AND (community_id IS NOT NULL)) OR ((role = ANY (ARRAY['admin'::text, 'founder'::text])) AND (community_id IS NULL))));
alter table public."moderation_roles" add constraint "moderation_roles_role_check" CHECK ((role = ANY (ARRAY['community_moderator'::text, 'admin'::text, 'founder'::text])));
alter table public."notifications" add constraint "notifications_message_check" CHECK (((char_length(message) >= 1) AND (char_length(message) <= 500)));
alter table public."notifications" add constraint "notifications_type_check" CHECK ((type = ANY (ARRAY['reply'::text, 'vote'::text, 'mention'::text, 'moderation'::text, 'direct_message'::text, 'reaction'::text, 'follow'::text, 'followed_topic'::text, 'dating_match'::text, 'level_up'::text, 'message'::text, 'match'::text])));
alter table public."orbit_locations" add constraint "orbit_locations_latitude_check" CHECK (((latitude >= ('-90'::integer)::double precision) AND (latitude <= (90)::double precision)));
alter table public."orbit_locations" add constraint "orbit_locations_longitude_check" CHECK (((longitude >= ('-180'::integer)::double precision) AND (longitude <= (180)::double precision)));
alter table public."pantheon_invocations" add constraint "pantheon_invocations_deity_check" CHECK ((deity = ANY (ARRAY['kael'::text, 'nyra'::text, 'eon'::text, 'mira'::text, 'veyr'::text, 'aelys'::text])));
alter table public."posts" add constraint "posts_body_check" CHECK (((char_length(body) >= 1) AND (char_length(body) <= 20000)));
alter table public."profile_badges" add constraint "profile_badges_reason_check" CHECK ((char_length(reason) <= 1000));
alter table public."profile_photos" add constraint "profile_photos_caption_length" CHECK ((char_length(caption) <= 180));
alter table public."profiles" add constraint "profiles_age_check" CHECK (((age IS NULL) OR ((age >= 18) AND (age <= 120))));
alter table public."profiles" add constraint "profiles_bio_check" CHECK ((char_length(bio) <= 500));
alter table public."profiles" add constraint "profiles_dating_intentions_allowed" CHECK ((dating_intentions <@ ARRAY['friendship'::text, 'romance'::text, 'discussion'::text, 'community'::text]));
alter table public."profiles" add constraint "profiles_dating_open_to_allowed" CHECK ((dating_open_to <@ ARRAY['friendship'::text, 'romance'::text, 'discussion'::text, 'community'::text]));
alter table public."profiles" add constraint "profiles_display_name_check" CHECK (((char_length(display_name) >= 1) AND (char_length(display_name) <= 60)));
alter table public."profiles" add constraint "profiles_level_check" CHECK ((level >= 1));
alter table public."profiles" add constraint "profiles_profile_visibility_check" CHECK ((profile_visibility = ANY (ARRAY['public'::text, 'private'::text])));
alter table public."profiles" add constraint "profiles_username_check" CHECK (((char_length(username) >= 3) AND (char_length(username) <= 32)));
alter table public."profiles" add constraint "profiles_xp_check" CHECK ((xp >= 0));
alter table public."reactions" add constraint "reactions_check" CHECK (((((topic_id IS NOT NULL))::integer + ((post_id IS NOT NULL))::integer) = 1));
alter table public."reactions" add constraint "reactions_reaction_check" CHECK ((reaction = ANY (ARRAY['❤️'::text, '👍'::text, '😂'::text, '😮'::text, '😢'::text])));
alter table public."reports" add constraint "reports_check" CHECK (((topic_id IS NOT NULL) <> (post_id IS NOT NULL)));
alter table public."reports" add constraint "reports_reason_check" CHECK (((char_length(reason) >= 3) AND (char_length(reason) <= 1000)));
alter table public."reports" add constraint "reports_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'reviewing'::text, 'resolved'::text, 'dismissed'::text])));
alter table public."reputation_events" add constraint "reputation_events_event_type_check" CHECK ((event_type = ANY (ARRAY['legacy_reaction'::text, 'vote'::text])));
alter table public."site_audio_settings" add constraint "site_audio_settings_id_check" CHECK ((id = 1));
alter table public."site_decorations" add constraint "site_decorations_alignment_check" CHECK ((alignment = ANY (ARRAY['before'::text, 'after'::text])));
alter table public."site_decorations" add constraint "site_decorations_height_px_check" CHECK (((height_px >= 12) AND (height_px <= 500)));
alter table public."site_decorations" add constraint "site_decorations_slot_check" CHECK ((slot = ANY (ARRAY['banner-accueil'::text, 'tab-accueil'::text, 'tab-forum'::text, 'tab-rencontres'::text, 'tab-orbite'::text, 'tab-messages'::text, 'tab-profil'::text, 'header-accueil'::text, 'header-forum'::text, 'header-rencontres'::text, 'header-orbite'::text, 'header-messages'::text, 'header-profil'::text, 'panel-home'::text, 'panel-forum'::text, 'panel-rencontres'::text, 'panel-orbite'::text, 'panel-profil'::text])));
alter table public."site_decorations" add constraint "site_decorations_width_px_check" CHECK (((width_px >= 12) AND (width_px <= 1200)));
alter table public."stickers" add constraint "stickers_category_check" CHECK (((char_length(category) >= 1) AND (char_length(category) <= 40)));
alter table public."stickers" add constraint "stickers_name_check" CHECK (((char_length(TRIM(BOTH FROM name)) >= 1) AND (char_length(TRIM(BOTH FROM name)) <= 80)));
alter table public."stickers" add constraint "stickers_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])));
alter table public."stickers" add constraint "stickers_usage_count_check" CHECK ((usage_count >= 0));
alter table public."stories" add constraint "stories_caption_check" CHECK ((char_length(caption) <= 6000));
alter table public."stories" add constraint "stories_media_type_check" CHECK ((media_type = ANY (ARRAY['image'::text, 'video'::text])));
alter table public."topics" add constraint "topics_body_check" CHECK (((char_length(body) >= 1) AND (char_length(body) <= 20000)));
alter table public."topics" add constraint "topics_title_check" CHECK (((char_length(title) >= 3) AND (char_length(title) <= 180)));
alter table public."user_blocks" add constraint "user_blocks_check" CHECK ((blocker_id <> blocked_id));
alter table public."user_follows" add constraint "user_follows_check" CHECK ((follower_id <> following_id));
alter table public."user_sanctions" add constraint "user_sanctions_check" CHECK ((((type = 'community_ban'::text) AND (community_id IS NOT NULL)) OR ((type = ANY (ARRAY['warning'::text, 'global_ban'::text])) AND (community_id IS NULL))));
alter table public."user_sanctions" add constraint "user_sanctions_reason_check" CHECK (((char_length(reason) >= 3) AND (char_length(reason) <= 1000)));
alter table public."user_sanctions" add constraint "user_sanctions_type_check" CHECK ((type = ANY (ARRAY['warning'::text, 'community_ban'::text, 'global_ban'::text])));
alter table public."votes" add constraint "votes_check" CHECK (((topic_id IS NOT NULL) <> (post_id IS NOT NULL)));
alter table public."votes" add constraint "votes_target_check" CHECK (((((topic_id IS NOT NULL))::integer + ((post_id IS NOT NULL))::integer) = 1));
alter table public."votes" add constraint "votes_value_check" CHECK ((value = ANY (ARRAY['-1'::integer, 1])));
alter table public."anti_spam_events" add constraint "anti_spam_events_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public."communities" add constraint "communities_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
alter table public."community_event_participants" add constraint "community_event_participants_event_id_fkey" FOREIGN KEY (event_id) REFERENCES community_events(id) ON DELETE CASCADE;
alter table public."community_event_participants" add constraint "community_event_participants_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public."community_events" add constraint "community_events_creator_id_fkey" FOREIGN KEY (creator_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public."community_members" add constraint "community_members_community_id_fkey" FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE;
alter table public."community_members" add constraint "community_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public."conversation_members" add constraint "conversation_members_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE;
alter table public."conversation_members" add constraint "conversation_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public."conversations" add constraint "conversations_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public."conversations" add constraint "conversations_direct_recipient_id_fkey" FOREIGN KEY (direct_recipient_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public."dating_favorites" add constraint "dating_favorites_favorite_id_fkey" FOREIGN KEY (favorite_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public."dating_favorites" add constraint "dating_favorites_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public."dating_invitations" add constraint "dating_invitations_recipient_id_fkey" FOREIGN KEY (recipient_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public."dating_invitations" add constraint "dating_invitations_sender_id_fkey" FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public."dating_likes" add constraint "dating_likes_liked_id_fkey" FOREIGN KEY (liked_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public."dating_likes" add constraint "dating_likes_liker_id_fkey" FOREIGN KEY (liker_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public."dating_matches" add constraint "dating_matches_user_a_fkey" FOREIGN KEY (user_a) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public."dating_matches" add constraint "dating_matches_user_b_fkey" FOREIGN KEY (user_b) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public."forum_poll_options" add constraint "forum_poll_options_poll_id_fkey" FOREIGN KEY (poll_id) REFERENCES forum_polls(id) ON DELETE CASCADE;
alter table public."forum_poll_votes" add constraint "forum_poll_votes_option_id_fkey" FOREIGN KEY (option_id) REFERENCES forum_poll_options(id) ON DELETE CASCADE;
alter table public."forum_poll_votes" add constraint "forum_poll_votes_poll_id_fkey" FOREIGN KEY (poll_id) REFERENCES forum_polls(id) ON DELETE CASCADE;
alter table public."forum_poll_votes" add constraint "forum_poll_votes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public."forum_polls" add constraint "forum_polls_topic_id_fkey" FOREIGN KEY (topic_id) REFERENCES forum_topics(id) ON DELETE CASCADE;
alter table public."forum_posts" add constraint "forum_posts_author_id_fkey" FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public."forum_posts" add constraint "forum_posts_parent_post_id_fkey" FOREIGN KEY (parent_post_id) REFERENCES forum_posts(id) ON DELETE SET NULL;
alter table public."forum_posts" add constraint "forum_posts_topic_id_fkey" FOREIGN KEY (topic_id) REFERENCES forum_topics(id) ON DELETE CASCADE;
alter table public."forum_reactions" add constraint "forum_reactions_post_id_fkey" FOREIGN KEY (post_id) REFERENCES forum_posts(id) ON DELETE CASCADE;
alter table public."forum_reactions" add constraint "forum_reactions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public."forum_reports" add constraint "forum_reports_post_id_fkey" FOREIGN KEY (post_id) REFERENCES forum_posts(id) ON DELETE CASCADE;
alter table public."forum_reports" add constraint "forum_reports_reporter_id_fkey" FOREIGN KEY (reporter_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public."forum_topic_follows" add constraint "forum_topic_follows_topic_id_fkey" FOREIGN KEY (topic_id) REFERENCES forum_topics(id) ON DELETE CASCADE;
alter table public."forum_topic_follows" add constraint "forum_topic_follows_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public."forum_topics" add constraint "forum_topics_author_id_fkey" FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public."forum_topics" add constraint "forum_topics_category_id_fkey" FOREIGN KEY (category_id) REFERENCES forum_categories(id) ON DELETE CASCADE;
alter table public."forum_votes" add constraint "forum_votes_post_id_fkey" FOREIGN KEY (post_id) REFERENCES forum_posts(id) ON DELETE CASCADE;
alter table public."forum_votes" add constraint "forum_votes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public."messages" add constraint "messages_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE;
alter table public."messages" add constraint "messages_sender_id_fkey" FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public."moderation_actions" add constraint "moderation_actions_moderator_id_fkey" FOREIGN KEY (moderator_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public."moderation_actions" add constraint "moderation_actions_post_id_fkey" FOREIGN KEY (post_id) REFERENCES forum_posts(id) ON DELETE SET NULL;
alter table public."moderation_actions" add constraint "moderation_actions_report_id_fkey" FOREIGN KEY (report_id) REFERENCES forum_reports(id) ON DELETE SET NULL;
alter table public."moderation_logs" add constraint "moderation_logs_actor_id_fkey" FOREIGN KEY (actor_id) REFERENCES profiles(id) ON DELETE SET NULL;
alter table public."moderation_logs" add constraint "moderation_logs_post_id_fkey" FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE SET NULL;
alter table public."moderation_logs" add constraint "moderation_logs_target_user_id_fkey" FOREIGN KEY (target_user_id) REFERENCES profiles(id) ON DELETE SET NULL;
alter table public."moderation_logs" add constraint "moderation_logs_topic_id_fkey" FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE SET NULL;
alter table public."moderation_roles" add constraint "moderation_roles_community_id_fkey" FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE;
alter table public."moderation_roles" add constraint "moderation_roles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public."notifications" add constraint "notifications_actor_id_fkey" FOREIGN KEY (actor_id) REFERENCES profiles(id) ON DELETE SET NULL;
alter table public."notifications" add constraint "notifications_post_id_fkey" FOREIGN KEY (post_id) REFERENCES forum_posts(id) ON DELETE CASCADE;
alter table public."notifications" add constraint "notifications_topic_id_fkey" FOREIGN KEY (topic_id) REFERENCES forum_topics(id) ON DELETE CASCADE;
alter table public."notifications" add constraint "notifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public."orbit_locations" add constraint "orbit_locations_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public."pantheon_invocations" add constraint "pantheon_invocations_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;
alter table public."posts" add constraint "posts_author_id_fkey" FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public."posts" add constraint "posts_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES posts(id) ON DELETE CASCADE;
alter table public."posts" add constraint "posts_topic_id_fkey" FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE;
alter table public."profile_badges" add constraint "profile_badges_awarded_by_fkey" FOREIGN KEY (awarded_by) REFERENCES profiles(id) ON DELETE SET NULL;
alter table public."profile_badges" add constraint "profile_badges_badge_id_fkey" FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE;
alter table public."profile_badges" add constraint "profile_badges_profile_id_fkey" FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public."profile_photos" add constraint "profile_photos_profile_id_fkey" FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public."reactions" add constraint "reactions_post_id_fkey" FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;
alter table public."reactions" add constraint "reactions_topic_id_fkey" FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE;
alter table public."reactions" add constraint "reactions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public."reports" add constraint "reports_post_id_fkey" FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;
alter table public."reports" add constraint "reports_reporter_id_fkey" FOREIGN KEY (reporter_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public."reports" add constraint "reports_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES profiles(id) ON DELETE SET NULL;
alter table public."reports" add constraint "reports_topic_id_fkey" FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE;
alter table public."reputation_events" add constraint "reputation_events_actor_id_fkey" FOREIGN KEY (actor_id) REFERENCES profiles(id) ON DELETE SET NULL;
alter table public."reputation_events" add constraint "reputation_events_post_id_fkey" FOREIGN KEY (post_id) REFERENCES forum_posts(id) ON DELETE SET NULL;
alter table public."reputation_events" add constraint "reputation_events_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public."site_audio_settings" add constraint "site_audio_settings_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public."site_decorations" add constraint "site_decorations_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public."sticker_favorites" add constraint "sticker_favorites_sticker_id_fkey" FOREIGN KEY (sticker_id) REFERENCES stickers(id) ON DELETE CASCADE;
alter table public."sticker_favorites" add constraint "sticker_favorites_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public."sticker_usage" add constraint "sticker_usage_post_id_fkey" FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;
alter table public."sticker_usage" add constraint "sticker_usage_sticker_id_fkey" FOREIGN KEY (sticker_id) REFERENCES stickers(id) ON DELETE CASCADE;
alter table public."sticker_usage" add constraint "sticker_usage_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;
alter table public."stickers" add constraint "stickers_creator_id_fkey" FOREIGN KEY (creator_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public."stories" add constraint "stories_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public."topics" add constraint "topics_author_id_fkey" FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public."topics" add constraint "topics_community_id_fkey" FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE;
alter table public."user_blocks" add constraint "user_blocks_blocked_id_fkey" FOREIGN KEY (blocked_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public."user_blocks" add constraint "user_blocks_blocker_id_fkey" FOREIGN KEY (blocker_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public."user_follows" add constraint "user_follows_follower_id_fkey" FOREIGN KEY (follower_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public."user_follows" add constraint "user_follows_following_id_fkey" FOREIGN KEY (following_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public."user_sanctions" add constraint "user_sanctions_actor_id_fkey" FOREIGN KEY (actor_id) REFERENCES profiles(id) ON DELETE SET NULL;
alter table public."user_sanctions" add constraint "user_sanctions_community_id_fkey" FOREIGN KEY (community_id) REFERENCES communities(id) ON DELETE CASCADE;
alter table public."user_sanctions" add constraint "user_sanctions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public."votes" add constraint "votes_post_id_fkey" FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;
alter table public."votes" add constraint "votes_topic_id_fkey" FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE;
alter table public."votes" add constraint "votes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table public."profiles" enable row level security;
alter table public."communities" enable row level security;
alter table public."community_members" enable row level security;
alter table public."topics" enable row level security;
alter table public."posts" enable row level security;
alter table public."votes" enable row level security;
alter table public."reports" enable row level security;
alter table public."moderation_roles" enable row level security;
alter table public."moderation_logs" enable row level security;
alter table public."pantheon_invocations" enable row level security;
alter table public."user_sanctions" enable row level security;
alter table public."notifications" enable row level security;
alter table public."conversations" enable row level security;
alter table public."conversation_members" enable row level security;
alter table public."messages" enable row level security;
alter table public."user_blocks" enable row level security;
alter table public."reactions" enable row level security;
alter table public."user_follows" enable row level security;
alter table public."stickers" enable row level security;
alter table public."sticker_favorites" enable row level security;
alter table public."sticker_usage" enable row level security;
alter table public."dating_likes" enable row level security;
alter table public."dating_matches" enable row level security;
alter table public."forum_categories" enable row level security;
alter table public."forum_topics" enable row level security;
alter table public."forum_posts" enable row level security;
alter table public."forum_reactions" enable row level security;
alter table public."forum_reports" enable row level security;
alter table public."moderation_actions" enable row level security;
alter table public."anti_spam_events" enable row level security;
alter table public."reputation_events" enable row level security;
alter table public."forum_votes" enable row level security;
alter table public."badges" enable row level security;
alter table public."profile_badges" enable row level security;
alter table public."forum_polls" enable row level security;
alter table public."forum_poll_options" enable row level security;
alter table public."forum_poll_votes" enable row level security;
alter table public."forum_topic_follows" enable row level security;
alter table public."dating_favorites" enable row level security;
alter table public."orbit_locations" enable row level security;
alter table public."profile_photos" enable row level security;
alter table public."community_events" enable row level security;
alter table public."community_event_participants" enable row level security;
alter table public."dating_invitations" enable row level security;
alter table public."stories" enable row level security;
alter table public."site_decorations" enable row level security;
alter table public."site_audio_settings" enable row level security;
commit;
