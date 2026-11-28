# Coding Arena

The Coding Arena is the child-only, server-authoritative coding duel feature at `/arena`.
It is separate from the older multiple-choice social duel under `/api/social/duels`.

## Play flow

1. A child picks one of four modes and a difficulty, then queues for a quick 1v1 duel.
2. The server matches two children by mode, difficulty and Elo-style rating.
3. Both players receive the same challenge. Hidden tests, answer keys, timers and
   scoring stay on the server.
4. Each player submits code or quiz answers. The server runs code through the
   existing `runJavaScript` worker sandbox, scores it, and finalizes the match once
   both players have submitted, one player forfeits, or time expires.
5. XP, coins, gems, rating and badges are written once per player per match.

Private friend duels follow the same flow. The inviter picks an accepted friend in
the Arena, the invitee sees it in their Arena inbox, and accepting starts the clock
for both players. Declining or ignoring an invite pays nobody. Winning a friend duel
unlocks the `Team Player` badge. The AI-referee and tournament badges are shown as
"Coming soon"; those features are not part of this release.

Modes:

| Mode | What the child does |
| --- | --- |
| Code Race | Implements a function that passes visible and hidden tests. |
| Bug Busters | Repairs a broken program. |
| Code Maze | Moves a robot through a grid with `forward`, `left` and `right`. |
| Code Quiz | Answers five multiple-choice questions; answers are never sent to the browser. |

## API

All routes are mounted under `/api/duels` and require the existing child JWT.
Adult and guest accounts receive `403` / `401`. Errors use
`{ "error": string, "code"?: string }`.

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/modes` | Modes, difficulties, ranks and badge metadata. |
| `POST` | `/queue` | Join or create a quick match. `201`-style creation is returned as `202`; joining an active match returns `200`. |
| `GET` | `/history` | Last 30 matches for the signed-in child. |
| `GET` | `/leaderboard?period=all\|week\|month` | Rating or duel-XP leaderboard. |
| `GET` | `/profile` | Rating, record, rank and arena badges. |
| `POST` | `/invites` | Invite an accepted friend to a private duel. |
| `GET` | `/invites` | Pending invitations for the signed-in child. |
| `POST` | `/:id/accept` | Accept a private duel invitation. |
| `POST` | `/:id/decline` | Decline a private duel invitation. |
| `GET` | `/:id` | Current server-authoritative match view. |
| `GET` | `/:id/challenge` | Public challenge after the match is active. |
| `POST` | `/:id/heartbeat` | Marks the child as connected. |
| `POST` | `/:id/submit` | Submits code or quiz answers. |
| `POST` | `/:id/leave` | Withdraws or forfeits. |
| `GET` | `/:id/events` | Server-sent events; the JWT is sent in an `Authorization` header. |

The browser uses short polling as a fallback when SSE is blocked by a proxy.

## Data model

Created in `backend/database.js`:

| Table | Purpose |
| --- | --- |
| `duel_matches` | Mode, difficulty, format, status, challenge JSON, timestamps, winner. |
| `duel_participants` | Per-player submission state, score, breakdown, connection and reward flag. |
| `duel_submissions` | Individual attempts; `UNIQUE(match_id, user_id, attempt)`. |
| `duel_ratings` | Rating, record, coins and gems per child. |
| `duel_payouts` | One row per player per match; `PRIMARY KEY(match_id, user_id)` prevents duplicate rewards. |

Private friend duels use the existing `friend` format and `waiting` status: the
invitee is added with `ready_at = NULL` until they accept. Quick matchmaking only
selects `format = 'quick'` matches.

## Scoring and rewards

For code tasks, the server appends a nonce-tagged harness to the learner's code and
runs it with a 2-second worker-thread sandbox timeout. Visible and hidden test
results are combined as:

```text
correctness = round(passed_visible / total_visible * correctness_weight)
hidden      = round(passed_hidden / total_hidden * 15)
speed       = max(0, round(10 - 10 * min(elapsed, limit) / limit))
attempts    = max(0, 5 - 2 * (attempt - 1))
total       = min(100, correctness + hidden + speed + attempts)
```

`correctness_weight` is 70 for code modes and 85 for quiz and maze modes. Quiz
answers and all hidden tests are kept server-side.

A winner is decided by score, forfeit or timeout. Winner and loser payouts are:

```text
xp    = round(score / 10) + (won ? 20 : 0)
coins = round(score / 20) + (won ? 10 : 0)
gems  = won ? 5 : 1
rating delta = round(32 * (actual - 1 / (1 + 10 ^ ((opponentRating - rating) / 400))))
```

`actual` is 1 for a win, 0.5 for a tie and 0 for a loss. `duel_payouts` and the
user/rating updates are applied in one `BEGIN IMMEDIATE` transaction.

## Security and privacy

- Child JWTs are kept in an HttpOnly, SameSite=Strict cookie; child-only middleware
  guards every arena route and cross-origin writes require an approved `Origin`.
- Private duels require an accepted friendship from `social.js`; this also respects
  the parent-controlled `friends_enabled` setting on both accounts.
- Only display names or usernames are exposed to opponents. No email, phone, age or
  free-text chat is part of the arena.
- SQL parameters are used for all values. Code execution stays in the existing
  sandbox worker, with code length, output and runtime limits.
- SSE is read with `fetch()` and the auth cookie; credentials are never placed in a URL.

## Multi-instance behaviour

Match state, SSE events and rate-limit counters all live in SQLite, so backend
instances pointing at the same database file share matchmaking, event delivery and
throttling. Duplicate sweeper runs are safe because finalization is guarded by
status checks and the `duel_payouts` primary key. SQLite on a shared network
filesystem is not a safe multi-writer store; horizontal scaling across hosts still
requires a database service designed for concurrent writers.

## Verification

From `backend/`:

```powershell
npm.cmd test                 # all suites, including tests/duel.test.js
node --test tests/duel.test.js
```

From `frontend-react/`:

```powershell
npm.cmd run build
```

Backend: 66 tests pass, including arena tests for quick and private friend matches,
hidden tests, all four modes, quiz answer secrecy, duplicate queue, forfeit,
invitation authorization, Team Player, rewards, history, leaderboards and SSE events.

Browser smoke tests covered:

- Phase 1: two children queued, edited and ran code, submitted both answers, and saw
  the result, XP/rating/history updates with a clean console.
- Private friend duels: an inviter sent an invite from the Arena, the invitee accepted
  it from their Arena inbox, the inviter saw the active challenge, both submitted,
  the winner saw rewards, `Team Player` showed as unlocked, and Rematch created a
  new friend invite with the same opponent. The console stayed clean.
