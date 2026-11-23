'use strict';
/** Generates every (language x concept x Bloom level x locale) activity and checks invariants. */
const { generateOffline } = require('../ai/offlineBank');
const { LANGUAGES } = require('../ai/languages');
const { IDS } = require('../ai/bloom');
const { runJavaScript } = require('../sandbox/runJs');

(async () => {
  let n = 0; const problems = [];
  const jsChecks = [];
  for (const lang of LANGUAGES) for (const concept of lang.concepts) for (const level of IDS) for (const locale of ['en', 'sw']) for (const seed of [1, 2, 3, 7, 13, 42, 99, 123]) {
    let a;
    try { a = generateOffline({ concept, level, language: lang.id, locale, seed }); } catch (e) { problems.push(`${lang.id}/${concept}/${level}: THROW ${e.message}`); continue; }
    n += 1;
    const where = `${lang.id}/${concept}/${level}/${locale}/${seed}`;
    if (!a.prompt || !a.title || !Array.isArray(a.hints) || a.hints.length !== 3) problems.push(`${where}: missing prompt/title/hints`);
    if (a.hints && a.hints.some((h) => !h || /\{\w+\}/.test(h))) problems.push(`${where}: empty or unfilled hint`);
    if (/\{\w+\}/.test(a.prompt)) problems.push(`${where}: unfilled prompt ${a.prompt}`);
    if (['mcq', 'complete_code', 'find_bug'].includes(a.type)) {
      if (!Array.isArray(a.options) || a.options.length < 3) problems.push(`${where}: only ${a.options && a.options.length} options`);
      if (new Set(a.options).size !== a.options.length) problems.push(`${where}: duplicate options`);
      if (!(a.answerIndex >= 0 && a.answerIndex < a.options.length)) problems.push(`${where}: bad answerIndex`);
    }
    if (a.type === 'predict_output' && !(a.expectedOutput && a.expectedOutput.length)) problems.push(`${where}: no expected output`);
    if (a.type === 'write_code' && a.tests.requiredPatterns) {
      // Pattern-checked tasks (HTML/CSS and the pro skills): the model answer must pass its own checks.
      const missing = a.tests.requiredPatterns.filter((p) => !new RegExp(p, 'i').test(a.solution || ''));
      if (missing.length) problems.push(`${where}: solution fails ${missing.join(' | ')}`);
    } else if (a.type === 'write_code' && lang.id === 'javascript' && seed === 1) jsChecks.push({ where, a });
  }
  // The JavaScript write_code solutions must really produce the expected output in the sandbox.
  for (const { where, a } of jsChecks) {
    const r = await runJavaScript(a.solution);
    if (r.error || r.output.join('\n') !== a.tests.expectedOutput.join('\n')) problems.push(`${where}: JS solution mismatch ${JSON.stringify(r)}`);
    if (!new RegExp(a.tests.requiredPattern).test(a.solution)) problems.push(`${where}: solution fails its own pattern`);
  }
  problems.slice(0, 20).forEach((p) => console.log('PROBLEM', p));
  console.log(`Offline bank: ${n} activities generated, ${jsChecks.length} JS solutions executed, ${problems.length} problems`);
  process.exit(problems.length ? 1 : 0);
})();
