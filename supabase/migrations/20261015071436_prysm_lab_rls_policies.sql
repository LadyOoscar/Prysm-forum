-- PRYSM LAB row-level security policies copied as definitions only; no production rows copied.
begin;
create policy "Users read own anti spam events" on "public"."anti_spam_events" for select to "authenticated" using ((( SELECT auth.uid() AS uid) = user_id));
create policy "Badges are publicly readable" on "public"."badges" for select to "anon", "authenticated" using (true);
create policy "Moderators create badges" on "public"."badges" for insert to "authenticated" with check (( SELECT private.is_moderator() AS is_moderator));
create policy "Moderators delete badges" on "public"."badges" for delete to "authenticated" using (( SELECT private.is_moderator() AS is_moderator));
create policy "Moderators update badges" on "public"."badges" for update to "authenticated" using (( SELECT private.is_moderator() AS is_moderator)) with check (( SELECT private.is_moderator() AS is_moderator));
create policy "authenticated users create communities" on "public"."communities" for insert to "authenticated" with check ((( SELECT auth.uid() AS uid) = created_by));
create policy "communities are publicly readable" on "public"."communities" for select to "anon", "authenticated" using (true);
create policy "Members can join upcoming events" on "public"."community_event_participants" for insert to "authenticated" with check (((user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM community_events e
  WHERE ((e.id = community_event_participants.event_id) AND (e.status = 'scheduled'::text) AND (e.starts_at > now()))))));
create policy "Members can leave events" on "public"."community_event_participants" for delete to "authenticated" using ((user_id = ( SELECT auth.uid() AS uid)));
create policy "Members can see their own event registrations" on "public"."community_event_participants" for select to "authenticated" using ((user_id = ( SELECT auth.uid() AS uid)));
create policy "Creators can delete their own events" on "public"."community_events" for delete to "authenticated" using ((creator_id = ( SELECT auth.uid() AS uid)));
create policy "Creators can update their own events" on "public"."community_events" for update to "authenticated" using ((creator_id = ( SELECT auth.uid() AS uid))) with check ((creator_id = ( SELECT auth.uid() AS uid)));
create policy "Members can create community events" on "public"."community_events" for insert to "authenticated" with check (((creator_id = ( SELECT auth.uid() AS uid)) AND (starts_at > now()) AND (status = 'scheduled'::text)));
create policy "Upcoming community events are public" on "public"."community_events" for select to "anon", "authenticated" using (((status = 'scheduled'::text) OR (creator_id = ( SELECT auth.uid() AS uid))));
create policy "community membership is publicly readable" on "public"."community_members" for select to "anon", "authenticated" using (true);
create policy "users join communities" on "public"."community_members" for insert to "authenticated" with check ((( SELECT auth.uid() AS uid) = user_id));
create policy "users leave communities" on "public"."community_members" for delete to "authenticated" using ((( SELECT auth.uid() AS uid) = user_id));
create policy "Conversation creator can add members" on "public"."conversation_members" for insert to "authenticated" with check (((EXISTS ( SELECT 1
   FROM conversations c
  WHERE ((c.id = conversation_members.conversation_id) AND (c.created_by = ( SELECT auth.uid() AS uid))))) OR (user_id = ( SELECT auth.uid() AS uid))));
create policy "Members can read conversation members" on "public"."conversation_members" for select to "authenticated" using (private.is_conversation_member(conversation_id));
create policy "conversation participants can join" on "public"."conversation_members" for insert to "authenticated" with check (((user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM conversations c
  WHERE ((c.id = conversation_members.conversation_id) AND ((c.created_by = ( SELECT auth.uid() AS uid)) OR (c.direct_recipient_id = ( SELECT auth.uid() AS uid))))))));
create policy "leave own conversation" on "public"."conversation_members" for delete to "authenticated" using ((user_id = ( SELECT auth.uid() AS uid)));
create policy "Members can read conversations" on "public"."conversations" for select to "authenticated" using ((EXISTS ( SELECT 1
   FROM conversation_members cm
  WHERE ((cm.conversation_id = conversations.id) AND (cm.user_id = ( SELECT auth.uid() AS uid))))));
create policy "Users can create conversations" on "public"."conversations" for insert to "authenticated" with check ((( SELECT auth.uid() AS uid) = created_by));
create policy "members create conversations" on "public"."conversations" for insert to "authenticated" with check (((created_by = ( SELECT auth.uid() AS uid)) AND (direct_recipient_id IS NOT NULL) AND (direct_recipient_id <> ( SELECT auth.uid() AS uid))));
create policy "members read conversations" on "public"."conversations" for select to "authenticated" using ((EXISTS ( SELECT 1
   FROM conversation_members cm
  WHERE ((cm.conversation_id = conversations.id) AND (cm.user_id = ( SELECT auth.uid() AS uid))))));
create policy "members update conversations" on "public"."conversations" for update to "authenticated" using ((EXISTS ( SELECT 1
   FROM conversation_members cm
  WHERE ((cm.conversation_id = conversations.id) AND (cm.user_id = ( SELECT auth.uid() AS uid)))))) with check ((EXISTS ( SELECT 1
   FROM conversation_members cm
  WHERE ((cm.conversation_id = conversations.id) AND (cm.user_id = ( SELECT auth.uid() AS uid))))));
create policy "dating favorites own delete" on "public"."dating_favorites" for delete to "authenticated" using ((( SELECT auth.uid() AS uid) = user_id));
create policy "dating favorites own insert" on "public"."dating_favorites" for insert to "authenticated" with check ((( SELECT auth.uid() AS uid) = user_id));
create policy "dating favorites own select" on "public"."dating_favorites" for select to "authenticated" using ((( SELECT auth.uid() AS uid) = user_id));
create policy "Members send private dating invitations" on "public"."dating_invitations" for insert to "authenticated" with check (((sender_id = ( SELECT auth.uid() AS uid)) AND (recipient_id <> ( SELECT auth.uid() AS uid)) AND (status = 'pending'::text) AND (responded_at IS NULL) AND (EXISTS ( SELECT 1
   FROM (profiles recipient
     JOIN profiles sender ON ((sender.id = ( SELECT auth.uid() AS uid))))
  WHERE ((recipient.id = dating_invitations.recipient_id) AND (recipient.profile_visibility = 'public'::text) AND (recipient.match_discovery_enabled = true) AND (NOT private.is_blocked_between(recipient.id)) AND (sender.dating_intentions @> ARRAY[dating_invitations.intention]) AND (recipient.dating_open_to @> ARRAY[dating_invitations.intention]) AND ((dating_invitations.intention <> 'romance'::text) OR ((sender.dating_open_to @> ARRAY['romance'::text]) AND (recipient.dating_intentions @> ARRAY['romance'::text]))))))));
create policy "Recipients respond to dating invitations" on "public"."dating_invitations" for update to "authenticated" using (((recipient_id = ( SELECT auth.uid() AS uid)) AND (status = 'pending'::text))) with check (((recipient_id = ( SELECT auth.uid() AS uid)) AND (status = ANY (ARRAY['accepted'::text, 'declined'::text])) AND (responded_at IS NOT NULL)));
create policy "Users can read their dating invitations" on "public"."dating_invitations" for select to "authenticated" using (((sender_id = ( SELECT auth.uid() AS uid)) OR (recipient_id = ( SELECT auth.uid() AS uid))));
create policy "Users create own likes with rate limit" on "public"."dating_likes" for insert to "authenticated" with check (((( SELECT auth.uid() AS uid) = liker_id) AND private.check_rate_limit(( SELECT auth.uid() AS uid), 'dating_like'::text, 60, 30)));
create policy "Users read own likes" on "public"."dating_likes" for select to "authenticated" using ((( SELECT auth.uid() AS uid) = liker_id));
create policy "Users remove own likes" on "public"."dating_likes" for delete to "authenticated" using ((( SELECT auth.uid() AS uid) = liker_id));
create policy "dating likes own delete" on "public"."dating_likes" for delete to "authenticated" using ((( SELECT auth.uid() AS uid) = liker_id));
create policy "Users read own matches" on "public"."dating_matches" for select to "authenticated" using (((( SELECT auth.uid() AS uid) = user_a) OR (( SELECT auth.uid() AS uid) = user_b)));
create policy "dating matches participants read" on "public"."dating_matches" for select to "authenticated" using (((( SELECT auth.uid() AS uid) = user_a) OR (( SELECT auth.uid() AS uid) = user_b)));
create policy "Forum categories are public" on "public"."forum_categories" for select to "anon", "authenticated" using (true);
create policy "Public can read poll options" on "public"."forum_poll_options" for select to "anon", "authenticated" using (true);
create policy "Users create own poll votes" on "public"."forum_poll_votes" for insert to "authenticated" with check ((( SELECT auth.uid() AS uid) = user_id));
create policy "Users read own poll votes" on "public"."forum_poll_votes" for select to "authenticated" using ((( SELECT auth.uid() AS uid) = user_id));
create policy "Users remove own poll votes" on "public"."forum_poll_votes" for delete to "authenticated" using ((( SELECT auth.uid() AS uid) = user_id));
create policy "Public can read polls" on "public"."forum_polls" for select to "anon", "authenticated" using (true);
create policy "Authenticated users can create posts with rate limit" on "public"."forum_posts" for insert to "authenticated" with check (((( SELECT auth.uid() AS uid) = author_id) AND private.check_rate_limit(( SELECT auth.uid() AS uid), 'post'::text, 60, 10)));
create policy "Forum posts are public" on "public"."forum_posts" for select to "anon", "authenticated" using (true);
create policy "Forum posts respect active sanctions" on "public"."forum_posts" as restrictive for insert to "authenticated" with check ((NOT (EXISTS ( SELECT 1
   FROM user_sanctions s
  WHERE ((s.user_id = ( SELECT auth.uid() AS uid)) AND (s.type = ANY (ARRAY['forum_ban'::text, 'global_ban'::text])) AND ((s.expires_at IS NULL) OR (s.expires_at > now())))))));
create policy "Moderators and admins can delete forum posts" on "public"."forum_posts" for delete to "authenticated" using (( SELECT private.is_moderator() AS is_moderator));
create policy "Authenticated users can add reactions with rate limit" on "public"."forum_reactions" for insert to "authenticated" with check (((( SELECT auth.uid() AS uid) = user_id) AND private.check_rate_limit(( SELECT auth.uid() AS uid), 'reaction'::text, 60, 60)));
create policy "Public can read reactions" on "public"."forum_reactions" for select to "anon", "authenticated" using (true);
create policy "Users can remove own reactions" on "public"."forum_reactions" for delete to "authenticated" using ((( SELECT auth.uid() AS uid) = user_id));
create policy "Moderators can read all reports" on "public"."forum_reports" for select to "authenticated" using (( SELECT private.is_moderator() AS is_moderator));
create policy "Moderators can update reports" on "public"."forum_reports" for update to "authenticated" using (( SELECT private.is_moderator() AS is_moderator)) with check (( SELECT private.is_moderator() AS is_moderator));
create policy "Users can create own reports" on "public"."forum_reports" for insert to "authenticated" with check ((( SELECT auth.uid() AS uid) = reporter_id));
create policy "Users can read own reports" on "public"."forum_reports" for select to "authenticated" using ((( SELECT auth.uid() AS uid) = reporter_id));
create policy "topic follows own delete" on "public"."forum_topic_follows" for delete to "authenticated" using ((( SELECT auth.uid() AS uid) = user_id));
create policy "topic follows own insert" on "public"."forum_topic_follows" for insert to "authenticated" with check ((( SELECT auth.uid() AS uid) = user_id));
create policy "topic follows own select" on "public"."forum_topic_follows" for select to "authenticated" using ((( SELECT auth.uid() AS uid) = user_id));
create policy "Authenticated users can create topics with rate limit" on "public"."forum_topics" for insert to "authenticated" with check (((( SELECT auth.uid() AS uid) = author_id) AND private.check_rate_limit(( SELECT auth.uid() AS uid), 'topic'::text, 300, 5)));
create policy "Forum topics are public" on "public"."forum_topics" for select to "anon", "authenticated" using (true);
create policy "Forum topics respect active sanctions" on "public"."forum_topics" as restrictive for insert to "authenticated" with check ((NOT (EXISTS ( SELECT 1
   FROM user_sanctions s
  WHERE ((s.user_id = ( SELECT auth.uid() AS uid)) AND (s.type = ANY (ARRAY['forum_ban'::text, 'global_ban'::text])) AND ((s.expires_at IS NULL) OR (s.expires_at > now())))))));
create policy "Moderators can delete forum topics" on "public"."forum_topics" for delete to "authenticated" using (( SELECT private.can_manage_forum() AS can_manage_forum));
create policy "Moderators can update topics" on "public"."forum_topics" for update to "authenticated" using (( SELECT private.is_moderator() AS is_moderator)) with check (( SELECT private.is_moderator() AS is_moderator));
create policy "Public can read forum votes" on "public"."forum_votes" for select to "anon", "authenticated" using (true);
create policy "Users can create own forum votes" on "public"."forum_votes" for insert to "authenticated" with check ((( SELECT auth.uid() AS uid) = user_id));
create policy "Users can delete own forum votes" on "public"."forum_votes" for delete to "authenticated" using ((( SELECT auth.uid() AS uid) = user_id));
create policy "Users can update own forum votes" on "public"."forum_votes" for update to "authenticated" using ((( SELECT auth.uid() AS uid) = user_id)) with check ((( SELECT auth.uid() AS uid) = user_id));
create policy "Members can read messages" on "public"."messages" for select to "authenticated" using ((EXISTS ( SELECT 1
   FROM conversation_members cm
  WHERE ((cm.conversation_id = messages.conversation_id) AND (cm.user_id = ( SELECT auth.uid() AS uid))))));
create policy "Members can send messages with rate limit unless blocked" on "public"."messages" for insert to "authenticated" with check (((sender_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM conversation_members cm
  WHERE ((cm.conversation_id = messages.conversation_id) AND (cm.user_id = ( SELECT auth.uid() AS uid))))) AND (NOT (EXISTS ( SELECT 1
   FROM (conversation_members other
     JOIN user_blocks b ON ((((b.blocker_id = ( SELECT auth.uid() AS uid)) AND (b.blocked_id = other.user_id)) OR ((b.blocker_id = other.user_id) AND (b.blocked_id = ( SELECT auth.uid() AS uid))))))
  WHERE ((other.conversation_id = messages.conversation_id) AND (other.user_id <> ( SELECT auth.uid() AS uid)))))) AND private.check_rate_limit(( SELECT auth.uid() AS uid), 'message'::text, 60, 12)));
create policy "Moderators can create moderation actions" on "public"."moderation_actions" for insert to "authenticated" with check (((( SELECT auth.uid() AS uid) = moderator_id) AND ( SELECT private.is_moderator() AS is_moderator)));
create policy "Moderators can read moderation actions" on "public"."moderation_actions" for select to "authenticated" using (( SELECT private.is_moderator() AS is_moderator));
create policy "moderators create logs" on "public"."moderation_logs" for insert to "authenticated" with check (((actor_id = ( SELECT auth.uid() AS uid)) AND ( SELECT private.is_moderator() AS is_moderator)));
create policy "moderators read all logs" on "public"."moderation_logs" for select to "authenticated" using (( SELECT private.is_admin() AS is_admin));
create policy "users read moderation logs involving them" on "public"."moderation_logs" for select to "authenticated" using (((( SELECT auth.uid() AS uid) = actor_id) OR (( SELECT auth.uid() AS uid) = target_user_id)));
create policy "users read their moderation role" on "public"."moderation_roles" for select to "authenticated" using ((( SELECT auth.uid() AS uid) = user_id));
create policy "users mark own notifications read" on "public"."notifications" for update to "authenticated" using ((( SELECT auth.uid() AS uid) = user_id)) with check ((( SELECT auth.uid() AS uid) = user_id));
create policy "users read own notifications" on "public"."notifications" for select to "authenticated" using ((( SELECT auth.uid() AS uid) = user_id));
create policy "Members manage own orbit location" on "public"."orbit_locations" for all to "authenticated" using ((( SELECT auth.uid() AS uid) = user_id)) with check ((( SELECT auth.uid() AS uid) = user_id));
create policy "Users can create own Pantheon invocations" on "public"."pantheon_invocations" for insert to "authenticated" with check ((( SELECT auth.uid() AS uid) = user_id));
create policy "Users can read own Pantheon invocations" on "public"."pantheon_invocations" for select to "authenticated" using ((( SELECT auth.uid() AS uid) = user_id));
create policy "users create pantheon invocations" on "public"."pantheon_invocations" for insert to "authenticated" with check ((( SELECT auth.uid() AS uid) = user_id));
create policy "users read their own pantheon invocations" on "public"."pantheon_invocations" for select to "authenticated" using ((( SELECT auth.uid() AS uid) = user_id));
create policy "authors update their posts" on "public"."posts" for update to "authenticated" using ((( SELECT auth.uid() AS uid) = author_id)) with check ((( SELECT auth.uid() AS uid) = author_id));
create policy "moderators delete posts" on "public"."posts" for delete to "authenticated" using ((EXISTS ( SELECT 1
   FROM moderation_roles mr
  WHERE ((mr.user_id = ( SELECT auth.uid() AS uid)) AND ((mr.role = ANY (ARRAY['admin'::text, 'founder'::text])) OR ((mr.role = 'community_moderator'::text) AND (EXISTS ( SELECT 1
           FROM topics t
          WHERE ((t.id = posts.topic_id) AND (t.community_id = mr.community_id))))))))));
create policy "posts are publicly readable" on "public"."posts" for select to "anon", "authenticated" using (true);
create policy "users create posts" on "public"."posts" for insert to "authenticated" with check (((author_id = ( SELECT auth.uid() AS uid)) AND (NOT (EXISTS ( SELECT 1
   FROM user_sanctions s
  WHERE ((s.user_id = ( SELECT auth.uid() AS uid)) AND ((s.type = 'global_ban'::text) OR ((s.type = 'community_ban'::text) AND (EXISTS ( SELECT 1
           FROM topics t
          WHERE ((t.id = posts.topic_id) AND (t.community_id = s.community_id)))))) AND ((s.expires_at IS NULL) OR (s.expires_at > now()))))))));
create policy "Moderators manage profile badges" on "public"."profile_badges" for insert to "authenticated" with check ((( SELECT private.is_moderator() AS is_moderator) AND (awarded_by = ( SELECT auth.uid() AS uid))));
create policy "Moderators remove profile badges" on "public"."profile_badges" for delete to "authenticated" using (( SELECT private.is_moderator() AS is_moderator));
create policy "Profile badges are publicly readable" on "public"."profile_badges" for select to "anon", "authenticated" using (true);
create policy "Members add photos to their own album" on "public"."profile_photos" for insert to "authenticated" with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy "Members remove photos from their own album" on "public"."profile_photos" for delete to "authenticated" using ((profile_id = ( SELECT auth.uid() AS uid)));
create policy "Members update captions in their own album" on "public"."profile_photos" for update to "authenticated" using ((profile_id = ( SELECT auth.uid() AS uid))) with check ((profile_id = ( SELECT auth.uid() AS uid)));
create policy "Public albums visible on public profiles" on "public"."profile_photos" for select to "anon", "authenticated" using (((profile_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = profile_photos.profile_id) AND (p.profile_visibility = 'public'::text))))));
create policy "Profiles visible by privacy setting" on "public"."profiles" for select to "anon", "authenticated" using (((id = ( SELECT auth.uid() AS uid)) OR ((profile_visibility = 'public'::text) AND (NOT private.is_blocked_between(id)))));
create policy "Users and admins can update profiles" on "public"."profiles" for update to "authenticated" using (((( SELECT auth.uid() AS uid) = id) OR ( SELECT private.is_admin() AS is_admin))) with check (((( SELECT auth.uid() AS uid) = id) OR ( SELECT private.is_admin() AS is_admin)));
create policy "Users create their profile" on "public"."profiles" for insert to "authenticated" with check ((( SELECT auth.uid() AS uid) = id));
create policy "profiles own last seen update" on "public"."profiles" for update to "authenticated" using ((( SELECT auth.uid() AS uid) = id)) with check ((( SELECT auth.uid() AS uid) = id));
create policy "users create their own profile" on "public"."profiles" for insert to "authenticated" with check ((( SELECT auth.uid() AS uid) = id));
create policy "reactions are publicly readable" on "public"."reactions" for select to "authenticated" using (true);
create policy "users delete own reactions" on "public"."reactions" for delete to "authenticated" using ((( SELECT auth.uid() AS uid) = user_id));
create policy "users manage own reactions" on "public"."reactions" for insert to "authenticated" with check ((( SELECT auth.uid() AS uid) = user_id));
create policy "moderators read reports" on "public"."reports" for select to "authenticated" using ((EXISTS ( SELECT 1
   FROM moderation_roles mr
  WHERE ((mr.user_id = ( SELECT auth.uid() AS uid)) AND ((mr.role = ANY (ARRAY['admin'::text, 'founder'::text])) OR ((mr.role = 'community_moderator'::text) AND (mr.community_id IN ( SELECT t.community_id
           FROM topics t
          WHERE (t.id = reports.topic_id)))))))));
create policy "moderators update reports" on "public"."reports" for update to "authenticated" using ((EXISTS ( SELECT 1
   FROM moderation_roles mr
  WHERE ((mr.user_id = ( SELECT auth.uid() AS uid)) AND ((mr.role = ANY (ARRAY['admin'::text, 'founder'::text])) OR (((mr.role = 'community_moderator'::text) AND (EXISTS ( SELECT 1
           FROM topics t
          WHERE ((t.id = reports.topic_id) AND (t.community_id = mr.community_id))))) OR ((mr.role = 'community_moderator'::text) AND (EXISTS ( SELECT 1
           FROM (posts p
             JOIN topics t ON ((t.id = p.topic_id)))
          WHERE ((p.id = reports.post_id) AND (t.community_id = mr.community_id))))))))))) with check ((status = ANY (ARRAY['pending'::text, 'reviewing'::text, 'resolved'::text, 'dismissed'::text])));
create policy "users create reports" on "public"."reports" for insert to "authenticated" with check ((( SELECT auth.uid() AS uid) = reporter_id));
create policy "users read their reports" on "public"."reports" for select to "authenticated" using ((( SELECT auth.uid() AS uid) = reporter_id));
create policy "Users can read own reputation events" on "public"."reputation_events" for select to "authenticated" using ((( SELECT auth.uid() AS uid) = user_id));
create policy "Admins manage site audio settings" on "public"."site_audio_settings" for all to "authenticated" using ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.is_admin = true))))) with check ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.is_admin = true)))));
create policy "Anyone can read site audio settings" on "public"."site_audio_settings" for select to "anon", "authenticated" using (true);
create policy "Admins manage site decorations" on "public"."site_decorations" for all to "authenticated" using ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.is_admin = true))))) with check ((EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.is_admin = true)))));
create policy "Anyone can read enabled site decorations" on "public"."site_decorations" for select to "anon", "authenticated" using ((enabled = true));
create policy "favorites readable" on "public"."sticker_favorites" for select to "authenticated" using (true);
create policy "own favorite delete" on "public"."sticker_favorites" for delete to "authenticated" using ((user_id = ( SELECT auth.uid() AS uid)));
create policy "own favorite insert" on "public"."sticker_favorites" for insert to "authenticated" with check ((user_id = ( SELECT auth.uid() AS uid)));
create policy "users log own sticker usage" on "public"."sticker_usage" for insert to "authenticated" with check ((user_id = ( SELECT auth.uid() AS uid)));
create policy "users read sticker usage" on "public"."sticker_usage" for select to "authenticated" using ((user_id = ( SELECT auth.uid() AS uid)));
create policy "approved stickers are public" on "public"."stickers" for select to "anon", "authenticated" using (((status = 'approved'::text) OR (creator_id = ( SELECT auth.uid() AS uid))));
create policy "moderators can review stickers" on "public"."stickers" for update to "authenticated" using ((EXISTS ( SELECT 1
   FROM moderation_roles mr
  WHERE ((mr.user_id = ( SELECT auth.uid() AS uid)) AND (mr.role = ANY (ARRAY['admin'::text, 'founder'::text, 'community_moderator'::text])))))) with check (((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])) AND (EXISTS ( SELECT 1
   FROM moderation_roles mr
  WHERE ((mr.user_id = ( SELECT auth.uid() AS uid)) AND (mr.role = ANY (ARRAY['admin'::text, 'founder'::text, 'community_moderator'::text])))))));
create policy "users create own stickers" on "public"."stickers" for insert to "authenticated" with check (((creator_id = ( SELECT auth.uid() AS uid)) AND (status = 'approved'::text)));
create policy "Members can create own stories" on "public"."stories" for insert to "authenticated" with check (((user_id = ( SELECT auth.uid() AS uid)) AND (expires_at > now()) AND (expires_at <= (now() + '25:00:00'::interval))));
create policy "Members can delete own stories" on "public"."stories" for delete to "authenticated" using ((user_id = ( SELECT auth.uid() AS uid)));
create policy "Members can view active stories" on "public"."stories" for select to "authenticated" using ((expires_at > now()));
create policy "authors update their topics" on "public"."topics" for update to "authenticated" using ((( SELECT auth.uid() AS uid) = author_id)) with check ((( SELECT auth.uid() AS uid) = author_id));
create policy "moderators delete topics" on "public"."topics" for delete to "authenticated" using ((EXISTS ( SELECT 1
   FROM moderation_roles mr
  WHERE ((mr.user_id = ( SELECT auth.uid() AS uid)) AND ((mr.role = ANY (ARRAY['admin'::text, 'founder'::text])) OR ((mr.role = 'community_moderator'::text) AND (mr.community_id = topics.community_id)))))));
create policy "moderators update topics" on "public"."topics" for update to "authenticated" using ((EXISTS ( SELECT 1
   FROM moderation_roles mr
  WHERE ((mr.user_id = ( SELECT auth.uid() AS uid)) AND ((mr.role = ANY (ARRAY['admin'::text, 'founder'::text])) OR ((mr.role = 'community_moderator'::text) AND (mr.community_id = topics.community_id))))))) with check (((community_id = community_id) AND (author_id = author_id)));
create policy "topics are publicly readable" on "public"."topics" for select to "anon", "authenticated" using (true);
create policy "users create topics" on "public"."topics" for insert to "authenticated" with check (((author_id = ( SELECT auth.uid() AS uid)) AND (NOT (EXISTS ( SELECT 1
   FROM user_sanctions s
  WHERE ((s.user_id = ( SELECT auth.uid() AS uid)) AND ((s.type = 'global_ban'::text) OR ((s.type = 'community_ban'::text) AND (s.community_id = topics.community_id))) AND ((s.expires_at IS NULL) OR (s.expires_at > now()))))))));
create policy "Users create own blocks" on "public"."user_blocks" for insert to "authenticated" with check ((( SELECT auth.uid() AS uid) = blocker_id));
create policy "Users read own blocks" on "public"."user_blocks" for select to "authenticated" using ((( SELECT auth.uid() AS uid) = blocker_id));
create policy "Users remove own blocks" on "public"."user_blocks" for delete to "authenticated" using ((( SELECT auth.uid() AS uid) = blocker_id));
create policy "create own blocks" on "public"."user_blocks" for insert to "authenticated" with check ((blocker_id = ( SELECT auth.uid() AS uid)));
create policy "delete own blocks" on "public"."user_blocks" for delete to "authenticated" using ((blocker_id = ( SELECT auth.uid() AS uid)));
create policy "read own blocks" on "public"."user_blocks" for select to "authenticated" using ((blocker_id = ( SELECT auth.uid() AS uid)));
create policy "follows are publicly readable" on "public"."user_follows" for select to "authenticated" using (true);
create policy "users follow" on "public"."user_follows" for insert to "authenticated" with check (((( SELECT auth.uid() AS uid) = follower_id) AND (follower_id <> following_id)));
create policy "users unfollow" on "public"."user_follows" for delete to "authenticated" using ((( SELECT auth.uid() AS uid) = follower_id));
create policy "Admins and moderators can revoke sanctions" on "public"."user_sanctions" for delete to "authenticated" using ((( SELECT private.is_admin() AS is_admin) OR (( SELECT private.is_moderator() AS is_moderator) AND (actor_id = ( SELECT auth.uid() AS uid)))));
create policy "Admins can create global bans" on "public"."user_sanctions" for insert to "authenticated" with check (((actor_id = ( SELECT auth.uid() AS uid)) AND ( SELECT private.is_admin() AS is_admin) AND (type = 'global_ban'::text) AND (user_id <> ( SELECT auth.uid() AS uid)) AND (community_id IS NULL)));
create policy "Moderators can create forum bans" on "public"."user_sanctions" for insert to "authenticated" with check (((actor_id = ( SELECT auth.uid() AS uid)) AND ( SELECT private.is_moderator() AS is_moderator) AND (type = 'forum_ban'::text) AND (user_id <> ( SELECT auth.uid() AS uid)) AND (community_id IS NULL)));
create policy "moderators create sanctions" on "public"."user_sanctions" for insert to "authenticated" with check (((actor_id = ( SELECT auth.uid() AS uid)) AND (( SELECT private.is_admin() AS is_admin) OR (( SELECT private.is_moderator() AS is_moderator) AND (type = 'community_ban'::text)))));
create policy "moderators read sanctions" on "public"."user_sanctions" for select to "authenticated" using ((( SELECT private.is_admin() AS is_admin) OR (user_id = ( SELECT auth.uid() AS uid)) OR (actor_id = ( SELECT auth.uid() AS uid))));
create policy "users read their sanctions" on "public"."user_sanctions" for select to "authenticated" using ((user_id = ( SELECT auth.uid() AS uid)));
create policy "users create valid votes" on "public"."votes" for insert to "authenticated" with check (((( SELECT auth.uid() AS uid) = user_id) AND (value = ANY (ARRAY['-1'::integer, 1])) AND (NOT (EXISTS ( SELECT 1
   FROM topics t
  WHERE ((t.id = votes.topic_id) AND (t.author_id = ( SELECT auth.uid() AS uid)))))) AND (NOT (EXISTS ( SELECT 1
   FROM posts p
  WHERE ((p.id = votes.post_id) AND (p.author_id = ( SELECT auth.uid() AS uid))))))));
create policy "users delete their votes" on "public"."votes" for delete to "authenticated" using ((( SELECT auth.uid() AS uid) = user_id));
create policy "users read their votes" on "public"."votes" for select to "authenticated" using ((( SELECT auth.uid() AS uid) = user_id));
create policy "users update their votes" on "public"."votes" for update to "authenticated" using ((( SELECT auth.uid() AS uid) = user_id)) with check (((( SELECT auth.uid() AS uid) = user_id) AND (value = ANY (ARRAY['-1'::integer, 1]))));
create policy "Admins delete PRYSM ambient audio" on "storage"."objects" for delete to "authenticated" using (((bucket_id = 'prysm-audio'::text) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.is_admin = true))))));
create policy "Admins upload PRYSM ambient audio" on "storage"."objects" for insert to "authenticated" with check (((bucket_id = 'prysm-audio'::text) AND (EXISTS ( SELECT 1
   FROM profiles p
  WHERE ((p.id = ( SELECT auth.uid() AS uid)) AND (p.is_admin = true))))));
create policy "Authenticated members can view story media" on "storage"."objects" for select to "authenticated" using ((bucket_id = 'prysm-stories'::text));
create policy "Authenticated users can listen to forum voice messages" on "storage"."objects" for select to "authenticated" using (((bucket_id = 'prysm-voice-messages'::text) AND (EXISTS ( SELECT 1
   FROM forum_topics ft
  WHERE ((ft.id)::text = (storage.foldername(objects.name))[1])))));
create policy "Conversation members can listen to voice messages" on "storage"."objects" for select to "authenticated" using (((bucket_id = 'prysm-voice-messages'::text) AND (EXISTS ( SELECT 1
   FROM conversation_members cm
  WHERE (((cm.conversation_id)::text = (storage.foldername(objects.name))[1]) AND (cm.user_id = ( SELECT auth.uid() AS uid)))))));
create policy "Conversation members can upload voice messages" on "storage"."objects" for insert to "authenticated" with check (((bucket_id = 'prysm-voice-messages'::text) AND ((storage.foldername(name))[2] = (( SELECT auth.uid() AS uid))::text) AND (EXISTS ( SELECT 1
   FROM conversation_members cm
  WHERE (((cm.conversation_id)::text = (storage.foldername(objects.name))[1]) AND (cm.user_id = ( SELECT auth.uid() AS uid)))))));
create policy "Forum members can upload voice messages" on "storage"."objects" for insert to "authenticated" with check (((bucket_id = 'prysm-voice-messages'::text) AND ((storage.foldername(name))[2] = (( SELECT auth.uid() AS uid))::text) AND (EXISTS ( SELECT 1
   FROM forum_topics ft
  WHERE ((ft.id)::text = (storage.foldername(objects.name))[1])))));
create policy "Members delete own story media" on "storage"."objects" for delete to "authenticated" using (((bucket_id = 'prysm-stories'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)));
create policy "Members upload story media to own folder" on "storage"."objects" for insert to "authenticated" with check (((bucket_id = 'prysm-stories'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)));
create policy "Moderators delete PRYSM badge PNGs" on "storage"."objects" for delete to "authenticated" using (((bucket_id = 'prysm-badges'::text) AND ( SELECT private.is_moderator() AS is_moderator)));
create policy "Moderators update PRYSM badge PNGs" on "storage"."objects" for update to "authenticated" using (((bucket_id = 'prysm-badges'::text) AND ( SELECT private.is_moderator() AS is_moderator))) with check (((bucket_id = 'prysm-badges'::text) AND ( SELECT private.is_moderator() AS is_moderator)));
create policy "Moderators upload PRYSM badge PNGs" on "storage"."objects" for insert to "authenticated" with check (((bucket_id = 'prysm-badges'::text) AND ( SELECT private.is_moderator() AS is_moderator)));
create policy "Owners can remove their forum voice messages" on "storage"."objects" for delete to "authenticated" using (((bucket_id = 'prysm-voice-messages'::text) AND ((storage.foldername(name))[2] = (( SELECT auth.uid() AS uid))::text) AND (EXISTS ( SELECT 1
   FROM forum_topics ft
  WHERE ((ft.id)::text = (storage.foldername(objects.name))[1])))));
create policy "Owners can remove their voice message uploads" on "storage"."objects" for delete to "authenticated" using (((bucket_id = 'prysm-voice-messages'::text) AND ((storage.foldername(name))[2] = (( SELECT auth.uid() AS uid))::text) AND (EXISTS ( SELECT 1
   FROM conversation_members cm
  WHERE (((cm.conversation_id)::text = (storage.foldername(objects.name))[1]) AND (cm.user_id = ( SELECT auth.uid() AS uid)))))));
create policy "PRYSM badge PNGs are public" on "storage"."objects" for select to public using ((bucket_id = 'prysm-badges'::text));
create policy "Public can listen to PRYSM ambient audio" on "storage"."objects" for select to "anon", "authenticated" using ((bucket_id = 'prysm-audio'::text));
create policy "avatar deletes" on "storage"."objects" for delete to "authenticated" using (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)));
create policy "avatar updates" on "storage"."objects" for update to "authenticated" using (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text))) with check (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)));
create policy "avatar uploads" on "storage"."objects" for insert to "authenticated" with check (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)));
create policy "sticker deletes own folder" on "storage"."objects" for delete to "authenticated" using (((bucket_id = 'stickers'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)));
create policy "sticker objects public read" on "storage"."objects" for select to "anon", "authenticated" using ((bucket_id = 'stickers'::text));
create policy "sticker uploads own folder" on "storage"."objects" for insert to "authenticated" with check (((bucket_id = 'stickers'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)));
commit;
