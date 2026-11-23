'use strict';
/**
 * Dynamic content generation: activities, mini-lessons, hints, code reviews and
 * tutor replies - using the AI model when it is available and safe, and the
 * verified offline bank otherwise.
 *
 * Correctness policy (important for children):
 *  - AI writes Remember/Understand questions and Create briefs (low-risk).
 *  - AI writes Apply/Analyse items ONLY for JavaScript, where the server runs
 *    the code and replaces the answer key with the real output.
 *  - Everything else uses the offline bank, whose answers are computed and
 *    verified by tests. A wrong answer key would teach a child something false.
 *  - Every AI text passes the safety filter; anything unsafe or malformed is
 *    discarded and the offline version is used instead.
 */
const { generateOffline, fingerprint } = require('./offlineBank');
const { BY_ID: CONCEPTS, signatures } = require('./concepts');
const { BY_ID: LANGS, constructPattern } = require('./languages');
const { BY_ID: BLOOM } = require('./bloom');
const { render } = require('./program/render');
const prompts = require('./prompts');
const safety = require('./safety');
const { analyseCode } = require('./codeHeuristics');
const { compareOutput } = require('./grader');
const { randInt } = require('./random');

const EXPECTED_TYPE = { remember: 'mcq', understand: 'mcq', apply: 'write_code', analyze: 'predict_output', create: 'create' };
const CACHE_VARIANTS = Number(process.env.AI_CACHE_VARIANTS || 4);
const ageBand = (age) => (!age ? 'any' : age <= 9 ? '7-9' : age <= 12 ? '10-12' : '13-16');

const str = (v, max) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

class ContentGenerator {
  constructor({ store, llm, runJs }) {
    this.store = store;
    this.llm = llm;
    this.runJs = runJs;
  }

  aiEligible(level, language) {
    if (!this.llm.enabled) return false;
    if (['remember', 'understand', 'create'].includes(level)) return true;
    return LANGS[language].runtime === 'js' && ['apply', 'analyze'].includes(level);
  }

  /** Main entry: returns a full activity (with answers - never send it raw to the client). */
  async getActivity({ userId, concept, level, language, locale, age, interests, mastered, recentMistakes, avoid }) {
    const offline = generateOffline({ concept, level, language, locale, avoid });
    const seen = new Set((avoid && avoid.fingerprints) || []);
    if (!this.aiEligible(level, language)) return offline;
    // Pro skills are checked by structure at Apply/Analyse, so keep their hand-written questions there.
    if (CONCEPTS[concept] && CONCEPTS[concept].pro && ['apply', 'analyze'].includes(level)) return offline;

    const personalise = (recentMistakes && recentMistakes.length > 0) || (interests && interests.length > 0);
    const variant = randInt(Math.random, 0, CACHE_VARIANTS - 1);
    const key = ['v1', language, concept, level, locale, ageBand(age), variant].join('|');

    if (!personalise || Math.random() < 0.5) {
      const cached = await this.store.getCached(key).catch(() => null);
      if (cached && !seen.has(cached.fingerprint || fingerprint(cached))) return { ...cached, source: 'cache' };
    }
    if (!this.llm.allow(userId)) return offline;

    try {
      const raw = await this.llm.completeJson({
        system: prompts.systemPrompt({ age, locale, language, mastered }),
        messages: [{ role: 'user', content: prompts.activityPrompt({ concept, level, language, locale, interests, recentMistakes }) }],
        maxTokens: 1200,
      });
      const activity = await this.validate(raw, offline);
      // An AI question is its own question, not a variant of the offline one it was based on.
      delete activity.variantKey;
      activity.fingerprint = fingerprint(activity);
      if (!personalise) await this.store.putCached(key, activity, 'ai').catch(() => {});
      return activity;
    } catch (err) {
      console.warn(`AI activity generation failed (${concept}/${level}/${language}): ${err.message}. Using offline content.`);
      return offline;
    }
  }

  /** Validate + verify an AI activity. Throws when anything is wrong. */
  async validate(raw, base) {
    if (!raw || typeof raw !== 'object') throw new Error('not an object');
    const expected = EXPECTED_TYPE[base.bloom];
    if (raw.type !== expected) throw new Error(`expected type ${expected}, got ${raw.type}`);

    const clean = (v, max) => {
      const s = str(v, max);
      if (!s) return null;
      const out = safety.cleanOutput(s);
      if (!out) throw new Error('unsafe text');
      return out;
    };
    const prompt = clean(raw.prompt, 600);
    if (!prompt) throw new Error('missing prompt');
    const hints = (Array.isArray(raw.hints) ? raw.hints : []).map((h) => clean(h, 300)).filter(Boolean).slice(0, 3);
    while (hints.length < 3) hints.push(base.hints[hints.length]);
    const explanation = clean(raw.explanation, 700) || base.explanation;
    const out = { ...base, prompt, hints, explanation, source: 'ai' };
    delete out.seed;

    if (expected === 'mcq') {
      const options = (Array.isArray(raw.options) ? raw.options : []).map((o) => clean(String(o), 220));
      if (options.length < 3 || options.length > 4 || options.some((o) => !o)) throw new Error('bad options');
      if (new Set(options.map((o) => o.toLowerCase())).size !== options.length) throw new Error('duplicate options');
      if (!Number.isInteger(raw.answerIndex) || raw.answerIndex < 0 || raw.answerIndex >= options.length) throw new Error('bad answerIndex');
      const code = raw.code ? str(raw.code, 1500) : null;
      Object.assign(out, { type: 'mcq', options, answerIndex: raw.answerIndex, code, codeOptions: false });
      delete out.expectedOutput; delete out.tests; delete out.starterCode; delete out.solution;
      return out;
    }

    if (expected === 'predict_output') {
      const code = str(raw.code, 1500);
      if (!code) throw new Error('missing code');
      const run = await this.runJs(code);
      if (run.error || !run.output.length || run.output.length > 12 || run.turtleCommands.length) throw new Error('code does not run cleanly');
      Object.assign(out, { type: 'predict_output', code, expectedOutput: run.output, explanation: `${explanation}\n\n${run.output.join('\n')}` });
      return out;
    }

    if (expected === 'write_code') {
      const solution = str(raw.solution, 2500);
      const starterCode = str(raw.starterCode, 2000) || '';
      if (!solution) throw new Error('missing solution');
      const run = await this.runJs(solution);
      if (run.error || !run.output.length || run.output.length > 15) throw new Error('solution does not run cleanly');
      const pattern = constructPattern(base.concept, base.language);
      if (pattern && !pattern.test(solution)) throw new Error('solution does not use the concept');
      if (starterCode) {
        const starterRun = await this.runJs(starterCode);
        if (!starterRun.error && compareOutput(run.output, starterRun.output).match) throw new Error('starter already solves the task');
      }
      Object.assign(out, {
        type: 'write_code', starterCode, solution, expectedOutputShown: run.output,
        tests: { expectedOutput: run.output, requiredPattern: pattern ? pattern.source : null },
      });
      return out;
    }

    // create
    const ideas = (Array.isArray(raw.ideas) ? raw.ideas : []).map((i) => clean(i, 200)).filter(Boolean).slice(0, 2);
    out.prompt = ideas.length ? `${prompt}\n\n💡 ${ideas.join('\n💡 ')}` : prompt;
    return out;
  }

  /** Short "learn" card shown when a learner meets a new concept/level (known -> unknown bridge). */
  async miniLesson({ userId, concept, level, language, locale, age, mastered, bridgeFrom, question }) {
    const loc = locale === 'sw' ? 'sw' : 'en';
    const c = CONCEPTS[concept];
    const lang = LANGS[language];
    let example = '';
    if (!c.webOnly && signatures[concept] && lang.renderer) {
      try { example = render(signatures[concept]().program, lang.renderer).code; } catch { example = ''; }
    } else if (c.example) {
      example = c.example[language] || c.example.python || '';
    } else if (c.webOnly) {
      example = concept === 'html_structure' ? '<h1>Karibu!</h1>\n<p>Welcome to my page.</p>' : 'h1 {\n  color: green;\n}';
    }
    const bridgeNames = (bridgeFrom || []).map((b) => CONCEPTS[b].name[loc]);
    const offline = {
      title: `${c.icon} ${c.name[loc]}`,
      explanation: c.explain[loc],
      analogy: c.analogy[loc],
      example,
      bridge: bridgeNames.length
        ? (loc === 'sw' ? `Tayari unajua ${bridgeNames.join(' na ')}. Sasa tutajenga juu yake!` : `You already know ${bridgeNames.join(' and ')}. Now we build on it!`)
        : null,
      goal: `${BLOOM[level].icon} ${BLOOM[level].kidGoal[loc]}`,
      source: 'offline',
    };
    if (!this.llm.enabled) return offline;

    const key = ['lesson-v1', language, concept, level, loc, ageBand(age)].join('|');
    if (!question) {
      const cached = await this.store.getCached(key).catch(() => null);
      if (cached) return { ...cached, bridge: offline.bridge, goal: offline.goal, source: 'cache' };
    }
    if (!this.llm.allow(userId)) return offline;
    try {
      const redacted = question ? safety.redactPII(question).text : null;
      const raw = await this.llm.completeJson({
        system: prompts.systemPrompt({ age, locale: loc, language, mastered }),
        messages: [{ role: 'user', content: prompts.explainPrompt({ concept, language, level, question: redacted }) }],
        maxTokens: 700,
      });
      const fields = {};
      for (const k of ['title', 'explanation', 'analogy', 'example', 'checkQuestion']) {
        const v = str(raw[k], k === 'example' ? 1200 : 700);
        if (v) {
          const safe = k === 'example' ? v : safety.cleanOutput(v);
          if (!safe) throw new Error('unsafe mini-lesson');
          fields[k] = safe;
        }
      }
      if (!fields.explanation) throw new Error('missing explanation');
      const lesson = { ...offline, ...fields, source: 'ai' };
      if (!question) await this.store.putCached(key, lesson, 'ai').catch(() => {});
      return lesson;
    } catch (err) {
      console.warn(`AI mini-lesson failed: ${err.message}`);
      return offline;
    }
  }

  /** Progressive hint. Never leaks the answer (checked after generation). */
  async hint({ userId, activity, hintNumber, learnerAnswer, learner }) {
    const loc = activity.locale === 'sw' ? 'sw' : 'en';
    const n = Math.min(Math.max(Number(hintNumber) || 1, 1), 3);
    const offline = activity.hints[n - 1];
    let tips = [];
    if (learnerAnswer && ['write_code', 'create'].includes(activity.type)) {
      tips = analyseCode(learnerAnswer, activity.language).map((t) => t.message[loc]);
    }
    const offlineHint = tips.length && n >= 2 ? `${tips[0]}\n${offline}` : offline;
    if (!this.llm.allow(userId)) return { hint: offlineHint, source: 'offline' };

    try {
      const text = await this.llm.complete({
        system: prompts.systemPrompt({ ...learner, locale: loc, language: activity.language }),
        messages: [{ role: 'user', content: prompts.hintPrompt({ activity, hintNumber: n, learnerAnswer: learnerAnswer ? safety.redactPII(String(learnerAnswer).slice(0, 3000), { isCode: true }).text : null }) }],
        maxTokens: 200,
      });
      const safe = safety.cleanOutput(text);
      if (!safe || this.leaksAnswer(activity, safe)) return { hint: offlineHint, source: 'offline' };
      return { hint: safe, source: 'ai' };
    } catch (err) {
      return { hint: offlineHint, source: 'offline' };
    }
  }

  leaksAnswer(activity, text) {
    const lower = text.toLowerCase();
    if (activity.options && Number.isInteger(activity.answerIndex)) {
      const ans = String(activity.options[activity.answerIndex]).toLowerCase();
      // Line-number options ("Line 3: ...") leak if the line number is named.
      const lineMatch = ans.match(/^(?:line|mstari)\s+(\d+)/);
      if (lineMatch && new RegExp(`\\b(line|mstari)\\s+${lineMatch[1]}\\b`).test(lower)) return true;
      if (ans.length >= 6 && lower.includes(ans)) return true;
    }
    if (activity.expectedOutput && activity.expectedOutput.length > 1) {
      if (lower.includes(activity.expectedOutput.join('\n').toLowerCase())) return true;
    }
    if (activity.solution && activity.solution.length > 20 && lower.includes(activity.solution.toLowerCase())) return true;
    return false;
  }

  /** AI rubric review for Create work and the "check my code" button. */
  async aiReview({ userId, code, language, task, run, rubric, learner }) {
    if (!this.llm.allow(userId)) return null;
    const redacted = safety.redactPII(String(code).slice(0, 4000), { isCode: true }).text;
    const raw = await this.llm.completeJson({
      system: prompts.systemPrompt({ ...learner, language }),
      messages: [{ role: 'user', content: prompts.reviewPrompt({ code: redacted, language, task, runResult: run ? { output: (run.output || []).slice(0, 15), error: run.error } : null, rubric }) }],
      maxTokens: 700,
    });
    const pickList = (arr) => (Array.isArray(arr) ? arr.map((s) => safety.cleanOutput(str(s, 300) || '')).filter(Boolean).slice(0, 3) : []);
    const summary = safety.cleanOutput(str(raw.summary, 500) || '');
    if (!summary) return null;
    const review = { summary, strengths: pickList(raw.strengths), improvements: pickList(raw.improvements), nextStep: safety.cleanOutput(str(raw.nextStep, 300) || '') || '' };
    if (rubric && raw.scores && typeof raw.scores === 'object') {
      review.scores = {};
      rubric.forEach((r) => { review.scores[r.id] = Math.min(2, Math.max(0, Number(raw.scores[r.id]) || 0)); });
    }
    return review;
  }

  /** Socratic tutor chat with full safety handling. */
  async tutor({ userId, message, history, context, learner, onSafety }) {
    const loc = learner.locale === 'sw' ? 'sw' : 'en';
    const text = String(message || '').slice(0, 1500);
    const check = safety.checkText(text);
    if (check.selfHarm) {
      onSafety('tutor', check.reasons);
      return { reply: safety.SUPPORT_MESSAGE[loc], source: 'safety', flagged: true };
    }
    if (!check.ok) {
      onSafety('tutor', check.reasons);
      return { reply: safety.OFF_LIMITS_REPLY[loc], source: 'safety', flagged: true };
    }
    const { text: redacted, found } = safety.redactPII(text);
    if (found.length) onSafety('tutor_pii', found);
    const privacyNote = found.length ? `${safety.PRIVACY_REMINDER[loc]}\n\n` : '';

    if (!this.llm.allow(userId)) {
      return { reply: privacyNote + this.offlineTutor(redacted, context, learner), source: 'offline' };
    }
    try {
      const turns = (Array.isArray(history) ? history : []).slice(-6).map((h) => ({
        role: h.role === 'assistant' ? 'assistant' : 'user',
        content: h.role === 'assistant' ? String(h.content || '').slice(0, 1000) : `<learner_message>${safety.redactPII(String(h.content || '').slice(0, 1000)).text}</learner_message>`,
      })).filter((h) => h.content);
      const ctx = [];
      if (context && context.task) ctx.push(`Current task: ${String(context.task).slice(0, 600)}`);
      if (context && context.code) ctx.push(`<learner_code>\n${safety.redactPII(String(context.code).slice(0, 3000), { isCode: true }).text}\n</learner_code>`);
      const content = `${ctx.join('\n')}\n<learner_message>${redacted}</learner_message>\nReply in at most 90 words.`;
      // Messages must alternate and start with the user.
      const messages = [];
      [...turns, { role: 'user', content }].forEach((m) => {
        if (messages.length && messages[messages.length - 1].role === m.role) messages[messages.length - 1].content += `\n${m.content}`;
        else messages.push({ ...m });
      });
      while (messages.length && messages[0].role !== 'user') messages.shift();
      const reply = await this.llm.complete({ system: prompts.systemPrompt({ ...learner, language: context && context.language }), messages, maxTokens: 350 });
      const safe = safety.cleanOutput(reply);
      if (!safe) return { reply: privacyNote + safety.OFF_LIMITS_REPLY[loc], source: 'safety' };
      return { reply: privacyNote + safe, source: 'ai' };
    } catch (err) {
      console.warn(`AI tutor failed: ${err.message}`);
      return { reply: privacyNote + this.offlineTutor(redacted, context, learner), source: 'offline' };
    }
  }

  offlineTutor(message, context, learner) {
    const loc = learner.locale === 'sw' ? 'sw' : 'en';
    const lower = message.toLowerCase();
    if (context && context.code) {
      const tips = analyseCode(String(context.code), context.language || 'javascript');
      if (tips.length) return tips.map((t) => `• ${t.message[loc]}`).join('\n');
    }
    const keywords = {
      output: ['print', 'console.log', 'output', 'onyesha'], variables: ['variable', 'kigeu', 'vigeu', 'let '],
      arithmetic: ['math', 'add', 'plus', 'hesabu', 'jumlisha'], conditionals: ['if', 'else', 'decision', 'uamuzi', 'sharti'],
      loops: ['loop', 'repeat', 'for ', 'kitanzi', 'rudia'], while_loops: ['while'], lists: ['list', 'array', 'orodha'],
      functions: ['function', 'kitendakazi', 'def '], parameters_return: ['return', 'parameter', 'kigezo'],
      html_structure: ['html', 'tag', 'lebo'], css_styling: ['css', 'colour', 'color', 'style', 'rangi'],
    };
    const hit = Object.entries(keywords).find(([, words]) => words.some((w) => lower.includes(w)));
    if (hit) {
      const c = CONCEPTS[hit[0]];
      return `${c.icon} ${c.name[loc]}: ${c.explain[loc]}\n💡 ${c.analogy[loc]}\n👉 ${c.tip[loc]}`;
    }
    return loc === 'sw'
      ? 'Niko katika hali ya nje ya mtandao, lakini bado naweza kusaidia! Niulize kuhusu vitanzi, vigeu, if/else, orodha au vitendakazi - au bofya "Kagua msimbo wangu".'
      : 'I am in offline mode, but I can still help! Ask me about loops, variables, if/else, lists or functions - or press "Check my code".';
  }

  /** Optional AI narrative for teacher/parent insights. */
  async narrative({ userId, summary, audience, locale }) {
    if (!this.llm.allow(userId)) return null;
    try {
      const text = await this.llm.complete({
        system: prompts.systemPrompt({ locale }),
        messages: [{ role: 'user', content: prompts.insightsPrompt({ summary, audience }) }],
        maxTokens: 300,
      });
      return safety.cleanOutput(text);
    } catch {
      return null;
    }
  }
}

module.exports = { ContentGenerator, EXPECTED_TYPE, ageBand };
