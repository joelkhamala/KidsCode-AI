# KidsCode — Multi-Hat Audit & Hardening Report

This document records a coordinated review of KidsCode by six role-specialised agents
(the "hats") derived from the SDLC diagram supplied with the request, followed by the
implementation work selected by the project owner.

- **Date:** 2026-11-26
- **Scope:** `backend/`, `frontend-react/`, `render.yaml`
- **Baseline:** 34/34 tests passing; 9,696 offline activities verified; all adult lessons passing.

---

## 1. The hats

| Hat | Skills assigned | Focus |
|---|---|---|
| Product Manager | Product strategy, RICE, OKRs, PRDs | Curriculum/feature fit, roadmap |
| UI/UX Designer | Child-centred design, WCAG 2.2 AA, i18n, design systems | Frontend usability, accessibility |
| Developer | Clean code, Node/React, API design, Jest | Bugs, refactors, testing gaps |
| Software Engineer | Architecture, scalability, CI/CD, observability | Infra, sandbox, deployment |
| Security Engineer | AppSec, OWASP, threat modelling, child privacy | Auth, data exposure, sandbox |
| Growth Marketer | Growth loops, PLG, retention, analytics | Acquisition, activation, instrumentation |

All six ran in parallel against the same repository, with read-only scopes.

---

## 2. Converged findings (flagged by 2+ hats)

| # | Severity | Issue | Evidence |
|---|---|---|---|
| 1 | **P0** | `/api/run-code` had no auth, no rate limit, unbounded queue | `server.js:2039` |
| 2 | **P0** | Self-registered teachers could enrol any child by email alone | `server.js:231-289`, `1115-1168` |
| 3 | **P0** | Child passwords derived from username (`username123`) and returned in plaintext | `server.js:503,563-567` |
| 4 | **P0** | Production CORS reflected every origin; session cookie `secure:false`; no security headers | `server.js:34-45` |
| 5 | **P0** | Java SecurityManager removed on JDK 24+ → unrestricted learner code | `sandbox/runJava.js:226-231` |
| 6 | **P1** | "Offline/low-bandwidth" promise broken by CDN assets; service worker cached 4 files | `public/index.html`, `service-worker.js` |
| 7 | **P1** | Kiswahili broke mid-learning (hardcoded quiz/lesson/nav copy) | `Quiz.js`, `Lesson.js`, `Navbar.js` |
| 8 | **P1** | Quiz XP farming via client-controlled `percentage` with repeat awards | `server.js:1453-1523` |
| 9 | **P1** | No product analytics; no guest path; children needed email to start | throughout |
| 10 | **P1** | Seeded demo child with password `password123` in every fresh DB | `database.js:438-468` |
| 11 | **P1** | Unreachable cross-module progression gate (returned before check) | `server.js:1262,1283` |
| 12 | **P2** | No indexes on hot paths; `npm install` + `CI=false` in build | `render.yaml`, `database.js` |

---

## 3. Implemented: P0 security hardening

### 3.1 Backend (`backend/server.js`, `backend/database.js`, `render.yaml`)

| Fix | Implementation |
|---|---|
| Rate limiting | Dependency-free in-memory limiter with per-prefix buckets (global/auth/run/ai/analytics). Active in production only; dev/tests unthrottled. Memory reclaimed every 60s. |
| CORS | Fails closed in production (`origin: false` unless `CORS_ORIGINS` set). Dev remains open. |
| Security headers | `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Cross-Origin-Opener-Policy`; `x-powered-by` disabled; `Cache-Control: no-store` on all `/api` responses. |
| Cookies | `secure` in production, `httpOnly`, `sameSite: 'strict'`. `trust proxy: 1` keeps `req.ip` correct behind Render's TLS proxy so limits are per client. |
| Password strength | bcrypt cost raised 10 → 12 for new hashes. |
| Child login | Restricted to `account_type = 'child'`; parents/teachers/adults use their own endpoints. |
| Child credentials | Random `crypto.randomBytes(6).toString('base64url')` instead of `username123`; parent still receives the one-time credential to hand to the child. |
| Teacher enrolment | Requires a parent-generated HMAC consent code from `GET /api/parent/children/:id/enrollment-code`. Email alone is no longer sufficient. |
| Teacher registration | `TEACHER_EMAIL_DOMAINS` allow-list; self-registration disabled in production unless configured (fail closed). |
| Java sandbox | JDK 24+ now fails closed with a clear message instead of running unrestricted. |
| Quiz XP | Client values clamped to safe ranges; XP awarded at most once per module. |
| Progression gate | Previous module resolved by `order_num` and checked *before* the first-lesson return. |
| Leaderboard | Requires auth and exposes only child usernames/XP/streaks. |
| Seeded account | Removed entirely from fresh databases. |
| Indexes | Added `idx_users_xp`, `idx_progress_user_lesson`, `idx_analytics_ts`. |
| Deployment | `npm ci` instead of `npm install`; `CI=false` removed; `CORS_ORIGINS` and `TEACHER_EMAIL_DOMAINS` documented in `render.yaml`. |

### 3.2 Regression tests (`backend/tests/security.test.js`)

Seven new tests cover: no seeded accounts, child-login rejection of parent accounts,
non-derivable child passwords, teacher-enrolment consent, single quiz XP award,
analytics property sanitisation, and analytics bounds. `npm test` now runs **41 tests**.

---

## 4. Implemented: P1 UI + localisation

Delegated to a frontend specialist with strict file ownership (no backend/analytics overlap):

- Translated hardcoded quiz, lesson, navbar, and auth copy into `src/i18n.js` + translation files (en/sw).
- Honest error states: quiz failures no longer render success; completion-fetch errors show retry instead of a false "complete all lessons" lock.
- Accessibility: skip link, dynamic `document.documentElement.lang`/`dir`, restored `:focus-visible` rings, global reduced-motion rule, responsive canvas.
- Parent/teacher mobile navigation extended below 768px.
- Coach Chat: Escape/focus trap/return focus, role labels, distinct retry state.

---

## 5. Implemented: Growth + analytics foundation

- `frontend-react/src/services/analytics.js` — privacy-safe batching (20 events / 15s), property denylist, 120-char caps, `keepalive`, flush on visibility/unload. Never imports `api.js` (no cycle).
- `api.js` interceptor emits `first_code_run_success`, `lesson_completed`, `quiz_passed`, `coach_activity_completed`, `friend_added`, `project_shared`, `cheer_sent` — IDs/metrics only.
- `App.js`, `index.js`, `AICoach.js`, `Dashboard.js`, `Playground.js`, `Social.js` instrumented for session/page-view/role/language events.
- `POST /api/analytics/events` stores pseudonymous metadata in a new `analytics_events` table with server-side property scrubbing.
- Guest path: `/try` renders the Playground without authentication; code runs (already public) and progress saves locally until the child registers. The Auth screen features it in a translated gradient card directly under the logo (icon, “Play first” badge, value text, primary button, full-width on small screens). The obsolete `test@example.com / password123` hint was removed because seeded demo accounts no longer exist.

---

## 6. Implemented: adult friends & study circle

Adult learners now have a complete, adult-only social layer at `/adult/friends`. It is deliberately separate from the child social module (`/api/social`), which stays child-safe with no free-text chat.

**Backend** — `backend/adult-friends.js`, mounted at `/api/adult/friends` *after* the adult-only guard in `backend/adult.js`:

- discover/search (name, occupation, goal, exact email), with privacy and block filters
- friend requests with a short note, auto-accept on mutual requests, accept/decline/cancel, history
- mutual friends list and profiles derived from real lesson, assessment, certificate and study-time records
- study feed, friend leaderboard (lessons / hours / score / streak, all-time or week)
- direct messages between friends only, conversations, unread tracking, read receipts, per-side deletion
- cheers (five whitelisted kinds), weekly goals + check-ins, notifications
- privacy controls (discoverability, progress, activity, messages), block/unblock, report with optional block
- production-only per-action rate limits; dev/tests are never throttled
- no email, phone, password or account-type data is returned in social payloads

**Data** — dedicated `adult_*` tables and indexes in `backend/database.js`. Adult social rows can never appear in child queries, and child tokens cannot reach adult routes (403).

**Frontend** — `frontend-react/src/pages/AdultFriends.js`, `adultSocialAPI` in `api.js` (uses `adultHttp`/`adult_token`, never the child client), `/adult/friends` protected route, navbar link with live unread badge, dashboard shortcut, and full English/Kiswahili strings in `translations/adult.js`. The navbar now collapses to icon-only links on tablet widths to prevent horizontal overflow.

**Tests** — `backend/tests/adult-friends.test.js` covers cross-role rejection, PII exposure, request lifecycle, mutual friends, privacy, activity derivation, messages/unread/deletion, blocking and reporting. Registered in `backend/package.json`.

---

## 7. Verification

| Check | Result |
|---|---|
| `npm test` (api + security + adult friends) | **47/47 passing** |
| `npm run verify:content` | 9,696 activities, 20 solutions executed, **0 problems** |
| `npm run verify:courses` | **all adult lessons pass** |
| `node --check` on changed backend files | clean |
| Frontend production build (`npm run build`) | **succeeds**; only pre-existing ESLint warnings remain (AuthContext, RestrictionsContext, ProgressDebug) |
| Browser QA: adult login → friends search → request → accept → feed → messages → privacy save | **passes** in English and Kiswahili; no console errors |
| Browser QA: 800px viewport | no horizontal overflow; icon-only tablet nav |
| Responsive navbar fix | adult/child navbars rebalanced: icon-only centre links below `xl`, profile/brand metadata below `lg`, child XP/streak below `xl`, mobile strip until `lg`, `shrink-0` brand. Verified at 800px with no overflow and full-width logo |
| Browser QA: compose a new message | ✅ "New message" picker filters accepted friends, opens the thread, sends a message and refreshes the conversation list; outgoing preview arrow corrected; English and Kiswahili verified |

---

## 8. Remaining (not implemented — deliberately out of scope)

These were identified by the hats but require larger architectural work or external decisions:

1. **SQLite → managed Postgres + Redis** for horizontal scale and shared rate limits.
2. **Dedicated OS-isolated runner container** (no DB mount, read-only FS, cgroup limits, network deny) for Java/Python/SQL.
3. **CDN asset bundling + real service-worker caching** for the offline promise.
4. **Server-side locale support** for curriculum and native-speaker Kiswahili review.
5. **Analytics dashboards** (activation, D1/D7/D30 retention, K-factor, localisation parity) — events are now collected, but no explorer exists yet.
6. **Automated DB backups / restore drills** on Render.
