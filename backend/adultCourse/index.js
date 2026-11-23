'use strict';
/**
 * The adult course: "Professional Web Development" (ICT/CU/CP/CR/08/6/A).
 *
 * 8 modules, 44 lessons. Each lesson has an explanation, a working example, a practical
 * task that is checked automatically, a short written test and an oral question.
 *
 * The course text lives in code (html.js, css.js, js.js) and is copied into the
 * database by syncCourse() so lesson ids and learners' progress stay stable. Duplicate
 * lessons left by older seed scripts are merged (their progress moves to the kept lesson).
 */
const { M101, M102, M103 } = require('./html');
const { M104 } = require('./css');
const { M105, M106, M107, M108 } = require('./js');
const { mulberry32, shuffle } = require('../ai/random');

const MODULES = [M101, M102, M103, M104, M105, M106, M107, M108];
const BY_MODULE = Object.fromEntries(MODULES.map((m) => [m.id, m]));
const CURRICULUM_CODE = 'ICT/CU/CP/CR/08/6/A';
const PASS_MARK = 70;          // % needed in the practical and the written test
const REQUIRED_HOURS = 170;    // study time needed for the certificate

/** Course lesson for a database lesson row (by module and position). */
function courseLesson(moduleId, orderNum) {
  const m = BY_MODULE[Number(moduleId)];
  return m ? m.lessons[Number(orderNum) - 1] || null : null;
}

/** Practical test: run every check against the learner's HTML / CSS / JS. */
function gradePractical(lesson, code = {}) {
  const text = { html: String(code.html || ''), css: String(code.css || ''), js: String(code.js || '') };
  const results = lesson.checks.map((c) => ({ label: c.label, in: c.in, passed: c.re.test(text[c.in]) }));
  const passedCount = results.filter((r) => r.passed).length;
  const score = Math.round((100 * passedCount) / results.length);
  return { results, score, passed: score >= PASS_MARK, passedCount, total: results.length };
}

/** Written test with options shuffled the same way every time for this lesson. */
function quizFor(lesson, lessonId) {
  return lesson.quiz.map((item, i) => {
    const rng = mulberry32(Number(lessonId) * 1000 + i + 7);
    const order = shuffle(rng, item.options.map((_, k) => k));
    return { n: i + 1, q: item.q, options: order.map((k) => item.options[k]), answerIndex: order.indexOf(0), why: item.why };
  });
}

function gradeQuiz(lesson, lessonId, answers = []) {
  const quiz = quizFor(lesson, lessonId);
  const marking = quiz.map((q, i) => ({ n: q.n, correct: Number(answers[i]) === q.answerIndex, correctIndex: q.answerIndex, why: q.why }));
  const right = marking.filter((m) => m.correct).length;
  const score = Math.round((100 * right) / quiz.length);
  return { marking, score, passed: score >= PASS_MARK, right, total: quiz.length };
}

// ---------------------------------------------------------------------------
// Database sync
// ---------------------------------------------------------------------------
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS adult_learner_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    occupation TEXT,
    education_level TEXT,
    learning_goals TEXT,
    preferred_learning_pace TEXT DEFAULT 'self_paced',
    total_hours_logged REAL DEFAULT 0,
    certification_eligible INTEGER DEFAULT 0,
    certification_issued_date DATE,
    certificate_number TEXT UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS assessment_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    lesson_id INTEGER NOT NULL,
    assessment_type TEXT CHECK(assessment_type IN ('practical', 'written', 'oral')),
    score INTEGER NOT NULL,
    max_score INTEGER NOT NULL,
    percentage INTEGER NOT NULL,
    passed INTEGER DEFAULT 0,
    feedback TEXT,
    submission_data TEXT,
    graded_by INTEGER,
    completed_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS learning_hours_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    module_id INTEGER,
    lesson_id INTEGER,
    session_start DATETIME NOT NULL,
    session_end DATETIME,
    duration_minutes INTEGER,
    activity_type TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS certificates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    certificate_number TEXT UNIQUE NOT NULL,
    curriculum_code TEXT DEFAULT '${CURRICULUM_CODE}',
    issue_date DATE NOT NULL,
    total_hours INTEGER NOT NULL,
    overall_score INTEGER,
    verification_code TEXT UNIQUE,
    pdf_path TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  'CREATE INDEX IF NOT EXISTS idx_hours_user ON learning_hours_log(user_id, session_start)',
  'CREATE INDEX IF NOT EXISTS idx_assess_user ON assessment_results(user_id, lesson_id)',
];

const COLUMNS = {
  modules: [['target_audience', "TEXT DEFAULT 'children'"], ['estimated_hours', 'INTEGER DEFAULT 0']],
  lessons: [['has_practical_test', 'INTEGER DEFAULT 0'], ['has_written_test', 'INTEGER DEFAULT 0'], ['has_oral_test', 'INTEGER DEFAULT 0'],
    ['assessment_criteria', 'TEXT'], ['estimated_minutes', 'INTEGER DEFAULT 0']],
};

/**
 * Create adult tables/columns if missing, write the course into modules/lessons and
 * merge duplicate lessons. Safe to run on every start.
 * @param {{all: Function, get: Function, run: Function}} q promise helpers
 */
async function syncCourse(q) {
  for (const sql of SCHEMA) await q.run(sql);
  for (const [table, cols] of Object.entries(COLUMNS)) {
    const have = new Set((await q.all(`PRAGMA table_info(${table})`)).map((c) => c.name));
    for (const [name, type] of cols) if (!have.has(name)) await q.run(`ALTER TABLE ${table} ADD COLUMN ${name} ${type}`);
  }

  let merged = 0;
  for (const m of MODULES) {
    await q.run(
      `INSERT INTO modules (id, title, description, icon, color, order_num, difficulty, target_audience, estimated_hours)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'adults', ?)
       ON CONFLICT(id) DO UPDATE SET title = excluded.title, description = excluded.description, icon = excluded.icon,
         color = excluded.color, order_num = excluded.order_num, difficulty = excluded.difficulty,
         target_audience = 'adults', estimated_hours = excluded.estimated_hours`,
      [m.id, m.title, m.description, m.icon, m.color, m.order, m.difficulty, m.hours],
    );

    const existing = await q.all('SELECT id, order_num FROM lessons WHERE module_id = ? ORDER BY id', [m.id]);
    const keep = {};
    for (const row of existing) {
      const pos = Number(row.order_num);
      if (!keep[pos]) { keep[pos] = row.id; continue; }
      // A duplicate of an earlier lesson: move its records to the kept lesson, then delete it.
      const canon = keep[pos];
      // A learner with records on both copies keeps the best of the two (finished, higher score, their code).
      await q.run(
        `UPDATE progress SET
           completed = MAX(IFNULL(completed, 0), IFNULL((SELECT d.completed FROM progress d WHERE d.user_id = progress.user_id AND d.lesson_id = ?), 0)),
           score = MAX(IFNULL(score, 0), IFNULL((SELECT d.score FROM progress d WHERE d.user_id = progress.user_id AND d.lesson_id = ?), 0)),
           last_code = COALESCE(last_code, (SELECT d.last_code FROM progress d WHERE d.user_id = progress.user_id AND d.lesson_id = ?))
         WHERE lesson_id = ? AND user_id IN (SELECT user_id FROM progress WHERE lesson_id = ?)`,
        [row.id, row.id, row.id, canon, row.id],
      );
      await q.run('UPDATE OR IGNORE progress SET lesson_id = ? WHERE lesson_id = ?', [canon, row.id]);
      await q.run('DELETE FROM progress WHERE lesson_id = ?', [row.id]);
      await q.run('UPDATE learning_hours_log SET lesson_id = ? WHERE lesson_id = ?', [canon, row.id]);
      await q.run('UPDATE assessment_results SET lesson_id = ? WHERE lesson_id = ?', [canon, row.id]);
      await q.run('DELETE FROM lessons WHERE id = ?', [row.id]);
      merged += 1;
    }

    for (let i = 0; i < m.lessons.length; i += 1) {
      const l = m.lessons[i];
      const values = [l.title, l.content, JSON.stringify(l.example || {}), l.challenge, JSON.stringify(l.hints || []),
        l.checks.length ? 1 : 0, l.quiz.length ? 1 : 0, l.oral ? 1 : 0, JSON.stringify(l.checks.map((c) => c.label)), l.minutes || 0];
      if (keep[i + 1]) {
        await q.run(
          `UPDATE lessons SET title = ?, content = ?, example_code = ?, challenge = ?, hints = ?, has_practical_test = ?,
             has_written_test = ?, has_oral_test = ?, assessment_criteria = ?, estimated_minutes = ?, order_num = ? WHERE id = ?`,
          [...values, i + 1, keep[i + 1]],
        );
      } else {
        await q.run(
          `INSERT INTO lessons (title, content, example_code, challenge, hints, has_practical_test, has_written_test, has_oral_test,
             assessment_criteria, estimated_minutes, module_id, order_num) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [...values, m.id, i + 1],
        );
      }
    }
  }
  return { merged };
}

module.exports = { MODULES, BY_MODULE, CURRICULUM_CODE, PASS_MARK, REQUIRED_HOURS, courseLesson, gradePractical, quizFor, gradeQuiz, syncCourse };
