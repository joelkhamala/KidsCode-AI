'use strict';
/**
 * Runs learner JavaScript in an isolated worker thread (see jsWorker.js).
 *
 * Usage:
 *   const { runJavaScript } = require('./sandbox/runJs');
 *   const r = await runJavaScript('console.log(1 + 1)');
 *   // r = { output: ['2'], turtleCommands: [], truncated: false, error: null }
 *
 * Note: Node's vm module is not advertised as a security boundary. The layers
 * used here (worker + resource limits + no host objects + no eval) make escape
 * much harder, but for a large public deployment consider running learner code
 * in the browser (Web Worker) or in a container/isolated-vm process as well.
 */
const path = require('path');
const { Worker } = require('worker_threads');

const WORKER_PATH = path.join(__dirname, 'jsWorker.js');
const MAX_CODE_LENGTH = 5000;

// Limit concurrent executions so a burst of requests cannot exhaust the server.
const MAX_CONCURRENT = Number(process.env.SANDBOX_MAX_CONCURRENT || 4);
let active = 0;
const queue = [];

function acquire() {
  if (active < MAX_CONCURRENT) {
    active += 1;
    return Promise.resolve();
  }
  return new Promise((resolve) => queue.push(resolve));
}

function release() {
  const next = queue.shift();
  if (next) next();
  else active -= 1;
}

/**
 * @param {string} code
 * @param {{timeoutMs?: number, maxOutputLines?: number, maxTurtleCommands?: number}} [opts]
 * @returns {Promise<{output: string[], turtleCommands: object[], truncated: boolean, error: null|{name: string, message: string}}>}
 */
async function runJavaScript(code, opts = {}) {
  if (typeof code !== 'string') {
    return { output: [], turtleCommands: [], truncated: false, error: { name: 'TypeError', message: 'Code must be text' } };
  }
  if (code.length > MAX_CODE_LENGTH) {
    return { output: [], turtleCommands: [], truncated: false, error: { name: 'RangeError', message: 'Code is too long' } };
  }

  const timeoutMs = Math.min(Math.max(Number(opts.timeoutMs) || 3000, 100), 10000);
  await acquire();

  try {
    return await new Promise((resolve) => {
      let settled = false;
      const worker = new Worker(WORKER_PATH, {
        workerData: {
          code,
          timeoutMs,
          maxOutputLines: opts.maxOutputLines || 500,
          maxTurtleCommands: opts.maxTurtleCommands || 5000,
        },
        resourceLimits: { maxOldGenerationSizeMb: 64, maxYoungGenerationSizeMb: 16, stackSizeMb: 4 },
        stdout: true,
        stderr: true,
      });

      const finish = (value) => {
        if (settled) return;
        settled = true;
        clearTimeout(hardStop);
        worker.terminate().catch(() => {});
        resolve(value);
      };

      // Backstop in case the vm timeout does not fire (e.g. blocked microtasks).
      const hardStop = setTimeout(() => {
        finish({
          output: [], turtleCommands: [], truncated: false,
          error: { name: 'Error', message: 'Script execution timed out.' },
        });
      }, timeoutMs + 1500);

      worker.once('message', (msg) => finish(msg));
      worker.once('error', (err) => {
        const outOfMemory = /memory|heap/i.test(String(err && err.message));
        finish({
          output: [], turtleCommands: [], truncated: false,
          error: {
            name: 'Error',
            message: outOfMemory ? 'Your program used too much memory.' : String((err && err.message) || err),
          },
        });
      });
      worker.once('exit', (exitCode) => {
        if (!settled) {
          finish({
            output: [], turtleCommands: [], truncated: false,
            error: { name: 'Error', message: `Program stopped unexpectedly (code ${exitCode}).` },
          });
        }
      });
    });
  } finally {
    release();
  }
}

module.exports = { runJavaScript, MAX_CODE_LENGTH };
