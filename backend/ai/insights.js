'use strict';
/**
 * Learning analytics for parents and teachers (proposal objective: dashboards
 * that track progress remotely). Turns mastery data into plain-language
 * strengths, needs and concrete next actions, organised by Bloom's levels.
 */
const { IDS: LEVEL_IDS, BY_ID: BLOOM } = require('./bloom');
const { BY_ID: CONCEPTS } = require('./concepts');
const { BY_ID: LANGS } = require('./languages');
const { summarise, isMastered, STRUGGLE_STREAK } = require('./learnerModel');

const t = (en, sw) => ({ en, sw });

function learnerSummary(rows, recent, user) {
  const languages = [...new Set(rows.map((r) => r.language))].filter((l) => LANGS[l]);
  const perLanguage = languages.map((l) => {
    const s = summarise(rows, l);
    return { language: l, name: LANGS[l].name, percent: s.percent, masteredCells: s.masteredCells, totalCells: s.totalCells };
  });

  const bloomProfile = LEVEL_IDS.map((level) => {
    const at = rows.filter((r) => r.bloom_level === level && r.attempts > 0);
    const avg = at.length ? at.reduce((a, r) => a + r.p_known, 0) / at.length : null;
    return { level, name: BLOOM[level].name, avgMastery: avg === null ? null : Math.round(avg * 100), practised: at.length, mastered: at.filter(isMastered).length };
  });

  const struggling = rows
    .filter((r) => r.streak_wrong >= STRUGGLE_STREAK || (r.attempts >= 4 && r.correct / r.attempts < 0.5 && !isMastered(r)))
    .map((r) => ({ language: r.language, concept: r.concept_id, conceptName: CONCEPTS[r.concept_id] ? CONCEPTS[r.concept_id].name : { en: r.concept_id, sw: r.concept_id }, level: r.bloom_level, attempts: r.attempts, accuracy: Math.round((100 * r.correct) / Math.max(1, r.attempts)) }));

  const strengths = rows
    .filter(isMastered)
    .sort((a, b) => LEVEL_IDS.indexOf(b.bloom_level) - LEVEL_IDS.indexOf(a.bloom_level))
    .slice(0, 5)
    .map((r) => ({ language: r.language, concept: r.concept_id, conceptName: CONCEPTS[r.concept_id] ? CONCEPTS[r.concept_id].name : { en: r.concept_id, sw: r.concept_id }, level: r.bloom_level }));

  const done = recent.length;
  const correct = recent.filter((a) => a.correct === 1).length;
  const hints = recent.reduce((a, r) => a + (r.hints_used || 0), 0);
  const activity = {
    activitiesLast7Days: done,
    accuracyLast7Days: done ? Math.round((100 * correct) / done) : null,
    hintsPerActivity: done ? Math.round((10 * hints) / done) / 10 : null,
    minutesLast7Days: Math.round(recent.reduce((a, r) => a + (r.time_seconds || 0), 0) / 60),
  };

  const actions = [];
  if (struggling.length) {
    const s = struggling[0];
    actions.push({ priority: 'high', text: t(
      `Sit with ${user.name} for 10 minutes on "${s.conceptName.en}" (${BLOOM[s.level].name.en} level). Ask them to explain their thinking out loud.`,
      `Kaa na ${user.name} kwa dakika 10 kuhusu "${s.conceptName.sw}" (kiwango cha ${BLOOM[s.level].name.sw}). Mwombe aeleze anavyofikiri kwa sauti.`,
    ) });
  }
  const lower = bloomProfile.filter((b) => ['remember', 'understand', 'apply'].includes(b.level) && b.avgMastery !== null);
  const higher = bloomProfile.filter((b) => ['analyze', 'evaluate', 'create'].includes(b.level));
  const lowerAvg = lower.length ? lower.reduce((a, b) => a + b.avgMastery, 0) / lower.length : null;
  const higherPractised = higher.reduce((a, b) => a + b.practised, 0);
  if (lowerAvg !== null && lowerAvg >= 70 && higherPractised < 2) {
    actions.push({ priority: 'medium', text: t(
      `${user.name} is solid on the basics. Encourage higher-order thinking: ask "What will this code print?" and "Can you find the bug?"`,
      `${user.name} yuko imara kwenye misingi. Himiza fikra za juu: uliza "Msimbo huu utaonyesha nini?" na "Unaweza kupata kosa?"`,
    ) });
  }
  if (activity.hintsPerActivity !== null && activity.hintsPerActivity > 1.5) {
    actions.push({ priority: 'medium', text: t(
      `${user.name} uses many hints. Encourage trying for 2 minutes before asking for a hint - struggle helps learning.`,
      `${user.name} anatumia vidokezo vingi. Mhimize ajaribu kwa dakika 2 kabla ya kuomba kidokezo - jitihada husaidia kujifunza.`,
    ) });
  }
  if (done < 3) {
    actions.push({ priority: 'low', text: t(
      `Short, regular practice works best: aim for 15 minutes of AI Coach, 3-4 days a week.`,
      `Mazoezi mafupi ya mara kwa mara ni bora: lenga dakika 15 za Kocha wa AI, siku 3-4 kwa wiki.`,
    ) });
  }
  if (!actions.length) {
    actions.push({ priority: 'low', text: t(
      `Great progress! Ask ${user.name} to show you something they created - explaining it builds deep understanding.`,
      `Maendeleo mazuri! Mwombe ${user.name} akuonyeshe kitu alichounda - kukieleza hujenga uelewa wa kina.`,
    ) });
  }

  return { learner: user, perLanguage, bloomProfile, strengths, struggling, activity, actions };
}

/** Aggregate a class for teachers: which concepts to reteach and who needs help. */
function classSummary(students) {
  const conceptStats = {};
  students.forEach(({ user, rows }) => {
    const byConcept = {};
    rows.forEach((r) => {
      byConcept[r.concept_id] = byConcept[r.concept_id] || { mastered: 0, total: 0, struggling: false };
      byConcept[r.concept_id].total += 1;
      if (isMastered(r)) byConcept[r.concept_id].mastered += 1;
      if (r.streak_wrong >= STRUGGLE_STREAK) byConcept[r.concept_id].struggling = true;
    });
    Object.entries(byConcept).forEach(([cid, s]) => {
      conceptStats[cid] = conceptStats[cid] || { concept: cid, name: CONCEPTS[cid] ? CONCEPTS[cid].name : { en: cid, sw: cid }, learners: 0, strugglingLearners: [], masterySum: 0 };
      conceptStats[cid].learners += 1;
      conceptStats[cid].masterySum += s.mastered / LEVEL_IDS.length;
      if (s.struggling) conceptStats[cid].strugglingLearners.push(user.name);
    });
  });
  const concepts = Object.values(conceptStats)
    .map((c) => ({ concept: c.concept, name: c.name, learners: c.learners, avgMastery: Math.round((100 * c.masterySum) / c.learners), strugglingLearners: c.strugglingLearners }))
    .sort((a, b) => b.strugglingLearners.length - a.strugglingLearners.length || a.avgMastery - b.avgMastery);
  return {
    studentCount: students.length,
    activeStudents: students.filter((s) => s.rows.length > 0).length,
    reteach: concepts.filter((c) => c.strugglingLearners.length > 0 || c.avgMastery < 40).slice(0, 3),
    concepts,
  };
}

module.exports = { learnerSummary, classSummary };
