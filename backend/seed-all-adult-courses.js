/**
 * Copy all four adult courses into the database:
 *   Web Development (modules 101-108), Java (109-111), Python & AI (112-114), Database (115-117).
 *
 * Usage:  node seed-all-adult-courses.js        (uses KIDSCODE_DB_PATH or ./codequest.db)
 *
 * This uses the same syncCourse() the server runs on every start, so it is safe to run at any
 * time: lessons are updated in place and keep their ids, so learners keep their progress,
 * scores and saved code. Nothing is deleted except duplicate copies of a lesson, whose records
 * are first merged into the lesson that is kept.
 */
const sqlite3 = require('sqlite3');
const path = require('path');
const { MODULES, syncCourse, languageOf } = require('./adultCourse');

const DB_PATH = process.env.KIDSCODE_DB_PATH || path.join(__dirname, 'codequest.db');
const db = new sqlite3.Database(DB_PATH);

const q = {
  all: (sql, p = []) => new Promise((res, rej) => db.all(sql, p, (e, r) => (e ? rej(e) : res(r || [])))),
  get: (sql, p = []) => new Promise((res, rej) => db.get(sql, p, (e, r) => (e ? rej(e) : res(r)))),
  run: (sql, p = []) => new Promise((res, rej) => db.run(sql, p, function done(e) { if (e) rej(e); else res(this); })),
};

const COURSE_NAMES = { web: 'Web Development', java: 'Java Programming', python: 'Python & Artificial Intelligence', sql: 'Database Management' };

async function main() {
  console.log(`Syncing the adult courses into ${DB_PATH}\n`);
  const { merged } = await syncCourse(q);
  const rows = await q.all(
    `SELECT m.id, m.title, COUNT(l.id) AS lessons FROM modules m LEFT JOIN lessons l ON l.module_id = m.id
     WHERE m.target_audience = 'adults' GROUP BY m.id ORDER BY m.id`,
  );
  const byCourse = {};
  for (const r of rows) {
    const c = languageOf(r.id);
    byCourse[c] = byCourse[c] || { modules: 0, lessons: 0 };
    byCourse[c].modules += 1;
    byCourse[c].lessons += r.lessons;
    console.log(`  ${r.id}  ${r.title.padEnd(36)} ${String(r.lessons).padStart(2)} lessons`);
  }
  console.log('');
  for (const [c, v] of Object.entries(byCourse)) console.log(`  ${COURSE_NAMES[c].padEnd(34)} ${v.modules} modules, ${v.lessons} lessons`);
  const expected = MODULES.reduce((n, m) => n + m.lessons.length, 0);
  const total = rows.reduce((n, r) => n + r.lessons, 0);
  console.log(`\n  Total: ${rows.length} modules, ${total} lessons (course files: ${MODULES.length} modules, ${expected} lessons)`);
  if (merged) console.log(`  Merged ${merged} duplicate lesson(s).`);
  if (total !== expected) process.exitCode = 1;
}

main()
  .catch((err) => { console.error('Sync failed:', err.message); process.exitCode = 1; })
  .finally(() => db.close());
