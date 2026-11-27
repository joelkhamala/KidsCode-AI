'use strict';
/**
 * Adult learner friends & study circle.
 *
 * Mounted inside the adult-only router at /api/adult/friends, so a child, parent or
 * teacher token can never reach it. Everything here is derived from real adult
 * learning records (progress, assessments, certificates and study time) plus the
 * social tables created in database.js.
 *
 * Adults get: discover/search, friend requests (with a short note), mutual friend
 * list and profile, privacy controls, study feed, direct messages, cheers, weekly
 * goals and check-ins, friend leaderboard, notifications, block and report.
 */
const express = require('express');
const course = require('./adultCourse');
const { getDb } = require('./database');

const all = (sql, p = []) => new Promise((res, rej) => getDb().all(sql, p, (e, r) => (e ? rej(e) : res(r || []))));
const get = (sql, p = []) => new Promise((res, rej) => getDb().get(sql, p, (e, r) => (e ? rej(e) : res(r))));
const run = (sql, p = []) => new Promise((res, rej) => getDb().run(sql, p, function done(e) { if (e) rej(e); else res(this); }));
const fail = (status, message, code) => Object.assign(new Error(message), { status, code });
const clean = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '') || '';
const parseJson = (s, d) => { try { return JSON.parse(s); } catch { return d; } };
const asId = (v, label = 'id') => {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw fail(400, `Invalid ${label}`);
  return n;
};
const convId = (a, b) => [Number(a), Number(b)].sort((x, y) => x - y).join(':');
const pair = (a, b) => [Math.min(Number(a), Number(b)), Math.max(Number(a), Number(b))];

const CHEERS = ['high_five', 'star', 'keep_going', 'well_done', 'code_today'];
const REPORT_REASONS = ['harassment', 'spam', 'impersonation', 'inappropriate', 'other'];
const PRIVACY_DEFAULTS = { allow_search: 1, show_progress: 1, show_activity: 1, allow_messages: 1 };

/** Monday of the current UTC week, as YYYY-MM-DD. */
function currentWeekStart() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

/** Light per-user budgets; disabled outside production so dev/tests are never throttled. */
const budgets = new Map();
function allowAction(userId, action, max, windowMs = 60000) {
  if (process.env.NODE_ENV !== 'production') return true;
  const key = `${userId}:${action}`;
  const now = Date.now();
  const recent = (budgets.get(key) || []).filter((t) => now - t < windowMs);
  if (recent.length >= max) { budgets.set(key, recent); return false; }
  recent.push(now);
  budgets.set(key, recent);
  if (budgets.size > 2000) for (const [k, v] of budgets) if (!v.some((t) => now - t < windowMs)) budgets.delete(k);
  return true;
}

function createAdultFriendsRouter({ ensureReady, summary, courseStatuses }) {
  const router = express.Router();
  const wrap = (fn) => async (req, res) => {
    try {
      await ensureReady();
      res.json(await fn(req, res));
    } catch (err) {
      if (!err.status) console.error('Adult friends route error:', err);
      res.status(err.status || 500).json({
        error: err.status ? err.message : 'Something went wrong. Please try again.',
        code: err.code,
        ...(err.status && err.details ? err.details : {}),
      });
    }
  };
  const me = (req) => asId(req.user?.id, 'account');
  const limitOf = (v, fallback, max = 100) => Math.max(1, Math.min(max, Number(v) || fallback));

  const throttle = (action, max, windowMs) => (req, res, next) => (
    allowAction(me(req), action, max, windowMs)
      ? next()
      : res.status(429).json({ error: 'Too many requests. Please wait a moment and try again.' })
  );

  async function assertAdult(userId) {
    const u = await get("SELECT id FROM users WHERE id = ? AND account_type = 'adult_learner'", [userId]);
    if (!u) throw fail(404, 'Adult learner not found');
    return u;
  }

  async function privacyOf(userId) {
    const row = await get('SELECT * FROM adult_friend_privacy WHERE user_id = ?', [userId]);
    if (row) return { ...PRIVACY_DEFAULTS, ...row };
    await run('INSERT OR IGNORE INTO adult_friend_privacy (user_id) VALUES (?)', [userId]);
    return { ...PRIVACY_DEFAULTS, user_id: userId };
  }

  async function blocked(a, b) {
    return Boolean(await get(
      'SELECT 1 FROM adult_blocks WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?) LIMIT 1',
      [a, b, b, a],
    ));
  }

  async function assertAvailable(viewer, target) {
    await assertAdult(target);
    if (await blocked(viewer, target)) throw fail(403, 'This learner is not available', 'blocked');
  }

  async function friendIds(userId) {
    const rows = await all('SELECT user_a_id, user_b_id FROM adult_friendships WHERE user_a_id = ? OR user_b_id = ?', [userId, userId]);
    return rows.map((r) => (r.user_a_id === userId ? r.user_b_id : r.user_a_id));
  }

  async function assertFriends(a, b) {
    const [x, y] = pair(a, b);
    if (!(await get('SELECT 1 FROM adult_friendships WHERE user_a_id = ? AND user_b_id = ?', [x, y]))) {
      throw fail(403, 'You can do this with friends only', 'not_friends');
    }
  }

  async function notifyUser(userId, type, actorId, data = {}) {
    if (!userId || userId === actorId) return;
    await run(
      'INSERT INTO adult_friend_notifications (user_id, type, actor_id, data_json) VALUES (?, ?, ?, ?)',
      [userId, type, actorId, JSON.stringify(data).slice(0, 4000)],
    );
  }

  async function personOf(userId, viewerId, withStats = true) {
    const row = await get(
      `SELECT u.id, u.first_name, u.last_name, u.last_active, u.created_at,
              p.occupation, p.education_level, p.learning_goals
         FROM users u LEFT JOIN adult_learner_profiles p ON p.user_id = u.id
        WHERE u.id = ? AND u.account_type = 'adult_learner'`,
      [userId],
    );
    if (!row) return null;
    const privacy = await privacyOf(userId);
    const name = `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'Learner';
    const person = {
      id: row.id,
      name,
      initials: `${row.first_name?.[0] || ''}${row.last_name?.[0] || ''}`.toUpperCase() || 'AL',
      occupation: privacy.show_progress ? row.occupation : null,
      educationLevel: privacy.show_progress ? row.education_level : null,
      learningGoals: privacy.show_progress ? row.learning_goals : null,
      lastActive: row.last_active,
      joined: row.created_at,
      isYou: userId === viewerId,
    };
    if (withStats) {
      if (privacy.show_progress) {
        const s = await summary(userId);
        const courses = await courseStatuses(userId, s);
        person.stats = {
          lessons: s.completedLessons,
          totalLessons: s.totalLessons,
          progress: s.progressPercentage,
          hours: s.hoursLogged,
          averageScore: s.averageScore,
          certificates: courses.filter((c) => c.certificate).length,
        };
      } else {
        person.stats = null;
        person.private = true;
      }
    }
    if (viewerId && userId !== viewerId) {
      person.mutual = await mutualCount(viewerId, userId);
      person.status = await relationOf(viewerId, userId);
    } else {
      person.mutual = 0;
      person.status = 'self';
    }
    return person;
  }

  async function mutualCount(a, b) {
    const [mine, theirs] = await Promise.all([friendIds(a), friendIds(b)]);
    const set = new Set(theirs);
    return mine.filter((id) => id !== a && id !== b && set.has(id)).length;
  }

  async function relationOf(viewer, target) {
    const [x, y] = pair(viewer, target);
    if (await get('SELECT 1 FROM adult_friendships WHERE user_a_id = ? AND user_b_id = ?', [x, y])) return 'friend';
    const req = await get(
      `SELECT from_user_id, status FROM adult_friend_requests
        WHERE (from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?)
        ORDER BY id DESC LIMIT 1`,
      [viewer, target, target, viewer],
    );
    if (req?.status === 'pending') return req.from_user_id === viewer ? 'outgoing' : 'incoming';
    return 'none';
  }

  async function createFriendship(a, b) {
    const [x, y] = pair(a, b);
    await run('INSERT OR IGNORE INTO adult_friendships (user_a_id, user_b_id) VALUES (?, ?)', [x, y]);
    await run(
      "UPDATE adult_friend_requests SET status = 'accepted', responded_at = datetime('now') WHERE id = (SELECT id FROM adult_friend_requests WHERE (from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?) ORDER BY id DESC LIMIT 1)",
      [a, b, b, a],
    );
  }

  async function activityFor(userId, limit) {
    const events = [];
    const lessons = await all(
      `SELECT p.lesson_id AS id, l.title, p.updated_at AS at FROM progress p
         JOIN lessons l ON l.id = p.lesson_id
        WHERE p.user_id = ? AND p.completed = 1
        ORDER BY p.updated_at DESC LIMIT ?`,
      [userId, limit],
    );
    for (const r of lessons) events.push({ type: 'lesson', at: r.at, data: { title: r.title, lessonId: r.id } });

    const assessments = await all(
      `SELECT a.lesson_id AS lessonId, l.title, a.assessment_type AS kind, a.percentage AS percent, a.completed_at AS at
         FROM assessment_results a JOIN lessons l ON l.id = a.lesson_id
        WHERE a.user_id = ? AND a.passed = 1
        ORDER BY a.completed_at DESC LIMIT ?`,
      [userId, limit],
    );
    for (const r of assessments) events.push({ type: 'assessment', at: r.at, data: { title: r.title, kind: r.kind, percent: r.percent } });

    const certs = await all('SELECT course_id, issue_date AS at FROM certificates WHERE user_id = ? ORDER BY issue_date DESC LIMIT ?', [userId, limit]);
    for (const r of certs) {
      const c = course.COURSES.find((x) => x.id === Number(r.course_id)) || course.COURSES[0];
      events.push({ type: 'certificate', at: r.at, data: { title: c ? c.title : 'course' } });
    }

    const checkins = await all('SELECT day, note, minutes, created_at AS at FROM adult_study_checkins WHERE user_id = ? ORDER BY created_at DESC LIMIT ?', [userId, limit]);
    for (const r of checkins) events.push({ type: 'checkin', at: r.at, data: { note: r.note, minutes: r.minutes, day: r.day } });

    const cheers = await all(
      `SELECT c.kind, c.note, c.created_at AS at, u.first_name, u.last_name,
              CASE WHEN c.from_user_id = ? THEN c.to_user_id ELSE c.from_user_id END AS other_id
         FROM adult_friend_cheers c JOIN users u ON u.id = c.from_user_id
        WHERE c.from_user_id = ? OR c.to_user_id = ?
        ORDER BY c.created_at DESC LIMIT ?`,
      [userId, userId, userId, limit],
    );
    for (const r of cheers) {
      events.push({
        type: 'cheer',
        at: r.at,
        data: { kind: r.kind, note: r.note, name: `${r.first_name || ''} ${r.last_name || ''}`.trim(), otherId: r.other_id, outgoing: r.other_id !== userId },
      });
    }

    const friends = await all(
      `SELECT f.created_at AS at, f.user_a_id, f.user_b_id, u.first_name, u.last_name
         FROM adult_friendships f JOIN users u ON u.id = CASE WHEN f.user_a_id = ? THEN f.user_b_id ELSE f.user_a_id END
        WHERE f.user_a_id = ? OR f.user_b_id = ?
        ORDER BY f.created_at DESC LIMIT ?`,
      [userId, userId, userId, limit],
    );
    for (const r of friends) {
      events.push({ type: 'friend', at: r.at, data: { name: `${r.first_name || ''} ${r.last_name || ''}`.trim(), friendId: r.user_a_id === userId ? r.user_b_id : r.user_a_id } });
    }
    return events;
  }

  async function feedFor(viewerId, limit) {
    const friends = await friendIds(viewerId);
    const visible = [viewerId];
    for (const id of friends) {
      const p = await privacyOf(id);
      if (p.show_activity) visible.push(id);
    }
    const each = Math.max(8, Math.ceil(limit / Math.max(1, visible.length)) + 5);
    const lists = await Promise.all(visible.map(async (id) => {
      const events = await activityFor(id, each);
      const p = await personOf(id, viewerId, false);
      return events.map((e) => ({ ...e, userId: id, name: p?.name || 'Learner', isYou: id === viewerId }));
    }));
    return lists.flat().sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, limit);
  }

  // ---- summary (used by the page and the navbar badge) -----------------------
  router.get('/summary', wrap(async (req) => {
    const userId = me(req);
    const one = async (sql, p = []) => (await get(sql, p)).n;
    const [friends, incoming, outgoing, messages, notifications, cheers] = await Promise.all([
      one('SELECT COUNT(*) AS n FROM adult_friendships WHERE user_a_id = ? OR user_b_id = ?', [userId, userId]),
      one("SELECT COUNT(*) AS n FROM adult_friend_requests WHERE to_user_id = ? AND status = 'pending'", [userId]),
      one("SELECT COUNT(*) AS n FROM adult_friend_requests WHERE from_user_id = ? AND status = 'pending'", [userId]),
      one('SELECT COUNT(*) AS n FROM adult_friend_messages WHERE recipient_id = ? AND read_at IS NULL AND deleted_by_recipient = 0', [userId]),
      one('SELECT COUNT(*) AS n FROM adult_friend_notifications WHERE user_id = ? AND read_at IS NULL', [userId]),
      one('SELECT COUNT(*) AS n FROM adult_friend_cheers WHERE to_user_id = ? AND read_at IS NULL', [userId]),
    ]);
    return { friends, incoming, outgoing, unreadMessages: messages, unreadNotifications: notifications, unreadCheers: cheers, attention: incoming + messages + cheers };
  }));

  // ---- discover --------------------------------------------------------------
  router.get('/search', throttle('adult_friend_search', 60), wrap(async (req) => {
    const userId = me(req);
    const q = clean(req.query.q, 120);
    if (q.length < 2) return { users: [] };
    const like = `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
    const rows = await all(
      `SELECT u.id FROM users u LEFT JOIN adult_learner_profiles p ON p.user_id = u.id
        WHERE u.account_type = 'adult_learner' AND u.id <> ?
          AND (u.first_name LIKE ? ESCAPE '\\' OR u.last_name LIKE ? ESCAPE '\\'
               OR (u.first_name || ' ' || u.last_name) LIKE ? ESCAPE '\\'
               OR p.occupation LIKE ? ESCAPE '\\' OR p.learning_goals LIKE ? ESCAPE '\\'
               OR lower(u.email) = lower(?))
          AND NOT EXISTS (SELECT 1 FROM adult_friend_privacy pr WHERE pr.user_id = u.id AND pr.allow_search = 0)
          AND NOT EXISTS (SELECT 1 FROM adult_friend_privacy pr WHERE pr.user_id = u.id AND pr.allow_messages = 0)
          AND NOT EXISTS (SELECT 1 FROM adult_blocks b WHERE (b.blocker_id = u.id AND b.blocked_id = ?) OR (b.blocker_id = ? AND b.blocked_id = u.id))
        ORDER BY (lower(u.first_name) LIKE lower(?) OR lower(u.last_name) LIKE lower(?)) DESC, u.first_name, u.last_name
        LIMIT 20`,
      [userId, like, like, like, like, like, q, userId, userId, q, q],
    );
    const users = await Promise.all(rows.map((r) => personOf(r.id, userId, true)));
    return { users: users.filter(Boolean) };
  }));

  // ---- friend requests -------------------------------------------------------
  router.post('/requests', throttle('adult_friend_request', 30, 3600000), wrap(async (req) => {
    const userId = me(req);
    const toUserId = asId(req.body?.toUserId, 'learner');
    const note = clean(req.body?.note, 240);
    if (toUserId === userId) throw fail(400, 'You cannot add yourself');
    await assertAvailable(userId, toUserId);
    const targetPrivacy = await privacyOf(toUserId);
    if (!targetPrivacy.allow_messages) throw fail(403, 'This learner is not accepting requests', 'messages_disabled');
    const [x, y] = pair(userId, toUserId);
    if (await get('SELECT 1 FROM adult_friendships WHERE user_a_id = ? AND user_b_id = ?', [x, y])) {
      throw fail(400, 'You are already friends', 'already_friends');
    }

    const existing = await get(
      `SELECT * FROM adult_friend_requests
        WHERE (from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?)
        ORDER BY id DESC LIMIT 1`,
      [userId, toUserId, toUserId, userId],
    );
    if (existing?.from_user_id === userId && existing.status === 'pending') {
      throw fail(400, 'That request is still waiting', 'already_sent');
    }
    if (existing?.from_user_id === toUserId && existing.status === 'pending') {
      await createFriendship(userId, toUserId);
      await notifyUser(toUserId, 'friend_accepted', userId, {});
      return { status: 'accepted', autoAccepted: true };
    }
    if (existing) {
      await run(
        `UPDATE adult_friend_requests SET from_user_id = ?, to_user_id = ?, status = 'pending', note = ?,
           created_at = datetime('now'), responded_at = NULL WHERE id = ?`,
        [userId, toUserId, note, existing.id],
      );
    } else {
      await run('INSERT INTO adult_friend_requests (from_user_id, to_user_id, note) VALUES (?, ?, ?)', [userId, toUserId, note]);
    }
    await notifyUser(toUserId, 'friend_request', userId, { note });
    return { status: 'pending', autoAccepted: false };
  }));

  router.get('/requests', wrap(async (req) => {
    const userId = me(req);
    const rows = await all(
      `SELECT r.*, u.first_name, u.last_name, p.occupation FROM adult_friend_requests r
         JOIN users u ON u.id = CASE WHEN r.from_user_id = ? THEN r.to_user_id ELSE r.from_user_id END
         LEFT JOIN adult_learner_profiles p ON p.user_id = u.id
        WHERE r.from_user_id = ? OR r.to_user_id = ?
        ORDER BY r.created_at DESC LIMIT 100`,
      [userId, userId, userId],
    );
    const view = (r) => ({
      id: r.id,
      status: r.status,
      note: r.note,
      createdAt: r.created_at,
      respondedAt: r.responded_at,
      direction: r.from_user_id === userId ? 'outgoing' : 'incoming',
      person: {
        id: r.from_user_id === userId ? r.to_user_id : r.from_user_id,
        name: `${r.first_name || ''} ${r.last_name || ''}`.trim(),
        occupation: r.occupation,
      },
    });
    return {
      incoming: rows.filter((r) => r.to_user_id === userId && r.status === 'pending').map(view),
      outgoing: rows.filter((r) => r.from_user_id === userId && r.status === 'pending').map(view),
      history: rows.filter((r) => r.status !== 'pending').map(view).slice(0, 30),
    };
  }));

  router.post('/requests/:id/accept', wrap(async (req) => {
    const userId = me(req);
    const id = asId(req.params.id, 'request');
    const reqRow = await get("SELECT * FROM adult_friend_requests WHERE id = ? AND to_user_id = ? AND status = 'pending'", [id, userId]);
    if (!reqRow) throw fail(404, 'That request is no longer waiting');
    await assertAvailable(userId, reqRow.from_user_id);
    await createFriendship(userId, reqRow.from_user_id);
    await notifyUser(reqRow.from_user_id, 'friend_accepted', userId, {});
    return { success: true };
  }));

  router.post('/requests/:id/decline', wrap(async (req) => {
    const userId = me(req);
    const id = asId(req.params.id, 'request');
    const r = await get("SELECT * FROM adult_friend_requests WHERE id = ? AND to_user_id = ? AND status = 'pending'", [id, userId]);
    if (!r) throw fail(404, 'That request is no longer waiting');
    await run("UPDATE adult_friend_requests SET status = 'declined', responded_at = datetime('now') WHERE id = ?", [id]);
    return { success: true };
  }));

  router.post('/requests/:id/cancel', wrap(async (req) => {
    const userId = me(req);
    const id = asId(req.params.id, 'request');
    const r = await get("SELECT * FROM adult_friend_requests WHERE id = ? AND from_user_id = ? AND status = 'pending'", [id, userId]);
    if (!r) throw fail(404, 'That request is no longer waiting');
    await run("UPDATE adult_friend_requests SET status = 'cancelled', responded_at = datetime('now') WHERE id = ?", [id]);
    return { success: true };
  }));

  // ---- friends & profiles ----------------------------------------------------
  router.get('/friends', wrap(async (req) => {
    const userId = me(req);
    const ids = await friendIds(userId);
    const friends = await Promise.all(ids.map(async (id) => {
      const p = await personOf(id, userId, true);
      const [x, y] = pair(userId, id);
      const f = await get('SELECT created_at FROM adult_friendships WHERE user_a_id = ? AND user_b_id = ?', [x, y]);
      return p ? { ...p, since: f?.created_at } : null;
    }));
    return { friends: friends.filter(Boolean).sort((a, b) => a.name.localeCompare(b.name)) };
  }));

  router.delete('/:friendId', wrap(async (req) => {
    const userId = me(req);
    const friendId = asId(req.params.friendId, 'friend');
    const [x, y] = pair(userId, friendId);
    const r = await run('DELETE FROM adult_friendships WHERE user_a_id = ? AND user_b_id = ?', [x, y]);
    if (!r.changes) throw fail(404, 'You are not friends with this learner');
    return { success: true };
  }));

  router.get('/feed', wrap(async (req) => {
    const userId = me(req);
    return { feed: await feedFor(userId, limitOf(req.query.limit, 30, 100)) };
  }));

  router.get('/leaderboard', wrap(async (req) => {
    const userId = me(req);
    const metric = ['lessons', 'hours', 'score', 'streak'].includes(req.query.metric) ? req.query.metric : 'lessons';
    const ids = [userId, ...(await friendIds(userId))];
    const rows = [];
    for (const id of ids) {
      const privacy = await privacyOf(id);
      if (id !== userId && !privacy.show_progress) continue;
      const s = await summary(id);
      let value = s.completedLessons;
      if (metric === 'hours') {
        if (req.query.period === 'week') {
          const r = await get("SELECT COALESCE(SUM(duration_minutes), 0) AS m FROM learning_hours_log WHERE user_id = ? AND created_at >= date('now', '-7 days')", [id]);
          value = Math.round((r.m / 60) * 10) / 10;
        } else value = s.hoursLogged;
      } else if (metric === 'score') value = s.averageScore;
      else if (metric === 'streak') {
        const r = await get('SELECT streak FROM users WHERE id = ?', [id]);
        const checkins = await get("SELECT COUNT(*) AS n FROM adult_study_checkins WHERE user_id = ? AND day >= date('now', '-7 days')", [id]);
        value = (r?.streak || 0) + (checkins?.n || 0);
      }
      const p = await personOf(id, userId, false);
      rows.push({ ...p, value, isYou: id === userId });
    }
    rows.sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
    return { metric, period: req.query.period === 'week' ? 'week' : 'all', board: rows.map((r, i) => ({ ...r, rank: i + 1 })) };
  }));

  router.get('/goals', wrap(async (req) => {
    const userId = me(req);
    const week = currentWeekStart();
    const mine = await get('SELECT * FROM adult_friend_goals WHERE user_id = ? AND week_start = ?', [userId, week]);
    const minutes = await get("SELECT COALESCE(SUM(duration_minutes), 0) AS m FROM learning_hours_log WHERE user_id = ? AND created_at >= date('now', '-7 days')", [userId]);
    const friends = await Promise.all((await friendIds(userId)).map(async (id) => {
      const privacy = await privacyOf(id);
      if (!privacy.show_progress) return null;
      const goal = await get('SELECT * FROM adult_friend_goals WHERE user_id = ? AND week_start = ?', [id, week]);
      if (!goal) return null;
      const p = await personOf(id, userId, false);
      return { ...p, title: goal.title, targetMinutes: goal.target_minutes };
    }));
    return {
      week,
      mine: mine ? { title: mine.title, description: mine.description, targetMinutes: mine.target_minutes, minutesLogged: minutes.m } : null,
      friends: friends.filter(Boolean),
    };
  }));

  router.put('/goals', wrap(async (req) => {
    const userId = me(req);
    const title = clean(req.body?.title, 120);
    const description = clean(req.body?.description, 500);
    const targetMinutes = Number(req.body?.targetMinutes);
    if (title.length < 3) throw fail(400, 'Give your goal a short title');
    if (!Number.isFinite(targetMinutes) || targetMinutes < 30 || targetMinutes > 6000) {
      throw fail(400, 'Choose a weekly target between 30 and 6000 minutes');
    }
    const week = currentWeekStart();
    await run(
      `INSERT INTO adult_friend_goals (user_id, week_start, title, description, target_minutes)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id, week_start) DO UPDATE SET title = excluded.title,
         description = excluded.description, target_minutes = excluded.target_minutes,
         updated_at = datetime('now')`,
      [userId, week, title, description, Math.round(targetMinutes)],
    );
    return { success: true, week };
  }));

  router.post('/checkins', wrap(async (req) => {
    const userId = me(req);
    const note = clean(req.body?.note, 500);
    const minutesRow = await get("SELECT COALESCE(SUM(duration_minutes), 0) AS m FROM learning_hours_log WHERE user_id = ? AND date(created_at) = date('now')", [userId]);
    const minutes = minutesRow.m || 0;
    await run(
      `INSERT INTO adult_study_checkins (user_id, day, note, minutes)
       VALUES (?, date('now'), ?, ?)
       ON CONFLICT(user_id, day) DO UPDATE SET note = excluded.note, minutes = excluded.minutes`,
      [userId, note, minutes],
    );
    return { success: true, minutes, day: new Date().toISOString().slice(0, 10) };
  }));

  router.get('/cheers', wrap(async (req) => {
    const userId = me(req);
    const rows = await all(
      `SELECT c.*, u.first_name, u.last_name FROM adult_friend_cheers c
         JOIN users u ON u.id = c.from_user_id
        WHERE c.from_user_id = ? OR c.to_user_id = ?
        ORDER BY c.created_at DESC LIMIT ?`,
      [userId, userId, limitOf(req.query.limit, 30)],
    );
    const view = (r) => ({
      id: r.id,
      kind: r.kind,
      note: r.note,
      createdAt: r.created_at,
      outgoing: r.from_user_id === userId,
      otherId: r.from_user_id === userId ? r.to_user_id : r.from_user_id,
      name: `${r.first_name || ''} ${r.last_name || ''}`.trim(),
    });
    return {
      received: rows.filter((r) => r.to_user_id === userId).map(view),
      sent: rows.filter((r) => r.from_user_id === userId).map(view),
    };
  }));

  router.post('/cheers', throttle('adult_friend_cheer', 60), wrap(async (req) => {
    const userId = me(req);
    const toUserId = asId(req.body?.toUserId, 'friend');
    const kind = clean(req.body?.kind, 40);
    const note = clean(req.body?.note, 160);
    const eventKey = clean(req.body?.eventKey, 80);
    if (!CHEERS.includes(kind)) throw fail(400, 'Choose one of the available cheers');
    await assertAvailable(userId, toUserId);
    await assertFriends(userId, toUserId);
    const r = await run(
      'INSERT INTO adult_friend_cheers (from_user_id, to_user_id, kind, note, event_key) VALUES (?, ?, ?, ?, ?)',
      [userId, toUserId, kind, note, eventKey],
    );
    await notifyUser(toUserId, 'cheer', userId, { kind, note });
    return { success: true, id: r.lastID };
  }));

  router.post('/cheers/:id/read', wrap(async (req) => {
    const userId = me(req);
    const id = asId(req.params.id, 'cheer');
    await run("UPDATE adult_friend_cheers SET read_at = datetime('now') WHERE id = ? AND to_user_id = ?", [id, userId]);
    return { success: true };
  }));

  // ---- messages --------------------------------------------------------------
  router.get('/conversations', wrap(async (req) => {
    const userId = me(req);
    const rows = await all(
      `SELECT m.*, CASE WHEN m.sender_id = ? THEN m.recipient_id ELSE m.sender_id END AS friend_id
         FROM adult_friend_messages m
        WHERE (m.sender_id = ? AND m.deleted_by_sender = 0) OR (m.recipient_id = ? AND m.deleted_by_recipient = 0)
        ORDER BY m.id DESC LIMIT 5000`,
      [userId, userId, userId],
    );
    const byFriend = new Map();
    for (const m of rows) {
      if (byFriend.has(m.friend_id)) continue;
      byFriend.set(m.friend_id, {
        id: m.id,
        body: m.body,
        at: m.created_at,
        outgoing: m.sender_id === userId,
        unread: m.recipient_id === userId && !m.read_at ? 1 : 0,
      });
    }
    const conversations = await Promise.all([...byFriend.entries()].map(async ([friendId, last]) => {
      if (await blocked(userId, friendId)) return null;
      const p = await personOf(friendId, userId, false);
      if (!p) return null;
      const unread = (await get('SELECT COUNT(*) AS n FROM adult_friend_messages WHERE sender_id = ? AND recipient_id = ? AND read_at IS NULL AND deleted_by_recipient = 0', [friendId, userId])).n;
      return { friend: p, last, unread };
    }));
    return { conversations: conversations.filter(Boolean) };
  }));

  router.get('/messages/:friendId', wrap(async (req) => {
    const userId = me(req);
    const friendId = asId(req.params.friendId, 'friend');
    await assertAvailable(userId, friendId);
    await assertFriends(userId, friendId);
    const before = Number(req.query.before) || null;
    const rows = await all(
      `SELECT * FROM adult_friend_messages
        WHERE conversation_id = ?
          AND ((sender_id = ? AND deleted_by_sender = 0) OR (recipient_id = ? AND deleted_by_recipient = 0))
          AND (? IS NULL OR id < ?)
        ORDER BY id DESC LIMIT ?`,
      [convId(userId, friendId), userId, userId, before, before, limitOf(req.query.limit, 50, 200)],
    );
    return { messages: rows.reverse().map((m) => ({ ...m, outgoing: m.sender_id === userId })) };
  }));

  router.post('/messages', throttle('adult_friend_message', 60), wrap(async (req) => {
    const userId = me(req);
    const toUserId = asId(req.body?.toUserId, 'friend');
    const body = clean(req.body?.body, 2000);
    if (!body) throw fail(400, 'Write a message first');
    await assertAvailable(userId, toUserId);
    const privacy = await privacyOf(toUserId);
    if (!privacy.allow_messages) throw fail(403, 'This learner is not accepting messages', 'messages_disabled');
    await assertFriends(userId, toUserId);
    const r = await run(
      'INSERT INTO adult_friend_messages (conversation_id, sender_id, recipient_id, body) VALUES (?, ?, ?, ?)',
      [convId(userId, toUserId), userId, toUserId, body],
    );
    await notifyUser(toUserId, 'message', userId, { messageId: r.lastID });
    return { success: true, message: { id: r.lastID, body, createdAt: new Date().toISOString(), outgoing: true } };
  }));

  router.post('/messages/:friendId/read', wrap(async (req) => {
    const userId = me(req);
    const friendId = asId(req.params.friendId, 'friend');
    const r = await run(
      "UPDATE adult_friend_messages SET read_at = datetime('now') WHERE sender_id = ? AND recipient_id = ? AND read_at IS NULL AND deleted_by_recipient = 0",
      [friendId, userId],
    );
    return { success: true, updated: r.changes };
  }));

  router.delete('/messages/:id', wrap(async (req) => {
    const userId = me(req);
    const id = asId(req.params.id, 'message');
    const m = await get('SELECT * FROM adult_friend_messages WHERE id = ?', [id]);
    if (!m || (m.sender_id !== userId && m.recipient_id !== userId)) throw fail(404, 'Message not found');
    if (m.sender_id === userId) {
      if (m.deleted_by_recipient) await run('DELETE FROM adult_friend_messages WHERE id = ?', [id]);
      else await run('UPDATE adult_friend_messages SET deleted_by_sender = 1 WHERE id = ?', [id]);
    } else if (m.deleted_by_sender) await run('DELETE FROM adult_friend_messages WHERE id = ?', [id]);
    else await run('UPDATE adult_friend_messages SET deleted_by_recipient = 1 WHERE id = ?', [id]);
    return { success: true };
  }));

  // ---- notifications ---------------------------------------------------------
  router.get('/notifications', wrap(async (req) => {
    const userId = me(req);
    const rows = await all(
      `SELECT n.*, u.first_name, u.last_name FROM adult_friend_notifications n
         LEFT JOIN users u ON u.id = n.actor_id
        WHERE n.user_id = ?
        ORDER BY n.created_at DESC LIMIT ?`,
      [userId, limitOf(req.query.limit, 50)],
    );
    const unread = (await get('SELECT COUNT(*) AS n FROM adult_friend_notifications WHERE user_id = ? AND read_at IS NULL', [userId])).n;
    return {
      unread,
      notifications: rows.map((n) => ({
        id: n.id,
        type: n.type,
        data: parseJson(n.data_json, {}),
        createdAt: n.created_at,
        readAt: n.read_at,
        actor: n.actor_id ? { id: n.actor_id, name: `${n.first_name || ''} ${n.last_name || ''}`.trim() } : null,
      })),
    };
  }));

  router.post('/notifications/read', wrap(async (req) => {
    const userId = me(req);
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map((x) => asId(x, 'notification')) : [];
    if (ids.length) {
      await run(`UPDATE adult_friend_notifications SET read_at = datetime('now') WHERE user_id = ? AND id IN (${ids.map(() => '?').join(',')})`, [userId, ...ids]);
    } else {
      await run("UPDATE adult_friend_notifications SET read_at = datetime('now') WHERE user_id = ? AND read_at IS NULL", [userId]);
    }
    return { success: true };
  }));

  // ---- privacy, blocking and reports ----------------------------------------
  router.get('/privacy', wrap(async (req) => ({ privacy: await privacyOf(me(req)) })));

  router.put('/privacy', wrap(async (req) => {
    const userId = me(req);
    const b = req.body || {};
    const flag = (v, fallback) => (typeof v === 'boolean' ? (v ? 1 : 0) : fallback);
    const current = await privacyOf(userId);
    await run(
      `INSERT INTO adult_friend_privacy (user_id, allow_search, show_progress, show_activity, allow_messages)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET allow_search = excluded.allow_search,
         show_progress = excluded.show_progress, show_activity = excluded.show_activity,
         allow_messages = excluded.allow_messages, updated_at = datetime('now')`,
      [
        userId,
        flag(b.allowSearch, current.allow_search),
        flag(b.showProgress, current.show_progress),
        flag(b.showActivity, current.show_activity),
        flag(b.allowMessages, current.allow_messages),
      ],
    );
    return { success: true, privacy: await privacyOf(userId) };
  }));

  async function blockUser(blockerId, blockedId, reason) {
    if (blockerId === blockedId) throw fail(400, 'You cannot block yourself');
    await assertAdult(blockedId);
    const [x, y] = pair(blockerId, blockedId);
    await run('DELETE FROM adult_friendships WHERE user_a_id = ? AND user_b_id = ?', [x, y]);
    await run(
      "UPDATE adult_friend_requests SET status = 'cancelled', responded_at = datetime('now') WHERE status = 'pending' AND ((from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?))",
      [blockerId, blockedId, blockedId, blockerId],
    );
    await run('INSERT OR REPLACE INTO adult_blocks (blocker_id, blocked_id, reason, created_at) VALUES (?, ?, ?, datetime(\'now\'))', [blockerId, blockedId, clean(reason, 240)]);
  }

  router.post('/block', throttle('adult_friend_block', 30, 3600000), wrap(async (req) => {
    const userId = me(req);
    const target = asId(req.body?.userId, 'learner');
    await blockUser(userId, target, req.body?.reason);
    return { success: true };
  }));

  router.delete('/block/:userId', wrap(async (req) => {
    const userId = me(req);
    const target = asId(req.params.userId, 'learner');
    await run('DELETE FROM adult_blocks WHERE blocker_id = ? AND blocked_id = ?', [userId, target]);
    return { success: true };
  }));

  router.get('/blocked', wrap(async (req) => {
    const userId = me(req);
    const rows = await all('SELECT blocked_id, reason, created_at FROM adult_blocks WHERE blocker_id = ? ORDER BY created_at DESC', [userId]);
    const users = await Promise.all(rows.map(async (r) => {
      const p = await personOf(r.blocked_id, userId, false);
      return p ? { ...p, reason: r.reason, blockedAt: r.created_at } : null;
    }));
    return { blocked: users.filter(Boolean) };
  }));

  router.post('/report', throttle('adult_friend_report', 20, 3600000), wrap(async (req) => {
    const userId = me(req);
    const target = asId(req.body?.userId, 'learner');
    const reason = clean(req.body?.reason, 40);
    const details = clean(req.body?.details, 500);
    if (!REPORT_REASONS.includes(reason)) throw fail(400, 'Choose a report reason');
    if (target === userId) throw fail(400, 'You cannot report yourself');
    await assertAdult(target);
    await run('INSERT INTO adult_friend_reports (reporter_id, reported_id, reason, details) VALUES (?, ?, ?, ?)', [userId, target, reason, details]);
    if (req.body?.block) await blockUser(userId, target, reason);
    return { success: true };
  }));

  // ---- profile last, so /search, /feed etc. are never swallowed by /:id ------
  router.get('/:friendId', wrap(async (req) => {
    const userId = me(req);
    const friendId = asId(req.params.friendId, 'friend');
    await assertAvailable(userId, friendId);
    const p = await personOf(friendId, userId, true);
    if (!p) throw fail(404, 'Adult learner not found');
    const goal = await get('SELECT title, target_minutes FROM adult_friend_goals WHERE user_id = ? AND week_start = ?', [friendId, currentWeekStart()]);
    const privacy = await privacyOf(friendId);
    return {
      person: p,
      goal: privacy.show_progress && goal ? { title: goal.title, targetMinutes: goal.target_minutes } : null,
      recentActivity: privacy.show_activity ? (await activityFor(friendId, 10)).sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 8) : [],
    };
  }));

  router.get('/:friendId/activity', wrap(async (req) => {
    const userId = me(req);
    const friendId = asId(req.params.friendId, 'friend');
    await assertAvailable(userId, friendId);
    const privacy = await privacyOf(friendId);
    if (!privacy.show_activity) return { activity: [] };
    return { activity: (await activityFor(friendId, limitOf(req.query.limit, 30, 100))).sort((a, b) => new Date(b.at) - new Date(a.at)) };
  }));

  return router;
}

module.exports = { createAdultFriendsRouter, CHEERS, REPORT_REASONS };
