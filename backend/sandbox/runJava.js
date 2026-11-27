'use strict';
/**
 * Compiles and runs learner Java code on the server (Java course, modules 109-111).
 *
 * Learners may write either a few statements (wrapped in a Main class for them) or whole
 * classes. Several public classes in one editor are allowed: "public" is removed from the
 * top-level types so they fit in one file, and the class with main() is the one started.
 *
 * The JDK is found through KIDSCODE_JAVA_HOME, JAVA_HOME or the PATH. On Java 9-23 the
 * program runs under a security policy that grants nothing (no files, network or other
 * programs). JDK 24+ removed the SecurityManager, so learner code is refused there rather
 * than run without a sandbox; install JDK 17-23 until OS-level isolation is available.
 */
const fs = require('fs').promises;
const path = require('path');
const { MAX_CODE_LENGTH, result, checkCode, toLines, withSlot, runProcess, cleanEnv, tempDir, findTool } = require('./common');

const RUN_TIMEOUT_MS = Number(process.env.KIDSCODE_RUN_TIMEOUT_MS) || 5000;
const COMPILE_TIMEOUT_MS = 20000; // starting the compiler itself takes a second or two

const COMPILE_HINTS = [
  [/';' expected/, 'Every Java statement ends with a semicolon (;).'],
  [/cannot find symbol/, 'Java does not know this name. Check the spelling and capital letters (System, String, Scanner) and that the variable is declared before use.'],
  [/reached end of file while parsing/, 'A closing curly bracket } is missing.'],
  [/class, interface, enum, or record expected/, 'There is an extra } or code outside a class. Check that your brackets match.'],
  [/incompatible types/, 'The value does not match the variable type, for example text in an int. Check the types on both sides of =.'],
  [/missing return statement/, 'This method promises to return a value. Make sure every path ends with return.'],
  [/unclosed string literal/, 'A string is missing its closing double quote (").'],
  [/might not have been initialized/, 'Give the variable a value before you use it.'],
  [/is already defined/, 'Two variables or methods have the same name. Rename one of them.'],
  [/illegal start of expression/, 'Something is out of place before this point - often a missing bracket or semicolon on the line above.'],
];

const RUNTIME_HINTS = {
  NullPointerException: 'You used an object that is null. Create it with new before calling its methods.',
  ArrayIndexOutOfBoundsException: 'The array position does not exist. Positions go from 0 to length - 1.',
  StringIndexOutOfBoundsException: 'The text position does not exist. Positions go from 0 to length() - 1.',
  IndexOutOfBoundsException: 'The list position does not exist. Positions go from 0 to size() - 1.',
  ArithmeticException: 'Whole-number division by zero is not allowed. Check the value before dividing.',
  NumberFormatException: 'The text could not be turned into a number, for example Integer.parseInt("abc").',
  InputMismatchException: 'The program expected a number but got text. Check what you typed in the "Program input" box.',
  NoSuchElementException: 'Your program asked for input with Scanner. Type it in the "Program input" box before you press Run.',
  ClassCastException: 'The object is not of the type you cast it to.',
  StackOverflowError: 'A method keeps calling itself without stopping. Add a base case.',
  OutOfMemoryError: 'The program used too much memory - check for a loop that keeps adding to a list.',
  AccessControlException: 'The practice sandbox does not allow this (files, the internet or other programs).',
  SecurityException: 'The practice sandbox does not allow this (files, the internet or other programs).',
};

// ---------------------------------------------------------------------------
// Finding the JDK
// ---------------------------------------------------------------------------
function jdk() {
  const homes = [process.env.KIDSCODE_JAVA_HOME, process.env.JAVA_HOME].filter(Boolean);
  const bin = (name) => [...homes.map((h) => path.join(h, 'bin', name)), name];
  const javac = findTool('javac', bin('javac'), ['-version']);
  const java = findTool('java', bin('java'), ['-version']);
  if (!javac || !java) return null;
  // "openjdk version "17.0.20"" or "java version "1.8.0_x"".
  const m = java.version.match(/version "(\d+)(?:\.(\d+))?/);
  const major = m ? (Number(m[1]) === 1 ? Number(m[2]) : Number(m[1])) : 0;
  return { javac: javac.command, java: java.command, major };
}

// ---------------------------------------------------------------------------
// Preparing the source
// ---------------------------------------------------------------------------

/**
 * Top-level type declarations, found with a small scanner that skips comments, strings
 * and characters and tracks { } depth.
 * @returns {{types: {name: string, start: number, bodyStart: number, end: number, publicAt: number}[]}}
 */
function scanTypes(code) {
  const types = [];
  let depth = 0;
  let current = null;
  const n = code.length;
  for (let i = 0; i < n; i += 1) {
    const ch = code[i];
    const next = code[i + 1];
    if (ch === '/' && next === '/') { while (i < n && code[i] !== '\n') i += 1; continue; }
    if (ch === '/' && next === '*') { i += 2; while (i < n && !(code[i] === '*' && code[i + 1] === '/')) i += 1; i += 1; continue; }
    if (ch === '"' && code.startsWith('"""', i)) { i += 3; while (i < n && !code.startsWith('"""', i)) i += 1; i += 2; continue; }
    if (ch === '"' || ch === "'") {
      const q = ch; i += 1;
      while (i < n && code[i] !== q && code[i] !== '\n') { if (code[i] === '\\') i += 1; i += 1; }
      continue;
    }
    if (ch === '{') {
      if (depth === 0 && current && current.bodyStart < 0) current.bodyStart = i;
      depth += 1;
      continue;
    }
    if (ch === '}') {
      depth -= 1;
      if (depth === 0 && current) { current.end = i; types.push(current); current = null; }
      continue;
    }
    if (depth === 0 && !current && /[A-Za-z@]/.test(ch) && (i === 0 || /[\s;}]/.test(code[i - 1]))) {
      const m = /^((?:(?:public|abstract|final|sealed|non-sealed|strictfp|static)\s+)*)(class|interface|enum|record)\s+([A-Za-z_$][\w$]*)/.exec(code.slice(i, i + 200));
      if (m) {
        const pub = /\bpublic\b/.exec(m[1]);
        current = { name: m[3], start: i, bodyStart: -1, end: n, publicAt: pub ? i + pub.index : -1 };
        i += m[0].length - 1;
      }
    }
  }
  if (current) types.push(current);
  return { types };
}

/**
 * Turn what the learner wrote into one compilable Main.java.
 * @returns {{source: string, mainClass: string|null, offset: number, wrapped: boolean}}
 *   offset = how many lines were added above the learner's first line
 */
function prepareJava(code) {
  const { types } = scanTypes(code);
  if (!types.length) {
    // Just statements: put them inside main(). Imports move to the top; their lines are
    // left blank so the learner's line numbers stay the same.
    const lines = code.replace(/\r\n/g, '\n').split('\n');
    const imports = [];
    const body = lines.map((l) => (/^\s*import\s+[\w.]+(\.\*)?\s*;\s*$/.test(l) ? (imports.push(l.trim()), '') : l));
    const header = [...imports, 'public class Main {', 'public static void main(String[] args) throws Exception {'];
    return { source: `${header.join('\n')}\n${body.join('\n')}\n}\n}\n`, mainClass: 'Main', offset: header.length, wrapped: true };
  }
  // Remove "public" from top-level types (replaced by spaces so columns do not move).
  let source = code;
  for (const t of [...types].sort((a, b) => b.publicAt - a.publicAt)) {
    if (t.publicAt >= 0) source = `${source.slice(0, t.publicAt)}      ${source.slice(t.publicAt + 6)}`;
  }
  const mainAt = /\bstatic\s+(?:final\s+)?void\s+main\s*\(/g;
  let mainClass = null;
  let m;
  while ((m = mainAt.exec(code)) && !mainClass) {
    const at = m.index;
    const owner = types.find((t) => t.bodyStart >= 0 && at > t.bodyStart && at < t.end);
    if (owner) mainClass = owner.name;
  }
  return { source, mainClass, offset: 0, wrapped: false };
}

// ---------------------------------------------------------------------------
// Reading javac / java messages
// ---------------------------------------------------------------------------
const toUserLine = (n, offset) => Math.max(1, Number(n) - offset);

function compileError(stderr, offset) {
  const text = String(stderr || '').replace(/\r\n/g, '\n').trim();
  const first = /Main\.java:(\d+): error: (.*)/.exec(text);
  const details = text
    .replace(/Main\.java:(\d+):/g, (_, n) => `Line ${toUserLine(n, offset)}:`)
    .replace(/\n\d+ errors?$/, '')
    .trim();
  const count = (text.match(/: error: /g) || []).length;
  const message = first ? first[2] : (text.split('\n')[0] || 'Your code could not be compiled.');
  const hint = (COMPILE_HINTS.find(([re]) => re.test(message)) || [])[1];
  return {
    type: 'compile', name: 'CompileError',
    message: count > 1 ? `${message} (and ${count - 1} more error${count > 2 ? 's' : ''})` : message,
    line: first ? toUserLine(first[1], offset) : undefined, details, hint,
  };
}

/** Lines the JVM prints about the deprecated Security Manager are not the learner's. */
const jvmNoise = (l) => /^WARNING: (A command line option has enabled the Security Manager|The Security Manager is deprecated)/.test(l);

function runtimeError(stderr, offset) {
  const lines = String(stderr || '').replace(/\r\n/g, '\n').split('\n').filter((l) => !jvmNoise(l));
  const text = lines.join('\n').trim();
  const ex = /Exception in thread "[^"]*" ([\w.$]+)(?::\s*(.*))?/.exec(text);
  if (ex) {
    const name = ex[1].split('.').pop();
    const at = /\(Main\.java:(\d+)\)/.exec(text);
    const userFrames = text.split('\n').filter((l) => !/^\s+at (java|jdk|sun)\./.test(l)).join('\n')
      .replace(/Main\.java:(\d+)/g, (_, n) => `line ${toUserLine(n, offset)}`);
    let message = ex[2] || name;
    if (/AccessControlException|SecurityException/.test(name)) message = 'This action is not allowed in the KidsCode practice sandbox.';
    return { type: 'runtime', name, message, line: at ? toUserLine(at[1], offset) : undefined, details: userFrames, hint: RUNTIME_HINTS[name] };
  }
  if (/StackOverflowError|OutOfMemoryError/.test(text)) {
    const name = /StackOverflowError/.test(text) ? 'StackOverflowError' : 'OutOfMemoryError';
    return { type: 'runtime', name, message: name, hint: RUNTIME_HINTS[name] };
  }
  return { type: 'runtime', name: 'RuntimeError', message: text.split('\n')[0] || 'The program stopped with an error.', details: text || undefined };
}

// ---------------------------------------------------------------------------
// Running
// ---------------------------------------------------------------------------

/**
 * @param {string} code  the learner's Java code (statements or whole classes)
 * @param {{input?: string}} [opts] text for Scanner(System.in)
 */
async function runJava(code, { input = '' } = {}) {
  const bad = checkCode('java', code);
  if (bad) return bad;
  const tools = jdk();
  if (!tools) {
    return result({ language: 'java', error: { type: 'unavailable', name: 'JavaUnavailable', message: 'Java (the JDK) is not installed on the server yet, so Java code cannot run. Ask the administrator to install a JDK (version 17 or newer).' } });
  }
  // JDK 24+ removed the SecurityManager. We cannot safely run learner code
  // without OS-level isolation, so fail closed instead of running unrestricted.
  if (tools.major >= 24) {
    return result({ language: 'java', error: { type: 'unavailable', name: 'JavaUnavailable', message: 'Java practice is temporarily unavailable on this server (JDK 24+ cannot be sandboxed safely). Ask the administrator to install JDK 17-23.' } });
  }
  const prepared = prepareJava(code);
  if (!prepared.mainClass) {
    return result({ language: 'java', error: { type: 'compile', name: 'NoMainMethod', message: 'No main method was found, so there is nothing to start.', hint: 'Add this inside one of your classes: public static void main(String[] args) { ... }' } });
  }

  return withSlot(async () => {
    const { dir, cleanup } = await tempDir('java');
    const started = Date.now();
    try {
      await fs.writeFile(path.join(dir, 'Main.java'), prepared.source, 'utf8');
      const env = cleanEnv();
      const compiled = await runProcess(tools.javac, ['-encoding', 'UTF-8', '-J-Xmx256m', '-nowarn', '-Xlint:none', '-d', dir, 'Main.java'], { cwd: dir, timeoutMs: COMPILE_TIMEOUT_MS, env });
      if (compiled.spawnError) {
        return result({ language: 'java', error: { type: 'unavailable', name: 'JavaUnavailable', message: `The Java compiler could not start: ${compiled.spawnError.message}` } });
      }
      if (compiled.timedOut) {
        return result({ language: 'java', timeMs: Date.now() - started, error: { type: 'timeout', name: 'TimeoutError', message: 'Compiling took too long. Please try again.' } });
      }
      if (compiled.code !== 0) {
        return result({ language: 'java', timeMs: Date.now() - started, error: compileError(compiled.stderr || compiled.stdout, prepared.offset) });
      }

      const sandbox = [];
      if (tools.major >= 9 && tools.major <= 23) {
        const policy = path.join(dir, 'empty.policy');
        await fs.writeFile(policy, 'grant {\n};\n', 'utf8');
        sandbox.push('-Djava.security.manager', `-Djava.security.policy==${policy}`);
      }
      const args = ['-Xmx128m', '-Xss16m', '-XX:+UseSerialGC', '-XX:TieredStopAtLevel=1', '-Dfile.encoding=UTF-8', '-Dstdout.encoding=UTF-8',
        ...sandbox, '-cp', dir, prepared.mainClass];
      const ranAt = Date.now();
      const r = await runProcess(tools.java, args, { cwd: dir, timeoutMs: RUN_TIMEOUT_MS, input, env });
      const timeMs = Date.now() - ranAt;
      const output = toLines(r.stdout);
      if (r.timedOut) {
        return result({ language: 'java', output, timeMs, error: { type: 'timeout', name: 'TimeoutError', message: `Your program ran for more than ${RUN_TIMEOUT_MS / 1000} seconds and was stopped.`, hint: 'Look for a loop that never ends, or a Scanner waiting for input you did not give.' } });
      }
      if (r.truncated) {
        return result({ language: 'java', output, timeMs, truncated: true, error: { type: 'runtime', name: 'OutputLimit', message: 'Your program printed too much output and was stopped.', hint: 'Print less, or check for a loop that never ends.' } });
      }
      if (r.code !== 0) return result({ language: 'java', output, timeMs, error: runtimeError(r.stderr, prepared.offset) });
      const notes = toLines(String(r.stderr || '').split('\n').filter((l) => l.trim() && !jvmNoise(l)).join('\n'));
      return result({ language: 'java', output, notes, timeMs });
    } finally {
      await cleanup();
    }
  }).catch((e) => result({ language: 'java', error: { type: e.code === 'busy' ? 'busy' : 'runtime', name: e.code === 'busy' ? 'Busy' : 'Error', message: e.message } }));
}

module.exports = { runJava, prepareJava, scanTypes, MAX_CODE_LENGTH };
