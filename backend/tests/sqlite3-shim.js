'use strict';
/**
 * TEST-ONLY adapter that implements the subset of the `sqlite3` npm API used by
 * KidsCode on top of Node's built-in `node:sqlite` (Node >= 22.5).
 *
 * Why: the committed node_modules contain a Windows-only sqlite3 binary, so the
 * backend cannot load on Linux CI without reinstalling. Production code is
 * unchanged and still uses the real `sqlite3` package.
 */
const { DatabaseSync } = require('node:sqlite');

function normaliseParams(args) {
  let cb = null;
  if (args.length && typeof args[args.length - 1] === 'function') cb = args.pop();
  let params = args;
  if (params.length === 1 && Array.isArray(params[0])) params = params[0];
  else if (params.length === 1 && params[0] && typeof params[0] === 'object') params = [params[0]];
  params = params.map((v) => (v === undefined ? null : typeof v === 'boolean' ? (v ? 1 : 0) : v));
  return { params, cb };
}

class Statement {
  constructor(db, sql) { this.db = db; this.sql = sql; }
  run(...args) { this.db.run(this.sql, ...args); return this; }
  get(...args) { this.db.get(this.sql, ...args); return this; }
  all(...args) { this.db.all(this.sql, ...args); return this; }
  finalize(cb) { if (cb) setImmediate(cb); return this; }
}

class Database {
  constructor(file, mode, cb) {
    if (typeof mode === 'function') cb = mode;
    this._db = new DatabaseSync(file);
    this._queue = Promise.resolve();
    if (cb) setImmediate(() => cb(null));
  }
  _enqueue(fn) { this._queue = this._queue.then(() => new Promise((r) => setImmediate(() => { fn(); r(); }))); }
  serialize(fn) { if (fn) fn(); return this; }
  parallelize(fn) { if (fn) fn(); return this; }
  run(sql, ...args) {
    const { params, cb } = normaliseParams(args);
    this._enqueue(() => {
      try {
        let info = { changes: 0, lastInsertRowid: 0 };
        if (params.length === 0 && /;\s*\S/.test(sql.trim().replace(/;\s*$/, ''))) this._db.exec(sql);
        else info = this._db.prepare(sql).run(...params);
        if (cb) cb.call({ lastID: Number(info.lastInsertRowid), changes: Number(info.changes) }, null);
      } catch (err) { if (cb) cb.call({}, err); }
    });
    return this;
  }
  get(sql, ...args) {
    const { params, cb } = normaliseParams(args);
    this._enqueue(() => {
      let row; let error = null;
      try { row = this._db.prepare(sql).get(...params); } catch (err) { error = err; }
      if (cb) cb(error, row ? { ...row } : undefined);
    });
    return this;
  }
  all(sql, ...args) {
    const { params, cb } = normaliseParams(args);
    this._enqueue(() => {
      let rows; let error = null;
      try { rows = this._db.prepare(sql).all(...params).map((r) => ({ ...r })); } catch (err) { error = err; }
      if (cb) cb(error, rows);
    });
    return this;
  }
  exec(sql, cb) {
    this._enqueue(() => { try { this._db.exec(sql); if (cb) cb(null); } catch (err) { if (cb) cb(err); } });
    return this;
  }
  prepare(sql) { return new Statement(this, sql); }
  close(cb) { this._enqueue(() => { try { this._db.close(); } catch (e) { /* ignore */ } if (cb) cb(null); }); }
}

module.exports = { Database, verbose() { return module.exports; } };
