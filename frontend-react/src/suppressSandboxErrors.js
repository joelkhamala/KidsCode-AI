/**
 * suppressSandboxErrors.js
 *
 * Browser extensions (Grammarly, AI assistants, DevTools loaders, etc.) inject
 * scripts into ALL frames, including our sandboxed preview iframes.
 * When sandbox="allow-scripts" is used without allow-same-origin, any attempt
 * by extension scripts to set document.cookie throws a SecurityError.
 *
 * These errors are 100% harmless — the sandbox is working correctly — but they
 * flood the dev console. This module suppresses only that specific error pattern.
 */

// (Errors from browser extensions are filtered by a small script at the top of
// public/index.html, because it has to run before the development error overlay.)

// Suppress synchronous SecurityErrors about cookie+sandbox
window.addEventListener('error', function (event) {
  if (
    event.error instanceof DOMException &&
    event.error.name === 'SecurityError' &&
    event.message &&
    event.message.includes('cookie')
  ) {
    event.preventDefault();
    event.stopImmediatePropagation();
    return true;
  }
}, true /* capture phase — runs before everything else */);

// Suppress unhandled promise rejections with the same pattern
window.addEventListener('unhandledrejection', function (event) {
  const reason = event.reason;
  if (
    reason instanceof DOMException &&
    reason.name === 'SecurityError' &&
    reason.message &&
    reason.message.includes('cookie')
  ) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}, true);

// The extension's Promise.catch() logs the error directly via console.error.
// We cannot intercept that via window events, so filter console.error instead.
const _origError = console.error.bind(console);
console.error = function (...args) {
  const msg = args[0];
  if (
    msg instanceof DOMException &&
    msg.name === 'SecurityError' &&
    msg.message &&
    msg.message.includes('cookie')
  ) return; // swallow silently
  if (typeof msg === 'string' && msg.includes('cookie') && msg.includes('sandboxed')) return;
  _origError(...args);
};

