'use strict';
/**
 * Express routes for the AI learning engine, mounted at /api/ai.
 *
 *   GET  /status                          provider + whether AI is on
 *   GET  /catalog                         languages (age-aware), Bloom levels
 *   GET  /profile?language=&locale=       mastery map for the learner
 *   PUT  /preferences                     { language, locale, interests[] }
 *   GET  /next?language=&concept=&fresh=  next adaptive activity (+ mini-lesson)
 *   POST /activities/:id/hint             { hintNumber, learnerAnswer }
 *   POST /activities/:id/submit           { answerIndex | text | code, timeSeconds }
 *   POST /explain                         { concept, language, level, question }
 *   POST /review-code                     { code, language, task }
 *   POST /tutor                           { message, history[], context }
 *   POST /moderate                        { text } -> { allowed, reasons }
 *   GET  /insights/learner/:id            parent/teacher/self view
 *   GET  /insights/class                  teacher view of all students
 */
const express = require('express');
const { BY_ID: LANGS } = require('./languages');
const safety = require('./safety');

function createRoutes(engine, { authenticateToken }) {
  const router = express.Router();
  router.use(authenticateToken);

  const wrap = (fn) => async (req, res) => {
    try {
      res.json(await fn(req, res));
    } catch (err) {
      const status = err.status || 500;
      if (status >= 500) console.error('AI route error:', err);
      res.status(status).json({ error: status >= 500 ? 'The AI coach had a problem. Please try again.' : err.message });
    }
  };
  const lang = (v) => (v && LANGS[v] ? v : undefined);
  const locale = (v) => (v === 'sw' || v === 'en' ? v : undefined);
  const id = (v) => {
    const n = Number(v);
    if (!Number.isInteger(n) || n <= 0) throw Object.assign(new Error('Invalid id'), { status: 400 });
    return n;
  };

  router.get('/status', wrap(async () => engine.status()));

  router.get('/catalog', wrap(async (req) => {
    const user = await engine.store.getUser(req.user.id);
    return engine.catalog(user && user.age, locale(req.query.locale) || 'en');
  }));

  router.get('/profile', wrap(async (req) => engine.profile(req.user.id, { language: lang(req.query.language), locale: locale(req.query.locale) })));

  router.put('/preferences', wrap(async (req) => {
    const { language, locale: loc, interests } = req.body || {};
    if (language !== undefined && !lang(language)) throw Object.assign(new Error('Unknown language'), { status: 400 });
    if (loc !== undefined && !locale(loc)) throw Object.assign(new Error('Locale must be en or sw'), { status: 400 });
    let cleanInterests;
    if (Array.isArray(interests)) {
      cleanInterests = interests.map((i) => String(i).slice(0, 30)).filter((i) => safety.checkText(i).ok && !safety.redactPII(i).found.length).slice(0, 5);
    }
    await engine.store.savePrefs(req.user.id, { language, locale: loc, interests: cleanInterests });
    return { success: true };
  }));

  router.get('/next', wrap(async (req) => engine.next(req.user.id, {
    language: lang(req.query.language), locale: locale(req.query.locale), concept: req.query.concept || undefined, fresh: req.query.fresh === '1',
  })));

  router.post('/activities/:id/hint', wrap(async (req) => engine.hint(req.user.id, id(req.params.id), {
    hintNumber: req.body && req.body.hintNumber, learnerAnswer: req.body && typeof req.body.learnerAnswer === 'string' ? req.body.learnerAnswer.slice(0, 5000) : null,
  })));

  router.post('/activities/:id/submit', wrap(async (req) => {
    const b = req.body || {};
    return engine.submit(req.user.id, id(req.params.id), {
      answerIndex: b.answerIndex, text: typeof b.text === 'string' ? b.text.slice(0, 3000) : undefined,
      code: typeof b.code === 'string' ? b.code.slice(0, 5000) : undefined, timeSeconds: Math.min(Number(b.timeSeconds) || 0, 7200),
    });
  }));

  router.post('/explain', wrap(async (req) => {
    const b = req.body || {};
    return engine.explain(req.user.id, { concept: b.concept, language: lang(b.language), level: b.level, locale: locale(b.locale), question: typeof b.question === 'string' ? b.question.slice(0, 500) : null });
  }));

  router.post('/review-code', wrap(async (req) => {
    const b = req.body || {};
    return engine.reviewCode(req.user.id, { code: b.code, language: lang(b.language), task: typeof b.task === 'string' ? b.task.slice(0, 1000) : null, locale: locale(b.locale) });
  }));

  router.post('/tutor', wrap(async (req) => {
    const b = req.body || {};
    return engine.tutor(req.user.id, { message: b.message, history: b.history, context: b.context, locale: locale(b.locale) });
  }));

  router.post('/moderate', wrap(async (req) => {
    const text = String((req.body && req.body.text) || '').slice(0, 5000);
    const check = safety.checkText(text);
    const pii = safety.redactPII(text);
    const allowed = check.ok && !check.reasons.includes('bullying') && pii.found.length === 0;
    if (!allowed) engine.store.logSafety(req.user.id, 'moderate', [...check.reasons, ...pii.found]);
    return { allowed, reasons: [...check.reasons, ...pii.found], needsHumanReview: !allowed };
  }));

  router.get('/insights/learner/:id', wrap(async (req) => engine.learnerInsights(req.user, id(req.params.id), { narrative: req.query.narrative === '1', locale: locale(req.query.locale) })));

  router.get('/insights/class', wrap(async (req) => engine.classInsights(req.user)));

  return router;
}

module.exports = { createRoutes };
