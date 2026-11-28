'use strict';
/**
 * Adult learners: "Professional Web Development" (ICT/CU/CP/CR/08/6/A).
 *
 *   POST /api/adult/register | /login          account
 *   GET  /api/adult/me      PUT /api/adult/profile      PUT /api/adult/password
 *   GET  /api/adult/curriculum                    modules, lessons and their status, totals
 *   GET  /api/adult/lesson/:id                    lesson text, example, task, checks, written test, oral question
 *   POST /api/adult/lesson/:id/save               save code
 *   POST /api/adult/lesson/:id/check              practical test (checks the code)
 *   POST /api/adult/lesson/:id/quiz               written test
 *   POST /api/adult/lesson/:id/oral               oral practice (explanation in your own words)
 *   POST /api/adult/lesson/:id/complete           finish: needs the practical and written tests passed
 *   POST /api/adult/activity                      study-time heartbeat (one minute at a time)
 *   GET  /api/adult/progress                      progress report
 *   GET  /api/adult/certificates            every course with its requirements and certificate
 *   POST /api/adult/certificates/:courseId  issue the certificate for one course
 *   GET  /api/certificates/verify/:code           public certificate check (for employers)
 *
 * Study time is counted from heartbeats sent once a minute while a lesson or the
 * playground is open and the learner is active, so the 170-hour requirement reflects
 * real study time.
 */
const express = require('express');
const crypto = require('crypto');
const { getDb } = require('./database');
const course = require('./adultCourse');
const safety = require('./ai/safety');
const { createAdultFriendsRouter } = require('./adult-friends');

const all = (sql, p = []) => new Promise((res, rej) => getDb().all(sql, p, (e, r) => (e ? rej(e) : res(r || []))));
const get = (sql, p = []) => new Promise((res, rej) => getDb().get(sql, p, (e, r) => (e ? rej(e) : res(r))));
const run = (sql, p = []) => new Promise((res, rej) => getDb().run(sql, p, function done(e) { if (e) rej(e); else res(this); }));
const fail = (status, message, code) => Object.assign(new Error(message), { status, code });

let ready = null;
function ensureReady() {
  if (!ready) {
    ready = course.syncCourse({ all, get, run })
      .then(async (r) => {
        if (r.merged) console.log(`Adult course: merged ${r.merged} duplicate lessons`);
        // The name printed on a certificate is fixed when it is issued, so a later profile
        // edit cannot change (or swap) the name on an issued certificate.
        for (const col of ['issued_first_name', 'issued_last_name']) {
          await run(`ALTER TABLE certificates ADD COLUMN ${col} TEXT`).catch(() => {}); // already there
        }
        // Certificates issued before this change keep the name they show today.
        await run(`UPDATE certificates SET
            issued_first_name = (SELECT first_name FROM users WHERE users.id = certificates.user_id),
            issued_last_name = (SELECT last_name FROM users WHERE users.id = certificates.user_id)
          WHERE issued_first_name IS NULL`).catch(() => {});
        // One certificate per course. Certificates issued before courses had their own were for
        // the original programme, Web Development (course 1).
        await run('ALTER TABLE certificates ADD COLUMN course_id INTEGER').catch(() => {}); // already there
        await run('UPDATE certificates SET course_id = 1 WHERE course_id IS NULL').catch(() => {});
        await run('CREATE UNIQUE INDEX IF NOT EXISTS idx_cert_user_course ON certificates(user_id, course_id)').catch(() => {});
      })
      .catch((e) => { ready = null; throw e; });
  }
  return ready;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const parseJson = (s, d) => { try { return JSON.parse(s); } catch { return d; } };
const clean = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : null) || null;

function publicUser(u, profile) {
  return {
    id: u.id, email: u.email, firstName: u.first_name, lastName: u.last_name, phoneNumber: u.phone_number,
    accountType: 'adult_learner', occupation: profile ? profile.occupation : null, educationLevel: profile ? profile.education_level : null,
    learningGoals: profile ? profile.learning_goals : null,
  };
}

/** Adult lesson rows in course order. */
async function adultLessons() {
  const rows = await all(
    `SELECT l.id, l.module_id, l.order_num, l.title, l.estimated_minutes FROM lessons l JOIN modules m ON m.id = l.module_id
     WHERE m.target_audience IN ('adults', 'both') ORDER BY m.order_num, l.order_num`,
  );
  // Leftover rows from an older, longer version of a module (kept only because a learner worked on them) are hidden.
  return rows.filter((l) => course.courseLesson(l.module_id, l.order_num));
}

async function minutesOf(userId) {
  const r = await get('SELECT COALESCE(SUM(duration_minutes), 0) AS m FROM learning_hours_log WHERE user_id = ?', [userId]);
  return r ? r.m : 0;
}
async function hoursOf(userId) {
  return Math.round(((await minutesOf(userId)) / 60) * 10) / 10;
}

/**
 * Lessons are taken in order within each course: a lesson opens once the lesson before it in
 * the same course is completed (practical, written test and oral answer). The first lesson of
 * every course is always open, so courses can be taken in any order, and a lesson the learner
 * has already completed stays open for review.
 * @param {{id: number, module_id: number}[]} lessons adult lessons in course order
 * @param {Set<number>} completed ids of completed lessons
 * @returns {Map<number, {id: number, title: string}>} locked lesson id -> the lesson to finish first
 */
function lockedLessons(lessons, completed) {
  const locked = new Map();
  for (const c of course.COURSES) {
    const list = lessons.filter((l) => c.modules.includes(l.module_id));
    for (let i = 1; i < list.length; i += 1) {
      if (!completed.has(list[i].id) && !completed.has(list[i - 1].id)) {
        locked.set(list[i].id, { id: list[i - 1].id, title: list[i - 1].title });
      }
    }
  }
  return locked;
}

/** Throws 403 'lesson_locked' (naming the lesson to finish first) if this lesson is locked for the learner. */
async function assertUnlocked(userId, lesson) {
  const lessons = await adultLessons();
  const done = await all('SELECT lesson_id FROM progress WHERE user_id = ? AND completed = 1', [userId]);
  const previous = lockedLessons(lessons, new Set(done.map((d) => d.lesson_id))).get(lesson.id);
  if (previous) {
    throw Object.assign(fail(403, `This lesson is locked. Pass "${previous.title}" first.`, 'lesson_locked'), { details: { previous } });
  }
}

/** Totals used by the dashboard, progress page and certificate. */
async function summary(userId) {
  const lessons = await adultLessons();
  const ids = lessons.map((l) => l.id);
  const progress = ids.length ? await all(
    `SELECT lesson_id, completed, score FROM progress WHERE user_id = ? AND lesson_id IN (${ids.join(',')})`, [userId],
  ) : [];
  const done = progress.filter((p) => p.completed);
  const avg = done.length ? Math.round(done.reduce((s, p) => s + (p.score || 0), 0) / done.length) : 0;
  const minutes = await minutesOf(userId);
  const hours = Math.round((minutes / 60) * 10) / 10;
  return {
    lessons, progress, completedLessons: done.length, totalLessons: ids.length, averageScore: avg, hoursLogged: hours, minutesLogged: minutes,
    progressPercentage: ids.length ? Math.round((100 * done.length) / ids.length) : 0,
  };
}

const certificateSql = `SELECT c.*, COALESCE(c.issued_first_name, u.first_name) AS first_name, COALESCE(c.issued_last_name, u.last_name) AS last_name
  FROM certificates c JOIN users u ON u.id = c.user_id`;

function certificateView(c) {
  const co = course.COURSES.find((x) => x.id === Number(c.course_id)) || course.COURSES[0];
  return {
    id: c.id, courseId: co.id, courseKey: co.key, courseTitle: co.title, certificateNumber: c.certificate_number,
    verificationCode: c.verification_code, issueDate: c.issue_date, totalHours: c.total_hours, overallScore: c.overall_score,
    curriculumCode: c.curriculum_code || co.units[0], firstName: c.first_name, lastName: c.last_name,
  };
}

/**
 * Every course with the learner's progress towards its certificate:
 * all its lessons completed, an average of PASS_MARK or more, and its study hours
 * (time spent in that course's lessons).
 * @param {number} userId
 * @param {object} [s] a summary() already loaded
 */
async function courseStatuses(userId, s) {
  const sum = s || await summary(userId);
  const prog = Object.fromEntries(sum.progress.map((p) => [p.lesson_id, p]));
  const minutesByModule = Object.fromEntries((await all(
    'SELECT module_id, SUM(duration_minutes) AS m FROM learning_hours_log WHERE user_id = ? AND module_id IS NOT NULL GROUP BY module_id', [userId],
  )).map((r) => [r.module_id, r.m]));
  const certs = await all(`${certificateSql} WHERE c.user_id = ?`, [userId]);
  return course.COURSES.map((c) => {
    const lessons = sum.lessons.filter((l) => c.modules.includes(l.module_id));
    const done = lessons.filter((l) => prog[l.id] && prog[l.id].completed);
    const avg = done.length ? Math.round(done.reduce((a, l) => a + (prog[l.id].score || 0), 0) / done.length) : 0;
    const minutes = c.modules.reduce((n, id) => n + (minutesByModule[id] || 0), 0);
    const requirements = {
      allLessonsCompleted: { met: lessons.length > 0 && done.length >= lessons.length, current: done.length, required: lessons.length },
      passedAssessments: { met: done.length > 0 && avg >= course.PASS_MARK, current: avg, required: course.PASS_MARK },
      sufficientHours: { met: minutes / 60 >= c.requiredHours, current: minutes / 60, required: c.requiredHours },
    };
    // Certificates from before per-course certificates have no course: they were for Web Development.
    const cert = certs.find((x) => (Number(x.course_id) || 1) === c.id);
    return {
      id: c.id, key: c.key, title: c.title, language: c.language, units: c.units, modules: c.modules.length,
      totalLessons: lessons.length, completedLessons: done.length, averageScore: avg, minutesLogged: minutes,
      hours: c.hours, requiredHours: c.requiredHours, started: lessons.some((l) => prog[l.id]),
      progressPercentage: lessons.length ? Math.round((100 * done.length) / lessons.length) : 0,
      requirements, eligible: Object.values(requirements).every((r) => r.met),
      certificate: cert ? certificateView(cert) : null,
    };
  });
}

async function bestScores(userId, lessonId) {
  const rows = await all(
    'SELECT assessment_type AS type, MAX(percentage) AS best FROM assessment_results WHERE user_id = ? AND lesson_id = ? GROUP BY assessment_type',
    [userId, lessonId],
  );
  return Object.fromEntries(rows.map((r) => [r.type, r.best]));
}

async function recordAssessment(userId, lessonId, type, percent, data) {
  await run(
    `INSERT INTO assessment_results (user_id, lesson_id, assessment_type, score, max_score, percentage, passed, submission_data)
     VALUES (?, ?, ?, ?, 100, ?, ?, ?)`,
    [userId, lessonId, type, percent, percent, percent >= course.PASS_MARK ? 1 : 0, data ? JSON.stringify(data).slice(0, 20000) : null],
  );
}

async function saveCode(userId, lesson, code) {
  const keep = (k) => String(code[k] || '').slice(0, 50000);
  const json = JSON.stringify({ html: keep('html'), css: keep('css'), js: keep('js'), java: keep('java'), python: keep('python'), sql: keep('sql') });
  await run(
    `INSERT INTO progress (user_id, module_id, lesson_id, completed, last_code, score, updated_at)
     VALUES (?, ?, ?, 0, ?, 0, CURRENT_TIMESTAMP)
     ON CONFLICT(user_id, lesson_id) DO UPDATE SET last_code = excluded.last_code, updated_at = CURRENT_TIMESTAMP`,
    [userId, lesson.module_id, lesson.id, json],
  );
}

// ---------------------------------------------------------------------------
// Server-side code runners (see backend/sandbox)
// ---------------------------------------------------------------------------
const RUNNERS = {
  java: () => require('./sandbox/runJava').runJava,
  python: () => require('./sandbox/runPython').runPython,
  sql: () => require('./sandbox/runSQL').runSQL,
};
const RUNS_PER_MINUTE = 30;
const runLog = new Map();

/** At most RUNS_PER_MINUTE runs per learner per minute (protects the server's CPU). */
function allowRun(userId) {
  const now = Date.now();
  const recent = (runLog.get(userId) || []).filter((t) => now - t < 60000);
  if (recent.length >= RUNS_PER_MINUTE) { runLog.set(userId, recent); return false; }
  recent.push(now);
  runLog.set(userId, recent);
  if (runLog.size > 5000) for (const [k, v] of runLog) if (!v.some((t) => now - t < 60000)) runLog.delete(k);
  return true;
}

function runtimeStatus() {
  const { findTool } = require('./sandbox/common');
  const first = (s) => (s ? s.version.split(/\r?\n/)[0] : null);
  const javaHomes = [process.env.KIDSCODE_JAVA_HOME, process.env.JAVA_HOME].filter(Boolean);
  const javac = findTool('javac', [...javaHomes.map((h) => require('path').join(h, 'bin', 'javac')), 'javac'], ['-version']);
  const py = findTool('python', [process.env.KIDSCODE_PYTHON, 'python3', 'python', 'py'], ['-c', 'import sys; print(sys.version_info[0], sys.version_info[1])']);
  return {
    java: { available: Boolean(javac), version: first(javac) },
    python: { available: Boolean(py), version: py ? `Python ${py.version.replace(' ', '.')}` : null },
    sql: { available: true, version: 'SQLite (practice database)' },
  };
}

const lastBeat = new Map();

function createAdultRouter({ authenticateToken, jwt, JWT_SECRET, bcrypt, setAuthCookie, clearAuthCookie }) {
  const router = express.Router();
  const wrap = (fn) => async (req, res) => {
    try {
      await ensureReady();
      res.json(await fn(req, res));
    } catch (err) {
      if (!err.status) console.error('Adult route error:', err);
      res.status(err.status || 500).json({ error: err.status ? err.message : 'Something went wrong. Please try again.', code: err.code, ...(err.status && err.details ? err.details : {}) });
    }
  };
  const adultOnly = (req, res, next) => (req.user && req.user.accountType === 'adult_learner'
    ? next() : res.status(403).json({ error: 'Adult learner account required' }));
  const sign = (u) => jwt.sign({ id: u.id, email: u.email, accountType: 'adult_learner' }, JWT_SECRET, { expiresIn: '30d' });

  // ---- account ----
  router.post('/register', wrap(async (req, res) => {
    const b = req.body || {};
    const email = clean(b.email, 120);
    const firstName = clean(b.firstName, 60);
    const lastName = clean(b.lastName, 60);
    if (!email || !b.password || !firstName || !lastName) throw fail(400, 'Email, password, first name and last name are required');
    if (!EMAIL_RE.test(email)) throw fail(400, 'Please enter a valid email address');
    if (String(b.password).length < 8) throw fail(400, 'Password must be at least 8 characters');
    const hashed = await bcrypt.hash(String(b.password), 10);
    let r;
    try {
      r = await run('INSERT INTO users (account_type, email, password, first_name, last_name, phone_number) VALUES (?, ?, ?, ?, ?, ?)',
        ['adult_learner', email.toLowerCase(), hashed, firstName, lastName, clean(b.phoneNumber, 30)]);
    } catch (e) {
      if (/UNIQUE/.test(e.message)) throw fail(400, 'This email is already registered. Please sign in instead.', 'email_taken');
      throw e;
    }
    await run('INSERT OR IGNORE INTO adult_learner_profiles (user_id, occupation, education_level, learning_goals) VALUES (?, ?, ?, ?)',
      [r.lastID, clean(b.occupation, 80), clean(b.educationLevel, 80), clean(b.learningGoals, 500)]);
    const user = await get('SELECT * FROM users WHERE id = ?', [r.lastID]);
    const profile = await get('SELECT * FROM adult_learner_profiles WHERE user_id = ?', [r.lastID]);
    const token = sign(user);
    setAuthCookie(res, token);
    return { success: true, token, user: publicUser(user, profile) };
  }));

  router.post('/login', wrap(async (req, res) => {
    const email = clean((req.body || {}).email, 120);
    const password = String((req.body || {}).password || '');
    if (!email || !password) throw fail(400, 'Email and password required');
    const user = await get("SELECT * FROM users WHERE lower(email) = lower(?) AND account_type = 'adult_learner'", [email]);
    if (!user || !(await bcrypt.compare(password, user.password))) throw fail(401, 'Invalid email or password');
    await run("UPDATE users SET last_active = date('now') WHERE id = ?", [user.id]);
    await run('INSERT OR IGNORE INTO adult_learner_profiles (user_id) VALUES (?)', [user.id]);
    const profile = await get('SELECT * FROM adult_learner_profiles WHERE user_id = ?', [user.id]);
    const token = sign(user);
    setAuthCookie(res, token);
    return { success: true, token, user: publicUser(user, profile) };
  }));

  router.post('/logout', (req, res) => {
    clearAuthCookie(res);
    res.json({ success: true });
  });

  /** Public: what the programme offers right now (shown on the sign-in pages). */
  router.get('/overview', (req, res) => {
    const courses = course.COURSES.map((c) => {
      const mods = course.MODULES.filter((m) => c.modules.includes(m.id));
      return {
        id: c.id, key: c.key, title: c.title, language: c.language, units: c.units, modules: mods.length,
        lessons: mods.reduce((n, m) => n + m.lessons.length, 0), hours: c.hours, requiredHours: c.requiredHours,
      };
    });
    res.json({
      courses,
      modules: course.MODULES.length,
      lessons: course.MODULES.reduce((n, m) => n + m.lessons.length, 0),
      totalHours: course.TOTAL_HOURS,
      requiredHours: course.REQUIRED_HOURS,
      certificates: course.COURSES.length,   // one certificate per course
    });
  });

  // Everything below needs an adult learner login.
  router.use(authenticateToken, adultOnly);

  // Friends & study circle: adult-only social features, mounted after the guard
  // so no child/parent/teacher token can reach them.
  router.use('/friends', createAdultFriendsRouter({ ensureReady, summary, courseStatuses }));

  router.get('/me', wrap(async (req) => {
    const user = await get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!user) throw fail(404, 'Account not found');
    const profile = await get('SELECT * FROM adult_learner_profiles WHERE user_id = ?', [req.user.id]);
    return { user: publicUser(user, profile) };
  }));

  router.put('/profile', wrap(async (req) => {
    const b = req.body || {};
    const firstName = clean(b.firstName, 60);
    const lastName = clean(b.lastName, 60);
    if (!firstName || !lastName) throw fail(400, 'First and last name are required');
    await run('UPDATE users SET first_name = ?, last_name = ?, phone_number = ? WHERE id = ?', [firstName, lastName, clean(b.phoneNumber, 30), req.user.id]);
    await run('INSERT OR IGNORE INTO adult_learner_profiles (user_id) VALUES (?)', [req.user.id]);
    await run("UPDATE adult_learner_profiles SET occupation = ?, education_level = ?, learning_goals = ?, updated_at = datetime('now') WHERE user_id = ?",
      [clean(b.occupation, 80), clean(b.educationLevel, 80), clean(b.learningGoals, 500), req.user.id]);
    const user = await get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    const profile = await get('SELECT * FROM adult_learner_profiles WHERE user_id = ?', [req.user.id]);
    return { success: true, user: publicUser(user, profile) };
  }));

  router.put('/password', wrap(async (req) => {
    const { currentPassword, newPassword } = req.body || {};
    const user = await get('SELECT password FROM users WHERE id = ?', [req.user.id]);
    if (!user || !(await bcrypt.compare(String(currentPassword || ''), user.password))) throw fail(400, 'Your current password is not correct', 'wrong_password');
    if (String(newPassword || '').length < 8) throw fail(400, 'Password must be at least 8 characters');
    await run('UPDATE users SET password = ? WHERE id = ?', [await bcrypt.hash(String(newPassword), 10), req.user.id]);
    return { success: true };
  }));

  // ---- course ----
  router.get('/curriculum', wrap(async (req) => {
    const s = await summary(req.user.id);
    const modules = await all("SELECT * FROM modules WHERE target_audience IN ('adults', 'both') ORDER BY order_num");
    const prog = Object.fromEntries(s.progress.map((p) => [p.lesson_id, p]));
    const nextLesson = s.lessons.find((l) => !(prog[l.id] && prog[l.id].completed)) || null;
    const courses = await courseStatuses(req.user.id, s);
    const locked = lockedLessons(s.lessons, new Set(s.progress.filter((p) => p.completed).map((p) => p.lesson_id)));
    return {
      curriculum: modules.map((m) => ({
        id: m.id, title: m.title, description: m.description, icon: m.icon, color: m.color, order_num: m.order_num,
        difficulty: m.difficulty, estimated_hours: m.estimated_hours,
        lessons: s.lessons.filter((l) => l.module_id === m.id).map((l) => ({
          id: l.id, title: l.title, order_num: l.order_num, minutes: l.estimated_minutes,
          completed: prog[l.id] && prog[l.id].completed ? 1 : 0, started: Boolean(prog[l.id]), score: prog[l.id] ? prog[l.id].score || 0 : 0,
          locked: locked.has(l.id), unlockAfter: locked.get(l.id) || null,
        })),
      })),
      stats: {
        completedLessons: s.completedLessons, totalLessons: s.totalLessons, averageScore: s.averageScore,
        hoursLogged: s.hoursLogged, minutesLogged: s.minutesLogged, requiredHours: course.REQUIRED_HOURS, progressPercentage: s.progressPercentage,
        certificatesEarned: courses.filter((c) => c.certificate).length,
        certificatesReady: courses.filter((c) => c.eligible && !c.certificate).length,
      },
      // One entry per course: progress towards its certificate (and the certificate once issued).
      courses,
      nextLesson: nextLesson ? { id: nextLesson.id, title: nextLesson.title, moduleId: nextLesson.module_id } : null,
      curriculumCode: course.CURRICULUM_CODE,
    };
  }));

  async function loadLesson(req) {
    const lesson = await get(
      `SELECT l.*, m.title AS module_title, m.icon AS module_icon, m.order_num AS module_order FROM lessons l JOIN modules m ON m.id = l.module_id
       WHERE l.id = ? AND m.target_audience IN ('adults', 'both')`, [Number(req.params.id)],
    );
    if (!lesson) throw fail(404, 'Lesson not found');
    const c = course.courseLesson(lesson.module_id, lesson.order_num);
    if (!c) throw fail(404, 'Lesson not found');
    await assertUnlocked(req.user.id, lesson);
    return { lesson, c };
  }

  router.get('/lesson/:id', wrap(async (req) => {
    const { lesson, c } = await loadLesson(req);
    const p = await get('SELECT completed, score, last_code FROM progress WHERE user_id = ? AND lesson_id = ?', [req.user.id, lesson.id]);
    const order = await adultLessons();
    const i = order.findIndex((l) => l.id === lesson.id);
    const inModule = order.filter((l) => l.module_id === lesson.module_id);
    const best = await bestScores(req.user.id, lesson.id);
    return {
      lesson: {
        id: lesson.id, moduleId: lesson.module_id, moduleTitle: lesson.module_title, moduleIcon: lesson.module_icon,
        number: inModule.findIndex((l) => l.id === lesson.id) + 1, lessonsInModule: inModule.length,
        title: c.title, minutes: c.minutes, content: c.content, example: c.example || {}, challenge: c.challenge, hints: c.hints || [],
        language: course.languageOf(lesson.module_id),
        checks: c.checks.map((k) => ({ label: k.label, in: course.checkTarget(k, course.languageOf(lesson.module_id)) })),
        quiz: course.quizFor(c, lesson.id).map(({ answerIndex, why, ...q }) => q),
        oral: c.oral || null,
        usesJquery: lesson.module_id === 108,
        savedCode: p && p.last_code ? parseJson(p.last_code, { html: p.last_code }) : null,
        completed: Boolean(p && p.completed), score: p ? p.score || 0 : 0,
        best: { practical: best.practical ?? null, written: best.written ?? null, oral: best.oral ?? null },
        passMark: course.PASS_MARK,
        prev: i > 0 ? { id: order[i - 1].id, title: order[i - 1].title } : null,
        // The next lesson in the same course opens only after this one is completed.
        next: i >= 0 && i < order.length - 1 ? {
          id: order[i + 1].id, title: order[i + 1].title,
          locked: !(p && p.completed) && course.courseOfModule(order[i + 1].module_id) === course.courseOfModule(lesson.module_id),
        } : null,
        oralRequired: Boolean(c.oral),
      },
    };
  }));

  router.post('/lesson/:id/save', wrap(async (req) => {
    const { lesson } = await loadLesson(req);
    await saveCode(req.user.id, lesson, (req.body && req.body.code) || {});
    return { success: true };
  }));

  router.post('/lesson/:id/check', wrap(async (req) => {
    const { lesson, c } = await loadLesson(req);
    const code = (req.body && req.body.code) || {};
    const r = await course.gradePractical(c, code, course.languageOf(lesson.module_id));
    await saveCode(req.user.id, lesson, code);
    await recordAssessment(req.user.id, lesson.id, 'practical', r.score, { results: r.results });
    return r;
  }));

  // ---- running Java, Python and SQL on the server ----
  // Every language answers with the same shape: { ok, language, output, error, tables, notes, timeMs }.
  router.post('/code/execute/:language', wrap(async (req) => {
    const language = String(req.params.language || '').toLowerCase();
    const runner = RUNNERS[language];
    if (!runner) throw fail(404, 'Unknown language. Use java, python or sql.');
    if (!allowRun(req.user.id)) throw fail(429, `You are running code very quickly. Please wait a few seconds and try again (limit: ${RUNS_PER_MINUTE} runs a minute).`, 'too_many_runs');
    const code = (req.body && req.body.code) ?? '';
    const input = typeof (req.body && req.body.input) === 'string' ? req.body.input : '';
    return runner()(code, { input });
  }));

  /** Tables in the SQL practice database (shown beside the SQL editor). */
  router.get('/code/sql/tables', wrap(async () => ({ tables: require('./sandbox/runSQL').SAMPLE_TABLES })));

  /** Which languages this server can run (Java and Python need to be installed). */
  router.get('/code/status', wrap(async () => runtimeStatus()));

  router.post('/lesson/:id/quiz', wrap(async (req) => {
    const { lesson, c } = await loadLesson(req);
    const answers = Array.isArray(req.body && req.body.answers) ? req.body.answers : [];
    const r = course.gradeQuiz(c, lesson.id, answers);
    await recordAssessment(req.user.id, lesson.id, 'written', r.score, { answers });
    return r;
  }));

  router.post('/lesson/:id/oral', wrap(async (req) => {
    const { lesson, c } = await loadLesson(req);
    if (!c.oral) throw fail(400, 'This lesson has no oral question');
    const text = String((req.body && req.body.text) || '').trim().slice(0, 4000);
    const words = text.split(/\s+/).filter(Boolean).length;
    if (words < 30) throw fail(400, `Please explain in at least 30 words (you wrote ${words}).`, 'too_short');
    const check = safety.checkText(text);
    if (!check.ok) throw fail(422, 'Please keep your answer on the lesson topic.', 'not_safe');
    await recordAssessment(req.user.id, lesson.id, 'oral', 100, { text, words });
    return { success: true, words };
  }));

  router.post('/lesson/:id/complete', wrap(async (req) => {
    const { lesson, c } = await loadLesson(req);
    const code = (req.body && req.body.code) || {};
    const practical = await course.gradePractical(c, code, course.languageOf(lesson.module_id));
    await saveCode(req.user.id, lesson, code);
    if (!practical.passed) throw Object.assign(fail(400, `The practical task is not finished yet (${practical.score}% - you need ${course.PASS_MARK}%). Press "Check my work" to see what is missing.`, 'practical_not_passed'), {});
    const best = await bestScores(req.user.id, lesson.id);
    const written = c.quiz.length ? best.written ?? null : 100;
    if (written === null || written < course.PASS_MARK) throw fail(400, `Pass the written test first (you need ${course.PASS_MARK}%).`, 'written_not_passed');
    // The oral answer is required too (every lesson has an oral question).
    if (c.oral && (best.oral === undefined || best.oral === null)) throw fail(400, 'Record your oral answer first (step 4: Oral practice).', 'oral_not_done');
    const score = Math.round((practical.score + written) / 2);
    const before = await get('SELECT completed, score FROM progress WHERE user_id = ? AND lesson_id = ?', [req.user.id, lesson.id]);
    await run(
      `INSERT INTO progress (user_id, module_id, lesson_id, completed, score, updated_at) VALUES (?, ?, ?, 1, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(user_id, lesson_id) DO UPDATE SET completed = 1, score = MAX(COALESCE(progress.score, 0), excluded.score), updated_at = CURRENT_TIMESTAMP`,
      [req.user.id, lesson.module_id, lesson.id, score],
    );
    await recordAssessment(req.user.id, lesson.id, 'practical', practical.score, { results: practical.results, final: true });
    const order = await adultLessons();
    const i = order.findIndex((l) => l.id === lesson.id);
    const s = await summary(req.user.id);
    return {
      success: true, score: Math.max(score, before && before.completed ? before.score || 0 : 0), practical: practical.score, written,
      firstTime: !(before && before.completed),
      next: i >= 0 && i < order.length - 1 ? { id: order[i + 1].id, title: order[i + 1].title, moduleId: order[i + 1].module_id } : null,
      moduleFinished: order.filter((l) => l.module_id === lesson.module_id).every((l) => s.progress.some((p) => p.lesson_id === l.id && p.completed)),
      // Every lesson of this lesson's course is done: its certificate may be within reach.
      courseId: (course.courseOfModule(lesson.module_id) || {}).id || null,
      courseFinished: (() => {
        const co = course.courseOfModule(lesson.module_id);
        return Boolean(co) && order.filter((l) => co.modules.includes(l.module_id)).every((l) => s.progress.some((p) => p.lesson_id === l.id && p.completed));
      })(),
    };
  }));

  // ---- study time ----
  router.post('/activity', wrap(async (req) => {
    const userId = req.user.id;
    const now = Date.now();
    const last = lastBeat.get(userId) || 0;
    // One credited minute per ~minute of activity; extra beats (several tabs) are ignored.
    if (now - last < 50 * 1000) return { credited: 0, hoursLogged: await hoursOf(userId) };
    lastBeat.set(userId, now);
    const b = req.body || {};
    const kind = b.kind === 'practice' ? 'practice' : 'lesson';
    let lessonId = null;
    let moduleId = null;
    if (kind === 'lesson' && b.lessonId) {
      const l = await get(`SELECT l.id, l.module_id FROM lessons l JOIN modules m ON m.id = l.module_id
        WHERE l.id = ? AND m.target_audience IN ('adults', 'both')`, [Number(b.lessonId)]);
      if (l) { lessonId = l.id; moduleId = l.module_id; }
    }
    const upd = await run(
      `UPDATE learning_hours_log SET duration_minutes = duration_minutes + 1, session_end = datetime('now')
       WHERE id = (SELECT id FROM learning_hours_log WHERE user_id = ? AND activity_type = ? AND IFNULL(lesson_id, 0) = ?
                   AND date(created_at) = date('now') ORDER BY id DESC LIMIT 1)`,
      [userId, kind, lessonId || 0],
    );
    if (!upd.changes) {
      await run(
        `INSERT INTO learning_hours_log (user_id, module_id, lesson_id, session_start, session_end, duration_minutes, activity_type)
         VALUES (?, ?, ?, datetime('now'), datetime('now'), 1, ?)`, [userId, moduleId, lessonId, kind],
      );
    }
    const hours = await hoursOf(userId);
    await run('UPDATE adult_learner_profiles SET total_hours_logged = ? WHERE user_id = ?', [hours, userId]);
    return { credited: 1, hoursLogged: hours };
  }));

  // ---- progress report ----
  router.get('/progress', wrap(async (req) => {
    const userId = req.user.id;
    const s = await summary(userId);
    const modules = await all("SELECT id, title, icon, order_num FROM modules WHERE target_audience IN ('adults', 'both') ORDER BY order_num");
    const prog = Object.fromEntries(s.progress.map((p) => [p.lesson_id, p]));
    const perModule = modules.map((m) => {
      const ls = s.lessons.filter((l) => l.module_id === m.id);
      const done = ls.filter((l) => prog[l.id] && prog[l.id].completed);
      return { id: m.id, title: m.title, icon: m.icon, completed: done.length, total: ls.length,
        averageScore: done.length ? Math.round(done.reduce((a, l) => a + (prog[l.id].score || 0), 0) / done.length) : 0 };
    });
    const assessments = await all(
      `SELECT ar.id, ar.lesson_id AS lessonId, ar.assessment_type AS type, ar.percentage, ar.passed, ar.completed_at AS at, l.title AS lessonTitle
       FROM assessment_results ar JOIN lessons l ON l.id = ar.lesson_id WHERE ar.user_id = ? ORDER BY ar.id DESC LIMIT 15`, [userId],
    );
    const weeks = await all(
      `SELECT strftime('%Y-%W', created_at) AS week, MIN(date(created_at)) AS start, SUM(duration_minutes) AS minutes
       FROM learning_hours_log WHERE user_id = ? AND created_at >= date('now', '-56 days') GROUP BY week ORDER BY week`, [userId],
    );
    // Average and best score per kind of assessment, across every attempt.
    const byType = await all(
      `SELECT assessment_type AS type, COUNT(*) AS attempts, ROUND(AVG(percentage)) AS average, MAX(percentage) AS best,
         SUM(CASE WHEN passed = 1 THEN 1 ELSE 0 END) AS passed
       FROM assessment_results WHERE user_id = ? GROUP BY assessment_type`, [userId],
    );
    return {
      progress: {
        assessmentSummary: byType.map((r) => ({ type: r.type, attempts: r.attempts, average: r.average || 0, best: r.best || 0, passed: r.passed || 0 })),
        completedLessons: s.completedLessons, totalLessons: s.totalLessons, averageScore: s.averageScore, hoursLogged: s.hoursLogged, minutesLogged: s.minutesLogged,
        requiredHours: course.REQUIRED_HOURS, progressPercentage: s.progressPercentage,
        completedModules: perModule.filter((m) => m.total && m.completed === m.total).length, totalModules: perModule.length,
        modules: perModule, recentAssessments: assessments, weeklyHours: weeks.map((w) => ({ start: w.start, minutes: w.minutes, hours: Math.round((w.minutes / 60) * 10) / 10 })),
        courses: await courseStatuses(userId, s),
      },
    };
  }));

  // ---- certificates: one per course ----
  router.get('/certificates', wrap(async (req) => ({ courses: await courseStatuses(req.user.id), passMark: course.PASS_MARK })));

  router.post('/certificates/:courseId', wrap(async (req) => {
    const userId = req.user.id;
    const co = course.COURSES.find((c) => c.id === Number(req.params.courseId));
    if (!co) throw fail(404, 'Course not found');
    const existing = await get(`${certificateSql} WHERE c.user_id = ? AND c.course_id = ?`, [userId, co.id]);
    if (existing) return { success: true, certificate: certificateView(existing), alreadyIssued: true };
    const status = (await courseStatuses(userId)).find((c) => c.id === co.id);
    if (!status.eligible) throw fail(400, `You have not met all the requirements for the ${co.title} certificate yet.`, 'not_eligible');
    const number = `${co.certificatePrefix}-${new Date().getFullYear()}-${String(userId).padStart(5, '0')}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const code = crypto.randomBytes(6).toString('hex').toUpperCase();
    const r = await run(
      `INSERT INTO certificates (user_id, course_id, certificate_number, curriculum_code, issue_date, total_hours, overall_score, verification_code, issued_first_name, issued_last_name)
       VALUES (?, ?, ?, ?, date('now'), ?, ?, ?, (SELECT first_name FROM users WHERE id = ?), (SELECT last_name FROM users WHERE id = ?))`,
      [userId, co.id, number, co.units[0], Math.round(status.minutesLogged / 60), status.averageScore, code, userId, userId],
    );
    await run(`UPDATE adult_learner_profiles SET certification_eligible = 1, certification_issued_date = date('now'), certificate_number = ?
      WHERE user_id = ?`, [number, userId]);
    const c = await get(`${certificateSql} WHERE c.id = ?`, [r.lastID]);
    return { success: true, certificate: certificateView(c) };
  }));

  return router;
}

/** Public: anyone (an employer) can check a certificate with its verification code. */
function createCertificateVerifyRouter() {
  const router = express.Router();
  router.get('/verify/:code', async (req, res) => {
    try {
      await ensureReady();
      const code = String(req.params.code || '').trim().toUpperCase().slice(0, 40);
      const c = await get(
        `${certificateSql} WHERE upper(c.verification_code) = ? OR upper(c.certificate_number) = ?`, [code, code],
      );
      if (!c) return res.status(404).json({ valid: false });
      const v = certificateView(c);
      const co = course.COURSES.find((x) => x.id === v.courseId);
      return res.json({
        valid: true, name: `${v.firstName || ''} ${v.lastName || ''}`.trim(), certificateNumber: v.certificateNumber, issueDate: v.issueDate,
        totalHours: v.totalHours, overallScore: v.overallScore, curriculumCode: v.curriculumCode,
        course: v.courseTitle, courseId: v.courseId, courseKey: v.courseKey, lessons: co.lessonCount, modules: co.modules.length,
      });
    } catch (err) {
      console.error('Certificate verify error:', err.message);
      return res.status(500).json({ valid: false, error: 'Could not check the certificate right now.' });
    }
  });
  return router;
}

module.exports = { createAdultRouter, createCertificateVerifyRouter, ensureReady, summary, courseStatuses };
