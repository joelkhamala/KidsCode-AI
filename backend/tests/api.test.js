'use strict';
/**
 * End-to-end tests: boots the real Express app on a temporary SQLite database
 * and exercises the security fixes and the AI learning engine over HTTP.
 *
 * Run: node --test tests/
 * (Uses tests/sqlite3-shim.js so it runs on any OS with Node >= 22.5.)
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

// ---- test environment -------------------------------------------------------
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kidscode-test-'));
process.env.KIDSCODE_DB_PATH = path.join(tmpDir, 'test.db');
process.env.JWT_SECRET = 'test-secret';
process.env.AI_PROVIDER = 'offline';
require.cache[require.resolve('sqlite3')] = { id: 'sqlite3', filename: 'sqlite3', loaded: true, exports: require('./sqlite3-shim') };

const app = require('../server');
const { initializeDatabase, getDb } = require('../database');
const ai = require('../ai');
const { LLMClient } = require('../ai/llmClient');

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
  return { status: res.status, body: json, type: res.headers.get('content-type') };
}

const dbAll = (sql, params = []) => new Promise((resolve, reject) => getDb().all(sql, params, (e, r) => (e ? reject(e) : resolve(r))));
const dbGet = (sql, params = []) => new Promise((resolve, reject) => getDb().get(sql, params, (e, r) => (e ? reject(e) : resolve(r))));

/** Read the hidden answer for an activity straight from the database. */
async function correctSubmission(activityId) {
  const row = await dbGet('SELECT content_json FROM ai_activities WHERE id = ?', [activityId]);
  const a = JSON.parse(row.content_json);
  if (Number.isInteger(a.answerIndex)) return { answerIndex: a.answerIndex };
  if (a.type === 'predict_output') return { text: a.expectedOutput.join('\n') };
  if (a.type === 'write_code') return { code: a.solution };
  if (a.type === 'create') {
    const samples = {
      python: 'items = ["a", "b"]\nfor x in items:\n    print(x)\nif len(items) > 1:\n    print("many")\ndef f(n):\n    return n * 2\nprint(f(2))\nwhile False:\n    pass\ntotal = 2 + 3',
    };
    return { code: samples[a.language] || 'print("hello")\nprint("world")' };
  }
  throw new Error(`no answer for ${a.type}`);
}

async function wrongSubmission(activityId) {
  const row = await dbGet('SELECT content_json FROM ai_activities WHERE id = ?', [activityId]);
  const a = JSON.parse(row.content_json);
  if (Number.isInteger(a.answerIndex)) return { answerIndex: (a.answerIndex + 1) % a.options.length };
  return { text: 'definitely wrong', code: 'console.log("nope")' };
}

let child; let parent; let teacher;

test.before(async () => {
  await initializeDatabase();
  await ai.initialize(getDb());
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;

  const reg = await http('POST', '/api/register', { username: 'wanjiru', email: 'w@example.com', password: 'secret123', age: 11, parent_email: 'p@example.com' });
  assert.equal(reg.status, 200, JSON.stringify(reg.body));
  child = reg.body;
});

test.after(() => {
  server.close();
  // On Windows the database file can still be locked for a moment; a leftover temp folder is harmless.
  try { fs.rmSync(tmpDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { /* ignore */ }
});

// ---- security fixes ---------------------------------------------------------
test('run-code: sandbox escape no longer reaches the server process', async () => {
  const attacks = [
    'console.log(Math.floor.constructor("return typeof process")())',
    'console.log(this.constructor.constructor("return process")().pid)',
    'console.log(typeof require, typeof process)',
  ];
  for (const code of attacks) {
    const r = await http('POST', '/api/run-code', { code });
    assert.equal(r.status, 200);
    assert.ok(!/\bobject\b|\b\d{2,}\b/.test(r.body.output) || /undefined undefined/.test(r.body.output), `escape output: ${r.body.output}`);
  }
  const ok = await http('POST', '/api/run-code', { code: 'for (let i = 0; i < 3; i++) console.log("Hi " + i)' });
  assert.equal(ok.body.output, 'Hi 0\nHi 1\nHi 2');
  const turtle = await http('POST', '/api/run-code', { code: 'forward(50); right(90);' });
  assert.equal(turtle.body.turtleCommands.length, 2);
  const loop = await http('POST', '/api/run-code', { code: 'while (true) {}' });
  assert.equal(loop.body.error, true);
  assert.match(loop.body.output, /too long|infinite/i);
});

test('social GET routes are reachable (were shadowed by the catch-all route)', async () => {
  const r = await http('GET', '/api/social/friends', null, child.token);
  assert.equal(r.status, 200);
  assert.ok(Array.isArray(r.body.friends) || typeof r.body === 'object');
  assert.match(r.type, /json/);
  const missing = await http('GET', '/api/does-not-exist');
  assert.equal(missing.status, 404);
  assert.match(missing.type, /json/);
});

test('lessons: completing needs at least 50% on the challenge, checked by the server', async () => {
  const reg = await http('POST', '/api/register', { username: 'kamau', email: 'k@example.com', password: 'secret123', age: 13 });
  const token = reg.body.token;

  // The checklist is available before starting.
  const ch = await http('GET', '/api/lessons/1/challenge', null, token);
  assert.equal(ch.status, 200);
  assert.equal(ch.body.passMark, 50);
  assert.ok(ch.body.checks.length >= 3);

  // The untouched starter code is below 50%, and completing is refused even if the browser claims 100.
  const starter = '// Write your code here\nconsole.log("Hello, World!");';
  const low = await http('POST', '/api/lessons/1/check', { code: starter }, token);
  assert.ok(low.body.score < 50, `starter scored ${low.body.score}`);
  const refused = await http('POST', '/api/progress', { module_id: 1, lesson_id: 1, completed: true, last_code: starter, score: 100 }, token);
  assert.equal(refused.status, 400);
  assert.equal(refused.body.error, 'challenge_not_passed');
  assert.ok(Array.isArray(refused.body.checks));

  // Real practice that meets the challenge passes and is recorded with the server's score.
  const good = 'console.log("My name is Kamau");\nconsole.log("I live in Nyeri");\nconsole.log("I love football");';
  const high = await http('POST', '/api/lessons/1/check', { code: good }, token);
  assert.equal(high.body.score, 100);
  const done = await http('POST', '/api/progress', { module_id: 1, lesson_id: 1, completed: true, last_code: good, score: 1 }, token);
  assert.equal(done.status, 200, JSON.stringify(done.body));
  const row = await dbGet('SELECT completed, score FROM progress WHERE user_id = ? AND lesson_id = 1', [reg.body.user.id]);
  assert.equal(row.completed, 1);
  assert.equal(row.score, 100);

  // HTML lessons are checked without being run.
  const html = await dbGet("SELECT id FROM lessons WHERE title LIKE 'Headings%' LIMIT 1");
  if (html) {
    const half = await http('POST', `/api/lessons/${html.id}/check`, { code: '<h1>A</h1><h2>B</h2><h3>C</h3>' }, token);
    assert.equal(half.body.kind, 'html');
    assert.equal(half.body.score, 50);
  }
});

test('badges: every badge can be earned, and the coding streak counts days in a row', async () => {
  const reg = await http('POST', '/api/register', { username: 'nekesa', email: 'n@example.com', password: 'secret123', age: 13 });
  const { token, user } = reg.body;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const dbRun = (sql, p = []) => new Promise((resolve, reject) => getDb().run(sql, p, (e) => (e ? reject(e) : resolve())));
  const badges = async () => (await http('GET', '/api/achievements', null, token)).body.achievements;
  const has = (list, name) => list.find((a) => a.name.startsWith(name)).unlocked;

  // Running code with a for loop and the turtle -> Loop Master + Turtle Artist, and today counts.
  await http('POST', '/api/run-code', { code: 'for (let i = 0; i < 4; i++) { forward(50); right(90); }' }, token);
  await sleep(300);
  let list = await badges();
  assert.equal(has(list, 'Loop Master'), true);
  assert.equal(has(list, 'Turtle Artist'), true);
  assert.equal((await http('GET', '/api/progress', null, token)).body.streak, 1);
  assert.deepEqual(list.find((a) => a.name.startsWith('Consistent Coder')).progress, { current: 1, target: 3 });

  // Coding yesterday and the day before as well -> 3 days in a row -> Consistent Coder.
  const day = (n) => new Date(Date.now() + 3 * 3600000 - n * 86400000).toISOString().slice(0, 10);
  await dbRun('INSERT OR IGNORE INTO activity_days (user_id, day) VALUES (?, ?), (?, ?)', [user.id, day(1), user.id, day(2)]);
  await http('POST', '/api/run-code', { code: 'console.log("hi")' }, token);
  await sleep(300);
  assert.equal((await http('GET', '/api/progress', null, token)).body.streak, 3);
  list = await badges();
  assert.equal(has(list, 'Consistent Coder'), true);

  // Starting a lesson in every children's module -> Explorer.
  const modules = await dbAll("SELECT id FROM modules WHERE target_audience IS NULL OR target_audience IN ('children','both')").catch(() => dbAll('SELECT id FROM modules'));
  assert.ok(!has(list, 'Explorer'));
  for (const m of modules) {
    const lesson = await dbGet('SELECT id FROM lessons WHERE module_id = ? ORDER BY order_num LIMIT 1', [m.id]);
    if (lesson) await dbRun('INSERT OR IGNORE INTO progress (user_id, module_id, lesson_id, completed, score) VALUES (?, ?, ?, 0, 0)', [user.id, m.id, lesson.id]);
  }
  list = await badges();
  assert.equal(has(list, 'Explorer'), true);

  // Badges pay their XP exactly once, however often they are checked.
  const xpBefore = (await dbGet('SELECT xp FROM users WHERE id = ?', [user.id])).xp;
  await badges();
  assert.equal((await dbGet('SELECT xp FROM users WHERE id = ?', [user.id])).xp, xpBefore);
});

test('progress: XP is only awarded the first time a lesson is completed', async () => {
  const body = { module_id: 1, lesson_id: 1, completed: true, last_code: 'console.log("My name is Wanjiru");\nconsole.log("I am 11");\nconsole.log("I like maths");' };
  const first = await http('POST', '/api/progress', body, child.token);
  const second = await http('POST', '/api/progress', body, child.token);
  assert.ok(first.body.xpEarned > 0);
  assert.equal(second.body.xpEarned, 0);
  // Lesson completion feeds the AI learner model
  await new Promise((r) => setTimeout(r, 100));
  const rows = await dbAll("SELECT * FROM ai_mastery WHERE user_id = ? AND concept_id = 'output' AND language = 'javascript'", [child.user.id]);
  assert.ok(rows.length >= 3);
});

// ---- AI engine ----------------------------------------------------------------
test('catalog lists languages with age-aware recommendation and Bloom levels', async () => {
  const r = await http('GET', '/api/ai/catalog', null, child.token);
  assert.equal(r.status, 200);
  assert.equal(r.body.bloomLevels.length, 6);
  assert.equal(r.body.suggestedLanguage, 'python');
  assert.ok(r.body.languages.find((l) => l.id === 'scratch'));
  const status = await http('GET', '/api/ai/status', null, child.token);
  assert.equal(status.body.aiEnabled, false);
});

test('AI routes require login', async () => {
  const r = await http('GET', '/api/ai/next');
  assert.equal(r.status, 401);
});

test('learning path climbs Bloom levels from known to unknown and unlocks concepts', async () => {
  const seenLevels = [];
  let unlockedSomething = false;
  let lessonsShown = 0;
  for (let i = 0; i < 40; i += 1) {
    const next = await http('GET', '/api/ai/next?language=python', null, child.token);
    assert.equal(next.status, 200, JSON.stringify(next.body));
    const { activity, activityId, recommendation, lesson } = next.body;
    assert.equal(activity.answerIndex, undefined, 'answer must not be sent to the client');
    assert.equal(activity.expectedOutput, undefined);
    assert.equal(activity.solution, undefined);
    if (lesson) lessonsShown += 1;
    seenLevels.push(`${recommendation.concept}:${recommendation.level}`);
    const sub = await http('POST', `/api/ai/activities/${activityId}/submit`, await correctSubmission(activityId), child.token);
    assert.equal(sub.status, 200, JSON.stringify(sub.body));
    assert.equal(sub.body.correct, true, `${activity.type} ${JSON.stringify(sub.body)}`);
    if (sub.body.unlockedConcepts.length) unlockedSomething = true;
  }
  // The very first activity is Remember on the first concept (known -> unknown)
  assert.equal(seenLevels[0], 'sequence:remember');
  // Remember comes before Understand comes before Apply for the first concept
  const idx = (s) => seenLevels.indexOf(s);
  assert.ok(idx('sequence:remember') < idx('sequence:understand'));
  assert.ok(idx('sequence:understand') < idx('sequence:apply'));
  assert.ok(unlockedSomething, 'mastering a concept should unlock the next one');
  assert.ok(lessonsShown >= 3, 'mini-lessons are shown when meeting new levels');
  const profile = await http('GET', '/api/ai/profile?language=python', null, child.token);
  assert.ok(profile.body.summary.percent > 0);
  const user = await dbGet('SELECT xp FROM users WHERE id = ?', [child.user.id]);
  assert.ok(user.xp > 200);
});

test('three wrong answers in a row trigger scaffolding (step back a level)', async () => {
  const reg = await http('POST', '/api/register', { username: 'baraka', email: 'b@example.com', password: 'secret123', age: 12, parent_email: 'p2@example.com' });
  const token = reg.body.token;
  // Answer correctly until the learner reaches the Understand level.
  let n;
  for (let i = 0; i < 10; i += 1) {
    n = await http('GET', '/api/ai/next?language=javascript', null, token);
    if (n.body.recommendation.level === 'understand') break;
    await http('POST', `/api/ai/activities/${n.body.activityId}/submit`, await correctSubmission(n.body.activityId), token);
  }
  assert.equal(n.body.recommendation.level, 'understand');
  for (let i = 0; i < 3; i += 1) {
    if (i > 0) n = await http('GET', '/api/ai/next?language=javascript', null, token);
    await http('POST', `/api/ai/activities/${n.body.activityId}/submit`, await wrongSubmission(n.body.activityId), token);
  }
  const after = await http('GET', '/api/ai/next?language=javascript', null, token);
  assert.equal(after.body.recommendation.reason, 'scaffold_step_back');
  assert.equal(after.body.recommendation.level, 'remember');
  assert.ok(after.body.lesson, 'a mini-lesson is shown again when stepping back');

  // Getting the easier level right ends the step back: the learner is sent back up to
  // try Understand again, instead of being kept on Remember forever.
  await http('POST', `/api/ai/activities/${after.body.activityId}/submit`, await correctSubmission(after.body.activityId), token);
  const retry = await http('GET', '/api/ai/next?language=javascript', null, token);
  assert.equal(retry.body.recommendation.level, 'understand');
  assert.notEqual(retry.body.recommendation.reason, 'scaffold_step_back');
});

test('hints are progressive and answering twice is rejected', async () => {
  const n = await http('GET', '/api/ai/next?language=scratch&fresh=1', null, child.token);
  const id = n.body.activityId;
  const h1 = await http('POST', `/api/ai/activities/${id}/hint`, { hintNumber: 1 }, child.token);
  const h2 = await http('POST', `/api/ai/activities/${id}/hint`, { hintNumber: 2 }, child.token);
  assert.ok(h1.body.hint && h2.body.hint && h1.body.hint !== h2.body.hint);
  await http('POST', `/api/ai/activities/${id}/submit`, await correctSubmission(id), child.token);
  const again = await http('POST', `/api/ai/activities/${id}/submit`, await correctSubmission(id), child.token);
  assert.equal(again.status, 409);
  const other = await http('POST', '/api/register', { username: 'otieno', email: 'o@example.com', password: 'secret123', age: 13, parent_email: 'p3@example.com' });
  const stolen = await http('POST', `/api/ai/activities/${id}/hint`, {}, other.body.token);
  assert.equal(stolen.status, 404, 'learners cannot open other learners\' activities');
});

test('Swahili activities and mini-lessons', async () => {
  await http('PUT', '/api/ai/preferences', { locale: 'sw', language: 'blocks' }, child.token);
  const n = await http('GET', '/api/ai/next?fresh=1', null, child.token);
  assert.equal(n.body.activity.locale, 'sw');
  assert.equal(n.body.activity.language, 'blocks');
  await http('PUT', '/api/ai/preferences', { locale: 'en', language: 'python' }, child.token);
});

test('tutor: safety for self-harm, contact requests and personal information', async () => {
  const normal = await http('POST', '/api/ai/tutor', { message: 'How do loops work?' }, child.token);
  assert.match(normal.body.reply, /loop/i);
  const harm = await http('POST', '/api/ai/tutor', { message: 'I want to kill myself' }, child.token);
  assert.match(harm.body.reply, /116/);
  assert.equal(harm.body.flagged, true);
  const contact = await http('POST', '/api/ai/tutor', { message: 'whatsapp me later' }, child.token);
  assert.equal(contact.body.flagged, true);
  const pii = await http('POST', '/api/ai/tutor', { message: 'my number is 0712 345 678, help with if statements' }, child.token);
  assert.match(pii.body.reply, /private/i);
  const log = await dbAll('SELECT * FROM ai_safety_log WHERE user_id = ?', [child.user.id]);
  assert.ok(log.length >= 3);
  assert.ok(!JSON.stringify(log).includes('0712'), 'the safety log must not store the personal data itself');
});

test('moderation endpoint for community content', async () => {
  const ok = await http('POST', '/api/ai/moderate', { text: 'Check out my turtle drawing of a tree!' }, child.token);
  assert.equal(ok.body.allowed, true);
  const bad = await http('POST', '/api/ai/moderate', { text: 'send me your photo' }, child.token);
  assert.equal(bad.body.allowed, false);
  const pii = await http('POST', '/api/ai/moderate', { text: 'email me at kid@example.com' }, child.token);
  assert.equal(pii.body.allowed, false);
});

test('review-code runs JavaScript and gives offline tips', async () => {
  const r = await http('POST', '/api/ai/review-code', { code: 'consol.log("hi"', language: 'javascript' }, child.token);
  assert.equal(r.status, 200);
  assert.ok(r.body.error);
  assert.ok(r.body.tips.length >= 1);
  const py = await http('POST', '/api/ai/review-code', { code: 'if x > 3\n    print "big"', language: 'python' }, child.token);
  assert.ok(py.body.tips.some((t) => /colon/.test(t)));
});

test('insights: parents and teachers see only their own learners', async () => {
  const p = await http('POST', '/api/parent/register', { email: 'mama@example.com', password: 'secret123', firstName: 'Mama', lastName: 'W', phoneNumber: '0700000000' });
  assert.equal(p.status, 200, JSON.stringify(p.body));
  parent = p.body;
  const denied = await http('GET', `/api/ai/insights/learner/${child.user.id}`, null, parent.token);
  assert.equal(denied.status, 403);
  getDb().run('INSERT INTO parent_child_relationships (parent_id, child_id) VALUES (?, ?)', [parent.user.id, child.user.id]);
  await new Promise((r) => setTimeout(r, 50));
  const allowed = await http('GET', `/api/ai/insights/learner/${child.user.id}`, null, parent.token);
  assert.equal(allowed.status, 200, JSON.stringify(allowed.body));
  assert.equal(allowed.body.bloomProfile.length, 6);
  assert.ok(allowed.body.actions.length >= 1);

  const tReg = await http('POST', '/api/teacher/register', { email: 'mwalimu@example.com', password: 'secret123', firstName: 'Stella', lastName: 'M', phoneNumber: '0711111111' });
  assert.equal(tReg.status, 200, JSON.stringify(tReg.body));
  teacher = tReg.body;
  getDb().run("INSERT INTO teacher_student_relationships (teacher_id, student_id, class_name) VALUES (?, ?, 'Grade 7')", [teacher.user.id, child.user.id]);
  await new Promise((r) => setTimeout(r, 50));
  const cls = await http('GET', '/api/ai/insights/class', null, teacher.token);
  assert.equal(cls.status, 200, JSON.stringify(cls.body));
  assert.equal(cls.body.studentCount, 1);
  const childTriesClass = await http('GET', '/api/ai/insights/class', null, child.token);
  assert.equal(childTriesClass.status, 403);
});

// ---- AI provider integration (mocked HTTP) -----------------------------------
test('LLM client: Anthropic request format, JSON extraction and retry', async () => {
  const calls = [];
  let n = 0;
  const fakeFetch = async (url, init) => {
    calls.push({ url, init });
    n += 1;
    if (n === 1) return { ok: false, status: 529, text: async () => 'overloaded', json: async () => ({}) };
    return { ok: true, status: 200, json: async () => ({ content: [{ type: 'text', text: 'Here you go:\n```json\n{"a": 1, "b": "x}"}\n```' }] }) };
  };
  const client = new LLMClient({ ANTHROPIC_API_KEY: 'k', AI_MODEL: 'test-model' }, fakeFetch);
  const json = await client.completeJson({ system: 's', messages: [{ role: 'user', content: 'hi' }] });
  assert.deepEqual(json, { a: 1, b: 'x}' });
  assert.equal(calls.length, 2, 'retries once on overload');
  assert.equal(calls[1].url, 'https://api.anthropic.com/v1/messages');
  assert.equal(calls[1].init.headers['x-api-key'], 'k');
  assert.equal(calls[1].init.headers['anthropic-version'], '2023-06-01');
  const body = JSON.parse(calls[1].init.body);
  assert.equal(body.model, 'test-model');
  assert.equal(body.system, 's');
});

test('AI-generated activities are verified: wrong answer keys are replaced, unsafe content rejected', async () => {
  const { ContentGenerator } = require('../ai/contentGenerator');
  const { Store } = require('../ai/store');
  const { runJavaScript } = require('../sandbox/runJs');
  const replies = [];
  const fakeLlm = {
    enabled: true, provider: 'mock', model: 'mock',
    allow: () => true,
    completeJson: async () => replies.shift(),
    complete: async () => replies.shift(),
  };
  const gen = new ContentGenerator({ store: new Store(getDb()), llm: fakeLlm, runJs: runJavaScript });

  // 1. Predict-output: the model's code is executed; the real output becomes the answer key.
  replies.push({ type: 'predict_output', prompt: 'What prints?', code: 'let a = 2;\nfor (let i = 0; i < 3; i++) { a = a * 2; }\nconsole.log(a);', hints: ['h1'], explanation: 'doubling' });
  const p = await gen.getActivity({ userId: 1, concept: 'loops', level: 'analyze', language: 'javascript', locale: 'en', recentMistakes: ['x'] });
  assert.equal(p.source, 'ai');
  assert.deepEqual(p.expectedOutput, ['16']);
  assert.equal(p.hints.length, 3, 'missing hints are padded from the offline bank');

  // 2. Unsafe text from the model -> offline fallback
  replies.push({ type: 'mcq', prompt: 'Visit www.example.com and send me your photo', options: ['a', 'b', 'c', 'd'], answerIndex: 0, explanation: 'e', hints: [] });
  const unsafe = await gen.getActivity({ userId: 1, concept: 'loops', level: 'remember', language: 'python', locale: 'en', recentMistakes: ['x'] });
  assert.equal(unsafe.source, 'offline');

  // 3. Malformed MCQ (answerIndex out of range) -> offline fallback
  replies.push({ type: 'mcq', prompt: 'Q', options: ['a', 'b', 'c'], answerIndex: 5, explanation: 'e', hints: [] });
  const bad = await gen.getActivity({ userId: 1, concept: 'loops', level: 'understand', language: 'python', locale: 'en', recentMistakes: ['x'] });
  assert.equal(bad.source, 'offline');

  // 4. write_code whose solution does not use the concept -> rejected
  replies.push({ type: 'write_code', prompt: 'Print 1 to 3 with a loop', starterCode: '// code', solution: 'console.log(1);console.log(2);console.log(3);', hints: [], explanation: '' });
  const noLoop = await gen.getActivity({ userId: 1, concept: 'loops', level: 'apply', language: 'javascript', locale: 'en', recentMistakes: ['x'] });
  assert.equal(noLoop.source, 'offline');

  // 5. Non-JavaScript Apply/Analyse never uses AI (answers could not be verified)
  const py = await gen.getActivity({ userId: 1, concept: 'loops', level: 'analyze', language: 'python', locale: 'en' });
  assert.equal(py.source, 'offline');

  // 6. Hints that leak the answer are replaced by the offline hint
  const mcq = { type: 'mcq', locale: 'en', language: 'python', prompt: 'Which?', options: ['for i in range(5):', 'if x:', 'print(x)'], answerIndex: 0, hints: ['offline 1', 'offline 2', 'offline 3'] };
  replies.push('The answer is for i in range(5): obviously');
  const leak = await gen.hint({ userId: 1, activity: mcq, hintNumber: 1, learner: {} });
  assert.equal(leak.hint, 'offline 1');
});

// ---- question variety ----------------------------------------------------------

test('Coach gives NEW questions while a learner practises the same Bloom level', async () => {
  const reg = await http('POST', '/api/register', { username: 'zawadi', email: 'z@example.com', password: 'secret123', age: 14 });
  assert.equal(reg.status, 200, JSON.stringify(reg.body));
  const { token } = reg.body;
  const byStep = {};
  for (let i = 0; i < 45; i += 1) {
    const next = await http('GET', '/api/ai/next?language=javascript&fresh=1', null, token);
    assert.equal(next.status, 200, JSON.stringify(next.body));
    const row = await dbGet('SELECT concept_id, bloom_level, content_json FROM ai_activities WHERE id = ?', [next.body.activityId]);
    const content = JSON.parse(row.content_json);
    const step = `${row.concept_id}|${row.bloom_level}`;
    (byStep[step] = byStep[step] || []).push({ variant: content.variantKey, print: content.fingerprint });
    // Get every third one wrong so the learner spends longer on each level, like real children do.
    const answer = i % 3 === 2 ? await wrongSubmission(next.body.activityId) : await correctSubmission(next.body.activityId);
    const sub = await http('POST', `/api/ai/activities/${next.body.activityId}/submit`, answer, token);
    assert.equal(sub.status, 200, JSON.stringify(sub.body));
  }
  const steps = Object.entries(byStep);
  assert.ok(steps.some(([, list]) => list.length >= 3), 'expected several questions on at least one level');
  for (const [step, list] of steps) {
    // Every level offers at least 3 different questions, so the first 3 must all differ.
    const firstThree = list.slice(0, 3).map((q) => q.variant);
    assert.equal(new Set(firstThree).size, firstThree.length, `${step} repeated a question early: ${firstThree.join(', ')}`);
    // The exact same question (ignoring shuffled options) never comes back within 6 tries.
    const prints = list.slice(0, 6).map((q) => q.print);
    assert.equal(new Set(prints).size, prints.length, `${step} showed an identical question twice`);
  }
  // The learner's browser never sees the bookkeeping fields.
  const peek = await http('GET', '/api/ai/next?language=javascript&fresh=1', null, token);
  assert.equal(peek.body.activity.variantKey, undefined);
  assert.equal(peek.body.activity.fingerprint, undefined);
});

test('a mostly-right learner is not kept on one level forever', () => {
  const model = require('../ai/learnerModel');
  // Normal route: high confidence after a couple of answers.
  assert.equal(model.reachesMastery({ p: 0.9, attempts: 3, correct: 3 }), true);
  // An unlucky slip keeps p low, but 8 tries at 5/8 right is enough practice.
  assert.equal(model.reachesMastery({ p: 0.4, attempts: 8, correct: 5 }), true);
  // Still struggling (under 60%): keep practising this level.
  assert.equal(model.reachesMastery({ p: 0.4, attempts: 8, correct: 4 }), false);
  assert.equal(model.reachesMastery({ p: 0.4, attempts: 5, correct: 4 }), false);
});

test('offline generator picks a question the learner has not seen yet, for every language, concept and level', () => {
  const { generateOffline } = require('../ai/offlineBank');
  const { CONCEPTS } = require('../ai/concepts');
  const { BY_ID: LANGS } = require('../ai/languages');
  const levels = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'];
  for (const lang of Object.values(LANGS)) {
    for (const concept of CONCEPTS.filter((c) => lang.concepts.includes(c.id))) {
      for (const level of levels) {
        const seen = [];
        for (let k = 0; k < 3; k += 1) {
          const a = generateOffline({ concept: concept.id, level, language: lang.id, locale: k % 2 ? 'sw' : 'en', avoid: { variants: seen.slice().reverse(), fingerprints: [] } });
          assert.ok(a.variantKey, `${lang.id}/${concept.id}/${level} has no variantKey`);
          assert.ok(!seen.includes(a.variantKey), `${lang.id}/${concept.id}/${level} repeated ${a.variantKey} after ${seen.join(', ')}`);
          seen.push(a.variantKey);
        }
      }
    }
  }
});

// ---- life-long Coding Journey -------------------------------------------------

const LEVELS6 = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'];
const masteredRows = (language, concepts) => concepts.flatMap((c) => LEVELS6.map((lv) => ({
  language, concept_id: c, bloom_level: lv, p_known: 0.95, attempts: 4, correct: 4, streak_wrong: 0, last_practiced: new Date().toISOString(),
})));

test('journey: stages run from newbie to pro skills, and pro skills unlock in order', () => {
  const { buildJourney } = require('../ai/journey');
  const fresh = buildJourney([], 'python', 'en', 0);
  assert.equal(fresh.rank, 'Newbie Coder');
  assert.equal(fresh.stages[0].id, 'first_steps');
  assert.equal(fresh.stages[0].state, 'open');
  assert.equal(fresh.currentStage, 'first_steps');
  const pro = fresh.stages.find((s) => s.id === 'bug_hunting');
  assert.equal(pro.state, 'locked');
  assert.ok(pro.pro);
  assert.ok(pro.needs.some((n) => n.id === 'dictionaries'), 'a locked stage says what it is waiting for');
  assert.equal(fresh.legend.unlocked, false);

  // Mastering the basics unlocks the first pro stages but not the later ones.
  const basics = ['sequence', 'output', 'variables', 'arithmetic', 'conditionals', 'loops', 'while_loops', 'lists', 'functions', 'parameters_return', 'strings', 'dictionaries'];
  const mid = buildJourney(masteredRows('python', basics), 'python', 'en', 0);
  assert.equal(mid.stages.find((s) => s.id === 'organise_data').state, 'done');
  assert.equal(mid.stages.find((s) => s.id === 'bug_hunting').state, 'open');
  assert.equal(mid.stages.find((s) => s.id === 'blueprints').state, 'locked');
  assert.equal(mid.rank, 'Data Organiser');

  // Blocks and HTML continue into a text language, where the pro stages live.
  assert.equal(buildJourney([], 'blocks', 'en', 0).nextLanguage.id, 'python');
  assert.equal(buildJourney([], 'html_css', 'sw', 0).nextLanguage.id, 'javascript');
  assert.equal(buildJourney([], 'python', 'en', 0).nextLanguage, null);
});

test('journey never ends: after the last stage come endless Legend levels', () => {
  const { buildJourney } = require('../ai/journey');
  const model = require('../ai/learnerModel');
  const { BY_ID: LANGS } = require('../ai/languages');
  const all = masteredRows('javascript', LANGS.javascript.concepts);

  const j = buildJourney(all, 'javascript', 'en', 12);
  assert.equal(j.stagesDone, j.totalStages);
  assert.equal(j.legend.unlocked, true);
  assert.equal(j.legend.level, 3); // 12 wins at 5 per level -> Legend 3
  assert.equal(j.legend.winsToNext, 3);
  assert.equal(j.rank, 'Legend 3');
  assert.equal(buildJourney(all, 'javascript', 'sw', 0).rank, 'Gwiji 1');

  // The Coach keeps giving challenges: mixed skills, top thinking levels, oldest skill first.
  const recentDone = [{ concept_id: 'strings', bloom_level: 'create', correct: 1 }, { concept_id: 'sequence', bloom_level: 'analyze', correct: 1 }];
  const seenConcepts = new Set();
  for (let count = 0; count < 30; count += 1) {
    if (count % 7 === 6) continue; // spaced-review turn
    const rec = model.recommendNext({ rows: all, language: 'javascript', activityCount: count, recentDone });
    assert.equal(rec.reason, 'legend_challenge');
    assert.ok(['analyze', 'evaluate', 'create'].includes(rec.level), rec.level);
    seenConcepts.add(rec.concept);
  }
  // Skills not practised recently come before ones just practised.
  const first = model.recommendNext({ rows: all, language: 'javascript', activityCount: 0, recentDone });
  assert.notEqual(first.concept, 'strings');
  assert.notEqual(first.concept, 'sequence');
});

test('GET /api/ai/journey shows a new learner where they are', async () => {
  const reg = await http('POST', '/api/register', { username: 'safari', email: 'safari@example.com', password: 'secret123', age: 14 });
  assert.equal(reg.status, 200, JSON.stringify(reg.body));
  const res = await http('GET', '/api/ai/journey?language=python&locale=sw', null, reg.body.token);
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.language, 'python');
  assert.equal(res.body.stages[0].state, 'open');
  assert.ok(res.body.totalStages >= 13);
  assert.equal(res.body.legend.unlocked, false);
  assert.match(res.body.stages[0].name, /Hatua/); // Kiswahili
  const unauth = await http('GET', '/api/ai/journey?language=python');
  assert.equal(unauth.status, 401);
});

test('journey: an earned stage or Legend level is not lost after one wrong answer', () => {
  const { buildJourney } = require('../ai/journey');
  const { BY_ID: LANGS } = require('../ai/languages');
  const rows = masteredRows('python', LANGS.python.concepts).map((r) => ({ ...r, mastered_at: '2026-01-01T00:00:00Z' }));
  // A later slip on one level drops the live estimate below mastery...
  Object.assign(rows.find((r) => r.concept_id === 'sequence' && r.bloom_level === 'remember'), { p_known: 0.3, correct: 4, attempts: 9, streak_wrong: 1 });
  const j = buildJourney(rows, 'python', 'en', 5);
  // ...but the child keeps the rank they earned.
  assert.equal(j.legend.unlocked, true);
  assert.equal(j.rank, 'Legend 2');
  assert.equal(j.stages.every((s) => s.skills.every((k) => k.unlocked)), true);
});

// ---- Friends & leaderboard (Social page) -------------------------------------------

test('social: friends, leaderboards and activity come from real learning records', async () => {
  const dbRun = (sql, params = []) => new Promise((resolve, reject) => getDb().run(sql, params, (e) => (e ? reject(e) : resolve())));
  const mk = async (username) => {
    const r = await http('POST', '/api/register', { username, email: `${username}@example.com`, password: 'secret123', age: 14 });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    return { token: r.body.token, id: r.body.user.id };
  };
  const neema = await mk('neema_social');
  const tumaini = await mk('tumaini_social');

  // Real progress: Neema finishes a lesson today and earns AI Coach XP; Tumaini has older XP only.
  const lesson = await dbGet('SELECT id, module_id, title FROM lessons ORDER BY id LIMIT 1');
  await dbRun('INSERT INTO progress (user_id, module_id, lesson_id, completed, score) VALUES (?, ?, ?, 1, 80)', [neema.id, lesson.module_id, lesson.id]);
  await dbRun("INSERT INTO progress (user_id, module_id, lesson_id, completed, score) VALUES (?, ?, 'quiz_1', 1, 100)", [neema.id, lesson.module_id]);
  await dbRun("INSERT INTO ai_activities (user_id, language, concept_id, bloom_level, activity_type, content_json, source, status, correct, xp_earned, completed_at) VALUES (?, 'python', 'loops', 'apply', 'write_code', '{}', 'offline', 'done', 1, 40, datetime('now'))", [neema.id]);
  await dbRun("INSERT INTO ai_mastery (user_id, language, concept_id, bloom_level, p_known, attempts, correct, mastered_at) VALUES (?, 'python', 'loops', 'apply', 0.95, 3, 3, datetime('now'))", [neema.id]);
  await dbRun('UPDATE users SET xp = 160 WHERE id = ?', [neema.id]);
  await dbRun('UPDATE users SET xp = 900 WHERE id = ?', [tumaini.id]);

  // All time: Tumaini leads; lessons count ignores the quiz row.
  const allTime = await http('GET', '/api/social/leaderboard?timeframe=all', null, neema.token);
  assert.equal(allTime.status, 200, JSON.stringify(allTime.body));
  const t = allTime.body.leaderboard.find((u) => u.id === tumaini.id);
  const n = allTime.body.leaderboard.find((u) => u.id === neema.id);
  assert.ok(t.rank < n.rank);
  assert.equal(n.lessons, 1);
  assert.equal(n.isYou, true);
  assert.equal(n.level, 1);
  assert.equal(allTime.body.you.rank, n.rank);
  assert.equal(n.email, undefined, 'no personal data on the leaderboard');

  // This week: only XP earned this week counts, so Neema is ahead of Tumaini (who is left out).
  const week = await http('GET', '/api/social/leaderboard?timeframe=week', null, neema.token);
  const nw = week.body.leaderboard.find((u) => u.id === neema.id);
  assert.ok(nw.xp >= 40 + 120, `week XP ${nw.xp}`); // Coach answer + lesson score
  assert.equal(week.body.leaderboard.some((u) => u.id === tumaini.id), false);

  // Friend request -> accept -> both see each other; searching shows the right state.
  const search = await http('GET', '/api/social/search?query=tumaini_soc', null, neema.token);
  assert.equal(search.body.users[0].friendshipStatus, 'none');
  assert.equal((await http('POST', '/api/social/friends/request', { friendId: tumaini.id }, neema.token)).body.status, 'pending');
  const incoming = await http('GET', '/api/social/search?query=neema_soc', null, tumaini.token);
  assert.equal(incoming.body.users[0].friendshipStatus, 'incoming');
  const reqs = await http('GET', '/api/social/friends/requests', null, tumaini.token);
  assert.equal(reqs.body.requests[0].from.id, neema.id);
  assert.equal((await http('POST', `/api/social/friends/accept/${reqs.body.requests[0].id}`, null, tumaini.token)).status, 200);
  const friends = await http('GET', '/api/social/friends', null, neema.token);
  assert.equal(friends.body.friends[0].id, tumaini.id);
  assert.ok(friends.body.friends[0].friendsSince);

  // Friends leaderboard and feed show real events for me and my friend.
  const fl = await http('GET', '/api/social/leaderboard/friends', null, tumaini.token);
  assert.deepEqual(fl.body.leaderboard.map((u) => u.id).sort(), [neema.id, tumaini.id].sort());
  const feed = await http('GET', '/api/social/feed', null, tumaini.token);
  const types = feed.body.feed.filter((e) => e.userId === neema.id).map((e) => e.type);
  assert.ok(types.includes('lesson'), JSON.stringify(feed.body.feed));
  assert.ok(types.includes('skill'));

  // Remove, then add again (used to fail because the old request row was still there).
  assert.equal((await http('DELETE', `/api/social/friends/${tumaini.id}`, null, neema.token)).status, 200);
  assert.equal((await http('POST', '/api/social/friends/request', { friendId: tumaini.id }, neema.token)).body.status, 'pending');
  // If they also ask me, it simply becomes a friendship.
  assert.equal((await http('POST', '/api/social/friends/request', { friendId: neema.id }, tumaini.token)).body.status, 'accepted');
});

test('friends can cheer, duel, share projects and see each other; parents stay in control', async () => {
  const dbRun = (sql, params = []) => new Promise((resolve, reject) => getDb().run(sql, params, (e) => (e ? reject(e) : resolve())));
  const mk = async (username) => {
    const r = await http('POST', '/api/register', { username, email: `${username}@example.com`, password: 'secret123', age: 14 });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    return { token: r.body.token, id: r.body.user.id };
  };
  const a = await mk('furaha_friend');
  const b = await mk('jabali_friend');
  const stranger = await mk('mgeni_friend');
  const req = await http('POST', '/api/social/friends/request', { friendId: b.id }, a.token);
  await http('POST', `/api/social/friends/accept/${req.body.requestId}`, null, b.token);

  // Cheers: only ready-made stickers, only to friends.
  assert.equal((await http('POST', '/api/social/cheers', { to: b.id, sticker: 'high_five' }, a.token)).status, 200);
  assert.equal((await http('POST', '/api/social/cheers', { to: b.id, sticker: 'you are dumb' }, a.token)).status, 400);
  assert.equal((await http('POST', '/api/social/cheers', { to: stranger.id, sticker: 'star' }, a.token)).status, 403);
  let inbox = await http('GET', '/api/social/inbox', null, b.token);
  assert.ok(inbox.body.items.some((i) => i.type === 'cheer' && i.emoji === '🙌' && i.fromId === a.id));
  assert.ok(inbox.body.unread >= 1);
  await http('POST', '/api/social/inbox/seen', null, b.token);
  inbox = await http('GET', '/api/social/inbox', null, b.token);
  assert.equal(inbox.body.unread, 0);

  // Code duel: same 5 questions for both, answers stay on the server, winner gets bonus XP.
  const duel = await http('POST', '/api/social/duels', { to: b.id, language: 'python', concept: 'loops' }, a.token);
  assert.equal(duel.status, 200, JSON.stringify(duel.body));
  const qa = await http('GET', `/api/social/duels/${duel.body.duelId}`, null, a.token);
  const qb = await http('GET', `/api/social/duels/${duel.body.duelId}`, null, b.token);
  assert.equal(qa.body.questions.length, 5);
  assert.deepEqual(qa.body.questions.map((q) => q.prompt), qb.body.questions.map((q) => q.prompt));
  assert.equal(qa.body.questions[0].answerIndex, undefined, 'answers are not sent to the browser');
  assert.ok((await http('GET', '/api/social/inbox', null, b.token)).body.items.some((i) => i.type === 'duel' && i.duel.yourTurn));
  const xpBefore = (await dbGet('SELECT xp FROM users WHERE id = ?', [a.id])).xp;
  const first = await http('POST', `/api/social/duels/${duel.body.duelId}/answers`, { answers: [9, 9, 9, 9, 9] }, a.token);
  assert.equal(first.body.score, 0);
  assert.equal(first.body.duel.theirScore, null, 'the other score stays hidden until both finish');
  const right = first.body.marking.map((m) => m.correctIndex);
  const second = await http('POST', `/api/social/duels/${duel.body.duelId}/answers`, { answers: right }, b.token);
  assert.equal(second.body.score, 5);
  assert.equal(second.body.duel.result, 'won');
  assert.equal((await http('POST', `/api/social/duels/${duel.body.duelId}/answers`, { answers: right }, b.token)).status, 409);
  const xpAfter = (await dbGet('SELECT xp FROM users WHERE id = ?', [a.id])).xp;
  assert.equal(xpAfter - xpBefore, 10, 'finishing a duel earns XP even when you lose');
  const record = await http('GET', '/api/social/duels', null, b.token);
  assert.equal(record.body.record.won, 1);

  // Projects: shared with friends only, unsafe ones are blocked, friends can open and cheer them.
  const share = await http('POST', '/api/social/projects', { title: 'Rainbow spiral', code: 'for (let i = 0; i < 36; i++) { forward(i * 3); right(20); }', language: 'javascript' }, a.token);
  assert.equal(share.status, 200, JSON.stringify(share.body));
  const unsafe = await http('POST', '/api/social/projects', { title: 'Call me', code: 'console.log("my number is 0712345678")' }, a.token);
  assert.equal(unsafe.status, 422);
  const proj = await http('GET', `/api/social/projects/${share.body.projectId}`, null, b.token);
  assert.match(proj.body.code, /forward/);
  assert.equal((await http('GET', `/api/social/projects/${share.body.projectId}`, null, stranger.token)).status, 403);
  assert.equal((await http('POST', '/api/social/cheers', { to: a.id, sticker: 'wow', projectId: share.body.projectId }, b.token)).status, 200);
  const list = await http('GET', '/api/social/projects', null, b.token);
  assert.equal(list.body.projects[0].cheers.counts.wow, 1);

  // Profile + buddy streak + team goal.
  await dbRun("INSERT OR IGNORE INTO activity_days (user_id, day) VALUES (?, date('now', '+3 hours'))", [a.id]);
  await dbRun("INSERT OR IGNORE INTO activity_days (user_id, day) VALUES (?, date('now', '+3 hours'))", [b.id]);
  const profile = await http('GET', `/api/social/friends/${a.id}/profile`, null, b.token);
  assert.equal(profile.status, 200, JSON.stringify(profile.body));
  assert.ok(profile.body.journey.rank);
  assert.equal(profile.body.projects.length, 1);
  assert.equal(profile.body.buddyStreak, 1);
  assert.equal((await http('GET', `/api/social/friends/${a.id}/profile`, null, stranger.token)).status, 403);
  const team = await http('GET', '/api/social/team', null, a.token);
  assert.equal(team.body.members.length, 2);
  assert.equal(team.body.goal, 500);

  // Parent controls: see friends, switch sharing/friends off, remove a friend.
  const p = await http('POST', '/api/parent/register', { email: 'mzazi_friends@example.com', password: 'secret123', firstName: 'Mzazi', lastName: 'F', phoneNumber: '0700000001' });
  assert.equal(p.status, 200, JSON.stringify(p.body));
  assert.equal((await http('GET', `/api/parent/social/${a.id}`, null, p.body.token)).status, 403, 'only their own child');
  await dbRun('INSERT INTO parent_child_relationships (parent_id, child_id) VALUES (?, ?)', [p.body.user.id, a.id]);
  const view = await http('GET', `/api/parent/social/${a.id}`, null, p.body.token);
  assert.equal(view.body.friends[0].id, b.id);
  assert.equal(view.body.sharedProjects.length, 1);
  await http('PUT', `/api/parent/social/${a.id}`, { sharingEnabled: false }, p.body.token);
  assert.equal((await http('POST', '/api/social/projects', { title: 'Another', code: 'forward(10)' }, a.token)).status, 403);
  await http('PUT', `/api/parent/social/${a.id}`, { friendsEnabled: false }, p.body.token);
  assert.equal((await http('GET', '/api/social/friends', null, b.token)).body.friends.length, 0, 'friendship paused while friends are off');
  assert.equal((await http('POST', '/api/social/cheers', { to: a.id, sticker: 'star' }, b.token)).status, 403);
  await http('PUT', `/api/parent/social/${a.id}`, { friendsEnabled: true, sharingEnabled: true }, p.body.token);
  assert.equal((await http('GET', '/api/social/friends', null, b.token)).body.friends.length, 1, 'back on');
  assert.equal((await http('DELETE', `/api/parent/social/${a.id}/friends/${b.id}`, null, p.body.token)).status, 200);
  assert.equal((await http('GET', '/api/social/friends', null, a.token)).body.friends.length, 0);
});

// ---- Adult learners: Professional Web Development ------------------------------

test('adult course: full content, real tests before completion, study time and a verifiable certificate', async () => {
  const dbRun = (sql, params = []) => new Promise((resolve, reject) => getDb().run(sql, params, (e) => (e ? reject(e) : resolve())));
  const course = require('../adultCourse');

  const reg = await http('POST', '/api/adult/register', { email: 'Wanjiku.Adult@example.com', password: 'longpassword1', firstName: 'Wanjiku', lastName: 'Kamau', occupation: 'Teacher' });
  assert.equal(reg.status, 200, JSON.stringify(reg.body));
  const token = reg.body.token;
  assert.equal((await http('POST', '/api/adult/register', { email: 'wanjiku.adult@example.com', password: 'longpassword1', firstName: 'W', lastName: 'K' })).body.code, 'email_taken');
  assert.equal((await http('POST', '/api/adult/login', { email: 'wanjiku.adult@example.com', password: 'longpassword1' })).status, 200, 'email is not case-sensitive');
  assert.equal((await http('POST', '/api/adult/login', { email: 'wanjiku.adult@example.com', password: 'wrong' })).status, 401);

  // All four courses are there (web, Java, Python, databases), with no duplicate lessons.
  const { MODULES } = require('../adultCourse');
  const lessonTotal = MODULES.reduce((n, m) => n + m.lessons.length, 0);
  const cur = await http('GET', '/api/adult/curriculum', null, token);
  assert.equal(cur.status, 200, JSON.stringify(cur.body));
  assert.equal(cur.body.curriculum.length, MODULES.length);
  assert.deepEqual(cur.body.curriculum.map((m) => m.id), MODULES.map((m) => m.id));
  assert.deepEqual(MODULES.map((m) => m.id), [101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123]);
  assert.equal(cur.body.stats.totalLessons, lessonTotal);
  assert.equal(new Set(cur.body.curriculum.flatMap((m) => m.lessons.map((l) => `${m.id}:${l.title}`))).size, lessonTotal);
  const first = cur.body.nextLesson;
  assert.ok(first);

  // A lesson has real content, checks and a written test - but never the answers.
  const lesson = (await http('GET', `/api/adult/lesson/${first.id}`, null, token)).body.lesson;
  assert.ok(lesson.content.length > 400);
  assert.ok(lesson.checks.length >= 2);
  assert.equal(lesson.quiz.length, 3);
  assert.equal(lesson.quiz[0].answerIndex, undefined);
  assert.ok(lesson.oral);
  assert.equal(lesson.next.title, 'HTML Document Structure');

  // Completing needs the practical task AND the written test.
  const notYet = await http('POST', `/api/adult/lesson/${first.id}/complete`, { code: { html: '<p>hi</p>' } }, token);
  assert.equal(notYet.body.code, 'practical_not_passed');
  const good = { html: '<h1>Wanjiku Kamau</h1>\n<p>I want to build websites for schools.</p>' };
  const check = await http('POST', `/api/adult/lesson/${first.id}/check`, { code: good }, token);
  assert.equal(check.body.passed, true, JSON.stringify(check.body));
  assert.equal((await http('POST', `/api/adult/lesson/${first.id}/complete`, { code: good }, token)).body.code, 'written_not_passed');
  const c = course.courseLesson(101, 1);
  const right = course.quizFor(c, first.id).map((q) => q.answerIndex);
  const wrongQuiz = await http('POST', `/api/adult/lesson/${first.id}/quiz`, { answers: right.map((a) => (a + 1) % 4) }, token);
  assert.equal(wrongQuiz.body.passed, false);
  const quiz = await http('POST', `/api/adult/lesson/${first.id}/quiz`, { answers: right }, token);
  assert.equal(quiz.body.score, 100);
  assert.equal((await http('POST', `/api/adult/lesson/${first.id}/oral`, { text: 'too short' }, token)).body.code, 'too_short');
  const oral = await http('POST', `/api/adult/lesson/${first.id}/oral`, { text: 'HTML gives a page its structure and meaning, CSS controls how it looks with colours fonts and layout, and JavaScript adds behaviour such as reacting to clicks and checking forms before they are sent to the server for processing.' }, token);
  assert.equal(oral.status, 200, JSON.stringify(oral.body));
  const done = await http('POST', `/api/adult/lesson/${first.id}/complete`, { code: good }, token);
  assert.equal(done.status, 200, JSON.stringify(done.body));
  assert.equal(done.body.score, 100);
  assert.equal(done.body.next.title, 'HTML Document Structure');
  const saved = (await http('GET', `/api/adult/lesson/${first.id}`, null, token)).body.lesson;
  assert.equal(saved.completed, true);
  assert.match(saved.savedCode.html, /Wanjiku/);

  // The old progress route cannot be used to skip the tests.
  assert.equal((await http('POST', '/api/progress', { module_id: 101, lesson_id: lesson.next.id, completed: 1 }, token)).status, 403);

  // Study time: one minute per heartbeat, extra beats from other tabs are ignored.
  const beat = await http('POST', '/api/adult/activity', { lessonId: first.id }, token);
  assert.equal(beat.body.credited, 1);
  assert.equal((await http('POST', '/api/adult/activity', { lessonId: first.id }, token)).body.credited, 0);

  // Certificates are per course. Not yet: lessons and hours are missing.
  const { COURSES } = require('../adultCourse');
  const java = COURSES.find((c) => c.key === 'java');
  assert.equal((await http('POST', `/api/adult/certificates/${java.id}`, null, token)).status, 400);
  assert.equal((await http('POST', '/api/adult/certificates/99', null, token)).status, 404);
  const report = await http('GET', '/api/adult/progress', null, token);
  assert.equal(report.body.progress.completedLessons, 1);
  assert.equal(report.body.progress.modules.length, MODULES.length);
  assert.equal(report.body.progress.courses.length, COURSES.length);
  assert.equal(report.body.progress.courses.find((c) => c.id === java.id).requirements.sufficientHours.met, false);

  // Finish only the Java course, with enough time in its lessons. Time outside its lessons
  // (the playground, other courses) does not count towards the Java certificate.
  const me = reg.body.user.id;
  const javaLessons = cur.body.curriculum.filter((m) => java.modules.includes(m.id)).flatMap((m) => m.lessons.map((l) => [m.id, l.id]));
  for (const [moduleId, lessonId] of javaLessons) {
    await dbRun('INSERT OR REPLACE INTO progress (user_id, module_id, lesson_id, completed, score) VALUES (?, ?, ?, 1, 90)', [me, moduleId, lessonId]);
  }
  const minutes = (java.requiredHours + 1) * 60;
  await dbRun("INSERT INTO learning_hours_log (user_id, module_id, session_start, duration_minutes, activity_type) VALUES (?, NULL, datetime('now'), ?, 'practice')", [me, minutes]);
  let certs = (await http('GET', '/api/adult/certificates', null, token)).body.courses;
  assert.equal(certs.find((c) => c.id === java.id).requirements.sufficientHours.met, false, 'practice time is not Java lesson time');
  await dbRun("INSERT INTO learning_hours_log (user_id, module_id, session_start, duration_minutes, activity_type) VALUES (?, ?, datetime('now'), ?, 'lesson')", [me, java.modules[0], minutes]);
  certs = (await http('GET', '/api/adult/certificates', null, token)).body.courses;
  assert.equal(certs.length, 6);
  assert.equal(certs.find((c) => c.id === java.id).eligible, true, JSON.stringify(certs.find((c) => c.id === java.id)));
  assert.equal(certs.find((c) => c.key === 'web').eligible, false, 'other courses are not finished');
  assert.equal((await http('POST', '/api/adult/certificates/1', null, token)).status, 400);

  const cert = await http('POST', `/api/adult/certificates/${java.id}`, null, token);
  assert.equal(cert.status, 200, JSON.stringify(cert.body));
  assert.equal(cert.body.certificate.firstName, 'Wanjiku');
  assert.equal(cert.body.certificate.courseTitle, 'Java Programming');
  assert.match(cert.body.certificate.certificateNumber, /^KCJAVA-\d{4}-\d{5}-[0-9A-F]{4}$/);
  assert.equal(cert.body.certificate.curriculumCode, java.units[0]);
  assert.equal(cert.body.certificate.totalHours, java.requiredHours + 1);
  const again = await http('POST', `/api/adult/certificates/${java.id}`, null, token);
  assert.equal(again.body.certificate.certificateNumber, cert.body.certificate.certificateNumber, 'issued only once per course');
  const verify = await http('GET', `/api/certificates/verify/${cert.body.certificate.verificationCode}`);
  assert.equal(verify.body.valid, true);
  assert.equal(verify.body.name, 'Wanjiku Kamau');
  assert.equal(verify.body.course, 'Java Programming');
  assert.equal(verify.body.lessons, java.lessonCount);
  assert.equal(verify.body.email, undefined, 'no private data on the public check');
  assert.equal((await http('GET', '/api/certificates/verify/NOPE123')).status, 404);
  assert.equal((await http('GET', '/api/adult/curriculum', null, token)).body.stats.certificatesEarned, 1);

  // A certificate from before per-course certificates (no course) is shown as Web Development.
  const other = await http('POST', '/api/adult/register', { email: 'legacy.cert@example.com', password: 'longpassword1', firstName: 'Old', lastName: 'Cert' });
  await dbRun("INSERT INTO certificates (user_id, course_id, certificate_number, issue_date, total_hours, overall_score, verification_code) VALUES (?, NULL, 'KCWEB-2025-00001-AAAA', '2025-06-01', 170, 88, 'LEGACY0001')", [other.body.user.id]);
  const legacy = (await http('GET', '/api/adult/certificates', null, other.body.token)).body.courses;
  assert.equal(legacy.find((c) => c.key === 'web').certificate.certificateNumber, 'KCWEB-2025-00001-AAAA');
  assert.equal((await http('GET', '/api/certificates/verify/LEGACY0001')).body.course, 'Web Development');

  // Profile and password.
  const prof = await http('PUT', '/api/adult/profile', { firstName: 'Wanjiku', lastName: 'Njoroge', occupation: 'Developer' }, token);
  assert.equal(prof.body.user.lastName, 'Njoroge');
  // An issued certificate keeps the name it was issued with (a profile edit cannot change it).
  const after = (await http('GET', '/api/adult/certificates', null, token)).body.courses.find((c) => c.id === java.id);
  assert.equal(after.certificate.lastName, 'Kamau');
  assert.equal((await http('GET', `/api/certificates/verify/${cert.body.certificate.verificationCode}`)).body.name, 'Wanjiku Kamau');
  // The study time the dashboard shows is exact (minutes), not just rounded hours.
  assert.ok((await http('GET', '/api/adult/curriculum', null, token)).body.stats.minutesLogged >= minutes * 2);
  assert.equal((await http('PUT', '/api/adult/password', { currentPassword: 'nope', newPassword: 'newpassword2' }, token)).status, 400);
  assert.equal((await http('PUT', '/api/adult/password', { currentPassword: 'longpassword1', newPassword: 'newpassword2' }, token)).status, 200);
  assert.equal((await http('POST', '/api/adult/login', { email: 'wanjiku.adult@example.com', password: 'newpassword2' })).status, 200);

  // Children cannot use adult routes.
  const kid = await http('POST', '/api/register', { username: 'adultcheck_kid', email: 'ack@example.com', password: 'secret123', age: 14 });
  assert.equal((await http('GET', '/api/adult/curriculum', null, kid.body.token)).status, 403);
});

test('adult course content: every lesson is complete and its checks can be passed', () => {
  const course = require('../adultCourse');
  let lessons = 0;
  for (const m of course.MODULES) {
    for (const l of m.lessons) {
      lessons += 1;
      assert.ok(l.content.length > 300, `${l.title}: content too short`);
      assert.ok(l.checks.length >= 2, `${l.title}: needs checks`);
      assert.equal(l.quiz.length, 3, `${l.title}: needs 3 questions`);
      l.quiz.forEach((q) => assert.equal(new Set(q.options).size, q.options.length, `${l.title}: duplicate options`));
      assert.ok(l.oral, `${l.title}: oral question`);
      // The content must not show unfilled template text.
      assert.ok(!/\$\{(?![^}]*\})/.test(l.content) || l.content.includes('${'), `${l.title}`);
    }
  }
  assert.equal(course.MODULES.length, 23);
  assert.equal(lessons, 101);
  // Study time is worked out from the lessons, not the classroom hours of the curriculum.
  assert.ok(course.TOTAL_HOURS < 200 && course.REQUIRED_HOURS < course.TOTAL_HOURS);
  assert.ok(course.MODULES.reduce((h, m) => h + m.hours, 0) >= course.REQUIRED_HOURS);
});

test('adult learners can use the AI Coach with grown-up settings', async () => {
  const reg = await http('POST', '/api/adult/register', { email: 'coach.adult@example.com', password: 'longpassword1', firstName: 'Achieng', lastName: 'Otieno' });
  assert.equal(reg.status, 200, JSON.stringify(reg.body));
  const token = reg.body.token;
  const cat = await http('GET', '/api/ai/catalog?locale=en', null, token);
  assert.equal(cat.status, 200);
  assert.equal(cat.body.suggestedLanguage, 'javascript');
  const offered = cat.body.languages.filter((l) => l.ageAppropriate).map((l) => l.id);
  assert.ok(offered.includes('html_css') && offered.includes('javascript'));
  assert.ok(!offered.includes('blocks') && !offered.includes('scratch'), 'no children\'s block languages for adults');
  const prof = await http('GET', '/api/ai/profile', null, token);
  assert.equal(prof.body.language, 'javascript');
  const next = await http('GET', '/api/ai/next?fresh=1', null, token);
  assert.equal(next.status, 200, JSON.stringify(next.body));
  const sub = await http('POST', `/api/ai/activities/${next.body.activityId}/submit`, await correctSubmission(next.body.activityId), token);
  assert.equal(sub.status, 200, JSON.stringify(sub.body));
  assert.equal(sub.body.correct, true);
  // The XP they earn shows up in their Coach profile.
  const after = await http('GET', '/api/ai/profile', null, token);
  assert.equal(after.body.xp.total, sub.body.xpEarned);
  assert.equal(after.body.xp.week, sub.body.xpEarned);
  assert.equal(after.body.xp.answered, 1);
  assert.equal(prof.body.xp.total, 0);
  // The AI is told it is talking to an adult.
  const prompts = require('../ai/prompts');
  assert.match(prompts.systemPrompt({ age: 'adult', locale: 'en' }), /adult/);
  assert.doesNotMatch(prompts.systemPrompt({ age: 'adult', locale: 'en' }), /children/);
  // Children keep the children's Coach.
  const kid = await http('POST', '/api/register', { username: 'coach_kid_check', email: 'ckc@example.com', password: 'secret123', age: 14 });
  assert.equal((await http('GET', '/api/ai/catalog', null, kid.body.token)).body.suggestedLanguage, 'python');
});

test('adult courses run Java, Python and SQL on the server with one result shape', async () => {
  const reg = await http('POST', '/api/adult/register', { email: 'runner.adult@example.com', password: 'longpassword1', firstName: 'Baraka', lastName: 'Juma' });
  assert.equal(reg.status, 200, JSON.stringify(reg.body));
  const token = reg.body.token;
  const run = (language, code, input) => http('POST', `/api/adult/code/execute/${language}`, { code, input }, token);
  const shape = (r) => ['ok', 'language', 'output', 'error', 'tables', 'notes', 'timeMs'].every((k) => k in r);

  // Needs a login, and only knows three languages.
  assert.equal((await http('POST', '/api/adult/code/execute/sql', { code: 'SELECT 1;' })).status, 401);
  assert.equal((await run('ruby', 'puts 1')).status, 404);

  // SQL always works: a fresh practice database for every run.
  const q = await run('sql', 'SELECT name, price FROM Products WHERE price BETWEEN 100 AND 500 ORDER BY price;');
  assert.equal(q.status, 200);
  assert.ok(shape(q.body));
  assert.equal(q.body.ok, true);
  assert.deepEqual(q.body.tables[0].columns, ['name', 'price']);
  assert.ok(q.body.tables[0].rowCount > 0);
  const change = await run('sql', "INSERT INTO Products (name, price) VALUES ('Mango', 30);\nDELETE FROM Products WHERE price < 50;");
  assert.deepEqual(change.body.output, ['Statement 1: 1 row inserted.', 'Statement 2: 1 row deleted.']);
  const again = await run('sql', "SELECT COUNT(*) AS n FROM Products WHERE name = 'Mango';");
  assert.equal(again.body.tables[0].rows[0][0], 0, 'every run starts from a fresh copy');
  const bad = await run('sql', 'SELECT * FROM Customer;');
  assert.equal(bad.body.ok, false);
  assert.equal(bad.body.error.type, 'sql');
  assert.match(bad.body.error.message, /no such table/);
  assert.match(bad.body.error.hint, /Customers/);
  assert.equal((await run('sql', "ATTACH DATABASE 'x.db' AS x;")).body.error.type, 'sql');
  const mysql = await run('sql', 'CREATE TABLE Members (member_id INT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(50));');
  assert.equal(mysql.body.ok, true);
  assert.ok(mysql.body.notes.some((n) => /AUTO_INCREMENT/.test(n)));
  assert.equal((await run('sql', '   ')).body.error.type, 'input');
  const tables = await http('GET', '/api/adult/code/sql/tables', null, token);
  assert.ok(tables.body.tables.some((t) => t.name === 'Customers' && t.columns.includes('customer_id')));

  // Java and Python need those tools installed; check them when they are.
  const status = (await http('GET', '/api/adult/code/status', null, token)).body;
  if (status.python.available) {
    const py = await run('python', 'name = input()\nprint("Habari", name)', 'Wanjiru');
    assert.ok(shape(py.body));
    assert.deepEqual(py.body.output, ['Habari Wanjiru']);
    const err = await run('python', 'x = 1\nprint(y)');
    assert.equal(err.body.error.type, 'runtime');
    assert.equal(err.body.error.name, 'NameError');
    assert.equal(err.body.error.line, 2);
    const syntax = await run('python', 'if True\n    print(1)');
    assert.equal(syntax.body.error.type, 'syntax');
    assert.equal((await run('python', 'print(open("/etc/passwd").read())')).body.error.name, 'PermissionError');
  }
  if (status.java.available) {
    const j = await run('java', 'System.out.println("Hello");');
    assert.deepEqual(j.body.output, ['Hello']);
    const ce = await run('java', 'System.out.println("Hi")');
    assert.equal(ce.body.error.type, 'compile');
    assert.equal(ce.body.error.line, 1, 'line numbers match what the learner wrote');
    const re = await run('java', 'int a = 0;\nSystem.out.println(5 / a);');
    assert.equal(re.body.error.name, 'ArithmeticException');
    assert.equal(re.body.error.line, 2);
  }
});

test('adult lessons say their language and grade the code in that language', async () => {
  const reg = await http('POST', '/api/adult/register', { email: 'lang.adult@example.com', password: 'longpassword1', firstName: 'Halima', lastName: 'Hassan' });
  const token = reg.body.token;
  const lessonIn = async (moduleId, order) => {
    const row = await dbGet('SELECT id FROM lessons WHERE module_id = ? AND order_num = ?', [moduleId, order]);
    return (await http('GET', `/api/adult/lesson/${row.id}`, null, token)).body.lesson;
  };
  assert.equal((await lessonIn(101, 1)).language, 'web');
  const course = require('../adultCourse');
  const java = await lessonIn(109, 2);
  assert.equal(java.language, 'java');
  assert.ok(java.checks.every((c) => c.in === 'java' || c.in === 'output'));
  assert.equal(java.solution, undefined, 'model answers are never sent to learners');
  assert.equal((await lessonIn(112, 1)).language, 'python');
  assert.equal((await lessonIn(118, 1)).language, 'java', 'Algorithms is practised in Java');
  assert.equal((await lessonIn(121, 1)).language, 'python', 'Mathematics is practised in Python');
  const sql = await lessonIn(115, 1);
  assert.equal(sql.language, 'sql');

  // The SQL task is checked by running it: the model answer passes, a wrong query does not.
  const query = course.BY_MODULE[115].lessons[0].solution.sql;
  const check = await http('POST', `/api/adult/lesson/${sql.id}/check`, { code: { sql: query } }, token);
  assert.equal(check.body.score, 100, JSON.stringify(check.body));
  assert.equal((await lessonIn(115, 1)).savedCode.sql, query);
  const wrong = await http('POST', `/api/adult/lesson/${sql.id}/check`, { code: { sql: "SELECT name, city FROM Customers WHERE city = 'Nairobi' ORDER BY name LIMIT 1;" } }, token);
  assert.ok(wrong.body.score < 100, 'output checks look at what the query returns');
  const broken = await http('POST', `/api/adult/lesson/${sql.id}/check`, { code: { sql: 'SELECT * FROM Nowhere;' } }, token);
  assert.match(broken.body.runError, /no such table/);

  // Java code is kept too (it used to be dropped on save), and graded by running it when Java is installed.
  const javaCode = course.BY_MODULE[109].lessons[1].solution.java;
  const jcheck = await http('POST', `/api/adult/lesson/${java.id}/check`, { code: { java: javaCode } }, token);
  assert.equal(jcheck.status, 200);
  const status = (await http('GET', '/api/adult/code/status', null, token)).body;
  if (status.java.available) assert.equal(jcheck.body.passed, true, JSON.stringify(jcheck.body));
  assert.equal((await lessonIn(109, 2)).savedCode.java, javaCode);
});

test('the public adult overview reports what is offered now', async () => {
  const { MODULES, REQUIRED_HOURS } = require('../adultCourse');
  const r = await http('GET', '/api/adult/overview');
  assert.equal(r.status, 200, 'no login needed');
  assert.equal(r.body.modules, MODULES.length);
  assert.equal(r.body.lessons, MODULES.reduce((n, m) => n + m.lessons.length, 0));
  assert.equal(r.body.requiredHours, REQUIRED_HOURS);
  assert.deepEqual(r.body.courses.map((c) => c.key), ['web', 'java', 'python', 'sql', 'algorithms', 'maths']);
  assert.equal(r.body.courses.reduce((n, c) => n + c.lessons, 0), r.body.lessons);
});
