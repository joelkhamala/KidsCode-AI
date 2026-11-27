'use strict';
/**
 * Adult friends & study circle: end-to-end tests against the real Express app
 * with a temporary SQLite database. Run: node --test tests/adult-friends.test.js
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kidscode-adult-friends-'));
process.env.KIDSCODE_DB_PATH = path.join(tmpDir, 'test.db');
process.env.JWT_SECRET = 'adult-friends-test-secret';
process.env.AI_PROVIDER = 'offline';
require.cache[require.resolve('sqlite3')] = { id: 'sqlite3', filename: 'sqlite3', loaded: true, exports: require('./sqlite3-shim') };

const app = require('../server');
const { initializeDatabase, getDb } = require('../database');

let server;
let base;

async function http(method, url, body, token) {
  const res = await fetch(base + url, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: res.status, body: json };
}

const dbRun = (sql, p = []) => new Promise((resolve, reject) =>
  getDb().run(sql, p, function done(e) { if (e) reject(e); else resolve(this); }));

async function adult(email, first, last) {
  const r = await http('POST', '/api/adult/register', {
    email, password: 'secret123', firstName: first, lastName: last,
    occupation: 'Developer', learningGoals: 'Build web apps',
  });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  return r.body;
}

let a;
let b;
let c;
let childToken;

test.before(async () => {
  await initializeDatabase();
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;

  [a, b, c] = await Promise.all([
    adult('anne@example.com', 'Anne', 'Wanjiku'),
    adult('brian@example.com', 'Brian', 'Kamau'),
    adult('carol@example.com', 'Carol', 'Njeri'),
  ]);
  const kid = await http('POST', '/api/register', {
    username: 'friendkid', email: 'friendkid@example.com', password: 'secret123', age: 12,
    parent_email: 'parent@example.com',
  });
  assert.equal(kid.status, 200);
  childToken = kid.body.token;
});

test.after(() => {
  server.close();
  try { fs.rmSync(tmpDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { /* ignore */ }
});

test('adult friends routes reject child tokens and never return another adult’s email or phone', async () => {
  const denied = await http('GET', '/api/adult/friends/summary', null, childToken);
  assert.equal(denied.status, 403);

  const search = await http('GET', '/api/adult/friends/search?q=brian%40example.com', null, a.token);
  assert.equal(search.status, 200, JSON.stringify(search.body));
  assert.equal(search.body.users.length, 1);
  assert.equal(search.body.users[0].id, b.user.id);
  assert.equal(search.body.users[0].email, undefined);
  assert.equal(search.body.users[0].phoneNumber, undefined);
  assert.equal(search.body.users[0].accountType, undefined);

  const childSearch = await http('GET', '/api/adult/friends/search?q=friendkid', null, a.token);
  assert.equal(childSearch.body.users.length, 0);
});

test('friend requests, mutual friends and removal work end to end', async () => {
  const sent = await http('POST', '/api/adult/friends/requests', { toUserId: b.user.id, note: 'Let us study together' }, a.token);
  assert.equal(sent.status, 200, JSON.stringify(sent.body));
  assert.equal(sent.body.status, 'pending');

  const incoming = await http('GET', '/api/adult/friends/requests', null, b.token);
  assert.equal(incoming.body.incoming.length, 1);
  assert.equal(incoming.body.incoming[0].person.id, a.user.id);

  const accepted = await http('POST', `/api/adult/friends/requests/${incoming.body.incoming[0].id}/accept`, {}, b.token);
  assert.equal(accepted.status, 200);
  const friends = await http('GET', '/api/adult/friends/friends', null, a.token);
  assert.equal(friends.body.friends.length, 1);
  assert.equal(friends.body.friends[0].id, b.user.id);

  // Carol friends both Anne and Brian, so Anne sees Brian as a mutual friend.
  const reqToA = await http('POST', '/api/adult/friends/requests', { toUserId: a.user.id }, c.token);
  assert.equal(reqToA.status, 200);
  const reqToB = await http('POST', '/api/adult/friends/requests', { toUserId: b.user.id }, c.token);
  assert.equal(reqToB.status, 200);
  const forB = await http('GET', '/api/adult/friends/requests', null, b.token);
  const carolRequest = forB.body.incoming.find((r) => r.person.id === c.user.id);
  await http('POST', `/api/adult/friends/requests/${carolRequest.id}/accept`, {}, b.token);
  const forA = await http('GET', '/api/adult/friends/requests', null, a.token);
  const carolToA = forA.body.incoming.find((r) => r.person.id === c.user.id);
  await http('POST', `/api/adult/friends/requests/${carolToA.id}/accept`, {}, a.token);
  const anneFriends = await http('GET', '/api/adult/friends/friends', null, a.token);
  const carol = anneFriends.body.friends.find((f) => f.id === c.user.id);
  assert.ok(carol);
  assert.equal(carol.mutual, 1);

  const removed = await http('DELETE', `/api/adult/friends/${b.user.id}`, null, a.token);
  assert.equal(removed.status, 200);
  const after = await http('GET', '/api/adult/friends/friends', null, a.token);
  assert.equal(after.body.friends.some((f) => f.id === b.user.id), false);

  // Re-add for the remaining tests.
  const again = await http('POST', '/api/adult/friends/requests', { toUserId: b.user.id }, a.token);
  assert.equal(again.status, 200);
  const bIncoming = await http('GET', '/api/adult/friends/requests', null, b.token);
  const fromA = bIncoming.body.incoming.find((r) => r.person.id === a.user.id);
  assert.ok(fromA);
  await http('POST', `/api/adult/friends/requests/${fromA.id}/accept`, {}, b.token);
});

test('privacy hides progress, activity and discoverability', async () => {
  const privacy = await http('PUT', '/api/adult/friends/privacy', {
    allowSearch: true, showProgress: false, showActivity: false, allowMessages: true,
  }, b.token);
  assert.equal(privacy.status, 200);

  const profile = await http('GET', `/api/adult/friends/${b.user.id}`, null, a.token);
  assert.equal(profile.status, 200);
  assert.equal(profile.body.person.stats, null);
  assert.equal(profile.body.recentActivity.length, 0);

  const board = await http('GET', '/api/adult/friends/leaderboard?metric=lessons', null, a.token);
  assert.equal(board.body.board.some((p) => p.id === b.user.id), false);

  const hidden = await http('PUT', '/api/adult/friends/privacy', { allowSearch: false }, b.token);
  assert.equal(hidden.status, 200);
  const search = await http('GET', '/api/adult/friends/search?q=brian', null, a.token);
  assert.equal(search.body.users.some((u) => u.id === b.user.id), false);

  await http('PUT', '/api/adult/friends/privacy', {
    allowSearch: true, showProgress: true, showActivity: true, allowMessages: true,
  }, b.token);
});

test('study activity is derived from real records, goals and cheers', async () => {
  const lesson = await new Promise((resolve, reject) =>
    getDb().get("SELECT id, title FROM lessons WHERE title LIKE 'What is Code%' LIMIT 1", (e, r) => (e ? reject(e) : resolve(r))));
  await dbRun('INSERT OR IGNORE INTO progress (user_id, module_id, lesson_id, completed, score) VALUES (?, 1, ?, 1, 90)', [a.user.id, lesson.id]);
  await dbRun(
    'INSERT INTO assessment_results (user_id, lesson_id, assessment_type, score, max_score, percentage, passed) VALUES (?, ?, ?, 90, 100, 90, 1)',
    [a.user.id, lesson.id, 'written'],
  );
  await dbRun('INSERT INTO learning_hours_log (user_id, session_start, duration_minutes, activity_type) VALUES (?, datetime(\'now\'), 45, \'lesson\')', [a.user.id]);

  const goal = await http('PUT', '/api/adult/friends/goals', { title: 'Finish JavaScript basics', targetMinutes: 300 }, a.token);
  assert.equal(goal.status, 200);
  const checkin = await http('POST', '/api/adult/friends/checkins', { note: 'Practised loops' }, a.token);
  assert.equal(checkin.status, 200);
  assert.ok(checkin.body.minutes >= 45);

  const goals = await http('GET', '/api/adult/friends/goals', null, a.token);
  assert.equal(goals.body.mine.title, 'Finish JavaScript basics');
  assert.ok(goals.body.mine.minutesLogged >= 45);

  const board = await http('GET', '/api/adult/friends/leaderboard?metric=hours&period=week', null, a.token);
  assert.equal(board.status, 200);
  assert.ok(board.body.board.find((p) => p.id === a.user.id).value >= 0.7);

  const feed = await http('GET', '/api/adult/friends/feed?limit=30', null, a.token);
  assert.ok(feed.body.feed.some((e) => e.type === 'lesson'));
  assert.ok(feed.body.feed.some((e) => e.type === 'checkin'));

  const cheer = await http('POST', '/api/adult/friends/cheers', { toUserId: b.user.id, kind: 'star' }, a.token);
  assert.equal(cheer.status, 200);
  const inbox = await http('GET', '/api/adult/friends/notifications', null, b.token);
  assert.ok(inbox.body.notifications.some((n) => n.type === 'cheer'));
});

test('messages enforce friendship, track unread and support deletion', async () => {
  const sent = await http('POST', '/api/adult/friends/messages', { toUserId: a.user.id, body: 'Are you free to study?' }, b.token);
  assert.equal(sent.status, 200, JSON.stringify(sent.body));

  const summary = await http('GET', '/api/adult/friends/summary', null, a.token);
  assert.ok(summary.body.unreadMessages >= 1);

  const conv = await http('GET', '/api/adult/friends/conversations', null, a.token);
  const thread = conv.body.conversations.find((x) => x.friend.id === b.user.id);
  assert.ok(thread);
  assert.ok(thread.unread >= 1);

  const messages = await http('GET', `/api/adult/friends/messages/${b.user.id}`, null, a.token);
  assert.equal(messages.status, 200);
  assert.equal(messages.body.messages[0].body, 'Are you free to study?');

  await http('POST', `/api/adult/friends/messages/${b.user.id}/read`, {}, a.token);
  const afterRead = await http('GET', '/api/adult/friends/summary', null, a.token);
  assert.equal(afterRead.body.unreadMessages, 0);

  const deleted = await http('DELETE', `/api/adult/friends/messages/${sent.body.message.id}`, null, b.token);
  assert.equal(deleted.status, 200);

  const stranger = await http('POST', '/api/adult/friends/messages', { toUserId: c.user.id, body: 'Hello' }, a.token);
  assert.equal(stranger.status, 200); // Anne and Carol are friends from the mutual request.
  const nonFriend = await http('POST', '/api/adult/friends/messages', { toUserId: a.user.id, body: 'Hello' }, childToken);
  assert.equal(nonFriend.status, 403);
});

test('blocking removes the friendship and reporting can block in one step', async () => {
  const blocked = await http('POST', '/api/adult/friends/block', { userId: b.user.id, reason: 'taking a break' }, a.token);
  assert.equal(blocked.status, 200);

  const search = await http('GET', '/api/adult/friends/search?q=brian', null, a.token);
  assert.equal(search.body.users.some((u) => u.id === b.user.id), false);

  const message = await http('POST', '/api/adult/friends/messages', { toUserId: a.user.id, body: 'Hello' }, b.token);
  assert.equal(message.status, 403);

  const unblocked = await http('DELETE', `/api/adult/friends/block/${b.user.id}`, null, a.token);
  assert.equal(unblocked.status, 200);
  const stillNotFriends = await http('POST', '/api/adult/friends/messages', { toUserId: a.user.id, body: 'Hello again' }, b.token);
  assert.equal(stillNotFriends.status, 403);

  const report = await http('POST', '/api/adult/friends/report', {
    userId: c.user.id, reason: 'spam', details: 'Too many requests', block: true,
  }, a.token);
  assert.equal(report.status, 200);
  const blockedList = await http('GET', '/api/adult/friends/blocked', null, a.token);
  assert.ok(blockedList.body.blocked.some((u) => u.id === c.user.id));
});
