'use strict';
/**
 * Database access for the AI engine (SQLite through the existing sqlite3 handle).
 * Tables are created with IF NOT EXISTS, so existing KidsCode databases upgrade
 * automatically on server start.
 */

const { fingerprint } = require('./offlineBank');

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS ai_mastery (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    language TEXT NOT NULL,
    concept_id TEXT NOT NULL,
    bloom_level TEXT NOT NULL,
    p_known REAL NOT NULL,
    attempts INTEGER DEFAULT 0,
    correct INTEGER DEFAULT 0,
    streak_wrong INTEGER DEFAULT 0,
    hints_used INTEGER DEFAULT 0,
    mastered_at DATETIME,
    last_practiced DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, language, concept_id, bloom_level),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS ai_activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    language TEXT NOT NULL,
    concept_id TEXT NOT NULL,
    bloom_level TEXT NOT NULL,
    activity_type TEXT NOT NULL,
    content_json TEXT NOT NULL,
    source TEXT NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'open' CHECK(status IN ('open', 'done')),
    correct INTEGER,
    hints_used INTEGER DEFAULT 0,
    time_seconds INTEGER,
    answer TEXT,
    xp_earned INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  'CREATE INDEX IF NOT EXISTS idx_ai_activities_user ON ai_activities(user_id, created_at)',
  `CREATE TABLE IF NOT EXISTS ai_learner_prefs (
    user_id INTEGER PRIMARY KEY,
    language TEXT,
    locale TEXT DEFAULT 'en',
    interests TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS ai_content_cache (
    cache_key TEXT PRIMARY KEY,
    content_json TEXT NOT NULL,
    source TEXT NOT NULL,
    uses INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS ai_safety_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    context TEXT NOT NULL,
    reasons TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
];

class Store {
  constructor(db) { this.db = db; }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function onRun(err) { if (err) reject(err); else resolve({ lastID: this.lastID, changes: this.changes }); });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => this.db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row))));
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => this.db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || []))));
  }

  async migrate() {
    for (const sql of SCHEMA) await this.run(sql);
  }

  // ----- users & relationships -----
  getUser(id) { return this.get('SELECT id, username, display_name, age, account_type, xp FROM users WHERE id = ?', [id]); }
  addXp(userId, xp) { return xp > 0 ? this.run('UPDATE users SET xp = xp + ? WHERE id = ?', [xp, userId]) : Promise.resolve(); }

  async canViewLearner(viewer, learnerId) {
    if (Number(viewer.id) === Number(learnerId)) return true;
    if (viewer.accountType === 'parent') {
      return Boolean(await this.get('SELECT 1 FROM parent_child_relationships WHERE parent_id = ? AND child_id = ? AND can_view_progress = 1', [viewer.id, learnerId]));
    }
    if (viewer.accountType === 'teacher') {
      return Boolean(await this.get("SELECT 1 FROM teacher_student_relationships WHERE teacher_id = ? AND student_id = ? AND status = 'active' AND can_view_progress = 1", [viewer.id, learnerId]));
    }
    return false;
  }

  teacherStudents(teacherId) {
    return this.all(
      `SELECT u.id, u.username, u.display_name, u.age, tsr.class_name FROM teacher_student_relationships tsr
       JOIN users u ON u.id = tsr.student_id WHERE tsr.teacher_id = ? AND tsr.status = 'active'`, [teacherId],
    );
  }

  // ----- preferences -----
  getPrefs(userId) { return this.get('SELECT * FROM ai_learner_prefs WHERE user_id = ?', [userId]); }
  savePrefs(userId, { language, locale, interests }) {
    return this.run(
      `INSERT INTO ai_learner_prefs (user_id, language, locale, interests, updated_at) VALUES (?, ?, ?, ?, datetime('now'))
       ON CONFLICT(user_id) DO UPDATE SET
         language = COALESCE(excluded.language, ai_learner_prefs.language),
         locale = COALESCE(excluded.locale, ai_learner_prefs.locale),
         interests = COALESCE(excluded.interests, ai_learner_prefs.interests),
         updated_at = excluded.updated_at`,
      [userId, language || null, locale || null, interests ? JSON.stringify(interests).slice(0, 500) : null],
    );
  }

  // ----- mastery -----
  masteryRows(userId) { return this.all('SELECT * FROM ai_mastery WHERE user_id = ?', [userId]); }

  upsertMastery(userId, { language, concept, level, p, correct, hintsUsed, mastered }) {
    return this.run(
      `INSERT INTO ai_mastery (user_id, language, concept_id, bloom_level, p_known, attempts, correct, streak_wrong, hints_used, mastered_at, last_practiced)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(user_id, language, concept_id, bloom_level) DO UPDATE SET
         p_known = excluded.p_known,
         attempts = ai_mastery.attempts + 1,
         correct = ai_mastery.correct + excluded.correct,
         streak_wrong = CASE WHEN excluded.correct = 1 THEN 0 ELSE ai_mastery.streak_wrong + 1 END,
         hints_used = ai_mastery.hints_used + excluded.hints_used,
         mastered_at = COALESCE(ai_mastery.mastered_at, excluded.mastered_at),
         last_practiced = excluded.last_practiced`,
      [userId, language, concept, level, p, correct ? 1 : 0, correct ? 0 : 1, hintsUsed || 0, mastered ? new Date().toISOString() : null],
    );
  }

  // ----- activities -----
  async createActivity(userId, a, reason) {
    const { lastID } = await this.run(
      `INSERT INTO ai_activities (user_id, language, concept_id, bloom_level, activity_type, content_json, source, reason)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, a.language, a.concept, a.bloom, a.type, JSON.stringify(a), a.source, reason || null],
    );
    return lastID;
  }

  async getActivity(userId, id) {
    const row = await this.get('SELECT * FROM ai_activities WHERE id = ? AND user_id = ?', [id, userId]);
    if (!row) return null;
    return { ...row, content: JSON.parse(row.content_json) };
  }

  incrementHints(id) { return this.run('UPDATE ai_activities SET hints_used = hints_used + 1 WHERE id = ?', [id]); }

  completeActivity(id, { correct, answer, timeSeconds, xp }) {
    return this.run(
      `UPDATE ai_activities SET status = 'done', correct = ?, answer = ?, time_seconds = ?, xp_earned = ?, completed_at = datetime('now')
       WHERE id = ? AND status = 'open'`,
      [correct ? 1 : 0, String(answer || '').slice(0, 5000), timeSeconds || null, xp || 0, id],
    );
  }

  countDone(userId, language) {
    return this.get("SELECT COUNT(*) AS n FROM ai_activities WHERE user_id = ? AND language = ? AND status = 'done'", [userId, language]).then((r) => (r ? r.n : 0));
  }

  recentActivities(userId, days = 7) {
    return this.all(
      `SELECT language, concept_id, bloom_level, activity_type, correct, hints_used, time_seconds, completed_at FROM ai_activities
       WHERE user_id = ? AND status = 'done' AND completed_at >= datetime('now', ?) ORDER BY completed_at DESC`,
      [userId, `-${Number(days)} days`],
    );
  }

  /**
   * Questions this learner has already been given for one concept + Bloom level
   * (most recent first), so the generator can avoid repeating them.
   */
  async seenQuestions(userId, language, concept, level, limit = 40) {
    const rows = await this.all(
      `SELECT content_json FROM ai_activities WHERE user_id = ? AND language = ? AND concept_id = ? AND bloom_level = ?
       ORDER BY id DESC LIMIT ?`, [userId, language, concept, level, limit],
    );
    const variants = [];
    const fingerprints = [];
    rows.forEach((r) => {
      try {
        const c = JSON.parse(r.content_json);
        if (c.variantKey) variants.push(c.variantKey);
        fingerprints.push(c.fingerprint || fingerprint(c));
      } catch { /* ignore unreadable rows */ }
    });
    return { variants, fingerprints };
  }

  /** Recently answered activities in a language, newest first (used to end a step-back). */
  recentDone(userId, language, limit = 60) {
    return this.all(
      `SELECT concept_id, bloom_level, correct FROM ai_activities WHERE user_id = ? AND language = ? AND status = 'done'
       ORDER BY id DESC LIMIT ?`, [userId, language, limit],
    );
  }

  recentMistakes(userId, language, limit = 3) {
    return this.all(
      `SELECT concept_id, bloom_level, activity_type FROM ai_activities WHERE user_id = ? AND language = ? AND status = 'done' AND correct = 0
       ORDER BY completed_at DESC LIMIT ?`, [userId, language, limit],
    );
  }

  // ----- content cache -----
  async getCached(key) {
    const row = await this.get('SELECT * FROM ai_content_cache WHERE cache_key = ?', [key]);
    if (!row) return null;
    this.run('UPDATE ai_content_cache SET uses = uses + 1 WHERE cache_key = ?', [key]).catch(() => {});
    return JSON.parse(row.content_json);
  }

  putCached(key, content, source) {
    return this.run('INSERT OR REPLACE INTO ai_content_cache (cache_key, content_json, source) VALUES (?, ?, ?)', [key, JSON.stringify(content), source]);
  }

  // ----- safety -----
  logSafety(userId, context, reasons) {
    return this.run('INSERT INTO ai_safety_log (user_id, context, reasons) VALUES (?, ?, ?)', [userId || null, context, reasons.join(',')]).catch(() => {});
  }
}

module.exports = { Store, SCHEMA };
