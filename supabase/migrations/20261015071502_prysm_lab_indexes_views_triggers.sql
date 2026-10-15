-- PRYSM LAB indexes, views and triggers; definitions only, no production rows.
begin;
create or replace view public."community_event_counts" with (security_invoker=true) as
SELECT event_id,
    participant_count
   FROM private.community_event_counts() community_event_counts(event_id, participant_count);;
create or replace view public."forum_topic_stats" with (security_invoker=true) as
SELECT t.id AS topic_id,
    (count(DISTINCT p.id))::integer AS post_count,
    (count(v.post_id))::integer AS vote_count,
    (count(v.post_id) FILTER (WHERE (v.value = 1)))::integer AS up_votes,
    (count(v.post_id) FILTER (WHERE (v.value = '-1'::integer)))::integer AS down_votes,
    (COALESCE(sum(v.value), (0)::bigint))::integer AS vote_score,
    max(p.created_at) AS last_post_at
   FROM ((forum_topics t
     LEFT JOIN forum_posts p ON ((p.topic_id = t.id)))
     LEFT JOIN forum_votes v ON ((v.post_id = p.id)))
  GROUP BY t.id;;
CREATE INDEX anti_spam_events_fingerprint_idx ON public.anti_spam_events USING btree (user_id, action, fingerprint, created_at DESC);
CREATE INDEX anti_spam_events_user_action_created_idx ON public.anti_spam_events USING btree (user_id, action, created_at DESC);
CREATE INDEX community_event_participants_user_idx ON public.community_event_participants USING btree (user_id);
CREATE INDEX community_events_starts_at_idx ON public.community_events USING btree (starts_at) WHERE (status = 'scheduled'::text);
CREATE INDEX conversation_members_user_idx ON public.conversation_members USING btree (user_id);
CREATE INDEX conversations_updated_idx ON public.conversations USING btree (updated_at DESC);
CREATE INDEX dating_favorites_target_idx ON public.dating_favorites USING btree (favorite_id);
CREATE INDEX dating_favorites_user_idx ON public.dating_favorites USING btree (user_id);
CREATE UNIQUE INDEX dating_invitations_one_pending_pair ON public.dating_invitations USING btree (LEAST(sender_id, recipient_id), GREATEST(sender_id, recipient_id)) WHERE (status = 'pending'::text);
CREATE INDEX dating_invitations_recipient_status_idx ON public.dating_invitations USING btree (recipient_id, status, created_at DESC);
CREATE INDEX dating_invitations_sender_idx ON public.dating_invitations USING btree (sender_id, created_at DESC);
CREATE INDEX dating_likes_liked_idx ON public.dating_likes USING btree (liked_id);
CREATE INDEX forum_poll_options_poll_position_idx ON public.forum_poll_options USING btree (poll_id, "position");
CREATE INDEX forum_poll_votes_poll_idx ON public.forum_poll_votes USING btree (poll_id);
CREATE INDEX forum_poll_votes_user_idx ON public.forum_poll_votes USING btree (user_id);
CREATE INDEX forum_posts_parent_post_id_idx ON public.forum_posts USING btree (parent_post_id);
CREATE INDEX forum_posts_topic_idx ON public.forum_posts USING btree (topic_id, created_at);
CREATE UNIQUE INDEX forum_reactions_one_per_user_post_idx ON public.forum_reactions USING btree (post_id, user_id);
CREATE INDEX forum_reactions_post_idx ON public.forum_reactions USING btree (post_id);
CREATE INDEX forum_reports_status_idx ON public.forum_reports USING btree (status, created_at);
CREATE INDEX forum_topic_follows_topic_idx ON public.forum_topic_follows USING btree (topic_id);
CREATE INDEX forum_topic_follows_user_idx ON public.forum_topic_follows USING btree (user_id);
CREATE INDEX forum_topics_category_idx ON public.forum_topics USING btree (category_id, updated_at DESC);
CREATE INDEX forum_topics_category_updated_idx ON public.forum_topics USING btree (category_id, updated_at DESC);
CREATE INDEX messages_conversation_created_idx ON public.messages USING btree (conversation_id, created_at);
CREATE INDEX messages_conversation_idx ON public.messages USING btree (conversation_id, created_at);
CREATE INDEX moderation_actions_created_idx ON public.moderation_actions USING btree (created_at DESC);
CREATE INDEX moderation_logs_created_idx ON public.moderation_logs USING btree (created_at DESC);
CREATE INDEX notifications_unread_idx ON public.notifications USING btree (user_id) WHERE (read_at IS NULL);
CREATE INDEX notifications_user_created_idx ON public.notifications USING btree (user_id, created_at DESC);
CREATE INDEX pantheon_invocations_user_created_idx ON public.pantheon_invocations USING btree (user_id, created_at DESC);
CREATE INDEX posts_topic_created_idx ON public.posts USING btree (topic_id, created_at);
CREATE INDEX profile_photos_profile_created_idx ON public.profile_photos USING btree (profile_id, created_at DESC);
CREATE INDEX profiles_last_seen_at_idx ON public.profiles USING btree (last_seen_at DESC);
CREATE INDEX reactions_post_idx ON public.reactions USING btree (post_id) WHERE (post_id IS NOT NULL);
CREATE INDEX reactions_topic_idx ON public.reactions USING btree (topic_id) WHERE (topic_id IS NOT NULL);
CREATE INDEX reports_status_created_idx ON public.reports USING btree (status, created_at DESC);
CREATE INDEX reputation_events_user_created_idx ON public.reputation_events USING btree (user_id, created_at DESC);
CREATE INDEX sticker_usage_sticker_idx ON public.sticker_usage USING btree (sticker_id, created_at DESC);
CREATE INDEX stickers_category_idx ON public.stickers USING btree (category, status, usage_count DESC);
CREATE INDEX stickers_creator_idx ON public.stickers USING btree (creator_id);
CREATE INDEX stickers_status_created_idx ON public.stickers USING btree (status, created_at DESC);
CREATE INDEX stickers_usage_idx ON public.stickers USING btree (usage_count DESC);
CREATE INDEX stories_active_created_idx ON public.stories USING btree (expires_at, created_at DESC);
CREATE INDEX topics_community_created_idx ON public.topics USING btree (community_id, created_at DESC);
CREATE INDEX user_blocks_blocked_idx ON public.user_blocks USING btree (blocked_id);
CREATE INDEX user_follows_follower_idx ON public.user_follows USING btree (follower_id);
CREATE INDEX user_follows_following_idx ON public.user_follows USING btree (following_id);
CREATE INDEX user_sanctions_active_idx ON public.user_sanctions USING btree (user_id, type, community_id, expires_at);
CREATE INDEX user_sanctions_user_type_expires_idx ON public.user_sanctions USING btree (user_id, type, expires_at);
CREATE INDEX votes_post_idx ON public.votes USING btree (post_id) WHERE (post_id IS NOT NULL);
CREATE INDEX votes_topic_idx ON public.votes USING btree (topic_id) WHERE (topic_id IS NOT NULL);
CREATE UNIQUE INDEX votes_user_post_uidx ON public.votes USING btree (user_id, post_id) WHERE (post_id IS NOT NULL);
CREATE UNIQUE INDEX votes_user_topic_uidx ON public.votes USING btree (user_id, topic_id) WHERE (topic_id IS NOT NULL);
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();
CREATE TRIGGER enforce_community_event_capacity BEFORE INSERT ON community_event_participants FOR EACH ROW EXECUTE FUNCTION private.enforce_community_event_capacity();
CREATE TRIGGER create_match_on_accepted_invitation AFTER UPDATE OF status ON dating_invitations FOR EACH ROW EXECUTE FUNCTION private.create_match_on_accepted_invitation();
CREATE TRIGGER guard_dating_invitation_update BEFORE UPDATE ON dating_invitations FOR EACH ROW EXECUTE FUNCTION private.guard_dating_invitation_update();
CREATE TRIGGER anti_spam_dating_likes BEFORE INSERT ON dating_likes FOR EACH ROW EXECUTE FUNCTION private.enforce_anti_spam_event();
CREATE TRIGGER dating_match_notification AFTER INSERT ON dating_matches FOR EACH ROW EXECUTE FUNCTION private.notify_dating_match();
CREATE TRIGGER forum_poll_vote_count AFTER INSERT OR DELETE ON forum_poll_votes FOR EACH ROW EXECUTE FUNCTION private.update_poll_vote_count();
CREATE TRIGGER anti_spam_posts BEFORE INSERT ON forum_posts FOR EACH ROW EXECUTE FUNCTION private.enforce_anti_spam_event();
CREATE TRIGGER award_forum_post_xp AFTER INSERT ON forum_posts FOR EACH ROW EXECUTE FUNCTION private.award_forum_xp();
CREATE TRIGGER forum_post_mentions_notification AFTER INSERT ON forum_posts FOR EACH ROW EXECUTE FUNCTION private.notify_forum_post_mentions();
CREATE TRIGGER forum_posts_validate_parent BEFORE INSERT OR UPDATE OF parent_post_id, topic_id ON forum_posts FOR EACH ROW EXECUTE FUNCTION validate_forum_post_parent();
CREATE TRIGGER notify_topic_reply AFTER INSERT ON forum_posts FOR EACH ROW EXECUTE FUNCTION private.notify_topic_reply();
CREATE TRIGGER anti_spam_reactions BEFORE INSERT ON forum_reactions FOR EACH ROW EXECUTE FUNCTION private.enforce_anti_spam_event();
CREATE TRIGGER award_reaction_xp AFTER INSERT ON forum_reactions FOR EACH ROW EXECUTE FUNCTION private.award_reaction_xp();
CREATE TRIGGER notify_post_reaction AFTER INSERT ON forum_reactions FOR EACH ROW EXECUTE FUNCTION private.notify_post_reaction();
CREATE TRIGGER anti_spam_topics BEFORE INSERT ON forum_topics FOR EACH ROW EXECUTE FUNCTION private.enforce_anti_spam_event();
CREATE TRIGGER cleanup_topic_antispam AFTER DELETE ON forum_topics FOR EACH ROW EXECUTE FUNCTION private.cleanup_topic_antispam_event();
CREATE TRIGGER anti_spam_votes BEFORE INSERT OR UPDATE ON forum_votes FOR EACH ROW EXECUTE FUNCTION private.enforce_vote_rate_limit();
CREATE TRIGGER enforce_forum_vote BEFORE INSERT OR UPDATE ON forum_votes FOR EACH ROW EXECUTE FUNCTION private.enforce_forum_vote();
CREATE TRIGGER record_anti_spam_vote AFTER INSERT OR UPDATE ON forum_votes FOR EACH ROW EXECUTE FUNCTION private.record_forum_vote_spam_event();
CREATE TRIGGER reputation_on_vote_delete AFTER DELETE ON forum_votes FOR EACH ROW EXECUTE FUNCTION private.apply_reputation_vote();
CREATE TRIGGER reputation_on_vote_insert AFTER INSERT ON forum_votes FOR EACH ROW EXECUTE FUNCTION private.apply_reputation_vote();
CREATE TRIGGER reputation_on_vote_update AFTER UPDATE OF value ON forum_votes FOR EACH ROW EXECUTE FUNCTION private.apply_reputation_vote();
CREATE TRIGGER anti_spam_messages BEFORE INSERT ON messages FOR EACH ROW EXECUTE FUNCTION private.enforce_anti_spam_event();
CREATE TRIGGER messages_notification_trigger AFTER INSERT ON messages FOR EACH ROW EXECUTE FUNCTION private.notify_direct_message();
CREATE TRIGGER posts_mentions_trigger AFTER INSERT ON posts FOR EACH ROW EXECUTE FUNCTION private.notify_mentions();
CREATE TRIGGER posts_notification_trigger AFTER INSERT ON posts FOR EACH ROW EXECUTE FUNCTION private.notify_post_activity();
CREATE TRIGGER notify_profile_level_up AFTER UPDATE OF level ON profiles FOR EACH ROW EXECUTE FUNCTION private.notify_level_up();
CREATE TRIGGER protect_profile_reputation BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION private.protect_profile_reputation();
CREATE TRIGGER protect_profile_roles BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION private.protect_profile_roles();
CREATE TRIGGER reactions_notification_trigger AFTER INSERT ON reactions FOR EACH ROW EXECUTE FUNCTION private.notify_reaction();
CREATE TRIGGER sticker_usage_count_trigger AFTER INSERT ON sticker_usage FOR EACH ROW EXECUTE FUNCTION private.increment_sticker_usage();
CREATE TRIGGER topics_mentions_trigger AFTER INSERT ON topics FOR EACH ROW EXECUTE FUNCTION private.notify_mentions();
CREATE TRIGGER follows_notification_trigger AFTER INSERT ON user_follows FOR EACH ROW EXECUTE FUNCTION private.notify_follow();
CREATE TRIGGER votes_notification_trigger AFTER INSERT ON votes FOR EACH ROW EXECUTE FUNCTION private.notify_vote_activity();
CREATE TRIGGER votes_reputation_trigger AFTER INSERT OR DELETE OR UPDATE ON votes FOR EACH ROW EXECUTE FUNCTION private.apply_vote_reputation();
commit;
