'use strict';
/**
 * Extra offline content so learners meet NEW questions while they practise each
 * Bloom level (a level needs several correct answers before it is mastered).
 *
 *  - moreScenarios: more practice programs per concept (Understand, Apply, Analyse,
 *    Evaluate are all built from these). Verified by tests/verify-renderers.js.
 *  - rememberPool: extra fact questions per concept (Remember level).
 *  - createPool: extra open-ended project ideas per concept (Create level).
 *
 * Printed text avoids apostrophes and quote marks so it renders safely in every language.
 * Swahili strings should be reviewed by a native-speaking teacher before launch.
 */
const A = require('./program/ast');
const { pick, randInt } = require('./random');

const t = (en, sw) => ({ en, sw });
const NAMES = ['Amina', 'Baraka', 'Wanjiru', 'Otieno', 'Achieng', 'Kamau', 'Nekesa', 'Juma', 'Zawadi', 'Kiprono', 'Muthoni', 'Halima'];

// --- helpers ---------------------------------------------------------------

/** A 4-step "do these in order" program. Bugs swap the 2nd step for a later one. */
const stepsScenario = (stepsEn, stepsSw, what, notWhat) => (rng, loc) => {
  const steps = loc === 'sw' ? stepsSw : stepsEn;
  const prog = steps.map((s) => A.print(s));
  // The "key" (gap / bug) line is the 2nd or 3rd step, so each program gives two different questions.
  const k = randInt(rng, 1, 2);
  const others = [0, 1, 2, 3].filter((i) => i !== k);
  return {
    program: prog,
    keyId: prog[k].id,
    what,
    notWhat,
    mutations: others.map((i) => ({
      target: prog[k].id,
      apply: (s) => ({ ...s, parts: [A.S(steps[i])] }),
      why: i > k
        ? t('This step happens too early - the steps are out of order.', 'Hatua hii imekuja mapema mno - hatua haziko kwa mpangilio.')
        : t('This step was already done - the steps are out of order.', 'Hatua hii imeshafanyika - hatua haziko kwa mpangilio.'),
    })),
  };
};

const moreScenarios = {
  sequence: [
    stepsScenario(
      ['Boil the water', 'Add the tea leaves', 'Add milk and sugar', 'Pour into a cup'],
      ['Chemsha maji', 'Weka majani ya chai', 'Ongeza maziwa na sukari', 'Mimina kwenye kikombe'],
      t('Prints the 4 steps for making tea, in order', 'Inaonyesha hatua 4 za kupika chai, kwa mpangilio'),
      [t('Makes a real cup of tea', 'Inapika kikombe halisi cha chai'), t('Prints only the first step', 'Inaonyesha hatua ya kwanza tu'), t('Prints the steps backwards', 'Inaonyesha hatua kinyume')],
    ),
    stepsScenario(
      ['Wake up', 'Brush your teeth', 'Put on your uniform', 'Walk to school'],
      ['Amka', 'Piga mswaki', 'Vaa sare ya shule', 'Tembea kwenda shuleni'],
      t('Prints 4 morning steps for getting ready for school, in order', 'Inaonyesha hatua 4 za asubuhi za kujiandaa kwenda shule, kwa mpangilio'),
      [t('Wakes you up with an alarm', 'Inakuamsha kwa kengele'), t('Prints the steps in a random order', 'Inaonyesha hatua kwa mpangilio wa bahati nasibu'), t('Prints only the last step', 'Inaonyesha hatua ya mwisho tu')],
    ),
    stepsScenario(
      ['Wet your hands', 'Rub them with soap', 'Rinse with clean water', 'Dry your hands'],
      ['Lowesha mikono', 'Isugue kwa sabuni', 'Suuza kwa maji safi', 'Kausha mikono'],
      t('Prints the 4 steps for washing your hands, in order', 'Inaonyesha hatua 4 za kunawa mikono, kwa mpangilio'),
      [t('Prints the same step four times', 'Inaonyesha hatua ileile mara nne'), t('Turns on a water tap', 'Inafungua bomba la maji'), t('Prints the steps from the bottom up', 'Inaonyesha hatua kutoka chini kwenda juu')],
    ),
    stepsScenario(
      ['Stop at the edge of the road', 'Look right and left', 'Wait until it is clear', 'Walk across'],
      ['Simama ukingoni mwa barabara', 'Angalia kulia na kushoto', 'Subiri hadi iwe salama', 'Vuka barabara'],
      t('Prints the 4 steps for crossing a road safely, in order', 'Inaonyesha hatua 4 za kuvuka barabara kwa usalama, kwa mpangilio'),
      [t('Stops all the cars', 'Inasimamisha magari yote'), t('Prints the steps in any order', 'Inaonyesha hatua kwa mpangilio wowote'), t('Prints only the first step', 'Inaonyesha hatua ya kwanza tu')],
    ),
    stepsScenario(
      ['Fill the watering can', 'Walk to the garden', 'Water each seedling', 'Put the can away'],
      ['Jaza kopo la kumwagilia', 'Tembea hadi bustanini', 'Mwagilia kila mche', 'Weka kopo mahali pake'],
      t('Prints the 4 steps for watering the school garden, in order', 'Inaonyesha hatua 4 za kumwagilia bustani ya shule, kwa mpangilio'),
      [t('Waters the real garden', 'Inamwagilia bustani halisi'), t('Prints the last step first', 'Inaonyesha hatua ya mwisho kwanza'), t('Prints the same step four times', 'Inaonyesha hatua ileile mara nne')],
    ),
  ],

  output: [
    (rng, loc) => {
      const temp = randInt(rng, 18, 32);
      const lines = loc === 'sw'
        ? ['Taarifa ya hali ya hewa', 'Leo kuna jua.', `Joto ni nyuzi ${temp}.`]
        : ['Weather report', 'Today is sunny.', `It is ${temp} degrees.`];
      const prog = lines.map((l) => A.print(l));
      return {
        program: prog,
        keyId: prog[1].id,
        what: t('Shows a short weather report in three lines', 'Inaonyesha taarifa fupi ya hali ya hewa katika mistari mitatu'),
        notWhat: [t('Checks the real weather on the internet', 'Inaangalia hali halisi ya hewa kwenye intaneti'), t('Shows only the temperature', 'Inaonyesha joto tu'), t('Shows the same line three times', 'Inaonyesha mstari uleule mara tatu')],
        mutations: [
          { target: prog[1].id, apply: (s) => ({ ...s, bug: 'noQuotes' }), why: t('Text must be inside quote marks " " so the computer knows it is a message.', 'Maandishi lazima yawe ndani ya alama za nukuu " " ili kompyuta ijue ni ujumbe.') },
          { target: prog[1].id, apply: (s) => ({ ...s, parts: [A.S(loc === 'sw' ? 'Leo kuna mvua.' : 'Today is rainy.')] }), why: t('This prints the wrong weather for today.', 'Hii inaonyesha hali ya hewa isiyo sahihi ya leo.') },
        ],
      };
    },
    (rng, loc) => {
      const animals = loc === 'sw'
        ? [['Tembo', 'Amboseli', 'majani na matawi'], ['Twiga', 'Nairobi', 'majani ya miti'], ['Simba', 'Maasai Mara', 'nyama']]
        : [['The elephant', 'Amboseli', 'grass and branches'], ['The giraffe', 'Nairobi', 'tree leaves'], ['The lion', 'Maasai Mara', 'meat']];
      const i = randInt(rng, 0, animals.length - 1);
      const [name, place, food] = animals[i];
      const other = animals[(i + 1) % animals.length];
      const lines = loc === 'sw'
        ? [`${name}`, `Anaishi ${place}.`, `Anakula ${food}.`]
        : [`${name}`, `It lives in ${place}.`, `It eats ${food}.`];
      const prog = lines.map((l) => A.print(l));
      return {
        program: prog,
        keyId: prog[1].id,
        what: t('Prints a mini poster with three facts about an animal', 'Inaonyesha bango dogo lenye ukweli tatu kuhusu mnyama'),
        notWhat: [t('Draws a picture of the animal', 'Inachora picha ya mnyama'), t('Prints only the name of the animal', 'Inaonyesha jina la mnyama tu'), t('Asks you to type an animal', 'Inakuomba uandike mnyama')],
        mutations: [
          { target: prog[1].id, apply: (s) => ({ ...s, bug: 'noQuotes' }), why: t('Text must be inside quote marks " " so the computer knows it is a message.', 'Maandishi lazima yawe ndani ya alama za nukuu " " ili kompyuta ijue ni ujumbe.') },
          { target: prog[1].id, apply: (s) => ({ ...s, parts: [A.S(loc === 'sw' ? `Anaishi ${other[1]}.` : `It lives in ${other[1]}.`)] }), why: t('This prints the wrong place for this animal.', 'Hii inaonyesha mahali pasipo sahihi kwa mnyama huyu.') },
        ],
      };
    },
  ],

  variables: [
    (rng, loc) => {
      const name = pick(rng, NAMES);
      const grade = randInt(rng, 3, 8);
      const setName = A.set('pupil', name, 'str');
      const setGrade = A.set('grade', grade, 'int');
      const p = loc === 'sw' ? A.print(A.V('pupil'), ' yuko darasa la ', A.V('grade'), '.') : A.print(A.V('pupil'), ' is in grade ', A.V('grade'), '.');
      return {
        program: [setName, setGrade, p],
        keyId: setGrade.id,
        what: t('Stores a pupil name and a grade in variables, then prints a sentence using both', 'Inahifadhi jina la mwanafunzi na darasa kwenye vigeu, kisha inaonyesha sentensi ikivitumia vyote'),
        notWhat: [t('Prints the words "pupil" and "grade"', 'Inaonyesha maneno "pupil" na "grade"'), t('Moves the pupil to the next grade', 'Inampandisha mwanafunzi darasa linalofuata'), t('Asks the pupil for their grade', 'Inamwuliza mwanafunzi darasa lake')],
        mutations: [
          { target: setGrade.id, apply: (s) => ({ ...s, value: A.N(grade + 1) }), why: t('The grade variable is given the wrong value.', 'Kigeu cha darasa kimepewa thamani isiyo sahihi.') },
          { target: setGrade.id, apply: (s) => ({ ...s, value: A.N(grade + 2) }), why: t('The grade variable is given the wrong value.', 'Kigeu cha darasa kimepewa thamani isiyo sahihi.') },
          { target: p.id, apply: (s) => ({ ...s, parts: [A.S('pupil'), ...s.parts.slice(1)] }), why: t('"pupil" in quotes is just a word - it should use the variable without quotes.', '"pupil" ndani ya nukuu ni neno tu - inapaswa kutumia kigeu bila nukuu.') },
        ],
      };
    },
    (rng, loc) => {
      const first = randInt(rng, 3, 9);
      const later = first + randInt(rng, 2, 6);
      const s = A.set('trees', first);
      const p1 = A.print(loc === 'sw' ? 'Miti: ' : 'Trees: ', A.V('trees'));
      const change = A.assign('trees', A.N(later));
      const p2 = A.print(loc === 'sw' ? 'Miti sasa: ' : 'Trees now: ', A.V('trees'));
      return {
        program: [s, p1, change, p2],
        keyId: change.id,
        what: t('Stores a number of trees, prints it, changes it to a new number and prints it again', 'Inahifadhi idadi ya miti, inaionyesha, inaibadilisha kuwa namba mpya na kuionyesha tena'),
        notWhat: [t('Prints the same number twice', 'Inaonyesha namba ileile mara mbili'), t('Adds the two numbers together', 'Inajumlisha namba hizo mbili'), t('Prints the word trees twice', 'Inaonyesha neno miti mara mbili')],
        mutations: [
          { target: change.id, apply: (st) => ({ ...st, value: A.N(first) }), why: t('The variable is "changed" to the same value, so nothing changes.', 'Kigeu "kinabadilishwa" kuwa thamani ileile, kwa hivyo hakuna kinachobadilika.') },
          { target: change.id, apply: (st) => ({ ...st, value: A.N(later + 10) }), why: t('The variable is changed to the wrong number.', 'Kigeu kinabadilishwa kuwa namba isiyo sahihi.') },
        ],
      };
    },
  ],

  arithmetic: [
    (rng, loc) => {
      const price = randInt(rng, 2, 9) * 5;
      const count = randInt(rng, 2, 5);
      const s1 = A.set('price', price);
      const s2 = A.set('count', count);
      const total = A.set('cost', A.op('*', A.V('price'), A.V('count')));
      const p = loc === 'sw' ? A.print('Gharama: shilingi ', A.V('cost')) : A.print('Cost: ', A.V('cost'), ' shillings');
      return {
        program: [s1, s2, total, p],
        keyId: total.id,
        what: t('Multiplies the price by how many you buy and prints the cost', 'Inazidisha bei kwa idadi unayonunua na kuonyesha gharama'),
        notWhat: [t('Adds the price and the count', 'Inajumlisha bei na idadi'), t('Prints only the price of one item', 'Inaonyesha bei ya kitu kimoja tu'), t('Gives you change from your money', 'Inakupa chenji kutoka pesa zako')],
        mutations: [
          { target: total.id, apply: (st) => ({ ...st, value: A.op('+', A.V('price'), A.V('count')) }), why: t('It adds instead of multiplying.', 'Inajumlisha badala ya kuzidisha.') },
          { target: total.id, apply: (st) => ({ ...st, value: A.op('*', A.V('price'), A.V('price')) }), why: t('It multiplies the price by itself and forgets the count.', 'Inazidisha bei kwa yenyewe na kusahau idadi.') },
          { target: total.id, apply: (st) => ({ ...st, value: A.V('price') }), why: t('It only uses the price of one item.', 'Inatumia bei ya kitu kimoja tu.') },
        ],
      };
    },
    (rng, loc) => {
      const start = randInt(rng, 10, 14);
      const off = randInt(rng, 2, 5);
      const on = randInt(rng, 1, 4);
      const s1 = A.set('start', start);
      const s2 = A.set('off', off);
      const s3 = A.set('on', on);
      const now = A.set('people', A.op('+', A.op('-', A.V('start'), A.V('off')), A.V('on')));
      const p = A.print(loc === 'sw' ? 'Abiria ndani ya matatu: ' : 'People on the matatu: ', A.V('people'));
      return {
        program: [s1, s2, s3, now, p],
        keyId: now.id,
        what: t('Works out how many people are on a matatu after some get off and some get on', 'Inakokotoa idadi ya watu ndani ya matatu baada ya baadhi kushuka na wengine kupanda'),
        notWhat: [t('Counts only the people who got off', 'Inahesabu waliotoka tu'), t('Adds everyone together', 'Inajumlisha kila mtu'), t('Prints the bus fare', 'Inaonyesha nauli')],
        mutations: [
          { target: now.id, apply: (st) => ({ ...st, value: A.op('-', A.op('+', A.V('start'), A.V('off')), A.V('on')) }), why: t('The + and - are swapped: people getting off should be taken away.', 'Alama + na - zimebadilishana: wanaoshuka wanapaswa kutolewa.') },
          { target: now.id, apply: (st) => ({ ...st, value: A.op('-', A.V('start'), A.V('off')) }), why: t('It forgets to add the people who got on.', 'Inasahau kuongeza waliopanda.') },
          { target: now.id, apply: (st) => ({ ...st, value: A.op('+', A.op('+', A.V('start'), A.V('off')), A.V('on')) }), why: t('People getting off should be taken away, not added.', 'Wanaoshuka wanapaswa kutolewa, si kuongezwa.') },
        ],
      };
    },
  ],

  conditionals: [
    (rng, loc) => {
      const rain = randInt(rng, 0, 20);
      const s = A.set('rain', rain);
      const iff = A.ifElse(A.op('>', A.V('rain'), A.N(10)),
        [A.print(loc === 'sw' ? 'Beba mwavuli.' : 'Take an umbrella.')],
        [A.print(loc === 'sw' ? 'Huhitaji mwavuli.' : 'No umbrella needed.')]);
      return {
        program: [s, iff],
        keyId: iff.id,
        what: t('Checks if more than 10 mm of rain is expected and says whether to take an umbrella', 'Inaangalia kama mvua ya zaidi ya mm 10 inatarajiwa na kusema kama ubebe mwavuli'),
        notWhat: [t('Always says to take an umbrella', 'Inasema ubebe mwavuli kila mara'), t('Measures the real rain outside', 'Inapima mvua halisi nje'), t('Prints both messages', 'Inaonyesha jumbe zote mbili')],
        mutations: [
          { target: iff.id, apply: (st) => ({ ...st, cond: A.op('<', A.V('rain'), A.N(10)) }), why: t('The sign is backwards: lots of rain should mean take an umbrella.', 'Alama imegeuzwa: mvua nyingi inapaswa kumaanisha ubebe mwavuli.') },
          { target: iff.id, apply: (st) => ({ ...st, cond: A.op('>', A.V('rain'), A.N(100)) }), why: t('It compares with 100 instead of 10.', 'Inalinganisha na 100 badala ya 10.') },
          { target: iff.id, apply: (st) => ({ ...st, cond: A.op('==', A.V('rain'), A.N(10)) }), why: t('== only matches exactly 10; we want anything more than 10.', '== inalingana na 10 tu; tunataka chochote zaidi ya 10.') },
        ],
      };
    },
    (rng, loc) => {
      const n = randInt(rng, 3, 30);
      const s = A.set('n', n);
      const iff = A.ifElse(A.op('==', A.op('%', A.V('n'), A.N(2)), A.N(0)),
        [A.print(A.V('n'), loc === 'sw' ? ' ni namba shufwa' : ' is even')],
        [A.print(A.V('n'), loc === 'sw' ? ' ni namba witiri' : ' is odd')]);
      return {
        program: [s, iff],
        keyId: iff.id,
        what: t('Uses the remainder after dividing by 2 to say if a number is even or odd', 'Inatumia baki baada ya kugawanya kwa 2 kusema kama namba ni shufwa au witiri'),
        notWhat: [t('Divides the number by 2 and prints the answer', 'Inagawanya namba kwa 2 na kuonyesha jibu'), t('Always says the number is even', 'Inasema namba ni shufwa kila mara'), t('Counts from 1 to the number', 'Inahesabu kutoka 1 hadi namba hiyo')],
        mutations: [
          { target: iff.id, apply: (st) => ({ ...st, cond: A.op('==', A.op('%', A.V('n'), A.N(2)), A.N(1)) }), why: t('A remainder of 1 means odd, so the messages come out the wrong way round.', 'Baki ya 1 inamaanisha witiri, kwa hivyo jumbe zinatoka kinyume.') },
          { target: iff.id, apply: (st) => ({ ...st, cond: A.op('==', A.op('%', A.V('n'), A.N(3)), A.N(0)) }), why: t('Even numbers divide by 2, not 3.', 'Namba shufwa zinagawanyika kwa 2, si 3.') },
        ],
      };
    },
  ],

  loops: [
    (rng, loc) => {
      const k = randInt(rng, 2, 9);
      const loop = A.forRange('i', 1, 6, [A.print(A.N(k), ' x ', A.V('i'), ' = ', A.op('*', A.N(k), A.V('i')))]);
      const title = A.print(loc === 'sw' ? `Jedwali la ${k}:` : `The ${k} times table:`);
      return {
        program: [title, loop],
        keyId: loop.id,
        what: t(`Prints the ${k} times table from 1 to 5`, `Inaonyesha jedwali la kuzidisha la ${k} kutoka 1 hadi 5`),
        notWhat: [t(`Prints ${k} five times`, `Inaonyesha ${k} mara tano`), t('Adds the numbers 1 to 5', 'Inajumlisha namba 1 hadi 5'), t(`Prints the ${k} times table from 1 to 10`, `Inaonyesha jedwali la ${k} kutoka 1 hadi 10`)],
        mutations: [
          { target: loop.id, apply: (st) => ({ ...st, from: A.N(0) }), why: t('It starts at 0, so the table begins with a line it should not have.', 'Inaanza kwa 0, kwa hivyo jedwali linaanza na mstari usiotakiwa.') },
          { target: loop.id, apply: (st) => ({ ...st, to: A.N(5) }), why: t('It stops one line too early (an "off-by-one" bug).', 'Inasimama mstari mmoja mapema mno (kosa la "kuzidi kwa moja").') },
          { target: loop.id, apply: (st) => ({ ...st, to: A.N(7) }), why: t('It prints one line too many.', 'Inaonyesha mstari mmoja zaidi.') },
        ],
      };
    },
    (rng, loc) => {
      const n = randInt(rng, 2, 5);
      const loop = A.forRange('i', 0, n, [A.print(loc === 'sw' ? 'Hip hip hurray!' : 'Hip hip hooray!')]);
      const end = A.print(loc === 'sw' ? 'Tumeshinda!' : 'We won!');
      return {
        program: [loop, end],
        keyId: loop.id,
        what: t(`Prints a cheer ${n} times, then a winning message once`, `Inaonyesha shangwe mara ${n}, kisha ujumbe wa ushindi mara moja`),
        notWhat: [t('Prints the cheer once', 'Inaonyesha shangwe mara moja'), t(`Prints both messages ${n} times`, `Inaonyesha jumbe zote mbili mara ${n}`), t('Prints the numbers 0 to the end', 'Inaonyesha namba kutoka 0 hadi mwisho')],
        mutations: [
          { target: loop.id, apply: (st) => ({ ...st, to: A.N(n + 1) }), why: t('It repeats one time too many.', 'Inarudia mara moja zaidi.') },
          { target: loop.id, apply: (st) => ({ ...st, to: A.N(n - 1) }), why: t('It repeats one time too few.', 'Inarudia mara moja pungufu.') },
        ],
      };
    },
  ],

  while_loops: [
    (rng, loc) => {
      const save = pick(rng, [50, 100]);
      const goal = save * randInt(rng, 3, 6);
      const s1 = A.set('savings', 0);
      const s2 = A.set('weeks', 0);
      const add = A.assign('savings', A.op('+', A.V('savings'), A.N(save)));
      const inc = A.assign('weeks', A.op('+', A.V('weeks'), A.N(1)));
      const loop = A.whileLoop(A.op('<', A.V('savings'), A.N(goal)), [add, inc]);
      const p = A.print(loc === 'sw' ? 'Wiki zinazohitajika: ' : 'Weeks needed: ', A.V('weeks'));
      return {
        program: [s1, s2, loop, p],
        keyId: loop.id,
        what: t(`Saves ${save} shillings every week until there are ${goal}, counting the weeks`, `Inaweka akiba ya shilingi ${save} kila wiki hadi zifike ${goal}, ikihesabu wiki`),
        notWhat: [t('Spends money every week', 'Inatumia pesa kila wiki'), t('Prints the savings after every week', 'Inaonyesha akiba baada ya kila wiki'), t('Always prints Weeks needed: 1', 'Inaonyesha Wiki zinazohitajika: 1 kila mara')],
        mutations: [
          { target: loop.id, apply: (st) => ({ ...st, cond: A.op('<=', A.V('savings'), A.N(goal)) }), why: t('<= keeps going even when the goal is reached exactly, adding an extra week.', '<= inaendelea hata lengo likifikiwa kamili, na kuongeza wiki moja zaidi.') },
          { target: loop.id, apply: (st) => ({ ...st, cond: A.op('>', A.V('savings'), A.N(goal)) }), why: t('The condition is false at the start, so the loop never runs.', 'Sharti si kweli mwanzoni, kwa hivyo kitanzi hakiendeshwi kamwe.') },
          { target: inc.id, apply: (st) => ({ ...st, value: A.N(1) }), why: t('weeks is set to 1 every time instead of counting up.', 'weeks inawekwa kuwa 1 kila mara badala ya kuongezeka.') },
        ],
      };
    },
  ],

  lists: [
    (rng, loc) => {
      const pool = loc === 'sw' ? ['tembo', 'twiga', 'pundamilia', 'simba', 'kiboko'] : ['elephant', 'giraffe', 'zebra', 'lion', 'hippo'];
      const start = randInt(rng, 0, 2);
      const animals = pool.slice(start, start + 3);
      const l = A.list('animals', animals, 'str');
      const p = A.print(loc === 'sw' ? 'Nimemwona ' : 'I saw a ', A.V('a'));
      const loop = A.forEach('a', 'animals', [p]);
      return {
        program: [l, loop],
        keyId: p.id,
        what: t('Goes through a list of 3 animals and prints a sentence for each one', 'Inapitia orodha ya wanyama 3 na kuonyesha sentensi kwa kila mmoja'),
        notWhat: [t('Prints only the first animal', 'Inaonyesha mnyama wa kwanza tu'), t('Prints how many animals there are', 'Inaonyesha idadi ya wanyama'), t('Adds a new animal to the list', 'Inaongeza mnyama mpya kwenye orodha')],
        mutations: [
          { target: p.id, apply: (st) => ({ ...st, parts: [st.parts[0], A.S('a')] }), why: t('"a" in quotes is just the letter a - it should use the loop variable without quotes.', '"a" ndani ya nukuu ni herufi a tu - inapaswa kutumia kigeu cha kitanzi bila nukuu.') },
          { target: p.id, apply: (st) => ({ ...st, parts: [st.parts[0], A.idx('animals', 0)] }), why: t('It prints the first animal every time instead of each animal in turn.', 'Inaonyesha mnyama wa kwanza kila mara badala ya kila mnyama kwa zamu.') },
        ],
      };
    },
    (rng, loc) => {
      const rain = [randInt(rng, 1, 9), randInt(rng, 1, 9), randInt(rng, 1, 9), randInt(rng, 1, 9)];
      const l = A.list('rain', rain, 'int');
      const total = A.set('both', A.op('+', A.idx('rain', 0), A.idx('rain', 3)));
      const p = A.print(loc === 'sw' ? 'Siku ya kwanza na ya mwisho: ' : 'First and last day: ', A.V('both'));
      return {
        program: [l, total, p],
        keyId: total.id,
        what: t('Adds the rain on the first day and the last day of a 4-day list', 'Inajumlisha mvua ya siku ya kwanza na ya mwisho katika orodha ya siku 4'),
        notWhat: [t('Adds the rain on all four days', 'Inajumlisha mvua ya siku zote nne'), t('Prints how many days there are', 'Inaonyesha idadi ya siku'), t('Prints the biggest number of the list', 'Inaonyesha namba kubwa zaidi ya orodha')],
        mutations: [
          { target: total.id, apply: (st) => ({ ...st, value: A.op('+', A.idx('rain', 1), A.idx('rain', 3)) }), why: t('Position 1 is the second day - the first day is at position 0 (1 in block languages).', 'Nafasi 1 ni siku ya pili - siku ya kwanza iko nafasi 0 (1 katika lugha za vitalu).') },
          { target: total.id, apply: (st) => ({ ...st, value: A.op('+', A.idx('rain', 0), A.idx('rain', 2)) }), why: t('That is the third day, not the last one.', 'Hiyo ni siku ya tatu, si ya mwisho.') },
          { target: total.id, apply: (st) => ({ ...st, value: A.op('*', A.idx('rain', 0), A.idx('rain', 3)) }), why: t('It multiplies instead of adding.', 'Inazidisha badala ya kujumlisha.') },
        ],
      };
    },
    (rng, loc) => {
      const team = loc === 'sw' ? ['Amina', 'Baraka', 'Wanjiru', 'Otieno'] : ['Amina', 'Baraka', 'Wanjiru', 'Otieno'];
      const start = randInt(rng, 0, 1);
      const names = team.slice(start, start + 3);
      const l = A.list('team', names, 'str');
      const p = A.print(loc === 'sw' ? 'Nahodha: ' : 'Captain: ', A.idx('team', 1));
      const size = A.print(loc === 'sw' ? 'Wachezaji: ' : 'Players: ', A.len('team'));
      return {
        program: [l, p, size],
        keyId: p.id,
        what: t('Makes a list of 3 players, prints the second one as captain, then how many players there are', 'Inatengeneza orodha ya wachezaji 3, inaonyesha wa pili kama nahodha, kisha idadi ya wachezaji'),
        notWhat: [t('Prints the first player as captain', 'Inaonyesha mchezaji wa kwanza kama nahodha'), t('Prints all three players', 'Inaonyesha wachezaji wote watatu'), t('Adds a new player to the team', 'Inaongeza mchezaji mpya kwenye timu')],
        mutations: [
          { target: p.id, apply: (st) => ({ ...st, parts: [st.parts[0], A.idx('team', 0)] }), why: t('Position 0 is the first player, not the second (block languages count from 1).', 'Nafasi 0 ni mchezaji wa kwanza, si wa pili (lugha za vitalu zinahesabu kutoka 1).') },
          { target: p.id, apply: (st) => ({ ...st, parts: [st.parts[0], A.idx('team', 2)] }), why: t('That is the third player, not the second.', 'Huyo ni mchezaji wa tatu, si wa pili.') },
        ],
      };
    },
    (rng, loc) => {
      const all = loc === 'sw' ? ['Hisabati', 'Kiingereza', 'Sayansi', 'Kiswahili', 'Sanaa'] : ['Maths', 'English', 'Science', 'Kiswahili', 'Art'];
      const n = randInt(rng, 3, 5);
      const l = A.list('subjects', all.slice(0, n), 'str');
      const title = A.print(loc === 'sw' ? 'Ratiba yangu ya shule' : 'My school timetable');
      const p = A.print(loc === 'sw' ? 'Idadi ya masomo: ' : 'Number of subjects: ', A.len('subjects'));
      return {
        program: [title, l, p],
        keyId: p.id,
        what: t('Makes a list of school subjects and prints how many there are', 'Inatengeneza orodha ya masomo ya shule na kuonyesha idadi yake'),
        notWhat: [t('Prints every subject', 'Inaonyesha kila somo'), t('Prints the first subject', 'Inaonyesha somo la kwanza'), t('Adds a new subject', 'Inaongeza somo jipya')],
        mutations: [
          { target: p.id, apply: (st) => ({ ...st, parts: [st.parts[0], A.N(n + 1)] }), why: t('It prints a fixed number instead of asking the list for its real length.', 'Inaonyesha namba ya kudumu badala ya kuiuliza orodha urefu wake halisi.') },
          { target: p.id, apply: (st) => ({ ...st, parts: [st.parts[0], A.idx('subjects', 0)] }), why: t('That prints the first subject, not how many subjects there are.', 'Hiyo inaonyesha somo la kwanza, si idadi ya masomo.') },
        ],
      };
    },
  ],

  functions: [
    (rng, loc) => {
      const line = A.print('----------');
      const f = A.func('drawLine', [], null, [line]);
      const c1 = A.callStmt('drawLine');
      const menu = A.print(loc === 'sw' ? 'MENYU: Chapati na maharagwe' : 'MENU: Chapati and beans');
      const c2 = A.callStmt('drawLine');
      return {
        program: [f, c1, menu, c2],
        keyId: c2.id,
        what: t('Uses a drawLine function to put a line above and below the menu', 'Inatumia kitendakazi drawLine kuweka mstari juu na chini ya menyu'),
        notWhat: [t('Draws one line only', 'Inachora mstari mmoja tu'), t('Prints the word drawLine', 'Inaonyesha neno drawLine'), t('Prints the menu twice', 'Inaonyesha menyu mara mbili')],
        mutations: [
          { target: c2.id, apply: (st) => ({ ...st, name: 'drawline' }), why: t('Capital letters matter: "drawline" is not the same name as "drawLine".', 'Herufi kubwa ni muhimu: "drawline" si jina sawa na "drawLine".') },
          { target: c2.id, apply: (st) => ({ ...st, name: 'draw' }), why: t('There is no function called "draw" - the name must match exactly.', 'Hakuna kitendakazi kinachoitwa "draw" - jina lazima lilingane kabisa.') },
        ],
      };
    },
    (rng, loc) => {
      const times = randInt(rng, 2, 4);
      const f = A.func('chorus', [], null, [A.print(loc === 'sw' ? 'La la la!' : 'La la la!'), A.print(loc === 'sw' ? 'Imba nasi!' : 'Sing along!')]);
      const call = A.callStmt('chorus');
      const loop = A.forRange('i', 0, times, [call]);
      return {
        program: [f, loop],
        keyId: call.id,
        what: t(`Defines a two-line chorus once and uses a loop to sing it ${times} times`, `Inafafanua kiitikio cha mistari miwili mara moja na kutumia kitanzi kukiimba mara ${times}`),
        notWhat: [t('Sings the chorus once', 'Inaimba kiitikio mara moja'), t('Defines the chorus but never uses it', 'Inafafanua kiitikio lakini haikitumii kamwe'), t(`Prints only the first line ${times} times`, `Inaonyesha mstari wa kwanza tu mara ${times}`)],
        mutations: [
          { target: call.id, apply: (st) => ({ ...st, name: 'Chorus' }), why: t('Capital letters matter: "Chorus" is not the same name as "chorus".', 'Herufi kubwa ni muhimu: "Chorus" si jina sawa na "chorus".') },
          { target: call.id, apply: (st) => ({ ...st, name: 'song' }), why: t('There is no function called "song" - the name must match exactly.', 'Hakuna kitendakazi kinachoitwa "song" - jina lazima lilingane kabisa.') },
        ],
      };
    },
    (rng, loc) => {
      const f = A.func('washHands', [], null, [A.print(loc === 'sw' ? 'Nawa kwa sabuni' : 'Wash with soap'), A.print(loc === 'sw' ? 'Kausha mikono' : 'Dry your hands')]);
      const before = A.print(loc === 'sw' ? 'Ni wakati wa chakula cha mchana' : 'Time for lunch');
      const call = A.callStmt('washHands');
      const after = A.print(loc === 'sw' ? 'Kula chakula' : 'Eat your food');
      return {
        program: [f, before, call, after],
        keyId: call.id,
        what: t('Uses a washHands function between the lunch message and eating', 'Inatumia kitendakazi washHands kati ya ujumbe wa chakula na kula'),
        notWhat: [t('Never washes hands', 'Hainawi mikono kamwe'), t('Washes hands after eating', 'Inanawa mikono baada ya kula'), t('Prints the word washHands', 'Inaonyesha neno washHands')],
        mutations: [
          { target: call.id, apply: (st) => ({ ...st, name: 'WashHands' }), why: t('Capital letters matter: "WashHands" is not the same name as "washHands".', 'Herufi kubwa ni muhimu: "WashHands" si jina sawa na "washHands".') },
          { target: call.id, apply: (st) => ({ ...st, name: 'wash' }), why: t('There is no function called "wash" - the name must match exactly.', 'Hakuna kitendakazi kinachoitwa "wash" - jina lazima lilingane kabisa.') },
        ],
      };
    },
    (rng, loc) => {
      const morning = A.func('morning', [], null, [A.print(loc === 'sw' ? 'Habari za asubuhi!' : 'Good morning!')]);
      const evening = A.func('evening', [], null, [A.print(loc === 'sw' ? 'Habari za jioni!' : 'Good evening!')]);
      const c1 = A.callStmt('morning');
      const c2 = A.callStmt('evening');
      return {
        program: [morning, evening, c1, c2],
        keyId: c2.id,
        what: t('Defines a morning and an evening greeting, then uses them in that order', 'Inafafanua salamu ya asubuhi na ya jioni, kisha inazitumia kwa mpangilio huo'),
        notWhat: [t('Prints the evening greeting first', 'Inaonyesha salamu ya jioni kwanza'), t('Prints nothing because functions never run', 'Haionyeshi chochote kwa sababu vitendakazi haviendeshwi kamwe'), t('Prints the morning greeting twice', 'Inaonyesha salamu ya asubuhi mara mbili')],
        mutations: [
          { target: c2.id, apply: (st) => ({ ...st, name: 'morning' }), why: t('It calls morning again instead of evening.', 'Inaita morning tena badala ya evening.') },
          { target: c2.id, apply: (st) => ({ ...st, name: 'Evening' }), why: t('Capital letters matter: "Evening" is not the same name as "evening".', 'Herufi kubwa ni muhimu: "Evening" si jina sawa na "evening".') },
        ],
      };
    },
    (rng, loc) => {
      const rules = loc === 'sw' ? ['1. Sikiliza mwalimu', '2. Saidia wenzako', '3. Weka darasa safi'] : ['1. Listen to the teacher', '2. Help each other', '3. Keep the class clean'];
      const f = A.func('classRules', [], null, rules.map((r) => A.print(r)));
      const title = A.print(loc === 'sw' ? 'KANUNI ZA DARASA' : 'CLASS RULES');
      const call = A.callStmt('classRules');
      return {
        program: [f, title, call],
        keyId: call.id,
        what: t('Prints a title, then calls a function that prints 3 class rules', 'Inaonyesha kichwa, kisha inaita kitendakazi kinachoonyesha kanuni 3 za darasa'),
        notWhat: [t('Prints the rules before the title', 'Inaonyesha kanuni kabla ya kichwa'), t('Prints only the title', 'Inaonyesha kichwa tu'), t('Prints the rules twice', 'Inaonyesha kanuni mara mbili')],
        mutations: [
          { target: call.id, apply: (st) => ({ ...st, name: 'ClassRules' }), why: t('Capital letters matter: "ClassRules" is not the same name as "classRules".', 'Herufi kubwa ni muhimu: "ClassRules" si jina sawa na "classRules".') },
          { target: call.id, apply: (st) => ({ ...st, name: 'rules' }), why: t('There is no function called "rules" - the name must match exactly.', 'Hakuna kitendakazi kinachoitwa "rules" - jina lazima lilingane kabisa.') },
        ],
      };
    },
  ],

  parameters_return: [
    (rng, loc) => {
      const days = randInt(rng, 2, 6);
      const r = A.ret(A.op('*', A.V('days'), A.N(24)));
      const f = A.func('toHours', [['days', 'int']], 'int', [r]);
      const p = loc === 'sw'
        ? A.print(`Siku ${days} ni saa `, A.call('toHours', [A.N(days)]))
        : A.print(`${days} days is `, A.call('toHours', [A.N(days)]), ' hours');
      return {
        program: [f, p],
        keyId: r.id,
        what: t('A function turns days into hours and returns the answer', 'Kitendakazi kinabadilisha siku kuwa saa na kurudisha jibu'),
        notWhat: [t('Prints the number of days only', 'Inaonyesha idadi ya siku tu'), t('Adds 24 to the days', 'Inaongeza 24 kwenye siku'), t('Counts the hours one by one', 'Inahesabu saa moja moja')],
        mutations: [
          { target: r.id, apply: (st) => ({ ...st, value: A.op('+', A.V('days'), A.N(24)) }), why: t('Each day has 24 hours, so multiply by 24 - do not add.', 'Kila siku ina saa 24, kwa hivyo zidisha kwa 24 - usijumlishe.') },
          { target: r.id, apply: (st) => ({ ...st, value: A.op('*', A.V('days'), A.N(12)) }), why: t('A day has 24 hours, not 12.', 'Siku ina saa 24, si 12.') },
        ],
      };
    },
    (rng, loc) => {
      const h = randInt(rng, 2, 9);
      const r = A.ret(A.op('*', A.V('hours'), A.N(60)));
      const f = A.func('toMinutes', [['hours', 'int']], 'int', [r]);
      const p = loc === 'sw'
        ? A.print(`Saa ${h} ni dakika `, A.call('toMinutes', [A.N(h)]))
        : A.print(`${h} hours is `, A.call('toMinutes', [A.N(h)]), ' minutes');
      return {
        program: [f, p],
        keyId: r.id,
        what: t('A function turns hours into minutes and returns the answer', 'Kitendakazi kinabadilisha saa kuwa dakika na kurudisha jibu'),
        notWhat: [t('Prints the hours without changing them', 'Inaonyesha saa bila kuzibadilisha'), t('Adds 60 to the hours', 'Inaongeza 60 kwenye saa'), t('Counts down the minutes', 'Inahesabu dakika kurudi nyuma')],
        mutations: [
          { target: r.id, apply: (st) => ({ ...st, value: A.op('+', A.V('hours'), A.N(60)) }), why: t('Each hour has 60 minutes, so multiply by 60 - do not add.', 'Kila saa ina dakika 60, kwa hivyo zidisha kwa 60 - usijumlishe.') },
          { target: r.id, apply: (st) => ({ ...st, value: A.op('*', A.V('hours'), A.N(100)) }), why: t('An hour has 60 minutes, not 100.', 'Saa moja ina dakika 60, si 100.') },
          { target: r.id, apply: (st) => ({ ...st, value: A.N(60) }), why: t('It always returns 60 and ignores the hours it was given.', 'Inarudisha 60 kila mara na kupuuza saa iliyopewa.') },
        ],
      };
    },
  ],
};

// --- Remember: extra fact questions ------------------------------------------
const q = (qEn, qSw, correct, wrong) => ({ q: t(qEn, qSw), correct, wrong });

const rememberPool = {
  sequence: [
    q('What happens if you swap two lines of a program?', 'Nini kinatokea ukibadilisha mistari miwili ya programu?',
      t('The computer does them in the new order, which can change the result', 'Kompyuta inaifanya kwa mpangilio mpya, na matokeo yanaweza kubadilika'),
      [t('Nothing - the computer fixes the order', 'Hakuna - kompyuta inarekebisha mpangilio'), t('The program always crashes', 'Programu huharibika kila mara'), t('Only the first line runs', 'Mstari wa kwanza tu unaendeshwa')]),
    q('What is a program?', 'Programu ni nini?',
      t('A list of instructions for a computer', 'Orodha ya maagizo kwa kompyuta'),
      [t('A picture on the screen', 'Picha kwenye skrini'), t('A type of keyboard', 'Aina ya kibodi'), t('A computer game only', 'Mchezo wa kompyuta tu')]),
    q('Which line of a program does the computer do first?', 'Kompyuta hufanya mstari upi wa programu kwanza?',
      t('The top line', 'Mstari wa juu'),
      [t('The bottom line', 'Mstari wa chini'), t('The longest line', 'Mstari mrefu zaidi'), t('A line chosen at random', 'Mstari uliochaguliwa kwa bahati nasibu')]),
  ],
  output: [
    q('What does a print command do?', 'Amri ya print inafanya nini?',
      t('Shows text or numbers on the screen', 'Inaonyesha maandishi au namba kwenye skrini'),
      [t('Sends a page to a paper printer', 'Inatuma ukurasa kwenye printa ya karatasi'), t('Deletes a message', 'Inafuta ujumbe'), t('Asks the user a question', 'Inamwuliza mtumiaji swali')]),
    q('Why do we put text inside quote marks " "?', 'Kwa nini tunaweka maandishi ndani ya alama za nukuu " "?',
      t('So the computer knows it is a message, not code', 'Ili kompyuta ijue ni ujumbe, si msimbo'),
      [t('To make the text bold', 'Ili kufanya maandishi kuwa mazito'), t('To make it print twice', 'Ili ionyeshwe mara mbili'), t('Quotes are only for numbers', 'Nukuu ni za namba tu')]),
    q('Do numbers need quote marks to be printed?', 'Je, namba zinahitaji alama za nukuu ili kuonyeshwa?',
      t('No - numbers can be printed without quotes', 'Hapana - namba zinaweza kuonyeshwa bila nukuu'),
      [t('Yes, always', 'Ndiyo, kila mara'), t('Only big numbers', 'Namba kubwa tu'), t('Numbers can never be printed', 'Namba haziwezi kuonyeshwa kamwe')]),
  ],
  variables: [
    q('What is a variable?', 'Kigeu ni nini?',
      t('A named box that stores a value', 'Sanduku lenye jina linalohifadhi thamani'),
      [t('A mistake in the code', 'Kosa kwenye msimbo'), t('A kind of loop', 'Aina ya kitanzi'), t('A message on the screen', 'Ujumbe kwenye skrini')]),
    q('Can the value in a variable change?', 'Je, thamani ndani ya kigeu inaweza kubadilika?',
      t('Yes - you can give it a new value later', 'Ndiyo - unaweza kuipa thamani mpya baadaye'),
      [t('No, never', 'Hapana, kamwe'), t('Only on Mondays', 'Jumatatu tu'), t('Only if it is a word', 'Ikiwa ni neno tu')]),
    q('Why do variables have names?', 'Kwa nini vigeu vina majina?',
      t('So you can use the stored value again later', 'Ili uweze kutumia thamani iliyohifadhiwa tena baadaye'),
      [t('To make the program longer', 'Ili kurefusha programu'), t('Names are just decoration', 'Majina ni mapambo tu'), t('So the computer can print them in colour', 'Ili kompyuta iyaonyeshe kwa rangi')]),
  ],
  arithmetic: [
    q('Which symbol means multiply in most programming languages?', 'Alama ipi inamaanisha kuzidisha katika lugha nyingi za programu?',
      t('*', '*'), [t('x', 'x'), t('+', '+'), t('#', '#')]),
    q('What does 7 - 2 give?', '7 - 2 inatoa nini?', t('5', '5'), [t('9', '9'), t('14', '14'), t('72', '72')]),
    q('What does % (modulo) give you?', '% (modulo) inakupa nini?',
      t('The remainder after dividing', 'Baki baada ya kugawanya'),
      [t('A percentage', 'Asilimia'), t('The answer to a multiplication', 'Jibu la kuzidisha'), t('The bigger of two numbers', 'Namba kubwa kati ya mbili')]),
  ],
  conditionals: [
    q('What does an if statement do?', 'Kauli ya if inafanya nini?',
      t('Runs some code only when a condition is true', 'Inaendesha msimbo fulani tu sharti likiwa kweli'),
      [t('Repeats code forever', 'Inarudia msimbo milele'), t('Stores a value', 'Inahifadhi thamani'), t('Prints every message', 'Inaonyesha kila ujumbe')]),
    q('When does the else part run?', 'Sehemu ya else inaendeshwa lini?',
      t('When the condition is false', 'Sharti likiwa si kweli'),
      [t('Always, after the if part', 'Kila mara, baada ya sehemu ya if'), t('When the condition is true', 'Sharti likiwa kweli'), t('Never', 'Kamwe')]),
    q('Which sign means "greater than"?', 'Alama ipi inamaanisha "zaidi ya"?', t('>', '>'), [t('<', '<'), t('=', '='), t('%', '%')]),
  ],
  loops: [
    q('Why do we use loops?', 'Kwa nini tunatumia vitanzi?',
      t('To repeat code without copying it again and again', 'Kurudia msimbo bila kuunakili tena na tena'),
      [t('To stop a program', 'Kusimamisha programu'), t('To store a name', 'Kuhifadhi jina'), t('To make a decision', 'Kufanya uamuzi')]),
    q('A counting loop that runs from 0 up to (but not including) 3 repeats how many times?', 'Kitanzi cha kuhesabu kutoka 0 hadi (bila kujumuisha) 3 kinarudia mara ngapi?',
      t('3 times', 'Mara 3'), [t('2 times', 'Mara 2'), t('4 times', 'Mara 4'), t('0 times', 'Mara 0')]),
    q('What is one trip through a loop called?', 'Mzunguko mmoja wa kitanzi unaitwaje?',
      t('An iteration', 'Mzunguko (iteration)'), [t('A variable', 'Kigeu'), t('A bug', 'Kosa'), t('A function', 'Kitendakazi')]),
  ],
  while_loops: [
    q('When does a while loop stop?', 'Kitanzi cha while kinasimama lini?',
      t('When its condition becomes false', 'Sharti lake likiwa si kweli'),
      [t('After exactly 10 times', 'Baada ya mara 10 kamili'), t('When it prints something', 'Kinapoonyesha kitu'), t('It never stops', 'Hakisimami kamwe')]),
    q('What can happen if the condition of a while loop never becomes false?', 'Nini kinaweza kutokea ikiwa sharti la while halitakuwa si kweli kamwe?',
      t('The loop runs forever (an infinite loop)', 'Kitanzi kinaendelea milele (kitanzi kisicho na mwisho)'),
      [t('It runs only once', 'Kinaendeshwa mara moja tu'), t('The computer fixes it', 'Kompyuta inarekebisha'), t('Nothing is printed', 'Hakuna kinachoonyeshwa')]),
    q('A while loop is best when...', 'Kitanzi cha while ni bora wakati...',
      t('You do not know in advance how many times to repeat', 'Hujui mapema utarudia mara ngapi'),
      [t('You want to repeat exactly 3 times', 'Unataka kurudia mara 3 kamili'), t('You only want to print once', 'Unataka kuonyesha mara moja tu'), t('You want to make a list', 'Unataka kutengeneza orodha')]),
  ],
  lists: [
    q('What is a list (array)?', 'Orodha (array) ni nini?',
      t('One variable that holds many values in order', 'Kigeu kimoja kinachoshika thamani nyingi kwa mpangilio'),
      [t('A single number', 'Namba moja'), t('A kind of loop', 'Aina ya kitanzi'), t('A spelling mistake', 'Kosa la tahajia')]),
    q('In Python and JavaScript, the first item of a list is at position...', 'Katika Python na JavaScript, kitu cha kwanza cha orodha kiko nafasi...',
      t('0', '0'), [t('1', '1'), t('-1', '-1'), t('10', '10')]),
    q('How do you find out how many items a list has?', 'Unajuaje orodha ina vitu vingapi?',
      t('Ask for its length', 'Uliza urefu wake (length)'),
      [t('Count the quote marks', 'Hesabu alama za nukuu'), t('Look at the last item', 'Angalia kitu cha mwisho'), t('You cannot find out', 'Huwezi kujua')]),
  ],
  functions: [
    q('What is a function?', 'Kitendakazi ni nini?',
      t('A named group of instructions you can use again and again', 'Kikundi cha maagizo chenye jina unachoweza kutumia tena na tena'),
      [t('A number stored in a box', 'Namba iliyohifadhiwa kwenye sanduku'), t('A mistake in a program', 'Kosa kwenye programu'), t('A list of colours', 'Orodha ya rangi')]),
    q('What does "calling" a function mean?', '"Kuita" kitendakazi kunamaanisha nini?',
      t('Telling the program to run the instructions inside it', 'Kuiambia programu iendeshe maagizo yaliyo ndani yake'),
      [t('Phoning the computer', 'Kupiga simu kompyuta'), t('Deleting the function', 'Kufuta kitendakazi'), t('Giving it a new name', 'Kukipa jina jipya')]),
    q('Does defining a function run its code straight away?', 'Je, kufafanua kitendakazi kunaendesha msimbo wake mara moja?',
      t('No - it only runs when the function is called', 'Hapana - unaendeshwa tu kitendakazi kikiitwa'),
      [t('Yes, always', 'Ndiyo, kila mara'), t('Only the first line runs', 'Mstari wa kwanza tu unaendeshwa'), t('It runs twice', 'Unaendeshwa mara mbili')]),
  ],
  parameters_return: [
    q('What is a parameter?', 'Kigezo (parameter) ni nini?',
      t('Information you pass into a function', 'Taarifa unayokipa kitendakazi'),
      [t('The name of the program', 'Jina la programu'), t('A message printed on screen', 'Ujumbe unaoonyeshwa kwenye skrini'), t('A type of loop', 'Aina ya kitanzi')]),
    q('What does return do?', 'return inafanya nini?',
      t('Sends an answer back to the code that called the function', 'Inarudisha jibu kwa msimbo uliokiita kitendakazi'),
      [t('Restarts the program', 'Inaanzisha programu upya'), t('Prints the answer twice', 'Inaonyesha jibu mara mbili'), t('Goes back to the first line', 'Inarudi mstari wa kwanza')]),
    q('A function area(width, length) has how many parameters?', 'Kitendakazi area(width, length) kina vigezo vingapi?',
      t('2', '2'), [t('1', '1'), t('3', '3'), t('0', '0')]),
  ],
};

// Three more per concept, so a learner who needs extra practice still gets new ones.
const extraRemember = {
  sequence: [
    q('If a recipe says "mix, then bake", what happens if a program does "bake, then mix"?', 'Mapishi yakisema "changanya, kisha oka", nini kinatokea programu ikifanya "oka, kisha changanya"?',
      t('The result is wrong because the order matters', 'Matokeo si sahihi kwa sababu mpangilio ni muhimu'),
      [t('It is exactly the same', 'Ni sawa kabisa'), t('The computer swaps them back', 'Kompyuta inazirudisha'), t('Both steps happen at once', 'Hatua zote zinatokea kwa pamoja')]),
    q('What do we call the exact steps a computer follows to solve a problem?', 'Tunaita nini hatua kamili ambazo kompyuta hufuata kutatua tatizo?',
      t('An algorithm', 'Algorithimu (algorithm)'), [t('A keyboard', 'Kibodi'), t('A screen', 'Skrini'), t('A password', 'Nywila')]),
    q('Does a computer skip lines it thinks are not important?', 'Je, kompyuta inaruka mistari inayodhani si muhimu?',
      t('No - it does every line exactly as written', 'Hapana - inafanya kila mstari kama ulivyoandikwa'),
      [t('Yes, it skips boring lines', 'Ndiyo, inaruka mistari inayochosha'), t('It only does the first and last line', 'Inafanya mstari wa kwanza na wa mwisho tu'), t('It guesses which lines to do', 'Inakisia mistari ya kufanya')]),
  ],
  output: [
    q('What will print("5 + 2") show?', 'print("5 + 2") itaonyesha nini?', t('5 + 2', '5 + 2'), [t('7', '7'), t('52', '52'), t('Nothing', 'Hakuna kitu')]),
    q('What will print(5 + 2) show?', 'print(5 + 2) itaonyesha nini?', t('7', '7'), [t('5 + 2', '5 + 2'), t('52', '52'), t('An error', 'Kosa')]),
    q('Where does printed output appear?', 'Matokeo yanayoonyeshwa yanatokea wapi?',
      t('On the screen, in the output area', 'Kwenye skrini, katika sehemu ya matokeo'),
      [t('Only on paper', 'Kwenye karatasi tu'), t('Inside the keyboard', 'Ndani ya kibodi'), t('It is hidden from the user', 'Imefichwa kwa mtumiaji')]),
  ],
  variables: [
    q('After score = 5 and then score = 8, what is in score?', 'Baada ya score = 5 na kisha score = 8, kuna nini ndani ya score?',
      t('8', '8'), [t('5', '5'), t('13', '13'), t('5 and 8', '5 na 8')]),
    q('Which is the best name for a variable that stores a pupil age?', 'Jina lipi ni bora kwa kigeu kinachohifadhi umri wa mwanafunzi?',
      t('age', 'age (umri)'), [t('x', 'x'), t('thing', 'kitu'), t('banana', 'ndizi')]),
    q('What does the = sign do in score = 10?', 'Alama = inafanya nini katika score = 10?',
      t('Puts the value 10 into the variable score', 'Inaweka thamani 10 ndani ya kigeu score'),
      [t('Checks if score is 10', 'Inaangalia kama score ni 10'), t('Prints 10', 'Inaonyesha 10'), t('Adds 10 to score', 'Inaongeza 10 kwenye score')]),
  ],
  arithmetic: [
    q('What does 3 * 4 give?', '3 * 4 inatoa nini?', t('12', '12'), [t('7', '7'), t('34', '34'), t('1', '1')]),
    q('What does 10 % 3 give?', '10 % 3 inatoa nini?', t('1', '1'), [t('3', '3'), t('30', '30'), t('0', '0')]),
    q('In 2 + 3 * 4, which part does the computer work out first?', 'Katika 2 + 3 * 4, kompyuta inakokotoa sehemu ipi kwanza?',
      t('3 * 4 (multiplication comes before addition)', '3 * 4 (kuzidisha kunakuja kabla ya kujumlisha)'),
      [t('2 + 3', '2 + 3'), t('Whatever is on the left', 'Chochote kilicho kushoto'), t('It adds everything at once', 'Inajumlisha kila kitu kwa pamoja')]),
  ],
  conditionals: [
    q('Which sign checks if two values are EQUAL?', 'Alama ipi inaangalia kama thamani mbili ni SAWA?', t('==', '=='), [t('=', '='), t('=>', '=>'), t('!=', '!=')]),
    q('If age = 12, is the condition age > 12 true or false?', 'Ikiwa age = 12, je, sharti age > 12 ni kweli au si kweli?',
      t('False', 'Si kweli'), [t('True', 'Kweli'), t('Sometimes', 'Wakati mwingine'), t('It causes an error', 'Inasababisha kosa')]),
    q('Can a program take different paths depending on the data?', 'Je, programu inaweza kufuata njia tofauti kutegemea data?',
      t('Yes - that is what if / else is for', 'Ndiyo - hiyo ndiyo kazi ya if / else'),
      [t('No, programs always do the same thing', 'Hapana, programu hufanya kitu kilekile kila mara'), t('Only in games', 'Katika michezo tu'), t('Only if you restart the computer', 'Ukiwasha upya kompyuta tu')]),
  ],
  loops: [
    q('Which code repeats something 5 times?', 'Msimbo upi unarudia kitu mara 5?',
      t('A loop that counts to 5', 'Kitanzi kinachohesabu hadi 5'),
      [t('An if statement', 'Kauli ya if'), t('A variable called five', 'Kigeu kinachoitwa five'), t('A print command', 'Amri ya print')]),
    q('What is the loop variable (like i) used for?', 'Kigeu cha kitanzi (kama i) kinatumika kwa nini?',
      t('It keeps count of which repeat we are on', 'Kinahesabu tuko kwenye mzunguko upi'),
      [t('It stores the program name', 'Kinahifadhi jina la programu'), t('It stops the computer', 'Kinasimamisha kompyuta'), t('It prints the letter i', 'Kinaonyesha herufi i')]),
    q('Which part of a loop is repeated?', 'Sehemu ipi ya kitanzi inarudiwa?',
      t('The code inside it (its body)', 'Msimbo ulio ndani yake (mwili wake)'),
      [t('Only the first line of the program', 'Mstari wa kwanza wa programu tu'), t('The whole program', 'Programu nzima'), t('Nothing is repeated', 'Hakuna kinachorudiwa')]),
  ],
  while_loops: [
    q('A while loop checks its condition...', 'Kitanzi cha while kinaangalia sharti lake...',
      t('Before every repeat', 'Kabla ya kila mzunguko'), [t('Only once at the end', 'Mara moja tu mwishoni'), t('Never', 'Kamwe'), t('Only after 10 repeats', 'Baada ya mizunguko 10 tu')]),
    q('What must change inside a while loop so that it can stop?', 'Nini lazima kibadilike ndani ya kitanzi cha while ili kiweze kusimama?',
      t('Something used in its condition', 'Kitu kinachotumika katika sharti lake'),
      [t('The name of the loop', 'Jina la kitanzi'), t('The colour of the screen', 'Rangi ya skrini'), t('Nothing needs to change', 'Hakuna kinachohitaji kubadilika')]),
    q('If the condition is false at the very start, how many times does a while loop run?', 'Sharti likiwa si kweli mwanzoni kabisa, kitanzi cha while kinaendeshwa mara ngapi?',
      t('0 times', 'Mara 0'), [t('1 time', 'Mara 1'), t('Forever', 'Milele'), t('10 times', 'Mara 10')]),
  ],
  lists: [
    q('A list has 5 items. What position is the last item at (counting from 0)?', 'Orodha ina vitu 5. Kitu cha mwisho kiko nafasi gani (ukihesabu kutoka 0)?',
      t('4', '4'), [t('5', '5'), t('0', '0'), t('6', '6')]),
    q('Which brackets usually make a list in Python and JavaScript?', 'Mabano yapi kwa kawaida hutengeneza orodha katika Python na JavaScript?',
      t('[ ]', '[ ]'), [t('( )', '( )'), t('{ }', '{ }'), t('< >', '< >')]),
    q('Why use a list instead of many separate variables?', 'Kwa nini utumie orodha badala ya vigeu vingi tofauti?',
      t('To keep related values together and loop over them', 'Kuweka thamani zinazohusiana pamoja na kuzipitia kwa kitanzi'),
      [t('Lists make programs slower on purpose', 'Orodha zinafanya programu ziwe polepole kwa makusudi'), t('Variables cannot hold numbers', 'Vigeu haviwezi kushika namba'), t('There is no reason', 'Hakuna sababu')]),
  ],
  functions: [
    q('Why do programmers use functions?', 'Kwa nini watengenezaji programu hutumia vitendakazi?',
      t('To avoid writing the same code again and again', 'Kuepuka kuandika msimbo uleule tena na tena'),
      [t('To make the screen brighter', 'Kufanya skrini iwe angavu zaidi'), t('Because every line must be a function', 'Kwa sababu kila mstari lazima uwe kitendakazi'), t('To delete variables', 'Kufuta vigeu')]),
    q('How many times can you call the same function?', 'Unaweza kuita kitendakazi kilekile mara ngapi?',
      t('As many times as you like', 'Mara nyingi kadri unavyotaka'), [t('Only once', 'Mara moja tu'), t('Exactly twice', 'Mara mbili kamili'), t('Never', 'Kamwe')]),
    q('A function is called sayHello. Which call works?', 'Kitendakazi kinaitwa sayHello. Wito upi unafanya kazi?',
      t('sayHello()', 'sayHello()'), [t('SayHello()', 'SayHello()'), t('sayhello()', 'sayhello()'), t('say Hello()', 'say Hello()')]),
  ],
  parameters_return: [
    q('If double(n) returns n * 2, what does double(4) give?', 'Ikiwa double(n) inarudisha n * 2, double(4) inatoa nini?',
      t('8', '8'), [t('6', '6'), t('4', '4'), t('42', '42')]),
    q('What is the difference between print and return inside a function?', 'Kuna tofauti gani kati ya print na return ndani ya kitendakazi?',
      t('print shows a value; return hands it back so other code can use it', 'print inaonyesha thamani; return inairudisha ili msimbo mwingine uitumie'),
      [t('They do exactly the same thing', 'Zinafanya kitu kilekile kabisa'), t('return shows text in colour', 'return inaonyesha maandishi kwa rangi'), t('print ends the program', 'print inamaliza programu')]),
    q('In add(3, 5), what are 3 and 5 called?', 'Katika add(3, 5), 3 na 5 vinaitwa nini?',
      t('Arguments (values passed to the parameters)', 'Hoja (thamani zinazopitishwa kwa vigezo)'),
      [t('Variables names', 'Majina ya vigeu'), t('Loops', 'Vitanzi'), t('Return values', 'Thamani zinazorudishwa')]),
  ],
};
Object.entries(extraRemember).forEach(([id, list]) => { rememberPool[id].push(...list); });

// --- Create: extra project ideas ----------------------------------------------
const createPool = {
  sequence: [t('Write the steps for brushing your teeth, one step per line, in the right order.', 'Andika hatua za kupiga mswaki, hatua moja kwa kila mstari, kwa mpangilio sahihi.'),
    t('Write the steps for planting maize seeds, from preparing the soil to watering.', 'Andika hatua za kupanda mbegu za mahindi, kutoka kutayarisha udongo hadi kumwagilia.')],
  output: [t('Print a weather report for your town: the day, the weather and the temperature.', 'Onyesha taarifa ya hali ya hewa ya mji wako: siku, hali ya hewa na joto.'),
    t('Print a short welcome message for a new pupil joining your class.', 'Onyesha ujumbe mfupi wa kumkaribisha mwanafunzi mpya darasani kwako.')],
  variables: [t('Store your name, your age and your favourite food in variables, then print a sentence about yourself.', 'Hifadhi jina lako, umri wako na chakula unachopenda kwenye vigeu, kisha onyesha sentensi kuhusu wewe.'),
    t('Store the name of a football team and its score, change the score, and print it before and after.', 'Hifadhi jina la timu ya mpira na alama zake, badilisha alama, na uzionyeshe kabla na baada.')],
  arithmetic: [t('A pencil costs 15 shillings. Work out and print the cost of 4 pencils.', 'Penseli inagharimu shilingi 15. Kokotoa na uonyeshe gharama ya penseli 4.'),
    t('Your class collected bottles on 3 days. Store each day in a variable and print the total.', 'Darasa lako lilikusanya chupa siku 3. Hifadhi kila siku kwenye kigeu na uonyeshe jumla.')],
  conditionals: [t('Store a number of hours of sleep. Print "Well rested" if it is 9 or more, otherwise "Go to bed earlier".', 'Hifadhi idadi ya saa za kulala. Onyesha "Umepumzika vizuri" ikiwa ni 9 au zaidi, la sivyo "Lala mapema".'),
    t('Store a number and print whether it is bigger or smaller than 50.', 'Hifadhi namba na uonyeshe kama ni kubwa au ndogo kuliko 50.')],
  loops: [t('Use a loop to print the 5 times table from 1 to 10.', 'Tumia kitanzi kuonyesha jedwali la 5 kutoka 1 hadi 10.'),
    t('Use a loop to print "I can code!" 5 times.', 'Tumia kitanzi kuonyesha "Ninaweza kupiga msimbo!" mara 5.')],
  while_loops: [t('Start with 100 litres of water. Use 15 litres a day and count how many days it lasts.', 'Anza na lita 100 za maji. Tumia lita 15 kwa siku na uhesabu zinadumu siku ngapi.'),
    t('Count down from 10 to 1 with a while loop, then print "Happy New Year!".', 'Hesabu kurudi nyuma kutoka 10 hadi 1 kwa kitanzi cha while, kisha onyesha "Heri ya Mwaka Mpya!".')],
  lists: [t('Make a list of 4 fruits you like and print each one with a loop.', 'Tengeneza orodha ya matunda 4 unayopenda na uonyeshe kila moja kwa kitanzi.'),
    t('Make a list of the marks you got in 3 tests and print the total.', 'Tengeneza orodha ya alama ulizopata katika majaribio 3 na uonyeshe jumla.')],
  functions: [t('Write a function that prints a 3-line birthday song, and call it twice.', 'Andika kitendakazi kinachoonyesha wimbo wa siku ya kuzaliwa wa mistari 3, na ukiite mara mbili.'),
    t('Write a function that draws a line of stars, and use it to frame your name.', 'Andika kitendakazi kinachochora mstari wa nyota, na ukitumie kuzungushia jina lako.')],
  parameters_return: [t('Write a function that takes a number of weeks and returns how many days that is.', 'Andika kitendakazi kinachopokea idadi ya wiki na kurudisha ni siku ngapi.'),
    t('Write a function that takes the price of one item and how many you buy, and returns the total cost.', 'Andika kitendakazi kinachopokea bei ya kitu kimoja na idadi unayonunua, na kurudisha gharama yote.')],
  html_structure: [t('Build a page about your favourite animal: a heading, a paragraph and a list of 3 facts.', 'Jenga ukurasa kuhusu mnyama unayempenda: kichwa, aya na orodha ya ukweli 3.'),
    t('Build a page for your school club: a heading, a paragraph about what you do and a numbered list of meeting days.', 'Jenga ukurasa wa klabu ya shule yako: kichwa, aya kuhusu mnachofanya na orodha yenye namba ya siku za mikutano.')],
  css_styling: [t('Style a page so the heading is blue, the paragraphs are dark grey and the background is light green.', 'Pamba ukurasa ili kichwa kiwe bluu, aya ziwe kijivu cheusi na rangi ya nyuma iwe kijani hafifu.'),
    t('Give your list items a bigger font size and a coloured border.', 'Vipe vipengele vya orodha yako ukubwa mkubwa wa fonti na mpaka wenye rangi.')],
};

const extraCreate = {
  sequence: [t('Write the steps for getting ready for bed, one step per line.', 'Andika hatua za kujiandaa kulala, hatua moja kwa kila mstari.'),
    t('Write the steps for making ugali, in the right order.', 'Andika hatua za kupika ugali, kwa mpangilio sahihi.'),
    t('Write the steps for packing your school bag the night before.', 'Andika hatua za kupanga begi lako la shule usiku uliopita.')],
  output: [t('Print a 3-line poem about the rain.', 'Onyesha shairi la mistari 3 kuhusu mvua.'),
    t('Print a menu for a school canteen with 3 foods and their prices.', 'Onyesha menyu ya kantini ya shule yenye vyakula 3 na bei zake.'),
    t('Print a short advert for a tree-planting day at your school.', 'Onyesha tangazo fupi la siku ya kupanda miti shuleni kwako.')],
  variables: [t('Store a country and its capital city in variables, then print a sentence using both.', 'Hifadhi nchi na mji wake mkuu kwenye vigeu, kisha onyesha sentensi ikivitumia vyote.'),
    t('Store the number of goats on a farm, then change it after 2 are born and print both numbers.', 'Hifadhi idadi ya mbuzi shambani, kisha ibadilishe baada ya 2 kuzaliwa na uonyeshe namba zote mbili.'),
    t('Store your favourite colour and favourite animal, then print a funny sentence using them.', 'Hifadhi rangi na mnyama unayempenda, kisha onyesha sentensi ya kuchekesha ukivitumia.')],
  arithmetic: [t('A matatu has 14 seats and 9 people. Print how many seats are empty.', 'Matatu ina viti 14 na watu 9. Onyesha viti vingapi viko wazi.'),
    t('Work out and print how many minutes there are in 3 hours.', 'Kokotoa na uonyeshe kuna dakika ngapi katika saa 3.'),
    t('You have 50 shillings and buy 3 sweets at 10 shillings each. Print your change.', 'Una shilingi 50 na unanunua peremende 3 kwa shilingi 10 kila moja. Onyesha chenji yako.')],
  conditionals: [t('Store a temperature. Print "Wear a jumper" if it is below 18, otherwise "T-shirt weather".', 'Hifadhi joto. Onyesha "Vaa sweta" likiwa chini ya 18, la sivyo "Hali ya fulana".'),
    t('Store a test mark and print "Excellent" for 80 or more, "Good" for 50 or more, otherwise "Keep trying".', 'Hifadhi alama ya mtihani na uonyeshe "Bora" kwa 80 au zaidi, "Nzuri" kwa 50 au zaidi, la sivyo "Endelea kujaribu".'),
    t('Store your age and print whether you are old enough (13+) to join the coding club.', 'Hifadhi umri wako na uonyeshe kama unatosha (13+) kujiunga na klabu ya msimbo.')],
  loops: [t('Use a loop to print the numbers 10 down to 1.', 'Tumia kitanzi kuonyesha namba 10 kurudi nyuma hadi 1.'),
    t('Use a loop to add up the numbers 1 to 10 and print the total.', 'Tumia kitanzi kujumlisha namba 1 hadi 10 na uonyeshe jumla.'),
    t('Use a loop to print a row number and a star for 5 rows.', 'Tumia kitanzi kuonyesha namba ya safu na nyota kwa safu 5.')],
  while_loops: [t('Keep doubling a number starting at 1 until it is bigger than 100, printing each one.', 'Endelea kuzidisha namba mara mbili kuanzia 1 hadi iwe kubwa kuliko 100, ukionyesha kila moja.'),
    t('A tank has 60 litres and loses 7 litres a day. Count how many full days it lasts.', 'Tangi lina lita 60 na linapoteza lita 7 kwa siku. Hesabu linadumu siku ngapi kamili.'),
    t('Save 20 shillings a day until you have 150. Print how many days it took.', 'Weka akiba ya shilingi 20 kwa siku hadi uwe na 150. Onyesha ilichukua siku ngapi.')],
  lists: [t('Make a list of 5 animals and print only the first and the last one.', 'Tengeneza orodha ya wanyama 5 na uonyeshe wa kwanza na wa mwisho tu.'),
    t('Make a list of rainfall for 4 days and print the total rain.', 'Tengeneza orodha ya mvua ya siku 4 na uonyeshe jumla ya mvua.'),
    t('Make a list of your friends and print a greeting for each one.', 'Tengeneza orodha ya marafiki zako na uonyeshe salamu kwa kila mmoja.')],
  functions: [t('Write a function that prints your school motto, and call it 3 times.', 'Andika kitendakazi kinachoonyesha kauli mbiu ya shule yako, na ukiite mara 3.'),
    t('Write two functions, hello and goodbye, and call them in the right order.', 'Andika vitendakazi viwili, hello na goodbye, na uviite kwa mpangilio sahihi.'),
    t('Write a function that prints the steps for washing hands, and call it before lunch.', 'Andika kitendakazi kinachoonyesha hatua za kunawa mikono, na ukiite kabla ya chakula cha mchana.')],
  parameters_return: [t('Write a function that takes a number and returns its square (the number times itself).', 'Andika kitendakazi kinachopokea namba na kurudisha mraba wake (namba mara yenyewe).'),
    t('Write a function that takes the length and width of a classroom and returns its area.', 'Andika kitendakazi kinachopokea urefu na upana wa darasa na kurudisha eneo lake.'),
    t('Write a function that takes a number of goats and returns how many legs they have in total.', 'Andika kitendakazi kinachopokea idadi ya mbuzi na kurudisha jumla ya miguu yao.')],
  html_structure: [t('Build a page with a heading, a picture and a paragraph about a place in Kenya.', 'Jenga ukurasa wenye kichwa, picha na aya kuhusu mahali Kenya.'),
    t('Build a recipe page: a heading, a list of ingredients and a numbered list of steps.', 'Jenga ukurasa wa mapishi: kichwa, orodha ya viungo na orodha yenye namba ya hatua.'),
    t('Build a page about yourself with a heading, two paragraphs and a link to a site you like.', 'Jenga ukurasa kuhusu wewe wenye kichwa, aya mbili na kiungo cha tovuti unayoipenda.')],
  css_styling: [t('Make all headings centred and orange.', 'Fanya vichwa vyote viwe katikati na rangi ya chungwa.'),
    t('Give every paragraph some padding and a light grey background.', 'Ipe kila aya nafasi ndani (padding) na rangi ya nyuma ya kijivu hafifu.'),
    t('Style your page with a dark background and light text so it is easy to read at night.', 'Pamba ukurasa wako kwa rangi ya nyuma nyeusi na maandishi mepesi ili usomeke vizuri usiku.')],
};
Object.entries(extraCreate).forEach(([id, list]) => { createPool[id].push(...list); });

module.exports = { moreScenarios, rememberPool, createPool };
