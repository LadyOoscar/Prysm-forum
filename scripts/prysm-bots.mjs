#!/usr/bin/env node

/**
 * PRYSM integration bot harness.
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.
 * Never store the service-role key in the repository.
 */
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(2);
}

const count = Math.min(Math.max(Number(process.env.PRYSM_BOT_COUNT || 4), 2), 8);
const password = process.env.PRYSM_BOT_PASSWORD || 'PRYSM-Bot-Test-2026!x9';
const created = [];
const failures = [];
const bots = [];

async function api(path, options = {}) {
  const method = options.method || 'GET';
  const token = options.token || SUPABASE_SERVICE_ROLE_KEY;
  const body = options.body;
  const res = await fetch(SUPABASE_URL + '/' + path, {
    method,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) throw new Error(method + ' ' + path + ' -> ' + res.status + ': ' + text);
  return data;
}

function mark(name, ok, detail) {
  console.log((ok ? 'PASS  ' : 'FAIL  ') + name + (detail ? '  ' + detail : ''));
  if (!ok) failures.push(name + (detail ? ': ' + detail : ''));
}

async function rest(table, body, token, query) {
  return api('rest/v1/' + table + (query || ''), {
    method: 'POST',
    token,
    body
  });
}

async function run() {
  console.log('PRYSM bot test starting with ' + count + ' isolated BOT_TEST_* accounts');

  const categories = await api('rest/v1/forum_categories?select=id,slug&slug=eq.general&limit=1');
  if (!categories || !categories[0]) throw new Error('General forum category not found.');
  const categoryId = categories[0].id;

  for (let i = 1; i <= count; i++) {
    const username = 'BOT_TEST_' + String(i).padStart(2, '0');
    const email = username.toLowerCase() + '+prysm-test@example.invalid';
    const user = await api('auth/v1/admin/users', {
      method: 'POST',
      body: {
        email,
        password,
        email_confirm: true,
        user_metadata: { username, display_name: username }
      }
    });
    created.push(user.id);

    const login = await api('auth/v1/token?grant_type=password', {
      method: 'POST',
      body: { email, password }
    });
    bots.push({ id: user.id, username, email, token: login.access_token });
    mark('Auth account ' + username, true);
  }

  for (const bot of bots) {
    const profiles = await api(
      'rest/v1/profiles?select=id,username&username=eq.' + encodeURIComponent(bot.username) + '&limit=1',
      { token: bot.token }
    );
    mark('Profile trigger ' + bot.username, !!profiles && profiles[0] && profiles[0].id === bot.id);
  }

  const topics = [];
  for (let i = 0; i < bots.length; i++) {
    const bot = bots[i];
    const result = await api('rest/v1/rpc/create_topic_with_first_post', {
      method: 'POST',
      token: bot.token,
      body: {
        p_category_id: categoryId,
        p_title: 'BOT_TEST débat ' + (i + 1) + ' ' + Date.now(),
        p_body: 'BOT_TEST message initial ' + (i + 1) + ': scénario d’intégration PRYSM.'
      }
    });
    const topicId = typeof result === 'string' ? result : result && result[0];
    if (!topicId) throw new Error('Topic RPC returned no topic id.');
    topics.push(topicId);
    mark('Topic creation RPC ' + bot.username, true);

    const replyBot = bots[(i + 1) % bots.length];
    await rest('forum_posts', {
      topic_id: topicId,
      author_id: replyBot.id,
      body: 'BOT_TEST réponse de ' + replyBot.username + ' au sujet ' + topicId + '.'
    }, replyBot.token);
    mark('Forum reply ' + replyBot.username, true);
  }

  const postFilter = '?select=id,topic_id,author_id&topic_id=in.(' + topics.join(',') + ')&limit=100';
  const posts = await api('rest/v1/forum_posts' + postFilter);
  if (!posts || !posts.length) throw new Error('No test posts found.');

  for (let i = 0; i < Math.min(posts.length, bots.length); i++) {
    const post = posts[i];
    const bot = bots[i % bots.length];
    if (bot.id === post.author_id) continue;

    await rest('forum_reactions', {
      post_id: post.id,
      user_id: bot.id,
      reaction: i % 2 ? 'support' : 'laugh'
    }, bot.token);
    mark('Reaction by ' + bot.username, true);

    await rest('forum_votes', {
      post_id: post.id,
      user_id: bot.id,
      value: i % 2 ? -1 : 1
    }, bot.token);
    mark('Vote by ' + bot.username, true);
  }

  for (let i = 0; i < bots.length - 1; i++) {
    const a = bots[i];
    const b = bots[i + 1];

    await rest('profiles', {
      dating_enabled: true,
      age: 25 + i,
      location: 'BOT_TEST',
      identity: 'BOT_TEST',
      orientation: 'BOT_TEST',
      looking_for: 'BOT_TEST'
    }, a.token, '?id=eq.' + a.id);

    await rest('profiles', {
      dating_enabled: true,
      age: 26 + i,
      location: 'BOT_TEST',
      identity: 'BOT_TEST',
      orientation: 'BOT_TEST',
      looking_for: 'BOT_TEST'
    }, b.token, '?id=eq.' + b.id);

    await rest('dating_likes', { liker_id: a.id, liked_id: b.id }, a.token);
    await rest('dating_likes', { liker_id: b.id, liked_id: a.id }, b.token);
    mark('Mutual dating like ' + a.username + ' <-> ' + b.username, true);
  }

  const matches = await api('rest/v1/dating_matches?select=user_a,user_b&user_a=in.(' + created.join(',') + ')');
  mark('Dating match creation', !!matches && matches.length >= 1);

  const a = bots[0];
  const b = bots[1];
  const conversation = await rest('conversations', {
    created_by: a.id,
    direct_recipient_id: b.id
  }, a.token);
  const conversationId = conversation && conversation[0] && conversation[0].id;
  if (!conversationId) throw new Error('Conversation creation failed.');

  await rest('conversation_members', [
    { conversation_id: conversationId, user_id: a.id, role: 'member' },
    { conversation_id: conversationId, user_id: b.id, role: 'member' }
  ], a.token);

  await rest('messages', {
    conversation_id: conversationId,
    sender_id: a.id,
    body: 'BOT_TEST: message privé aller.'
  }, a.token);

  await rest('messages', {
    conversation_id: conversationId,
    sender_id: b.id,
    body: 'BOT_TEST: message privé retour.'
  }, b.token);
  mark('Private messaging round trip', true);

  await rest('user_blocks', { blocker_id: a.id, blocked_id: b.id }, a.token);
  mark('User block', true);

  const testPost = posts[0];
  const reporter = bots.find(function(x) { return x.id !== testPost.author_id; }) || a;
  await rest('forum_reports', {
    post_id: testPost.id,
    reporter_id: reporter.id,
    reason: 'other',
    details: 'BOT_TEST report for moderation-path verification.',
    status: 'open'
  }, reporter.token);
  mark('Forum report', true);

  let blocked = false;
  for (let i = 0; i < 6; i++) {
    try {
      await api('rest/v1/rpc/create_topic_with_first_post', {
        method: 'POST',
        token: a.token,
        body: {
          p_category_id: categoryId,
          p_title: 'BOT_TEST rate limit ' + i + ' ' + Date.now(),
          p_body: 'BOT_TEST anti-spam probe.'
        }
      });
    } catch (error) {
      if (String(error.message).includes('RATE_LIMIT_EXCEEDED')) blocked = true;
    }
  }
  mark('Topic anti-spam rate limit', blocked);

  console.log('\nTEST SUMMARY');
  console.log('Accounts created: ' + created.length);
  console.log('Failures: ' + failures.length);
  failures.forEach(function(f) { console.log('FAILURE: ' + f); });
  if (failures.length) process.exitCode = 1;
}

try {
  await run();
} catch (error) {
  console.error('HARNESS ERROR:', error.message);
  process.exitCode = 1;
} finally {
  for (let i = created.length - 1; i >= 0; i--) {
    const id = created[i];
    try {
      await api('auth/v1/admin/users/' + id, { method: 'DELETE' });
      console.log('CLEAN  BOT_TEST account ' + id);
    } catch (error) {
      console.error('CLEANUP ERROR ' + id + ': ' + error.message);
      process.exitCode = 1;
    }
  }
}
