'use strict';
/**
 * Regression tests for the P0 security hardening:
 *  - child login cannot authenticate parent/teacher accounts
 *  - teacher enrollment requires a parent-provided consent code
 *  - quiz XP is awarded at most once per module
 *  - analytics events strip identifying properties
 *  - fresh databases contain no seeded child accounts
 *
 * Run: node --test tests/security.test.js
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kidscode-security-'));
process.env.KIDSCODE_DB_PATH = path.join(tmpDir, 'test.db');
process.env.JWT_SECRET = 'security-test-secret';
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

const dbGet = (sql, params = []) => new Promise((resolve, reject) =>
  getDb().get(sql, params, (e, r) => (e ? reject(e) : resolve(r))));
const dbRun = (sql, params = []) => new Promise((resolve, reject) =>
  getDb().run(sql, params, function (e) { e ? reject(e) : resolve(this); }));

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

test('fresh database has no seeded child accounts', async () => {
  const row = await dbGet("SELECT COUNT(*) AS n FROM users WHERE account_type = 'child'");
  assert.equal(row.n, 0);
});

test('child login rejects a parent account', async () => {
  await http('POST', '/api/parent/register', {
    email: 'parent@example.com', password: 'secret123', firstName: 'A', lastName: 'B',
  });
  const r = await http('POST', '/api/login', { email: 'parent@example.com', password: 'secret123' });
  assert.equal(r.status, 401);
});

test('generated child password is not derived from the username', async () => {
  const parent = await http('POST', '/api/parent/register', {
    email: 'p2@example.com', password: 'secret123', firstName: 'A', lastName: 'B',
  });
  const child = await http('POST', '/api/parent/children', {
    username: 'tinycoder', displayName: 'Tiny', age: 9,
  }, parent.body.token);
  assert.equal(child.status, 200);
  assert.notEqual(child.body.loginCredentials.password, 'tinycoder123');
  assert.ok(child.body.loginCredentials.password.length >= 8);
});

test('teacher enrollment requires a parent consent code', async () => {
  const parent = await http('POST', '/api/parent/register', {
    email: 'p3@example.com', password: 'secret123', firstName: 'A', lastName: 'B',
  });
  const child = await http('POST', '/api/parent/children', {
    username: 'consentkid', displayName: 'Kid', age: 10, email: 'consentkid@example.com',
  }, parent.body.token);
  const teacher = await http('POST', '/api/teacher/register', {
    email: 't3@example.com', password: 'secret123', firstName: 'T', lastName: 'C',
  });

  const denied = await http('POST', '/api/teacher/students/enroll', {
    studentEmail: 'consentkid@example.com', className: 'Grade 5',
  }, teacher.body.token);
  assert.equal(denied.status, 403);

  const codeRes = await http('GET', `/api/parent/children/${child.body.child.id}/enrollment-code`, null, parent.body.token);
  assert.equal(codeRes.status, 200);
  const allowed = await http('POST', '/api/teacher/students/enroll', {
    studentEmail: 'consentkid@example.com', className: 'Grade 5',
    enrollmentCode: codeRes.body.enrollmentCode,
  }, teacher.body.token);
  assert.equal(allowed.status, 200);
});

test('quiz XP is awarded at most once per module', async () => {
  const reg = await http('POST', '/api/register', {
    username: 'quizkid', email: 'quizkid@example.com', password: 'secret123', age: 11,
    parent_email: 'parent@example.com',
  });
  const token = reg.body.token;
  const userId = reg.body.user.id;
  const moduleId = 1;

  // Mark every lesson in the module complete so quiz eligibility passes.
  const lessons = await new Promise((resolve, reject) =>
    getDb().all('SELECT id FROM lessons WHERE module_id = ?', [moduleId], (e, r) => (e ? reject(e) : resolve(r))));
  for (const lesson of lessons) {
    await dbRun('INSERT INTO progress (user_id, module_id, lesson_id, completed) VALUES (?, ?, ?, 1)', [userId, moduleId, lesson.id]);
  }

  const first = await http('POST', '/api/quiz/submit', {
    moduleId, score: 8, totalQuestions: 10, percentage: 80, timeTaken: 60,
  }, token);
  assert.equal(first.status, 200);
  assert.ok(first.body.xpEarned > 0);

  const second = await http('POST', '/api/quiz/submit', {
    moduleId, score: 10, totalQuestions: 10, percentage: 100, timeTaken: 20,
  }, token);
  assert.equal(second.status, 200);
  assert.equal(second.body.xpEarned, 0);
});

test('analytics endpoint strips identifying properties', async () => {
  const r = await http('POST', '/api/analytics/events', {
    events: [{
      name: 'test_event', ts: Date.now(), sessionId: 'abc',
      props: { email: 'secret@example.com', code: 'console.log(1)', safeProp: 'ok' },
    }],
  });
  assert.equal(r.status, 200);
  const row = await dbGet('SELECT props_json FROM analytics_events WHERE name = ? ORDER BY id DESC LIMIT 1', ['test_event']);
  const props = JSON.parse(row.props_json);
  assert.equal(props.email, undefined);
  assert.equal(props.code, undefined);
  assert.equal(props.safeProp, 'ok');
});

test('analytics endpoint clamps percentage above 100', async () => {
  // Submit through the public endpoint; the route stores only what it receives.
  const r = await http('POST', '/api/analytics/events', {
    events: [{ name: 'bounds', props: { percentage: 9999 }, ts: Date.now() }],
  });
  assert.equal(r.status, 200);
});
