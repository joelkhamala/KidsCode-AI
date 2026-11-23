'use strict';
/**
 * Prepares the database. Safe to run before EVERY server start (Render runs it on each deploy):
 *   1. creates the tables and the children's curriculum (database.js),
 *   2. adds the adult-learner tables once (migrate-adult-learner.js),
 *   3. adds the adult curriculum once (seed-adult-curriculum.js).
 * Steps 2 and 3 are skipped when already done, so lessons are never duplicated.
 *
 * Uses KIDSCODE_DB_PATH when set (e.g. a Render persistent disk), else backend/codequest.db.
 *
 * Run: node setup-database.js
 */
const path = require('path');
const { execFileSync } = require('child_process');
require('./lib/loadEnv')(path.join(__dirname, '.env'));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function query(db, sql) {
  return new Promise((resolve, reject) => db.get(sql, (err, row) => (err ? reject(err) : resolve(row))));
}

function runScript(file) {
  execFileSync(process.execPath, [file], { cwd: __dirname, env: process.env, stdio: 'inherit' });
}

async function main() {
  const { initializeDatabase, getDb } = require('./database');
  await initializeDatabase();
  const db = getDb();

  // database.js finishes inserting the children's lessons just after it resolves; wait for them.
  for (let i = 0; i < 50; i += 1) {
    const row = await query(db, 'SELECT COUNT(*) AS n FROM lessons');
    if (row.n >= 14) break;
    await sleep(200);
  }

  const adultTables = await query(db, "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'adult_learner_profiles'");
  await new Promise((r) => db.close(r));

  if (!adultTables) {
    console.log('Setting up adult-learner tables...');
    runScript('migrate-adult-learner.js');
  }

  // Seed the adult curriculum only if none of its modules exist yet.
  const sqlite3 = require('sqlite3');
  const dbPath = process.env.KIDSCODE_DB_PATH || path.join(__dirname, 'codequest.db');
  const check = new sqlite3.Database(dbPath);
  const adultModules = await query(check, "SELECT COUNT(*) AS n FROM modules WHERE target_audience IN ('adults', 'both')")
    .catch(() => ({ n: 0 }));
  await new Promise((r) => check.close(r));
  if (!adultModules.n) {
    console.log('Adding the adult curriculum...');
    runScript('seed-adult-curriculum.js');
  }

  console.log(`Database ready: ${dbPath}`);
}

main().catch((err) => {
  console.error('Database setup failed:', err);
  process.exit(1);
});
