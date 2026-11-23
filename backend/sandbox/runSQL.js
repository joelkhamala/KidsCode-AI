'use strict';
/**
 * Runs learner SQL against a fresh in-memory SQLite copy of the practice database
 * (Database Management course, modules 115-117). Nothing touches the real KidsCode data.
 *
 * Several statements can run at once (separated by ;). SELECT-like statements return a
 * table; others report what changed. The lessons are written for MySQL, so a few common
 * MySQL forms (AUTO_INCREMENT, # comments, SHOW TABLES, DESCRIBE) are translated and the
 * learner is told about it.
 */
const sqlite3 = require('sqlite3');
const { result, checkCode, withSlot } = require('./common');
const { SAMPLE_SQL, SAMPLE_TABLES } = require('./sampleDatabase');

const TIMEOUT_MS = Number(process.env.KIDSCODE_RUN_TIMEOUT_MS) || 5000;
const MAX_STATEMENTS = 50;
const MAX_ROWS = 200;
const QUERY_WORDS = new Set(['SELECT', 'WITH', 'PRAGMA', 'VALUES', 'EXPLAIN']);

/**
 * Split SQL into statements, respecting quotes, comments and CREATE TRIGGER ... END blocks.
 * MySQL "#" comments become SQL "--" comments.
 * @returns {{statements: {text: string, line: number}[], hashComments: boolean}}
 */
function splitStatements(sql) {
  const statements = [];
  let current = '';
  let startLine = 1;
  let line = 1;
  let hashComments = false;
  const n = sql.length;
  const push = () => {
    const text = current.trim();
    if (text && !/^(--[^\n]*\n?\s*)*$/.test(text) && text.replace(/--[^\n]*/g, '').trim()) statements.push({ text, line: startLine });
    current = '';
  };
  for (let i = 0; i < n; i += 1) {
    const ch = sql[i];
    if (!current.trim() && /\s/.test(ch)) { if (ch === '\n') line += 1; startLine = line; current += ch; continue; }
    if (!current.trim()) startLine = line;
    if (ch === '\n') line += 1;
    if (ch === "'" || ch === '"' || ch === '`') {
      let j = i + 1;
      while (j < n) {
        if (sql[j] === ch) { if (sql[j + 1] === ch) { j += 2; continue; } break; }
        if (sql[j] === '\n') line += 1;
        j += 1;
      }
      current += sql.slice(i, j + 1);
      i = j;
      continue;
    }
    if (ch === '-' && sql[i + 1] === '-') {
      const j = sql.indexOf('\n', i);
      current += j < 0 ? sql.slice(i) : sql.slice(i, j);
      i = j < 0 ? n : j - 1;
      continue;
    }
    if (ch === '#') {
      hashComments = true;
      const j = sql.indexOf('\n', i);
      current += `--${j < 0 ? sql.slice(i + 1) : sql.slice(i + 1, j)}`;
      i = j < 0 ? n : j - 1;
      continue;
    }
    if (ch === '/' && sql[i + 1] === '*') {
      const j = sql.indexOf('*/', i + 2);
      const end = j < 0 ? n : j + 2;
      const chunk = sql.slice(i, end);
      line += (chunk.match(/\n/g) || []).length;
      current += chunk;
      i = end - 1;
      continue;
    }
    if (ch === ';') {
      const isTrigger = /^\s*CREATE\s+(TEMP\w*\s+)?TRIGGER\b/i.test(current.replace(/--[^\n]*\n/g, ''));
      if (isTrigger && !/\bEND\s*$/i.test(current.replace(/--[^\n]*$/gm, '').trim())) { current += ch; continue; }
      push();
      continue;
    }
    current += ch;
  }
  push();
  return { statements, hashComments };
}

/** The first keyword of a statement, ignoring comments. */
const firstWord = (text) => (text.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '').trim().match(/^[A-Za-z]+/) || [''])[0].toUpperCase();

/** Translate a few MySQL-only forms into SQLite. */
function translate(text, notes) {
  let t = text;
  const before = t;
  t = t.replace(/\bINT(?:EGER)?\s+(?:NOT\s+NULL\s+)?PRIMARY\s+KEY\s+AUTO_INCREMENT\b/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT');
  t = t.replace(/\bINT(?:EGER)?\s+(?:NOT\s+NULL\s+)?AUTO_INCREMENT\s+PRIMARY\s+KEY\b/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT');
  t = t.replace(/\s+AUTO_INCREMENT\b/gi, '');
  if (t !== before) notes.add('AUTO_INCREMENT (MySQL) was run as SQLite\'s INTEGER PRIMARY KEY AUTOINCREMENT.');
  t = t.replace(/\)\s*ENGINE\s*=\s*\w+[^;]*$/i, (m) => { notes.add('ENGINE=... (MySQL) was ignored - SQLite does not use storage engines.'); return ')'; });
  if (/^\s*SHOW\s+TABLES\s*$/i.test(t)) {
    notes.add('SHOW TABLES (MySQL) was run as a query on sqlite_master.');
    return "SELECT name AS table_name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name";
  }
  const describe = /^\s*(?:DESCRIBE|DESC)\s+([A-Za-z_]\w*)\s*$/i.exec(t);
  if (describe) {
    notes.add(`DESCRIBE (MySQL) was run as PRAGMA table_info(${describe[1]}).`);
    return `PRAGMA table_info(${describe[1]})`;
  }
  return t;
}

const BLOCKED = /^\s*(ATTACH|DETACH|VACUUM)\b|\bload_extension\s*\(/i;

/** A sentence about what a non-query statement did. */
function describeChange(word, rawText, changes) {
  const text = rawText.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
  const rows = (n) => `${n} row${n === 1 ? '' : 's'}`;
  const what = (text.match(/^\s*(?:CREATE|DROP|ALTER)\s+(?:TEMP\w*\s+|UNIQUE\s+)?(TABLE|VIEW|INDEX|TRIGGER)\s+(?:IF\s+(?:NOT\s+)?EXISTS\s+)?([\w"`[\]]+)/i) || []);
  const name = what[2] ? what[2].replace(/["`[\]]/g, '') : '';
  const kind = what[1] ? what[1].toLowerCase() : 'object';
  switch (word) {
    case 'INSERT': case 'REPLACE': return `${rows(changes)} inserted.`;
    case 'UPDATE': return `${rows(changes)} updated.`;
    case 'DELETE': return `${rows(changes)} deleted.`;
    case 'CREATE': return `${kind[0].toUpperCase()}${kind.slice(1)} ${name} created.`;
    case 'DROP': return `${kind[0].toUpperCase()}${kind.slice(1)} ${name} dropped.`;
    case 'ALTER': return `Table ${name} changed.`;
    case 'BEGIN': return 'Transaction started.';
    case 'COMMIT': case 'END': return 'Transaction committed.';
    case 'ROLLBACK': return 'Transaction rolled back.';
    default: return 'Done.';
  }
}

/** Friendly extra help for SQLite's error messages. */
function hintFor(message, statement) {
  const tables = SAMPLE_TABLES.map((t) => t.name).join(', ');
  if (/no such table/i.test(message)) return `The practice database has these tables: ${tables}. Table names must match exactly.`;
  if (/no such column/i.test(message)) {
    const t = SAMPLE_TABLES.find((x) => new RegExp(`\\b${x.name}\\b`, 'i').test(statement));
    return t ? `Check the column name. ${t.name} has: ${t.columns.join(', ')}.` : 'Check the column name and which table it belongs to.';
  }
  if (/already exists/i.test(message)) return 'The practice database already has a table with this name. Use a new name, or run DROP TABLE name; first.';
  if (/syntax error|incomplete input/i.test(message)) return 'Check commas between columns, quotes around text values, brackets, and the spelling of keywords.';
  if (/UNIQUE constraint/i.test(message)) return 'This value must be unique, and another row already has it.';
  if (/NOT NULL constraint/i.test(message)) return 'This column is required. Give it a value in your INSERT.';
  if (/FOREIGN KEY constraint/i.test(message)) return 'The row you point to (for example the customer_id) does not exist, or other rows still point to the row you are deleting.';
  if (/CHECK constraint/i.test(message)) return 'The value breaks one of the table\'s rules (for example a negative price or balance).';
  if (/datatype mismatch/i.test(message)) return 'The value has the wrong type for this column.';
  if (/RIGHT and FULL OUTER JOINs are not currently supported/i.test(message)) return 'Rewrite it as a LEFT JOIN with the tables swapped.';
  return undefined;
}

const cleanMessage = (m) => String(m || 'SQL error').replace(/^SQLITE_\w+:\s*/, '');
const shortStatement = (text) => { const one = text.replace(/\s+/g, ' ').trim(); return one.length > 90 ? `${one.slice(0, 87)}…` : one; };

/** Promise helpers for one sqlite3 database. */
function open() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(':memory:', (err) => (err ? reject(err) : resolve(db)));
  });
}
const exec = (db, sql) => new Promise((res, rej) => db.exec(sql, (e) => (e ? rej(e) : res())));
const all = (db, sql) => new Promise((res, rej) => db.all(sql, [], (e, rows) => (e ? rej(e) : res(rows))));
const runStmt = (db, sql) => new Promise((res, rej) => db.run(sql, [], function done(e) { if (e) rej(e); else res({ changes: this.changes, lastID: this.lastID }); }));

/**
 * Column names of a query that returned no rows: join it to a one-row table, which yields
 * one row of NULLs whose keys are the query's columns.
 */
async function emptyColumns(db, text, word) {
  if (!['SELECT', 'WITH', 'VALUES'].includes(word)) return [];
  try {
    const rows = await all(db, `SELECT * FROM (SELECT 1 AS __kc_probe) LEFT JOIN (${text}) ON 0 LIMIT 1`);
    return rows.length ? Object.keys(rows[0]).filter((c) => c !== '__kc_probe') : [];
  } catch (_) {
    return [];
  }
}

/**
 * @param {string} sql the learner's SQL (one or more statements)
 */
async function runSQL(sql) {
  const bad = checkCode('sql', sql);
  if (bad) return bad;
  const { statements, hashComments } = splitStatements(sql);
  if (!statements.length) return result({ language: 'sql', error: { type: 'input', name: 'InputError', message: 'Write an SQL statement first, for example: SELECT * FROM Customers;' } });
  if (statements.length > MAX_STATEMENTS) return result({ language: 'sql', error: { type: 'input', name: 'InputError', message: `Please run at most ${MAX_STATEMENTS} statements at a time.` } });

  return withSlot(async () => {
    const notes = new Set();
    if (hashComments) notes.add('# comments (MySQL) were treated as -- comments.');
    const output = [];
    const tables = [];
    const db = await open();
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; if (typeof db.interrupt === 'function') db.interrupt(); }, TIMEOUT_MS);
    const started = Date.now();
    try {
      await exec(db, SAMPLE_SQL);
      await exec(db, 'PRAGMA foreign_keys = ON;');
      for (let i = 0; i < statements.length; i += 1) {
        const original = statements[i].text;
        const text = translate(original, notes);
        const word = firstWord(text);
        const label = statements.length > 1 ? `Statement ${i + 1}: ` : '';
        try {
          if (BLOCKED.test(text)) {
            throw Object.assign(new Error(`${word || 'This statement'} is not allowed in the practice database.`), { blocked: true });
          }
          if (QUERY_WORDS.has(word) && !/^\s*WITH\b[\s\S]*\b(INSERT|UPDATE|DELETE)\b/i.test(text)) {
            const rows = await all(db, text);
            const columns = rows.length ? Object.keys(rows[0]) : await emptyColumns(db, text, word);
            tables.push({
              statement: shortStatement(original), columns,
              rows: rows.slice(0, MAX_ROWS).map((r) => columns.map((c) => r[c])),
              rowCount: rows.length, truncated: rows.length > MAX_ROWS,
            });
            output.push(`${label}${rows.length} row${rows.length === 1 ? '' : 's'} returned.`);
          } else {
            const r = await runStmt(db, text);
            output.push(`${label}${describeChange(word, text, r.changes)}`);
          }
        } catch (e) {
          const message = timedOut ? `Your query ran for more than ${TIMEOUT_MS / 1000} seconds and was stopped.` : cleanMessage(e.message);
          return result({
            language: 'sql', output, tables, notes: [...notes], timeMs: Date.now() - started,
            error: {
              type: timedOut ? 'timeout' : 'sql', name: timedOut ? 'TimeoutError' : 'SQLError', message,
              line: statements[i].line, statement: i + 1, details: shortStatement(original),
              hint: timedOut ? 'Look for a JOIN without an ON condition, or a recursive query that never stops.' : hintFor(message, text),
            },
          });
        }
      }
      return result({ language: 'sql', output, tables, notes: [...notes], timeMs: Date.now() - started });
    } finally {
      clearTimeout(timer);
      db.close(() => {});
    }
  }).catch((e) => result({ language: 'sql', error: { type: e.code === 'busy' ? 'busy' : 'sql', name: e.code === 'busy' ? 'Busy' : 'SQLError', message: e.message } }));
}

module.exports = { runSQL, splitStatements, translate, SAMPLE_TABLES };
