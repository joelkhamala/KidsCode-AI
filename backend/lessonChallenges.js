'use strict';
/**
 * Lesson challenge checklists.
 *
 * Every lesson's challenge is turned into a short checklist. A learner's code is
 * scored as the share of checks it passes, and a lesson can only be completed once
 * the score reaches PASS_MARK (50%). JavaScript is run in the existing sandbox;
 * HTML is checked by reading it (it is never run on the server).
 *
 * Lessons are matched by title (emoji ignored) so duplicated lesson rows share a list.
 * Swahili labels should be reviewed by a native-speaking teacher before launch.
 */
const { runJavaScript } = require('./sandbox/runJs');

const PASS_MARK = 50;
const t = (en, sw) => ({ en, sw });

// ---------------------------------------------------------------------------
// Check builders. Each check: { label, tip, test(ctx) -> boolean }.
// ctx = { code, lines (printed output), turtle (commands), error, html }
// ---------------------------------------------------------------------------

const count = (text, re) => (String(text).match(new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`)) || []).length;
const outText = (ctx) => ctx.lines.join('\n');

const runs = () => ({
  label: t('Your program runs without errors', 'Programu yako inaendeshwa bila makosa'),
  tip: t('Read the red error message - it usually names the line with the problem.', 'Soma ujumbe mwekundu wa kosa - kwa kawaida unataja mstari wenye tatizo.'),
  test: (c) => !c.error,
});
const printsAtLeast = (n) => ({
  label: t(`It prints at least ${n} line${n > 1 ? 's' : ''}`, `Inaonyesha angalau mistari ${n}`),
  tip: t('Use console.log("...") for each line you want to show.', 'Tumia console.log("...") kwa kila mstari unaotaka kuonyesha.'),
  test: (c) => c.lines.filter((l) => l.trim()).length >= n,
});
const codeHas = (re, label, tip) => ({ label, tip, test: (c) => re.test(c.code) });
const codeHasAtLeast = (re, n, label, tip) => ({ label, tip, test: (c) => count(c.code, re) >= n });
const outputHas = (re, label, tip) => ({ label, tip, test: (c) => re.test(outText(c)) });
const turtle = (fn, label, tip) => ({ label, tip, test: (c) => fn(c.turtle || []) });
const html = (fn, label, tip) => ({ label, tip, test: (c) => fn(c.code) });
const usesLoop = () => codeHas(/\b(for|while)\s*\(/, t('It uses a loop', 'Inatumia kitanzi'), t('Repeat code with for (let i = 0; i < 3; i++) { ... }', 'Rudia msimbo kwa for (let i = 0; i < 3; i++) { ... }'));
const usesColor = () => codeHas(/\bcolor\s*\(/, t('It changes the colour with color()', 'Inabadilisha rangi kwa color()'), t('Try color("blue"); before drawing.', 'Jaribu color("blue"); kabla ya kuchora.'));

const turns = (cmds) => cmds.filter((x) => x.type === 'right' || x.type === 'left');
const forwards = (cmds) => cmds.filter((x) => x.type === 'forward');
const tagCount = (code, tag) => count(code, new RegExp(`<${tag}(\\s[^>]*)?>`, 'i'));
const hasTag = (tag) => (code) => tagCount(code, tag) > 0;

/** Values written as literals in let/const/var declarations, e.g. let age = 10 -> "10". */
function declaredLiterals(code) {
  const out = [];
  const re = /\b(?:let|const|var)\s+[A-Za-z_$][\w$]*\s*=\s*(?:"([^"]*)"|'([^']*)'|`([^`$]*)`|(-?\d+(?:\.\d+)?))/g;
  let m;
  while ((m = re.exec(code))) out.push(m[1] ?? m[2] ?? m[3] ?? m[4]);
  return out.filter((v) => v !== undefined && String(v).trim() !== '');
}

// ---------------------------------------------------------------------------
// Checklists, keyed by lesson title
// ---------------------------------------------------------------------------

const JS_CHALLENGES = {
  'what is code?': [
    runs(),
    codeHasAtLeast(/console\.log\s*\(/, 3, t('It uses console.log() 3 times', 'Inatumia console.log() mara 3'), t('Write console.log("...") on three lines.', 'Andika console.log("...") kwenye mistari mitatu.')),
    printsAtLeast(3),
    { label: t('The 3 messages are all different', 'Jumbe 3 zote ni tofauti'), tip: t('Change the words so each message is new.', 'Badilisha maneno ili kila ujumbe uwe mpya.'), test: (c) => new Set(c.lines.map((l) => l.trim()).filter(Boolean)).size >= 3 },
    { label: t('It says something of your own (not just the example)', 'Inasema kitu chako mwenyewe (si mfano tu)'), tip: t('Print your own name or a sentence about you.', 'Onyesha jina lako au sentensi kukuhusu.'), test: (c) => c.lines.some((l) => l.trim() && !/^hello,? world!?$/i.test(l.trim())) },
  ],
  'variables: storing information': [
    runs(),
    codeHasAtLeast(/\b(let|const|var)\s+[A-Za-z_$]/, 3, t('It creates at least 3 variables', 'Inaunda angalau vigeu 3'), t('Make three: let name = "..."; let age = 10; let animal = "...";', 'Unda vitatu: let name = "..."; let age = 10; let animal = "...";')),
    { label: t('It prints the values of your variables', 'Inaonyesha thamani za vigeu vyako'), tip: t('Print each variable, e.g. console.log(name);', 'Onyesha kila kigeu, mf. console.log(name);'), test: (c) => { const vals = declaredLiterals(c.code); const out = outText(c); return vals.length >= 3 && vals.filter((v) => out.includes(String(v))).length >= 3; } },
    printsAtLeast(3),
  ],
  'numbers and math': [
    runs(),
    codeHas(/\*/, t('It multiplies with *', 'Inazidisha kwa *'), t('Hours in a week = hours in a day * days in a week.', 'Saa za wiki = saa za siku * siku za wiki.')),
    codeHas(/\b(let|const|var)\s+[A-Za-z_$]/, t('It stores numbers in variables', 'Inahifadhi namba kwenye vigeu'), t('e.g. let hoursPerDay = 24;', 'mf. let hoursPerDay = 24;')),
    outputHas(/\b168\b/, t('It prints the right answer (168)', 'Inaonyesha jibu sahihi (168)'), t('Check your multiplication: 24 * 7.', 'Kagua kuzidisha kwako: 24 * 7.')),
  ],
  'making decisions with if/else': [
    runs(),
    codeHas(/\bif\s*\(/, t('It uses if', 'Inatumia if'), t('Start with if (condition) { ... }', 'Anza na if (sharti) { ... }')),
    codeHas(/\belse\b/, t('It uses else', 'Inatumia else'), t('Add else { ... } for the other case.', 'Ongeza else { ... } kwa hali nyingine.')),
    codeHas(/%\s*2/, t('It checks the remainder with % 2', 'Inaangalia baki kwa % 2'), t('A number is even when number % 2 === 0.', 'Namba ni shufwa ikiwa number % 2 === 0.')),
    outputHas(/even|odd/i, t('It prints "Even!" or "Odd!"', 'Inaonyesha "Even!" au "Odd!"'), t('Print the result inside each branch.', 'Onyesha jibu ndani ya kila tawi.')),
  ],
  'drawing with turtle': [
    runs(),
    turtle((cmds) => forwards(cmds).length >= 4, t('The turtle moves forward 4 times', 'Kobe anasonga mbele mara 4'), t('A square has 4 sides: forward(100) four times.', 'Mraba una pande 4: forward(100) mara nne.')),
    turtle((cmds) => turns(cmds).filter((x) => Math.abs(x.angle) === 90).length >= 3, t('It turns 90 degrees at the corners', 'Inageuka nyuzi 90 kwenye pembe'), t('Use right(90) after each side.', 'Tumia right(90) baada ya kila upande.')),
    usesColor(),
  ],
  "loops: don't repeat yourself": [
    runs(),
    usesLoop(),
    turtle((cmds) => forwards(cmds).length >= 3, t('The turtle draws 3 sides', 'Kobe anachora pande 3'), t('Put forward(100) inside the loop and repeat it 3 times.', 'Weka forward(100) ndani ya kitanzi na urudie mara 3.')),
    turtle((cmds) => turns(cmds).some((x) => Math.abs(x.angle) === 120), t('It turns 120 degrees', 'Inageuka nyuzi 120'), t('A triangle needs right(120) at each corner.', 'Pembetatu inahitaji right(120) kwenye kila pembe.')),
    usesColor(),
  ],
  'colorful patterns': [
    runs(),
    usesLoop(),
    turtle((cmds) => forwards(cmds).length >= 36, t('It draws 36 times', 'Inachora mara 36'), t('Make your loop run 36 times: i < 36.', 'Fanya kitanzi chako kirudie mara 36: i < 36.')),
    turtle((cmds) => turns(cmds).some((x) => Math.abs(x.angle) === 10), t('It turns 10 degrees each step', 'Inageuka nyuzi 10 kila hatua'), t('Use right(10) inside the loop.', 'Tumia right(10) ndani ya kitanzi.')),
    turtle((cmds) => new Set(forwards(cmds).map((x) => x.dist)).size >= 10, t('Each line is a bit longer than the last', 'Kila mstari ni mrefu kidogo kuliko uliotangulia'), t('Use the loop counter: forward(i * 5);', 'Tumia hesabu ya kitanzi: forward(i * 5);')),
    usesColor(),
  ],
  'random numbers': [
    runs(),
    codeHas(/Math\.random\s*\(/, t('It uses Math.random()', 'Inatumia Math.random()'), t('Math.random() gives a random decimal.', 'Math.random() inatoa desimali ya bahati nasibu.')),
    codeHas(/Math\.floor\s*\(/, t('It rounds down with Math.floor()', 'Inashusha kwa Math.floor()'), t('Math.floor(Math.random() * 100) + 1 gives 1 to 100.', 'Math.floor(Math.random() * 100) + 1 inatoa 1 hadi 100.')),
    codeHas(/\*\s*100\b/, t('The number goes up to 100', 'Namba inafika hadi 100'), t('Multiply by 100 to get numbers up to 100.', 'Zidisha kwa 100 kupata namba hadi 100.')),
    codeHas(/(===|==)/, t('It compares the guess with the number', 'Inalinganisha kisio na namba'), t('Use if (guess === secret) { ... }', 'Tumia if (guess === secret) { ... }')),
    outputHas(/correct|wrong/i, t('It prints "Correct!" or "Wrong!"', 'Inaonyesha "Correct!" au "Wrong!"'), t('Print the result in each branch.', 'Onyesha jibu katika kila tawi.')),
  ],
  'score tracking': [
    runs(),
    codeHas(/\b(let|var)\s+score\b/i, t('It has a score variable', 'Ina kigeu cha score'), t('let score = 0;', 'let score = 0;')),
    codeHas(/\b(let|var)\s+level\b/i, t('It has a level variable', 'Ina kigeu cha level'), t('let level = 1;', 'let level = 1;')),
    codeHas(/score\s*(\+=\s*50|=\s*score\s*\+\s*50)/i, t('It adds 50 points', 'Inaongeza alama 50'), t('score += 50;', 'score += 50;')),
    codeHas(/if\s*\([^)]*score[^)]*>\s*100/i, t('It checks if the score is over 100', 'Inaangalia kama alama ni zaidi ya 100'), t('if (score > 100) { level = level + 1; }', 'if (score > 100) { level = level + 1; }')),
    printsAtLeast(1),
  ],
  'functions: reusable code magic': [
    runs(),
    codeHas(/function\s+levelUp\s*\(\s*\w+\s*,\s*\w+\s*\)|levelUp\s*=\s*\(\s*\w+\s*,\s*\w+\s*\)\s*=>/, t('It defines levelUp with 2 parameters', 'Inafafanua levelUp yenye vigezo 2'), t('function levelUp(name, score) { ... }', 'function levelUp(name, score) { ... }')),
    { label: t('It calls levelUp', 'Inaita levelUp'), tip: t('Use it: levelUp("Amina", 350);', 'Kitumie: levelUp("Amina", 350);'), test: (c) => count(c.code, /\blevelUp\s*\(/) >= 2 },
    codeHas(/\/\s*100/, t('It works out the level (score / 100)', 'Inakokotoa kiwango (score / 100)'), t('let level = score / 100; (or Math.floor(score / 100))', 'let level = score / 100; (au Math.floor(score / 100))')),
    outputHas(/congrat|well done|great|awesome|hongera|level/i, t('It prints a congratulations message', 'Inaonyesha ujumbe wa pongezi'), t('console.log("Congratulations " + name + "!");', 'console.log("Hongera " + name + "!");')),
  ],
  'html basics': [
    runs(),
    printsAtLeast(5),
    { label: t('It names at least 5 different HTML tags', 'Inataja angalau lebo 5 tofauti za HTML'), tip: t('e.g. <h1>, <p>, <a>, <img>, <ul>', 'mf. <h1>, <p>, <a>, <img>, <ul>'), test: (c) => new Set((outText(c).toLowerCase().match(/<?\b(html|head|body|title|h[1-6]|p|a|img|ul|ol|li|div|span|br|table|tr|td|form|input|button|strong|em|nav|header|footer|section)\b>?/g) || []).map((x) => x.replace(/[<>]/g, ''))).size >= 5 },
  ],
  'styling with css': [
    runs(),
    { label: t('It creates an object with 5 properties', 'Inaunda kitu (object) chenye sifa 5'), tip: t('let button = { color: "white", padding: "10px", ... };', 'let button = { color: "white", padding: "10px", ... };'), test: (c) => /\{[\s\S]*\}/.test(c.code) && count((c.code.match(/\{[\s\S]*\}/) || [''])[0], /["']?[\w-]+["']?\s*:/) >= 5 },
    { label: t('It uses real CSS properties', 'Inatumia sifa halisi za CSS'), tip: t('e.g. color, backgroundColor, padding, border, fontSize', 'mf. color, backgroundColor, padding, border, fontSize'), test: (c) => count(c.code, /\b(color|background|backgroundColor|background-color|padding|margin|border|borderRadius|border-radius|fontSize|font-size|fontWeight|font-weight|width|height|cursor)\b/) >= 3 },
    printsAtLeast(5),
  ],
  'python vs javascript': [
    runs(),
    printsAtLeast(3),
    { label: t('It names at least 2 real uses of Python', 'Inataja angalau matumizi 2 halisi ya Python'), tip: t('e.g. AI, data science, web servers, games, robots', 'mf. AI, sayansi ya data, seva za wavuti, michezo, roboti'), test: (c) => count(outText(c).toLowerCase(), /\b(ai|artificial intelligence|machine learning|ml|data|science|web|server|automation|games?|robots?|apps?|research|scripts?)\b/) >= 2 },
  ],
  'data structures: lists & dicts': [
    runs(),
    { label: t('It makes an array of 5 things', 'Inatengeneza safu (array) ya vitu 5'), tip: t('let favourites = ["a", "b", "c", "d", "e"];', 'let favourites = ["a", "b", "c", "d", "e"];'), test: (c) => (c.code.match(/\[[^\]]*\]/g) || []).some((arr) => arr.split(',').filter((x) => x.trim().replace(/[[\]]/g, '')).length >= 5) },
    { label: t('It makes an object with 3 facts', 'Inatengeneza kitu (object) chenye ukweli 3'), tip: t('let me = { name: "...", age: 10, town: "..." };', 'let me = { name: "...", age: 10, town: "..." };'), test: (c) => (c.code.match(/\{[^{}]*\}/g) || []).some((obj) => count(obj, /[\w"']+\s*:/) >= 3) },
    printsAtLeast(2),
  ],
};

const HTML_CHALLENGES = {
  'what is html?': [
    html(hasTag('html'), t('It has an <html> tag', 'Ina lebo ya <html>'), t('Wrap everything in <html> ... </html>.', 'Funga kila kitu ndani ya <html> ... </html>.')),
    html(hasTag('title'), t('It has a <title>', 'Ina <title>'), t('Put <title>My Page</title> inside <head>.', 'Weka <title>Ukurasa Wangu</title> ndani ya <head>.')),
    html(hasTag('h1'), t('It has an <h1> heading', 'Ina kichwa cha <h1>'), t('<h1>Welcome to Web Development</h1>', '<h1>Welcome to Web Development</h1>')),
    html((c) => /<h1[^>]*>\s*welcome to web development\s*<\/h1>/i.test(c), t('The heading says "Welcome to Web Development"', 'Kichwa kinasema "Welcome to Web Development"'), t('Check the spelling inside the <h1>.', 'Kagua tahajia ndani ya <h1>.')),
  ],
  'html document structure': [
    html((c) => /<!doctype\s+html>/i.test(c), t('It starts with <!DOCTYPE html>', 'Inaanza na <!DOCTYPE html>'), t('The very first line should be <!DOCTYPE html>.', 'Mstari wa kwanza kabisa uwe <!DOCTYPE html>.')),
    html((c) => /<html[^>]*\blang\s*=/i.test(c), t('<html> has a lang attribute', '<html> ina sifa ya lang'), t('<html lang="en">', '<html lang="sw">')),
    html((c) => /<meta[^>]*charset\s*=/i.test(c), t('It sets the character encoding', 'Inaweka usimbaji wa herufi'), t('<meta charset="UTF-8"> inside <head>', '<meta charset="UTF-8"> ndani ya <head>')),
    html(hasTag('head'), t('It has a <head>', 'Ina <head>'), t('<head> holds the title and meta tags.', '<head> inashika kichwa na lebo za meta.')),
    html(hasTag('body'), t('It has a <body>', 'Ina <body>'), t('<body> holds what people see.', '<body> inashika kile watu wanachoona.')),
  ],
  'core html elements': [
    html(hasTag('h1'), t('It has a heading', 'Ina kichwa'), t('<h1>About Me</h1>', '<h1>Kunihusu</h1>')),
    html((c) => tagCount(c, 'p') >= 1, t('It has a paragraph', 'Ina aya'), t('<p>I live in ...</p>', '<p>Ninaishi ...</p>')),
    html((c) => ['ul', 'ol', 'a', 'img', 'strong', 'em', 'div', 'span'].filter((tg) => hasTag(tg)(c)).length >= 3, t('It uses at least 3 other elements (list, link, image...)', 'Inatumia angalau vipengele 3 vingine (orodha, kiungo, picha...)'), t('Try <ul>, <a href="...">, <img src="..." alt="...">.', 'Jaribu <ul>, <a href="...">, <img src="..." alt="...">.')),
    html((c) => c.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().length >= 40, t('It has real content about you', 'Ina maudhui halisi kukuhusu'), t('Write a few sentences, not just tags.', 'Andika sentensi chache, si lebo tu.')),
  ],
  'creating html files': [
    html((c) => /<!doctype\s+html>/i.test(c), t('It starts with <!DOCTYPE html>', 'Inaanza na <!DOCTYPE html>'), t('First line: <!DOCTYPE html>', 'Mstari wa kwanza: <!DOCTYPE html>')),
    html((c) => hasTag('html')(c) && hasTag('body')(c), t('It has <html> and <body>', 'Ina <html> na <body>'), t('Put your content inside <body>.', 'Weka maudhui yako ndani ya <body>.')),
    html((c) => /save|\.html|browser|open|double.?click|kivinjari|hifadhi/i.test(c), t('It explains how to save and open the file', 'Inaeleza jinsi ya kuhifadhi na kufungua faili'), t('Add a comment <!-- ... --> describing the steps.', 'Ongeza maoni <!-- ... --> yanayoeleza hatua.')),
  ],
  'html terminology': [
    ...['element', 'tag', 'attribute', 'content'].map((word) => html((c) => new RegExp(`\\b${word}s?\\b`, 'i').test(c), t(`It explains "${word}"`, `Inaeleza "${word}"`), t(`Add a comment that says what an ${word} is.`, `Ongeza maoni yanayoeleza ${word} ni nini.`))),
  ],
  'paragraphs and text': [
    html((c) => tagCount(c, 'p') >= 2, t('It has at least 2 paragraphs', 'Ina angalau aya 2'), t('<p>First</p> <p>Second</p>', '<p>Kwanza</p> <p>Pili</p>')),
    html((c) => /<br\s*\/?>/i.test(c), t('It uses a line break <br>', 'Inatumia mstari mpya <br>'), t('Put <br> where you want a new line.', 'Weka <br> unapotaka mstari mpya.')),
    html((c) => /<(b|strong|i|em|u|mark|small)\b/i.test(c), t('It formats some text (bold, italic...)', 'Inapamba maandishi fulani (mazito, ya mlalo...)'), t('<strong>bold</strong> or <em>italic</em>', '<strong>mazito</strong> au <em>mlalo</em>')),
  ],
  headings: [1, 2, 3, 4, 5, 6].map((n) => html(hasTag(`h${n}`), t(`It uses <h${n}>`, `Inatumia <h${n}>`), t(`Add an <h${n}> heading.`, `Ongeza kichwa cha <h${n}>.`))),
  images: [
    html((c) => tagCount(c, 'img') >= 3, t('It has 3 images', 'Ina picha 3'), t('Add three <img> tags.', 'Ongeza lebo tatu za <img>.')),
    html((c) => { const imgs = c.match(/<img\b[^>]*>/gi) || []; return imgs.length > 0 && imgs.every((i) => /\bsrc\s*=/i.test(i)); }, t('Every image has a src', 'Kila picha ina src'), t('<img src="lion.jpg" ...>', '<img src="simba.jpg" ...>')),
    html((c) => { const imgs = c.match(/<img\b[^>]*>/gi) || []; return imgs.length > 0 && imgs.every((i) => /\balt\s*=\s*["'][^"']+["']/i.test(i)); }, t('Every image has alt text', 'Kila picha ina maandishi ya alt'), t('alt="A lion resting" describes the picture.', 'alt="Simba anapumzika" inaeleza picha.')),
  ],
  links: [
    html((c) => /<a\b[^>]*href\s*=\s*["']https?:\/\//i.test(c), t('It links to an external website', 'Ina kiungo cha tovuti ya nje'), t('<a href="https://...">', '<a href="https://...">')),
    html((c) => /<a\b[^>]*href\s*=\s*["'](?!https?:|#)[^"']+["']/i.test(c), t('It links to an internal page', 'Ina kiungo cha ukurasa wa ndani'), t('<a href="about.html">About</a>', '<a href="about.html">Kuhusu</a>')),
    html((c) => tagCount(c, 'a') >= 3 || hasTag('nav')(c), t('It is a menu (at least 3 links or <nav>)', 'Ni menyu (angalau viungo 3 au <nav>)'), t('Wrap your links in <nav> ... </nav>.', 'Funga viungo vyako ndani ya <nav> ... </nav>.')),
  ],
  lists: [
    html((c) => { const m = c.match(/<ul\b[^>]*>([\s\S]*?)<\/ul>/i); return Boolean(m) && tagCount(m[1], 'li') >= 5; }, t('A bulleted list (ul) with 5 items', 'Orodha ya vitone (ul) yenye vipengele 5'), t('<ul> with five <li> items', '<ul> yenye vipengele vitano vya <li>')),
    html((c) => { const m = c.match(/<ol\b[^>]*>([\s\S]*?)<\/ol>/i); return Boolean(m) && tagCount(m[1], 'li') >= 5; }, t('A numbered list (ol) with 5 items', 'Orodha yenye namba (ol) yenye vipengele 5'), t('<ol> with five <li> items', '<ol> yenye vipengele vitano vya <li>')),
  ],
  'html attributes': [
    html((c) => /\bid\s*=\s*["'][^"']+["']/i.test(c), t('It uses an id', 'Inatumia id'), t('<div id="header">', '<div id="header">')),
    html((c) => /\bclass\s*=\s*["'][^"']+["']/i.test(c), t('It uses a class', 'Inatumia class'), t('<p class="intro">', '<p class="intro">')),
    html((c) => /\b(title|alt|href|src|style|data-[\w-]+|lang|target)\s*=\s*["'][^"']*["']/i.test(c), t('It uses another attribute (href, src, alt, title...)', 'Inatumia sifa nyingine (href, src, alt, title...)'), t('e.g. <a href="..." title="...">', 'mf. <a href="..." title="...">')),
  ],
};

const DEFAULT_JS = [
  runs(),
  printsAtLeast(1),
  { label: t('It is your own code (not just the starter)', 'Ni msimbo wako mwenyewe (si wa kuanzia tu)'), tip: t('Change the code to solve the challenge.', 'Badilisha msimbo ili kutatua changamoto.'), test: (c) => !/^\s*(\/\/[^\n]*\n\s*)?console\.log\(["']Hello, World!["']\);?\s*$/i.test(c.code) },
];
const DEFAULT_HTML = [
  html((c) => count(c, /<[a-z][a-z0-9]*\b/i) >= 3, t('It uses at least 3 HTML tags', 'Inatumia angalau lebo 3 za HTML'), t('Build the page from tags like <h1>, <p>, <ul>.', 'Jenga ukurasa kwa lebo kama <h1>, <p>, <ul>.')),
  html((c) => c.replace(/<[^>]*>/g, ' ').trim().length >= 20, t('It has some text content', 'Ina maudhui ya maandishi'), t('Add words people can read.', 'Ongeza maneno ambayo watu wanaweza kusoma.')),
];

const titleKey = (title) => String(title || '').replace(/[^\p{L}\p{N}\s?:&'/!-]/gu, '').replace(/\s+/g, ' ').trim().toLowerCase();
const looksLikeHtml = (lesson) => /^\s*(<!doctype|<\w|<!--)/i.test(lesson.example_code || '');

/** The checklist for a lesson: { kind: 'js'|'html', checks: [...] } */
function challengeFor(lesson) {
  const key = titleKey(lesson.title);
  if (HTML_CHALLENGES[key]) return { kind: 'html', checks: HTML_CHALLENGES[key] };
  if (JS_CHALLENGES[key]) return { kind: 'js', checks: JS_CHALLENGES[key] };
  return looksLikeHtml(lesson) ? { kind: 'html', checks: DEFAULT_HTML } : { kind: 'js', checks: DEFAULT_JS };
}

const tr = (obj, loc) => (obj ? obj[loc] || obj.en : '');

/** What the learner sees before starting: the list of things to do. */
function describeChallenge(lesson, locale = 'en') {
  const { kind, checks } = challengeFor(lesson);
  return { kind, passMark: PASS_MARK, checks: checks.map((c) => ({ label: tr(c.label, locale) })) };
}

/** Score a learner's code for a lesson. */
async function gradeChallenge(lesson, code, locale = 'en') {
  const { kind, checks } = challengeFor(lesson);
  const source = typeof code === 'string' ? code : '';
  const ctx = { code: source, lines: [], turtle: [], error: null };
  if (kind === 'js' && source.trim()) {
    const result = await runJavaScript(source, { timeoutMs: 3000 });
    ctx.lines = result.output || [];
    ctx.turtle = result.turtleCommands || [];
    ctx.error = result.error;
  } else if (kind === 'js') {
    ctx.error = { name: 'Error', message: 'No code' };
  }
  const results = checks.map((c) => {
    let passed = false;
    try { passed = Boolean(source.trim()) && Boolean(c.test(ctx)); } catch { passed = false; }
    return { label: tr(c.label, locale), tip: passed ? null : tr(c.tip, locale), passed };
  });
  const passedCount = results.filter((r) => r.passed).length;
  const score = checks.length ? Math.round((100 * passedCount) / checks.length) : 0;
  return { kind, score, passMark: PASS_MARK, passed: score >= PASS_MARK, checks: results, output: ctx.lines, error: ctx.error };
}

module.exports = { PASS_MARK, challengeFor, describeChallenge, gradeChallenge, titleKey };
