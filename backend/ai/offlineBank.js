'use strict';
/**
 * Offline activity generator.
 *
 * Builds a Bloom-level activity for any (concept, level, language) WITHOUT an AI
 * model, so KidsCode keeps working in schools with no internet or no API key
 * (proposal: low-bandwidth / offline PWA). Answers are always correct because
 * expected output comes from the interpreter and the programs are verified by
 * tests/verify-renderers.js.
 *
 * Activity shape (full, server-side - see grader.js for what learners see):
 * {
 *   type: 'mcq' | 'complete_code' | 'write_code' | 'predict_output' | 'find_bug' | 'create',
 *   concept, bloom, language, locale, title, prompt, code?, options?, answerIndex?,
 *   expectedOutput?, starterCode?, tests?, rubric?, hints: [3], explanation, source: 'offline'
 * }
 */
const { BY_ID: CONCEPTS, scenarios, signatures } = require('./concepts');
const { BY_ID: LANGS, constructPattern } = require('./languages');
const { BY_ID: BLOOM } = require('./bloom');
const { render, BLANK } = require('./program/render');
const { interpret } = require('./program/interpret');
const A = require('./program/ast');
const { mulberry32, shuffle, shuffleOptions, hashString } = require('./random');
const { rememberPool, createPool } = require('./moreContent');
const { PRO_BANK } = require('./proContent');

const tr = (obj, loc) => (obj ? obj[loc] || obj.en : '');

const UI = {
  rememberFallback: { en: 'Which line is an example of {concept}?', sw: 'Mstari upi ni mfano wa {concept}?' },
  understand: { en: 'Read this {lang} program. What does it do?', sw: 'Soma programu hii ya {lang}. Inafanya nini?' },
  understandCount: { en: 'Read this {lang} program. How many messages will it show when it runs?', sw: 'Soma programu hii ya {lang}. Itaonyesha jumbe ngapi ikiendeshwa?' },
  complete: { en: 'One line is missing (______). Pick the line that makes the program print exactly:', sw: 'Mstari mmoja haupo (______). Chagua mstari unaofanya programu ionyeshe hasa:' },
  write: { en: 'Replace the ✏️ line with your own code so the program prints exactly:', sw: 'Badilisha mstari wa ✏️ kwa msimbo wako ili programu ionyeshe hasa:' },
  predict: { en: 'Be the computer! What will this program print? Type each line of output on its own line.', sw: 'Kuwa kompyuta! Programu hii itaonyesha nini? Andika kila mstari wa matokeo kwenye mstari wake.' },
  predictBlocks: { en: 'Be the computer! What will the sprite say? Type each message on its own line, in order.', sw: 'Kuwa kompyuta! Mhusika atasema nini? Andika kila ujumbe kwenye mstari wake, kwa mpangilio.' },
  findBug: { en: 'This program should: {what}. But it has ONE mistake. Which line is wrong?', sw: 'Programu hii inapaswa: {what}. Lakini ina kosa MOJA. Mstari upi si sahihi?' },
  create: { en: 'Create your own program!', sw: 'Unda programu yako mwenyewe!' },
  createUse: { en: 'Your program must use: {concept}.', sw: 'Programu yako lazima itumie: {concept}.' },
  line: { en: 'Line', sw: 'Mstari' },
  writeHere: { en: '✏️ write the missing line here', sw: '✏️ andika mstari unaokosekana hapa' },
  hintPredict: { en: 'Trace it: go line by line and write down each variable\'s value as it changes.', sw: 'Fuatilia: pitia mstari kwa mstari na uandike thamani ya kila kigeu inapobadilika.' },
  hintPredict3: { en: 'The first line of output is: {line}', sw: 'Mstari wa kwanza wa matokeo ni: {line}' },
  hintBug: { en: 'Compare what each line DOES with what the program SHOULD do.', sw: 'Linganisha kile kila mstari UNACHOFANYA na kile programu INAPASWA kufanya.' },
  hintBug3: { en: 'The mistake is in a line containing: {snippet}', sw: 'Kosa liko katika mstari wenye: {snippet}' },
  hintMcq: { en: 'Cover the options and say the answer in your own words first, then find the closest option.', sw: 'Funika majibu na useme jibu kwa maneno yako kwanza, kisha tafuta jibu linalokaribiana zaidi.' },
  hintEliminate: { en: 'It is NOT: {option}', sw: 'SI: {option}' },
  hintComplete: { en: 'Run the program in your head with each option. Which one gives exactly the output shown?', sw: 'Endesha programu kichwani mwako kwa kila chaguo. Lipi linatoa matokeo yaliyoonyeshwa hasa?' },
  hintWrite: { en: 'Look at the lines around the ✏️ - the missing line must fit between them.', sw: 'Angalia mistari inayozunguka ✏️ - mstari unaokosekana lazima utoshee kati yake.' },
  hintWrite3: { en: 'The missing line starts like this: {start}', sw: 'Mstari unaokosekana unaanza hivi: {start}' },
  hintCreate: { en: 'Start small: make it print one thing first, then add the {concept} part.', sw: 'Anza kidogo: ifanye ionyeshe kitu kimoja kwanza, kisha ongeza sehemu ya {concept}.' },
  hintCreate3: { en: 'Plan it in 3 steps: 1) store the data, 2) do the {concept} part, 3) print the result.', sw: 'Panga kwa hatua 3: 1) hifadhi data, 2) fanya sehemu ya {concept}, 3) onyesha matokeo.' },
  correctLineIs: { en: 'The correct line is: {line}', sw: 'Mstari sahihi ni: {line}' },
  outputWas: { en: 'The program prints:\n{output}', sw: 'Programu inaonyesha:\n{output}' },
  rubricConcept: { en: 'Uses {concept}', sw: 'Inatumia {concept}' },
  rubricRuns: { en: 'Is a complete program that shows output', sw: 'Ni programu kamili inayoonyesha matokeo' },
  rubricOwn: { en: 'Has your own idea or data (not just the example)', sw: 'Ina wazo au data yako mwenyewe (si mfano tu)' },
  commentStart: { en: 'Write your program below', sw: 'Andika programu yako hapa chini' },
};

const fill = (template, vars) => template.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : `{${k}}`));
const ui = (key, loc, vars = {}) => fill(tr(UI[key], loc), vars);

function commentPrefix(language) {
  if (language === 'python') return '# ';
  if (language === 'blocks' || language === 'scratch') return '💬 ';
  return '// ';
}

function keyHeader(program, keyId, renderer) {
  const { lines } = render(program, renderer);
  return lines.filter((l) => l.stmtId === keyId && l.header).map((l) => l.text.trim()).join('  ⏎  ');
}

function title(conceptObj, level, loc) {
  return `${BLOOM[level].icon} ${tr(BLOOM[level].name, loc)}: ${tr(conceptObj.name, loc)}`;
}

// ---------------------------------------------------------------------------
// Programming concepts
// ---------------------------------------------------------------------------

function buildProgrammingActivity({ concept, level, language, loc, rng }) {
  const c = CONCEPTS[concept];
  const lang = LANGS[language];
  const r = lang.renderer;
  const base = { concept, bloom: level, language, locale: loc, title: title(c, level, loc), source: 'offline' };
  const si = Math.floor(rng() * scenarios[concept].length);
  const sc = scenarios[concept][si](rng, loc);
  const expectedOutput = interpret(sc.program);

  if (level === 'remember') {
    // Variant 0 is the built-in question; the rest come from rememberPool.
    const pool = rememberPool[concept] || [];
    const ri = Math.floor(rng() * (pool.length + 1));
    if (ri > 0 || concept === 'sequence') {
      const q = ri > 0 ? pool[ri - 1] : c.remember;
      const { options, answerIndex } = shuffleOptions(rng, tr(q.correct, loc), q.wrong.map((w) => tr(w, loc)));
      return {
        ...base, type: 'mcq', prompt: tr(q.q, loc), options, answerIndex, variantKey: `remember:${ri}`,
        hints: [tr(c.tip, loc), ui('hintMcq', loc), ui('hintEliminate', loc, { option: options.find((o, i) => i !== answerIndex) })],
        explanation: `${tr(c.explain, loc)} ${tr(c.analogy, loc)}`,
      };
    }
    const sig = signatures[concept]();
    const correct = keyHeader(sig.program, sig.keyId, r);
    const others = shuffle(rng, lang.concepts.filter((x) => x !== concept && signatures[x]))
      .map((x) => { const s = signatures[x](); return keyHeader(s.program, s.keyId, r); })
      .filter((o) => o !== correct)
      .slice(0, 3);
    const { options, answerIndex } = shuffleOptions(rng, correct, others);
    return {
      ...base, type: 'mcq', variantKey: 'remember:0',
      prompt: `${tr(c.rememberAsk, loc) || ui('rememberFallback', loc, { concept: tr(c.name, loc) })} (${lang.name})`,
      options, answerIndex, codeOptions: true,
      hints: [tr(c.tip, loc), ui('hintMcq', loc), ui('hintEliminate', loc, { option: options.find((o, i) => i !== answerIndex) })],
      explanation: `${tr(c.explain, loc)}\n${ui('correctLineIs', loc, { line: correct })}`,
    };
  }

  if (level === 'understand') {
    const { code } = render(sc.program, r);
    // Two kinds of Understand question per program: "what does it do?" and
    // "how many messages will it show?" (answer computed by the interpreter).
    if (rng() < 0.5) {
      const n = expectedOutput.length;
      const wrong = [...new Set([n + 1, n - 1, n * 2, n + 2, n + 3])].filter((w) => w > 0 && w !== n).slice(0, 3).map(String);
      const { options, answerIndex } = shuffleOptions(rng, String(n), wrong);
      return {
        ...base, type: 'mcq', prompt: ui('understandCount', loc, { lang: lang.name }), code, options, answerIndex, variantKey: `understand:${si}:count`,
        hints: [tr(c.tip, loc), ui('hintPredict', loc), ui('hintEliminate', loc, { option: options.find((o, i) => i !== answerIndex) })],
        explanation: ui('outputWas', loc, { output: expectedOutput.join('\n') }),
      };
    }
    const { options, answerIndex } = shuffleOptions(rng, tr(sc.what, loc), sc.notWhat.map((w) => tr(w, loc)));
    return {
      ...base, type: 'mcq', prompt: ui('understand', loc, { lang: lang.name }), code, options, answerIndex, variantKey: `understand:${si}`,
      hints: [tr(c.tip, loc), ui('hintPredict', loc), ui('hintEliminate', loc, { option: options.find((o, i) => i !== answerIndex) })],
      explanation: `${tr(sc.what, loc)}.\n${ui('outputWas', loc, { output: expectedOutput.join('\n') })}`,
    };
  }

  if (level === 'apply') {
    const correctLine = keyHeader(sc.program, sc.keyId, r);
    if (lang.runtime === 'js') {
      const starter = render(sc.program, r, { blankId: sc.keyId }).code.replace(BLANK, `// ${ui('writeHere', loc).replace(/^✏️ /, '✏️ ')}`);
      return {
        ...base, type: 'write_code', variantKey: `apply:${si}`,
        prompt: ui('write', loc), expectedOutputShown: expectedOutput, starterCode: starter,
        tests: { expectedOutput, requiredPattern: (constructPattern(concept, language) || /./).source },
        hints: [tr(c.tip, loc), ui('hintWrite', loc), ui('hintWrite3', loc, { start: correctLine.slice(0, Math.max(4, Math.ceil(correctLine.length / 2))) + '…' })],
        explanation: ui('correctLineIs', loc, { line: correctLine }),
        solution: render(sc.program, r).code,
      };
    }
    const distractors = sc.mutations
      .filter((m) => m.target === sc.keyId)
      .map((m) => keyHeader(A.mapStmt(sc.program, m.target, m.apply), sc.keyId, r))
      .filter((h) => h !== correctLine);
    const { options, answerIndex } = shuffleOptions(rng, correctLine, distractors.slice(0, 3));
    return {
      ...base, type: 'complete_code', variantKey: `apply:${si}`, prompt: ui('complete', loc), expectedOutputShown: expectedOutput,
      code: render(sc.program, r, { blankId: sc.keyId }).code, options, answerIndex, codeOptions: true,
      hints: [tr(c.tip, loc), ui('hintComplete', loc), ui('hintEliminate', loc, { option: options.find((o, i) => i !== answerIndex) })],
      explanation: ui('correctLineIs', loc, { line: correctLine }),
    };
  }

  if (level === 'analyze') {
    const { code } = render(sc.program, r);
    const isBlocks = r === 'scratch' || r === 'blocks';
    return {
      ...base, type: 'predict_output', variantKey: `analyze:${si}`, prompt: ui(isBlocks ? 'predictBlocks' : 'predict', loc), code, expectedOutput,
      hints: [tr(c.tip, loc), ui('hintPredict', loc), ui('hintPredict3', loc, { line: expectedOutput[0] || '' })],
      explanation: ui('outputWas', loc, { output: expectedOutput.join('\n') }),
    };
  }

  if (level === 'evaluate') {
    const mi = Math.floor(rng() * sc.mutations.length);
    const m = sc.mutations[mi];
    const buggy = A.mapStmt(sc.program, m.target, m.apply);
    const { code, lines } = render(buggy, r);
    const numbered = lines.map((l, i) => ({ ...l, n: i + 1 }));
    const bugLine = numbered.find((l) => l.stmtId === m.target && l.header);
    const seen = new Set([m.target]);
    const candidates = shuffle(rng, numbered.filter((l) => l.header && l.stmtId != null && !seen.has(l.stmtId) && l.text.trim() && (seen.add(l.stmtId) || true)));
    const pickLines = [bugLine, ...candidates.slice(0, 3)].sort((a, b) => a.n - b.n);
    const label = (l) => `${ui('line', loc)} ${l.n}: ${l.text.trim()}`;
    const options = pickLines.map(label);
    return {
      ...base, type: 'find_bug', variantKey: `evaluate:${si}:${mi}`, prompt: ui('findBug', loc, { what: tr(sc.what, loc).replace(/^./, (ch) => ch.toLowerCase()) }),
      code, showLineNumbers: true, options, answerIndex: options.indexOf(label(bugLine)), codeOptions: true, bugLine: bugLine.n,
      hints: [tr(c.tip, loc), ui('hintBug', loc), ui('hintBug3', loc, { snippet: bugLine.text.trim().slice(0, 12) })],
      explanation: `${ui('line', loc)} ${bugLine.n}: ${tr(m.why, loc)}`,
    };
  }

  // create: the built-in idea plus extra ones from createPool
  const pattern = constructPattern(concept, language);
  const cp = commentPrefix(language);
  const ideas = [c.create, ...(createPool[concept] || [])];
  const ci = Math.floor(rng() * ideas.length);
  return {
    ...base, type: 'create', variantKey: `create:${ci}`,
    prompt: `${ui('create', loc)} ${tr(ideas[ci], loc)}`,
    starterCode: `${cp}${ui('commentStart', loc)}\n`,
    rubric: [
      { id: 'uses_concept', label: ui('rubricConcept', loc, { concept: tr(c.name, loc) }), pattern: pattern ? pattern.source : null },
      { id: 'complete', label: ui('rubricRuns', loc) },
      { id: 'original', label: ui('rubricOwn', loc) },
    ],
    tests: lang.runtime === 'js' ? { mustRun: true, requiredPattern: pattern ? pattern.source : null } : { requiredPattern: pattern ? pattern.source : null },
    hints: [ui('createUse', loc, { concept: tr(c.name, loc) }), ui('hintCreate', loc, { concept: tr(c.name, loc) }), ui('hintCreate3', loc, { concept: tr(c.name, loc) })],
    explanation: tr(c.explain, loc),
  };
}

// ---------------------------------------------------------------------------
// Web concepts (HTML & CSS) - hand-written bank
// ---------------------------------------------------------------------------

const t = (en, sw) => ({ en, sw });
const WEB = {
  html_structure: {
    remember: [{ q: t('Which tag makes the biggest heading on a web page?', 'Lebo ipi inatengeneza kichwa kikubwa zaidi kwenye ukurasa wa wavuti?'), correct: '<h1>', wrong: ['<p>', '<li>', '<h6>'] },
      { q: t('Which tag makes a paragraph of text?', 'Lebo ipi inatengeneza aya ya maandishi?'), correct: '<p>', wrong: ['<h1>', '<ul>', '<img>'] }],
    understand: [{ code: '<ul>\n  <li>Maasai Mara</li>\n  <li>Lake Nakuru</li>\n  <li>Diani Beach</li>\n</ul>', correct: t('A bulleted list of three places', 'Orodha ya vitone ya maeneo matatu'), wrong: [t('A heading with three words', 'Kichwa chenye maneno matatu'), t('A numbered list of three places', 'Orodha yenye namba ya maeneo matatu'), t('Three pictures of places', 'Picha tatu za maeneo')] }],
    apply: [{ prompt: t('Write HTML with a heading that says "My County" and a paragraph about your county.', 'Andika HTML yenye kichwa kinachosema "Kaunti Yangu" na aya kuhusu kaunti yako.'), patterns: ['<h1[^>]*>[\\s\\S]*<\\/h1>', '<p[^>]*>[\\s\\S]*<\\/p>'], start: '<h1>', solution: '<h1>My County</h1>\n<p>Nakuru is home to Lake Nakuru and many flamingos.</p>' }],
    analyze: [{ code: '<h1>Climate Club</h1>\n<p>We plant trees every Friday.</p>\n<ol>\n  <li>Collect seedlings</li>\n  <li>Dig holes</li>\n</ol>', q: t('How many numbered items will this page show?', 'Ukurasa huu utaonyesha vipengele vingapi vyenye namba?'), correct: '2', wrong: ['1', '3', '4'] }],
    evaluate: [{ lines: ['<h1>Our School</h1>', '<p>We love coding.', '<ul>', '  <li>Football</li>', '</ul>'], bug: 2, why: t('The paragraph is never closed - it needs </p> at the end.', 'Aya haijafungwa - inahitaji </p> mwishoni.'), what: t('show a heading, a paragraph and a list', 'kuonyesha kichwa, aya na orodha') },
      { lines: ['<h1>Wildlife</h1>', '<p>Elephants are big.</h1>', '<ul>', '  <li>Lion</li>', '</ul>'], bug: 2, why: t('The paragraph opens with <p> but closes with </h1>. Tags must match.', 'Aya inafunguliwa na <p> lakini inafungwa na </h1>. Lebo lazima zilingane.'), what: t('show a heading, a paragraph and a list', 'kuonyesha kichwa, aya na orodha') }],
  },
  css_styling: {
    remember: [{ q: t('Which CSS property changes the colour of text?', 'Sifa ipi ya CSS inabadilisha rangi ya maandishi?'), correct: 'color', wrong: ['background-color', 'font-size', 'margin'] },
      { q: t('Which CSS property makes text bigger or smaller?', 'Sifa ipi ya CSS inafanya maandishi kuwa makubwa au madogo?'), correct: 'font-size', wrong: ['color', 'border', 'padding'] }],
    understand: [{ code: 'h1 {\n  color: green;\n  font-size: 40px;\n}', correct: t('Makes every main heading green and 40 pixels tall', 'Inafanya kila kichwa kikuu kiwe kijani na urefu wa pikseli 40'), wrong: [t('Makes the whole page background green', 'Inafanya rangi ya nyuma ya ukurasa mzima kuwa kijani'), t('Adds a heading that says "green"', 'Inaongeza kichwa kinachosema "green"'), t('Makes paragraphs green', 'Inafanya aya ziwe kijani')] }],
    apply: [{ prompt: t('Write a CSS rule that makes all paragraphs (p) blue.', 'Andika kanuni ya CSS inayofanya aya zote (p) ziwe bluu.'), patterns: ['p\\s*\\{[^}]*color\\s*:\\s*blue'], start: 'p {', solution: 'p {\n  color: blue;\n}' }],
    analyze: [{ code: 'p { color: red; }\np { color: blue; }', q: t('Both rules style paragraphs. What colour will the paragraphs be?', 'Kanuni zote mbili zinapamba aya. Aya zitakuwa na rangi gani?'), correct: 'blue', wrong: ['red', 'purple (mixed)', 'black'] }],
    evaluate: [{ lines: ['h1 {', '  color: green', '  font-size: 32px;', '}'], bug: 2, why: t('Every property must end with a semicolon ; - "color: green" is missing one.', 'Kila sifa lazima iishie na nukta-mkato ; - "color: green" inaikosa.'), what: t('make headings green and 32px', 'kufanya vichwa viwe kijani na 32px') },
      { lines: ['body {', '  background-color lightyellow;', '  margin: 20px;', '}'], bug: 2, why: t('A property needs a colon between its name and value: background-color: lightyellow;', 'Sifa inahitaji nukta-pacha kati ya jina na thamani: background-color: lightyellow;'), what: t('give the page a light yellow background and a margin', 'kuupa ukurasa rangi ya manjano hafifu na nafasi pembeni') }],
  },
};

// More HTML & CSS questions, so each level has several different ones to practise with.
WEB.html_structure.remember.push(
  { q: t('Which tag adds a picture to a web page?', 'Lebo ipi inaongeza picha kwenye ukurasa wa wavuti?'), correct: '<img>', wrong: ['<p>', '<pic>', '<h2>'] },
  { q: t('Which tag makes a link to another page?', 'Lebo ipi inatengeneza kiungo kwenda ukurasa mwingine?'), correct: '<a>', wrong: ['<link>', '<p>', '<li>'] },
  { q: t('Which tag holds one item inside a list?', 'Lebo ipi inashika kipengele kimoja ndani ya orodha?'), correct: '<li>', wrong: ['<ul>', '<h1>', '<item>'] },
);
WEB.html_structure.understand.push(
  { code: '<ol>\n  <li>Wake up</li>\n  <li>Eat breakfast</li>\n</ol>', correct: t('A numbered list with two steps', 'Orodha yenye namba yenye hatua mbili'), wrong: [t('A bulleted list with two steps', 'Orodha ya vitone yenye hatua mbili'), t('Two headings', 'Vichwa viwili'), t('One paragraph', 'Aya moja')] },
  { code: '<a href="https://kidscode.example">Start coding</a>', correct: t('A link that says "Start coding"', 'Kiungo kinachosema "Start coding"'), wrong: [t('A heading that says "Start coding"', 'Kichwa kinachosema "Start coding"'), t('A picture of a computer', 'Picha ya kompyuta'), t('A list with one item', 'Orodha yenye kipengele kimoja')] },
);
WEB.html_structure.apply.push(
  { prompt: t('Write HTML for a bulleted list (ul) of 3 fruits.', 'Andika HTML ya orodha ya vitone (ul) ya matunda 3.'), patterns: [/<ul[^>]*>[\s\S]*<\/ul>/.source, /(<li[^>]*>[\s\S]*?<\/li>[\s\S]*){3}/.source], start: '<ul>', solution: '<ul>\n  <li>Mango</li>\n  <li>Banana</li>\n  <li>Pawpaw</li>\n</ul>' },
);
WEB.html_structure.analyze.push(
  { code: '<ul>\n  <li>Nairobi</li>\n  <li>Mombasa</li>\n  <li>Kisumu</li>\n</ul>', q: t('How many items will this list show?', 'Orodha hii itaonyesha vipengele vingapi?'), correct: '3', wrong: ['1', '2', '4'] },
  { code: '<h1>My Farm</h1>\n<h2>Animals</h2>\n<p>We keep goats.</p>\n<h2>Crops</h2>', q: t('How many headings are on this page (h1 and h2)?', 'Kuna vichwa vingapi kwenye ukurasa huu (h1 na h2)?'), correct: '3', wrong: ['1', '2', '4'] },
);
WEB.html_structure.evaluate.push(
  { lines: ['<h1>Fruits</h1>', '<ul>', '  <li>Mango', '  <li>Banana</li>', '</ul>'], bug: 3, why: t('The first list item is never closed - it needs </li>.', 'Kipengele cha kwanza cha orodha hakijafungwa - kinahitaji </li>.'), what: t('show a heading and a list of two fruits', 'kuonyesha kichwa na orodha ya matunda mawili') },
);
WEB.css_styling.remember.push(
  { q: t('Which CSS property changes the colour behind an element?', 'Sifa ipi ya CSS inabadilisha rangi nyuma ya kipengele?'), correct: 'background-color', wrong: ['color', 'font-size', 'border-color'] },
  { q: t('Which symbols hold the properties of a CSS rule?', 'Alama zipi zinashika sifa za kanuni ya CSS?'), correct: '{ }', wrong: ['( )', '< >', '" "'] },
  { q: t('Which property adds space INSIDE an element, around its content?', 'Sifa ipi inaongeza nafasi NDANI ya kipengele, kuzunguka maudhui yake?'), correct: 'padding', wrong: ['margin', 'color', 'font-size'] },
);
WEB.css_styling.understand.push(
  { code: 'p {\n  font-size: 20px;\n}', correct: t('Makes all paragraph text 20 pixels big', 'Inafanya maandishi yote ya aya kuwa pikseli 20'), wrong: [t('Makes the page 20 pixels wide', 'Inafanya ukurasa kuwa na upana wa pikseli 20'), t('Adds 20 paragraphs', 'Inaongeza aya 20'), t('Makes headings 20 pixels big', 'Inafanya vichwa kuwa pikseli 20')] },
  { code: 'body {\n  background-color: lightblue;\n}', correct: t('Gives the whole page a light blue background', 'Inaupa ukurasa mzima rangi ya nyuma ya bluu hafifu'), wrong: [t('Makes all the text light blue', 'Inafanya maandishi yote kuwa bluu hafifu'), t('Adds a light blue border', 'Inaongeza mpaka wa bluu hafifu'), t('Makes only headings light blue', 'Inafanya vichwa tu kuwa bluu hafifu')] },
);
WEB.css_styling.apply.push(
  { prompt: t('Write a CSS rule that makes all h1 headings 40px big.', 'Andika kanuni ya CSS inayofanya vichwa vyote vya h1 kuwa 40px.'), patterns: [/h1\s*\{[^}]*font-size\s*:\s*40px/.source], start: 'h1 {', solution: 'h1 {\n  font-size: 40px;\n}' },
);
WEB.css_styling.analyze.push(
  { code: 'h1 { color: green; }\np { color: orange; }', q: t('What colour will the paragraphs be?', 'Aya zitakuwa na rangi gani?'), correct: 'orange', wrong: ['green', 'black', 'green and orange'] },
  { code: 'li { font-size: 18px; }\nli { font-size: 24px; }', q: t('How big will the list text be?', 'Maandishi ya orodha yatakuwa makubwa kiasi gani?'), correct: '24px', wrong: ['18px', '42px', '21px'] },
);
WEB.css_styling.evaluate.push(
  { lines: ['p {', '  colour: red;', '  font-size: 16px;', '}'], bug: 2, why: t('CSS uses the American spelling: color, not colour.', 'CSS inatumia tahajia ya Kimarekani: color, si colour.'), what: t('make paragraphs red and 16px', 'kufanya aya ziwe nyekundu na 16px') },
);
WEB.html_structure.apply.push(
  { prompt: t('Write HTML for a picture of a lion using the file "lion.jpg" (remember the alt text).', 'Andika HTML ya picha ya simba ukitumia faili "lion.jpg" (kumbuka maandishi ya alt).'), patterns: ['<img[^>]*src\\s*=\\s*["\']?lion\\.jpg', '<img[^>]*alt\\s*='], start: '<img src=', solution: '<img src="lion.jpg" alt="A lion resting">' },
);
WEB.html_structure.understand.push(
  { code: '<h2>Our Garden</h2>\n<p>We grow sukuma wiki and tomatoes.</p>', correct: t('A small heading followed by one paragraph', 'Kichwa kidogo kikifuatwa na aya moja'), wrong: [t('Two paragraphs', 'Aya mbili'), t('A list of vegetables', 'Orodha ya mboga'), t('A picture of a garden', 'Picha ya bustani')] },
);
WEB.html_structure.analyze.push(
  { code: '<p>One</p>\n<p>Two</p>\n<h1>Three</h1>\n<p>Four</p>', q: t('How many paragraphs will this page show?', 'Ukurasa huu utaonyesha aya ngapi?'), correct: '3', wrong: ['4', '2', '1'] },
);
WEB.html_structure.evaluate.push(
  { lines: ['<h1>My Pets</h1>', '<img src="cat.jpg">', '<p>This is my cat.</p>'], bug: 2, why: t('Every picture needs alt text describing it, for people who cannot see it.', 'Kila picha inahitaji maandishi ya alt yanayoielezea, kwa watu wasioweza kuiona.'), what: t('show a heading, a picture of a cat and a sentence', 'kuonyesha kichwa, picha ya paka na sentensi') },
);
WEB.css_styling.apply.push(
  { prompt: t('Write a CSS rule that gives the page body a lightyellow background.', 'Andika kanuni ya CSS inayoupa mwili wa ukurasa rangi ya nyuma lightyellow.'), patterns: ['body\\s*\\{[^}]*background(-color)?\\s*:\\s*lightyellow'], start: 'body {', solution: 'body {\n  background-color: lightyellow;\n}' },
  { prompt: t('Write a CSS rule that makes h2 headings purple.', 'Andika kanuni ya CSS inayofanya vichwa vya h2 kuwa zambarau (purple).'), patterns: ['h2\\s*\\{[^}]*color\\s*:\\s*purple'], start: 'h2 {', solution: 'h2 {\n  color: purple;\n}' },
);
WEB.css_styling.understand.push(
  { code: 'li {\n  border: 2px solid green;\n}', correct: t('Puts a thin green border around every list item', 'Inaweka mpaka mwembamba wa kijani kuzunguka kila kipengele cha orodha'), wrong: [t('Makes list text green', 'Inafanya maandishi ya orodha kuwa kijani'), t('Adds 2 new list items', 'Inaongeza vipengele 2 vipya vya orodha'), t('Makes the page background green', 'Inafanya rangi ya nyuma ya ukurasa kuwa kijani')] },
);
WEB.css_styling.analyze.push(
  { code: 'p { color: black; }\n.note { color: red; }\n\n<p class="note">Bring water</p>', q: t('What colour is the paragraph with class="note"?', 'Aya yenye class="note" ina rangi gani?'), correct: 'red', wrong: ['black', 'blue', 'black and red'] },
);
WEB.html_structure.remember.push(
  { q: t('Which tag makes a numbered list?', 'Lebo ipi inatengeneza orodha yenye namba?'), correct: '<ol>', wrong: ['<ul>', '<li>', '<num>'] },
);
WEB.html_structure.understand.push(
  { code: '<img src="flag.png" alt="The Kenyan flag">', correct: t('Shows a picture of the Kenyan flag', 'Inaonyesha picha ya bendera ya Kenya'), wrong: [t('Writes the words "flag.png" on the page', 'Inaandika maneno "flag.png" kwenye ukurasa'), t('Makes a link to Kenya', 'Inatengeneza kiungo cha Kenya'), t('Makes a heading', 'Inatengeneza kichwa')] },
  { code: '<p>Plant a tree <b>today</b>!</p>', correct: t('A paragraph where the word "today" is bold', 'Aya ambayo neno "today" limekozwa'), wrong: [t('Two paragraphs', 'Aya mbili'), t('A heading and a paragraph', 'Kichwa na aya'), t('A list with one item', 'Orodha yenye kipengele kimoja')] },
);
WEB.html_structure.apply.push(
  { prompt: t('Write HTML for a numbered list (ol) with 2 steps for planting a tree.', 'Andika HTML ya orodha yenye namba (ol) yenye hatua 2 za kupanda mti.'), patterns: ['<ol[^>]*>[\\s\\S]*<\\/ol>', '(<li[^>]*>[\\s\\S]*?<\\/li>[\\s\\S]*){2}'], start: '<ol>', solution: '<ol>\n  <li>Dig a hole</li>\n  <li>Plant the seedling</li>\n</ol>' },
  { prompt: t('Write HTML for a link that says "Visit KidsCode" and goes to https://kidscode.example', 'Andika HTML ya kiungo kinachosema "Visit KidsCode" kinachokwenda https://kidscode.example'), patterns: ['<a[^>]*href\\s*=\\s*["\']?https:\\/\\/kidscode\\.example', '>\\s*Visit KidsCode\\s*<\\/a>'], start: '<a href=', solution: '<a href="https://kidscode.example">Visit KidsCode</a>' },
  { prompt: t('Write HTML for a small heading (h2) that says "Our Club" and a paragraph under it.', 'Andika HTML ya kichwa kidogo (h2) kinachosema "Our Club" na aya chini yake.'), patterns: ['<h2[^>]*>\\s*Our Club\\s*<\\/h2>', '<p[^>]*>[\\s\\S]*<\\/p>'], start: '<h2>', solution: '<h2>Our Club</h2>\n<p>We meet every Tuesday to code.</p>' },
);
WEB.html_structure.analyze.push(
  { code: '<ol>\n  <li>Wake up</li>\n  <li>Wash</li>\n  <li>Eat</li>\n</ol>', q: t('What number will appear next to "Eat"?', 'Namba gani itaonekana karibu na "Eat"?'), correct: '3', wrong: ['1', '2', '4'] },
  { code: '<p>Hello</p>\n<!-- <p>Secret</p> -->\n<p>Bye</p>', q: t('How many paragraphs will you SEE on the page?', 'Utaona aya ngapi kwenye ukurasa?'), correct: '2', wrong: ['3', '1', '0'] },
);
WEB.html_structure.evaluate.push(
  { lines: ['<h1>Sports Day</h1>', '<p>Races start at 9.</p>', '<ul>', '  <li>Sack race</li>', '</ol>'], bug: 5, why: t('The list opens with <ul> but closes with </ol>. They must match.', 'Orodha inafunguliwa na <ul> lakini inafungwa na </ol>. Lazima zilingane.'), what: t('show a heading, a paragraph and a list of races', 'kuonyesha kichwa, aya na orodha ya mashindano') },
  { lines: ['<h1>My Village</h1>', '<a href="map.html>See the map</a>', '<p>It is near a river.</p>'], bug: 2, why: t('The link address is missing its closing quote mark: "map.html"', 'Anwani ya kiungo inakosa alama ya nukuu ya kufunga: "map.html"'), what: t('show a heading, a link to a map and a paragraph', 'kuonyesha kichwa, kiungo cha ramani na aya') },
);
WEB.css_styling.remember.push(
  { q: t('Which property makes text bold?', 'Sifa ipi inafanya maandishi kuwa mazito?'), correct: 'font-weight', wrong: ['font-size', 'color', 'text-bold'] },
);
WEB.css_styling.understand.push(
  { code: 'h1 {\n  text-align: center;\n}', correct: t('Puts main headings in the middle of the page', 'Inaweka vichwa vikuu katikati ya ukurasa'), wrong: [t('Makes headings bigger', 'Inafanya vichwa vikubwa zaidi'), t('Puts headings at the bottom', 'Inaweka vichwa chini'), t('Makes headings bold', 'Inafanya vichwa vizito')] },
  { code: 'p {\n  margin: 30px;\n}', correct: t('Adds space outside every paragraph', 'Inaongeza nafasi nje ya kila aya'), wrong: [t('Makes paragraph text 30px big', 'Inafanya maandishi ya aya kuwa 30px'), t('Adds 30 paragraphs', 'Inaongeza aya 30'), t('Draws a border around paragraphs', 'Inachora mpaka kuzunguka aya')] },
);
WEB.css_styling.apply.push(
  { prompt: t('Write a CSS rule that puts all h1 headings in the centre of the page.', 'Andika kanuni ya CSS inayoweka vichwa vyote vya h1 katikati ya ukurasa.'), patterns: ['h1\\s*\\{[^}]*text-align\\s*:\\s*center'], start: 'h1 {', solution: 'h1 {\n  text-align: center;\n}' },
  { prompt: t('Write a CSS rule that gives list items (li) 10px of padding.', 'Andika kanuni ya CSS inayovipa vipengele vya orodha (li) padding ya 10px.'), patterns: ['li\\s*\\{[^}]*padding\\s*:\\s*10px'], start: 'li {', solution: 'li {\n  padding: 10px;\n}' },
);
WEB.css_styling.analyze.push(
  { code: 'body { color: navy; }\n/* no other rules */\n\n<p>Hello</p>', q: t('What colour is the paragraph text?', 'Maandishi ya aya yana rangi gani?'), correct: 'navy', wrong: ['black', 'white', 'red'] },
  { code: 'p { font-size: 16px; }\np { color: green; }', q: t('How will paragraphs look?', 'Aya zitaonekanaje?'), correct: '16px and green', wrong: ['16px and black', 'green but default size', 'nothing changes'] },
);
WEB.css_styling.evaluate.push(
  { lines: ['li {', '  font-size 18px;', '  color: purple;', '}'], bug: 2, why: t('A property needs a colon between its name and value: font-size: 18px;', 'Sifa inahitaji nukta-pacha kati ya jina na thamani: font-size: 18px;'), what: t('make list items 18px and purple', 'kufanya vipengele vya orodha viwe 18px na zambarau') },
  { lines: ['h2 {', '  color: orange;', '}', 'p', '  color: grey;', '}'], bug: 4, why: t('The p rule is missing its opening curly brace {.', 'Kanuni ya p inakosa mabano ya kufungua {.'), what: t('make h2 orange and paragraphs grey', 'kufanya h2 iwe chungwa na aya ziwe kijivu') },
);
WEB.css_styling.evaluate.push(
  { lines: ['h1 {', '  font-size: 30px;', '  color: blue;'], bug: 3, why: t('The rule is never closed - it needs a } at the end.', 'Kanuni haijafungwa - inahitaji } mwishoni.'), what: t('make headings 30px and blue', 'kufanya vichwa viwe 30px na bluu') },
);

const pickIndex = (rng, arr) => Math.floor(rng() * arr.length);

function buildWebActivity({ concept, level, language, loc, rng }) {
  const c = CONCEPTS[concept];
  const base = { concept, bloom: level, language, locale: loc, title: title(c, level, loc), source: 'offline' };
  const bank = WEB[concept];
  const hintsBase = [tr(c.tip, loc), ui('hintMcq', loc)];

  if (level === 'remember' || level === 'analyze') {
    const ii = pickIndex(rng, bank[level]);
    const item = bank[level][ii];
    const { options, answerIndex } = shuffleOptions(rng, item.correct, item.wrong);
    return { ...base, type: 'mcq', variantKey: `${level}:${ii}`, prompt: tr(item.q, loc), code: item.code, options, answerIndex, codeOptions: level === 'remember',
      hints: [...hintsBase, ui('hintEliminate', loc, { option: options.find((o, i) => i !== answerIndex) })], explanation: `${tr(c.explain, loc)}` };
  }
  if (level === 'understand') {
    const ii = pickIndex(rng, bank.understand);
    const item = bank.understand[ii];
    const { options, answerIndex } = shuffleOptions(rng, tr(item.correct, loc), item.wrong.map((w) => tr(w, loc)));
    return { ...base, type: 'mcq', variantKey: `understand:${ii}`, prompt: ui('understand', loc, { lang: 'HTML/CSS' }), code: item.code, options, answerIndex,
      hints: [...hintsBase, ui('hintEliminate', loc, { option: options.find((o, i) => i !== answerIndex) })], explanation: tr(item.correct, loc) };
  }
  if (level === 'apply') {
    const ii = pickIndex(rng, bank.apply);
    const item = bank.apply[ii];
    return { ...base, type: 'write_code', variantKey: `apply:${ii}`, prompt: tr(item.prompt, loc), starterCode: '', tests: { requiredPatterns: item.patterns },
      hints: [tr(c.tip, loc), ui('hintWrite', loc), ui('hintWrite3', loc, { start: item.start })], explanation: item.solution, solution: item.solution };
  }
  if (level === 'evaluate') {
    const ii = pickIndex(rng, bank.evaluate);
    const item = bank.evaluate[ii];
    const label = (n) => `${ui('line', loc)} ${n}: ${item.lines[n - 1].trim()}`;
    const others = shuffle(rng, item.lines.map((_, i) => i + 1).filter((n) => n !== item.bug)).slice(0, 3);
    const options = [item.bug, ...others].sort((a, b) => a - b).map(label);
    return { ...base, type: 'find_bug', variantKey: `evaluate:${ii}`, prompt: ui('findBug', loc, { what: tr(item.what, loc) }), code: item.lines.join('\n'), showLineNumbers: true,
      options, answerIndex: options.indexOf(label(item.bug)), codeOptions: true, bugLine: item.bug,
      hints: [tr(c.tip, loc), ui('hintBug', loc), ui('hintBug3', loc, { snippet: item.lines[item.bug - 1].trim().slice(0, 10) })],
      explanation: `${ui('line', loc)} ${item.bug}: ${tr(item.why, loc)}` };
  }
  const pattern = constructPattern(concept, language);
  const ideas = [c.create, ...(createPool[concept] || [])];
  const ci = pickIndex(rng, ideas);
  return { ...base, type: 'create', variantKey: `create:${ci}`, prompt: `${ui('create', loc)} ${tr(ideas[ci], loc)}`, starterCode: '<!-- ' + ui('commentStart', loc) + ' -->\n',
    rubric: [{ id: 'uses_concept', label: ui('rubricConcept', loc, { concept: tr(c.name, loc) }), pattern: pattern ? pattern.source : null },
      { id: 'complete', label: ui('rubricRuns', loc) }, { id: 'original', label: ui('rubricOwn', loc) }],
    tests: { requiredPattern: pattern ? pattern.source : null },
    hints: [ui('createUse', loc, { concept: tr(c.name, loc) }), ui('hintCreate', loc, { concept: tr(c.name, loc) }), ui('hintCreate3', loc, { concept: tr(c.name, loc) })],
    explanation: tr(c.explain, loc) };
}

// ---------------------------------------------------------------------------
// Pro skills of the Coding Journey (strings ... data & APIs) - hand-written bank
// ---------------------------------------------------------------------------

/** Resolve a bank value for one language + locale: L(python, js), t(en, sw), arrays, plain values. */
function pv(v, language, loc) {
  if (v === null || v === undefined) return v;
  if (v instanceof RegExp || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map((x) => pv(x, language, loc));
  if ('python' in v || 'javascript' in v) return pv(v[language] !== undefined ? v[language] : v.python, language, loc);
  if ('en' in v) return v[loc] || v.en;
  return v;
}
const reSource = (r) => (r instanceof RegExp ? r.source : String(r));

function buildProActivity({ concept, level, language, loc, rng }) {
  const c = CONCEPTS[concept];
  const base = { concept, bloom: level, language, locale: loc, title: title(c, level, loc), source: 'offline' };
  const bank = PRO_BANK[concept];
  const val = (v) => pv(v, language, loc);
  const hintsBase = [tr(c.tip, loc), ui('hintMcq', loc)];

  if (level === 'remember' || level === 'understand' || level === 'analyze') {
    const ii = pickIndex(rng, bank[level]);
    const item = bank[level][ii];
    const { options, answerIndex } = shuffleOptions(rng, String(val(item.correct)), val(item.wrong).map(String));
    const prompt = item.q ? val(item.q) : ui('understand', loc, { lang: LANGS[language].name });
    return { ...base, type: 'mcq', variantKey: `${level}:${ii}`, prompt, code: item.code ? val(item.code) : undefined, options, answerIndex,
      codeOptions: Boolean(item.codeOptions),
      hints: [...hintsBase, ui('hintEliminate', loc, { option: options.find((o, i) => i !== answerIndex) })],
      explanation: level === 'remember' ? tr(c.explain, loc) : `${options[answerIndex]} - ${tr(c.explain, loc)}` };
  }
  if (level === 'apply') {
    const ii = pickIndex(rng, bank.apply);
    const item = bank.apply[ii];
    const patterns = val(item.patterns).map(reSource);
    return { ...base, type: 'write_code', variantKey: `apply:${ii}`, prompt: val(item.prompt), starterCode: val(item.starter) || '', tests: { requiredPatterns: patterns },
      hints: [tr(c.tip, loc), ui('hintWrite', loc), ui('hintWrite3', loc, { start: val(item.start) })], explanation: val(item.solution), solution: val(item.solution) };
  }
  if (level === 'evaluate') {
    const ii = pickIndex(rng, bank.evaluate);
    const item = bank.evaluate[ii];
    const lines = val(item.lines);
    const bug = val(item.bug);
    const label = (n) => `${ui('line', loc)} ${n}: ${lines[n - 1].trim()}`;
    const others = shuffle(rng, lines.map((_, i) => i + 1).filter((n) => n !== bug && lines[n - 1].trim())).slice(0, 3);
    const options = [bug, ...others].sort((a, b) => a - b).map(label);
    return { ...base, type: 'find_bug', variantKey: `evaluate:${ii}`, prompt: ui('findBug', loc, { what: val(item.what) }), code: lines.join('\n'), showLineNumbers: true,
      options, answerIndex: options.indexOf(label(bug)), codeOptions: true, bugLine: bug,
      hints: [tr(c.tip, loc), ui('hintBug', loc), ui('hintBug3', loc, { snippet: lines[bug - 1].trim().slice(0, 12) })],
      explanation: `${ui('line', loc)} ${bug}: ${val(item.why)}` };
  }
  const pattern = constructPattern(concept, language);
  const ideas = [c.create, ...(c.moreCreate || [])];
  const ci = pickIndex(rng, ideas);
  const name = tr(c.name, loc);
  return { ...base, type: 'create', variantKey: `create:${ci}`, prompt: `${ui('create', loc)} ${tr(ideas[ci], loc)}`, starterCode: `${commentPrefix(language)}${ui('commentStart', loc)}\n`,
    rubric: [{ id: 'uses_concept', label: ui('rubricConcept', loc, { concept: name }), pattern: pattern ? pattern.source : null },
      { id: 'complete', label: ui('rubricRuns', loc) }, { id: 'original', label: ui('rubricOwn', loc) }],
    tests: { requiredPattern: pattern ? pattern.source : null },
    hints: [ui('createUse', loc, { concept: name }), ui('hintCreate', loc, { concept: name }), ui('hintCreate3', loc, { concept: name })],
    explanation: tr(c.explain, loc) };
}

/**
 * @param {{concept: string, level: string, language: string, locale?: string, seed?: number}} req
 */
function generateOffline(req) {
  const loc = req.locale === 'sw' ? 'sw' : 'en';
  const seed = Number.isFinite(req.seed) ? req.seed : Math.floor(Math.random() * 1e9);

  const concept = CONCEPTS[req.concept];
  const lang = LANGS[req.language];
  if (!concept) throw new Error(`Unknown concept ${req.concept}`);
  if (!lang) throw new Error(`Unknown language ${req.language}`);
  if (!lang.concepts.includes(req.concept)) throw new Error(`${lang.name} does not teach ${req.concept}`);
  if (!BLOOM[req.level]) throw new Error(`Unknown Bloom level ${req.level}`);

  const build = (s) => {
    const args = { concept: req.concept, level: req.level, language: req.language, loc, rng: mulberry32(s) };
    const activity = concept.webOnly ? buildWebActivity(args) : concept.pro ? buildProActivity(args) : buildProgrammingActivity(args);
    return { ...activity, seed: s, fingerprint: fingerprint(activity) };
  };

  const avoid = req.avoid;
  if (!avoid || (!avoid.variants?.length && !avoid.fingerprints?.length)) return build(seed);

  // The learner has practised this concept + level before. Try several seeds and pick
  // a question they have not seen: first a new variant (a different question or program),
  // otherwise new numbers/names, otherwise the one they saw longest ago.
  const variants = avoid.variants || []; // most recent first
  const prints = new Set(avoid.fingerprints || []);
  const age = (v) => { const i = variants.indexOf(v); return i === -1 ? Infinity : i; };
  let best = null;
  let bestScore = -Infinity;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const a = build(attempt === 0 ? seed : (seed + attempt * 7919) >>> 0);
    const variantAge = age(a.variantKey);
    if (variantAge === Infinity) return a; // brand-new question
    const score = variantAge * 10 + (prints.has(a.fingerprint) ? 0 : 5);
    if (score > bestScore) { best = a; bestScore = score; }
  }
  return best;
}

/**
 * Identity of a question, ignoring the order its options were shuffled into, so the
 * same question with reshuffled answers counts as "seen".
 */
function fingerprint(a) {
  const parts = [a.type, a.prompt, a.code || '', a.starterCode || '',
    (a.options || []).slice().sort().join('|'), (a.expectedOutputShown || []).join('|')];
  return hashString(parts.join('§')).toString(36);
}

module.exports = { generateOffline, commentPrefix, fingerprint };
