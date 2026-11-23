'use strict';
/**
 * Worker-thread entry point that executes learner JavaScript.
 *
 * Isolation layers (defence in depth):
 *  1. Runs in a separate worker thread with V8 heap/stack limits, so a memory
 *     bomb or crash cannot take down the API server.
 *  2. Runs inside a fresh vm context that receives NO host objects. The old
 *     implementation passed host functions (JSON, Math.floor...) into the
 *     context, and `Math_floor.constructor("return this")().process` reached
 *     the server's real `process` object (remote code execution).
 *  3. String-based code generation (eval / new Function) is disabled inside the
 *     context, which closes the `this.constructor.constructor(...)` escape.
 *  4. Microtasks run inside the timeout window, so async infinite loops are
 *     also stopped.
 *
 * Only a JSON *string* (a primitive) crosses back out of the context.
 */
const { parentPort, workerData } = require('worker_threads');
const vm = require('vm');

const { code, timeoutMs, maxOutputLines, maxTurtleCommands } = workerData;

// Everything below is evaluated INSIDE the sandbox, using the sandbox's own
// built-ins (its own Object, JSON, Math...). Nothing from the host leaks in.
const prelude = `
  "use strict";
  const __out = [];
  const __turtle = [];
  let __truncated = false;
  const __fmt = (a) => {
    if (typeof a === 'string') return a;
    if (typeof a === 'object' && a !== null) {
      try { return JSON.stringify(a, null, 2); } catch (e) { return String(a); }
    }
    return String(a);
  };
  const __push = (line) => {
    if (__out.length >= ${Number(maxOutputLines)}) { __truncated = true; return; }
    __out.push(line.length > 2000 ? line.slice(0, 2000) + '…' : line);
  };
  const __cmd = (c) => { if (__turtle.length < ${Number(maxTurtleCommands)}) __turtle.push(c); };
  const __num = (n, name) => {
    const v = Number(n);
    if (!Number.isFinite(v)) throw new TypeError(name + ' needs a number');
    return v;
  };
  globalThis.console = Object.freeze({
    log: (...args) => __push(args.map(__fmt).join(' ')),
    info: (...args) => __push(args.map(__fmt).join(' ')),
    error: (...args) => __push('Error: ' + args.map(__fmt).join(' ')),
    warn: (...args) => __push('Warning: ' + args.map(__fmt).join(' ')),
  });
  // Turtle graphics API used by lessons and the Blockly playground.
  globalThis.forward = (dist) => __cmd({ type: 'forward', dist: __num(dist, 'forward') });
  globalThis.backward = (dist) => __cmd({ type: 'backward', dist: __num(dist, 'backward') });
  globalThis.right = (angle) => __cmd({ type: 'right', angle: __num(angle, 'right') });
  globalThis.left = (angle) => __cmd({ type: 'left', angle: __num(angle, 'left') });
  globalThis.color = (c) => __cmd({ type: 'color', color: String(c).slice(0, 40) });
  globalThis.penUp = () => __cmd({ type: 'penUp' });
  globalThis.penDown = () => __cmd({ type: 'penDown' });
  globalThis.clear = () => __cmd({ type: 'clear' });
  globalThis.arc = (radius, angle) => __cmd({ type: 'arc', radius: __num(radius, 'arc'), angle: __num(angle, 'arc') });
  globalThis.__result = () => JSON.stringify({ output: __out, turtleCommands: __turtle, truncated: __truncated });
`;

function run() {
  const context = vm.createContext(Object.create(null), {
    codeGeneration: { strings: false, wasm: false },
    microtaskMode: 'afterEvaluate',
  });

  vm.runInContext(prelude, context, { timeout: 1000 });

  let error = null;
  try {
    // Wrap learner code in its own function scope so `let`/`const` declarations
    // cannot clash with the prelude helpers.
    const wrapped = `(function () {\n"use strict";\n${code}\n})();`;
    vm.runInContext(wrapped, context, { timeout: timeoutMs, filename: 'your-code.js', lineOffset: -2 });
  } catch (err) {
    error = {
      name: (err && err.name) || 'Error',
      message: String((err && err.message) || err),
    };
  }

  const resultJson = vm.runInContext('__result()', context, { timeout: 500 });
  const result = JSON.parse(resultJson);
  parentPort.postMessage({ ...result, error });
}

try {
  run();
} catch (err) {
  parentPort.postMessage({
    output: [],
    turtleCommands: [],
    truncated: false,
    error: { name: (err && err.name) || 'Error', message: String((err && err.message) || err) },
  });
}
