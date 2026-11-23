'use strict';
/**
 * Concept map: the programming ideas KidsCode teaches, in "known -> unknown" order.
 *
 * - `prereqs` define the learning graph. A concept unlocks when every prerequisite
 *   has reached Bloom's "Apply" level (the learner can actually use it).
 * - Concepts are language-neutral; languages.js says which languages teach which.
 * - `scenarios` build practice programs (ast.js) with seeded randomness, using
 *   Kenyan names and climate/environment themes from the project proposal.
 *
 * Swahili strings should be reviewed by a native-speaking teacher before launch.
 */
const A = require('./program/ast');
const { pick, randInt } = require('./random');

const NAMES = ['Amina', 'Baraka', 'Wanjiru', 'Otieno', 'Achieng', 'Kamau', 'Nekesa', 'Juma', 'Zawadi', 'Kiprono', 'Muthoni', 'Halima'];
const t = (en, sw) => ({ en, sw });

// ---------------------------------------------------------------------------
// Scenario builders. Each returns:
//   program   neutral program (ast.js)
//   keyId     id of the statement that best represents the concept
//   what      correct description (Understand)
//   notWhat   3 plausible wrong descriptions
//   mutations bugs: { target, apply(stmt) -> stmt, why, languages? }
// `loc` is 'en' or 'sw' and controls the text inside the program.
// ---------------------------------------------------------------------------

const scenarios = {
  sequence: [
    (rng, loc) => {
      const steps = loc === 'sw'
        ? ['Chimba shimo', 'Panda mche', 'Funika kwa udongo', 'Mwagilia maji']
        : ['Dig a hole', 'Put in the seedling', 'Cover with soil', 'Water the tree'];
      const prog = steps.map((s) => A.print(s));
      return {
        program: prog,
        keyId: prog[1].id,
        what: t('Prints the 4 steps for planting a tree, in order', 'Inaonyesha hatua 4 za kupanda mti, kwa mpangilio'),
        notWhat: [
          t('Prints the steps in a random order each time', 'Inaonyesha hatua kwa mpangilio wa bahati nasibu'),
          t('Prints only the last step', 'Inaonyesha hatua ya mwisho tu'),
          t('Plants a real tree outside', 'Inapanda mti halisi nje'),
        ],
        mutations: [
          { target: prog[1].id, apply: (s) => ({ ...s, parts: [A.S(steps[3])] }), why: t('This step happens too early - you cannot water a tree before it is planted!', 'Hatua hii imekuja mapema mno - huwezi kumwagilia mti kabla ya kuupanda!') },
          { target: prog[1].id, apply: (s) => ({ ...s, parts: [A.S(steps[2])] }), why: t('The steps are out of order.', 'Hatua haziko kwa mpangilio.') },
          { target: prog[1].id, apply: (s) => ({ ...s, parts: [A.S(steps[0])] }), why: t('This step was already done - the steps are out of order.', 'Hatua hii imeshafanyika - hatua haziko kwa mpangilio.') },
        ],
      };
    },
  ],

  output: [
    (rng, loc) => {
      const name = pick(rng, NAMES);
      const lines = loc === 'sw'
        ? ['Jambo!', `Jina langu ni ${name}.`, 'Ninajifunza kuandika msimbo.']
        : ['Jambo!', `My name is ${name}.`, 'I am learning to code.'];
      const prog = lines.map((l) => A.print(l));
      return {
        program: prog,
        keyId: prog[1].id,
        what: t('Shows three messages on the screen', 'Inaonyesha jumbe tatu kwenye skrini'),
        notWhat: [
          t('Asks the user to type their name', 'Inamwomba mtumiaji aandike jina lake'),
          t('Shows the same message three times', 'Inaonyesha ujumbe mmoja mara tatu'),
          t('Draws three pictures', 'Inachora picha tatu'),
        ],
        mutations: [
          { target: prog[1].id, apply: (s) => ({ ...s, bug: 'noQuotes' }), why: t('Text must be inside quote marks " " so the computer knows it is a message.', 'Maandishi lazima yawe ndani ya alama za nukuu " " ili kompyuta ijue ni ujumbe.') },
          { target: prog[1].id, apply: (s) => ({ ...s, parts: [A.S(loc === 'sw' ? `Jina langu ni ${pick(rng, NAMES.filter((n) => n !== name))}.` : `My name is ${pick(rng, NAMES.filter((n) => n !== name))}.`)] }), why: t('This prints the wrong name.', 'Hii inaonyesha jina lisilo sahihi.') },
        ],
      };
    },
  ],

  variables: [
    (rng, loc) => {
      const name = pick(rng, NAMES);
      const age = randInt(rng, 8, 14);
      const setName = A.set('name', name, 'str');
      const setAge = A.set('age', age, 'int');
      const p1 = loc === 'sw' ? A.print('Habari, ', A.V('name'), '!') : A.print('Hello, ', A.V('name'), '!');
      const p2 = loc === 'sw' ? A.print(A.V('name'), ' ana miaka ', A.V('age'), '.') : A.print(A.V('name'), ' is ', A.V('age'), ' years old.');
      return {
        program: [setName, setAge, p1, p2],
        keyId: setAge.id,
        what: t(`Stores a name and an age in variables, then uses them in two messages`, `Inahifadhi jina na umri kwenye vigeu, kisha inavitumia katika jumbe mbili`),
        notWhat: [
          t('Prints the words "name" and "age" exactly', 'Inaonyesha maneno "name" na "age" kama yalivyo'),
          t('Asks the user how old they are', 'Inamwuliza mtumiaji umri wake'),
          t('Adds the name and the age together', 'Inajumlisha jina na umri'),
        ],
        mutations: [
          { target: setAge.id, apply: (s) => ({ ...s, value: A.N(age + 10) }), why: t('The age variable is given the wrong value.', 'Kigeu cha umri kimepewa thamani isiyo sahihi.') },
          { target: p2.id, apply: (s) => ({ ...s, parts: [A.S('name'), ...s.parts.slice(1)] }), why: t('"name" in quotes is just the word name - it should use the variable without quotes.', '"name" ndani ya nukuu ni neno tu - inapaswa kutumia kigeu bila nukuu.') },
          { target: setAge.id, apply: (s) => ({ ...s, value: A.N(age - 1) }), why: t('The age variable is given the wrong value.', 'Kigeu cha umri kimepewa thamani isiyo sahihi.') },
        ],
      };
    },
  ],

  arithmetic: [
    (rng, loc) => {
      const a = randInt(rng, 3, 12);
      const b = randInt(rng, 2, 9);
      const s1 = A.set('mangoes', a);
      const s2 = A.set('oranges', b);
      const total = A.set('total', A.op('+', A.V('mangoes'), A.V('oranges')));
      const p = loc === 'sw' ? A.print('Jumla ya matunda: ', A.V('total')) : A.print('Total fruit: ', A.V('total'));
      const dbl = A.set('baskets', A.op('*', A.V('total'), A.N(2)));
      const p2 = loc === 'sw' ? A.print('Mara mbili: ', A.V('baskets')) : A.print('Double: ', A.V('baskets'));
      return {
        program: [s1, s2, total, p, dbl, p2],
        keyId: total.id,
        what: t('Adds mangoes and oranges, prints the total, then prints double the total', 'Inajumlisha maembe na machungwa, inaonyesha jumla, kisha inaonyesha jumla mara mbili'),
        notWhat: [
          t('Prints the number of mangoes only', 'Inaonyesha idadi ya maembe tu'),
          t('Subtracts the oranges from the mangoes', 'Inatoa machungwa kutoka maembe'),
          t('Prints the words "mangoes + oranges"', 'Inaonyesha maneno "mangoes + oranges"'),
        ],
        mutations: [
          { target: total.id, apply: (s) => ({ ...s, value: A.op('-', A.V('mangoes'), A.V('oranges')) }), why: t('It uses - (take away) instead of + (add).', 'Inatumia - (kutoa) badala ya + (kujumlisha).') },
          { target: total.id, apply: (s) => ({ ...s, value: A.op('+', A.V('mangoes'), A.V('mangoes')) }), why: t('It adds mangoes twice and forgets the oranges.', 'Inajumlisha maembe mara mbili na kusahau machungwa.') },
          { target: total.id, apply: (s) => ({ ...s, value: A.op('*', A.V('mangoes'), A.V('oranges')) }), why: t('It multiplies instead of adding.', 'Inazidisha badala ya kujumlisha.') },
        ],
      };
    },
  ],

  conditionals: [
    (rng, loc) => {
      const temp = randInt(rng, 22, 36);
      const s = A.set('temperature', temp);
      const iff = A.ifElse(A.op('>', A.V('temperature'), A.N(30)),
        [A.print(loc === 'sw' ? 'Siku ya joto! Kunywa maji.' : 'Hot day! Drink water.')],
        [A.print(loc === 'sw' ? 'Siku nzuri ya kucheza mpira.' : 'Nice day for football.')]);
      return {
        program: [s, iff],
        keyId: iff.id,
        what: t('Checks if the temperature is above 30 and picks the right message', 'Inaangalia kama joto ni zaidi ya 30 na kuchagua ujumbe sahihi'),
        notWhat: [
          t('Always prints both messages', 'Inaonyesha jumbe zote mbili kila mara'),
          t('Changes the temperature to 30', 'Inabadilisha joto kuwa 30'),
          t('Repeats the check forever', 'Inarudia ukaguzi milele'),
        ],
        mutations: [
          { target: iff.id, apply: (st) => ({ ...st, cond: A.op('<', A.V('temperature'), A.N(30)) }), why: t('The sign is backwards: it should be > (greater than) for a hot day.', 'Alama imegeuzwa: inapaswa kuwa > (zaidi ya) kwa siku ya joto.') },
          { target: iff.id, apply: (st) => ({ ...st, cond: A.op('>', A.V('temperature'), A.N(3)) }), why: t('It compares with 3 instead of 30.', 'Inalinganisha na 3 badala ya 30.') },
          { target: iff.id, apply: (st) => ({ ...st, cond: A.op('==', A.V('temperature'), A.N(30)) }), why: t('== only matches exactly 30; we want any temperature above 30.', '== inalingana na 30 tu; tunataka joto lolote zaidi ya 30.') },
        ],
      };
    },
    (rng, loc) => {
      const score = randInt(rng, 30, 95);
      const s = A.set('score', score);
      const iff = A.ifElse(A.op('>=', A.V('score'), A.N(50)),
        [A.print(loc === 'sw' ? 'Umefaulu! Hongera!' : 'You passed! Well done!')],
        [A.print(loc === 'sw' ? 'Endelea kujizoeza.' : 'Keep practising.')]);
      return {
        program: [s, iff],
        keyId: iff.id,
        what: t('Prints a pass message when the score is 50 or more, otherwise a practise message', 'Inaonyesha ujumbe wa kufaulu alama zikiwa 50 au zaidi, la sivyo ujumbe wa kujizoeza'),
        notWhat: [
          t('Adds 50 to the score', 'Inaongeza 50 kwenye alama'),
          t('Prints the pass message for every score', 'Inaonyesha ujumbe wa kufaulu kwa alama zote'),
          t('Counts from 50 to the score', 'Inahesabu kutoka 50 hadi alama'),
        ],
        mutations: [
          { target: iff.id, apply: (st) => ({ ...st, cond: A.op('<=', A.V('score'), A.N(50)) }), why: t('The comparison is backwards.', 'Ulinganisho umegeuzwa.') },
          { target: iff.id, apply: (st) => ({ ...st, cond: A.op('>', A.V('score'), A.N(50)) }), why: t('A score of exactly 50 should pass, so it needs >= not >.', 'Alama 50 kamili inapaswa kufaulu, kwa hivyo inahitaji >= si >.') },
          { target: iff.id, apply: (st) => ({ ...st, cond: A.op('>=', A.V('score'), A.N(5)) }), why: t('It compares with 5 instead of 50.', 'Inalinganisha na 5 badala ya 50.') },
        ],
      };
    },
  ],

  loops: [
    (rng, loc) => {
      const end = randInt(rng, 4, 7);
      const loop = A.forRange('i', 1, end + 1, [A.print(A.V('i'))]);
      const start = A.print(loc === 'sw' ? 'Tuanze kuhesabu:' : 'Let us count:');
      const done = A.print(loc === 'sw' ? 'Tayari!' : 'Ready!');
      return {
        program: [start, loop, done],
        keyId: loop.id,
        what: t(`Counts and prints the numbers 1 to ${end}`, `Inahesabu na kuonyesha namba 1 hadi ${end}`),
        notWhat: [
          t(`Prints the number ${end} only`, `Inaonyesha namba ${end} tu`),
          t(`Prints the numbers 0 to ${end - 1}`, `Inaonyesha namba 0 hadi ${end - 1}`),
          t('Prints the letter i many times', 'Inaonyesha herufi i mara nyingi'),
        ],
        mutations: [
          { target: loop.id, apply: (s) => ({ ...s, from: A.N(0), to: A.N(end) }), why: t(`It starts counting at 0, so it prints 0 to ${end - 1} instead of 1 to ${end}.`, `Inaanza kuhesabu kwa 0, kwa hivyo inaonyesha 0 hadi ${end - 1} badala ya 1 hadi ${end}.`) },
          { target: loop.id, apply: (s) => ({ ...s, to: A.N(end) }), why: t(`It stops one number too early (an "off-by-one" bug).`, 'Inasimama namba moja mapema mno (kosa la "kuzidi kwa moja").') },
          { target: loop.id, apply: (s) => ({ ...s, to: A.N(end + 2) }), why: t('It counts one number too far.', 'Inahesabu namba moja zaidi ya inavyotakiwa.') },
        ],
      };
    },
    (rng, loc) => {
      const friends = randInt(rng, 3, 6);
      const each = randInt(rng, 2, 4);
      const s = A.set('trees', 0);
      const add = A.assign('trees', A.op('+', A.V('trees'), A.N(each)));
      const loop = A.forRange('kid', 0, friends, [add]);
      const p = A.print(loc === 'sw' ? 'Miti iliyopandwa: ' : 'Trees planted: ', A.V('trees'));
      return {
        program: [s, loop, p],
        keyId: add.id,
        what: t(`${friends} friends each plant ${each} trees; the loop adds them up and prints the total`, `Marafiki ${friends} kila mmoja anapanda miti ${each}; kitanzi kinajumlisha na kuonyesha jumla`),
        notWhat: [
          t(`Prints "Trees planted" ${friends} times`, `Inaonyesha "Miti iliyopandwa" mara ${friends}`),
          t(`Plants only ${each} trees in total`, `Inapanda miti ${each} tu kwa jumla`),
          t('Counts the friends instead of the trees', 'Inahesabu marafiki badala ya miti'),
        ],
        mutations: [
          { target: add.id, apply: (st) => ({ ...st, value: A.N(each) }), why: t('It sets trees to the same number each time instead of adding to the total.', 'Inaweka miti kuwa namba ileile kila mara badala ya kuongeza kwenye jumla.') },
          { target: add.id, apply: (st) => ({ ...st, value: A.op('+', A.V('trees'), A.N(1)) }), why: t('It adds 1 each time instead of the number of trees each friend plants.', 'Inaongeza 1 kila mara badala ya idadi ya miti ambayo kila rafiki anapanda.') },
          { target: add.id, apply: (st) => ({ ...st, value: A.op('-', A.V('trees'), A.N(each)) }), why: t('It takes trees away instead of adding them.', 'Inapunguza miti badala ya kuiongeza.') },
        ],
      };
    },
  ],

  while_loops: [
    (rng, loc) => {
      const start = randInt(rng, 3, 6);
      const s = A.set('count', start);
      const p = A.print(A.V('count'));
      const dec = A.assign('count', A.op('-', A.V('count'), A.N(1)));
      const loop = A.whileLoop(A.op('>', A.V('count'), A.N(0)), [p, dec]);
      const done = A.print(loc === 'sw' ? 'Roketi inaruka!' : 'Blast off!');
      return {
        program: [s, loop, done],
        keyId: loop.id,
        what: t(`Counts down from ${start} to 1, then prints a blast-off message`, `Inahesabu kurudi nyuma kutoka ${start} hadi 1, kisha inaonyesha ujumbe wa kuruka`),
        notWhat: [
          t(`Counts up from 1 to ${start}`, `Inahesabu kwenda juu kutoka 1 hadi ${start}`),
          t('Never stops counting', 'Haiachi kuhesabu kamwe'),
          t('Prints the blast-off message first', 'Inaonyesha ujumbe wa kuruka kwanza'),
        ],
        mutations: [
          { target: loop.id, apply: (st) => ({ ...st, cond: A.op('<', A.V('count'), A.N(0)) }), why: t('The condition is false at the start, so the loop never runs.', 'Sharti si kweli mwanzoni, kwa hivyo kitanzi hakiendeshwi kamwe.') },
          { target: dec.id, apply: (st) => ({ ...st, value: A.op('+', A.V('count'), A.N(1)) }), why: t('count goes UP, so it never reaches 0 and the loop never stops.', 'count inaongezeka, kwa hivyo haifikii 0 na kitanzi hakisimami.') },
          { target: loop.id, apply: (st) => ({ ...st, cond: A.op('>', A.V('count'), A.N(1)) }), why: t('It stops at 2 and never prints 1.', 'Inasimama kwa 2 na haionyeshi 1.') },
        ],
      };
    },
    (rng, loc) => {
      const litres = randInt(rng, 5, 9) * 10;
      const use = pick(rng, [15, 20, 25]);
      const s = A.set('water', litres);
      const day = A.set('days', 0);
      const sub = A.assign('water', A.op('-', A.V('water'), A.N(use)));
      const inc = A.assign('days', A.op('+', A.V('days'), A.N(1)));
      const loop = A.whileLoop(A.op('>=', A.V('water'), A.N(use)), [sub, inc]);
      const p = A.print(loc === 'sw' ? 'Siku: ' : 'Days: ', A.V('days'));
      return {
        program: [s, day, loop, p],
        keyId: loop.id,
        what: t(`Uses ${use} litres from a ${litres}-litre water tank each day and counts how many full days it lasts`, `Inatumia lita ${use} kutoka tangi la lita ${litres} kila siku na kuhesabu siku kamili linazodumu`),
        notWhat: [
          t('Fills the tank with more water every day', 'Inajaza tangi maji zaidi kila siku'),
          t('Prints the water left after every day', 'Inaonyesha maji yaliyobaki baada ya kila siku'),
          t('Always prints Days: 1', 'Inaonyesha Siku: 1 kila mara'),
        ],
        mutations: [
          { target: sub.id, apply: (st) => ({ ...st, value: A.op('+', A.V('water'), A.N(use)) }), why: t('Water is added instead of used, so the tank never empties.', 'Maji yanaongezwa badala ya kutumika, kwa hivyo tangi haliishi.') },
          { target: inc.id, apply: (st) => ({ ...st, value: A.N(1) }), why: t('days is set to 1 every time instead of counting up.', 'days inawekwa kuwa 1 kila mara badala ya kuongezeka.') },
          { target: loop.id, apply: (st) => ({ ...st, cond: A.op('<=', A.V('water'), A.N(use)) }), why: t('The comparison is backwards, so the loop does not run while there is enough water.', 'Ulinganisho umegeuzwa, kwa hivyo kitanzi hakiendeshwi wakati maji yanatosha.') },
          { target: loop.id, apply: (st) => ({ ...st, cond: A.op('>', A.V('water'), A.N(use)) }), why: t('When exactly enough water is left for one more day, > skips that day. It should be >=.', 'Maji yakibaki ya kutosha siku moja kamili, > inaruka siku hiyo. Inapaswa kuwa >=.') },
        ],
      };
    },
  ],

  lists: [
    (rng, loc) => {
      const fruits = loc === 'sw' ? ['embe', 'ndizi', 'chungwa', 'papai'] : ['mango', 'banana', 'orange', 'pawpaw'];
      const l = A.list('fruits', fruits.slice(0, 3), 'str');
      const p1 = A.print(loc === 'sw' ? 'Ya kwanza: ' : 'First: ', A.idx('fruits', 0));
      const p2 = A.print(loc === 'sw' ? 'Ya mwisho: ' : 'Last: ', A.idx('fruits', 2));
      const p3 = A.print(loc === 'sw' ? 'Idadi: ' : 'How many: ', A.len('fruits'));
      return {
        program: [l, p1, p2, p3],
        keyId: p1.id,
        what: t('Makes a list of 3 fruits and prints the first one, the last one and how many there are', 'Inatengeneza orodha ya matunda 3 na kuonyesha la kwanza, la mwisho na idadi yake'),
        notWhat: [
          t('Prints every fruit in the list', 'Inaonyesha kila tunda kwenye orodha'),
          t('Adds a new fruit to the list', 'Inaongeza tunda jipya kwenye orodha'),
          t('Sorts the fruits from A to Z', 'Inapanga matunda kutoka A hadi Z'),
        ],
        mutations: [
          { target: p1.id, apply: (st) => ({ ...st, parts: [st.parts[0], A.idx('fruits', 1)] }), why: t('Lists start counting at position 0 in text languages (1 in block languages), so this picks the second fruit.', 'Orodha zinaanza kuhesabu nafasi 0 katika lugha za maandishi (1 katika lugha za vitalu), kwa hivyo hii inachagua tunda la pili.') },
          { target: p2.id, apply: (st) => ({ ...st, parts: [st.parts[0], A.idx('fruits', 3)] }), why: t('There is no fruit at that position - the last one is one place earlier.', 'Hakuna tunda katika nafasi hiyo - la mwisho liko nafasi moja nyuma.') },
          { target: p1.id, apply: (st) => ({ ...st, parts: [st.parts[0], A.idx('fruits', 2)] }), why: t('This picks the last fruit, not the first.', 'Hii inachagua tunda la mwisho, si la kwanza.') },
        ],
      };
    },
    (rng, loc) => {
      const scores = [randInt(rng, 2, 9), randInt(rng, 2, 9), randInt(rng, 2, 9), randInt(rng, 2, 9)];
      const l = A.list('bottles', scores, 'int');
      const s = A.set('total', 0);
      const add = A.assign('total', A.op('+', A.V('total'), A.V('b')));
      const loop = A.forEach('b', 'bottles', [add]);
      const p = A.print(loc === 'sw' ? 'Chupa zilizokusanywa: ' : 'Bottles collected: ', A.V('total'));
      return {
        program: [l, s, loop, p],
        keyId: add.id,
        what: t('Adds up the bottles each class collected for recycling and prints the total', 'Inajumlisha chupa ambazo kila darasa lilikusanya kwa urejelezaji na kuonyesha jumla'),
        notWhat: [
          t('Prints how many classes there are', 'Inaonyesha idadi ya madarasa'),
          t('Prints only the biggest number', 'Inaonyesha namba kubwa zaidi tu'),
          t('Prints each number on its own line', 'Inaonyesha kila namba kwenye mstari wake'),
        ],
        mutations: [
          { target: add.id, apply: (st) => ({ ...st, value: A.V('b') }), why: t('It replaces the total each time instead of adding to it, so only the last number is kept.', 'Inabadilisha jumla kila mara badala ya kuongeza, kwa hivyo namba ya mwisho tu inabaki.') },
          { target: add.id, apply: (st) => ({ ...st, value: A.op('+', A.V('total'), A.N(1)) }), why: t('It counts the items (+1) instead of adding their values.', 'Inahesabu vitu (+1) badala ya kujumlisha thamani zake.') },
          { target: add.id, apply: (st) => ({ ...st, value: A.op('*', A.V('total'), A.V('b')) }), why: t('It multiplies, and since total starts at 0 the answer is always 0.', 'Inazidisha, na kwa kuwa jumla inaanza na 0 jibu ni 0 kila mara.') },
        ],
      };
    },
  ],

  functions: [
    (rng, loc) => {
      const cheer = loc === 'sw' ? 'Hongera timu yetu!' : 'Go team, go!';
      const f = A.func('cheer', [], null, [A.print(cheer)]);
      const p = A.print(loc === 'sw' ? 'Mko tayari?' : 'Ready?');
      const c1 = A.callStmt('cheer');
      const c2 = A.callStmt('cheer');
      return {
        program: [f, p, c1, c2],
        keyId: c1.id,
        what: t('Defines a cheer function once and uses it twice', 'Inafafanua kitendakazi cha kushangilia mara moja na kukitumia mara mbili'),
        notWhat: [
          t('Prints the cheer only once', 'Inaonyesha shangwe mara moja tu'),
          t('Prints the word "cheer"', 'Inaonyesha neno "cheer"'),
          t('Defines the function but never uses it', 'Inafafanua kitendakazi lakini haikitumii kamwe'),
        ],
        mutations: [
          { target: c1.id, apply: (st) => ({ ...st, name: 'cheers' }), why: t('The function is called "cheer" - names must match exactly.', 'Kitendakazi kinaitwa "cheer" - majina lazima yalingane kabisa.') },
          { target: c1.id, apply: (st) => ({ ...st, name: 'Cheer' }), why: t('Capital letters matter: "Cheer" is not the same name as "cheer".', 'Herufi kubwa ni muhimu: "Cheer" si jina sawa na "cheer".') },
        ],
      };
    },
  ],

  parameters_return: [
    (rng, loc) => {
      const n = randInt(rng, 3, 12);
      const r = A.ret(A.op('*', A.V('n'), A.N(2)));
      const f = A.func('twice', [['n', 'int']], 'int', [r]);
      const p = A.print(loc === 'sw' ? `Mara mbili ya ${n} ni ` : `Double ${n} is `, A.call('twice', [A.N(n)]));
      return {
        program: [f, p],
        keyId: r.id,
        what: t('A function receives a number and returns it doubled; the answer is printed', 'Kitendakazi kinapokea namba na kurudisha mara mbili yake; jibu linaonyeshwa'),
        notWhat: [
          t('Prints the number without changing it', 'Inaonyesha namba bila kuibadilisha'),
          t('Adds 2 to the number', 'Inaongeza 2 kwenye namba'),
          t('Calls the function forever', 'Inaita kitendakazi milele'),
        ],
        mutations: [
          { target: r.id, apply: (st) => ({ ...st, value: A.op('+', A.V('n'), A.N(2)) }), why: t('Double means multiply by 2, not add 2.', 'Mara mbili ina maana kuzidisha kwa 2, si kuongeza 2.') },
          { target: r.id, apply: (st) => ({ ...st, value: A.op('*', A.V('n'), A.V('n')) }), why: t('n * n squares the number instead of doubling it.', 'n * n inazidisha namba kwa yenyewe badala ya kuizidisha mara mbili.') },
          { target: r.id, apply: (st) => ({ ...st, value: A.N(2) }), why: t('It always returns 2 and ignores the number it was given.', 'Inarudisha 2 kila mara na kupuuza namba iliyopewa.') },
        ],
      };
    },
    (rng, loc) => {
      const w = randInt(rng, 3, 8);
      const h = randInt(rng, 2, 7);
      const r = A.ret(A.op('*', A.V('width'), A.V('length')));
      const f = A.func('area', [['width', 'int'], ['length', 'int']], 'int', [r]);
      const p = A.print(loc === 'sw' ? 'Eneo la shamba: ' : 'Garden area: ', A.call('area', [A.N(w), A.N(h)]));
      return {
        program: [f, p],
        keyId: r.id,
        what: t('A function works out the area of a garden from its width and length', 'Kitendakazi kinakokotoa eneo la shamba kutoka upana na urefu wake'),
        notWhat: [
          t('Prints the width and the length', 'Inaonyesha upana na urefu'),
          t('Works out the distance around the garden', 'Inakokotoa umbali kuzunguka shamba'),
          t('Draws the garden', 'Inachora shamba'),
        ],
        mutations: [
          { target: r.id, apply: (st) => ({ ...st, value: A.op('+', A.V('width'), A.V('length')) }), why: t('Area is width × length, not width + length.', 'Eneo ni upana × urefu, si upana + urefu.') },
          { target: r.id, apply: (st) => ({ ...st, value: A.op('*', A.V('width'), A.V('width')) }), why: t('It uses width twice and forgets the length.', 'Inatumia upana mara mbili na kusahau urefu.') },
        ],
      };
    },
  ],
};

// ---------------------------------------------------------------------------
// Concept definitions
// ---------------------------------------------------------------------------

const CONCEPTS = [
  {
    id: 'sequence', order: 1, prereqs: [], icon: '👣',
    name: t('Step-by-step instructions', 'Maagizo hatua kwa hatua'),
    explain: t('A program is a list of instructions. The computer does them one at a time, from top to bottom, exactly as written.', 'Programu ni orodha ya maagizo. Kompyuta inayafanya moja baada ya jingine, kutoka juu hadi chini, kama yalivyoandikwa.'),
    analogy: t('Like a recipe for chapati: if you cook before you mix the dough, it will not work!', 'Kama mapishi ya chapati: ukipika kabla ya kukanda unga, haitafaulu!'),
    tip: t('Read the code from the top line down, one line at a time.', 'Soma msimbo kutoka mstari wa juu kwenda chini, mstari mmoja kwa wakati.'),
    remember: {
      q: t('In what order does a computer follow the instructions in a program?', 'Kompyuta hufuata maagizo ya programu kwa mpangilio gani?'),
      correct: t('From top to bottom, one at a time', 'Kutoka juu hadi chini, moja baada ya jingine'),
      wrong: [t('In any order it likes', 'Kwa mpangilio wowote inaopenda'), t('From the bottom up', 'Kutoka chini kwenda juu'), t('All at exactly the same time', 'Yote kwa wakati mmoja kabisa')],
    },
    create: t('Write a program that prints the steps for planting a tree (or making tea), one step per line, in the right order.', 'Andika programu inayoonyesha hatua za kupanda mti (au kupika chai), hatua moja kwa kila mstari, kwa mpangilio sahihi.'),
  },
  {
    id: 'output', order: 2, prereqs: ['sequence'], icon: '💬',
    name: t('Showing messages (output)', 'Kuonyesha jumbe (matokeo)'),
    explain: t('Output is how a program talks to you. A print command shows text or numbers on the screen.', 'Matokeo ni jinsi programu inavyozungumza nawe. Amri ya kuonyesha (print) inaonyesha maandishi au namba kwenye skrini.'),
    analogy: t('Like the program writing on the class blackboard so everyone can read it.', 'Kama programu ikiandika ubaoni darasani ili kila mtu aweze kusoma.'),
    tip: t('Text goes inside quote marks " ". Numbers do not need quotes.', 'Maandishi huwekwa ndani ya alama za nukuu " ". Namba hazihitaji nukuu.'),
    rememberAsk: t('Which line shows a message on the screen?', 'Mstari upi unaonyesha ujumbe kwenye skrini?'),
    create: t('Make a mini poster: print at least 3 lines about your favourite animal found in Kenya.', 'Tengeneza bango dogo: onyesha angalau mistari 3 kuhusu mnyama unayempenda anayepatikana Kenya.'),
  },
  {
    id: 'variables', order: 3, prereqs: ['output'], icon: '📦',
    name: t('Variables', 'Vigeu'),
    explain: t('A variable is a named box that stores a value, like a name or a number, so you can use it again later.', 'Kigeu ni sanduku lenye jina linalohifadhi thamani, kama jina au namba, ili uweze kuitumia tena baadaye.'),
    analogy: t('Like a labelled jar in the kitchen: the label is the name, and what is inside is the value.', 'Kama mtungi wenye lebo jikoni: lebo ni jina, na kilichomo ndani ni thamani.'),
    tip: t('To use a variable, write its name WITHOUT quote marks.', 'Kutumia kigeu, andika jina lake BILA alama za nukuu.'),
    rememberAsk: t('Which line stores a value in a variable?', 'Mstari upi unahifadhi thamani kwenye kigeu?'),
    create: t('Store your name, your age and your favourite food in variables, then print a sentence that uses all three.', 'Hifadhi jina lako, umri wako na chakula unachokipenda kwenye vigeu, kisha onyesha sentensi inayotumia vyote vitatu.'),
  },
  {
    id: 'arithmetic', order: 4, prereqs: ['variables'], icon: '➕',
    name: t('Numbers and maths', 'Namba na hesabu'),
    explain: t('Computers are super-fast calculators. Use + to add, - to subtract, * to multiply and % for the remainder.', 'Kompyuta ni vikokotoo vyenye kasi sana. Tumia + kujumlisha, - kutoa, * kuzidisha na % kupata baki.'),
    analogy: t('Like counting money at the market: add what you sell, subtract what you spend.', 'Kama kuhesabu pesa sokoni: jumlisha unachouza, toa unachotumia.'),
    tip: t('Work out the value of each variable line by line, like on a calculator.', 'Kokotoa thamani ya kila kigeu mstari kwa mstari, kama kwenye kikokotoo.'),
    rememberAsk: t('Which line adds two numbers together?', 'Mstari upi unajumlisha namba mbili?'),
    create: t('A solar panel makes 5 units of power every hour. Store the hours of sunshine in a variable, then print the total power made.', 'Paneli ya jua inazalisha vipimo 5 vya umeme kila saa. Hifadhi saa za jua kwenye kigeu, kisha onyesha jumla ya umeme uliozalishwa.'),
  },
  {
    id: 'conditionals', order: 5, prereqs: ['arithmetic'], icon: '🔀',
    name: t('Making decisions (if / else)', 'Kufanya maamuzi (if / else)'),
    explain: t('An if statement checks a condition. If it is true, one block of code runs; otherwise (else) a different block runs.', 'Kauli ya if inaangalia sharti. Likiwa kweli, sehemu moja ya msimbo inaendeshwa; la sivyo (else) sehemu nyingine inaendeshwa.'),
    analogy: t('If it is raining, take an umbrella; else, wear a cap.', 'Kama mvua inanyesha, chukua mwavuli; la sivyo, vaa kofia.'),
    tip: t('Check the comparison sign: > means greater than, < means less than, >= means greater than or equal.', 'Angalia alama ya ulinganisho: > ni zaidi ya, < ni chini ya, >= ni zaidi ya au sawa na.'),
    rememberAsk: t('Which line checks a condition to make a decision?', 'Mstari upi unaangalia sharti ili kufanya uamuzi?'),
    create: t('Recycling sorter: store an item (like "plastic" or "paper"). If it is plastic print "Blue bin", otherwise print "Green bin".', 'Kipangaji cha urejelezaji: hifadhi kitu (kama "plastiki" au "karatasi"). Kikiwa plastiki onyesha "Pipa la bluu", la sivyo onyesha "Pipa la kijani".'),
  },
  {
    id: 'loops', order: 6, prereqs: ['variables'], icon: '🔁',
    name: t('Loops (repeat)', 'Vitanzi (kurudia)'),
    explain: t('A loop repeats code so you do not have to copy it. A counting loop repeats a set number of times.', 'Kitanzi kinarudia msimbo ili usilazimike kuunakili. Kitanzi cha kuhesabu kinarudia idadi fulani ya mara.'),
    analogy: t('Like a teacher saying "skip 10 times!" instead of "skip, skip, skip..."', 'Kama mwalimu akisema "ruka kamba mara 10!" badala ya "ruka, ruka, ruka..."'),
    tip: t('Check where the loop starts and where it stops - many bugs are "off by one".', 'Angalia kitanzi kinaanzia wapi na kinasimama wapi - makosa mengi ni ya "kuzidi kwa moja".'),
    rememberAsk: t('Which line starts a loop that repeats code?', 'Mstari upi unaanzisha kitanzi kinachorudia msimbo?'),
    create: t('Use a loop to count how many trees 5 friends plant if each plants 3, and print the total. Then change the numbers!', 'Tumia kitanzi kuhesabu miti ambayo marafiki 5 wanapanda kila mmoja akipanda 3, na uonyeshe jumla. Kisha badilisha namba!'),
  },
  {
    id: 'while_loops', order: 7, prereqs: ['loops', 'conditionals'], icon: '⏳',
    name: t('Repeat while true (while loops)', 'Rudia wakati ni kweli (vitanzi vya while)'),
    explain: t('A while loop keeps repeating as long as a condition is true. Something inside must change, or it never stops!', 'Kitanzi cha while kinaendelea kurudia muda wote sharti likiwa kweli. Kitu ndani lazima kibadilike, la sivyo hakisimami!'),
    analogy: t('While the bucket is not full, keep pouring water.', 'Wakati ndoo haijajaa, endelea kumimina maji.'),
    tip: t('Find the variable in the condition and check that the loop changes it each time.', 'Tafuta kigeu kilicho kwenye sharti na uhakikishe kitanzi kinakibadilisha kila mara.'),
    rememberAsk: t('Which line repeats code while a condition is true?', 'Mstari upi unarudia msimbo wakati sharti ni kweli?'),
    create: t('Water tank: start with 100 litres. Each day the family uses 15 litres. Use a while loop to print the litres left each day until there is not enough for another day.', 'Tangi la maji: anza na lita 100. Kila siku familia inatumia lita 15. Tumia kitanzi cha while kuonyesha lita zilizobaki kila siku hadi zisitoshe kwa siku nyingine.'),
  },
  {
    id: 'lists', order: 8, prereqs: ['loops'], icon: '📋',
    name: t('Lists', 'Orodha'),
    explain: t('A list stores many values in one variable, in order. Each value has a position number called an index.', 'Orodha inahifadhi thamani nyingi katika kigeu kimoja, kwa mpangilio. Kila thamani ina namba ya nafasi inayoitwa faharasa (index).'),
    analogy: t('Like seats on a matatu: each passenger has a seat number.', 'Kama viti kwenye matatu: kila abiria ana namba ya kiti.'),
    tip: t('Text languages count list positions from 0; block languages count from 1.', 'Lugha za maandishi huhesabu nafasi za orodha kuanzia 0; lugha za vitalu kuanzia 1.'),
    rememberAsk: t('Which line makes a list of values?', 'Mstari upi unatengeneza orodha ya thamani?'),
    create: t('Make a list of 5 things that can be recycled, then use a loop to print each one.', 'Tengeneza orodha ya vitu 5 vinavyoweza kurejelezwa, kisha tumia kitanzi kuonyesha kila kimoja.'),
  },
  {
    id: 'functions', order: 9, prereqs: ['sequence', 'output'], icon: '🧩',
    name: t('Functions', 'Vitendakazi'),
    explain: t('A function is a named group of instructions. Define it once, then call it by name whenever you need it.', 'Kitendakazi ni kikundi cha maagizo chenye jina. Kifafanue mara moja, kisha kiite kwa jina lake wakati wowote unapokihitaji.'),
    analogy: t('Like a song your class knows: the teacher just says the song name and everyone sings it.', 'Kama wimbo darasa lenu linaoujua: mwalimu anataja jina la wimbo na kila mtu anaimba.'),
    tip: t('A function only runs when it is called. Check the name in the call matches exactly.', 'Kitendakazi kinaendeshwa tu kinapoitwa. Hakikisha jina katika mwito linalingana kabisa.'),
    rememberAsk: t('Which line defines (creates) a function?', 'Mstari upi unafafanua (unaunda) kitendakazi?'),
    create: t('Write a function that prints a cheer for your school team, then call it 3 times.', 'Andika kitendakazi kinachoonyesha shangwe kwa timu ya shule yako, kisha kiite mara 3.'),
  },
  {
    id: 'parameters_return', order: 10, prereqs: ['functions', 'arithmetic'], icon: '🎁',
    name: t('Inputs and answers (parameters & return)', 'Pembejeo na majibu (vigezo na return)'),
    explain: t('Parameters let you give a function information. return sends an answer back to the code that called it.', 'Vigezo vinakuruhusu kukipa kitendakazi taarifa. return inarudisha jibu kwa msimbo uliokiita.'),
    analogy: t('Like a posho mill: you put maize in (parameter) and flour comes back out (return).', 'Kama kinu cha posho: unaweka mahindi (kigezo) na unga unarudi (return).'),
    tip: t('Replace each parameter with the value passed in, then work out what is returned.', 'Badilisha kila kigezo kwa thamani iliyopitishwa, kisha kokotoa kinachorudishwa.'),
    rememberAsk: t('Which line sends an answer back from a function?', 'Mstari upi unarudisha jibu kutoka kwa kitendakazi?'),
    create: t('Write a function that takes a number of days and returns how many hours that is. Print the answer for 3 different numbers.', 'Andika kitendakazi kinachopokea idadi ya siku na kurudisha ni saa ngapi. Onyesha jibu kwa namba 3 tofauti.'),
  },
  // Web-only concepts (HTML & CSS) - content lives in webBank.js
  {
    id: 'html_structure', order: 11, prereqs: [], icon: '🌐', webOnly: true,
    name: t('Web page structure (HTML)', 'Muundo wa ukurasa wa wavuti (HTML)'),
    explain: t('HTML uses tags like <h1> and <p> to tell the browser what each part of a page is: a heading, a paragraph, a picture...', 'HTML inatumia lebo kama <h1> na <p> kuiambia kivinjari kila sehemu ya ukurasa ni nini: kichwa, aya, picha...'),
    analogy: t('Like labelling the parts of an exercise book: title, date, paragraph.', 'Kama kuweka lebo sehemu za daftari: kichwa, tarehe, aya.'),
    tip: t('Most tags come in pairs: an opening tag <p> and a closing tag </p>.', 'Lebo nyingi huja kwa jozi: lebo ya kufungua <p> na lebo ya kufunga </p>.'),
    create: t('Build a web page about your county: a heading, two paragraphs and a list of 3 places to visit.', 'Jenga ukurasa wa wavuti kuhusu kaunti yako: kichwa, aya mbili na orodha ya maeneo 3 ya kutembelea.'),
  },
  {
    id: 'css_styling', order: 12, prereqs: ['html_structure'], icon: '🎨', webOnly: true,
    name: t('Styling pages (CSS)', 'Kupamba kurasa (CSS)'),
    explain: t('CSS changes how HTML looks: colours, sizes, spacing and fonts. A rule picks elements and sets properties.', 'CSS inabadilisha jinsi HTML inavyoonekana: rangi, ukubwa, nafasi na fonti. Kanuni inachagua vipengele na kuweka sifa.'),
    analogy: t('HTML is the house; CSS is the paint and decoration.', 'HTML ni nyumba; CSS ni rangi na mapambo.'),
    tip: t('Every CSS property ends with a semicolon, and rules go inside curly braces { }.', 'Kila sifa ya CSS inaishia na nukta-mkato, na kanuni huwekwa ndani ya mabano { }.'),
    create: t('Style your county page: make the heading green, give the page a light background and make the list text bigger.', 'Pamba ukurasa wa kaunti yako: fanya kichwa kiwe kijani, upe ukurasa rangi nyepesi ya nyuma na ufanye maandishi ya orodha yawe makubwa.'),
  },
];

/** Tiny canonical programs whose key line is the "signature" of each concept (Remember level). */
const signatures = {
  output: () => { const p = A.print('Hello'); return { program: [p], keyId: p.id }; },
  variables: () => { const s = A.set('score', 10); return { program: [s], keyId: s.id }; },
  arithmetic: () => { const a = A.set('a', 4); const b = A.set('b', 3); const s = A.set('total', A.op('+', A.V('a'), A.V('b'))); return { program: [a, b, s], keyId: s.id }; },
  conditionals: () => { const a = A.set('age', 10); const i = A.ifElse(A.op('>', A.V('age'), A.N(9)), [A.print('Yes')]); return { program: [a, i], keyId: i.id }; },
  loops: () => { const l = A.forRange('i', 0, 5, [A.print(A.V('i'))]); return { program: [l], keyId: l.id }; },
  while_loops: () => { const n = A.set('n', 0); const w = A.whileLoop(A.op('<', A.V('n'), A.N(5)), [A.assign('n', A.op('+', A.V('n'), A.N(1)))]); return { program: [n, w], keyId: w.id }; },
  lists: () => { const l = A.list('fruits', ['mango', 'banana'], 'str'); return { program: [l], keyId: l.id }; },
  functions: () => { const f = A.func('sayHi', [], null, [A.print('Hi')]); return { program: [f, A.callStmt('sayHi')], keyId: f.id }; },
  parameters_return: () => { const r = A.ret(A.op('*', A.V('n'), A.N(2))); const f = A.func('twice', [['n', 'int']], 'int', [r]); return { program: [f, A.print(A.call('twice', [A.N(3)]))], keyId: r.id }; },
};

// Extra practice programs live in moreContent.js so learners meet new questions at every level.
const { moreScenarios } = require('./moreContent');
Object.entries(moreScenarios).forEach(([id, list]) => { scenarios[id] = [...(scenarios[id] || []), ...list]; });

const BY_ID = Object.fromEntries(CONCEPTS.map((c) => [c.id, c]));

module.exports = { CONCEPTS, BY_ID, scenarios, signatures, NAMES };
