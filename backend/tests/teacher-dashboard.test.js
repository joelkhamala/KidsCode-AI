'use strict';
/**
 * Regression coverage for teacher classroom actions:
 *  - consent-based enrollment is reversible and role-isolated
 *  - teacher approvals satisfy the child's parent-approval restriction
 *  - teacher reports show only the Kids curriculum and export to CSV
 *  - teacher notifications and account settings
 *
 * Run: node --test tests/teacher-dashboard.test.js
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kidscode-teacher-'));
process.env.KIDSCODE_DB_PATH = path.join(tmpDir, 'test.db');
process.env.JWT_SECRET = 'teacher-dashboard-test-secret';
process.env.AI_PROVIDER = 'offline';
require.cache[require.resolve('sqlite3')] = { id: 'sqlite3', filename: 'sqlite3', loaded: true, exports: require('./sqlite3-shim') };

const app = require('../server');
const { getDb, initializeDatabase } = require('../database');
const parentSupport = require('../parent-support');

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

async function makeTeacher(email) {
  const res = await http('POST', '/api/teacher/register', {
    email, password: 'secret123', firstName: 'Test', lastName: 'Teacher', phoneNumber: '0700000000',
  });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  return res.body;
}

async function makeParent(email) {
  const res = await http('POST', '/api/parent/register', {
    email, password: 'secret123', firstName: 'Test', lastName: 'Parent',
  });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  return res.body.token;
}

async function makeChild(parentToken, username, email, restrictions = {}) {
  const res = await http('POST', '/api/parent/children', {
    username, displayName: username, age: 11, password: 'secret123', email, restrictions,
  }, parentToken);
  assert.equal(res.status, 200, JSON.stringify(res.body));
  const login = await http('POST', '/api/login', { email: email || username, password: 'secret123' });
  assert.equal(login.status, 200, JSON.stringify(login.body));
  return { id: res.body.child.id, token: login.body.token };
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

test('teacher enrollment needs parent consent, can be undone and repeated, and stays role-isolated', async () => {
  const teacher = await makeTeacher('teacher-enroll@example.com');
  const parent = await makeParent('teacher-enroll-parent@example.com');
  const child = await makeChild(parent, 'enrollkid', 'enrollkid@example.com');
  const payload = { studentEmail: 'enrollkid@example.com', className: 'Grade 7' };

  const denied = await http('POST', '/api/teacher/students/enroll', payload, teacher.token);
  assert.equal(denied.status, 403);

  const code = await http('GET', `/api/parent/children/${child.id}/enrollment-code`, undefined, parent);
  assert.equal(code.status, 200);
  const enrolled = await http('POST', '/api/teacher/students/enroll', { ...payload, enrollmentCode: code.body.enrollmentCode }, teacher.token);
  assert.equal(enrolled.status, 200, JSON.stringify(enrolled.body));

  const roster = await http('GET', '/api/teacher/students', undefined, teacher.token);
  assert.equal(roster.status, 200);
  assert.equal(roster.body.children.length, 1);
  assert.equal(roster.body.children[0].className, 'Grade 7');

  const duplicate = await http('POST', '/api/teacher/students/enroll', { ...payload, enrollmentCode: code.body.enrollmentCode }, teacher.token);
  assert.equal(duplicate.status, 400);

  const removed = await http('DELETE', `/api/teacher/students/${child.id}`, undefined, teacher.token);
  assert.equal(removed.status, 200);
  const afterRemoval = await http('GET', '/api/teacher/students', undefined, teacher.token);
  assert.equal(afterRemoval.body.children.length, 0);

  const restored = await http('POST', '/api/teacher/students/enroll', { ...payload, enrollmentCode: code.body.enrollmentCode }, teacher.token);
  assert.equal(restored.status, 200, JSON.stringify(restored.body));
  assert.equal(restored.body.reactivated, true);
  const afterRestore = await http('GET', '/api/teacher/students', undefined, teacher.token);
  assert.equal(afterRestore.body.children.length, 1);

  const childAccess = await http('GET', '/api/teacher/students', undefined, child.token);
  assert.equal(childAccess.status, 403);
  const parentAccess = await http('GET', '/api/teacher/students', undefined, parent);
  assert.equal(parentAccess.status, 403);
});

test('teacher can enrol a child with no email by resolving the parent classroom code', async () => {
  const teacher = await makeTeacher('teacher-noemail@example.com');
  const parent = await makeParent('teacher-noemail-parent@example.com');
  const child = await makeChild(parent, 'noemailkid');
  const code = await http('GET', `/api/parent/children/${child.id}/enrollment-code`, undefined, parent);
  assert.equal(code.status, 200);
  assert.match(code.body.enrollmentCode, /^\d+\.[0-9a-f]{12}$/);

  const wrongRole = await http('POST', '/api/teacher/students/resolve', {
    enrollmentCode: code.body.enrollmentCode,
  }, child.token);
  assert.equal(wrongRole.status, 403);

  const malformed = await http('POST', '/api/teacher/students/resolve', {
    enrollmentCode: 'not-a-code',
  }, teacher.token);
  assert.equal(malformed.status, 404);

  const resolved = await http('POST', '/api/teacher/students/resolve', {
    enrollmentCode: code.body.enrollmentCode,
  }, teacher.token);
  assert.equal(resolved.status, 200, JSON.stringify(resolved.body));
  assert.equal(resolved.body.children.length, 1);
  assert.equal(resolved.body.children[0].id, child.id);
  assert.equal(resolved.body.children[0].enrolled, false);

  // Parents who saved a code before the format change can still use it.
  const legacyCode = crypto.createHmac('sha256', process.env.JWT_SECRET)
    .update(`enroll:${child.id}`).digest('hex').slice(0, 12);
  const legacy = await http('POST', '/api/teacher/students/resolve', {
    enrollmentCode: legacyCode,
  }, teacher.token);
  assert.equal(legacy.status, 200, JSON.stringify(legacy.body));
  assert.equal(legacy.body.children[0].id, child.id);

  const mismatched = await http('POST', '/api/teacher/students/enroll', {
    studentId: child.id + 1, className: 'Grade 4', enrollmentCode: code.body.enrollmentCode,
  }, teacher.token);
  assert.equal(mismatched.status, 404);

  const enrolled = await http('POST', '/api/teacher/students/enroll', {
    studentId: child.id, className: 'Grade 4', enrollmentCode: code.body.enrollmentCode,
  }, teacher.token);
  assert.equal(enrolled.status, 200, JSON.stringify(enrolled.body));
  assert.equal(enrolled.body.student.id, child.id);

  const afterLookup = await http('POST', '/api/teacher/students/resolve', {
    enrollmentCode: code.body.enrollmentCode,
  }, teacher.token);
  assert.equal(afterLookup.body.children[0].enrolled, true);

  const roster = await http('GET', '/api/teacher/students', undefined, teacher.token);
  assert.equal(roster.body.children.length, 1);
  assert.equal(roster.body.children[0].id, child.id);
});

test('teacher approvals unblock a restricted child and appear in the teacher queue', async () => {
  const teacher = await makeTeacher('teacher-approval@example.com');
  const parent = await makeParent('teacher-approval-parent@example.com');
  const child = await makeChild(parent, 'approvalstudent', 'approvalstudent@example.com', { requireParentApproval: true });
  const code = await http('GET', `/api/parent/children/${child.id}/enrollment-code`, undefined, parent);
  const enrolled = await http('POST', '/api/teacher/students/enroll', {
    studentEmail: 'approvalstudent@example.com', className: 'Grade 8', enrollmentCode: code.body.enrollmentCode,
  }, teacher.token);
  assert.equal(enrolled.status, 200, JSON.stringify(enrolled.body));

  const goodCode = 'console.log("My name is Amina");\nconsole.log("I am 11");\nconsole.log("I like science");';
  const blocked = await http('POST', '/api/progress', { module_id: 1, lesson_id: 1, completed: true, last_code: goodCode }, child.token);
  assert.equal(blocked.status, 403);
  assert.equal(blocked.body.code, 'parent_approval_required');

  const request = await http('POST', '/api/lesson-approval/request', { lessonId: 1, moduleId: 1 }, child.token);
  assert.equal(request.status, 200, JSON.stringify(request.body));
  assert.ok(request.body.approvals.some((a) => a.source === 'teacher'));

  const queue = await http('GET', '/api/teacher/approval-requests', undefined, teacher.token);
  assert.equal(queue.status, 200);
  assert.equal(queue.body.requests.length, 1);
  assert.equal(queue.body.requests[0].childName, 'approvalstudent');

  const notes = await http('GET', '/api/teacher/notifications', undefined, teacher.token);
  assert.equal(notes.status, 200);
  assert.ok(notes.body.notifications.some((n) => n.type === 'approval'));

  const teacherRequest = queue.body.requests[0];
  const deniedByOtherTeacher = await http('POST', `/api/teacher/approval-requests/${teacherRequest.id}/respond`, {
    status: 'approved', note: 'Well done',
  }, (await makeTeacher('teacher-approval-other@example.com')).token);
  assert.equal(deniedByOtherTeacher.status, 404);

  const respond = await http('POST', `/api/teacher/approval-requests/${teacherRequest.id}/respond`, {
    status: 'approved', note: 'Well done',
  }, teacher.token);
  assert.equal(respond.status, 200, JSON.stringify(respond.body));

  const check = await http('GET', '/api/lesson-approval/check/1', undefined, child.token);
  assert.equal(check.body.approved, true);
  assert.equal(check.body.approvedBy, 'teacher');

  const allowed = await http('POST', '/api/progress', { module_id: 1, lesson_id: 1, completed: true, last_code: goodCode }, child.token);
  assert.equal(allowed.status, 200, JSON.stringify(allowed.body));

  const readAll = await http('POST', '/api/teacher/notifications/read-all', undefined, teacher.token);
  assert.equal(readAll.status, 200);
  const afterRead = await http('GET', '/api/teacher/notifications', undefined, teacher.token);
  assert.equal(afterRead.body.unread, 0);
});

test('teacher progress and reports exclude adult-only lessons', async () => {
  const teacher = await makeTeacher('teacher-report@example.com');
  const parent = await makeParent('teacher-report-parent@example.com');
  const child = await makeChild(parent, 'reportstudent', 'reportstudent@example.com');
  const code = await http('GET', `/api/parent/children/${child.id}/enrollment-code`, undefined, parent);
  const enrolled = await http('POST', '/api/teacher/students/enroll', {
    studentEmail: 'reportstudent@example.com', className: 'Grade 9', enrollmentCode: code.body.enrollmentCode,
  }, teacher.token);
  assert.equal(enrolled.status, 200, JSON.stringify(enrolled.body));

  const db = getDb();
  await parentSupport.runOne(db,
    `ALTER TABLE modules ADD COLUMN target_audience TEXT DEFAULT 'children'`).catch(() => {});
  await parentSupport.runOne(db,
    `INSERT OR REPLACE INTO modules (id, title, order_num, difficulty, target_audience)
     VALUES (9101, 'Adult Java Course', 99, 'beginner', 'adults')`);
  await parentSupport.runOne(db,
    `INSERT OR REPLACE INTO lessons (id, module_id, title, order_num)
     VALUES (9101, 9101, 'Adult Java Lesson', 1)`);
  for (const [lessonId, moduleId] of [[1, 1], [7, 2], [9101, 9101]]) {
    await parentSupport.runOne(db,
      `INSERT OR REPLACE INTO progress (user_id, module_id, lesson_id, completed, score, updated_at)
       VALUES (?, ?, ?, 1, 90, datetime('now'))`, [child.id, moduleId, lessonId]);
  }

  const progress = await http('GET', `/api/teacher/students/${child.id}/progress`, undefined, teacher.token);
  assert.equal(progress.status, 200, JSON.stringify(progress.body));
  assert.deepEqual(progress.body.progress.progressRecords.map((p) => p.lesson_id), [7, 1].sort((a, b) => a - b));
  assert.equal(progress.body.progress.completedLessons, 2);

  const report = await http('GET', `/api/teacher/students/${child.id}/report`, undefined, teacher.token);
  assert.equal(report.status, 200);
  assert.deepEqual(report.body.progress.map((p) => p.lesson_id), [1, 7]);
  assert.ok(report.body.modules.every((m) => m.id !== 9101));

  const csv = await http('GET', `/api/teacher/students/${child.id}/report.csv`, undefined, teacher.token);
  assert.equal(csv.status, 200);
  assert.ok(csv.body.raw.includes('What is Code?'));
  assert.ok(!csv.body.raw.includes('Adult Java Lesson'));

  const dashboard = await http('GET', '/api/teacher/dashboard', undefined, teacher.token);
  assert.equal(dashboard.status, 200);
  assert.equal(dashboard.body.dashboard.childCount, 1);
  assert.ok(dashboard.body.dashboard.classes.includes('Grade 9'));
  assert.equal(dashboard.body.dashboard.children[0].completedLessons, 2);
});

test('teacher profile and password can be updated safely', async () => {
  const teacher = await makeTeacher('teacher-profile@example.com');
  const profile = await http('GET', '/api/teacher/profile', undefined, teacher.token);
  assert.equal(profile.status, 200);
  assert.equal(profile.body.teacher.firstName, 'Test');

  const updated = await http('PUT', '/api/teacher/profile', {
    firstName: 'Amina', lastName: 'Mwangi', phoneNumber: '0712345678', email: 'teacher-profile@example.com',
  }, teacher.token);
  assert.equal(updated.status, 200, JSON.stringify(updated.body));
  const reloaded = await http('GET', '/api/teacher/profile', undefined, teacher.token);
  assert.equal(reloaded.body.teacher.firstName, 'Amina');

  const badPassword = await http('PUT', '/api/teacher/password', {
    currentPassword: 'wrong', newPassword: 'new-secret-123',
  }, teacher.token);
  assert.equal(badPassword.status, 403);

  const changed = await http('PUT', '/api/teacher/password', {
    currentPassword: 'secret123', newPassword: 'new-secret-123',
  }, teacher.token);
  assert.equal(changed.status, 200, JSON.stringify(changed.body));
  const login = await http('POST', '/api/teacher/login', {
    email: 'teacher-profile@example.com', password: 'new-secret-123',
  });
  assert.equal(login.status, 200);
});
