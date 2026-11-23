'use strict';
/**
 * Shared helpers for the server-side code runners (Java, Python, SQL).
 *
 * Every run:
 *   - happens in its own temporary folder, which is deleted afterwards
 *   - is started without a shell (no command injection through file names or code)
 *   - gets a small, clean environment (no server secrets such as JWT_SECRET)
 *   - is killed when it runs too long, and its output is capped
 *   - waits for a free slot, so a burst of "Run" clicks cannot overload the server
 *
 * All runners return the same shape (see `result()`), which the frontend console shows.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const MAX_CODE_LENGTH = 20000;
const MAX_OUTPUT_BYTES = 64 * 1024;
const MAX_OUTPUT_LINES = 500;
const MAX_CONCURRENT_RUNS = Number(process.env.KIDSCODE_MAX_CONCURRENT_RUNS) || 4;
const QUEUE_WAIT_MS = 15000;

/**
 * The one result shape every language returns.
 * @param {object} r
 * @param {string} r.language   'java' | 'python' | 'sql'
 * @param {string[]} [r.output] lines the program printed
 * @param {null|{type: string, name: string, message: string, line?: number, hint?: string}} [r.error]
 *        type is one of: input, unavailable, busy, compile, syntax, runtime, timeout, sql
 * @param {Array} [r.tables]    SQL results: [{ statement, columns, rows, rowCount, truncated }]
 * @param {string[]} [r.notes]  extra information for the learner (for example a translated keyword)
 */
function result({ language, output = [], error = null, tables = [], notes = [], timeMs = 0, truncated = false }) {
  return { ok: !error, language, output, error, tables, notes, timeMs, truncated };
}

const inputError = (language, message) => result({ language, error: { type: 'input', name: 'InputError', message } });

/** Check the submitted code before running anything. */
function checkCode(language, code) {
  if (typeof code !== 'string') return inputError(language, 'Code must be text.');
  if (!code.trim()) return inputError(language, 'Write some code first, then press Run.');
  if (code.length > MAX_CODE_LENGTH) return inputError(language, `Your code is too long (the limit is ${MAX_CODE_LENGTH.toLocaleString()} characters).`);
  return null;
}

/** Split printed text into lines, capped so one runaway loop cannot flood the browser. */
function toLines(text) {
  const lines = String(text || '').replace(/\r\n/g, '\n').split('\n');
  if (lines.length && lines[lines.length - 1] === '') lines.pop();
  return lines.length > MAX_OUTPUT_LINES ? [...lines.slice(0, MAX_OUTPUT_LINES), `… output cut after ${MAX_OUTPUT_LINES} lines`] : lines;
}

// ---------------------------------------------------------------------------
// Concurrency limit
// ---------------------------------------------------------------------------
let running = 0;
const waiting = [];

/** Run `fn` when a slot is free. Rejects with code 'busy' if the queue does not move in time. */
function withSlot(fn) {
  return new Promise((resolve, reject) => {
    const start = () => {
      running += 1;
      Promise.resolve().then(fn).then(resolve, reject).finally(() => {
        running -= 1;
        const next = waiting.shift();
        if (next) { clearTimeout(next.timer); next.start(); }
      });
    };
    if (running < MAX_CONCURRENT_RUNS) { start(); return; }
    const entry = { start };
    entry.timer = setTimeout(() => {
      const i = waiting.indexOf(entry);
      if (i >= 0) waiting.splice(i, 1);
      reject(Object.assign(new Error('The code runner is busy. Please try again in a moment.'), { code: 'busy' }));
    }, QUEUE_WAIT_MS);
    waiting.push(entry);
  });
}

// ---------------------------------------------------------------------------
// Processes
// ---------------------------------------------------------------------------

/** A minimal environment for learner programs: enough to start, nothing secret. */
function cleanEnv(extra = {}) {
  const keep = ['PATH', 'Path', 'SystemRoot', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP', 'LANG', 'LC_ALL', 'PATHEXT', 'COMSPEC'];
  const env = {};
  for (const k of keep) if (process.env[k] !== undefined) env[k] = process.env[k];
  return { ...env, ...extra };
}

/**
 * Run a program and collect its output.
 * @returns {Promise<{stdout: string, stderr: string, code: number|null, timedOut: boolean, truncated: boolean, spawnError?: Error}>}
 */
function runProcess(command, args, { cwd, timeoutMs = 5000, input = '', env } = {}) {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let size = 0;
    let truncated = false;
    let timedOut = false;
    let done = false;
    let child;
    try {
      child = spawn(command, args, { cwd, env: env || cleanEnv(), windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    } catch (spawnError) {
      resolve({ stdout, stderr, code: null, timedOut, truncated, spawnError });
      return;
    }
    const finish = (code, spawnError) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve({ stdout, stderr, code, timedOut, truncated, spawnError });
    };
    const collect = (which) => (chunk) => {
      if (truncated) return;
      size += chunk.length;
      if (size > MAX_OUTPUT_BYTES) {
        truncated = true;
        child.kill('SIGKILL');
        return;
      }
      if (which === 'out') stdout += chunk.toString('utf8'); else stderr += chunk.toString('utf8');
    };
    const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, timeoutMs);
    child.stdout.on('data', collect('out'));
    child.stderr.on('data', collect('err'));
    child.on('error', (e) => finish(null, e));
    child.on('close', (code) => finish(code));
    child.stdin.on('error', () => {});
    child.stdin.end(String(input || '').slice(0, 10000));
  });
}

/** A fresh temporary folder; call the returned cleanup when finished. */
async function tempDir(prefix) {
  const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), `kidscode-${prefix}-`));
  return { dir, cleanup: () => fs.promises.rm(dir, { recursive: true, force: true }).catch(() => {}) };
}

// ---------------------------------------------------------------------------
// Finding the tools
// ---------------------------------------------------------------------------
const found = new Map();

/**
 * The first candidate that starts, remembered after the first look.
 * @param {string} key       cache key
 * @param {string[]} candidates commands or full paths
 * @param {string[]} probeArgs  arguments that make the tool print its version and exit
 */
function findTool(key, candidates, probeArgs = ['--version']) {
  if (found.has(key)) return found.get(key);
  let hit = null;
  for (const c of candidates.filter(Boolean)) {
    try {
      const r = spawnSync(c, probeArgs, { timeout: 15000, windowsHide: true, encoding: 'utf8' });
      if (!r.error && r.status === 0) { hit = { command: c, version: `${r.stdout || ''}${r.stderr || ''}`.trim() }; break; }
    } catch (_) { /* try the next one */ }
  }
  found.set(key, hit);
  return hit;
}

/** Forget what was found (used by tests). */
function resetTools() { found.clear(); }

module.exports = {
  MAX_CODE_LENGTH, MAX_OUTPUT_LINES, result, inputError, checkCode, toLines, withSlot, runProcess, cleanEnv, tempDir, findTool, resetTools,
};
