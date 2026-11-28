'use strict';
/**
 * End-to-end tests for the Coding Arena: matchmaking, hidden tests, server-side
 * scoring, single payout, ratings, leaderboards and authorization.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kidscode-duel-'));
process.env.KIDSCODE_DB_PATH = path.join(tmpDir, 'duel.db');
process.env.JWT_SECRET = 'duel-test-secret';
process.env.AI_PROVIDER = 'offline';
require.cache[require.resolve('sqlite3')] = { id: 'sqlite3', filename: 'sqlite3', loaded: true, exports: require('./sqlite3-shim') };

const app = require('../server');
const { initializeDatabase, getDb } = require('../database');

let server;
let base;
const dbGet = (sql, params = []) => new Promise((res, rej) => getDb().get(sql, params, (e, r) => (e ? rej(e) : res(r))));

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

async function child(username) {
  const r = await http('POST', '/api/register', { username, email: `${username}@example.com`, password: 'secret123', age: 14 });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  return { id: r.body.user.id, token: r.body.token, xp: r.body.user.xp || 0 };
}

async function befriend(a, b) {
  const sent = await http('POST', '/api/social/friends/request', { friendId: b.id }, a.token);
  assert.equal(sent.status, 200, JSON.stringify(sent.body));
  const requests = (await http('GET', '/api/social/friends/requests', null, b.token)).body.requests;
  const pending = requests.find((r) => r.from.id === a.id);
  assert.ok(pending, 'the friend request is visible to its recipient');
  const accepted = await http('POST', `/api/social/friends/accept/${pending.id}`, null, b.token);
  assert.equal(accepted.status, 200, JSON.stringify(accepted.body));
}

const SOLUTIONS = {
  'Add them up!': 'function solve(numbers) { return numbers.reduce((a, b) => a + b, 0); }',
  'Double it!': 'function solve(n) { return n * 2; }',
};

test.before(async () => {
  await initializeDatabase();
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => {
  server.close();
  try { fs.rmSync(tmpDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { /* ignore */ }
});

test('1v1 code race: matching, hidden tests, score, rewards and history', async () => {
  const a = await child('arena_asha');
  const b = await child('arena_brahim');
  const outsider = await child('arena outsider'.replace(' ', '_'));

  assert.equal((await http('POST', '/api/duels/queue', { mode: 'code_race', difficulty: 'easy' })).status, 401, 'guests cannot queue');
  const first = await http('POST', '/api/duels/queue', { mode: 'code_race', difficulty: 'easy' }, a.token);
  assert.equal(first.status, 202, JSON.stringify(first.body));
  assert.equal(first.body.status, 'waiting');
  const id = first.body.matchId;
  assert.equal((await http('POST', '/api/duels/queue', { mode: 'code_race', difficulty: 'easy' }, a.token)).status, 409, 'one live duel per child');
  assert.equal((await http('GET', `/api/duels/${id}/challenge`, null, a.token)).status, 409, 'no challenge before an opponent joins');

  const second = await http('POST', '/api/duels/queue', { mode: 'code_race', difficulty: 'easy' }, b.token);
  assert.equal(second.status, 200, JSON.stringify(second.body));
  assert.equal(second.body.matchId, id);
  assert.equal(second.body.status, 'active');
  assert.equal((await http('GET', `/api/duels/${id}`, null, outsider.token)).status, 403, 'other children cannot read the duel');

  const ca = (await http('GET', `/api/duels/${id}/challenge`, null, a.token)).body.challenge;
  const cb = (await http('GET', `/api/duels/${id}/challenge`, null, b.token)).body.challenge;
  assert.deepEqual(ca, cb, 'both players get the same challenge');
  assert.equal(ca.hidden, undefined, 'hidden tests are never sent to the browser');
  assert.equal(ca.nonce, undefined, 'the result nonce is never sent to the browser');
  assert.equal(ca.questions, undefined, 'code challenges have no answer key');

  const right = await http('POST', `/api/duels/${id}/submit`, { code: SOLUTIONS[ca.title], final: true }, a.token);
  assert.equal(right.status, 200, JSON.stringify(right.body));
  assert.equal(right.body.verdict.passed, true, JSON.stringify(right.body.verdict) + ' for ' + ca.title);
  assert.ok(right.body.score >= 80, JSON.stringify(right.body.breakdown));
  assert.equal(right.body.match.opponent.score, null, 'opponent score stays hidden until the match ends');
  assert.equal((await http('POST', `/api/duels/${id}/submit`, { code: SOLUTIONS[ca.title] }, a.token)).status, 409, 'no second final answer');

  const wrong = await http('POST', `/api/duels/${id}/submit`, { code: 'function solve() { return -999; }', final: true }, b.token);
  assert.equal(wrong.status, 200, JSON.stringify(wrong.body));
  assert.equal(wrong.body.match.result, 'lost');
  assert.equal(wrong.body.match.you.score < right.body.score, true);
  assert.equal(wrong.body.match.opponent.score, right.body.score);
  assert.equal(wrong.body.match.payout.xp > 0, true);

  const payouts = (await getDb()).all
    ? await new Promise((res) => getDb().all('SELECT * FROM duel_payouts WHERE match_id = ?', [id], (e, r) => res(r)))
    : [];
  assert.equal(payouts.length, 2, 'exactly one payout per player');
  const aAfter = await dbGet('SELECT xp FROM users WHERE id = ?', [a.id]);
  assert.ok(aAfter.xp > a.xp, 'XP is persisted on the user');

  const history = (await http('GET', '/api/duels/history', null, a.token)).body.history;
  assert.equal(history[0].result, 'won');
  assert.equal(history[0].mode, 'code_race');
  const board = (await http('GET', '/api/duels/leaderboard', null, a.token)).body.leaderboard;
  assert.ok(board.some((p) => p.id === a.id && p.wins === 1));
  const weekBoard = (await http('GET', '/api/duels/leaderboard?period=week', null, a.token)).body.leaderboard;
  assert.ok(weekBoard.some((p) => p.id === a.id && p.periodXp > 0), 'weekly board ranks duel XP');
  const profile = (await http('GET', '/api/duels/profile', null, a.token)).body;
  assert.equal(profile.wins, 1);
  assert.equal(profile.rankName, 'Code Explorer');
  assert.ok(profile.achievements.find((x) => x.id === 101).unlocked, 'First Victory unlocked');
});

test('code quiz keeps answers on the server and validates attempt limits', async () => {
  const a = await child('arena_quiz_a');
  const b = await child('arena_quiz_b');
  const q1 = await http('POST', '/api/duels/queue', { mode: 'code_quiz', difficulty: 'medium' }, a.token);
  const q2 = await http('POST', '/api/duels/queue', { mode: 'code_quiz', difficulty: 'medium' }, b.token);
  assert.equal(q2.body.matchId, q1.body.matchId);
  const id = q1.body.matchId;
  const challenge = (await http('GET', `/api/duels/${id}/challenge`, null, a.token)).body.challenge;
  assert.equal(challenge.questions.length, 5);
  assert.equal(challenge.questions[0].answer, undefined, 'no answer is leaked');
  assert.equal((await http('POST', `/api/duels/${id}/submit`, { answers: [0, 0] }, a.token)).status, 422);

  const stored = await dbGet('SELECT challenge_json FROM duel_matches WHERE id = ?', [id]);
  const answers = JSON.parse(stored.challenge_json).questions.map((q) => q.answer);
  const perfect = await http('POST', `/api/duels/${id}/submit`, { answers, final: true }, a.token);
  assert.equal(perfect.body.score, 100, JSON.stringify(perfect.body.breakdown));
  const bad = await http('POST', `/api/duels/${id}/submit`, { answers: answers.map((x) => (x + 1) % 4), final: true }, b.token);
  assert.ok(bad.body.score < 30);
  const profile = (await http('GET', '/api/duels/profile', null, a.token)).body;
  assert.ok(profile.achievements.find((x) => x.id === 104).unlocked, 'Logic Master unlocked');
});

test('code maze and bug busters run real programs through the sandbox', async () => {
  const mazeSolutions = {
    'Treasure on the straight!': 'forward(3);',
    'Turn to the treasure': 'forward(2); right(90); forward(2); right(90); forward(2); right(90); forward(2);',
    'Windy robot trail': 'right(90); forward(2); left(90); forward(2); left(90); forward(2); right(90); forward(2); right(90); forward(4);',
  };
  const bugSolutions = {
    'The greedy robot': 'function solve(n) { return n + 1; }',
    'Shout, not whisper': 'function solve(text) { return text.toUpperCase(); }',
    'Even or odd': 'function solve(n) { return n % 2 === 0 ? "even" : "odd"; }',
    'Safe subtraction': 'function solve(a, b) { return Math.abs(a - b); }',
    'Broken countdown': 'function solve(n) { const out = []; for (let i = n; i >= 1; i--) out.push(i); return out; }',
  };
  for (const [mode, difficulty, solutions] of [
    ['code_maze', 'easy', mazeSolutions], ['bug_busters', 'medium', bugSolutions],
  ]) {
    const a = await child(`arena_${mode}_a`);
    const b = await child(`arena_${mode}_b`);
    const q1 = await http('POST', '/api/duels/queue', { mode, difficulty }, a.token);
    await http('POST', '/api/duels/queue', { mode, difficulty }, b.token);
    const id = q1.body.matchId;
    const challenge = (await http('GET', `/api/duels/${id}/challenge`, null, a.token)).body.challenge;
    const r = await http('POST', `/api/duels/${id}/submit`, { code: solutions[challenge.title], final: true }, a.token);
    assert.equal(r.body.verdict.passed, true, `${mode}: ${JSON.stringify(r.body.verdict)} for ${challenge.title}`);
    assert.ok(r.body.score >= 80, `${mode}: ${JSON.stringify(r.body.breakdown)}`);
  }
});

test('abandonment ends the match and the forfeit earns no reward', async () => {
  const a = await child('arena_leave_a');
  const b = await child('arena_leave_b');
  const q1 = await http('POST', '/api/duels/queue', { mode: 'bug_busters', difficulty: 'easy' }, a.token);
  await http('POST', '/api/duels/queue', { mode: 'bug_busters', difficulty: 'easy' }, b.token);
  const id = q1.body.matchId;
  const left = await http('POST', `/api/duels/${id}/leave`, null, b.token);
  assert.equal(left.status, 200, JSON.stringify(left.body));
  const final = (await http('GET', `/api/duels/${id}`, null, a.token)).body.match;
  assert.equal(final.status, 'finished');
  assert.equal(final.result, 'won');
  const payout = await dbGet('SELECT * FROM duel_payouts WHERE match_id = ? AND user_id = ?', [id, b.id]);
  assert.equal(payout, undefined, 'the quitter gets no payout');
});

test('SSE pushes matchmaking events to a subscribed child', async () => {
  const a = await child('arena_sse_a');
  const b = await child('arena_sse_b');
  const queued = await http('POST', '/api/duels/queue', { mode: 'code_race', difficulty: 'easy' }, a.token);
  const id = queued.body.matchId;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${base}/api/duels/${id}/events`, {
      headers: { authorization: `Bearer ${a.token}`, accept: 'text/event-stream' }, signal: controller.signal,
    });
    assert.equal(res.status, 200);
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    const readUntil = async (needle) => {
      while (!buffer.includes(needle)) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
      }
    };
    const joined = http('POST', '/api/duels/queue', { mode: 'code_race', difficulty: 'easy' }, b.token);
    await readUntil('"kind":"joined"');
    assert.ok(buffer.includes('event: duel'), 'the browser receives a duel event');
    assert.equal((await joined).body.matchId, id);
    const stored = await dbGet(
      'SELECT COUNT(*) AS n FROM duel_events WHERE match_id = ? AND payload_json LIKE ?', [id, '%joined%'],
    );
    assert.ok(stored.n >= 1, 'events are persisted for subscribers on other instances');
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
});

test('graded submissions hide hidden tests and resist sandbox tampering', async () => {
  const a = await child('arena_secret_a');
  const b = await child('arena_secret_b');
  const queued = await http('POST', '/api/duels/queue', { mode: 'code_race', difficulty: 'easy' }, a.token);
  const id = queued.body.matchId;
  await http('POST', '/api/duels/queue', { mode: 'code_race', difficulty: 'easy' }, b.token);
  await http('GET', `/api/duels/${id}/challenge`, null, a.token);

  const leaking = await http('POST', `/api/duels/${id}/submit`, {
    code: "function solve(...args) { console.log('LEAKED_ARGS_' + JSON.stringify(args)); throw new Error('LEAKED_ERROR_' + JSON.stringify(args)); }",
    final: true,
  }, a.token);
  const leakedBody = JSON.stringify(leaking.body);
  assert.equal(leaking.body.verdict.passed, false);
  assert.ok(!leakedBody.includes('LEAKED_ARGS_'), 'learner stdout is not returned');
  assert.ok(!leakedBody.includes('LEAKED_ERROR_'), 'error messages containing hidden values are not returned');

  const again = await child('arena_secret_c');
  const queued2 = await http('POST', '/api/duels/queue', { mode: 'code_race', difficulty: 'easy' }, again.token);
  const id2 = queued2.body.matchId;
  const opponent = await child('arena_secret_d');
  await http('POST', '/api/duels/queue', { mode: 'code_race', difficulty: 'easy' }, opponent.token);
  await http('GET', `/api/duels/${id2}/challenge`, null, again.token);

  const cheated = await http('POST', `/api/duels/${id2}/submit`, {
    code: "function solve() { try { JSON.stringify = (v) => Array.isArray(v) ? '[' + v.map(() => 'true').join(',') + ']' : String(v); } catch {} return -999; }",
    final: true,
  }, again.token);
  assert.equal(cheated.body.verdict.passed, false, 'the frozen serializer cannot be forged');
});

test('arena mutations are serialized under concurrent queue requests', async () => {
  const a = await child('arena_race_a');
  const b = await child('arena_race_b');
  const c = await child('arena_race_c');
  const [first, second] = await Promise.all([
    http('POST', '/api/duels/queue', { mode: 'code_race', difficulty: 'easy' }, a.token),
    http('POST', '/api/duels/queue', { mode: 'code_race', difficulty: 'easy' }, a.token),
  ]);
  assert.deepEqual([first.status, second.status].sort(), [202, 409], 'one child cannot enter two live matches');
  const mine = first.status === 202 ? first : second;

  const [joined, created] = await Promise.all([
    http('POST', '/api/duels/queue', { mode: 'code_race', difficulty: 'easy' }, b.token),
    http('POST', '/api/duels/queue', { mode: 'code_race', difficulty: 'easy' }, c.token),
  ]);
  assert.deepEqual([joined.status, created.status].sort(), [200, 202], 'only one child joins the waiting duel');
  const accepted = joined.status === 200 ? joined : created;
  assert.equal(accepted.body.matchId, mine.body.matchId, 'the joiner reaches the original match');
  const extra = created.status === 202 ? created : joined;
  await http('POST', `/api/duels/${extra.body.matchId}/leave`, null, c.token);
});

test('private friend duel rejects strangers and quick matchmaking cannot steal the invite', async () => {
  const a = await child('arena_friend_a');
  const b = await child('arena_friend_b');
  const outsider = await child('arena_friend_out');

  const stranger = await http('POST', '/api/duels/invites', { friendId: outsider.id, mode: 'code_race', difficulty: 'easy' }, a.token);
  assert.equal(stranger.status, 403, 'only accepted friends can be invited');
  const malformed = await http('POST', '/api/duels/invites', { friendId: 'nope', mode: 'code_race', difficulty: 'easy' }, a.token);
  assert.equal(malformed.status, 400, 'friendId must be an integer');

  await befriend(a, b);
  const invited = await http('POST', '/api/duels/invites', { friendId: b.id, mode: 'code_race', difficulty: 'easy' }, a.token);
  assert.equal(invited.status, 202, JSON.stringify(invited.body));
  assert.equal(invited.body.match.format, 'friend');
  assert.equal(invited.body.match.opponent.id, b.id, 'the invitee is visible to the inviter');
  assert.equal((await http('POST', '/api/duels/invites', { friendId: b.id, mode: 'code_race', difficulty: 'easy' }, a.token)).status, 409, 'one live duel per child');

  const inbox = (await http('GET', '/api/duels/invites', null, b.token)).body.invites;
  assert.equal(inbox.length, 1);
  assert.equal(inbox[0].id, invited.body.matchId);
  assert.equal(inbox[0].from.name, 'arena_friend_a');
  assert.equal((await http('POST', `/api/duels/${invited.body.matchId}/accept`, null, outsider.token)).status, 403, 'a stranger cannot accept');

  const quick = await http('POST', '/api/duels/queue', { mode: 'code_race', difficulty: 'easy' }, outsider.token);
  assert.equal(quick.status, 202);
  assert.notEqual(quick.body.matchId, invited.body.matchId, 'quick matching skips friend invites');
  await http('POST', `/api/duels/${quick.body.matchId}/leave`, null, outsider.token);
});

test('friend duel accepts, scores, awards Team Player and can be declined on rematch', async () => {
  const a = await child('arena_team_a');
  const b = await child('arena_team_b');
  await befriend(a, b);

  const invited = await http('POST', '/api/duels/invites', { friendId: b.id, mode: 'code_race', difficulty: 'easy' }, a.token);
  const id = invited.body.matchId;
  const accepted = await http('POST', `/api/duels/${id}/accept`, null, b.token);
  assert.equal(accepted.status, 200, JSON.stringify(accepted.body));
  assert.equal(accepted.body.match.status, 'active');
  assert.equal((await http('GET', '/api/duels/invites', null, b.token)).body.invites.length, 0, 'accepted invites leave the inbox');

  const challenge = (await http('GET', `/api/duels/${id}/challenge`, null, a.token)).body.challenge;
  const right = await http('POST', `/api/duels/${id}/submit`, { code: SOLUTIONS[challenge.title], final: true }, a.token);
  assert.equal(right.body.verdict.passed, true, JSON.stringify(right.body.verdict) + ' for ' + challenge.title);
  const wrong = await http('POST', `/api/duels/${id}/submit`, { code: 'function solve() { return -999; }', final: true }, b.token);
  assert.equal(wrong.body.match.result, 'lost');

  const profile = (await http('GET', '/api/duels/profile', null, a.token)).body;
  assert.ok(profile.achievements.find((x) => x.id === 108).unlocked, 'Team Player unlocks for a friend win');
  const payout = await dbGet('SELECT * FROM duel_payouts WHERE match_id = ? AND user_id = ?', [id, a.id]);
  assert.ok(payout.xp > 0, 'the winner is paid exactly once');

  const rematch = await http('POST', '/api/duels/invites', { friendId: b.id, mode: 'code_race', difficulty: 'easy' }, a.token);
  assert.equal(rematch.status, 202);
  const declined = await http('POST', `/api/duels/${rematch.body.matchId}/decline`, null, b.token);
  assert.equal(declined.status, 200, JSON.stringify(declined.body));
  assert.equal(declined.body.status, 'cancelled');
  assert.equal((await http('GET', `/api/duels/${rematch.body.matchId}`, null, a.token)).body.match.status, 'cancelled');
  const noReward = await dbGet('SELECT * FROM duel_payouts WHERE match_id = ?', [rematch.body.matchId]);
  assert.equal(noReward, undefined, 'a declined invite pays nobody');
});

test('badge catalogue describes friend wins and marks future badges as coming soon', async () => {
  const { token } = await child('arena_badge_catalogue');
  const res = await http('GET', '/api/duels/modes', null, token);
  assert.equal(res.status, 200, JSON.stringify(res.body));
  const badges = new Map(res.body.achievements.map((b) => [b.id, b]));
  assert.match(badges.get(105).description, /coming soon/i, 'AI referee badge is not presented as playable');
  assert.match(badges.get(108).description, /friend/i, 'Team Player description matches how it is earned');
  assert.match(badges.get(110).description, /coming soon/i, 'tournament badge is not presented as playable');
});
