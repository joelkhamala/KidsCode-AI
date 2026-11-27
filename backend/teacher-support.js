'use strict';

const crypto = require('crypto');

/**
 * Shared helpers for teacher classroom features. Teacher data lives in the
 * same users table as children/parents, but teacher-visible records are always
 * scoped by an active teacher_student_relationships row.
 */

function getAll(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])));
  });
}

function runOne(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function getOne(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row || null)));
  });
}

function enrollmentMac(secret, childId) {
  return crypto.createHmac('sha256', secret).update(`enroll:${childId}`).digest('hex').slice(0, 12);
}

function safeMacEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  } catch {
    return false;
  }
}

function childSummary(row) {
  return { id: row.id, username: row.username, displayName: row.display_name, age: row.age };
}

/** New codes carry the child id so teachers never need an email address. */
function formatEnrollmentCode(secret, childId) {
  return `${childId}.${enrollmentMac(secret, childId)}`;
}

/**
 * Resolve a parent-issued classroom code to the child it authorises.
 * Accepts the new `id.mac` format and legacy 12-hex codes for parents who
 * saved a code before the format change.
 */
async function resolveEnrollmentCode(db, secret, rawCode) {
  const code = String(rawCode || '').trim().toLowerCase();
  if (!code) return [];

  const prefixed = /^(\d{1,10})\.([0-9a-f]{12})$/.exec(code);
  if (prefixed) {
    const childId = Number(prefixed[1]);
    if (!Number.isSafeInteger(childId) || childId <= 0) return [];
    if (!safeMacEqual(prefixed[2], enrollmentMac(secret, childId))) return [];
    const child = await getOne(db,
      "SELECT id, username, display_name, age FROM users WHERE id = ? AND account_type = 'child'", [childId]);
    return child ? [childSummary(child)] : [];
  }

  if (!/^[0-9a-f]{12}$/.test(code)) return [];
  const children = await getAll(db,
    "SELECT id, username, display_name, age FROM users WHERE account_type = 'child'");
  return children
    .filter((child) => safeMacEqual(code, enrollmentMac(secret, child.id)))
    .map(childSummary);
}

/** Teachers allowed to respond to this child's lesson requests. */
async function approvalTeachersFor(db, childId) {
  return getAll(db,
    `SELECT teacher_id FROM teacher_student_relationships
     WHERE student_id = ? AND status = 'active' AND can_approve_lessons = 1`,
    [childId]);
}

/** In-app teacher notification; no email provider is required. */
async function notifyTeacher(db, teacherId, type, title, body, data = {}) {
  const result = await runOne(db,
    `INSERT INTO teacher_notifications (teacher_id, type, title, body, data_json)
     VALUES (?, ?, ?, ?, ?)`,
    [teacherId, type, title, body, JSON.stringify(data || {})]);
  return result.lastID;
}

module.exports = {
  approvalTeachersFor,
  notifyTeacher,
  formatEnrollmentCode,
  resolveEnrollmentCode,
};
