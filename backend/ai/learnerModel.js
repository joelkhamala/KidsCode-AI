'use strict';
/**
 * Learner model: Bayesian Knowledge Tracing (Corbett & Anderson, 1994) per
 * (language, concept, Bloom level), plus the "known -> unknown" recommendation
 * policy. Pure functions - no database access - so it is easy to test.
 *
 * Key ideas
 *  - p (probability the skill is known) rises with correct answers and falls
 *    with wrong ones, discounted when hints were used.
 *  - A level is MASTERED at p >= 0.85 with at least 2 attempts, OR after 8 attempts
 *    with at least 60% correct (so a mostly-right learner is not kept on one level
 *    for ages just because the odd slip resets the estimate).
 *  - Bloom levels unlock in order per concept (Remember -> ... -> Create).
 *  - A concept unlocks when all its prerequisites reached Apply.
 *  - Knowledge transfers between languages: learning loops in Blocks raises the
 *    starting estimate for loops in Python ("you already know this idea!").
 *  - Policy mixes: new learning (depth-first to Apply), higher-order thinking
 *    every 3rd activity, spaced review every 7th, and scaffolding (step back a
 *    level) after 3 wrong answers in a row.
 */
const { IDS: LEVEL_IDS, levelIndex, prevLevel, isHigherOrder } = require('./bloom');
const { BY_ID: CONCEPTS } = require('./concepts');
const { BY_ID: LANGS } = require('./languages');

const MASTERY_P = 0.85;
const MIN_ATTEMPTS = 2;
const P_TRANSIT = 0.15;
const P_SLIP = 0.1;
const STRUGGLE_STREAK = 3;
const ENOUGH_ATTEMPTS = 8;
const ENOUGH_ACCURACY = 0.6;

const GUESS = {
  mcq: 0.25, complete_code: 0.3, find_bug: 0.25, predict_output: 0.05, write_code: 0.05, create: 0.1, lesson: 0.1,
};

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

/** Starting probability for a skill the learner has never practised in this language. */
function priorP(rows, language, concept, level) {
  let transfer = 0;
  rows.forEach((r) => {
    if (r.concept_id === concept && r.bloom_level === level && r.language !== language) transfer = Math.max(transfer, r.p_known);
  });
  return clamp(0.1 + 0.5 * transfer, 0.05, 0.6);
}

/**
 * One BKT update.
 * @param {number} p prior probability known
 * @param {boolean} correct
 * @param {{type?: string, optionsCount?: number, hintsUsed?: number}} ctx
 */
function updateP(p, correct, ctx = {}) {
  const guess = ctx.optionsCount ? clamp(1 / ctx.optionsCount, 0.05, 0.5) : (GUESS[ctx.type] ?? 0.2);
  const slip = P_SLIP;
  const posterior = correct
    ? (p * (1 - slip)) / (p * (1 - slip) + (1 - p) * guess)
    : (p * slip) / (p * slip + (1 - p) * (1 - guess));
  // Hints reduce how much a correct answer tells us (and how much is learned).
  const credit = correct ? clamp(1 - 0.25 * (ctx.hintsUsed || 0), 0.3, 1) : 1;
  const blended = credit * posterior + (1 - credit) * p;
  const transit = correct ? P_TRANSIT * credit : P_TRANSIT * 0.5; // feedback after a mistake still teaches a little
  return clamp(blended + (1 - blended) * transit, 0.01, 0.99);
}

/** Mastery rule shared by the recommender and the submit handler. */
const reachesMastery = ({ p, attempts, correct }) => (p >= MASTERY_P && attempts >= MIN_ATTEMPTS)
  || (attempts >= ENOUGH_ATTEMPTS && correct / attempts >= ENOUGH_ACCURACY);
const isMastered = (row) => Boolean(row && reachesMastery({ p: row.p_known, attempts: row.attempts, correct: row.correct || 0 }));

function daysSince(dateStr, now = Date.now()) {
  if (!dateStr) return 999;
  const ts = Date.parse(dateStr.includes('T') ? dateStr : `${dateStr.replace(' ', 'T')}Z`);
  return Number.isFinite(ts) ? Math.max(0, (now - ts) / 86400000) : 999;
}

/** Index rows as map[concept][level] for one language. */
function indexRows(rows, language) {
  const map = {};
  rows.filter((r) => r.language === language).forEach((r) => {
    map[r.concept_id] = map[r.concept_id] || {};
    map[r.concept_id][r.bloom_level] = r;
  });
  return map;
}

function frontierLevel(map, concept) {
  for (const level of LEVEL_IDS) {
    if (!isMastered(map[concept] && map[concept][level])) return level;
  }
  return null; // every level mastered
}

function reachedApply(map, concept) {
  const f = frontierLevel(map, concept);
  return f === null || levelIndex(f) > levelIndex('apply');
}

function isUnlocked(map, concept, language) {
  const lang = LANGS[language];
  return CONCEPTS[concept].prereqs
    .filter((p) => lang.concepts.includes(p))
    .every((p) => reachedApply(map, p));
}

/**
 * Build the per-concept summary for one language (used by the UI and insights).
 */
function summarise(rows, language) {
  const lang = LANGS[language];
  const map = indexRows(rows, language);
  let masteredCells = 0;
  const concepts = lang.concepts.map((cid) => {
    const c = CONCEPTS[cid];
    const levels = LEVEL_IDS.map((level) => {
      const row = map[cid] && map[cid][level];
      const p = row ? row.p_known : priorP(rows, language, cid, level);
      const mastered = isMastered(row);
      if (mastered) masteredCells += 1;
      return {
        level, p: Math.round(p * 100) / 100, mastered,
        attempts: row ? row.attempts : 0, correct: row ? row.correct : 0,
        struggling: Boolean(row && row.streak_wrong >= STRUGGLE_STREAK),
      };
    });
    return {
      id: cid, order: c.order, icon: c.icon, name: c.name, prereqs: c.prereqs.filter((p) => lang.concepts.includes(p)),
      unlocked: isUnlocked(map, cid, language), frontier: frontierLevel(map, cid), levels,
    };
  });
  const totalCells = lang.concepts.length * LEVEL_IDS.length;
  return { language, concepts, masteredCells, totalCells, percent: Math.round((100 * masteredCells) / totalCells) };
}

/**
 * Decide the next (concept, level) for a learner.
 * @param {{rows: object[], language: string, activityCount: number, focusConcept?: string, now?: number}} args
 * @returns {{concept: string, level: string, reason: string, bridgeFrom: string[]}}
 */
function recommendNext({ rows, language, activityCount = 0, focusConcept = null, now = Date.now(), recentDone = [] }) {
  const lang = LANGS[language];
  const map = indexRows(rows, language);
  const sorted = lang.concepts.slice().sort((a, b) => CONCEPTS[a].order - CONCEPTS[b].order);
  const open = sorted.filter((c) => isUnlocked(map, c, language) && frontierLevel(map, c) !== null);
  const bridge = (concept) => CONCEPTS[concept].prereqs.filter((p) => lang.concepts.includes(p) && reachedApply(map, p));

  const withLevel = (concept, level, reason) => ({ concept, level, reason, bridgeFrom: bridge(concept) });

  // 1. Learner asked to practise a specific (unlocked) concept.
  if (focusConcept && open.includes(focusConcept)) {
    return withLevel(focusConcept, frontierLevel(map, focusConcept), 'learner_choice');
  }

  // 2. Scaffold: three wrong in a row -> step back to the level below to rebuild confidence.
  for (const c of open) {
    const f = frontierLevel(map, c);
    const row = map[c] && map[c][f];
    if (row && row.streak_wrong >= STRUGGLE_STREAK) {
      const back = prevLevel(f);
      // The step back worked if, since their last try at the harder level, they got the
      // easier level right. Then let them try the harder level again. (The wrong-streak only
      // resets when they answer that level, so without this a learner would stay stuck on
      // the easier level forever.) recentDone is newest first.
      const latest = back && recentDone.find((a) => a.concept_id === c && (a.bloom_level === f || a.bloom_level === back));
      const recovered = Boolean(latest && latest.bloom_level === back && latest.correct);
      if (recovered) continue;
      return withLevel(c, back || f, back ? 'scaffold_step_back' : 'retry_with_support');
    }
  }

  // 3. Spaced review of something already mastered (retrieval practice).
  const reviewDue = activityCount % 7 === 6 || open.length === 0;
  if (reviewDue) {
    let best = null;
    rows.filter((r) => r.language === language && isMastered(r)).forEach((r) => {
      const d = daysSince(r.last_practiced, now);
      const decayed = r.p_known * Math.pow(0.97, d);
      if (d >= 1 && (!best || decayed < best.decayed)) best = { r, decayed };
    });
    if (best) return withLevel(best.r.concept_id, best.r.bloom_level, 'spaced_review');
    if (open.length === 0) {
      const last = sorted[sorted.length - 1];
      return withLevel(last, 'create', 'all_mastered');
    }
  }

  // 4. Every 3rd activity, deepen thinking on a concept already at Analyse or above.
  if (activityCount % 3 === 2) {
    const deep = open.find((c) => isHigherOrder(frontierLevel(map, c)));
    if (deep) return withLevel(deep, frontierLevel(map, deep), 'deepen_thinking');
  }

  // 5. Default: earliest concept still below Apply (known -> unknown), else the
  //    concept with the lowest frontier level.
  const building = open.find((c) => levelIndex(frontierLevel(map, c)) <= levelIndex('apply'));
  if (building) {
    const level = frontierLevel(map, building);
    const started = map[building] && Object.values(map[building]).some((r) => r.attempts > 0);
    return withLevel(building, level, started ? 'next_step' : 'new_concept');
  }
  const lowest = open.slice().sort((a, b) => levelIndex(frontierLevel(map, a)) - levelIndex(frontierLevel(map, b)))[0];
  return withLevel(lowest, frontierLevel(map, lowest), 'deepen_thinking');
}

module.exports = {
  MASTERY_P, MIN_ATTEMPTS, STRUGGLE_STREAK, ENOUGH_ATTEMPTS, ENOUGH_ACCURACY, reachesMastery,
  priorP, updateP, isMastered, indexRows, frontierLevel, reachedApply, isUnlocked, summarise, recommendNext, daysSince,
};
