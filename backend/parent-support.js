'use strict';

/**
 * Shared helpers for parent controls. Kept in one place so restrictions are
 * enforced by the API rather than only by the browser.
 */

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function getOne(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });
}

function getAll(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
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

/** Latest restriction row for a child, or null. */
async function restrictionsFor(db, childId) {
  return getOne(db,
    'SELECT * FROM account_restrictions WHERE child_id = ? ORDER BY created_at DESC, id DESC LIMIT 1',
    [childId]) || null;
}

/** Validate restriction input. Throws an Error with a user-facing message. */
function validateRestrictions(body = {}) {
  const out = {};
  if (body.maxDailyMinutes !== undefined && body.maxDailyMinutes !== null && body.maxDailyMinutes !== '') {
    const n = Number(body.maxDailyMinutes);
    if (!Number.isInteger(n) || n < 0 || n > 1440) throw new Error('Daily limit must be 0-1440 minutes');
    out.maxDailyMinutes = n;
  } else {
    out.maxDailyMinutes = null;
  }

  if (body.allowedDays !== undefined && body.allowedDays !== null && body.allowedDays !== '') {
    const days = Array.isArray(body.allowedDays)
      ? body.allowedDays
      : (() => { try { return JSON.parse(body.allowedDays); } catch { return null; } })();
    if (!Array.isArray(days) || !days.every((d) => DAY_NAMES.includes(String(d).toLowerCase()))) {
      throw new Error('Allowed days must be a list of weekdays');
    }
    out.allowedDays = [...new Set(days.map((d) => String(d).toLowerCase()))];
  } else {
    out.allowedDays = null;
  }

  if (body.contentFilters !== undefined && body.contentFilters !== null && body.contentFilters !== '') {
    const filters = Array.isArray(body.contentFilters)
      ? body.contentFilters
      : (() => { try { return JSON.parse(body.contentFilters); } catch { return null; } })();
    if (!Array.isArray(filters) || filters.length > 50 || !filters.every((f) => typeof f === 'string' && f.length <= 60)) {
      throw new Error('Content filters must be a short list of labels');
    }
    out.contentFilters = filters;
  } else {
    out.contentFilters = null;
  }

  out.requireParentApproval = Boolean(body.requireParentApproval);
  return out;
}

/** Save a single active restriction row (upsert) instead of stacking rows. */
async function saveRestrictions(db, childId, parentId, values) {
  const existing = await restrictionsFor(db, childId);
  const params = [
    values.maxDailyMinutes,
    values.allowedDays ? JSON.stringify(values.allowedDays) : null,
    values.contentFilters ? JSON.stringify(values.contentFilters) : null,
    values.requireParentApproval ? 1 : 0,
    parentId,
  ];
  if (existing) {
    await runOne(db,
      `UPDATE account_restrictions SET max_daily_minutes = ?, allowed_days = ?, content_filters = ?,
        require_parent_approval = ?, created_by = ?, updated_at = datetime('now') WHERE id = ?`,
      [...params, existing.id]);
  } else {
    await runOne(db,
      `INSERT INTO account_restrictions
        (child_id, max_daily_minutes, allowed_days, content_filters, require_parent_approval, created_by)
        VALUES (?, ?, ?, ?, ?, ?)`,
      [childId, ...params]);
  }
  return restrictionsFor(db, childId);
}

/** Minutes used today from completed + active session logs. */
async function minutesToday(db, childId) {
  const row = await getOne(db, `
    SELECT COALESCE(SUM(
      CASE WHEN duration_minutes IS NOT NULL THEN duration_minutes
           ELSE MAX(0, CAST((julianday('now') - julianday(login_time)) * 1440 AS INTEGER))
      END
    ), 0) AS minutes
      FROM session_logs
     WHERE user_id = ? AND date(login_time) = date('now')`, [childId]);
  return Number(row?.minutes || 0);
}

/**
 * Server-side policy check. `lessonId` enables the parent-approval gate.
 * Returns { allowed, reason } so callers can respond with 403 and a clear code.
 */
async function checkChildPolicy(db, childId, lessonId = null) {
  const r = await restrictionsFor(db, childId);
  if (!r) return { allowed: true, reason: null };

  if (r.allowed_days) {
    let days = r.allowed_days;
    try { if (typeof days === 'string') days = JSON.parse(days); } catch { days = null; }
    if (Array.isArray(days) && days.length && !days.includes(DAY_NAMES[new Date().getDay()])) {
      return { allowed: false, reason: 'not_allowed_today', restrictions: r };
    }
  }

  if (r.max_daily_minutes != null) {
    const used = await minutesToday(db, childId);
    if (used >= Number(r.max_daily_minutes)) {
      return { allowed: false, reason: 'time_limit_reached', restrictions: r };
    }
  }

  if (lessonId && r.require_parent_approval === 1) {
    const [parentApproval, teacherApproval] = await Promise.all([
      getOne(db, 'SELECT status FROM lesson_approvals WHERE child_id = ? AND lesson_id = ?', [childId, lessonId]),
      getOne(db, 'SELECT status FROM teacher_approval_requests WHERE child_id = ? AND lesson_id = ?', [childId, lessonId]),
    ]);
    const approved = parentApproval?.status === 'approved' || teacherApproval?.status === 'approved';
    if (!approved) {
      return { allowed: false, reason: 'parent_approval_required', restrictions: r };
    }
  }

  return { allowed: true, reason: null, restrictions: r };
}

/** In-app parent notification; respects the achievement_alerts preference. */
async function notifyParent(db, parentId, type, title, body, data = {}) {
  if (type === 'achievement') {
    const prefs = await getOne(db, 'SELECT achievement_alerts FROM notification_preferences WHERE parent_id = ?', [parentId]);
    if (prefs && prefs.achievement_alerts === 0) return null;
  }
  const result = await runOne(db,
    `INSERT INTO parent_notifications (parent_id, type, title, body, data_json)
     VALUES (?, ?, ?, ?, ?)`,
    [parentId, type, title, body, JSON.stringify(data)]);
  return result.lastID;
}

/** Invite code is <childId>.<HMAC>; the prefix keeps verification O(1). */
function childInviteCode(secret, childId) {
  const mac = require('crypto').createHmac('sha256', secret).update(`child-invite:${childId}`).digest('hex').slice(0, 12);
  return `${childId}.${mac}`;
}

function parseChildInviteCode(secret, code) {
  const match = /^(\d+)\.([a-f0-9]{12})$/i.exec(String(code || '').trim());
  if (!match) return null;
  const id = Number(match[1]);
  const expected = childInviteCode(secret, id).split('.')[1];
  return expected === match[2].toLowerCase() ? id : null;
}

/**
 * Curriculum available to a Kids account. Adult courses share the lessons
 * table but live in modules with target_audience = 'adults', so parent reports
 * must filter by audience before showing any lesson progress.
 */
async function childCurriculum(db) {
  let moduleRows;
  try {
    moduleRows = await getAll(db,
      `SELECT id, title FROM modules
       WHERE target_audience IS NULL OR target_audience IN ('children', 'both')
       ORDER BY order_num, id`);
  } catch (err) {
    // Older databases have no audience column; all their modules are child-safe.
    if (!/no such column/i.test(err.message)) throw err;
    moduleRows = await getAll(db, 'SELECT id, title FROM modules ORDER BY order_num, id');
  }

  const lessons = await getAll(db, 'SELECT id, module_id FROM lessons ORDER BY module_id, order_num, id');
  const moduleIds = new Set(moduleRows.map((m) => Number(m.id)));
  const lessonsByModule = new Map();
  const lessonIds = [];

  lessons.forEach((lesson) => {
    const moduleId = Number(lesson.module_id);
    if (!moduleIds.has(moduleId)) return;
    if (!lessonsByModule.has(moduleId)) lessonsByModule.set(moduleId, []);
    lessonsByModule.get(moduleId).push(Number(lesson.id));
    lessonIds.push(Number(lesson.id));
  });

  const modules = moduleRows
    .map((m) => ({ id: Number(m.id), title: m.title, lessonIds: lessonsByModule.get(Number(m.id)) || [] }))
    .filter((m) => m.lessonIds.length);
  return { modules, lessonIds };
}

/** Keep only progress for lessons that belong to a Kids-account module. */
function filterChildProgress(rows, curriculum) {
  const allowed = new Set((curriculum?.lessonIds || []).map(String));
  return rows.filter((row) => allowed.has(String(row.lesson_id)));
}

/** Completed lessons and average score, restricted to the Kids curriculum. */
async function childProgressSummary(db, childId, curriculum) {
  const activeCurriculum = curriculum || await childCurriculum(db);
  const rows = await getAll(db, 'SELECT lesson_id, completed, score FROM progress WHERE user_id = ?', [childId]);
  const progress = filterChildProgress(rows, activeCurriculum);
  const completed = progress.filter((p) => Number(p.completed) === 1);
  return {
    progress,
    completedLessons: completed.length,
    averageScore: completed.length
      ? Math.round(completed.reduce((n, p) => n + (p.score || 0), 0) / completed.length)
      : 0,
  };
}

module.exports = {
  DAY_NAMES,
  getOne,
  getAll,
  runOne,
  restrictionsFor,
  validateRestrictions,
  saveRestrictions,
  minutesToday,
  checkChildPolicy,
  notifyParent,
  childCurriculum,
  filterChildProgress,
  childProgressSummary,
  childInviteCode,
  parseChildInviteCode,
};
