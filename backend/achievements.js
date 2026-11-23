'use strict';
/**
 * Badges (achievements) and the daily coding streak.
 *
 * Every badge in the `achievements` table has a rule here, and the rules are checked
 * whenever a child codes (runs code, checks a lesson, answers the AI Coach, saves progress)
 * and when the badge page is opened - so badges earned from past work are awarded too.
 *
 * Streak: a child "codes on a day" when they do any of the above. The streak is the number
 * of days in a row, ending today, with coding activity. Days follow East Africa Time by
 * default (STREAK_UTC_OFFSET_HOURS, default 3).
 */
const { getDb } = require('./database');

const OFFSET_HOURS = Number.isFinite(Number(process.env.STREAK_UTC_OFFSET_HOURS)) ? Number(process.env.STREAK_UTC_OFFSET_HOURS) : 3;

const get = (sql, p = []) => new Promise((res, rej) => getDb().get(sql, p, (e, r) => (e ? rej(e) : res(r))));
const all = (sql, p = []) => new Promise((res, rej) => getDb().all(sql, p, (e, r) => (e ? rej(e) : res(r || []))));
const run = (sql, p = []) => new Promise((res, rej) => getDb().run(sql, p, function done(e) { if (e) rej(e); else res(this.changes); }));

// "for (...)" in JavaScript/Java/C, or "for x in ..." in Python.
const FOR_LOOP = /\bfor\s*\(|\bfor\s+[A-Za-z_]\w*\s+in\b/;
const TURTLE_CALL = /\b(forward|backward|right|left|arc|circle)\s*\(/;

const BADGE = { FIRST: 1, FIVE: 2, TURTLE: 3, LOOP: 4, MODULE: 5, NINJA: 6, EXPLORER: 7, STREAK: 8 };

let tablesReady = null;
function ensureTables() {
  if (!tablesReady) {
    tablesReady = run(`CREATE TABLE IF NOT EXISTS activity_days (
      user_id INTEGER NOT NULL,
      day TEXT NOT NULL,
      PRIMARY KEY (user_id, day)
    )`);
  }
  return tablesReady;
}

const dayString = (ms) => new Date(ms + OFFSET_HOURS * 3600000).toISOString().slice(0, 10);
const today = () => dayString(Date.now());

/** Record that the child coded today and update users.streak. Returns the new streak. */
async function recordActivityDay(userId) {
  if (!userId) return 0;
  await ensureTables();
  await run('INSERT OR IGNORE INTO activity_days (user_id, day) VALUES (?, ?)', [userId, today()]);
  const days = new Set((await all('SELECT day FROM activity_days WHERE user_id = ? ORDER BY day DESC LIMIT 400', [userId])).map((r) => r.day));
  let streak = 0;
  for (let ms = Date.now(); days.has(dayString(ms)); ms -= 86400000) streak += 1;
  await run('UPDATE users SET streak = ? WHERE id = ?', [streak, userId]);
  return streak;
}

/** Current streak without recording activity (0 if they have not coded today or yesterday). */
async function currentStreak(userId) {
  await ensureTables();
  const days = new Set((await all('SELECT day FROM activity_days WHERE user_id = ? ORDER BY day DESC LIMIT 400', [userId])).map((r) => r.day));
  let ms = Date.now();
  if (!days.has(dayString(ms))) ms -= 86400000; // a streak still counts until the end of tomorrow
  let streak = 0;
  for (; days.has(dayString(ms)); ms -= 86400000) streak += 1;
  return streak;
}

async function award(userId, badgeId) {
  const badge = await get('SELECT xp_reward FROM achievements WHERE id = ?', [badgeId]);
  if (!badge) return false;
  const added = await run('INSERT OR IGNORE INTO user_achievements (user_id, achievement_id) VALUES (?, ?)', [userId, badgeId]);
  if (added) await run('UPDATE users SET xp = xp + ? WHERE id = ?', [badge.xp_reward || 0, userId]);
  return added > 0;
}

async function childrenModuleIds() {
  try {
    return (await all("SELECT id FROM modules WHERE target_audience IS NULL OR target_audience IN ('children', 'both')")).map((r) => r.id);
  } catch {
    return (await all('SELECT id FROM modules')).map((r) => r.id); // older database without target_audience
  }
}

/**
 * Check every badge rule for a child and award any newly earned badges.
 * ctx.code / ctx.turtleUsed describe code they just ran or submitted.
 * Returns progress towards the countable badges: { [badgeId]: { current, target } }.
 */
async function evaluateAchievements(userId, ctx = {}) {
  if (!userId) return {};
  await ensureTables();
  const code = typeof ctx.code === 'string' ? ctx.code : '';

  const { n: completed } = await get('SELECT COUNT(*) AS n FROM progress WHERE user_id = ? AND completed = 1', [userId]);
  if (completed >= 1) await award(userId, BADGE.FIRST);
  if (completed >= 5) await award(userId, BADGE.FIVE);

  // Turtle Artist: drew with the turtle (now, or in saved/lesson code).
  const pastCode = async () => {
    const rows = await all(
      `SELECT last_code AS code FROM progress WHERE user_id = ? AND last_code IS NOT NULL
       UNION ALL SELECT code FROM code_history WHERE user_id = ?`, [userId, userId],
    ).catch(() => []);
    return rows.map((r) => r.code || '');
  };
  let history = null;
  if (ctx.turtleUsed || TURTLE_CALL.test(code)) await award(userId, BADGE.TURTLE);
  else {
    history = history || await pastCode();
    if (history.some((c) => TURTLE_CALL.test(c))) await award(userId, BADGE.TURTLE);
  }

  // Loop Master: wrote a for loop.
  if (FOR_LOOP.test(code)) await award(userId, BADGE.LOOP);
  else {
    history = history || await pastCode();
    if (history.some((c) => FOR_LOOP.test(c))) await award(userId, BADGE.LOOP);
  }

  // Module Champion: passed a module quiz (also awarded by the quiz endpoint).
  const passed = await get('SELECT COUNT(*) AS n FROM module_completions WHERE user_id = ? AND quiz_passed = 1', [userId]).catch(() => ({ n: 0 }));
  if (passed.n > 0) await award(userId, BADGE.MODULE);

  // Explorer: tried (started a lesson in) every children's module.
  const moduleIds = await childrenModuleIds();
  const tried = moduleIds.length
    ? (await get(`SELECT COUNT(DISTINCT module_id) AS n FROM progress WHERE user_id = ? AND module_id IN (${moduleIds.map(() => '?').join(',')})`, [userId, ...moduleIds])).n
    : 0;
  if (moduleIds.length && tried >= moduleIds.length) await award(userId, BADGE.EXPLORER);

  // Consistent Coder: 3 days in a row.
  const { streak: storedStreak = 0 } = (await get('SELECT streak FROM users WHERE id = ?', [userId])) || {};
  const streak = Math.max(storedStreak || 0, await currentStreak(userId));
  if (streak >= 3) await award(userId, BADGE.STREAK);

  // Code Ninja last, because other badges add XP.
  const { xp = 0 } = (await get('SELECT xp FROM users WHERE id = ?', [userId])) || {};
  if (xp >= 1000) await award(userId, BADGE.NINJA);

  return {
    [BADGE.FIRST]: { current: Math.min(completed, 1), target: 1 },
    [BADGE.FIVE]: { current: Math.min(completed, 5), target: 5 },
    [BADGE.EXPLORER]: { current: Math.min(tried, moduleIds.length), target: moduleIds.length },
    [BADGE.STREAK]: { current: Math.min(streak, 3), target: 3 },
    [BADGE.NINJA]: { current: Math.min(xp, 1000), target: 1000 },
  };
}

/** Fire-and-forget helper for request handlers: never lets a badge problem break the request. */
function noteCoding(userId, ctx = {}) {
  if (!userId) return;
  recordActivityDay(userId)
    .then(() => evaluateAchievements(userId, ctx))
    .catch((err) => console.error('Badge/streak update failed:', err.message));
}

module.exports = { recordActivityDay, currentStreak, evaluateAchievements, noteCoding, ensureTables, FOR_LOOP, TURTLE_CALL };
