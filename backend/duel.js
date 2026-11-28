'use strict';
/**
 * Coding Arena - server-authoritative coding duels for child learners.
 *
 * The browser never sends a score, a timer value or an answer key. Challenges,
 * hidden tests, deadlines and scoring all live here; the only client input is
 * code or an answer index. Rewards are guarded by a UNIQUE(match_id, user_id)
 * payout row and applied inside the same transaction as the final result.
 */
const express = require('express');
const crypto = require('crypto');
const { getDb } = require('./database');
const { runJavaScript } = require('./sandbox/runJs');
const { noteCoding } = require('./achievements');
const { friendIds } = require('./social');

const all = (sql, p = []) => new Promise((res, rej) => getDb().all(sql, p, (e, r) => (e ? rej(e) : res(r || []))));
const get = (sql, p = []) => new Promise((res, rej) => getDb().get(sql, p, (e, r) => (e ? rej(e) : res(r))));
const run = (sql, p = []) => new Promise((res, rej) => getDb().run(sql, p, function done(e) { if (e) rej(e); else res(this); }));
const fail = (status, message, code) => Object.assign(new Error(message), { status, code });
const clampCode = (v) => (typeof v === 'string' ? v.slice(0, 4000) : '');

const MODES = {
  code_race: { name: 'Code Race', icon: '🏁', blurb: 'Solve the same coding puzzle first.' },
  bug_busters: { name: 'Bug Busters', icon: '🐞', blurb: 'Find and fix the broken program.' },
  code_maze: { name: 'Code Maze', icon: '🤖', blurb: 'Guide your robot to the treasure.' },
  code_quiz: { name: 'Code Quiz', icon: '🧠', blurb: 'Answer coding questions head to head.' },
};
const DURATIONS = { easy: 180, medium: 240, hard: 300 };
const MAX_ATTEMPTS = 3;
const QUEUE_WINDOW_MINUTES = 2;
const INVITE_WINDOW_MINUTES = 10;
const RATING_K = 32;
const RANKS = [
  [1550, 'Code Legend'], [1400, 'Code Master'], [1300, 'Code Wizard'],
  [1200, 'Code Ninja'], [1100, 'Code Apprentice'], [1000, 'Code Explorer'],
];
const rankOf = (rating) => (RANKS.find(([min]) => rating >= min) || [0, 'Code Rookie'])[1];

const BADGES = [
  [101, 'First Victory', 'Win your first Coding Arena duel.', '🏆', 40],
  [102, 'Bug Hunter', 'Win a Bug Busters duel.', '🐞', 40],
  [103, 'Speed Coder', 'Score 80+ in under 30 seconds.', '⚡', 50],
  [104, 'Logic Master', 'Score 90+ in a Code Quiz.', '🧠', 50],
  [105, 'Creative Genius', 'Coming soon - creative duels with an AI referee.', '🎨', 60],
  [106, 'Perfect Programmer', 'Score 100 in any duel.', '💯', 60],
  [107, 'Comeback Champion', 'Win after a weak first attempt.', '🔥', 50],
  [108, 'Team Player', 'Win a duel against a friend.', '🤝', 40],
  [109, 'Consistency King', 'Play 5 duels and win 3.', '👑', 70],
  [110, 'Tournament Champion', 'Coming soon - knockout tournaments.', '🥇', 100],
  [111, 'Master Debugger', 'Score 90+ in Bug Busters.', '🔧', 60],
];

let badgesReady;
function ensureBadges() {
  if (!badgesReady) {
    badgesReady = (async () => {
      for (const [id, name, description, icon, xp] of BADGES) {
        await run(
          `INSERT INTO achievements (id, name, description, icon, xp_reward, \`condition\`) VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET description = excluded.description`,
          [id, name, description, icon, xp, `duel:${id}`],
        );
      }
    })();
  }
  return badgesReady;
}

// ---------------------------------------------------------------------------
// Challenges. Tests, answers and the result nonce are server-only; the browser
// receives only `publicChallenge()`.
// ---------------------------------------------------------------------------

const CODE_TASKS = {
  code_race: {
    easy: [
      {
        title: 'Add them up!',
        instructions: 'Finish solve(numbers) so it returns the sum of every number in the array. An empty array returns 0.',
        starter: 'function solve(numbers) {\n  // Add all the numbers together\n  return 0;\n}',
        visible: [{ args: [[1, 2, 3]], expected: 6 }],
        hidden: [{ args: [[4, 5]], expected: 9 }, { args: [[]], expected: 0 }, { args: [[10, -2, 1]], expected: 9 }],
        hints: ['Start with a total of 0.', 'Use a for loop to visit each number.'],
      },
      {
        title: 'Double it!',
        instructions: 'Finish solve(n) so it returns twice the number it receives.',
        starter: 'function solve(n) {\n  return n;\n}',
        visible: [{ args: [4], expected: 8 }],
        hidden: [{ args: [0], expected: 0 }, { args: [-3], expected: -6 }, { args: [11], expected: 22 }],
        hints: ['Multiplication is your friend.', 'Return n * 2.'],
      },
    ],
    medium: [
      {
        title: 'Find the biggest',
        instructions: 'Finish solve(numbers) so it returns the largest number. The array always has at least one value.',
        starter: 'function solve(numbers) {\n  return 0;\n}',
        visible: [{ args: [[1, 7, 3]], expected: 7 }],
        hidden: [{ args: [[-4, -1, -9]], expected: -1 }, { args: [[5]], expected: 5 }, { args: [[2, 12, 4, 8]], expected: 12 }],
        hints: ['Keep track of the best value you have seen.', 'Compare each value with your current best.'],
      },
      {
        title: 'Count the vowels',
        instructions: 'Finish solve(text) so it returns how many vowels (a, e, i, o, u) are in the text. Ignore capital letters.',
        starter: 'function solve(text) {\n  return 0;\n}',
        visible: [{ args: ['hello'], expected: 2 }],
        hidden: [{ args: ['Kiswahili'], expected: 4 }, { args: ['xyz'], expected: 0 }, { args: ['AEIOU'], expected: 5 }],
        hints: ['Make the text lowercase first.', 'Check every character against "aeiou".'],
      },
    ],
    hard: [
      {
        title: 'Factorial fun',
        instructions: 'Finish solve(n) so it returns n! (n multiplied by every smaller positive whole number). 0! is 1.',
        starter: 'function solve(n) {\n  return 1;\n}',
        visible: [{ args: [4], expected: 24 }],
        hidden: [{ args: [0], expected: 1 }, { args: [1], expected: 1 }, { args: [6], expected: 720 }],
        hints: ['Multiply as you count down.', 'A loop from 2 to n works well.'],
      },
      {
        title: 'Reverse it',
        instructions: 'Finish solve(text) so it returns the text backwards.',
        starter: 'function solve(text) {\n  return text;\n}',
        visible: [{ args: ['code'], expected: 'edoc' }],
        hidden: [{ args: ['kids'], expected: 'sdik' }, { args: ['a'], expected: 'a' }, { args: ['star!'], expected: '!rats' }],
        hints: ['split() turns a string into an array.', 'Try reverse().join("").'],
      },
    ],
  },
  bug_busters: {
    easy: [
      {
        title: 'The greedy robot',
        instructions: 'solve(n) should return n + 1, but a typo makes it return n - 1. Repair the program.',
        starter: 'function solve(n) {\n  return n - 1;\n}',
        visible: [{ args: [4], expected: 5 }],
        hidden: [{ args: [0], expected: 1 }, { args: [-2], expected: -1 }, { args: [10], expected: 11 }],
        hints: ['Read the instructions and the code side by side.', 'Which operator is wrong?'],
      },
      {
        title: 'Shout, not whisper',
        instructions: 'solve(text) should return the text in CAPITALS. Fix the broken method call.',
        starter: 'function solve(text) {\n  return text.lowercase();\n}',
        visible: [{ args: ['hello'], expected: 'HELLO' }],
        hidden: [{ args: ['kidscode'], expected: 'KIDSCODE' }, { args: ['Ok'], expected: 'OK' }, { args: [''], expected: '' }],
        hints: ['JavaScript has a built-in method for capitals.', 'Check the spelling carefully.'],
      },
    ],
    medium: [
      {
        title: 'Even or odd',
        instructions: 'solve(n) should return "even" for even numbers and "odd" for odd numbers. Both branches currently say "even".',
        starter: 'function solve(n) {\n  if (n % 2 === 0) {\n    return "even";\n  }\n  return "even";\n}',
        visible: [{ args: [4], expected: 'even' }],
        hidden: [{ args: [7], expected: 'odd' }, { args: [0], expected: 'even' }, { args: [11], expected: 'odd' }],
        hints: ['Only one branch is wrong.', 'What should the final return say?'],
      },
      {
        title: 'Safe subtraction',
        instructions: 'solve(a, b) should always return a positive result: the larger number minus the smaller one. Fix the order.',
        starter: 'function solve(a, b) {\n  return a - b;\n}',
        visible: [{ args: [9, 3], expected: 6 }],
        hidden: [{ args: [3, 9], expected: 6 }, { args: [5, 5], expected: 0 }, { args: [10, 20], expected: 10 }],
        hints: ['Use Math.max and Math.min.', 'Subtraction order matters.'],
      },
    ],
    hard: [
      {
        title: 'Broken countdown',
        instructions: 'solve(n) should return an array counting down from n to 1 (e.g. 3 → [3,2,1]). It currently counts up and includes 0.',
        starter: 'function solve(n) {\n  const out = [];\n  for (let i = 0; i <= n; i++) out.push(i);\n  return out;\n}',
        visible: [{ args: [3], expected: [3, 2, 1] }],
        hidden: [{ args: [1], expected: [1] }, { args: [5], expected: [5, 4, 3, 2, 1] }, { args: [0], expected: [] }],
        hints: ['Start at n and stop before 0.', 'Change the loop condition and step.'],
      },
    ],
  },
};

const MAZES = {
  easy: ['S..G.', '.....', '.....', '.....', '.....'],
  medium: ['S..#.', '##.#.', '.....', '.###.', '....G'],
  hard: ['S#...', '.#.#.', '...#.', '##.#.', '....G'],
};

const QUIZ = {
  easy: [
    { id: 'q1', prompt: 'What does console.log("Hi") do?', options: ['Stores a variable', 'Prints Hi', 'Deletes code', 'Makes a loop'], answer: 1 },
    { id: 'q2', prompt: 'Which keyword declares a variable that cannot be reassigned?', options: ['var', 'let', 'const', 'change'], answer: 2 },
    { id: 'q3', prompt: 'What is 2 + 3?', options: ['5', '6', '23', '1'], answer: 0 },
    { id: 'q4', prompt: 'Which symbol starts a comment in JavaScript?', options: ['#', '//', '**', '<?'], answer: 1 },
    { id: 'q5', prompt: 'What does an array hold?', options: ['Only numbers', 'A list of values', 'One word', 'Nothing'], answer: 1 },
  ],
  medium: [
    { id: 'q1', prompt: 'What does arr.length tell you?', options: ['The last value', 'The number of items', 'The first index', 'The array name'], answer: 1 },
    { id: 'q2', prompt: 'Which loop runs a known number of times?', options: ['while', 'for', 'if', 'switch'], answer: 1 },
    { id: 'q3', prompt: 'What does === check?', options: ['Value only', 'Type only', 'Value and type', 'Nothing'], answer: 2 },
    { id: 'q4', prompt: 'What is the index of the first item in an array?', options: ['0', '1', '-1', 'first'], answer: 0 },
    { id: 'q5', prompt: 'Which method adds an item to the end of an array?', options: ['pop()', 'push()', 'shift()', 'join()'], answer: 1 },
  ],
  hard: [
    { id: 'q1', prompt: 'What does a function return when it has no return statement?', options: ['0', 'null', 'undefined', 'false'], answer: 2 },
    { id: 'q2', prompt: 'Which structure repeats code while a condition stays true?', options: ['if', 'while', 'function', 'array'], answer: 1 },
    { id: 'q3', prompt: 'What does map() do to an array?', options: ['Deletes it', 'Builds a new array from each item', 'Sorts it', 'Empties it'], answer: 1 },
    { id: 'q4', prompt: 'Which operator checks that two values are NOT equal (with type)?', options: ['!=', '!==', '<>', 'not'], answer: 1 },
    { id: 'q5', prompt: 'What is a good use for a function?', options: ['Repeat logic', 'Store a picture', 'Close the browser', 'Make a variable slower'], answer: 0 },
  ],
};

function buildChallenge(mode, difficulty, seed) {
  if (mode === 'code_quiz') {
    return { mode, difficulty, timeLimitSeconds: DURATIONS[difficulty], questions: JSON.parse(JSON.stringify(QUIZ[difficulty])) };
  }
  if (mode === 'code_maze') {
    const grid = MAZES[difficulty];
    const title = { easy: 'Treasure on the straight!', medium: 'Turn to the treasure', hard: 'Windy robot trail' }[difficulty];
    return {
      mode, difficulty, timeLimitSeconds: DURATIONS[difficulty], title, grid,
      instructions: 'Use forward(steps), left(90) and right(90) to move the robot from S to G. You cannot cross walls (#).',
      starterCode: '// Guide the robot to the treasure\nforward(1);',
      hints: ['Find the route with your finger first.', 'Turn with right(90) or left(90), then go forward again.'],
    };
  }
  const pool = CODE_TASKS[mode][difficulty];
  const task = pool[seed % pool.length];
  return {
    mode, difficulty, timeLimitSeconds: DURATIONS[difficulty], seed,
    title: task.title, instructions: task.instructions, starterCode: task.starter, hints: task.hints,
    visible: task.visible, hidden: task.hidden,
    nonce: crypto.randomBytes(12).toString('hex'),
  };
}

function publicChallenge(c) {
  const base = {
    mode: c.mode, difficulty: c.difficulty, timeLimitSeconds: c.timeLimitSeconds,
    title: c.title || 'Programming puzzle', instructions: c.instructions,
  };
  if (c.mode === 'code_quiz') {
    return {
      ...base,
      questions: c.questions.map((q) => ({ id: q.id, prompt: q.prompt, options: q.options })),
    };
  }
  return {
    ...base,
    starterCode: c.starterCode,
    hints: c.hints || [],
    examples: (c.visible || []).map((t) => ({ input: t.args, output: t.expected })),
    grid: c.grid || null,
  };
}

/** Grading harness run AFTER learner code at sandbox top level, using frozen helpers. */
function harnessFor(c) {
  if (c.mode === 'code_maze') {
    return [
      '\nconst __grid = ' + JSON.stringify(c.grid) + ';',
      'let __r = -1, __c = -1, __dir = 0;',
      'for (let r = 0; r < __grid.length; r++) for (let c = 0; c < __grid[r].length; c++) if (__grid[r][c] === "S") { __r = r; __c = c; }',
      'let __ok = __r >= 0 && __c >= 0;',
      'for (const __cmd of __turtle) {',
      '  if (!__ok) break;',
      '  if (__cmd.type === "right" && __cmd.angle === 90) __dir = (__dir + 1) % 4;',
      '  else if (__cmd.type === "left" && __cmd.angle === 90) __dir = (__dir + 3) % 4;',
      '  else if (__cmd.type === "forward") {',
      '    const __d = Math.floor(__cmd.dist);',
      '    for (let __i = 0; __i < __d && __ok; __i++) {',
      '      const __nr = __r + (__dir === 1 ? 1 : __dir === 3 ? -1 : 0);',
      '      const __nc = __c + (__dir === 0 ? 1 : __dir === 2 ? -1 : 0);',
      '      if (__nr < 0 || __nc < 0 || __nr >= __grid.length || __nc >= __grid[__nr].length || __grid[__nr][__nc] === "#") __ok = false;',
      '      else { __r = __nr; __c = __nc; }',
      '    }',
      '  } else __ok = false;',
      '}',
      'console.log("DUELRESULT_' + c.nonce + ':" + globalThis.__safeStringify(__ok && __grid[__r][__c] === "G"));',
    ].join('\n');
  }
  const cases = JSON.stringify([...c.visible, ...c.hidden]);
  return [
    '\nconst __cases = ' + cases + ';',
    'const __marks = [];',
    'for (let __i = 0; __i < __cases.length; __i++) {',
    '  try {',
    '    const __got = globalThis.__duelSolve(...__cases[__i].args);',
    '    __marks[__marks.length] = globalThis.__safeStringify(__got) === globalThis.__safeStringify(__cases[__i].expected);',
    '  } catch (__e) { __marks[__marks.length] = false; }',
    '}',
    'console.log("DUELRESULT_' + c.nonce + ':" + globalThis.__safeStringify(__marks));',
  ].join('\n');
}

async function markCode(c, code) {
  const harness = harnessFor(c);
  if (code.length + harness.length > 5000) throw fail(422, 'This program is too long for the arena (4000 characters max).', 'code_too_long');
  const result = await runJavaScript(code, { timeoutMs: 2000, maxOutputLines: 20, harness });
  const prefix = 'DUELRESULT_' + c.nonce + ':';
  const line = (result.output || []).find((l) => typeof l === 'string' && l.startsWith(prefix));
  let marks;
  try { marks = JSON.parse(line.slice(prefix.length)); } catch { marks = null; }
  // Graded output and error messages are never returned: learner code runs with
  // hidden test values and must not be able to print or throw them back to the client.
  const safeError = result.error ? result.error.name : null;
  if (c.mode === 'code_maze') {
    const visible = [marks === true];
    return {
      error: safeError, output: [],
      visible, hidden: [], correctCount: visible[0] ? 1 : 0, total: 1,
    };
  }
  const valid = Array.isArray(marks) && marks.length === c.visible.length + c.hidden.length && marks.every((m) => typeof m === 'boolean');
  const visible = valid ? marks.slice(0, c.visible.length) : c.visible.map(() => false);
  const hidden = valid ? marks.slice(c.visible.length) : c.hidden.map(() => false);
  return {
    error: safeError, output: [], visible, hidden,
    correctCount: [...visible, ...hidden].filter(Boolean).length,
    total: visible.length + hidden.length,
  };
}

function markQuiz(c, answers) {
  const correct = c.questions.map((q, i) => answers[i] === q.answer);
  return {
    error: null, output: [], visible: correct, hidden: [],
    correctCount: correct.filter(Boolean).length, total: correct.length,
  };
}

function scoreFor(c, verdict, elapsedSeconds, attempt) {
  const visibleTotal = verdict.visible.length || 1;
  const hiddenTotal = verdict.hidden.length || 1;
  const correctnessWeight = c.mode === 'code_quiz' || c.mode === 'code_maze' ? 85 : 70;
  const visibleScore = (verdict.visible.filter(Boolean).length / visibleTotal) * correctnessWeight;
  const hiddenScore = (verdict.hidden.filter(Boolean).length / hiddenTotal) * 15;
  const speed = Math.max(0, Math.round(10 - (10 * Math.min(elapsedSeconds, c.timeLimitSeconds)) / c.timeLimitSeconds));
  const efficiency = Math.max(0, 5 - (attempt - 1) * 2);
  const breakdown = {
    correctness: Math.round(visibleScore),
    hiddenTests: Math.round(hiddenScore),
    speed,
    attempts: efficiency,
  };
  breakdown.total = Math.min(100, Object.values(breakdown).reduce((a, b) => a + b, 0));
  return breakdown;
}

// ---------------------------------------------------------------------------
// Match state and results
// ---------------------------------------------------------------------------

// All arena writes share one DB connection. A promise chain keeps reads,
// transactions and finalization in order so two requests cannot open nested
// transactions or decide from a stale waiting/participant snapshot.
let mutationTail = Promise.resolve();
function withDuelLock(fn) {
  const next = mutationTail.then(fn, fn);
  mutationTail = next.catch(() => {});
  return next;
}

// SSE events are appended to SQLite so subscribers on any backend instance
// reading the same database receive the same stream.
function broadcast(matchId, event) {
  getDb().run(
    'INSERT INTO duel_events (match_id, payload_json, created_at) VALUES (?, ?, ?)',
    [Number(matchId), JSON.stringify(event), Date.now()],
    (err) => { if (err) console.error('Duel event write failed:', err.message); },
  );
}

async function participantsOf(matchId) {
  return all(
    `SELECT p.*, u.username, u.display_name FROM duel_participants p
     JOIN users u ON u.id = p.user_id WHERE p.match_id = ? ORDER BY p.joined_at, p.user_id`, [matchId],
  );
}

async function viewOf(m, userId) {
  const ps = await participantsOf(m.id);
  const mine = ps.find((p) => p.user_id === Number(userId));
  const other = ps.find((p) => p.user_id !== Number(userId));
  const c = JSON.parse(m.challenge_json);
  const winner = m.status === 'finished' ? Number(m.winner_id || 0) : null;
  const payout = mine ? await get('SELECT * FROM duel_payouts WHERE match_id = ? AND user_id = ?', [m.id, userId]) : null;
  const connected = (p) => !!p && !!p.last_seen_at && Date.now() - Date.parse(p.last_seen_at.replace(' ', 'T') + 'Z') < 25000;
  return {
    id: m.id, mode: m.mode, modeName: MODES[m.mode] ? MODES[m.mode].name : m.mode,
    difficulty: m.difficulty, format: m.format, status: m.status,
    createdAt: m.created_at, startsAt: m.starts_at, endsAt: m.ends_at, finishedAt: m.finished_at,
    serverNow: Date.now(), timeLimitSeconds: c.timeLimitSeconds,
    you: mine ? {
      score: mine.score || 0, attempts: mine.attempts || 0,
      submitted: !!mine.submitted_at, submittedAt: mine.submitted_at,
      breakdown: mine.breakdown_json ? JSON.parse(mine.breakdown_json) : null,
    } : null,
    opponent: other ? {
      id: other.user_id,
      name: other.display_name || other.username,
      submitted: !!other.submitted_at,
      score: m.status === 'finished' ? (other.score || 0) : null,
      connected: connected(other),
    } : null,
    result: m.status === 'finished' ? (winner === 0 ? 'tie' : winner === Number(userId) ? 'won' : 'lost') : null,
    payout: payout ? { xp: payout.xp, coins: payout.coins, gems: payout.gems, ratingDelta: payout.rating_delta } : null,
  };
}

function ratingOf(row) {
  return {
    rating: row ? row.rating : 1000, wins: row ? row.wins : 0, losses: row ? row.losses : 0,
    ties: row ? row.ties : 0, duels: row ? row.duels : 0, coins: row ? row.coins : 0, gems: row ? row.gems : 0,
  };
}

async function finalize(matchId, reason) {
  const m = await get('SELECT * FROM duel_matches WHERE id = ?', [matchId]);
  if (!m || m.status === 'finished' || m.status === 'cancelled') return null;
  const ps = await participantsOf(matchId);
  if (ps.length < 2) {
    await run("UPDATE duel_matches SET status = 'cancelled', end_reason = ?, finished_at = datetime('now') WHERE id = ?", [reason, matchId]);
    broadcast(matchId, { kind: 'finished', matchId, status: 'cancelled' });
    return null;
  }

  let winner = 0;
  if (reason === 'forfeit') {
    const quitter = m.end_reason === 'creator' ? ps[0].user_id : (ps.find((p) => p.left_at) || {}).user_id;
    winner = ps.find((p) => p.user_id !== quitter)?.user_id || 0;
  } else if (reason === 'timeout') {
    const submitted = ps.filter((p) => p.submitted_at);
    winner = submitted.length === 1 ? submitted[0].user_id : 0;
  } else if (reason !== 'tie' && reason !== 'complete') {
    winner = ps.find((p) => p.user_id === Number(reason))?.user_id || 0;
  } else {
    const [a, b] = ps;
    winner = (a.score || 0) === (b.score || 0) ? 0 : (a.score > b.score ? a.user_id : b.user_id);
  }

  await run('BEGIN IMMEDIATE');
  try {
    const updated = await run(
      `UPDATE duel_matches SET status = 'finished', winner_id = ?, end_reason = ?, finished_at = datetime('now')
       WHERE id = ? AND status NOT IN ('finished', 'cancelled')`,
      [winner || 0, reason, matchId],
    );
    if (!updated.changes) {
      await run('ROLLBACK').catch(() => {});
      return null;
    }
    for (const p of ps) {
      const played = !!p.submitted_at || p.user_id === winner;
      if (!played || p.rewarded_at) continue;
      const current = ratingOf(await get('SELECT * FROM duel_ratings WHERE user_id = ?', [p.user_id]));
      const opponent = ps.find((x) => x.user_id !== p.user_id);
      const oppRating = opponent ? ratingOf(await get('SELECT * FROM duel_ratings WHERE user_id = ?', [opponent.user_id])).rating : 1000;
      const actual = winner === 0 ? 0.5 : winner === p.user_id ? 1 : 0;
      const expected = 1 / (1 + Math.pow(10, (oppRating - current.rating) / 400));
      const delta = Math.round(RATING_K * (actual - expected));
      const score = p.score || 0;
      const won = winner === p.user_id;
      const xp = Math.round(score / 10) + (won ? 20 : 0);
      const coins = Math.round(score / 20) + (won ? 10 : 0);
      const gems = won ? 5 : 1;

      const inserted = await run(
        `INSERT OR IGNORE INTO duel_payouts (match_id, user_id, xp, coins, gems, rating_delta, breakdown_json)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [matchId, p.user_id, xp, coins, gems, delta, p.breakdown_json || null],
      );
      if (!inserted.changes) continue;

      await run('UPDATE users SET xp = xp + ? WHERE id = ?', [xp, p.user_id]);
      const next = {
        rating: current.rating + delta,
        wins: current.wins + (won ? 1 : 0),
        losses: current.losses + (!won && winner ? 1 : 0),
        ties: current.ties + (winner === 0 ? 1 : 0),
        duels: current.duels + 1,
        coins: current.coins + coins,
        gems: current.gems + gems,
      };
      const exists = await get('SELECT user_id FROM duel_ratings WHERE user_id = ?', [p.user_id]);
      if (exists) {
        await run(
          `UPDATE duel_ratings SET rating = ?, wins = ?, losses = ?, ties = ?, duels = ?, coins = ?, gems = ?, updated_at = datetime('now') WHERE user_id = ?`,
          [next.rating, next.wins, next.losses, next.ties, next.duels, next.coins, next.gems, p.user_id],
        );
      } else {
        await run(
          `INSERT INTO duel_ratings (user_id, rating, wins, losses, ties, duels, coins, gems) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [p.user_id, next.rating, next.wins, next.losses, next.ties, next.duels, next.coins, next.gems],
        );
      }

      const c = JSON.parse(m.challenge_json);
      const elapsed = Math.max(0, (Date.now() - Date.parse((m.starts_at || m.created_at).replace(' ', 'T') + 'Z')) / 1000);
      const earned = [];
      if (won) earned.push(101);
      if (won && m.format === 'friend') earned.push(108);
      if (won && c.mode === 'bug_busters') earned.push(102);
      if (score >= 80 && elapsed <= 30) earned.push(103);
      if (c.mode === 'code_quiz' && score >= 90) earned.push(104);
      if (score === 100) earned.push(106);
      if (won && score < 100) {
        const weak = await get('SELECT MIN(score) AS low FROM duel_submissions WHERE match_id = ? AND user_id = ?', [matchId, p.user_id]);
        if (weak && weak.low !== null && weak.low < 50) earned.push(107);
      }
      if (next.duels >= 5 && next.wins >= 3) earned.push(109);
      if (c.mode === 'bug_busters' && score >= 90) earned.push(111);
      let badgeXp = 0;
      for (const id of earned) {
        const b = await get('SELECT xp_reward FROM achievements WHERE id = ?', [id]);
        const added = await run('INSERT OR IGNORE INTO user_achievements (user_id, achievement_id) VALUES (?, ?)', [p.user_id, id]);
        if (added.changes) badgeXp += b ? (b.xp_reward || 0) : 0;
      }
      if (badgeXp) await run('UPDATE users SET xp = xp + ? WHERE id = ?', [badgeXp, p.user_id]);
    }
    await run('COMMIT');
  } catch (err) {
    await run('ROLLBACK').catch(() => {});
    throw err;
  }
  broadcast(matchId, { kind: 'finished', matchId, status: 'finished', winner });
  return get('SELECT * FROM duel_matches WHERE id = ?', [matchId]);
}

let sweepStarted = false;
async function sweep() {
  await run('DELETE FROM duel_events WHERE created_at < ?', [Date.now() - 60 * 60 * 1000]);
  const expired = await all("SELECT id FROM duel_matches WHERE status = 'active' AND ends_at IS NOT NULL AND ends_at <= datetime('now')");
  for (const m of expired) await finalize(m.id, 'timeout');
  const stale = await all(
    `SELECT id FROM duel_matches WHERE status = 'waiting' AND
      ((format = 'quick' AND created_at < datetime('now', ?)) OR
       (format = 'friend' AND created_at < datetime('now', ?)))`,
    [`-${QUEUE_WINDOW_MINUTES} minutes`, `-${INVITE_WINDOW_MINUTES} minutes`],
  );
  for (const m of stale) {
    const changed = await run(
      `UPDATE duel_matches SET status = 'cancelled', end_reason = 'no_opponent', finished_at = datetime('now')
       WHERE id = ? AND status = 'waiting'`, [m.id],
    );
    if (!changed.changes) continue;
    broadcast(m.id, { kind: 'finished', matchId: m.id, status: 'cancelled' });
  }
}
function startSweeper() {
  if (sweepStarted) return;
  sweepStarted = true;
  const timer = setInterval(
    () => withDuelLock(sweep).catch((e) => console.error('Duel sweep failed:', e.message)),
    5000,
  );
  timer.unref?.();
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

function createDuelRouter({ authenticateToken }) {
  const router = express.Router();
  router.use(authenticateToken, (req, res, next) => {
    if (req.user.accountType !== 'child') {
      return res.status(403).json({ error: 'Child account required', code: 'CHILD_ACCOUNT_REQUIRED' });
    }
    next();
  });

  const wrap = (fn) => async (req, res) => {
    try {
      await ensureBadges();
      await withDuelLock(() => fn(req, res));
    } catch (err) {
      if (!err.status) console.error('Coding Arena route error:', err.message);
      res.status(err.status || 500).json({ error: err.status ? err.message : 'Could not complete the duel. Please try again.', code: err.code });
    }
  };
  const myMatch = async (id, userId) => {
    const m = await get('SELECT * FROM duel_matches WHERE id = ?', [id]);
    if (!m) throw fail(404, 'Duel not found.', 'duel_not_found');
    const p = await get('SELECT * FROM duel_participants WHERE match_id = ? AND user_id = ?', [id, userId]);
    if (!p) throw fail(403, 'You are not in this duel.', 'not_participant');
    return { m, p };
  };
  const assertNoLiveMatch = async (userId, exceptId = 0) => {
    const current = await get(
      `SELECT m.id FROM duel_participants p JOIN duel_matches m ON m.id = p.match_id
       WHERE p.user_id = ? AND m.id != ? AND m.status IN ('waiting', 'active') ORDER BY m.id DESC LIMIT 1`, [userId, exceptId],
    );
    if (current) throw fail(409, 'Finish your current duel before starting another.', 'match_in_progress');
  };

  router.get('/modes', wrap(async (req, res) => {
    res.json({
      modes: Object.entries(MODES).map(([id, info]) => ({ id, ...info })),
      difficulties: Object.keys(DURATIONS).map((id) => ({ id, seconds: DURATIONS[id] })),
      ranks: RANKS.map(([min, name]) => ({ minRating: min, name })),
      achievements: BADGES.map(([id, name, description, icon]) => ({ id, name, description, icon })),
    });
  }));

  router.post('/invites', wrap(async (req, res) => {
    const friendId = Number(req.body?.friendId);
    const mode = req.body?.mode;
    const difficulty = req.body?.difficulty;
    if (!Number.isInteger(friendId) || friendId <= 0 || friendId === req.user.id) {
      throw fail(400, 'Choose a friend to invite.', 'invalid_invite');
    }
    if (!MODES[mode] || !DURATIONS[difficulty]) throw fail(400, 'Choose a valid game mode and difficulty.', 'invalid_invite');
    if (!(await friendIds(req.user.id)).includes(friendId)) throw fail(403, 'You can only invite accepted friends.', 'not_friend');
    await assertNoLiveMatch(req.user.id);
    await assertNoLiveMatch(friendId);

    let matchId;
    await run('BEGIN IMMEDIATE');
    try {
      if (!(await friendIds(req.user.id)).includes(friendId)) throw fail(403, 'You can only invite accepted friends.', 'not_friend');
      await assertNoLiveMatch(req.user.id);
      await assertNoLiveMatch(friendId);
      const seed = Math.floor(Math.random() * 1e9);
      const challenge = JSON.stringify(buildChallenge(mode, difficulty, seed));
      const inserted = await run(
        "INSERT INTO duel_matches (mode, difficulty, format, status, challenge_json, created_by) VALUES (?, ?, 'friend', 'waiting', ?, ?)",
        [mode, difficulty, challenge, req.user.id],
      );
      matchId = inserted.lastID;
      await run(
        "INSERT INTO duel_participants (match_id, user_id, ready_at, last_seen_at) VALUES (?, ?, datetime('now'), datetime('now'))",
        [matchId, req.user.id],
      );
      await run(
        'INSERT INTO duel_participants (match_id, user_id, ready_at, last_seen_at) VALUES (?, ?, NULL, NULL)',
        [matchId, friendId],
      );
      await run('COMMIT');
    } catch (err) {
      await run('ROLLBACK').catch(() => {});
      throw err;
    }
    broadcast(matchId, { kind: 'invited', matchId });
    const m = await get('SELECT * FROM duel_matches WHERE id = ?', [matchId]);
    res.status(202).json({ matchId, status: 'waiting', match: await viewOf(m, req.user.id) });
  }));

  router.get('/invites', wrap(async (req, res) => {
    const rows = await all(
      `SELECT m.id, m.mode, m.difficulty, m.created_at, u.id AS from_id, u.display_name, u.username
       FROM duel_matches m
       JOIN duel_participants p ON p.match_id = m.id AND p.user_id = ? AND p.ready_at IS NULL
       JOIN users u ON u.id = m.created_by
       WHERE m.status = 'waiting' AND m.format = 'friend' ORDER BY m.id DESC LIMIT 20`,
      [req.user.id],
    );
    res.json({
      invites: rows.map((r) => ({
        id: r.id, mode: r.mode, difficulty: r.difficulty, createdAt: r.created_at,
        from: { id: r.from_id, name: r.display_name || r.username },
      })),
    });
  }));

  router.post('/:id/accept', wrap(async (req, res) => {
    const id = Number(req.params.id);
    const { m, p } = await myMatch(id, req.user.id);
    if (m.format !== 'friend' || m.status !== 'waiting' || p.ready_at) {
      throw fail(409, 'This invitation is no longer available.', 'invite_unavailable');
    }
    if (!(await friendIds(req.user.id)).includes(Number(m.created_by))) {
      throw fail(403, 'You can only duel accepted friends.', 'not_friend');
    }
    await assertNoLiveMatch(req.user.id, id);
    await run('BEGIN IMMEDIATE');
    try {
      const ready = await run(
        "UPDATE duel_participants SET ready_at = datetime('now'), last_seen_at = datetime('now') WHERE match_id = ? AND user_id = ? AND ready_at IS NULL",
        [id, req.user.id],
      );
      if (!ready.changes) throw fail(409, 'This invitation was already answered.', 'invite_unavailable');
      await run(
        "UPDATE duel_matches SET status = 'active', starts_at = datetime('now'), ends_at = datetime('now', ?) WHERE id = ? AND status = 'waiting'",
        [`+${DURATIONS[m.difficulty]} seconds`, id],
      );
      await run('COMMIT');
    } catch (err) {
      await run('ROLLBACK').catch(() => {});
      throw err;
    }
    broadcast(id, { kind: 'joined', matchId: id, status: 'active' });
    res.json({ match: await viewOf(await get('SELECT * FROM duel_matches WHERE id = ?', [id]), req.user.id) });
  }));

  router.post('/:id/decline', wrap(async (req, res) => {
    const id = Number(req.params.id);
    const { m, p } = await myMatch(id, req.user.id);
    if (m.format !== 'friend' || m.status !== 'waiting' || p.ready_at) {
      throw fail(409, 'This invitation is no longer available.', 'invite_unavailable');
    }
    await run("UPDATE duel_matches SET status = 'cancelled', end_reason = 'declined', finished_at = datetime('now') WHERE id = ? AND status = 'waiting'", [id]);
    broadcast(id, { kind: 'finished', matchId: id, status: 'cancelled' });
    res.json({ status: 'cancelled' });
  }));

  router.post('/queue', wrap(async (req, res) => {
    const mode = req.body?.mode;
    const difficulty = req.body?.difficulty;
    if (!MODES[mode] || !DURATIONS[difficulty]) throw fail(400, 'Choose a valid game mode and difficulty.', 'invalid_queue');
    const me = req.user.id;
    await assertNoLiveMatch(me);
    const waiting = await get(
      `SELECT m.*, p.user_id AS other_id, COALESCE(r.rating, 1000) AS other_rating
       FROM duel_matches m
       JOIN duel_participants p ON p.match_id = m.id AND p.user_id != ?
       LEFT JOIN duel_ratings r ON r.user_id = p.user_id
       WHERE m.status = 'waiting' AND m.format = 'quick' AND m.mode = ? AND m.difficulty = ? AND m.created_by != ?
         AND m.created_at >= datetime('now', ?)
         AND (SELECT COUNT(*) FROM duel_participants x WHERE x.match_id = m.id) < 2
       ORDER BY ABS(COALESCE(r.rating, 1000) - COALESCE((SELECT rating FROM duel_ratings WHERE user_id = ?), 1000)) LIMIT 1`,
      [me, mode, difficulty, me, `-${QUEUE_WINDOW_MINUTES} minutes`, me],
    );

    let matchId;
    let status;
    await run('BEGIN IMMEDIATE');
    try {
      if (waiting) {
        matchId = waiting.id;
        const added = await run(
          'INSERT OR IGNORE INTO duel_participants (match_id, user_id, ready_at, last_seen_at) VALUES (?, ?, datetime(\'now\'), datetime(\'now\'))',
          [matchId, me],
        );
        if (!added.changes) throw fail(409, 'You are already in that duel.', 'already_queued');
        await run(
          "UPDATE duel_matches SET status = 'active', starts_at = datetime('now'), ends_at = datetime('now', ?) WHERE id = ? AND status = 'waiting'",
          [`+${DURATIONS[difficulty]} seconds`, matchId],
        );
        status = 'active';
      } else {
        const seed = Math.floor(Math.random() * 1e9);
        const challenge = JSON.stringify(buildChallenge(mode, difficulty, seed));
        const inserted = await run(
          "INSERT INTO duel_matches (mode, difficulty, format, status, challenge_json, created_by) VALUES (?, ?, 'quick', 'waiting', ?, ?)",
          [mode, difficulty, challenge, me],
        );
        matchId = inserted.lastID;
        await run(
          'INSERT INTO duel_participants (match_id, user_id, ready_at, last_seen_at) VALUES (?, ?, datetime(\'now\'), datetime(\'now\'))',
          [matchId, me],
        );
        status = 'waiting';
      }
      await run('COMMIT');
    } catch (err) {
      await run('ROLLBACK').catch(() => {});
      throw err;
    }
    const m = await get('SELECT * FROM duel_matches WHERE id = ?', [matchId]);
    broadcast(matchId, { kind: status === 'active' ? 'joined' : 'queued', matchId, status });
    res.status(status === 'active' ? 200 : 202).json({ matchId, status, match: await viewOf(m, me) });
  }));

  router.get('/history', wrap(async (req, res) => {
    const limit = Math.min(30, Math.max(1, parseInt(req.query.limit, 10) || 15));
    const rows = await all(
      `SELECT m.id, m.mode, m.difficulty, m.status, m.winner_id, m.finished_at, m.end_reason,
              p.score, p.attempts, pay.xp, pay.coins, pay.gems, pay.rating_delta,
              (SELECT u.display_name FROM duel_participants x JOIN users u ON u.id = x.user_id
               WHERE x.match_id = m.id AND x.user_id != p.user_id) AS opponent
       FROM duel_participants p
       JOIN duel_matches m ON m.id = p.match_id
       LEFT JOIN duel_payouts pay ON pay.match_id = m.id AND pay.user_id = p.user_id
       WHERE p.user_id = ? ORDER BY m.id DESC LIMIT ?`, [req.user.id, limit],
    );
    res.json({ history: rows.map((r) => ({
      ...r,
      result: mResult(r, req.user.id),
    })) });
  }));

  router.get('/leaderboard', wrap(async (req, res) => {
    const period = ['all', 'week', 'month'].includes(req.query.period) ? req.query.period : 'all';
    const rows = period === 'all'
      ? await all(
        `SELECT u.id, u.username, u.display_name, r.rating, r.wins, r.losses, r.ties, r.duels, 0 AS periodXp
         FROM duel_ratings r JOIN users u ON u.id = r.user_id
         WHERE u.account_type = 'child' ORDER BY r.rating DESC, r.wins DESC LIMIT 50`,
      )
      : await all(
        `SELECT u.id, u.username, u.display_name, r.rating, r.wins, r.losses, r.ties, r.duels, SUM(pay.xp) AS periodXp
         FROM duel_payouts pay JOIN duel_ratings r ON r.user_id = pay.user_id JOIN users u ON u.id = r.user_id
         WHERE u.account_type = 'child' AND pay.created_at >= datetime('now', ?)
         GROUP BY u.id ORDER BY periodXp DESC, r.rating DESC LIMIT 50`,
        [`-${period === 'week' ? 7 : 30} days`],
      );
    res.json({
      period,
      leaderboard: rows.map((r, i) => ({
        rank: i + 1, id: r.id, name: r.display_name || r.username, rating: r.rating,
        rankName: rankOf(r.rating), wins: r.wins, losses: r.losses, ties: r.ties, duels: r.duels, periodXp: r.periodXp,
      })),
    });
  }));

  router.get('/profile', wrap(async (req, res) => {
    const stats = ratingOf(await get('SELECT * FROM duel_ratings WHERE user_id = ?', [req.user.id]));
    const badges = await all(
      'SELECT a.id, a.name, a.icon, a.description, ua.unlocked_at FROM achievements a LEFT JOIN user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = ? WHERE a.id BETWEEN 101 AND 111 ORDER BY a.id',
      [req.user.id],
    );
    const better = await get('SELECT COUNT(*) AS n FROM duel_ratings WHERE rating > ?', [stats.rating]);
    res.json({
      ...stats, rankName: rankOf(stats.rating), globalRank: (better?.n || 0) + 1,
      achievements: badges.map((b) => ({ ...b, unlocked: !!b.unlocked_at })),
    });
  }));

  router.post('/:id/heartbeat', wrap(async (req, res) => {
    await myMatch(Number(req.params.id), req.user.id);
    await run("UPDATE duel_participants SET last_seen_at = datetime('now') WHERE match_id = ? AND user_id = ?", [Number(req.params.id), req.user.id]);
    res.json({ ok: true });
  }));

  router.get('/:id/challenge', wrap(async (req, res) => {
    const { m, p } = await myMatch(Number(req.params.id), req.user.id);
    if (m.status === 'waiting') throw fail(409, 'Waiting for an opponent to join.', 'waiting_for_opponent');
    if (m.status !== 'active') throw fail(409, 'This duel has already finished.', 'match_not_active');
    const c = JSON.parse(m.challenge_json);
    res.json({ challenge: publicChallenge(c), timeLimitSeconds: c.timeLimitSeconds });
    if (p.last_seen_at) await run("UPDATE duel_participants SET last_seen_at = datetime('now') WHERE match_id = ? AND user_id = ?", [m.id, req.user.id]);
  }));

  router.post('/:id/submit', wrap(async (req, res) => {
    const id = Number(req.params.id);
    const { m, p } = await myMatch(id, req.user.id);
    if (m.status !== 'active') throw fail(409, 'This duel is no longer accepting answers.', 'match_not_active');
    if (p.submitted_at) throw fail(409, 'You have already submitted your final answer.', 'already_submitted');
    if (p.attempts >= MAX_ATTEMPTS) throw fail(429, 'You have used all 3 attempts.', 'too_many_attempts');
    const endsAt = Date.parse(m.ends_at.replace(' ', 'T') + 'Z');
    const startsAt = Date.parse(m.starts_at.replace(' ', 'T') + 'Z');
    if (Date.now() > endsAt) {
      await finalize(id, 'timeout');
      throw fail(409, 'Time is up! This duel has finished.', 'duel_timeout');
    }

    const c = JSON.parse(m.challenge_json);
    let verdict;
    if (c.mode === 'code_quiz') {
      const answers = req.body?.answers;
      if (!Array.isArray(answers) || answers.length !== c.questions.length || answers.some((a) => !Number.isInteger(a) || a < 0 || a > 3)) {
        throw fail(422, 'Answer every question by choosing an option.', 'invalid_answers');
      }
      verdict = markQuiz(c, answers);
    } else {
      const code = clampCode(req.body?.code);
      if (!code.trim()) throw fail(422, 'Write some code before submitting.', 'empty_code');
      verdict = await markCode(c, code);
    }
    const attempt = p.attempts + 1;
    const isFinal = req.body?.final !== false || attempt >= MAX_ATTEMPTS;
    const breakdown = scoreFor(c, verdict, Math.max(0, (Date.now() - startsAt) / 1000), attempt);
    const score = breakdown.total;

    await run('BEGIN IMMEDIATE');
    try {
      const added = await run(
        'INSERT INTO duel_submissions (match_id, user_id, attempt, payload, verdict_json, score) VALUES (?, ?, ?, ?, ?, ?)',
        [id, req.user.id, attempt, JSON.stringify(c.mode === 'code_quiz' ? { answers: req.body.answers } : { code: clampCode(req.body.code) }), JSON.stringify(verdict), score],
      );
      if (!added.changes) throw fail(409, 'Duplicate submission.', 'duplicate_submission');
      await run(
        `UPDATE duel_participants SET attempts = ?, score = MAX(COALESCE(score, 0), ?),
         breakdown_json = CASE WHEN ? > COALESCE(score, 0) THEN ? ELSE breakdown_json END,
         submitted_at = CASE WHEN ? = 1 THEN datetime('now') ELSE submitted_at END,
         last_seen_at = datetime('now') WHERE match_id = ? AND user_id = ?`,
        [attempt, score, score, JSON.stringify(breakdown), isFinal ? 1 : 0, id, req.user.id],
      );
      await run('COMMIT');
    } catch (err) {
      await run('ROLLBACK').catch(() => {});
      throw err;
    }

    const fresh = await get('SELECT * FROM duel_matches WHERE id = ?', [id]);
    const ps = await participantsOf(id);
    const everyoneDone = ps.length === 2 && ps.every((x) => x.submitted_at);
    let final = null;
    if (everyoneDone) final = await finalize(id, 'complete');
    broadcast(id, { kind: 'submitted', matchId: id, userId: req.user.id, final: !!final });
    noteCoding(req.user.id, { code: c.mode === 'code_quiz' ? '' : clampCode(req.body.code) });
    res.json({
      verdict: { passed: verdict.correctCount === verdict.total, correctCount: verdict.correctCount, total: verdict.total, error: verdict.error, output: verdict.output },
      breakdown, score, attempt, attemptsLeft: MAX_ATTEMPTS - attempt,
      final: !!final, match: await viewOf(final || fresh, req.user.id),
    });
  }));

  router.post('/:id/leave', wrap(async (req, res) => {
    const id = Number(req.params.id);
    const { m } = await myMatch(id, req.user.id);
    if (m.status === 'waiting') {
      await run("UPDATE duel_matches SET status = 'cancelled', end_reason = 'withdrawn', finished_at = datetime('now') WHERE id = ?", [id]);
      broadcast(id, { kind: 'finished', matchId: id, status: 'cancelled' });
      return res.json({ status: 'cancelled' });
    }
    if (m.status !== 'active') throw fail(409, 'This duel has already finished.', 'match_not_active');
    await run("UPDATE duel_participants SET left_at = datetime('now'), score = 0 WHERE match_id = ? AND user_id = ?", [id, req.user.id]);
    await run("UPDATE duel_matches SET end_reason = ? WHERE id = ?", [m.created_by === req.user.id ? 'creator' : 'opponent', id]);
    const done = await finalize(id, 'forfeit');
    res.json({ status: done ? 'finished' : 'cancelled', match: done ? await viewOf(done, req.user.id) : null });
  }));

  // Server-sent events, read with fetch() so credentials stay out of the URL.
  // Events come from SQLite, so this works with any number of backend instances.
  router.get('/:id/events', async (req, res) => {
    try {
      const { m } = await myMatch(Number(req.params.id), req.user.id);
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      });
      res.write('retry: 2000\n\n');

      let lastId = 0;
      let closed = false;
      let polling = false;
      const cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(timer);
        clearInterval(ping);
      };
      const poll = async () => {
        if (closed || polling) return;
        polling = true;
        try {
          const rows = await all(
            'SELECT id, payload_json FROM duel_events WHERE match_id = ? AND id > ? ORDER BY id',
            [m.id, lastId],
          );
          for (const row of rows) {
            if (closed || res.writableEnded) { cleanup(); break; }
            lastId = row.id;
            res.write(`event: duel\ndata: ${row.payload_json}\n\n`);
          }
        } catch (err) {
          if (!closed) console.error('Duel event read failed:', err.message);
          cleanup();
        } finally {
          polling = false;
        }
      };
      const timer = setInterval(poll, 1000);
      const ping = setInterval(() => {
        if (closed || res.writableEnded) return cleanup();
        try { res.write(': ping\n\n'); } catch { cleanup(); }
      }, 15000);
      timer.unref?.();
      ping.unref?.();
      req.on('close', cleanup);
      req.on('error', cleanup);
      await poll();
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  });

  router.get('/:id', wrap(async (req, res) => {
    const { m } = await myMatch(Number(req.params.id), req.user.id);
    res.json({ match: await viewOf(m, req.user.id) });
  }));

  startSweeper();
  return router;
}

function mResult(row, userId) {
  if (row.status === 'cancelled') return 'cancelled';
  if (row.status !== 'finished') return row.status;
  if (!row.winner_id) return 'tie';
  return row.winner_id === Number(userId) ? 'won' : 'lost';
}

module.exports = { createDuelRouter, MODES, DURATIONS, rankOf, BADGES };
