'use strict';
/**
 * Runs learner Python code on the server (Python course, modules 112-114).
 *
 * The program is written to main.py in a throw-away folder and started through
 * pyRunner.py, which adds an audit-hook guard and (on Linux) resource limits.
 * Set KIDSCODE_PYTHON to choose the interpreter; otherwise python3 / python / py are tried.
 */
const fs = require('fs').promises;
const path = require('path');
const { result, checkCode, toLines, withSlot, runProcess, cleanEnv, tempDir, findTool } = require('./common');

const TIMEOUT_MS = Number(process.env.KIDSCODE_RUN_TIMEOUT_MS) || 5000;
const RUNNER = path.join(__dirname, 'pyRunner.py');
const MARKER = '__KC_ERROR__';
const MPL_CACHE = path.join(require('os').tmpdir(), 'kidscode-matplotlib-cache');

/** Friendly extra help for the errors beginners meet most. */
const HINTS = {
  SyntaxError: 'Check for a missing colon (:) at the end of if / for / def lines, unclosed brackets or quotes.',
  IndentationError: 'Python uses spaces to group code. Indent the lines inside if / for / def by 4 spaces.',
  TabError: 'Mixing tabs and spaces confuses Python. Use 4 spaces for every indent.',
  NameError: 'You used a name before creating it. Check the spelling and that the variable is assigned first.',
  TypeError: 'You combined values of different types (for example text + number). Convert with str() or int().',
  IndexError: 'The list position does not exist. Positions start at 0 and end at len(list) - 1.',
  KeyError: 'That key is not in the dictionary. Check the spelling, or use dict.get(key).',
  ValueError: 'The value has the right type but the wrong content, for example int("abc").',
  ZeroDivisionError: 'You divided by zero. Check the value before dividing.',
  AttributeError: 'That object does not have this method or property. Check the spelling and the type of the value.',
  ModuleNotFoundError: 'That library is not installed on the practice server. numpy and pandas are available.',
  ImportError: 'That library or name could not be imported. numpy and pandas are available.',
  EOFError: 'Your program asked for input(). Type the input in the "Program input" box before you press Run.',
  RecursionError: 'A function keeps calling itself without stopping. Add a base case that returns.',
  PermissionError: 'The practice sandbox does not allow this (for example other programs, the internet or files outside your program).',
};

function python() {
  const tool = findTool('python', [process.env.KIDSCODE_PYTHON, 'python3', 'python', 'py'], ['-c', 'import sys; print(sys.version_info[0], sys.version_info[1])']);
  if (!tool) return null;
  const [major, minor] = tool.version.split(/\s+/).map(Number);
  return { command: tool.command, major, minor };
}

/** Pull the runner's structured error out of stderr; the rest is warnings the program printed. */
function splitStderr(stderr) {
  const lines = String(stderr || '').replace(/\r\n/g, '\n').split('\n');
  let error = null;
  const rest = [];
  for (const l of lines) {
    if (l.startsWith(MARKER)) {
      try { error = JSON.parse(l.slice(MARKER.length)); } catch (_) { rest.push(l); }
    } else rest.push(l);
  }
  return { error, warnings: rest.join('\n').trim() };
}

/**
 * @param {string} code  the learner's program
 * @param {{input?: string}} [opts] text fed to input()
 */
async function runPython(code, { input = '' } = {}) {
  const bad = checkCode('python', code);
  if (bad) return bad;
  const py = python();
  if (!py) {
    return result({ language: 'python', error: { type: 'unavailable', name: 'PythonUnavailable', message: 'Python is not installed on the server yet, so Python code cannot run. Ask the administrator to install Python 3.' } });
  }

  return withSlot(async () => {
    const { dir, cleanup } = await tempDir('py');
    const started = Date.now();
    try {
      await fs.writeFile(path.join(dir, 'main.py'), code, 'utf8');
      // -u unbuffered (output keeps its order), -E ignore PYTHON* settings, -P do not add the runner's folder to sys.path.
      const args = ['-u', '-E', ...(py.major > 3 || (py.major === 3 && py.minor >= 11) ? ['-P'] : []), RUNNER];
      const env = cleanEnv({
        PYTHONIOENCODING: 'utf-8', PYTHONDONTWRITEBYTECODE: '1',
        OPENBLAS_NUM_THREADS: '1', OMP_NUM_THREADS: '1', MKL_NUM_THREADS: '1', MPLBACKEND: 'Agg',
        // matplotlib's font cache: built once (while the runner pre-imports matplotlib, before the
        // guard is on) and then only read, so later runs start quickly.
        MPLCONFIGDIR: MPL_CACHE,
        // Needed to find libraries installed for the server's user (pip install --user).
        ...(process.env.APPDATA ? { APPDATA: process.env.APPDATA } : {}),
        ...(process.env.HOME ? { HOME: process.env.HOME } : {}),
        ...(process.env.USERPROFILE ? { USERPROFILE: process.env.USERPROFILE } : {}),
      });
      // Importing numpy / pandas alone can take 2-4 seconds, so those programs get extra time for it.
      const importAllowance = /\b(numpy|pandas|matplotlib)\b/.test(code) ? 8000 : 0;
      const r = await runProcess(py.command, args, { cwd: dir, timeoutMs: TIMEOUT_MS + importAllowance, input, env });
      const timeMs = Date.now() - started;
      const output = toLines(r.stdout);
      const { error, warnings } = splitStderr(r.stderr);
      const notes = warnings ? toLines(warnings) : [];

      if (r.spawnError) {
        return result({ language: 'python', timeMs, error: { type: 'unavailable', name: 'PythonUnavailable', message: `Python could not start: ${r.spawnError.message}` } });
      }
      if (r.timedOut) {
        return result({ language: 'python', output, notes, timeMs, error: { type: 'timeout', name: 'TimeoutError', message: `Your program ran for more than ${TIMEOUT_MS / 1000} seconds and was stopped.`, hint: 'Look for a loop that never ends (a while loop whose condition never becomes False).' } });
      }
      if (r.truncated) {
        return result({ language: 'python', output, notes, timeMs, truncated: true, error: { type: 'runtime', name: 'OutputLimit', message: 'Your program printed too much output and was stopped.', hint: 'Print less, or check for a loop that never ends.' } });
      }
      if (error) {
        const syntax = ['SyntaxError', 'IndentationError', 'TabError'].includes(error.name);
        return result({
          language: 'python', output, notes, timeMs,
          error: {
            type: syntax ? 'syntax' : 'runtime', name: error.name, message: error.message || error.name,
            line: error.line || undefined, details: error.traceback || undefined, hint: HINTS[error.name],
          },
        });
      }
      if (r.code !== 0) {
        const text = notes.join('\n') || `Python stopped with exit code ${r.code}.`;
        return result({ language: 'python', output, timeMs, error: { type: 'runtime', name: 'ExitError', message: text.slice(-2000) } });
      }
      return result({ language: 'python', output, notes, timeMs });
    } finally {
      await cleanup();
    }
  }).catch((e) => result({ language: 'python', error: { type: e.code === 'busy' ? 'busy' : 'runtime', name: e.code === 'busy' ? 'Busy' : 'Error', message: e.message } }));
}

module.exports = { runPython, splitStderr };
