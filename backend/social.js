'use strict';
/**
 * Friends & Leaderboard ("Social") - built straight from the real learning records, so
 * every number matches the rest of KidsCode:
 *   XP            users.xp (all time), or XP earned in the last 7 / 30 days from the
 *                 records that award XP (AI Coach answers, lessons, quizzes, badges, duels)
 *   lessons       finished lessons on the children's map (quiz results are not lessons)
 *   streak        live coding streak (activity_days, same as the home page)
 *   badges        unlocked badges
 *   activity feed lessons finished, badges, quizzes passed, Coach skills mastered and
 *                 new friendships - for the child and their accepted friends only
 *
 * What friends can do together (all child-safe - there is NO free-text chat):
 *   cheers        send a ready-made sticker (high five, star, "let's code today!")
 *   code duels    answer the same 5 AI Coach questions on a skill; bonus XP for the winner
 *   projects      share saved creations with friends (safety-checked); friends can remix them
 *   profiles      see a friend's journey rank, badges, buddy streak and shared projects
 *   buddy streak  days in a row both friends coded
 *   team goal     friends earn XP together towards a weekly goal
 *   inbox         friend requests, cheers, duels and new projects with an unread count
 *
 * Only child accounts take part, and a parent can switch friends and/or sharing off for
 * their child, see the child's friends and remove one (see createParentSocialRouter).
 * Children see other children's display name/username, XP and counts - never emails,
 * ages or anything personal.
 */
const express = require('express');
const { getDb } = require('./database');
const { currentStreak, noteCoding } = require('./achievements');
const { BY_ID: CONCEPTS } = require('./ai/concepts');
const { BY_ID: BLOOM } = require('./ai/bloom');
const { BY_ID: LANGS } = require('./ai/languages');
const { generateOffline } = require('./ai/offlineBank');
const { buildJourney } = require('./ai/journey');
const safety = require('./ai/safety');

const all = (sql, p = []) => new Promise((res, rej) => getDb().all(sql, p, (e, r) => (e ? rej(e) : res(r || []))));
const get = (sql, p = []) => new Promise((res, rej) => getDb().get(sql, p, (e, r) => (e ? rej(e) : res(r))));
const run = (sql, p = []) => new Promise((res, rej) => getDb().run(sql, p, function done(e) { if (e) rej(e); else res(this); }));

const TIMEFRAMES = { week: 7, month: 30 };
const NOT_QUIZ = "CAST(p.lesson_id AS TEXT) NOT LIKE 'quiz%'";
const marks = (n) => new Array(n).fill('?').join(',');
const levelOf = (xp) => Math.floor((xp || 0) / 200) + 1;
const fail = (status, message) => Object.assign(new Error(message), { status });

// Ready-made stickers - the only way friends "talk", so nothing unkind or personal can be sent.
const STICKERS = { high_five: '🙌', star: '🌟', strong: '💪', wow: '🤩', clap: '👏', lets_code: '💻' };
const CHEERS_PER_DAY = 30;
// Code duel: 5 questions everyone can answer by choosing (no typing), easy to hard.
const DUEL_LEVELS = ['remember', 'remember', 'understand', 'understand', 'evaluate'];
const DUEL_XP_FINISH = 10;
const DUEL_XP_WIN = 20;
const OPEN_DUELS_PER_PAIR = 3;
const TEAM_GOAL_PER_MEMBER = 250;
const PROJECT_LANGS = ['javascript', 'python', 'html', 'blocks'];

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------
let tablesReady = null;
function ensureTables() {
  if (!tablesReady) {
    tablesReady = (async () => {
      await run(`CREATE TABLE IF NOT EXISTS social_settings (
        child_id INTEGER PRIMARY KEY,
        friends_enabled INTEGER DEFAULT 1,
        sharing_enabled INTEGER DEFAULT 1,
        inbox_seen_at DATETIME,
        updated_by INTEGER,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);
      await run(`CREATE TABLE IF NOT EXISTS friend_cheers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        from_id INTEGER NOT NULL,
        to_id INTEGER NOT NULL,
        sticker TEXT NOT NULL,
        target_type TEXT NOT NULL,
        target_key TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(from_id, to_id, sticker, target_type, target_key)
      )`);
      await run(`CREATE TABLE IF NOT EXISTS friend_duels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        from_id INTEGER NOT NULL,
        to_id INTEGER NOT NULL,
        language TEXT NOT NULL,
        concept_id TEXT NOT NULL,
        plan TEXT NOT NULL,
        status TEXT DEFAULT 'open',
        from_score INTEGER,
        to_score INTEGER,
        winner_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        finished_at DATETIME
      )`);
      await run(`CREATE TABLE IF NOT EXISTS shared_projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        owner_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        code TEXT NOT NULL,
        blocks_xml TEXT,
        language TEXT DEFAULT 'javascript',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);
    })();
  }
  return tablesReady;
}

async function settingsOf(childId) {
  await ensureTables();
  const row = await get('SELECT friends_enabled, sharing_enabled, inbox_seen_at FROM social_settings WHERE child_id = ?', [childId]);
  return {
    friendsEnabled: !row || row.friends_enabled !== 0,
    sharingEnabled: !row || (row.sharing_enabled !== 0 && row.friends_enabled !== 0),
    inboxSeenAt: row ? row.inbox_seen_at : null,
  };
}

async function saveSettings(childId, changes, by) {
  await ensureTables();
  await run('INSERT OR IGNORE INTO social_settings (child_id) VALUES (?)', [childId]);
  const sets = [];
  const vals = [];
  if (changes.friendsEnabled !== undefined) { sets.push('friends_enabled = ?'); vals.push(changes.friendsEnabled ? 1 : 0); }
  if (changes.sharingEnabled !== undefined) { sets.push('sharing_enabled = ?'); vals.push(changes.sharingEnabled ? 1 : 0); }
  if (changes.inboxSeenAt !== undefined) { sets.push('inbox_seen_at = ?'); vals.push(changes.inboxSeenAt); }
  if (by !== undefined) { sets.push('updated_by = ?'); vals.push(by); }
  if (!sets.length) return;
  await run(`UPDATE social_settings SET ${sets.join(', ')}, updated_at = datetime('now') WHERE child_id = ?`, [...vals, childId]);
}

// ---------------------------------------------------------------------------
// Stats and leaderboards
// ---------------------------------------------------------------------------

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
  await ensureTables();
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
       UNION ALL SELECT from_id, ${DUEL_XP_FINISH} + CASE WHEN winner_id = from_id OR winner_id = 0 THEN ${DUEL_XP_WIN} ELSE 0 END FROM friend_duels WHERE status = 'done' AND finished_at >= datetime('now', ?)
       UNION ALL SELECT to_id, ${DUEL_XP_FINISH} + CASE WHEN winner_id = to_id OR winner_id = 0 THEN ${DUEL_XP_WIN} ELSE 0 END FROM friend_duels WHERE status = 'done' AND finished_at >= datetime('now', ?)
     ) GROUP BY user_id`, [since, since, since, since, since, since, since],
  ).catch(() => []);
  return Object.fromEntries(rows.map((r) => [r.user_id, r.xp || 0]));
}

const childIds = async () => (await all("SELECT id FROM users WHERE account_type = 'child'")).map((r) => r.id);

/** Accepted friends, only while both children have friends switched on. */
async function friendIds(userId) {
  await ensureTables();
  return (await all(
    `SELECT f.friend_id FROM friendships f
     LEFT JOIN social_settings a ON a.child_id = f.user_id
     LEFT JOIN social_settings b ON b.child_id = f.friend_id
     WHERE f.user_id = ? AND f.status = 'accepted' AND COALESCE(a.friends_enabled, 1) = 1 AND COALESCE(b.friends_enabled, 1) = 1`, [userId],
  )).map((r) => r.friend_id);
}

async function requireFriend(userId, otherId) {
  if (!(await friendIds(userId)).includes(Number(otherId))) throw fail(403, 'You can only do this with your friends');
}

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

/** Days in a row (ending today or yesterday) on which BOTH children coded. */
async function buddyStreak(a, b) {
  const days = await all(
    `SELECT x.day FROM activity_days x JOIN activity_days y ON y.day = x.day AND y.user_id = ?
     WHERE x.user_id = ? ORDER BY x.day DESC LIMIT 400`, [b, a],
  ).catch(() => []);
  const set = new Set(days.map((d) => d.day));
  const offset = Number.isFinite(Number(process.env.STREAK_UTC_OFFSET_HOURS)) ? Number(process.env.STREAK_UTC_OFFSET_HOURS) : 3;
  const dayString = (ms) => new Date(ms + offset * 3600000).toISOString().slice(0, 10);
  let ms = Date.now();
  if (!set.has(dayString(ms))) ms -= 86400000;
  let n = 0;
  for (; set.has(dayString(ms)); ms -= 86400000) n += 1;
  return n;
}

// ---------------------------------------------------------------------------
// Activity feed
// ---------------------------------------------------------------------------

/** Recent achievements of the child and their friends, newest first, with cheers on each. */
async function feedFor(userId, limit = 30, { viewerId = userId } = {}) {
  await ensureTables();
  const ids = [userId, ...(await friendIds(userId))];
  const ph = marks(ids.length);
  const lessonIds = await childLessonIds();
  const lessonFilter = lessonIds.length ? `AND p.lesson_id IN (${lessonIds.join(',')})` : `AND ${NOT_QUIZ}`;
  const recent = "datetime('now', '-30 days')";
  const [lessons, badges, quizzes, skills, friends, projects, duels, names] = await Promise.all([
    all(`SELECT p.user_id, p.updated_at AS at, l.title, l.id AS ref FROM progress p JOIN lessons l ON l.id = p.lesson_id
         WHERE p.user_id IN (${ph}) AND p.completed = 1 ${lessonFilter} AND p.updated_at >= ${recent}`, ids).catch(() => []),
    all(`SELECT ua.user_id, ua.unlocked_at AS at, a.name, a.icon, a.id AS ref FROM user_achievements ua JOIN achievements a ON a.id = ua.achievement_id
         WHERE ua.user_id IN (${ph}) AND ua.unlocked_at >= ${recent}`, ids).catch(() => []),
    all(`SELECT q.user_id, q.completed_at AS at, q.percentage, m.title, q.id AS ref FROM quiz_results q LEFT JOIN modules m ON m.id = q.module_id
         WHERE q.user_id IN (${ph}) AND q.passed = 1 AND q.completed_at >= ${recent}`, ids).catch(() => []),
    all(`SELECT user_id, mastered_at AS at, concept_id, bloom_level, language FROM ai_mastery
         WHERE user_id IN (${ph}) AND mastered_at IS NOT NULL AND replace(mastered_at, 'T', ' ') >= ${recent}`, ids).catch(() => []),
    all(`SELECT f.user_id, f.accepted_at AS at, u.display_name AS friendDisplay, u.username AS friendUsername, f.friend_id AS ref
         FROM friendships f JOIN users u ON u.id = f.friend_id
         WHERE f.user_id IN (${ph}) AND f.status = 'accepted' AND f.accepted_at >= ${recent}`, ids).catch(() => []),
    all(`SELECT owner_id AS user_id, created_at AS at, title, id AS ref FROM shared_projects WHERE owner_id IN (${ph}) AND created_at >= ${recent}`, ids).catch(() => []),
    all(`SELECT d.id AS ref, d.finished_at AS at, d.from_id, d.to_id, d.winner_id, d.concept_id, d.from_score, d.to_score FROM friend_duels d
         WHERE d.status = 'done' AND d.finished_at >= ${recent} AND (d.from_id = ? OR d.to_id = ?)`, [viewerId, viewerId]).catch(() => []),
    all(`SELECT id, username, display_name AS displayName FROM users WHERE id IN (${ph})`, ids),
  ]);
  const nameOf = Object.fromEntries(names.map((n) => [n.id, n.displayName || n.username]));
  const conceptName = (id) => (CONCEPTS[id] ? CONCEPTS[id].name : { en: id, sw: id });
  const item = (type, r, key, data) => ({
    id: `${type}:${r.user_id}:${key}`, type, userId: r.user_id, name: nameOf[r.user_id], isYou: r.user_id === viewerId,
    at: String(r.at || '').replace(' ', 'T').replace(/(T\d\d:\d\d:\d\d)$/, '$1Z'), ...data,
  });
  const events = [
    ...lessons.map((r) => item('lesson', r, r.ref, { title: r.title })),
    ...badges.map((r) => item('badge', r, r.ref, { title: r.name, icon: r.icon })),
    ...quizzes.map((r) => item('quiz', r, r.ref, { title: r.title, percent: r.percentage })),
    ...skills.map((r) => item('skill', r, `${r.language}.${r.concept_id}.${r.bloom_level}`, {
      skill: conceptName(r.concept_id),
      level: BLOOM[r.bloom_level] ? BLOOM[r.bloom_level].name : { en: r.bloom_level, sw: r.bloom_level },
      icon: CONCEPTS[r.concept_id] ? CONCEPTS[r.concept_id].icon : '🤖',
    })),
    // Only my own new friendships (a friend's other friends are not shown to me).
    ...friends.filter((r) => r.user_id === viewerId).map((r) => item('friend', r, r.ref, { friend: r.friendDisplay || r.friendUsername })),
    ...projects.map((r) => item('project', r, r.ref, { title: r.title, projectId: r.ref })),
    ...duels.map((r) => {
      const other = r.from_id === viewerId ? r.to_id : r.from_id;
      return item('duel', { user_id: viewerId, at: r.at }, r.ref, {
        skill: conceptName(r.concept_id), opponent: nameOf[other] || '',
        result: r.winner_id === 0 ? 'tie' : r.winner_id === viewerId ? 'won' : 'lost',
        score: r.from_id === viewerId ? `${r.from_score}-${r.to_score}` : `${r.to_score}-${r.from_score}`,
      });
    }),
  ].sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0)).slice(0, limit);

  // Cheers on each event: counts per sticker, and which ones the viewer already sent.
  const cheers = await all(
    `SELECT target_key, sticker, from_id FROM friend_cheers WHERE target_type = 'event' AND to_id IN (${ph}) AND created_at >= ${recent}`, ids,
  ).catch(() => []);
  const byKey = {};
  cheers.forEach((c) => {
    const k = (byKey[c.target_key] = byKey[c.target_key] || { counts: {}, mine: [] });
    k.counts[c.sticker] = (k.counts[c.sticker] || 0) + 1;
    if (c.from_id === viewerId) k.mine.push(c.sticker);
  });
  return events.map((e) => ({ ...e, cheers: byKey[e.id] || { counts: {}, mine: [] } }));
}

// ---------------------------------------------------------------------------
// Code duels
// ---------------------------------------------------------------------------

/** Pick seeds so the duel has 5 different questions. */
function duelPlan(concept, language) {
  const used = {};
  return DUEL_LEVELS.map((level) => {
    used[level] = used[level] || [];
    let seed = Math.floor(Math.random() * 1e9);
    for (let i = 0; i < 40; i += 1) {
      const a = generateOffline({ concept, level, language, locale: 'en', seed });
      if (!used[level].includes(a.variantKey)) { used[level].push(a.variantKey); break; }
      seed = (seed + 7919) >>> 0;
    }
    return { level, seed };
  });
}

const duelQuestion = (duel, step, locale) => generateOffline({ concept: duel.concept_id, level: step.level, language: duel.language, locale, seed: step.seed });

async function duelView(d, viewerId, locale, names) {
  const mine = d.from_id === viewerId ? 'from' : 'to';
  const other = mine === 'from' ? d.to_id : d.from_id;
  const myScore = d[`${mine}_score`];
  const theirScore = d[`${mine === 'from' ? 'to' : 'from'}_score`];
  const c = CONCEPTS[d.concept_id];
  const view = {
    id: d.id, createdAt: d.created_at, finishedAt: d.finished_at, status: d.status,
    language: d.language, languageName: LANGS[d.language] ? LANGS[d.language].name : d.language,
    concept: d.concept_id, skill: c ? c.name[locale] || c.name.en : d.concept_id, icon: c ? c.icon : '⚔️',
    youStarted: mine === 'from', opponent: names[other] || null, opponentId: other,
    yourScore: myScore, theirScore: d.status === 'done' ? theirScore : null, theyFinished: theirScore !== null && theirScore !== undefined,
    total: DUEL_LEVELS.length, yourTurn: d.status === 'open' && (myScore === null || myScore === undefined),
    result: d.status !== 'done' ? null : d.winner_id === 0 ? 'tie' : d.winner_id === viewerId ? 'won' : 'lost',
  };
  return view;
}

// ---------------------------------------------------------------------------
// Routes for children (/api/social)
// ---------------------------------------------------------------------------
function createSocialRouter({ authenticateToken }) {
  const router = express.Router();
  router.use(authenticateToken, (req, res, next) => {
    if (req.user.accountType !== 'child') {
      return res.status(403).json({ error: 'Child account required', code: 'CHILD_ACCOUNT_REQUIRED' });
    }
    next();
  });
  const wrap = (fn) => async (req, res) => {
    try {
      await ensureTables();
      res.json(await fn(req, res));
    } catch (err) {
      if (!err.status) console.error('Social route error:', err.message);
      res.status(err.status || 500).json({ error: err.status ? err.message : 'Could not load friends data. Please try again.', code: err.code });
    }
  };
  const limitOf = (v, d, max) => Math.min(max, Math.max(1, parseInt(v, 10) || d));
  const loc = (req) => (req.query.locale === 'sw' || (req.body && req.body.locale === 'sw') ? 'sw' : 'en');
  const needFriends = async (req) => {
    const s = await settingsOf(req.user.id);
    if (!s.friendsEnabled) throw Object.assign(fail(403, 'A grown-up has turned off friends for this account.'), { code: 'friends_off' });
    return s;
  };
  const namesOf = async (ids) => Object.fromEntries((ids.length ? await all(
    `SELECT id, username, display_name AS d FROM users WHERE id IN (${marks(ids.length)})`, ids,
  ) : []).map((u) => [u.id, u.d || u.username]));

  router.get('/settings', wrap(async (req) => {
    const s = await settingsOf(req.user.id);
    return { friendsEnabled: s.friendsEnabled, sharingEnabled: s.sharingEnabled, stickers: STICKERS };
  }));

  // Leaderboards
  router.get('/leaderboard', wrap(async (req) => ranking(await childIds(), req.user.id, req.query.timeframe, limitOf(req.query.limit, 50, 100))));
  router.get('/leaderboard/friends', wrap(async (req) => ranking([req.user.id, ...(await friendIds(req.user.id))], req.user.id, req.query.timeframe, 100)));
  router.get('/rank', wrap(async (req) => {
    const r = await ranking(await childIds(), req.user.id, req.query.timeframe, 1);
    return r.you ? { rank: r.you.rank, totalUsers: r.you.total, topPercent: r.you.topPercent, xp: r.you.xp } : { rank: null };
  }));

  // Team goal: friends earn XP together this week.
  router.get('/team', wrap(async (req) => {
    const members = [req.user.id, ...(await friendIds(req.user.id))];
    const week = await xpSince(7);
    const names = await namesOf(members);
    const contributions = members.map((id) => ({ id, name: names[id], xp: week[id] || 0, isYou: id === req.user.id })).sort((a, b) => b.xp - a.xp);
    const total = contributions.reduce((n, c) => n + c.xp, 0);
    return { goal: TEAM_GOAL_PER_MEMBER * members.length, total, members: contributions, reached: total >= TEAM_GOAL_PER_MEMBER * members.length };
  }));

  // Friends
  router.get('/friends', wrap(async (req) => {
    const ids = await friendIds(req.user.id);
    const rows = ids.length ? await all(
      `SELECT friend_id, accepted_at FROM friendships WHERE user_id = ? AND friend_id IN (${marks(ids.length)}) ORDER BY accepted_at DESC`, [req.user.id, ...ids],
    ) : [];
    const stats = await statsFor(ids);
    const buddies = await Promise.all(rows.map((r) => buddyStreak(req.user.id, r.friend_id)));
    return { friends: rows.filter((r) => stats[r.friend_id]).map((r, i) => ({ ...stats[r.friend_id], friendsSince: r.accepted_at, buddyStreak: buddies[i] })) };
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
    await needFriends(req);
    const q = String(req.query.query || '').trim().slice(0, 40);
    if (q.length < 2) return { users: [] };
    const found = await all(
      `SELECT u.id FROM users u LEFT JOIN social_settings s ON s.child_id = u.id
       WHERE u.account_type = 'child' AND u.id != ? AND COALESCE(s.friends_enabled, 1) = 1
       AND (u.username LIKE ? OR u.display_name LIKE ?) ORDER BY u.xp DESC LIMIT 20`,
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
    await needFriends(req);
    const userId = req.user.id;
    const friendId = Number(req.body && req.body.friendId);
    if (!Number.isInteger(friendId) || friendId <= 0) throw fail(400, 'Friend ID required');
    if (friendId === userId) throw fail(400, 'Cannot add yourself as a friend');
    const friend = await get('SELECT id, account_type FROM users WHERE id = ?', [friendId]);
    if (!friend) throw fail(404, 'User not found');
    if (friend.account_type !== 'child') throw fail(400, 'Can only add child accounts as friends');
    if (!(await settingsOf(friendId)).friendsEnabled) throw fail(403, 'This coder cannot add friends right now.');
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
    await needFriends(req);
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
    const removed = await unfriend(req.user.id, Number(req.params.friendId));
    if (!removed) throw fail(404, 'Friendship not found');
    return { success: true };
  }));

  // A friend's profile: stats, badges, journey rank, buddy streak, shared projects, recent activity.
  router.get('/friends/:friendId/profile', wrap(async (req) => {
    const friendId = Number(req.params.friendId);
    await requireFriend(req.user.id, friendId);
    const locale = loc(req);
    const stats = (await statsFor([friendId]))[friendId];
    const badges = await all(
      `SELECT a.name, a.icon, ua.unlocked_at AS at FROM user_achievements ua JOIN achievements a ON a.id = ua.achievement_id
       WHERE ua.user_id = ? ORDER BY ua.unlocked_at DESC`, [friendId],
    );
    const pref = await get('SELECT language FROM ai_learner_prefs WHERE user_id = ?', [friendId]).catch(() => null);
    const mastery = await all('SELECT * FROM ai_mastery WHERE user_id = ?', [friendId]).catch(() => []);
    const language = pref && LANGS[pref.language] ? pref.language
      : (mastery[0] && LANGS[mastery[0].language] ? mastery[0].language : 'python');
    const wins = await get(
      "SELECT COUNT(*) AS n FROM ai_activities WHERE user_id = ? AND language = ? AND reason = 'legend_challenge' AND status = 'done' AND correct = 1",
      [friendId, language],
    ).catch(() => ({ n: 0 }));
    const j = buildJourney(mastery, language, locale, wins ? wins.n : 0);
    const projects = await all('SELECT id, title, language, created_at AS createdAt FROM shared_projects WHERE owner_id = ? ORDER BY id DESC LIMIT 12', [friendId]);
    const feed = (await feedFor(friendId, 40, { viewerId: req.user.id })).filter((e) => e.userId === friendId).slice(0, 8);
    return {
      ...stats,
      buddyStreak: await buddyStreak(req.user.id, friendId),
      badges,
      journey: { language, languageName: LANGS[language].name, rank: j.rank, stagesDone: j.stagesDone, totalStages: j.totalStages,
        current: (j.stages.find((s) => s.id === j.currentStage) || {}).name || null, legend: j.legend.unlocked ? j.legend.level : 0 },
      projects,
      recent: feed,
    };
  }));

  // Cheers (ready-made stickers only)
  router.post('/cheers', wrap(async (req) => {
    await needFriends(req);
    const { to, sticker, eventId } = req.body || {};
    const toId = Number(to);
    if (!STICKERS[sticker]) throw fail(400, 'Unknown sticker');
    await requireFriend(req.user.id, toId);
    const today = await get("SELECT COUNT(*) AS n FROM friend_cheers WHERE from_id = ? AND created_at >= datetime('now', '-1 day')", [req.user.id]);
    if (today.n >= CHEERS_PER_DAY) throw fail(429, 'That is lots of cheering for today - try again tomorrow!');
    let targetType = 'friend';
    let targetKey = new Date().toISOString().slice(0, 10); // a direct cheer: once per sticker per day
    if (eventId) {
      // Feed event ids look like "lesson:<friendId>:<what>" - a cheer must be about that friend's own event.
      const ev = String(eventId).slice(0, 120);
      const [type, owner] = ev.split(':');
      if (!['lesson', 'badge', 'quiz', 'skill', 'project', 'friend'].includes(type) || Number(owner) !== toId) throw fail(400, 'Unknown event');
      targetType = 'event';
      targetKey = ev;
    } else if (req.body && req.body.projectId) {
      const p = await get('SELECT id, owner_id FROM shared_projects WHERE id = ?', [Number(req.body.projectId)]);
      if (!p || p.owner_id !== toId) throw fail(404, 'Project not found');
      targetType = 'event';
      targetKey = `project:${toId}:${p.id}`;
    }
    await run('INSERT OR IGNORE INTO friend_cheers (from_id, to_id, sticker, target_type, target_key) VALUES (?, ?, ?, ?, ?)', [req.user.id, toId, sticker, targetType, targetKey]);
    return { success: true, sticker: STICKERS[sticker] };
  }));

  // Inbox: requests, cheers, duels and new projects from friends.
  router.get('/inbox', wrap(async (req) => {
    const userId = req.user.id;
    const locale = loc(req);
    const s = await settingsOf(userId);
    const seenAt = s.inboxSeenAt || '1970-01-01 00:00:00';
    const friends = await friendIds(userId);
    const [requests, cheers, duels, projects] = await Promise.all([
      all("SELECT id, from_user_id AS fromId, created_at AS at FROM friend_requests WHERE to_user_id = ? AND status = 'pending'", [userId]),
      all("SELECT id, from_id AS fromId, sticker, target_type, target_key, created_at AS at FROM friend_cheers WHERE to_id = ? AND created_at >= datetime('now', '-30 days') ORDER BY id DESC LIMIT 40", [userId]),
      all("SELECT * FROM friend_duels WHERE (to_id = ? OR from_id = ?) AND (status = 'open' OR finished_at >= datetime('now', '-14 days')) ORDER BY id DESC LIMIT 30", [userId, userId]),
      friends.length ? all(`SELECT id, owner_id AS fromId, title, created_at AS at FROM shared_projects WHERE owner_id IN (${marks(friends.length)}) AND created_at >= datetime('now', '-14 days') ORDER BY id DESC LIMIT 20`, friends) : [],
    ]);
    const names = await namesOf([...new Set([...requests, ...cheers, ...projects].map((r) => r.fromId).concat(duels.flatMap((d) => [d.from_id, d.to_id])))]);
    const iso = (at) => String(at || '').replace(' ', 'T').replace(/(T\d\d:\d\d:\d\d)$/, '$1Z');
    const items = [
      ...requests.map((r) => ({ id: `request:${r.id}`, type: 'request', requestId: r.id, fromId: r.fromId, name: names[r.fromId], at: iso(r.at), raw: r.at })),
      ...cheers.map((c) => ({ id: `cheer:${c.id}`, type: 'cheer', fromId: c.fromId, name: names[c.fromId], sticker: c.sticker, emoji: STICKERS[c.sticker],
        about: c.target_type === 'event' ? c.target_key.split(':')[0] : null, at: iso(c.at), raw: c.at })),
      ...(await Promise.all(duels.map(async (d) => {
        const v = await duelView(d, userId, locale, names);
        const at = d.status === 'done' ? d.finished_at : d.created_at;
        // Show a duel when it is my turn, or when it has finished.
        if (!(v.yourTurn || d.status === 'done')) return null;
        return { id: `duel:${d.id}:${d.status}`, type: 'duel', duel: v, fromId: v.opponentId, name: v.opponent, at: iso(at), raw: at };
      }))).filter(Boolean),
      ...projects.map((p) => ({ id: `project:${p.id}`, type: 'project', projectId: p.id, fromId: p.fromId, name: names[p.fromId], title: p.title, at: iso(p.at), raw: p.at })),
    ].sort((a, b) => (a.at < b.at ? 1 : -1));
    const unread = items.filter((i) => i.type === 'request' || (i.type === 'duel' && i.duel.yourTurn) || String(i.raw) > seenAt).length;
    return { items: items.map(({ raw, ...i }) => ({ ...i, isNew: i.type === 'request' || String(raw) > seenAt })), unread };
  }));

  router.post('/inbox/seen', wrap(async (req) => {
    const now = (await get("SELECT datetime('now') AS t")).t;
    await saveSettings(req.user.id, { inboxSeenAt: now });
    return { success: true };
  }));

  // Code duels
  router.get('/duels', wrap(async (req) => {
    const rows = await all('SELECT * FROM friend_duels WHERE from_id = ? OR to_id = ? ORDER BY id DESC LIMIT 40', [req.user.id, req.user.id]);
    const names = await namesOf([...new Set(rows.flatMap((d) => [d.from_id, d.to_id]))]);
    const duels = await Promise.all(rows.filter((d) => d.status !== 'declined').map((d) => duelView(d, req.user.id, loc(req), names)));
    const done = duels.filter((d) => d.status === 'done');
    return { duels, record: { won: done.filter((d) => d.result === 'won').length, lost: done.filter((d) => d.result === 'lost').length, tied: done.filter((d) => d.result === 'tie').length } };
  }));

  router.post('/duels', wrap(async (req) => {
    await needFriends(req);
    const { to, language, concept } = req.body || {};
    const toId = Number(to);
    await requireFriend(req.user.id, toId);
    const lang = LANGS[language];
    if (!lang || !lang.concepts.includes(concept)) throw fail(400, 'Pick a skill from this language');
    const open = await get(
      "SELECT COUNT(*) AS n FROM friend_duels WHERE status = 'open' AND ((from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?))",
      [req.user.id, toId, toId, req.user.id],
    );
    if (open.n >= OPEN_DUELS_PER_PAIR) throw fail(429, 'Finish your open duels with this friend first!');
    const r = await run('INSERT INTO friend_duels (from_id, to_id, language, concept_id, plan) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, toId, language, concept, JSON.stringify(duelPlan(concept, language))]);
    return { success: true, duelId: r.lastID };
  }));

  async function loadDuel(req) {
    const d = await get('SELECT * FROM friend_duels WHERE id = ? AND (from_id = ? OR to_id = ?)', [Number(req.params.id), req.user.id, req.user.id]);
    if (!d) throw fail(404, 'Duel not found');
    return d;
  }

  router.get('/duels/:id', wrap(async (req) => {
    const d = await loadDuel(req);
    const locale = loc(req);
    const names = await namesOf([d.from_id, d.to_id]);
    const view = await duelView(d, req.user.id, locale, names);
    const plan = JSON.parse(d.plan);
    // Questions without answers (answers stay on the server).
    view.questions = plan.map((step, i) => {
      const a = duelQuestion(d, step, locale);
      return { n: i + 1, level: step.level, levelName: BLOOM[step.level].name[locale], prompt: a.prompt, code: a.code || null,
        options: a.options, codeOptions: Boolean(a.codeOptions), showLineNumbers: Boolean(a.showLineNumbers) };
    });
    return view;
  }));

  router.post('/duels/:id/answers', wrap(async (req) => {
    const d = await loadDuel(req);
    if (d.status !== 'open') throw fail(409, 'This duel is already finished');
    const side = d.from_id === req.user.id ? 'from' : 'to';
    if (d[`${side}_score`] !== null && d[`${side}_score`] !== undefined) throw fail(409, 'You already answered this duel');
    const answers = Array.isArray(req.body && req.body.answers) ? req.body.answers : [];
    const locale = loc(req);
    const plan = JSON.parse(d.plan);
    const marking = plan.map((step, i) => {
      const a = duelQuestion(d, step, locale);
      return { n: i + 1, correct: Number(answers[i]) === a.answerIndex, correctIndex: a.answerIndex, explanation: a.explanation || '' };
    });
    const score = marking.filter((m) => m.correct).length;
    await run(`UPDATE friend_duels SET ${side}_score = ? WHERE id = ?`, [score, d.id]);
    noteCoding(req.user.id);

    const fresh = await get('SELECT * FROM friend_duels WHERE id = ?', [d.id]);
    if (fresh.from_score !== null && fresh.to_score !== null && fresh.status === 'open') {
      const winner = fresh.from_score === fresh.to_score ? 0 : fresh.from_score > fresh.to_score ? fresh.from_id : fresh.to_id;
      const upd = await run("UPDATE friend_duels SET status = 'done', winner_id = ?, finished_at = datetime('now') WHERE id = ? AND status = 'open'", [winner, d.id]);
      if (upd.changes) {
        for (const id of [fresh.from_id, fresh.to_id]) {
          const xp = DUEL_XP_FINISH + (winner === 0 || winner === id ? DUEL_XP_WIN : 0);
          await run('UPDATE users SET xp = xp + ? WHERE id = ?', [xp, id]);
        }
      }
    }
    const names = await namesOf([d.from_id, d.to_id]);
    const final = await get('SELECT * FROM friend_duels WHERE id = ?', [d.id]);
    return { score, total: plan.length, marking, duel: await duelView(final, req.user.id, locale, names) };
  }));

  router.post('/duels/:id/decline', wrap(async (req) => {
    const d = await loadDuel(req);
    if (d.to_id !== req.user.id || d.status !== 'open' || (d.to_score !== null && d.to_score !== undefined)) throw fail(409, 'This duel cannot be declined');
    await run("UPDATE friend_duels SET status = 'declined', finished_at = datetime('now') WHERE id = ?", [d.id]);
    return { success: true };
  }));

  // Shared projects
  router.get('/projects', wrap(async (req) => {
    const ids = [req.user.id, ...(await friendIds(req.user.id))];
    const rows = await all(
      `SELECT id, owner_id AS ownerId, title, language, created_at AS createdAt FROM shared_projects
       WHERE owner_id IN (${marks(ids.length)}) ORDER BY id DESC LIMIT 60`, ids,
    );
    const names = await namesOf(ids);
    const cheers = rows.length ? await all(
      `SELECT target_key, sticker, from_id FROM friend_cheers WHERE target_type = 'event' AND target_key IN (${marks(rows.length)})`,
      rows.map((p) => `project:${p.ownerId}:${p.id}`),
    ) : [];
    return {
      projects: rows.map((p) => {
        const key = `project:${p.ownerId}:${p.id}`;
        const mine = cheers.filter((c) => c.target_key === key);
        const counts = {};
        mine.forEach((c) => { counts[c.sticker] = (counts[c.sticker] || 0) + 1; });
        return { ...p, ownerName: names[p.ownerId], isYours: p.ownerId === req.user.id,
          cheers: { counts, mine: mine.filter((c) => c.from_id === req.user.id).map((c) => c.sticker) } };
      }),
      sharingEnabled: (await settingsOf(req.user.id)).sharingEnabled,
    };
  }));

  router.get('/projects/:id', wrap(async (req) => {
    const p = await get('SELECT * FROM shared_projects WHERE id = ?', [Number(req.params.id)]);
    if (!p) throw fail(404, 'Project not found');
    if (p.owner_id !== req.user.id) await requireFriend(req.user.id, p.owner_id);
    const names = await namesOf([p.owner_id]);
    return { id: p.id, title: p.title, code: p.code, blocksXml: p.blocks_xml, language: p.language, createdAt: p.created_at,
      ownerId: p.owner_id, ownerName: names[p.owner_id], isYours: p.owner_id === req.user.id };
  }));

  router.post('/projects', wrap(async (req) => {
    const s = await needFriends(req);
    if (!s.sharingEnabled) throw Object.assign(fail(403, 'A grown-up has turned off sharing for this account.'), { code: 'sharing_off' });
    const b = req.body || {};
    let { title, code, blocksXml, language } = b;
    if (b.codeHistoryId) {
      const saved = await get('SELECT * FROM code_history WHERE id = ? AND user_id = ?', [Number(b.codeHistoryId), req.user.id]);
      if (!saved) throw fail(404, 'Saved code not found');
      code = saved.code; blocksXml = saved.blocks_xml; language = saved.language; title = title || saved.title;
    }
    title = String(title || '').trim().slice(0, 60);
    code = String(code || '').slice(0, 20000);
    if (!title) throw fail(400, 'Give your project a name');
    if (!code.trim()) throw fail(400, 'Your project is empty');
    // Safety: nothing unkind, unsafe or personal (phone numbers, emails, addresses) can be shared.
    const check = safety.checkText(`${title}\n${code}`);
    const pii = safety.redactPII(`${title}\n${code}`, { isCode: true });
    const titlePii = safety.redactPII(title);
    if (!check.ok || check.reasons.includes('bullying') || pii.found.length || titlePii.found.length) {
      throw Object.assign(fail(422, 'This project cannot be shared. Remove personal details or unkind words and try again.'), { code: 'not_safe' });
    }
    const count = await get("SELECT COUNT(*) AS n FROM shared_projects WHERE owner_id = ? AND created_at >= datetime('now', '-1 day')", [req.user.id]);
    if (count.n >= 10) throw fail(429, 'You shared lots today - share more tomorrow!');
    const lang = PROJECT_LANGS.includes(language) ? language : 'javascript';
    const r = await run('INSERT INTO shared_projects (owner_id, title, code, blocks_xml, language) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, title, code, blocksXml ? String(blocksXml).slice(0, 100000) : null, lang]);
    return { success: true, projectId: r.lastID };
  }));

  router.delete('/projects/:id', wrap(async (req) => {
    const r = await run('DELETE FROM shared_projects WHERE id = ? AND owner_id = ?', [Number(req.params.id), req.user.id]);
    if (!r.changes) throw fail(404, 'Project not found');
    await run("DELETE FROM friend_cheers WHERE target_type = 'event' AND target_key = ?", [`project:${req.user.id}:${Number(req.params.id)}`]);
    return { success: true };
  }));

  // Activity: me + my friends
  router.get('/feed', wrap(async (req) => ({ feed: await feedFor(req.user.id, limitOf(req.query.limit, 30, 60)) })));
  router.get('/friends/:friendId/activity', wrap(async (req) => {
    const friendId = Number(req.params.friendId);
    await requireFriend(req.user.id, friendId);
    return { activities: (await feedFor(friendId, 20, { viewerId: req.user.id })).filter((e) => e.userId === friendId) };
  }));

  return router;
}

async function unfriend(a, b) {
  const r = await run('DELETE FROM friendships WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)', [a, b, b, a]);
  await run('DELETE FROM friend_requests WHERE (from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?)', [a, b, b, a]);
  return r.changes > 0;
}

// ---------------------------------------------------------------------------
// Routes for parents (/api/parent/social/:childId)
// ---------------------------------------------------------------------------
function createParentSocialRouter({ authenticateToken, requireParentAccount }) {
  const router = express.Router();
  router.use(authenticateToken, requireParentAccount);
  const wrap = (fn) => async (req, res) => {
    try {
      await ensureTables();
      const link = await get('SELECT 1 FROM parent_child_relationships WHERE parent_id = ? AND child_id = ?', [req.user.id, Number(req.params.childId)]);
      if (!link) throw fail(403, 'This is not your child');
      res.json(await fn(req, Number(req.params.childId)));
    } catch (err) {
      if (!err.status) console.error('Parent social route error:', err.message);
      res.status(err.status || 500).json({ error: err.status ? err.message : 'Could not load friends settings.' });
    }
  };

  router.get('/:childId', wrap(async (req, childId) => {
    const s = await settingsOf(childId);
    const rows = await all(
      `SELECT f.friend_id, f.accepted_at FROM friendships f WHERE f.user_id = ? AND f.status = 'accepted' ORDER BY f.accepted_at DESC`, [childId],
    );
    const pending = await all("SELECT from_user_id FROM friend_requests WHERE to_user_id = ? AND status = 'pending'", [childId]);
    const stats = await statsFor([...rows.map((r) => r.friend_id), ...pending.map((p) => p.from_user_id)]);
    const shared = await all('SELECT id, title, language, created_at AS createdAt FROM shared_projects WHERE owner_id = ? ORDER BY id DESC', [childId]);
    return {
      friendsEnabled: s.friendsEnabled, sharingEnabled: s.sharingEnabled,
      friends: rows.filter((r) => stats[r.friend_id]).map((r) => ({ ...stats[r.friend_id], friendsSince: r.accepted_at })),
      pendingRequests: pending.filter((p) => stats[p.from_user_id]).map((p) => stats[p.from_user_id]),
      sharedProjects: shared,
    };
  }));

  router.put('/:childId', wrap(async (req, childId) => {
    const b = req.body || {};
    await saveSettings(childId, {
      friendsEnabled: typeof b.friendsEnabled === 'boolean' ? b.friendsEnabled : undefined,
      sharingEnabled: typeof b.sharingEnabled === 'boolean' ? b.sharingEnabled : undefined,
    }, req.user.id);
    const s = await settingsOf(childId);
    return { friendsEnabled: s.friendsEnabled, sharingEnabled: s.sharingEnabled };
  }));

  router.delete('/:childId/friends/:friendId', wrap(async (req, childId) => {
    if (!(await unfriend(childId, Number(req.params.friendId)))) throw fail(404, 'Friendship not found');
    return { success: true };
  }));

  router.delete('/:childId/projects/:projectId', wrap(async (req, childId) => {
    const r = await run('DELETE FROM shared_projects WHERE id = ? AND owner_id = ?', [Number(req.params.projectId), childId]);
    if (!r.changes) throw fail(404, 'Project not found');
    return { success: true };
  }));

  return router;
}

module.exports = { createSocialRouter, createParentSocialRouter, ranking, statsFor, xpSince, feedFor, STICKERS, ensureTables };
