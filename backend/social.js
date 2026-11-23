'use strict';
/**
 * Friends & Leaderboard ("Social") - built straight from the real learning records, so
 * every number matches the rest of KidsCode:
 *   XP            users.xp (all time), or XP earned in the last 7 / 30 days from the
 *                 records that award XP (AI Coach answers, lessons, quizzes, badges)
 *   lessons       finished lessons on the children's map (quiz results are not lessons)
 *   streak        live coding streak (activity_days, same as the home page)
 *   badges        unlocked badges
 *   activity feed lessons finished, badges, quizzes passed, Coach skills mastered and
 *                 new friendships - for the child and their accepted friends only
 * Only child accounts take part. Children see other children's display name/username,
 * XP and counts - never emails, ages or anything personal.
 */
const express = require('express');
const { getDb } = require('./database');
const { currentStreak } = require('./achievements');
const { BY_ID: CONCEPTS } = require('./ai/concepts');
const { BY_ID: BLOOM } = require('./ai/bloom');

const all = (sql, p = []) => new Promise((res, rej) => getDb().all(sql, p, (e, r) => (e ? rej(e) : res(r || []))));
const get = (sql, p = []) => new Promise((res, rej) => getDb().get(sql, p, (e, r) => (e ? rej(e) : res(r))));
const run = (sql, p = []) => new Promise((res, rej) => getDb().run(sql, p, function done(e) { if (e) rej(e); else res(this); }));

const TIMEFRAMES = { week: 7, month: 30 };
const NOT_QUIZ = "CAST(p.lesson_id AS TEXT) NOT LIKE 'quiz%'";
const marks = (n) => new Array(n).fill('?').join(',');
const levelOf = (xp) => Math.floor((xp || 0) / 200) + 1;

/** Lesson ids on the children's map (falls back to all lessons on older databases). */
async function childLessonIds() {
  try {
    return (await all(`SELECT l.id FROM lessons l JOIN modules m ON m.id = l.module_id
      WHERE m.target_audience IS NULL OR m.target_audience IN ('children', 'both')`)).map((r) => r.id);
  } catch {
    return (await all('SELECT id FROM lessons')).map((r) => r.id);
  }
}

/** Public stats for a set of child accounts: { [id]: {...} } */
async function statsFor(ids) {
  if (!ids.length) return {};
  const lessonIds = await childLessonIds();
  const lessonFilter = lessonIds.length ? `AND p.lesson_id IN (${lessonIds.join(',')})` : `AND ${NOT_QUIZ}`;
  const rows = await all(
    `SELECT u.id, u.username, u.display_name AS displayName, u.xp, u.last_active AS lastActive,
       (SELECT COUNT(*) FROM progress p WHERE p.user_id = u.id AND p.completed = 1 ${lessonFilter}) AS lessons,
       (SELECT COUNT(*) FROM user_achievements ua WHERE ua.user_id = u.id) AS badges
     FROM users u WHERE u.id IN (${marks(ids.length)})`, ids,
  );
  const out = {};
  await Promise.all(rows.map(async (r) => {
    const streak = await currentStreak(r.id).catch(() => 0);
    out[r.id] = {
      id: r.id, username: r.username, name: r.displayName || r.username,
      totalXp: r.xp || 0, level: levelOf(r.xp), lessons: r.lessons || 0, badges: r.badges || 0, streak, lastActive: r.lastActive,
    };
  }));
  return out;
}

/** XP each child earned since `days` days ago, from the records that award XP. */
async function xpSince(days) {
  const since = `-${Number(days)} days`;
  const rows = await all(
    `SELECT user_id, SUM(x) AS xp FROM (
       SELECT user_id, xp_earned AS x FROM ai_activities WHERE status = 'done' AND completed_at >= datetime('now', ?)
       UNION ALL SELECT user_id, xp_earned FROM quiz_results WHERE passed = 1 AND completed_at >= datetime('now', ?)
       UNION ALL SELECT ua.user_id, a.xp_reward FROM user_achievements ua JOIN achievements a ON a.id = ua.achievement_id WHERE ua.unlocked_at >= datetime('now', ?)
       UNION ALL SELECT user_id, final_xp_earned FROM learning_metrics WHERE updated_at >= datetime('now', ?)
       UNION ALL SELECT p.user_id, CAST(p.score * 1.5 AS INTEGER) FROM progress p
         WHERE p.completed = 1 AND ${NOT_QUIZ} AND p.updated_at >= datetime('now', ?)
         AND NOT EXISTS (SELECT 1 FROM learning_metrics lm WHERE lm.user_id = p.user_id AND lm.lesson_id = p.lesson_id)
     ) GROUP BY user_id`, [since, since, since, since, since],
  ).catch(() => []);
  return Object.fromEntries(rows.map((r) => [r.user_id, r.xp || 0]));
}

const childIds = async () => (await all("SELECT id FROM users WHERE account_type = 'child'")).map((r) => r.id);
const friendIds = async (userId) => (await all(
  "SELECT friend_id FROM friendships WHERE user_id = ? AND status = 'accepted'", [userId],
)).map((r) => r.friend_id);

/**
 * Ranked list for a timeframe ('all' | 'week' | 'month') among `ids`.
 * Children with no XP in the timeframe are left out, except the viewer, who always appears.
 */
async function ranking(ids, viewerId, timeframe, limit = 50) {
  const stats = await statsFor(ids);
  const period = TIMEFRAMES[timeframe] ? await xpSince(TIMEFRAMES[timeframe]) : null;
  const list = Object.values(stats)
    .map((s) => ({ ...s, xp: period ? period[s.id] || 0 : s.totalXp, isYou: s.id === viewerId }))
    .filter((s) => s.xp > 0 || s.isYou)
    .sort((a, b) => b.xp - a.xp || b.lessons - a.lessons || a.name.localeCompare(b.name));
  // Same XP -> same place (1, 2, 2, 4...).
  list.forEach((s, i) => { s.rank = i > 0 && s.xp === list[i - 1].xp ? list[i - 1].rank : i + 1; });
  const you = list.find((s) => s.isYou) || null;
  const top = list.slice(0, limit);
  if (you && !top.includes(you)) top.push(you);
  return {
    timeframe: TIMEFRAMES[timeframe] ? timeframe : 'all',
    leaderboard: top,
    you: you ? { rank: you.rank, xp: you.xp, total: list.length, topPercent: Math.max(1, Math.ceil((100 * you.rank) / list.length)) } : null,
    updatedAt: new Date().toISOString(),
  };
}

/** Recent achievements of the child and their friends, newest first. */
async function feedFor(userId, limit = 30) {
  const ids = [userId, ...(await friendIds(userId))];
  const ph = marks(ids.length);
  const lessonIds = await childLessonIds();
  const lessonFilter = lessonIds.length ? `AND p.lesson_id IN (${lessonIds.join(',')})` : `AND ${NOT_QUIZ}`;
  const recent = "datetime('now', '-30 days')";
  const [lessons, badges, quizzes, skills, friends, names] = await Promise.all([
    all(`SELECT p.user_id, p.updated_at AS at, l.title FROM progress p JOIN lessons l ON l.id = p.lesson_id
         WHERE p.user_id IN (${ph}) AND p.completed = 1 ${lessonFilter} AND p.updated_at >= ${recent}`, ids).catch(() => []),
    all(`SELECT ua.user_id, ua.unlocked_at AS at, a.name, a.icon FROM user_achievements ua JOIN achievements a ON a.id = ua.achievement_id
         WHERE ua.user_id IN (${ph}) AND ua.unlocked_at >= ${recent}`, ids).catch(() => []),
    all(`SELECT q.user_id, q.completed_at AS at, q.percentage, m.title FROM quiz_results q LEFT JOIN modules m ON m.id = q.module_id
         WHERE q.user_id IN (${ph}) AND q.passed = 1 AND q.completed_at >= ${recent}`, ids).catch(() => []),
    all(`SELECT user_id, mastered_at AS at, concept_id, bloom_level, language FROM ai_mastery
         WHERE user_id IN (${ph}) AND mastered_at IS NOT NULL AND replace(mastered_at, 'T', ' ') >= ${recent}`, ids).catch(() => []),
    all(`SELECT f.user_id, f.accepted_at AS at, u.display_name AS friendDisplay, u.username AS friendUsername
         FROM friendships f JOIN users u ON u.id = f.friend_id
         WHERE f.user_id IN (${ph}) AND f.status = 'accepted' AND f.accepted_at >= ${recent}`, ids).catch(() => []),
    all(`SELECT id, username, display_name AS displayName FROM users WHERE id IN (${ph})`, ids),
  ]);
  const nameOf = Object.fromEntries(names.map((n) => [n.id, n.displayName || n.username]));
  const item = (type, r, data) => ({
    id: `${type}-${r.user_id}-${r.at}-${data.key || ''}`, type, userId: r.user_id, name: nameOf[r.user_id], isYou: r.user_id === userId,
    at: String(r.at || '').replace(' ', 'T').replace(/(T\d\d:\d\d:\d\d)$/, '$1Z'), ...data,
  });
  const events = [
    ...lessons.map((r) => item('lesson', r, { key: r.title, title: r.title })),
    ...badges.map((r) => item('badge', r, { key: r.name, title: r.name, icon: r.icon })),
    ...quizzes.map((r) => item('quiz', r, { key: r.title, title: r.title, percent: r.percentage })),
    ...skills.map((r) => item('skill', r, {
      key: `${r.language}${r.concept_id}${r.bloom_level}`,
      skill: CONCEPTS[r.concept_id] ? CONCEPTS[r.concept_id].name : { en: r.concept_id, sw: r.concept_id },
      level: BLOOM[r.bloom_level] ? BLOOM[r.bloom_level].name : { en: r.bloom_level, sw: r.bloom_level },
      icon: CONCEPTS[r.concept_id] ? CONCEPTS[r.concept_id].icon : '🤖',
    })),
    // Only my own new friendships (a friend's other friends are not shown to me).
    ...friends.filter((r) => r.user_id === userId)
      .map((r) => item('friend', r, { key: r.friendUsername, friend: r.friendDisplay || r.friendUsername })),
  ];
  return events
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))
    .slice(0, limit);
}

function createSocialRouter({ authenticateToken }) {
  const router = express.Router();
  router.use(authenticateToken);
  const wrap = (fn) => async (req, res) => {
    try { res.json(await fn(req, res)); } catch (err) {
      console.error('Social route error:', err.message);
      res.status(err.status || 500).json({ error: err.status ? err.message : 'Could not load friends data. Please try again.' });
    }
  };
  const fail = (status, message) => Object.assign(new Error(message), { status });
  const limitOf = (v, d, max) => Math.min(max, Math.max(1, parseInt(v, 10) || d));

  // Leaderboards
  router.get('/leaderboard', wrap(async (req) => ranking(await childIds(), req.user.id, req.query.timeframe, limitOf(req.query.limit, 50, 100))));
  router.get('/leaderboard/friends', wrap(async (req) => ranking([req.user.id, ...(await friendIds(req.user.id))], req.user.id, req.query.timeframe, 100)));
  router.get('/rank', wrap(async (req) => {
    const r = await ranking(await childIds(), req.user.id, req.query.timeframe, 1);
    return r.you ? { rank: r.you.rank, totalUsers: r.you.total, topPercent: r.you.topPercent, xp: r.you.xp } : { rank: null };
  }));

  // Friends
  router.get('/friends', wrap(async (req) => {
    const rows = await all("SELECT friend_id, accepted_at FROM friendships WHERE user_id = ? AND status = 'accepted' ORDER BY accepted_at DESC", [req.user.id]);
    const stats = await statsFor(rows.map((r) => r.friend_id));
    return { friends: rows.filter((r) => stats[r.friend_id]).map((r) => ({ ...stats[r.friend_id], friendsSince: r.accepted_at })) };
  }));

  router.get('/friends/requests', wrap(async (req) => {
    const incoming = await all("SELECT id, from_user_id, created_at FROM friend_requests WHERE to_user_id = ? AND status = 'pending' ORDER BY created_at DESC", [req.user.id]);
    const outgoing = await all("SELECT id, to_user_id, created_at FROM friend_requests WHERE from_user_id = ? AND status = 'pending' ORDER BY created_at DESC", [req.user.id]);
    const stats = await statsFor([...incoming.map((r) => r.from_user_id), ...outgoing.map((r) => r.to_user_id)]);
    return {
      requests: incoming.filter((r) => stats[r.from_user_id]).map((r) => ({ id: r.id, sentAt: r.created_at, from: stats[r.from_user_id] })),
      sent: outgoing.filter((r) => stats[r.to_user_id]).map((r) => ({ id: r.id, sentAt: r.created_at, to: stats[r.to_user_id] })),
    };
  }));

  router.get('/search', wrap(async (req) => {
    const q = String(req.query.query || '').trim().slice(0, 40);
    if (q.length < 2) return { users: [] };
    const found = await all(
      `SELECT id FROM users WHERE account_type = 'child' AND id != ? AND (username LIKE ? OR display_name LIKE ?) ORDER BY xp DESC LIMIT 20`,
      [req.user.id, `%${q}%`, `%${q}%`],
    );
    const ids = found.map((r) => r.id);
    if (!ids.length) return { users: [] };
    const stats = await statsFor(ids);
    const friends = new Set(await friendIds(req.user.id));
    const sent = new Set((await all("SELECT to_user_id FROM friend_requests WHERE from_user_id = ? AND status = 'pending'", [req.user.id])).map((r) => r.to_user_id));
    const incoming = Object.fromEntries((await all("SELECT id, from_user_id FROM friend_requests WHERE to_user_id = ? AND status = 'pending'", [req.user.id])).map((r) => [r.from_user_id, r.id]));
    return {
      users: ids.filter((id) => stats[id]).map((id) => ({
        ...stats[id],
        friendshipStatus: friends.has(id) ? 'accepted' : incoming[id] ? 'incoming' : sent.has(id) ? 'pending' : 'none',
        requestId: incoming[id] || null,
      })),
    };
  }));

  async function befriend(a, b) {
    for (const [x, y] of [[a, b], [b, a]]) {
      await run(`INSERT INTO friendships (user_id, friend_id, status, accepted_at) VALUES (?, ?, 'accepted', datetime('now'))
        ON CONFLICT(user_id, friend_id) DO UPDATE SET status = 'accepted', accepted_at = datetime('now')`, [x, y]);
    }
  }

  router.post('/friends/request', wrap(async (req) => {
    const userId = req.user.id;
    const friendId = Number(req.body && req.body.friendId);
    if (!Number.isInteger(friendId) || friendId <= 0) throw fail(400, 'Friend ID required');
    if (friendId === userId) throw fail(400, 'Cannot add yourself as a friend');
    const friend = await get('SELECT id, account_type FROM users WHERE id = ?', [friendId]);
    if (!friend) throw fail(404, 'User not found');
    if (friend.account_type !== 'child') throw fail(400, 'Can only add child accounts as friends');
    if ((await friendIds(userId)).includes(friendId)) return { success: true, status: 'accepted' };

    // They already asked to be friends with me -> this is a yes.
    const theirs = await get("SELECT id FROM friend_requests WHERE from_user_id = ? AND to_user_id = ? AND status = 'pending'", [friendId, userId]);
    if (theirs) {
      await run("UPDATE friend_requests SET status = 'accepted', responded_at = datetime('now') WHERE id = ?", [theirs.id]);
      await befriend(userId, friendId);
      return { success: true, status: 'accepted' };
    }
    // Replace any old (rejected/accepted-then-removed) request so it can be sent again.
    await run('DELETE FROM friend_requests WHERE from_user_id = ? AND to_user_id = ?', [userId, friendId]);
    const r = await run("INSERT INTO friend_requests (from_user_id, to_user_id, status) VALUES (?, ?, 'pending')", [userId, friendId]);
    await run(`INSERT INTO friendships (user_id, friend_id, status) VALUES (?, ?, 'pending')
      ON CONFLICT(user_id, friend_id) DO UPDATE SET status = 'pending', accepted_at = NULL`, [userId, friendId]);
    return { success: true, status: 'pending', requestId: r.lastID };
  }));

  router.post('/friends/accept/:requestId', wrap(async (req) => {
    const request = await get("SELECT * FROM friend_requests WHERE id = ? AND to_user_id = ? AND status = 'pending'", [req.params.requestId, req.user.id]);
    if (!request) throw fail(404, 'Friend request not found');
    await run("UPDATE friend_requests SET status = 'accepted', responded_at = datetime('now') WHERE id = ?", [request.id]);
    await befriend(req.user.id, request.from_user_id);
    return { success: true };
  }));

  router.post('/friends/reject/:requestId', wrap(async (req) => {
    const request = await get("SELECT * FROM friend_requests WHERE id = ? AND to_user_id = ? AND status = 'pending'", [req.params.requestId, req.user.id]);
    if (!request) throw fail(404, 'Friend request not found');
    await run("UPDATE friend_requests SET status = 'rejected', responded_at = datetime('now') WHERE id = ?", [request.id]);
    await run("DELETE FROM friendships WHERE user_id = ? AND friend_id = ? AND status = 'pending'", [request.from_user_id, req.user.id]);
    return { success: true };
  }));

  router.delete('/friends/:friendId', wrap(async (req) => {
    const a = req.user.id;
    const b = Number(req.params.friendId);
    const r = await run('DELETE FROM friendships WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)', [a, b, b, a]);
    await run('DELETE FROM friend_requests WHERE (from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?)', [a, b, b, a]);
    if (!r.changes) throw fail(404, 'Friendship not found');
    return { success: true };
  }));

  // Activity: me + my friends
  router.get('/feed', wrap(async (req) => ({ feed: await feedFor(req.user.id, limitOf(req.query.limit, 30, 60)) })));
  router.get('/friends/:friendId/activity', wrap(async (req) => {
    const friendId = Number(req.params.friendId);
    if (!(await friendIds(req.user.id)).includes(friendId)) throw fail(403, 'Not friends with this user');
    return { activities: (await feedFor(friendId, 20)).filter((e) => e.userId === friendId) };
  }));

  return router;
}

module.exports = { createSocialRouter, ranking, statsFor, xpSince, feedFor };
