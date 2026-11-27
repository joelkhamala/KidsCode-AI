'use strict';
/**
 * Regression coverage for the parent-account workstream:
 *  - server-enforced restrictions and lesson approvals
 *  - parent/teacher tokens cannot use child-only write routes
 *  - parent notifications, profile, preferences and reports
 *  - invite-code linking/unlink that preserves the child account
 *  - return-to-parent session after switching into a child
 *
 * Run: node --test tests/parent-improvements.test.js
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kidscode-parent-'));
process.env.KIDSCODE_DB_PATH = path.join(tmpDir, 'test.db');
process.env.JWT_SECRET = 'parent-improvements-test-secret';
process.env.AI_PROVIDER = 'offline';
require.cache[require.resolve('sqlite3')] = { id: 'sqlite3', filename: 'sqlite3', loaded: true, exports: require('./sqlite3-shim') };

const app = require('../server');
const { initializeDatabase } = require('../database');

let server;
let base;

async function http(method, url, body, token) {
  const res = await fetch(base + url, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: res.status, body: json, type: res.headers.get('content-type') || '' };
}

async function makeParent(email) {
  const r = await http('POST', '/api/parent/register', {
    email, password: 'secret123', firstName: 'Test', lastName: 'Parent',
  });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  return r.body.token;
}

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

test('parent tokens cannot use child-only write routes', async () => {
  const parent = await makeParent('isolate@example.com');
  const checks = [
    await http('GET', '/api/progress', undefined, parent),
    await http('POST', '/api/run-code', { code: 'console.log(1)' }, parent),
    await http('POST', '/api/social/friends/request', { friendId: 1 }, parent),
    await http('POST', '/api/ai/tutor', { message: 'hello' }, parent),
    await http('POST', '/api/code-history', { code: 'console.log(1)' }, parent),
  ];
  for (const r of checks) assert.equal(r.status, 403, JSON.stringify(r.body));
});

test('lesson approval is enforced by the server and generates a parent notification', async () => {
  const parent = await makeParent('approval@example.com');
  const child = await http('POST', '/api/parent/children', {
    username: 'approvalkid', displayName: 'Approval Kid', age: 10, password: 'secret123',
    restrictions: { requireParentApproval: true },
  }, parent);
  assert.equal(child.status, 200, JSON.stringify(child.body));

  const login = await http('POST', '/api/login', { email: 'approvalkid', password: 'secret123' });
  assert.equal(login.status, 200);
  const childToken = login.body.token;

  const good = 'console.log("My name is Wanjiru");\nconsole.log("I am 11");\nconsole.log("I like maths");';
  const blocked = await http('POST', '/api/progress', {
    module_id: 1, lesson_id: 1, completed: true, last_code: good,
  }, childToken);
  assert.equal(blocked.status, 403);
  assert.equal(blocked.body.code, 'parent_approval_required');

  const request = await http('POST', '/api/lesson-approval/request', { lessonId: 1, moduleId: 1 }, childToken);
  assert.equal(request.status, 200, JSON.stringify(request.body));

  const notes = await http('GET', '/api/parent/notifications', undefined, parent);
  assert.equal(notes.status, 200);
  assert.ok(notes.body.notifications.some((n) => n.type === 'approval'));

  const notePrefs = await http('PUT', '/api/parent/notification-preferences', {
    achievementAlerts: false, weeklyReports: true, reportDay: 'monday', reportTime: '09:30',
  }, parent);
  assert.equal(notePrefs.status, 200);
  const savedPrefs = await http('GET', '/api/parent/notification-preferences', undefined, parent);
  assert.equal(savedPrefs.body.preferences.achievementAlerts, false);
  assert.equal(savedPrefs.body.preferences.reportDay, 'monday');

  const respond = await http('POST', `/api/parent/approval-requests/${request.body.approval.id}/respond`, {
    status: 'approved', note: 'Great work!',
  }, parent);
  assert.equal(respond.status, 200, JSON.stringify(respond.body));

  const allowed = await http('POST', '/api/progress', {
    module_id: 1, lesson_id: 1, completed: true, last_code: good,
  }, childToken);
  assert.equal(allowed.status, 200, JSON.stringify(allowed.body));
  assert.equal(allowed.body.xpEarned > 0, true);

  const lessonNotes = await http('GET', '/api/parent/notifications', undefined, parent);
  assert.ok(lessonNotes.body.notifications.some((n) => n.type === 'lesson'));
});

test('daily minute limit blocks code execution and lesson checks', async () => {
  const parent = await makeParent('limit@example.com');
  const child = await http('POST', '/api/parent/children', {
    username: 'limitedkid', displayName: 'Limited Kid', age: 10, password: 'secret123',
    restrictions: { maxDailyMinutes: 0 },
  }, parent);
  assert.equal(child.status, 200);
  const login = await http('POST', '/api/login', { email: 'limitedkid', password: 'secret123' });
  const token = login.body.token;

  const own = await http('GET', '/api/child/restrictions', undefined, token);
  assert.equal(own.status, 200);
  assert.equal(own.body.restrictions.maxDailyMinutes, 0);

  const run = await http('POST', '/api/run-code', { code: 'console.log(1)' }, token);
  assert.equal(run.status, 403);
  assert.equal(run.body.code, 'time_limit_reached');

  const check = await http('POST', '/api/lessons/1/check', { code: 'console.log(1)' }, token);
  assert.equal(check.status, 403);
  assert.equal(check.body.code, 'time_limit_reached');
});

test('restrictions are validated and stored as one editable row', async () => {
  const parent = await makeParent('restrictions@example.com');
  const child = await http('POST', '/api/parent/children', {
    username: 'ruleskid', displayName: 'Rules Kid', age: 10, password: 'secret123',
  }, parent);
  const id = child.body.child.id;

  const badCreate = await http('POST', '/api/parent/children', {
    username: 'badruleskid', displayName: 'Bad Rules Kid', age: 10, password: 'secret123',
    restrictions: { maxDailyMinutes: 9999 },
  }, parent);
  assert.equal(badCreate.status, 400);

  const bad = await http('POST', `/api/parent/children/${id}/restrictions`, {
    maxDailyMinutes: 9999, allowedDays: ['someday'],
  }, parent);
  assert.equal(bad.status, 400);

  const good = await http('PUT', `/api/parent/children/${id}/restrictions`, {
    maxDailyMinutes: 45, allowedDays: ['monday', 'wednesday'], contentFilters: ['no chat'],
    requireParentApproval: false,
  }, parent);
  assert.equal(good.status, 200, JSON.stringify(good.body));
  assert.equal(good.body.restrictions.maxDailyMinutes, 45);

  const read = await http('GET', `/api/parent/children/${id}/restrictions`, undefined, parent);
  assert.deepEqual(read.body.restrictions.allowedDays, ['monday', 'wednesday']);

  const removed = await http('DELETE', `/api/parent/children/${id}/restrictions`, undefined, parent);
  assert.equal(removed.status, 200);
  const empty = await http('GET', `/api/parent/children/${id}/restrictions`, undefined, parent);
  assert.equal(empty.body.restrictions, null);
});

test('parent profile, password change, reports and switch-back work', async () => {
  const parent = await makeParent('profile@example.com');
  const profile = await http('GET', '/api/parent/profile', undefined, parent);
  assert.equal(profile.status, 200);
  assert.equal(profile.body.parent.email, 'profile@example.com');

  const updated = await http('PUT', '/api/parent/profile', {
    firstName: 'Amina', lastName: 'Kamau', phoneNumber: '0712345678', email: 'profile@example.com',
  }, parent);
  assert.equal(updated.status, 200);

  const changed = await http('PUT', '/api/parent/password', {
    currentPassword: 'secret123', newPassword: 'newsecret123',
  }, parent);
  assert.equal(changed.status, 200);
  const relogin = await http('POST', '/api/parent/login', { email: 'profile@example.com', password: 'newsecret123' });
  assert.equal(relogin.status, 200);
  const freshParent = relogin.body.token;

  const child = await http('POST', '/api/parent/children', {
    username: 'reportkid', displayName: 'Report Kid', age: 11, password: 'secret123',
  }, freshParent);
  const id = child.body.child.id;

  const report = await http('GET', `/api/parent/children/${id}/report`, undefined, freshParent);
  assert.equal(report.status, 200);
  assert.equal(report.body.child.id, id);
  assert.ok(Array.isArray(report.body.modules));

  const csv = await http('GET', `/api/parent/children/${id}/report.csv`, undefined, freshParent);
  assert.equal(csv.status, 200);
  assert.match(csv.type, /text\/csv/);
  assert.match(csv.body.raw, /Section/);

  const switched = await http('POST', `/api/parent/switch-child/${id}`, undefined, freshParent);
  assert.equal(switched.status, 200);
  assert.ok(switched.body.returnToken);
  const restored = await http('GET', '/api/parent/profile', undefined, switched.body.returnToken);
  assert.equal(restored.status, 200);
  assert.equal(restored.body.parent.firstName, 'Amina');
});

test('invite-code linking preserves the child and unlink removes only access', async () => {
  const parent = await makeParent('linker@example.com');
  const childReg = await http('POST', '/api/register', {
    username: 'independentkid', email: 'independent@example.com', password: 'secret123', age: 14,
  });
  assert.equal(childReg.status, 200);
  const childToken = childReg.body.token;

  const denied = await http('GET', `/api/parent/children/${childReg.body.user.id}`, undefined, parent);
  assert.equal(denied.status, 403);

  const codeRes = await http('GET', '/api/child/parent-invite-code', undefined, childToken);
  assert.equal(codeRes.status, 200);
  assert.match(codeRes.body.inviteCode, /^\d+\.[a-f0-9]{12}$/i);

  const badLink = await http('POST', '/api/parent/children/link', { code: '1.deadbeef0000' }, parent);
  assert.equal(badLink.status, 400);

  const link = await http('POST', '/api/parent/children/link', { code: codeRes.body.inviteCode }, parent);
  assert.equal(link.status, 200, JSON.stringify(link.body));
  const visible = await http('GET', `/api/parent/children/${childReg.body.user.id}`, undefined, parent);
  assert.equal(visible.status, 200);
  assert.equal(visible.body.child.id, childReg.body.user.id);

  const linkedParents = await http('GET', '/api/child/parent-invite-code', undefined, childToken);
  assert.equal(linkedParents.body.linkedParents.length, 1);

  const unlink = await http('DELETE', `/api/parent/children/${childReg.body.user.id}/link`, undefined, parent);
  assert.equal(unlink.status, 200);
  const gone = await http('GET', `/api/parent/children/${childReg.body.user.id}`, undefined, parent);
  assert.equal(gone.status, 403);
  const stillCanLogIn = await http('POST', '/api/login', { email: 'independent@example.com', password: 'secret123' });
  assert.equal(stillCanLogIn.status, 200);
});
