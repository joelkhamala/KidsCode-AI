// Privacy-safe, fire-and-forget product analytics.
// This module deliberately uses plain fetch and never imports api.js, so the
// two services cannot create an import cycle.

const ENDPOINT = '/api/analytics/events';
const MAX_EVENTS = 20;
const MAX_PROPS = 12;
const MAX_VALUE_LENGTH = 120;
const FLUSH_INTERVAL_MS = 15000;
const PAGE_VIEW_DEDUPE_MS = 1000;
const SESSION_KEY = 'kidscode_analytics_session';

// Keys that must never leave the browser, even if a caller passes them by mistake.
const DENYLIST = new Set([
  'email',
  'password',
  'code',
  'source',
  'answers',
  'text',
  'phone',
  'name',
  'childName',
  'parentEmail',
].map((key) => key.toLowerCase()));

let initialized = false;
let sessionId = null;
let sessionStart = Date.now();
let queue = [];
let lastPageView = { path: null, at: 0 };

function randomId() {
  try {
    const browserCrypto = typeof window !== 'undefined' && window.crypto
      ? window.crypto
      : (typeof crypto !== 'undefined' ? crypto : null);
    if (browserCrypto) {
      if (typeof browserCrypto.randomUUID === 'function') return browserCrypto.randomUUID();
      if (typeof browserCrypto.getRandomValues === 'function') {
        const bytes = browserCrypto.getRandomValues(new Uint8Array(16));
        return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
      }
    }
  } catch {
    // Fall through to the non-crypto fallback.
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

function sanitizeValue(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.slice(0, MAX_VALUE_LENGTH);
  // Objects and arrays are skipped entirely: they can contain child text/code.
  return undefined;
}

function sanitizeProps(props) {
  const clean = Object.create(null);
  if (!props || typeof props !== 'object' || Array.isArray(props)) return clean;

  let count = 0;
  for (const key of Object.keys(props)) {
    if (count >= MAX_PROPS) break;
    const lower = key.toLowerCase();
    if (DENYLIST.has(lower) || ['__proto__', 'prototype', 'constructor'].includes(lower)) continue;
    const value = sanitizeValue(props[key]);
    if (value === undefined) continue;
    clean[key.slice(0, 60)] = value;
    count += 1;
  }
  return clean;
}

function supportsKeepalive() {
  try {
    return typeof fetch === 'function' && typeof Request !== 'undefined' && 'keepalive' in Request.prototype;
  } catch {
    return false;
  }
}

function sendBatch(events) {
  try {
    if (!events.length || typeof fetch !== 'function') return;
    const options = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events }),
    };
    if (supportsKeepalive()) options.keepalive = true;
    const result = fetch(ENDPOINT, options);
    if (result && typeof result.catch === 'function') result.catch(() => {});
  } catch {
    // Analytics must never affect the learner experience.
  }
}

export function flushAnalytics() {
  try {
    // Send every queued batch, with a safety bound so a broken page cannot loop forever.
    for (let i = 0; i < 10 && queue.length; i += 1) {
      sendBatch(queue.splice(0, MAX_EVENTS));
    }
  } catch {
    // Ignore all failures.
  }
}

export function initAnalytics() {
  if (initialized || typeof window === 'undefined' || typeof document === 'undefined') return;
  initialized = true;

  try {
    const stored = window.sessionStorage && window.sessionStorage.getItem(SESSION_KEY);
    if (stored) {
      sessionId = stored;
    } else {
      sessionId = randomId();
      if (window.sessionStorage) window.sessionStorage.setItem(SESSION_KEY, sessionId);
    }
  } catch {
    sessionId = randomId();
  }
  sessionStart = Date.now();

  try {
    window.setInterval(() => flushAnalytics(), FLUSH_INTERVAL_MS);
  } catch {
    // If timers are unavailable, batching at 20 events still works.
  }

  const onVisibilityChange = () => {
    if (document.hidden) flushAnalytics();
  };
  const onNavigation = () => {
    // Only the path is sent: queries/hashes can contain learner-generated text.
    const path = window.location.pathname || '/';
    const now = Date.now();
    if (lastPageView.path === path && now - lastPageView.at < PAGE_VIEW_DEDUPE_MS) return;
    lastPageView = { path, at: now };
    trackEvent('page_view', { path });
  };

  try {
    window.addEventListener('popstate', onNavigation);
    window.addEventListener('hashchange', onNavigation);
    window.addEventListener('beforeunload', flushAnalytics);
    document.addEventListener('visibilitychange', onVisibilityChange);
  } catch {
    // Some embedded browsers restrict listeners; analytics still works via trackEvent.
  }
}

export function trackEvent(name, props = {}) {
  try {
    if (!initialized) initAnalytics();
    if (typeof name !== 'string' || !name.trim()) return;

    if (name === 'page_view') {
      const path = props && typeof props.path === 'string' ? props.path : '';
      const now = Date.now();
      if (lastPageView.path === path && now - lastPageView.at < PAGE_VIEW_DEDUPE_MS) return;
      lastPageView = { path, at: now };
    }

    const event = {
      name: name.trim().slice(0, 80),
      props: sanitizeProps(props),
      ts: Date.now(),
      sessionId: sessionId || randomId(),
    };
    queue.push(event);
    if (queue.length >= MAX_EVENTS) flushAnalytics();
  } catch {
    // Never let analytics break a user action.
  }
}

export function getAnalyticsSessionStart() {
  if (!initialized) initAnalytics();
  return sessionStart;
}
