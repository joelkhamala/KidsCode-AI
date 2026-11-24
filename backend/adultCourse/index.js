'use strict';
/**
 * The adult programme: six courses mapped to the TVET CDACC Level 6 curricula
 * (Computer Science L6 "ICT/CU/CS/..." and ICT Technician L6 "IT/CU/ICTA/...").
 *
 *   1  Web Development                 modules 101-108  HTML / CSS / JavaScript
 *   2  Java Programming                modules 109-111  Java    CS/CR/04 Fundamentals of Programming,
 *                                                               ICTA/CC/02 Computer Programming Principles
 *   3  Python & Artificial Intelligence  modules 112-114  Python  CS/CR/08 Artificial Intelligence
 *   4  Database Management             modules 115-117  SQL     CS/CR/05 Database Management Skills
 *   5  Algorithms & Data Structures    modules 118-120  Java    CS/CR/09 Algorithms and Data Structures
 *   6  Mathematics for Computing       modules 121-123  Python  CS/CR/03 Mathematics for Computer Science,
 *                                                               ICTA/CC/01 Discrete Mathematical Concepts
 *
 * Lesson format (see html.js for the formatting rules of `content`):
 *   title, minutes, content, example, challenge, checks, hints, quiz, oral, solution
 *   checks    [{ label, in, re }]: in is 'html' | 'css' | 'js' for web lessons; for the other
 *             courses 'code' (the learner's program) or 'output' (what it prints when it runs).
 *   example   a worked example the learner can load into the editor (never the task's answer)
 *   solution  a model answer that passes every check; used by the tests, never sent to learners
 *
 * The course text lives in code and is copied into the database by syncCourse(), so lesson ids
 * and learners' progress stay stable.
 */
const { M101, M102, M103 } = require('./html');
const { M104 } = require('./css');
const { M105, M106, M107, M108 } = require('./js');
const { M109, M110, M111 } = require('./java');
const { M112, M113, M114 } = require('./python');
const { M115, M116, M117 } = require('./database');
const { M118, M119, M120 } = require('./algorithms');
const { M121, M122, M123 } = require('./maths');
const { mulberry32, shuffle } = require('../ai/random');

/** The six courses (ids match the frontend's COURSES list in components/AdultUi.js). */
const COURSES = [
  { id: 1, key: 'web', title: 'Web Development', language: 'web', modules: [101, 102, 103, 104, 105, 106, 107, 108], units: ['IT/CU/ICTA/CR/01/6/MA', 'ICT/CU/CS/CR/10/6/A'] },
  { id: 2, key: 'java', title: 'Java Programming', language: 'java', modules: [109, 110, 111], units: ['ICT/CU/CS/CR/04/6/A', 'IT/CU/ICTA/CC/02/5/MA'] },
  { id: 3, key: 'python', title: 'Python & Artificial Intelligence', language: 'python', modules: [112, 113, 114], units: ['ICT/CU/CS/CR/08/6/A'] },
  { id: 4, key: 'sql', title: 'Database Management', language: 'sql', modules: [115, 116, 117], units: ['ICT/CU/CS/CR/05/6/A', 'IT/CU/ICTA/CR/03/5/MA'] },
  { id: 5, key: 'algorithms', title: 'Algorithms & Data Structures', language: 'java', modules: [118, 119, 120], units: ['ICT/CU/CS/CR/09/6/A'] },
  { id: 6, key: 'maths', title: 'Mathematics for Computing', language: 'python', modules: [121, 122, 123], units: ['ICT/CU/CS/CR/03/6/A', 'IT/CU/ICTA/CC/01/6/MA'] },
];

const MODULES = [
  M101, M102, M103, M104, M105, M106, M107, M108,
  M109, M110, M111,
  M112, M113, M114,
  M115, M116, M117,
  M118, M119, M120,
  M121, M122, M123,
];

/**
 * Study time. The TVET curricula give classroom hours (for example 180 h for Fundamentals of
 * Programming) that include installing tools, lectures and group work the app does for the
 * learner. In the app a module takes its lessons' own reading-and-practice minutes plus half
 * again for redoing tasks, the written test and revision.
 */
const PRACTICE_FACTOR = 1.5;
const lessonMinutes = (m) => m.lessons.reduce((n, l) => n + (l.minutes || 0), 0);
for (const m of MODULES) m.hours = Math.max(1, Math.ceil((lessonMinutes(m) * PRACTICE_FACTOR) / 60));
const TOTAL_HOURS = MODULES.reduce((n, m) => n + m.hours, 0);
/** Study time needed for the certificate: three quarters of the estimate, so quick learners are not held back. */
const REQUIRED_HOURS = Math.ceil(TOTAL_HOURS * 0.75);

const BY_MODULE = Object.fromEntries(MODULES.map((m) => [m.id, m]));
const CURRICULUM_CODE = 'ICT/CU/CP/CR/08/6/A';
const PASS_MARK = 70;          // % needed in the practical and the written test

/** The language each module is practised in ('web' runs in the browser; the others on the server). */
const LANGUAGE_BY_MODULE = Object.fromEntries(COURSES.flatMap((c) => c.modules.map((id) => [id, c.language])));
const languageOf = (moduleId) => LANGUAGE_BY_MODULE[Number(moduleId)] || 'web';
const courseOfModule = (moduleId) => COURSES.find((c) => c.modules.includes(Number(moduleId))) || null;

/** Course lesson for a database lesson row (by module and position). */
function courseLesson(moduleId, orderNum) {
  const m = BY_MODULE[Number(moduleId)];
  return m ? m.lessons[Number(orderNum) - 1] || null : null;
}

/** Where a check looks: web checks name their pane; other lessons check the code or its output. */
function checkTarget(check, language) {
  if (check.in === 'output') return 'output';
  return language && language !== 'web' ? language : check.in;
}

/** Run a learner program for the output checks (Java, Python or SQL). */
async function runForChecks(language, code) {
  const runners = {
    java: () => require('../sandbox/runJava').runJava,
    python: () => require('../sandbox/runPython').runPython,
    sql: () => require('../sandbox/runSQL').runSQL,
  };
  if (!runners[language]) return { text: '', error: null };
  const r = await runners[language]()(code);
  const lines = [...(r.output || [])];
  for (const t of r.tables || []) {
    lines.push(t.columns.join(' | '));
    for (const row of t.rows) lines.push(row.map((v) => (v === null ? 'NULL' : String(v))).join(' | '));
  }
  return { text: lines.join('\n'), error: r.error ? `${r.error.name}: ${r.error.message}` : null };
}

/**
 * Practical test: every check against the learner's code (HTML / CSS / JS panes for web
 * lessons, the Java / Python / SQL editor for the others) and, for 'output' checks, against
 * what the program prints when it runs.
 * @returns {Promise<{results, score, passed, passedCount, total, runError?: string}>}
 */
async function gradePractical(lesson, code = {}, language = 'web') {
  const text = {
    html: String(code.html || ''), css: String(code.css || ''), js: String(code.js || ''),
    java: String(code.java || ''), python: String(code.python || ''), sql: String(code.sql || ''),
  };
  // Older saves kept these lessons' answers in the JavaScript box.
  if (language !== 'web' && !text[language].trim()) text[language] = text.js;
  let runError = null;
  if (language !== 'web' && lesson.checks.some((c) => c.in === 'output')) {
    const run = text[language].trim() ? await runForChecks(language, text[language]) : { text: '', error: 'Write your program first, then check it.' };
    text.output = run.text;
    runError = run.error;
  }
  const results = lesson.checks.map((c) => {
    const where = checkTarget(c, language);
    c.re.lastIndex = 0;
    return { label: c.label, in: where, passed: c.re.test(text[where] || '') };
  });
  const passedCount = results.filter((r) => r.passed).length;
  const score = Math.round((100 * passedCount) / results.length);
  return { results, score, passed: score >= PASS_MARK, passedCount, total: results.length, ...(runError ? { runError } : {}) };
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
  let removed = 0;
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

    // A module that now has fewer lessons: remove the extra rows nobody has worked on (rows with
    // learner records are left alone, so no progress is ever lost; they are hidden by the routes).
    for (const [pos, id] of Object.entries(keep)) {
      if (Number(pos) <= m.lessons.length) continue;
      const used = await q.get(
        `SELECT (SELECT COUNT(*) FROM progress WHERE lesson_id = ?) + (SELECT COUNT(*) FROM assessment_results WHERE lesson_id = ?)
           + (SELECT COUNT(*) FROM learning_hours_log WHERE lesson_id = ?) AS n`, [id, id, id],
      );
      if (!used || !used.n) { await q.run('DELETE FROM lessons WHERE id = ?', [id]); removed += 1; }
    }
  }
  return { merged, removed };
}

module.exports = {
  COURSES, MODULES, BY_MODULE, LANGUAGE_BY_MODULE, languageOf, courseOfModule, checkTarget, CURRICULUM_CODE, PASS_MARK,
  REQUIRED_HOURS, TOTAL_HOURS, PRACTICE_FACTOR, courseLesson, gradePractical, quizFor, gradeQuiz, syncCourse,
};
