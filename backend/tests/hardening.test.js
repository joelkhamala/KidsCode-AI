'use strict';
/**
 * Regression tests for cookie auth, CSRF protection and shared rate limits.
 *
 * Run: node --test tests/hardening.test.js
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kidscode-hardening-'));
process.env.KIDSCODE_DB_PATH = path.join(tmpDir, 'hardening.db');
process.env.JWT_SECRET = 'hardening-test-secret';
process.env.NODE_ENV = 'production';
process.env.AI_PROVIDER = 'offline';
require.cache[require.resolve('sqlite3')] = { id: 'sqlite3', filename: 'sqlite3', loaded: true, exports: require('./sqlite3-shim') };

const app = require('../server');
const { initializeDatabase, getDb } = require('../database');

let server;
let base;
const dbGet = (sql, params = []) => new Promise((res, rej) => getDb().get(sql, params, (e, r) => (e ? rej(e) : res(r))));
const dbRun = (sql, params = []) => new Promise((res, rej) => getDb().run(sql, params, function done(e) { e ? rej(e) : res(this); }));

async function http(method, url, body, { token, cookie, origin } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  if (cookie) headers.cookie = cookie;
  if (origin) headers.origin = origin;
  const res = await fetch(base + url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: res.status, body: json, setCookies: res.headers.getSetCookie ? res.headers.getSetCookie() : [] };
}

const cookieNamed = (res, name) => {
  const line = res.setCookies.find((c) => c.startsWith(`${name}=`));
  if (!line) return '';
  assert.match(line, /HttpOnly/i, `${name} is HttpOnly`);
  assert.match(line, /SameSite=Strict/i, `${name} is SameSite=Strict`);
  assert.match(line, /Secure/i, `${name} is Secure in production`);
  return line.split(';')[0];
};

async function registerChild(username) {
  const res = await http('POST', '/api/register', {
    username, email: `${username}@example.com`, password: 'secret123', age: 14,
  });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  return { cookie: cookieNamed(res, 'kids_session'), token: res.body.token, user: res.body.user };
}

test.before(async () => {
  await initializeDatabase();
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => {
  server.close();
  try { fs.rmSync(tmpDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { /* ignore */ }
});

test('login stores the JWT in an HttpOnly cookie and rehydrates from it', async () => {
  const kid = await registerChild('cookie_kid');
  assert.ok(kid.cookie.startsWith('kids_session='));

  const me = await http('GET', '/api/me', null, { cookie: kid.cookie });
  assert.equal(me.status, 200);
  assert.equal(me.body.user.username, 'cookie_kid');
  assert.equal(me.body.user.accountType, 'child');

  const arena = await http('GET', '/api/duels/modes', null, { cookie: kid.cookie });
  assert.equal(arena.status, 200, 'arena accepts the cookie without an Authorization header');

  const out = await http('POST', '/api/logout', null, { cookie: kid.cookie });
  assert.equal(out.status, 200);
  assert.ok(out.setCookies.some((c) => c.startsWith('kids_session=;')));
});

test('cookie-authenticated writes reject a foreign Origin', async () => {
  const kid = await registerChild('csrf_kid');
  const evil = await http('POST', '/api/logout', null, { cookie: kid.cookie, origin: 'https://evil.example' });
  assert.equal(evil.status, 403);

  const own = await http('POST', '/api/logout', null, { cookie: kid.cookie, origin: base });
  assert.equal(own.status, 200);
});

test('parent view-as-child and restore swap cookies without exposing the parent JWT', async () => {
  const parent = await http('POST', '/api/parent/register', {
    email: 'cookie-parent@example.com', password: 'secret123', firstName: 'A', lastName: 'B',
  });
  const parentCookie = cookieNamed(parent, 'kids_session');
  const child = await http('POST', '/api/parent/children', {
    username: 'cookie_switch_kid', displayName: 'Kid', age: 10,
  }, { cookie: parentCookie });
  assert.equal(child.status, 200);

  const switched = await http('POST', `/api/parent/switch-child/${child.body.child.id}`, null, { cookie: parentCookie });
  assert.equal(switched.status, 200);
  const childCookie = cookieNamed(switched, 'kids_session');
  const restoreCookie = cookieNamed(switched, 'kids_parent_session');
  assert.ok(childCookie && restoreCookie);

  const asChild = await http('GET', '/api/me', null, { cookie: `${childCookie}; ${restoreCookie}` });
  assert.equal(asChild.body.user.accountType, 'child');
  assert.equal(asChild.body.user.switchedByParent, true);

  const restored = await http('POST', '/api/parent/restore', null, { cookie: `${childCookie}; ${restoreCookie}` });
  assert.equal(restored.status, 200);
  const restoredCookie = cookieNamed(restored, 'kids_session');
  const asParent = await http('GET', '/api/me', null, { cookie: restoredCookie });
  assert.equal(asParent.body.user.accountType, 'parent');
});

test('adult sessions use a separate cookie and cannot authenticate adult routes with a child cookie', async () => {
  const kid = await registerChild('cookie_other_kid');
  const adult = await http('POST', '/api/adult/register', {
    email: 'cookie-adult@example.com', password: 'secret123',
    firstName: 'A', lastName: 'B', occupation: 'Dev', educationLevel: 'Degree', learningGoals: 'Learn',
  });
  assert.equal(adult.status, 200, JSON.stringify(adult.body));
  const adultCookie = cookieNamed(adult, 'adult_session');

  const me = await http('GET', '/api/adult/me', null, { cookie: adultCookie });
  assert.equal(me.status, 200);

  const wrong = await http('GET', '/api/adult/me', null, { cookie: kid.cookie });
  assert.equal(wrong.status, 403);
});

test('rate-limit counters are shared in SQLite across requests', async () => {
  await dbRun('DELETE FROM rate_buckets');
  const kid = await registerChild('rate_kid');
  for (let i = 0; i < 300; i += 1) {
    const res = await http('GET', '/api/duels/modes', null, { cookie: kid.cookie });
    assert.equal(res.status, 200, `request ${i + 1}`);
  }
  const limited = await http('GET', '/api/duels/modes', null, { cookie: kid.cookie });
  assert.equal(limited.status, 429);
  assert.match(limited.body.error, /Too many requests/);

  const bucket = await dbGet("SELECT COUNT(*) AS n FROM rate_buckets WHERE key LIKE 'duels:%'");
  assert.ok(bucket.n >= 1, 'the limiter wrote its counter to the shared database');
});
