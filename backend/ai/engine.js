'use strict';
/**
 * The adaptive learning engine: ties the learner model, content generator,
 * grader and store together. Routes (routes.js) are thin wrappers around this.
 */
const { BY_ID: CONCEPTS } = require('./concepts');
const { BY_ID: LANGS, LANGUAGES, languagesForAge, suggestedLanguage } = require('./languages');
const { LEVELS, BY_ID: BLOOM, levelIndex, nextLevel } = require('./bloom');
const model = require('./learnerModel');
const { grade, reviewCode } = require('./grader');
const { learnerSummary, classSummary } = require('./insights');
const { buildJourney } = require('./journey');

const XP_BY_LEVEL = { remember: 10, understand: 15, apply: 20, analyze: 25, evaluate: 30, create: 40 };
const MASTERY_BONUS = 25;

const REASONS = {
  new_concept: { en: 'New idea unlocked! Let\'s start {concept}.', sw: 'Wazo jipya limefunguliwa! Tuanze {concept}.' },
  next_step: { en: 'Next step up the {concept} ladder: {level}.', sw: 'Hatua inayofuata kwenye ngazi ya {concept}: {level}.' },
  deepen_thinking: { en: 'Time to think deeper about {concept}: {level}.', sw: 'Wakati wa kufikiri kwa kina kuhusu {concept}: {level}.' },
  spaced_review: { en: 'Quick review so you never forget {concept}! 🔄', sw: 'Marudio mafupi ili usisahau {concept}! 🔄' },
  scaffold_step_back: { en: 'Let\'s practise an easier step of {concept} first, then try again. You can do it!', sw: 'Tufanye mazoezi ya hatua rahisi ya {concept} kwanza, kisha tujaribu tena. Unaweza!' },
  retry_with_support: { en: 'Let\'s try {concept} again - read the mini-lesson first.', sw: 'Tujaribu {concept} tena - soma somo fupi kwanza.' },
  learner_choice: { en: 'You chose {concept}. Let\'s go!', sw: 'Umechagua {concept}. Twende!' },
  legend_challenge: { en: 'Legend challenge! ⚡ Mixed practice to keep your skills sharp: {concept} - {level}.', sw: 'Changamoto ya Gwiji! ⚡ Mazoezi mchanganyiko kuweka ujuzi wako imara: {concept} - {level}.' },
  all_mastered: { en: 'You have mastered everything here! Build something amazing. 🏆', sw: 'Umemudu kila kitu hapa! Jenga kitu cha ajabu. 🏆' },
};

// Existing KidsCode lessons -> evidence for the learner model.
const LESSON_MAP = {
  1: { language: 'javascript', concepts: ['output'], levels: ['remember', 'understand', 'apply'] },
  2: { language: 'javascript', concepts: ['variables'], levels: ['remember', 'understand', 'apply'] },
  3: { language: 'javascript', concepts: ['arithmetic'], levels: ['remember', 'understand', 'apply'] },
  4: { language: 'javascript', concepts: ['conditionals'], levels: ['remember', 'understand', 'apply'] },
  5: { language: 'javascript', concepts: ['sequence'], levels: ['remember', 'understand', 'apply'] },
  6: { language: 'javascript', concepts: ['loops'], levels: ['remember', 'understand', 'apply'] },
  7: { language: 'javascript', concepts: ['lists'], levels: ['remember', 'understand'] },
  8: { language: 'javascript', concepts: ['arithmetic', 'conditionals'], levels: ['apply'] },
  9: { language: 'javascript', concepts: ['variables', 'arithmetic'], levels: ['apply'] },
  10: { language: 'javascript', concepts: ['functions', 'parameters_return'], levels: ['remember', 'understand', 'apply'] },
  11: { language: 'html_css', concepts: ['html_structure'], levels: ['remember', 'understand'] },
  12: { language: 'html_css', concepts: ['css_styling'], levels: ['remember', 'understand'] },
  13: { language: 'python', concepts: ['output'], levels: ['remember', 'understand'] },
  14: { language: 'javascript', concepts: ['lists'], levels: ['apply'] },
};

const fill = (tpl, vars) => tpl.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : ''));
const loc = (l) => (l === 'sw' ? 'sw' : 'en');

/** Concepts the learner can already use (reached Apply) in at least one language. */
function masteredConcepts(rows) {
  return Object.keys(CONCEPTS).filter((cid) => LANGUAGES.some((lg) => lg.concepts.includes(cid)
    && rows.some((r) => r.language === lg.id && r.concept_id === cid)
    && model.reachedApply(model.indexRows(rows, lg.id), cid)));
}

/** What the learner is allowed to see before answering. */
function publicActivity(a) {
  const {
    answerIndex, expectedOutput, solution, tests, bugLine, explanation, hints, seed, variantKey, fingerprint, ...rest
  } = a;
  return { ...rest, hintCount: Array.isArray(hints) ? hints.length : 0 };
}

class LearningEngine {
  constructor({ store, generator, llm, runJs }) {
    this.store = store;
    this.generator = generator;
    this.llm = llm;
    this.runJs = runJs;
  }

  async learnerContext(userId, overrides = {}) {
    const [user, prefs] = await Promise.all([this.store.getUser(userId), this.store.getPrefs(userId)]);
    // Adult learners are 'adult': grown-up wording, web/text languages and their own content cache.
    const age = user && user.account_type === 'adult_learner' ? 'adult' : user && user.age ? Number(user.age) : null;
    const language = overrides.language || (prefs && prefs.language) || suggestedLanguage(age);
    const locale = loc(overrides.locale || (prefs && prefs.locale));
    let interests = [];
    try { interests = prefs && prefs.interests ? JSON.parse(prefs.interests) : []; } catch { interests = []; }
    return { user, age, language, locale, interests, name: user ? (user.display_name || user.username) : 'Learner' };
  }

  catalog(age, locale) {
    const l = loc(locale);
    const allowed = new Set(languagesForAge(age).map((x) => x.id));
    return {
      bloomLevels: LEVELS.map((b) => ({ id: b.id, order: b.order, icon: b.icon, name: b.name[l], kidGoal: b.kidGoal[l] })),
      languages: LANGUAGES.map((x) => ({
        id: x.id, name: l === 'sw' ? x.nameSw : x.name, icon: x.icon, kind: x.kind, minAge: x.minAge,
        description: x.description[l], curricula: x.curricula, runsCode: x.runtime === 'js',
        recommended: x.id === suggestedLanguage(age), ageAppropriate: allowed.has(x.id), conceptCount: x.concepts.length,
      })),
      suggestedLanguage: suggestedLanguage(age),
    };
  }

  async profile(userId, { language, locale } = {}) {
    const ctx = await this.learnerContext(userId, { language, locale });
    const rows = await this.store.masteryRows(userId);
    const summary = model.summarise(rows, ctx.language);
    const l = ctx.locale;
    summary.concepts = summary.concepts.map((c) => ({ ...c, name: c.name[l] }));
    const overview = LANGUAGES.map((x) => ({ id: x.id, percent: model.summarise(rows, x.id).percent })).filter((x) => x.percent > 0 || x.id === ctx.language);
    return { language: ctx.language, locale: l, age: ctx.age, summary, overview, ai: this.status() };
  }

  /** The life-long Coding Journey: stages from newbie to pro, then endless Legend levels. */
  async journey(userId, { language, locale } = {}) {
    const ctx = await this.learnerContext(userId, { language, locale });
    const rows = await this.store.masteryRows(userId);
    const wins = await this.store.legendWins(userId, ctx.language).catch(() => 0);
    return buildJourney(rows, ctx.language, ctx.locale, wins);
  }

  status() {
    return { provider: this.llm.provider, model: this.llm.enabled ? this.llm.model : null, aiEnabled: this.llm.enabled };
  }

  async next(userId, { language, locale, concept, fresh } = {}) {
    const ctx = await this.learnerContext(userId, { language, locale });
    if (!LANGS[ctx.language]) throw Object.assign(new Error('Unknown language'), { status: 400 });
    if (concept && !LANGS[ctx.language].concepts.includes(concept)) throw Object.assign(new Error('That concept is not taught in this language'), { status: 400 });

    // Resume an unfinished activity instead of generating a new one (saves data and AI cost).
    if (!fresh && !concept) {
      const open = await this.store.get(
        `SELECT id FROM ai_activities WHERE user_id = ? AND language = ? AND status = 'open' AND created_at >= datetime('now', '-6 hours')
         ORDER BY id DESC LIMIT 1`, [userId, ctx.language],
      );
      if (open) {
        const existing = await this.store.getActivity(userId, open.id);
        if (existing && existing.content.locale === ctx.locale) {
          return { activityId: existing.id, activity: publicActivity(existing.content), recommendation: { concept: existing.concept_id, level: existing.bloom_level, reason: existing.reason, reasonText: this.reasonText(existing.reason, existing.concept_id, existing.bloom_level, ctx.locale) }, lesson: null, resumed: true, ai: this.status() };
        }
      }
    }

    const rows = await this.store.masteryRows(userId);
    const count = await this.store.countDone(userId, ctx.language);
    const recentDone = await this.store.recentDone(userId, ctx.language).catch(() => []);
    const rec = model.recommendNext({ rows, language: ctx.language, activityCount: count, focusConcept: concept, recentDone });
    const mastered = masteredConcepts(rows);
    const mistakes = (await this.store.recentMistakes(userId, ctx.language)).map((m) => `${CONCEPTS[m.concept_id] ? CONCEPTS[m.concept_id].name.en : m.concept_id} (${m.bloom_level})`);

    // What this learner has already seen at this step, so the next question is a new one.
    const avoid = await this.store.seenQuestions(userId, ctx.language, rec.concept, rec.level).catch(() => null);
    const activity = await this.generator.getActivity({
      userId, concept: rec.concept, level: rec.level, language: ctx.language, locale: ctx.locale,
      age: ctx.age, interests: ctx.interests, mastered, recentMistakes: mistakes, avoid,
    });
    const activityId = await this.store.createActivity(userId, activity, rec.reason);

    const firstTime = !rows.some((r) => r.language === ctx.language && r.concept_id === rec.concept && r.bloom_level === rec.level && r.attempts > 0);
    const lesson = firstTime || ['scaffold_step_back', 'retry_with_support'].includes(rec.reason)
      ? await this.generator.miniLesson({ userId, concept: rec.concept, level: rec.level, language: ctx.language, locale: ctx.locale, age: ctx.age, mastered, bridgeFrom: rec.bridgeFrom })
      : null;

    return {
      activityId, activity: publicActivity(activity),
      recommendation: { ...rec, reasonText: this.reasonText(rec.reason, rec.concept, rec.level, ctx.locale) },
      lesson, resumed: false, ai: this.status(),
    };
  }

  reasonText(reason, concept, level, locale) {
    const l = loc(locale);
    const tpl = REASONS[reason] || REASONS.next_step;
    return fill(tpl[l], { concept: CONCEPTS[concept] ? CONCEPTS[concept].name[l] : concept, level: BLOOM[level] ? BLOOM[level].name[l] : level });
  }

  async hint(userId, activityId, { hintNumber, learnerAnswer }) {
    const row = await this.store.getActivity(userId, activityId);
    if (!row) throw Object.assign(new Error('Activity not found'), { status: 404 });
    if (row.status !== 'open') throw Object.assign(new Error('Activity already finished'), { status: 409 });
    const ctx = await this.learnerContext(userId);
    const n = Math.min(3, Math.max(1, Number(hintNumber) || row.hints_used + 1));
    if (n > row.hints_used) await this.store.incrementHints(activityId);
    const result = await this.generator.hint({ userId, activity: row.content, hintNumber: n, learnerAnswer, learner: { age: ctx.age, locale: row.content.locale } });
    return { ...result, hintNumber: n };
  }

  async submit(userId, activityId, submission) {
    const row = await this.store.getActivity(userId, activityId);
    if (!row) throw Object.assign(new Error('Activity not found'), { status: 404 });
    if (row.status !== 'open') throw Object.assign(new Error('You already answered this activity'), { status: 409 });
    const a = row.content;
    const ctx = await this.learnerContext(userId);

    const result = await grade(a, submission, {
      runJs: this.runJs,
      review: (code, activity, run) => this.generator.aiReview({ userId, code, language: activity.language, task: activity.prompt, run, rubric: activity.rubric, learner: { age: ctx.age, locale: activity.locale } }),
    });

    // Bayesian Knowledge Tracing update
    const rowsBefore = await this.store.masteryRows(userId);
    const existing = rowsBefore.find((r) => r.language === a.language && r.concept_id === a.concept && r.bloom_level === a.bloom);
    const prior = existing ? existing.p_known : model.priorP(rowsBefore, a.language, a.concept, a.bloom);
    const p = model.updateP(prior, result.correct, { type: a.type, optionsCount: a.options ? a.options.length : null, hintsUsed: row.hints_used });
    const attempts = (existing ? existing.attempts : 0) + 1;
    const correctSoFar = (existing ? existing.correct || 0 : 0) + (result.correct ? 1 : 0);
    const nowMastered = model.reachesMastery({ p, attempts, correct: correctSoFar });
    const wasMastered = model.isMastered(existing);
    await this.store.upsertMastery(userId, { language: a.language, concept: a.concept, level: a.bloom, p, correct: result.correct, hintsUsed: row.hints_used, mastered: nowMastered });

    let xp = 0;
    if (result.correct) xp = Math.max(5, Math.round(XP_BY_LEVEL[a.bloom] * (1 - 0.2 * Math.min(3, row.hints_used))));
    if (nowMastered && !wasMastered) xp += MASTERY_BONUS;
    await this.store.completeActivity(activityId, { correct: result.correct, answer: submission.code || submission.text || submission.answerIndex, timeSeconds: submission.timeSeconds, xp });
    await this.store.addXp(userId, xp);

    // What changed? (level up / newly unlocked concepts)
    const rowsAfter = await this.store.masteryRows(userId);
    const before = model.summarise(rowsBefore, a.language);
    const after = model.summarise(rowsAfter, a.language);
    const l = loc(a.locale);
    const unlocked = after.concepts.filter((c) => c.unlocked && !before.concepts.find((b) => b.id === c.id).unlocked).map((c) => ({ id: c.id, name: c.name[l], icon: c.icon }));

    return {
      correct: result.correct,
      feedback: result.feedback,
      explanation: result.explanation,
      details: result.details,
      xpEarned: xp,
      mastery: {
        concept: a.concept, level: a.bloom, p: Math.round(p * 100) / 100, mastered: nowMastered, attempts,
        levelUp: nowMastered && !wasMastered ? { completed: a.bloom, next: nextLevel(a.bloom) } : null,
      },
      unlockedConcepts: unlocked,
      progressPercent: after.percent,
    };
  }

  async explain(userId, { concept, language, level, question, locale }) {
    const ctx = await this.learnerContext(userId, { language, locale });
    if (!CONCEPTS[concept]) throw Object.assign(new Error('Unknown concept'), { status: 400 });
    const lang = LANGS[ctx.language].concepts.includes(concept) ? ctx.language : (CONCEPTS[concept].webOnly ? 'html_css' : 'python');
    const rows = await this.store.masteryRows(userId);
    return this.generator.miniLesson({ userId, concept, level: BLOOM[level] ? level : 'understand', language: lang, locale: ctx.locale, age: ctx.age, mastered: masteredConcepts(rows), bridgeFrom: [], question });
  }

  async reviewCode(userId, { code, language, task, locale }) {
    if (typeof code !== 'string' || !code.trim()) throw Object.assign(new Error('Code is required'), { status: 400 });
    const lang = LANGS[language] ? language : 'javascript';
    const ctx = await this.learnerContext(userId, { locale });
    return reviewCode({ code: code.slice(0, 5000), language: lang, task, locale: ctx.locale }, {
      runJs: this.runJs,
      aiReview: ({ run }) => this.generator.aiReview({ userId, code, language: lang, task, run, learner: { age: ctx.age, locale: ctx.locale } }),
    });
  }

  async tutor(userId, { message, history, context, locale }) {
    if (typeof message !== 'string' || !message.trim()) throw Object.assign(new Error('Message is required'), { status: 400 });
    const ctx = await this.learnerContext(userId, { locale });
    return this.generator.tutor({
      userId, message, history, context: context || {},
      learner: { age: ctx.age, locale: ctx.locale, language: (context && context.language) || ctx.language },
      onSafety: (where, reasons) => this.store.logSafety(userId, where, reasons),
    });
  }

  async learnerInsights(viewer, learnerId, { narrative, locale } = {}) {
    if (!(await this.store.canViewLearner(viewer, learnerId))) throw Object.assign(new Error('You cannot view this learner'), { status: 403 });
    const ctx = await this.learnerContext(learnerId);
    if (!ctx.user) throw Object.assign(new Error('Learner not found'), { status: 404 });
    const [rows, recent] = await Promise.all([this.store.masteryRows(learnerId), this.store.recentActivities(learnerId, 7)]);
    const summary = learnerSummary(rows, recent, { id: learnerId, name: ctx.name, age: ctx.age });
    if (narrative) {
      const audience = viewer.accountType === 'teacher' ? 'teacher' : 'parent';
      summary.narrative = await this.generator.narrative({ userId: viewer.id, audience, locale: loc(locale), summary: {
        name: ctx.name, age: ctx.age, perLanguage: summary.perLanguage, bloomProfile: summary.bloomProfile.map((b) => ({ level: b.level, avgMastery: b.avgMastery })),
        strengths: summary.strengths.map((s) => `${s.conceptName.en} (${s.level})`), struggling: summary.struggling.map((s) => `${s.conceptName.en} (${s.level})`), activity: summary.activity,
      } });
    }
    return summary;
  }

  async classInsights(teacher) {
    if (teacher.accountType !== 'teacher') throw Object.assign(new Error('Teacher account required'), { status: 403 });
    const students = await this.store.teacherStudents(teacher.id);
    const data = await Promise.all(students.map(async (s) => ({
      user: { id: s.id, name: s.display_name || s.username, className: s.class_name },
      rows: await this.store.masteryRows(s.id),
    })));
    const summary = classSummary(data);
    summary.students = data.map((d) => ({
      ...d.user,
      percent: d.rows.length ? Math.round(LANGUAGES.reduce((m, lg) => Math.max(m, model.summarise(d.rows, lg.id).percent), 0)) : 0,
      struggling: d.rows.filter((r) => r.streak_wrong >= model.STRUGGLE_STREAK).length,
      highestLevel: d.rows.filter(model.isMastered).reduce((m, r) => (levelIndex(r.bloom_level) > levelIndex(m) ? r.bloom_level : m), 'remember'),
      active: d.rows.length > 0,
    }));
    return summary;
  }

  /** Existing lessons feed the learner model (called from POST /api/progress). */
  async recordLessonCompletion(userId, lessonId, metrics = {}) {
    const map = LESSON_MAP[lessonId];
    if (!map) return;
    const rows = await this.store.masteryRows(userId);
    const hints = Number(metrics.hintsUsed) || 0;
    const struggled = (Number(metrics.errorCount) || 0) > (Number(metrics.successCount) || 0) + 2;
    for (const concept of map.concepts) {
      for (const level of map.levels) {
        const existing = rows.find((r) => r.language === map.language && r.concept_id === concept && r.bloom_level === level);
        const prior = existing ? existing.p_known : model.priorP(rows, map.language, concept, level);
        const p = model.updateP(prior, true, { type: 'lesson', hintsUsed: hints + (struggled ? 1 : 0) });
        const attempts = (existing ? existing.attempts : 0) + 1;
        await this.store.upsertMastery(userId, { language: map.language, concept, level, p, correct: true, hintsUsed: hints, mastered: p >= model.MASTERY_P && attempts >= model.MIN_ATTEMPTS });
      }
    }
  }
}

module.exports = { LearningEngine, publicActivity, LESSON_MAP, XP_BY_LEVEL };
