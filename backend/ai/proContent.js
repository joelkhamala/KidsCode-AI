'use strict';
/**
 * "Pro" skills for the life-long Coding Journey: the professional skills that come after
 * the basics (text, dictionaries, debugging, testing, algorithms, recursion, classes,
 * teamwork with Git, safe coding and data/APIs) - explained so a child can follow.
 *
 * They are taught in the text languages (Python and JavaScript). Each concept has a
 * hand-written bank with several questions per Bloom level, so learners keep meeting
 * new questions (see buildProActivity in offlineBank.js).
 *
 * Value helpers:
 *   t(en, sw)          - text in English and Kiswahili
 *   L(python, js)      - something that differs by language (code, patterns, answers)
 * Either can be nested inside the other. Patterns are regular expressions.
 */
const t = (en, sw) => ({ en, sw });
const L = (python, javascript) => ({ python, javascript });

const PRO_LANGUAGES = ['python', 'javascript'];

// ---------------------------------------------------------------------------
// Concept definitions (merged into CONCEPTS by concepts.js)
// ---------------------------------------------------------------------------
const PRO_CONCEPTS = [
  {
    id: 'strings', order: 13, prereqs: ['lists'], icon: '🔤', pro: true,
    name: t('Text and words (strings)', 'Maandishi na maneno (strings)'),
    explain: t('A string is text inside quote marks. You can join strings, count their letters, pick out one letter, and change them to CAPITALS or small letters.', 'String ni maandishi ndani ya alama za nukuu. Unaweza kuunganisha strings, kuhesabu herufi zake, kuchagua herufi moja, na kuzibadilisha kuwa HERUFI KUBWA au ndogo.'),
    analogy: t('Like beads on a necklace: each letter is a bead in its own place, and you can count the beads.', 'Kama shanga kwenye mkufu: kila herufi ni shanga mahali pake, na unaweza kuhesabu shanga.'),
    tip: t('Letter positions start at 0, just like lists: the first letter is word[0].', 'Nafasi za herufi zinaanza 0, kama orodha: herufi ya kwanza ni word[0].'),
    example: L('name = "Amina"\nprint(name.upper())\nprint(len(name))\nprint(name[0])', 'const name = "Amina";\nconsole.log(name.toUpperCase());\nconsole.log(name.length);\nconsole.log(name[0]);'),
    create: t('Write a program that stores a word and prints it in CAPITALS, in small letters, and how many letters it has.', 'Andika programu inayohifadhi neno na kulionyesha kwa HERUFI KUBWA, kwa herufi ndogo, na lina herufi ngapi.'),
    moreCreate: [
      t('Make a name badge: store a first name and a school, then print one sentence that joins them.', 'Tengeneza beji ya jina: hifadhi jina la kwanza na shule, kisha onyesha sentensi moja inayoviunganisha.'),
      t('Secret code: store a word and print its first letter and its last letter.', 'Msimbo wa siri: hifadhi neno na uonyeshe herufi yake ya kwanza na ya mwisho.'),
    ],
  },
  {
    id: 'dictionaries', order: 14, prereqs: ['strings', 'parameters_return'], icon: '🗂️', pro: true,
    name: t('Labelled boxes (dictionaries & objects)', 'Masanduku yenye lebo (dictionaries & objects)'),
    explain: t('A dictionary (called an object in JavaScript) stores values with a name tag called a key, so you find a value by its name instead of its position.', 'Dictionary (inaitwa object katika JavaScript) inahifadhi thamani pamoja na lebo ya jina inayoitwa key, ili upate thamani kwa jina lake badala ya nafasi yake.'),
    analogy: t('Like a phone book: you look up a name (the key) to find the number (the value).', 'Kama kitabu cha simu: unatafuta jina (key) ili kupata namba (thamani).'),
    tip: t('Look up a value with its key in square brackets: scores["Amina"].', 'Tafuta thamani kwa key yake ndani ya mabano ya mraba: scores["Amina"].'),
    example: L('ages = {"Amina": 10, "Juma": 12}\nprint(ages["Juma"])', 'const ages = { Amina: 10, Juma: 12 };\nconsole.log(ages["Juma"]);'),
    create: t('Make a dictionary about your favourite animal (name, legs, food), then print a sentence that uses its values.', 'Tengeneza dictionary kuhusu mnyama unayempenda (jina, miguu, chakula), kisha onyesha sentensi inayotumia thamani zake.'),
    moreCreate: [
      t('Make a shop price list as a dictionary and print the total cost of buying two different items.', 'Tengeneza orodha ya bei za duka kama dictionary na uonyeshe gharama ya kununua vitu viwili tofauti.'),
      t('Make a dictionary of 3 friends and their favourite fruit, then print each friend\'s fruit.', 'Tengeneza dictionary ya marafiki 3 na tunda wanalopenda, kisha onyesha tunda la kila rafiki.'),
    ],
  },
  {
    id: 'debugging', order: 15, prereqs: ['dictionaries'], icon: '🔍', pro: true,
    name: t('Bug Detective (debugging)', 'Mpelelezi wa Hitilafu (debugging)'),
    explain: t('Debugging means finding and fixing mistakes (bugs). Read the error message, find the line, check what each variable really holds, then fix one thing at a time.', 'Debugging ni kutafuta na kurekebisha makosa (bugs). Soma ujumbe wa kosa, tafuta mstari, angalia kila kigeu kina nini hasa, kisha rekebisha kitu kimoja kwa wakati.'),
    analogy: t('Like a detective following clues: the error message is the first clue, and printing variables shows what really happened.', 'Kama mpelelezi anayefuata dalili: ujumbe wa kosa ni dalili ya kwanza, na kuonyesha vigeu kunaonyesha kilichotokea hasa.'),
    tip: t('Read the error message slowly: it tells you the line number and the kind of mistake.', 'Soma ujumbe wa kosa polepole: unakuambia namba ya mstari na aina ya kosa.'),
    example: L('total = 5\nprint("total is", total)  # a debug print shows what is inside', 'let total = 5;\nconsole.log("total is", total); // a debug print shows what is inside'),
    create: t('Write a function that checks its input: if a number is negative, print a friendly message saying what is wrong instead of crashing.', 'Andika kitendakazi kinachokagua pembejeo yake: namba ikiwa hasi, onyesha ujumbe wa kirafiki unaoeleza kosa badala ya kuvunjika.'),
    moreCreate: [
      t('Write a loop that adds up some numbers, with debug prints that show the total changing each time.', 'Andika kitanzi kinachojumlisha namba, chenye maonyesho ya debug yanayoonyesha jumla ikibadilika kila mara.'),
      t('Write a password checker that tells the user exactly what is wrong (too short, no number...).', 'Andika kikagua nenosiri kinachomwambia mtumiaji kosa hasa ni nini (fupi mno, halina namba...).'),
    ],
  },
  {
    id: 'testing', order: 16, prereqs: ['dictionaries'], icon: '✅', pro: true,
    name: t('Testing your code', 'Kupima msimbo wako (testing)'),
    explain: t('A test is a tiny piece of code that checks your code gives the right answer. If the answer is wrong, the test tells you straight away.', 'Test ni kipande kidogo cha msimbo kinachokagua kwamba msimbo wako unatoa jibu sahihi. Jibu likiwa si sahihi, test inakuambia mara moja.'),
    analogy: t('Like a teacher marking homework with an answer sheet: does the answer match what we expected?', 'Kama mwalimu anayesahihisha kazi kwa karatasi ya majibu: je, jibu linalingana na tulilotarajia?'),
    tip: t('A good test says: for THIS input, I expect THAT answer. Test unusual inputs too, like 0 or an empty list.', 'Test nzuri inasema: kwa pembejeo HII, natarajia jibu HILI. Pima pia pembejeo zisizo za kawaida, kama 0 au orodha tupu.'),
    example: L('def double(n):\n    return n * 2\n\nassert double(4) == 8\nprint("All tests passed!")', 'function double(n) {\n  return n * 2;\n}\nconsole.assert(double(4) === 8);\nconsole.log("All tests passed!");'),
    create: t('Write a function that changes days into hours, then write 3 tests for it (include the edge case 0 days).', 'Andika kitendakazi kinachobadilisha siku kuwa saa, kisha andika tests 3 zake (pamoja na hali ya ukingoni ya siku 0).'),
    moreCreate: [
      t('Write a function that says if a number is even, and test it with an even number, an odd number and 0.', 'Andika kitendakazi kinachosema kama namba ni shufwa, na ukipime kwa namba shufwa, witiri na 0.'),
      t('Write a function that returns the bigger of two numbers, and test it - including when both are equal.', 'Andika kitendakazi kinachorudisha namba kubwa kati ya mbili, na ukipime - pamoja na zikiwa sawa.'),
    ],
  },
  {
    id: 'searching_sorting', order: 17, prereqs: ['debugging', 'testing'], icon: '🔎', pro: true,
    name: t('Searching and sorting (algorithms)', 'Kutafuta na kupanga (algorithms)'),
    explain: t('An algorithm is a clear recipe of steps for solving a problem. Searching finds an item in a collection; sorting puts items in order, like smallest to biggest.', 'Algorithm ni mapishi ya hatua wazi ya kutatua tatizo. Kutafuta kunapata kitu ndani ya mkusanyiko; kupanga kunaweka vitu kwa mpangilio, kama kutoka kidogo hadi kikubwa.'),
    analogy: t('Like finding your friend in the school line, or lining up from shortest to tallest.', 'Kama kumtafuta rafiki yako kwenye mstari wa shule, au kujipanga kutoka mfupi hadi mrefu.'),
    tip: t('Try the steps on paper with a short list first - the computer just does them faster.', 'Jaribu hatua kwenye karatasi na orodha fupi kwanza - kompyuta inazifanya tu kwa kasi zaidi.'),
    example: L('numbers = [7, 2, 9, 4]\nprint(sorted(numbers))\nprint(max(numbers))', 'const numbers = [7, 2, 9, 4];\nconsole.log([...numbers].sort((a, b) => a - b));\nconsole.log(Math.max(...numbers));'),
    create: t('Make a list of 5 test scores. Print them sorted, then print the highest and the lowest.', 'Tengeneza orodha ya alama 5 za mtihani. Zionyeshe zikiwa zimepangwa, kisha onyesha ya juu zaidi na ya chini zaidi.'),
    moreCreate: [
      t('Write a search: store a list of names, check if a name is in the list, and print a friendly message either way.', 'Andika utafutaji: hifadhi orodha ya majina, angalia kama jina lipo, na uonyeshe ujumbe wa kirafiki kwa vyovyote vile.'),
      t('Make a leaderboard: store the points of 5 players and print them sorted from biggest to smallest.', 'Tengeneza ubao wa washindi: hifadhi pointi za wachezaji 5 na uzionyeshe kutoka kubwa hadi ndogo.'),
    ],
  },
  {
    id: 'recursion', order: 18, prereqs: ['debugging', 'testing'], icon: '🪆', pro: true,
    name: t('Functions that call themselves (recursion)', 'Vitendakazi vinavyojiita (recursion)'),
    explain: t('Recursion is when a function calls itself to solve a smaller piece of the same problem. It needs a base case that tells it when to stop.', 'Recursion ni pale kitendakazi kinapojiita chenyewe kutatua kipande kidogo cha tatizo lile lile. Kinahitaji base case inayokiambia wakati wa kusimama.'),
    analogy: t('Like nesting dolls: open a doll, find a smaller one inside, and keep going until the tiniest doll (the base case).', 'Kama wanasesere wa ndani kwa ndani: fungua mmoja, upate mdogo zaidi ndani, endelea hadi mdogo kabisa (base case).'),
    tip: t('Find the base case first - the line that stops the function calling itself.', 'Tafuta base case kwanza - mstari unaozuia kitendakazi kuendelea kujiita.'),
    example: L('def countdown(n):\n    if n == 0:\n        print("Blast off!")\n        return\n    print(n)\n    countdown(n - 1)\n\ncountdown(3)', 'function countdown(n) {\n  if (n === 0) {\n    console.log("Blast off!");\n    return;\n  }\n  console.log(n);\n  countdown(n - 1);\n}\ncountdown(3);'),
    create: t('Write a recursive function that counts down from any number and then prints "Lift off!".', 'Andika kitendakazi cha recursion kinachohesabu kurudi nyuma kutoka namba yoyote kisha kuonyesha "Lift off!".'),
    moreCreate: [
      t('Write a recursive function that adds up all the numbers from 1 to n. Try it with 5 and with 10.', 'Andika kitendakazi cha recursion kinachojumlisha namba zote kutoka 1 hadi n. Kijaribu na 5 na 10.'),
      t('Write a recursive function that builds a row of n stars, like ****.', 'Andika kitendakazi cha recursion kinachojenga mstari wa nyota n, kama ****.'),
    ],
  },
  {
    id: 'classes_objects', order: 19, prereqs: ['searching_sorting', 'recursion'], icon: '🏭', pro: true,
    name: t('Blueprints (classes & objects)', 'Michoro ya ramani (classes & objects)'),
    explain: t('A class is a blueprint for making objects. Each object has its own data (attributes) and things it can do (methods).', 'Class ni ramani ya kutengeneza objects. Kila object ina data yake (attributes) na vitu inavyoweza kufanya (methods).'),
    analogy: t('A class is like the plan for a bicycle; every bicycle built from the plan is an object with its own colour and owner.', 'Class ni kama ramani ya baiskeli; kila baiskeli iliyojengwa kwa ramani hiyo ni object yenye rangi na mmiliki wake.'),
    tip: t('Inside a class, self (Python) or this (JavaScript) means "this particular object".', 'Ndani ya class, self (Python) au this (JavaScript) inamaanisha "object hii hasa".'),
    example: L('class Dog:\n    def __init__(self, name):\n        self.name = name\n\n    def bark(self):\n        print(self.name + " says Woof!")\n\nrex = Dog("Rex")\nrex.bark()', 'class Dog {\n  constructor(name) {\n    this.name = name;\n  }\n  bark() {\n    console.log(this.name + " says Woof!");\n  }\n}\nconst rex = new Dog("Rex");\nrex.bark();'),
    create: t('Design a Pet class with a name and a hunger level, and methods feed() and play(). Make two pets and use them.', 'Buni class ya Pet yenye jina na kiwango cha njaa, na methods feed() na play(). Tengeneza pets wawili na uwatumie.'),
    moreCreate: [
      t('Make a BankAccount class with deposit() and withdraw() methods. Never let the balance go below 0!', 'Tengeneza class ya BankAccount yenye methods deposit() na withdraw(). Usiruhusu salio kushuka chini ya 0!'),
      t('Make a Student class with a name and a list of marks, and a method that prints the average mark.', 'Tengeneza class ya Student yenye jina na orodha ya alama, na method inayoonyesha wastani wa alama.'),
    ],
  },
  {
    id: 'teamwork', order: 20, prereqs: ['classes_objects'], icon: '🤝', pro: true,
    name: t('Coding as a team (Git & code review)', 'Kuandika msimbo kama timu (Git na ukaguzi)'),
    explain: t('Professional coders work in teams. Git saves snapshots of your code (commits) so you can go back in time, branches let people try ideas safely, and in code review a teammate kindly checks your code before it is added.', 'Waandishi wa msimbo wa kitaalamu hufanya kazi kama timu. Git huhifadhi picha za msimbo wako (commits) ili urudi nyuma, branches huwaruhusu watu kujaribu mawazo kwa usalama, na katika ukaguzi mwenzako hukagua msimbo wako kwa upole kabla haujaongezwa.'),
    analogy: t('Like a class group project: everyone works on their own part (branch), saves progress (commit), and a friend checks it (review) before it goes into the final book (merge).', 'Kama mradi wa kikundi darasani: kila mtu anafanya sehemu yake (branch), anahifadhi maendeleo (commit), na rafiki anakagua (review) kabla ya kuingia kwenye kitabu cha mwisho (merge).'),
    tip: t('A good commit message says WHAT you changed, like "Fix score not adding bonus points".', 'Ujumbe mzuri wa commit unasema ULICHOBADILISHA, kama "Fix score not adding bonus points".'),
    example: L('git checkout -b add-score\n# ...write your code...\ngit add game.py\ngit commit -m "Add a score counter"\ngit push', 'git checkout -b add-score\n# ...write your code...\ngit add game.js\ngit commit -m "Add a score counter"\ngit push'),
    create: t('Write a small program for a teammate: give every part a comment explaining what it does, and end with a comment holding your commit message.', 'Andika programu ndogo kwa ajili ya mwenzako: ipe kila sehemu maoni (comment) yanayoeleza inachofanya, na umalizie na comment yenye ujumbe wako wa commit.'),
    moreCreate: [
      t('Write a short program with clear variable names, then add 3 kind review comments suggesting improvements.', 'Andika programu fupi yenye majina wazi ya vigeu, kisha ongeza comments 3 za ukaguzi za upole zinazopendekeza maboresho.'),
      t('Write a program with a README-style comment at the top saying what it does and how to use it.', 'Andika programu yenye comment ya mtindo wa README juu ikieleza inachofanya na jinsi ya kuitumia.'),
    ],
  },
  {
    id: 'safe_coding', order: 21, prereqs: ['teamwork'], icon: '🛡️', pro: true,
    name: t('Safe coding (security & privacy)', 'Msimbo salama (usalama na faragha)'),
    explain: t('Safe coders protect people. Never put passwords or secrets in code, check every input before using it, and only collect the personal information you really need.', 'Waandishi wa msimbo salama huwalinda watu. Usiweke kamwe nenosiri au siri kwenye msimbo, kagua kila pembejeo kabla ya kuitumia, na kusanya tu taarifa binafsi unazohitaji kweli.'),
    analogy: t('Like a school gate guard: check who comes in (input checks), and never leave the keys under the doormat (secrets in code).', 'Kama mlinzi wa lango la shule: kagua anayeingia (ukaguzi wa pembejeo), na usiache funguo chini ya mkeka (siri kwenye msimbo).'),
    tip: t('Treat every input like a stranger: check it before you trust it.', 'Chukulia kila pembejeo kama mgeni: ikague kabla ya kuiamini.'),
    example: L('password = input("Choose a password: ")\nif len(password) < 8:\n    print("Too short! Use at least 8 characters.")\nelse:\n    print("Strong enough. (We never print passwords!)")', 'const password = prompt("Choose a password:");\nif (password.length < 8) {\n  console.log("Too short! Use at least 8 characters.");\n} else {\n  console.log("Strong enough. (We never print passwords!)");\n}'),
    create: t('Write a password checker: say if a password is too short, has no numbers, or is strong. Never print the password itself!', 'Andika kikagua nenosiri: sema kama nenosiri ni fupi mno, halina namba, au lina nguvu. Usionyeshe kamwe nenosiri lenyewe!'),
    moreCreate: [
      t('Write a sign-up check for a kids club: the nickname must not be empty and the age must be between 5 and 18.', 'Andika ukaguzi wa kujiandikisha kwa klabu ya watoto: jina la utani lisiwe tupu na umri uwe kati ya 5 na 18.'),
      t('Write a PIN lock: the user gets 3 tries to guess the PIN, then the program locks.', 'Andika kufuli ya PIN: mtumiaji ana majaribio 3 kukisia PIN, kisha programu inajifunga.'),
    ],
  },
  {
    id: 'data_apis', order: 22, prereqs: ['safe_coding'], icon: '🌍', pro: true,
    name: t('Data and the internet (JSON & APIs)', 'Data na intaneti (JSON na APIs)'),
    explain: t('Apps share data in a format called JSON - lists and labelled values written as text. An API is a door that lets your program ask another computer for data, like today\'s weather.', 'Programu hushiriki data kwa muundo unaoitwa JSON - orodha na thamani zenye lebo zilizoandikwa kama maandishi. API ni mlango unaoruhusu programu yako kuomba data kutoka kompyuta nyingine, kama hali ya hewa ya leo.'),
    analogy: t('An API is like a waiter: you ask for something from the menu, and the waiter brings it back from the kitchen.', 'API ni kama mhudumu: unaomba kitu kutoka kwenye menyu, na mhudumu anakuletea kutoka jikoni.'),
    tip: t('JSON looks just like dictionaries and lists. Read the keys to find the data you need.', 'JSON inafanana kabisa na dictionaries na orodha. Soma keys ili kupata data unayohitaji.'),
    example: L('import json\ntext = \'{"city": "Kisumu", "temp": 28}\'\nweather = json.loads(text)\nprint(weather["city"], weather["temp"])', 'const text = \'{"city": "Kisumu", "temp": 28}\';\nconst weather = JSON.parse(text);\nconsole.log(weather.city, weather.temp);'),
    create: t('Write data (a list of dictionaries/objects) about 3 of your favourite animals, then loop through it and print a fact about each.', 'Andika data (orodha ya dictionaries/objects) kuhusu wanyama 3 unaowapenda, kisha pitia kwa kitanzi na uonyeshe ukweli kuhusu kila mmoja.'),
    moreCreate: [
      t('Pretend an API sent you the weather for 3 towns as a list of dictionaries (objects). Print the hottest town.', 'Jifanye API imekutumia hali ya hewa ya miji 3 kama orodha ya dictionaries (objects). Onyesha mji wenye joto zaidi.'),
      t('Make a mini scoreboard: store players as JSON-style data, then print each player\'s name and points.', 'Tengeneza ubao mdogo wa alama: hifadhi wachezaji kama data ya mtindo wa JSON, kisha onyesha jina na pointi za kila mchezaji.'),
    ],
  },
];

// Patterns that show a learner used the skill in their own project (Create level).
const PRO_PATTERNS = {
  strings: L(/\.(upper|lower|title|split|replace|strip|find|count)\s*\(|\blen\s*\(|\w\[\s*-?\d+\s*\]|\bf["']/, /\.(toUpperCase|toLowerCase|split|replace|trim|includes|indexOf|slice)\s*\(|\.length\b|`[^`]*\$\{|\w\[\s*\d+\s*\]/),
  dictionaries: L(/\{\s*["'][^"']+["']\s*:/, /\{\s*["']?[A-Za-z_$][\w$]*["']?\s*:/),
  debugging: L(/\b(if|try|raise|assert)\b/, /\b(if|try|throw)\b|console\.assert/),
  testing: L(/\bassert\b/, /console\.assert|\bassert\b|===/),
  searching_sorting: L(/\b(sort|sorted|min|max)\s*\(|\.sort\s*\(|\bfor\b[\s\S]*\bif\b/, /\.sort\s*\(|Math\.(max|min)\s*\(|\.(find|indexOf|includes)\s*\(|\bfor\b[\s\S]*\bif\b/),
  recursion: L(/def\s+(\w+)\s*\([\s\S]*?\b\1\s*\([\s\S]*\b\1\s*\(/, /function\s+(\w+)\s*\([\s\S]*?\b\1\s*\([\s\S]*\b\1\s*\(/),
  classes_objects: L(/\bclass\s+\w+/, /\bclass\s+\w+/),
  teamwork: L(/#\s*\S/, /\/\/\s*\S|\/\*/),
  safe_coding: L(/\bif\b[\s\S]*(len\s*\(|<|>|==)/, /\bif\s*\([\s\S]*(\.length|<|>|===?)/),
  data_apis: L(/json\.|\[\s*\{|\{\s*["']\w+["']\s*:/, /JSON\.|\[\s*\{|\{\s*["']?\w+["']?\s*:/),
};

// ---------------------------------------------------------------------------
// Question banks. Per level:
//   remember / understand / analyze: { q?, code?, correct, wrong[], codeOptions? }   (multiple choice)
//   apply:    { prompt, starter?, patterns[], start, solution }                     (write code)
//   evaluate: { lines[], bug, why, what }                                           (find the bug)
// ---------------------------------------------------------------------------
const PRO_BANK = {
  strings: {
    remember: [
      { q: t('Which one is a string?', 'Kipi kati ya hivi ni string?'), correct: '"Jambo"', wrong: ['42', '3.5', '[1, 2]'], codeOptions: true },
      { q: t('What happens when you join two strings with + ?', 'Nini kinatokea unapounganisha strings mbili kwa + ?'), correct: t('They are glued into one longer string', 'Zinaunganishwa kuwa string moja ndefu zaidi'), wrong: [t('Their lengths are added as numbers', 'Urefu wake unajumlishwa kama namba'), t('The second one is deleted', 'Ya pili inafutwa'), t('The computer compares them', 'Kompyuta inazilinganisha')] },
      { q: t('Which one tells you how many letters are in word?', 'Kipi kinakuambia neno word lina herufi ngapi?'), correct: L('len(word)', 'word.length'), wrong: L(['word.count', 'size(word)', 'word.letters()'], ['word.count', 'size(word)', 'len(word)']), codeOptions: true },
      { q: t('Which one turns word into CAPITAL letters?', 'Kipi kinabadilisha word kuwa HERUFI KUBWA?'), correct: L('word.upper()', 'word.toUpperCase()'), wrong: L(['word.capital()', 'word.big()', 'upper = word'], ['word.capital()', 'word.big()', 'word.upper()']), codeOptions: true },
    ],
    understand: [
      { code: L('city = "Nairobi"\nprint(city[0])', 'const city = "Nairobi";\nconsole.log(city[0]);'), correct: t('Prints the first letter: N', 'Inaonyesha herufi ya kwanza: N'), wrong: [t('Prints Nairobi', 'Inaonyesha Nairobi'), t('Prints the last letter: i', 'Inaonyesha herufi ya mwisho: i'), t('Prints 0', 'Inaonyesha 0')] },
      { code: L('first = "Kenya"\nsecond = "Rocks"\nprint(first + " " + second)', 'const first = "Kenya";\nconst second = "Rocks";\nconsole.log(first + " " + second);'), correct: t('Joins the words with a space and prints "Kenya Rocks"', 'Inaunganisha maneno kwa nafasi na kuonyesha "Kenya Rocks"'), wrong: [t('Prints "KenyaRocks" with no space', 'Inaonyesha "KenyaRocks" bila nafasi'), t('Adds two numbers', 'Inajumlisha namba mbili'), t('Prints the words on two lines', 'Inaonyesha maneno kwenye mistari miwili')] },
      { code: L('word = "simba"\nprint(len(word))', 'const word = "simba";\nconsole.log(word.length);'), correct: t('Prints how many letters "simba" has: 5', 'Inaonyesha "simba" lina herufi ngapi: 5'), wrong: [t('Prints simba five times', 'Inaonyesha simba mara tano'), t('Prints the letter s', 'Inaonyesha herufi s'), t('Prints SIMBA', 'Inaonyesha SIMBA')] },
      { code: L('msg = "jambo"\nprint(msg.upper())', 'const msg = "jambo";\nconsole.log(msg.toUpperCase());'), correct: t('Prints JAMBO in capital letters', 'Inaonyesha JAMBO kwa herufi kubwa'), wrong: [t('Prints jambo', 'Inaonyesha jambo'), t('Prints Jambo with only the first letter big', 'Inaonyesha Jambo herufi ya kwanza tu ikiwa kubwa'), t('Prints 5', 'Inaonyesha 5')] },
    ],
    apply: [
      { prompt: t('Store your name in a variable called name, then print it in CAPITAL letters.', 'Hifadhi jina lako kwenye kigeu kinachoitwa name, kisha lionyeshe kwa HERUFI KUBWA.'),
        patterns: L([/name\s*=\s*["']/, /name\.upper\(\s*\)/, /print\s*\(/], [/(let|const|var)\s+name\s*=\s*["'`]/, /name\.toUpperCase\(\s*\)/, /console\.log\s*\(/]),
        start: L('name = "', 'const name = "'), solution: L('name = "Amina"\nprint(name.upper())', 'const name = "Amina";\nconsole.log(name.toUpperCase());') },
      { prompt: t('Store the word "elephant" in a variable and print how many letters it has.', 'Hifadhi neno "elephant" kwenye kigeu na uonyeshe lina herufi ngapi.'),
        patterns: L([/["']elephant["']/, /len\s*\(/, /print\s*\(/], [/["'`]elephant["'`]/, /\.length\b/, /console\.log\s*\(/]),
        start: L('animal = "elephant"', 'const animal = "elephant";'), solution: L('animal = "elephant"\nprint(len(animal))', 'const animal = "elephant";\nconsole.log(animal.length);') },
      { prompt: t('Make two variables, first = "Good" and second = "morning", and print them joined with a space: Good morning', 'Tengeneza vigeu viwili, first = "Good" na second = "morning", na uviunganishe kwa nafasi: Good morning'),
        patterns: L([/first\s*=\s*["']Good["']/, /second\s*=\s*["']morning["']/, /print\s*\([^\n]*first[^\n]*second/], [/first\s*=\s*["'`]Good["'`]/, /second\s*=\s*["'`]morning["'`]/, /console\.log\s*\([^\n]*first[^\n]*second/]),
        start: L('first = "Good"', 'const first = "Good";'), solution: L('first = "Good"\nsecond = "morning"\nprint(first + " " + second)', 'const first = "Good";\nconst second = "morning";\nconsole.log(first + " " + second);') },
    ],
    analyze: [
      { code: L('word = "mango"\nprint(word[1])', 'const word = "mango";\nconsole.log(word[1]);'), q: t('What will this print?', 'Hii itaonyesha nini?'), correct: 'a', wrong: ['m', 'n', '1'] },
      { code: L('a = "5"\nb = "3"\nprint(a + b)', 'const a = "5";\nconst b = "3";\nconsole.log(a + b);'), q: t('Careful - these are strings! What will this print?', 'Kuwa makini - hizi ni strings! Hii itaonyesha nini?'), correct: '53', wrong: ['8', '5 3', '2'] },
      { code: L('team = "Harambee"\nprint(len(team))', 'const team = "Harambee";\nconsole.log(team.length);'), q: t('What will this print?', 'Hii itaonyesha nini?'), correct: '8', wrong: ['7', '9', 'Harambee'] },
      { code: L('animal = "Twiga"\nprint(animal.lower())', 'const animal = "Twiga";\nconsole.log(animal.toLowerCase());'), q: t('What will this print?', 'Hii itaonyesha nini?'), correct: 'twiga', wrong: ['TWIGA', 'Twiga', 't'] },
    ],
    evaluate: [
      { lines: L(['name = "Baraka"', 'greeting = "Hello, " + name', 'print(greting)', 'print("Bye!")'], ['const name = "Baraka";', 'const greeting = "Hello, " + name;', 'console.log(greting);', 'console.log("Bye!");']), bug: 3,
        why: t('The variable is called greeting, but line 3 says greting. Names must be spelled exactly the same.', 'Kigeu kinaitwa greeting, lakini mstari 3 unasema greting. Majina lazima yaandikwe sawa kabisa.'), what: t('print "Hello, Baraka" and then "Bye!"', 'kuonyesha "Hello, Baraka" kisha "Bye!"') },
      { lines: L(['word = "banana"', 'first = word[1]', 'print("First letter: " + first)', 'print("Done")'], ['const word = "banana";', 'const first = word[1];', 'console.log("First letter: " + first);', 'console.log("Done");']), bug: 2,
        why: t('Positions start at 0, so the first letter is word[0], not word[1].', 'Nafasi zinaanza 0, kwa hiyo herufi ya kwanza ni word[0], si word[1].'), what: t('print the first letter of "banana"', 'kuonyesha herufi ya kwanza ya "banana"') },
      { lines: L(['city = "mombasa"', 'loud = city.upper', 'print(loud)', 'print(len(city))'], ['const city = "mombasa";', 'const loud = city.toUpperCase;', 'console.log(loud);', 'console.log(city.length);']), bug: 2,
        why: L(t('upper needs brackets () to run: city.upper()', 'upper inahitaji mabano () ili ifanye kazi: city.upper()'), t('toUpperCase needs brackets () to run: city.toUpperCase()', 'toUpperCase inahitaji mabano () ili ifanye kazi: city.toUpperCase()')), what: t('print MOMBASA and then the number of letters', 'kuonyesha MOMBASA kisha idadi ya herufi') },
      { lines: L(['word = "hello"', 'last = word[5]', 'print(last)', 'print("ok")'], ['const word = "hello";', 'const last = word[5];', 'console.log(last);', 'console.log("ok");']), bug: 2,
        why: t('A 5-letter word has positions 0 to 4, so word[5] does not exist. The last letter is word[4].', 'Neno la herufi 5 lina nafasi 0 hadi 4, kwa hiyo word[5] haipo. Herufi ya mwisho ni word[4].'), what: t('print the last letter of "hello"', 'kuonyesha herufi ya mwisho ya "hello"') },
    ],
  },

  dictionaries: {
    remember: [
      { q: t('Which one makes a dictionary (an object in JavaScript)?', 'Kipi kinatengeneza dictionary (object katika JavaScript)?'), correct: L('{"name": "Amina", "age": 10}', '{ name: "Amina", age: 10 }'), wrong: ['["Amina", 10]', '("Amina", 10)', '"Amina, 10"'], codeOptions: true },
      { q: t('In a dictionary, what is a key?', 'Katika dictionary, key ni nini?'), correct: t('The name tag you use to find a value', 'Lebo ya jina unayotumia kupata thamani'), wrong: [t('The position number of a value', 'Namba ya nafasi ya thamani'), t('A password that locks the dictionary', 'Nenosiri linalofunga dictionary'), t('The last value in it', 'Thamani ya mwisho ndani yake')] },
      { q: t('How do you get Juma\'s score from scores?', 'Unapataje alama ya Juma kutoka scores?'), correct: 'scores["Juma"]', wrong: ['scores("Juma")', 'Juma[scores]', 'scores[0]'], codeOptions: true },
      { q: t('Why use a dictionary instead of a list?', 'Kwa nini utumie dictionary badala ya orodha?'), correct: t('To find values by a name instead of a position number', 'Kupata thamani kwa jina badala ya namba ya nafasi'), wrong: [t('Dictionaries are shorter to type', 'Dictionaries ni fupi kuandika'), t('Lists cannot store words', 'Orodha haziwezi kuhifadhi maneno'), t('Dictionaries can only store numbers', 'Dictionaries zinaweza kuhifadhi namba tu')] },
    ],
    understand: [
      { code: L('prices = {"mango": 20, "banana": 10}\nprint(prices["mango"])', 'const prices = { mango: 20, banana: 10 };\nconsole.log(prices["mango"]);'), correct: t('Prints the price of a mango: 20', 'Inaonyesha bei ya embe: 20'), wrong: [t('Prints the word mango', 'Inaonyesha neno mango'), t('Prints both prices', 'Inaonyesha bei zote mbili'), t('Prints 10', 'Inaonyesha 10')] },
      { code: L('pet = {"name": "Simba", "legs": 4}\npet["legs"] = 3\nprint(pet["legs"])', 'const pet = { name: "Simba", legs: 4 };\npet["legs"] = 3;\nconsole.log(pet["legs"]);'), correct: t('Changes legs to 3, then prints 3', 'Inabadilisha legs kuwa 3, kisha inaonyesha 3'), wrong: [t('Prints 4', 'Inaonyesha 4'), t('Adds a second "legs" and prints both', 'Inaongeza "legs" ya pili na kuonyesha zote'), t('Prints Simba', 'Inaonyesha Simba')] },
      { code: L('scores = {"Amina": 8}\nscores["Juma"] = 6\nprint(len(scores))', 'const scores = { Amina: 8 };\nscores["Juma"] = 6;\nconsole.log(Object.keys(scores).length);'), correct: t('Adds Juma, then prints how many keys there are: 2', 'Inaongeza Juma, kisha inaonyesha kuna keys ngapi: 2'), wrong: [t('Prints 14', 'Inaonyesha 14'), t('Prints 1', 'Inaonyesha 1'), t('Prints 6', 'Inaonyesha 6')] },
    ],
    apply: [
      { prompt: t('Make a dictionary (object) called animal with a "name" key and a "legs" key, then print the name.', 'Tengeneza dictionary (object) inayoitwa animal yenye key "name" na key "legs", kisha onyesha jina.'),
        patterns: L([/animal\s*=\s*\{/, /["']name["']\s*:/, /["']legs["']\s*:/, /print\s*\(\s*animal\s*\[\s*["']name["']\s*\]/], [/animal\s*=\s*\{/, /name["']?\s*:/, /legs["']?\s*:/, /console\.log\s*\(\s*animal(\.name|\[\s*["']name["']\s*\])/]),
        start: L('animal = {', 'const animal = {'), solution: L('animal = {"name": "Twiga", "legs": 4}\nprint(animal["name"])', 'const animal = { name: "Twiga", legs: 4 };\nconsole.log(animal.name);') },
      { prompt: t('Make a dictionary (object) called prices with tea costing 30 and mandazi costing 10, then print the price of tea.', 'Tengeneza dictionary (object) inayoitwa prices yenye chai bei 30 na mandazi bei 10, kisha onyesha bei ya chai.'),
        patterns: L([/prices\s*=\s*\{/, /["']tea["']\s*:\s*30/, /["']mandazi["']\s*:\s*10/, /prices\s*\[\s*["']tea["']\s*\]/], [/prices\s*=\s*\{/, /tea["']?\s*:\s*30/, /mandazi["']?\s*:\s*10/, /prices(\.tea|\[\s*["']tea["']\s*\])/]),
        start: L('prices = {"tea": 30', 'const prices = { tea: 30'), solution: L('prices = {"tea": 30, "mandazi": 10}\nprint(prices["tea"])', 'const prices = { tea: 30, mandazi: 10 };\nconsole.log(prices.tea);') },
      { prompt: t('Add Juma to the scores with a score of 7, then print the scores.', 'Ongeza Juma kwenye scores akiwa na alama 7, kisha onyesha scores.'), starter: L('scores = {"Amina": 5}\n', 'const scores = { Amina: 5 };\n'),
        patterns: L([/scores\s*\[\s*["']Juma["']\s*\]\s*=\s*7/, /print\s*\(\s*scores/], [/scores(\.Juma|\[\s*["']Juma["']\s*\])\s*=\s*7/, /console\.log\s*\(\s*scores/]),
        start: L('scores["Juma"] =', 'scores["Juma"] ='), solution: L('scores = {"Amina": 5}\nscores["Juma"] = 7\nprint(scores)', 'const scores = { Amina: 5 };\nscores["Juma"] = 7;\nconsole.log(scores);') },
    ],
    analyze: [
      { code: L('fruit = {"mango": 3, "orange": 5}\nfruit["mango"] = fruit["mango"] + 2\nprint(fruit["mango"])', 'const fruit = { mango: 3, orange: 5 };\nfruit["mango"] = fruit["mango"] + 2;\nconsole.log(fruit["mango"]);'), q: t('What will this print?', 'Hii itaonyesha nini?'), correct: '5', wrong: ['3', '7', '2'] },
      { code: L('colours = {"sky": "blue", "grass": "green"}\nprint(colours["grass"])', 'const colours = { sky: "blue", grass: "green" };\nconsole.log(colours["grass"]);'), q: t('What will this print?', 'Hii itaonyesha nini?'), correct: 'green', wrong: ['blue', 'grass', 'sky'] },
      { code: L('team = {"Amina": 10, "Juma": 7, "Wanjiru": 9}\nprint(len(team))', 'const team = { Amina: 10, Juma: 7, Wanjiru: 9 };\nconsole.log(Object.keys(team).length);'), q: t('What will this print?', 'Hii itaonyesha nini?'), correct: '3', wrong: ['26', '10', '1'] },
      { code: L('stock = {"pens": 4}\nstock["pens"] = 9\nstock["books"] = 2\nprint(stock["pens"])', 'const stock = { pens: 4 };\nstock["pens"] = 9;\nstock["books"] = 2;\nconsole.log(stock["pens"]);'), q: t('What will this print?', 'Hii itaonyesha nini?'), correct: '9', wrong: ['4', '13', '2'] },
    ],
    evaluate: [
      { lines: L(['ages = {"Amina": 10, "Juma": 12}', 'print(ages["Amina"])', 'print(ages["Baraka"])', 'print("Done")'], ['const ages = { Amina: 10, Juma: 12 };', 'console.log(ages["Amina"]);', 'console.log(ages["Baraka"]);', 'console.log("Done");']), bug: 3,
        why: t('There is no "Baraka" key, so his age cannot be found. The program should ask for "Juma".', 'Hakuna key "Baraka", kwa hiyo umri wake hauwezi kupatikana. Programu inapaswa kuomba "Juma".'), what: t('print Amina\'s age and Juma\'s age', 'kuonyesha umri wa Amina na wa Juma') },
      { lines: L(['pet = {"name": "Simba" "legs": 4}', 'print(pet["name"])', 'print(pet["legs"])', 'print("Done")'], ['const pet = { name: "Simba" legs: 4 };', 'console.log(pet["name"]);', 'console.log(pet["legs"]);', 'console.log("Done");']), bug: 1,
        why: t('Items in a dictionary must be separated by commas: "Simba", "legs"...', 'Vitu ndani ya dictionary lazima vitenganishwe kwa koma: "Simba", "legs"...'), what: t('print a pet\'s name and number of legs', 'kuonyesha jina la mnyama kipenzi na idadi ya miguu') },
      { lines: L(['prices = {"tea": 30, "bread": 50}', 'total = prices["tea"] + prices["bred"]', 'print(total)', 'print("Thank you")'], ['const prices = { tea: 30, bread: 50 };', 'const total = prices["tea"] + prices["bred"];', 'console.log(total);', 'console.log("Thank you");']), bug: 2,
        why: t('The key is spelled "bread", but line 2 asks for "bred". Keys must match exactly.', 'Key imeandikwa "bread", lakini mstari 2 unaomba "bred". Keys lazima zilingane kabisa.'), what: t('add up the price of tea and bread', 'kujumlisha bei ya chai na mkate') },
    ],
  },

  debugging: {
    remember: [
      { q: t('What is a bug in a program?', 'Bug katika programu ni nini?'), correct: t('A mistake that makes the program do the wrong thing', 'Kosa linalofanya programu ifanye jambo lisilo sahihi'), wrong: [t('An insect inside the computer', 'Mdudu ndani ya kompyuta'), t('A very fast program', 'Programu yenye kasi sana'), t('A comment in the code', 'Maoni ndani ya msimbo')] },
      { q: t('Your program shows an error message. What should you do FIRST?', 'Programu yako inaonyesha ujumbe wa kosa. Ufanye nini KWANZA?'), correct: t('Read it: it tells you the line and the kind of mistake', 'Usome: unakuambia mstari na aina ya kosa'), wrong: [t('Delete all the code and start again', 'Futa msimbo wote uanze upya'), t('Ignore it and run again', 'Upuuze na uendeshe tena'), t('Turn off the computer', 'Zima kompyuta')] },
      { q: t('What is a "debug print"?', '"Debug print" ni nini?'), correct: t('A print line you add to see what is inside a variable while the program runs', 'Mstari wa kuonyesha unaoongeza ili kuona kilicho ndani ya kigeu programu ikiendelea'), wrong: [t('A printer that removes bugs', 'Printa inayoondoa bugs'), t('A print that makes code faster', 'Print inayofanya msimbo uwe na kasi'), t('The last line of every program', 'Mstari wa mwisho wa kila programu')] },
      { q: t('What is "rubber duck debugging"?', '"Rubber duck debugging" ni nini?'), correct: t('Explaining your code line by line (even to a toy duck) until you spot the mistake', 'Kueleza msimbo wako mstari kwa mstari (hata kwa bata wa kuchezea) hadi uone kosa'), wrong: [t('Washing the computer', 'Kuosha kompyuta'), t('Letting a duck type the code', 'Kumwacha bata aandike msimbo'), t('Copying code from a friend', 'Kunakili msimbo wa rafiki')] },
    ],
    understand: [
      { code: L('Traceback (most recent call last):\n  File "game.py", line 4\nNameError: name \'scroe\' is not defined', 'ReferenceError: scroe is not defined\n    at game.js:4'), q: t('What is this error message telling you?', 'Ujumbe huu wa kosa unakuambia nini?'), correct: t('Line 4 uses "scroe", a name the computer does not know - probably a misspelling of "score"', 'Mstari 4 unatumia "scroe", jina ambalo kompyuta hailijui - pengine ni kosa la tahajia la "score"'), wrong: [t('The computer is broken', 'Kompyuta imeharibika'), t('Line 1 has too many spaces', 'Mstari 1 una nafasi nyingi mno'), t('The program finished correctly', 'Programu ilimaliza vizuri')] },
      { code: L('x = 10\nprint("x before:", x)\nx = x * 2\nprint("x after:", x)', 'let x = 10;\nconsole.log("x before:", x);\nx = x * 2;\nconsole.log("x after:", x);'), q: t('Why did the coder add these two print lines?', 'Kwa nini mwandishi aliongeza mistari hii miwili ya kuonyesha?'), correct: t('To see x before and after the change, to check it really doubles', 'Kuona x kabla na baada ya kubadilika, kuhakikisha inazidishwa mara mbili kweli'), wrong: [t('To make the program faster', 'Kufanya programu iwe na kasi'), t('To fix the bug automatically', 'Kurekebisha bug yenyewe'), t('To delete x', 'Kufuta x')] },
      { code: L('  File "shop.py", line 3\n    if price > 100\n                  ^\nSyntaxError: expected \':\'', 'shop.js:3\n    if (price > 100 {\n                    ^\nSyntaxError: missing ) after condition'), q: t('What is this error message telling you?', 'Ujumbe huu wa kosa unakuambia nini?'), correct: t('Line 3 is written in a way the computer cannot read - a symbol is missing', 'Mstari 3 umeandikwa kwa njia ambayo kompyuta haiwezi kusoma - alama fulani haipo'), wrong: [t('The program ran but gave a wrong answer', 'Programu iliendeshwa lakini ikatoa jibu lisilo sahihi'), t('The price is too big', 'Bei ni kubwa mno'), t('Line 1 is missing', 'Mstari 1 haupo')] },
    ],
    apply: [
      { prompt: t('This program has a bug. Fix it so it prints the total.', 'Programu hii ina bug. Irekebishe ili ionyeshe jumla.'), starter: L('price = 50\ncount = 3\ntotal = price * count\nprint(totl)\n', 'const price = 50;\nconst count = 3;\nconst total = price * count;\nconsole.log(totl);\n'),
        patterns: L([/total\s*=\s*price\s*\*\s*count/, /print\s*\(\s*total\s*\)/], [/total\s*=\s*price\s*\*\s*count/, /console\.log\s*\(\s*total\s*\)/]),
        start: L('print(total)', 'console.log(total);'), solution: L('price = 50\ncount = 3\ntotal = price * count\nprint(total)', 'const price = 50;\nconst count = 3;\nconst total = price * count;\nconsole.log(total);') },
      { prompt: t('This program should greet Amina, but it has a bug. Fix it.', 'Programu hii inapaswa kumsalimia Amina, lakini ina bug. Irekebishe.'), starter: L('name = "Amina"\nprint("Hello, " + name\n', 'const name = "Amina";\nconsole.log("Hello, " + name;\n'),
        patterns: L([/print\s*\(\s*["']Hello, ["']\s*\+\s*name\s*\)/], [/console\.log\s*\(\s*["']Hello, ["']\s*\+\s*name\s*\)/]),
        start: L('print("Hello, " + name)', 'console.log("Hello, " + name);'), solution: L('name = "Amina"\nprint("Hello, " + name)', 'const name = "Amina";\nconsole.log("Hello, " + name);') },
      { prompt: t('Add a debug print AFTER the change that shows the value of score.', 'Ongeza debug print BAADA ya mabadiliko inayoonyesha thamani ya score.'), starter: L('score = 10\nscore = score + 5\n', 'let score = 10;\nscore = score + 5;\n'),
        patterns: L([/score\s*=\s*score\s*\+\s*5[\s\S]*print\s*\([^\n]*score/], [/score\s*=\s*score\s*\+\s*5[\s\S]*console\.log\s*\([^\n]*score/]),
        start: L('print("score is", score)', 'console.log("score is", score);'), solution: L('score = 10\nscore = score + 5\nprint("score is", score)', 'let score = 10;\nscore = score + 5;\nconsole.log("score is", score);') },
    ],
    analyze: [
      { code: L('n = 3\nprint("n is", n)\nn = n + 4\nprint("n is", n)', 'let n = 3;\nconsole.log("n is", n);\nn = n + 4;\nconsole.log("n is", n);'), q: t('What do the two debug prints show?', 'Debug prints hizo mbili zinaonyesha nini?'), correct: t('n is 3, then n is 7', 'n is 3, kisha n is 7'), wrong: [t('n is 7, then n is 7', 'n is 7, kisha n is 7'), t('n is 3, then n is 3', 'n is 3, kisha n is 3'), t('n is 3, then n is 34', 'n is 3, kisha n is 34')] },
      { code: L('total = 0\nfor n in [2, 4, 6]:\n    total = n\nprint(total)', 'let total = 0;\nfor (const n of [2, 4, 6]) {\n  total = n;\n}\nconsole.log(total);'), q: t('The coder wanted the sum (12). What does it REALLY print?', 'Mwandishi alitaka jumla (12). Kwa KWELI inaonyesha nini?'), correct: '6', wrong: ['12', '0', '2'] },
      { code: L('count = 0\nwhile count < 3:\n    print("hi")\nprint("done")', 'let count = 0;\nwhile (count < 3) {\n  console.log("hi");\n}\nconsole.log("done");'), q: t('What is the bug?', 'Bug ni ipi?'), correct: t('count never changes, so the loop never stops', 'count haibadiliki, kwa hiyo kitanzi hakisimami'), wrong: [t('It prints "hi" only once', 'Inaonyesha "hi" mara moja tu'), t('"done" is printed first', '"done" inaonyeshwa kwanza'), t('count starts too high', 'count inaanza juu mno')] },
    ],
    evaluate: [
      { lines: L(['def average(a, b):', '    return a + b / 2', 'print(average(4, 6))', 'print("Done")'], ['function average(a, b) {', '  return a + b / 2;', '}', 'console.log(average(4, 6));']), bug: 2,
        why: t('Division happens before addition, so this gives 7. It needs brackets: (a + b) / 2.', 'Kugawanya kunafanyika kabla ya kujumlisha, kwa hiyo inatoa 7. Inahitaji mabano: (a + b) / 2.'), what: t('print the average of 4 and 6, which is 5', 'kuonyesha wastani wa 4 na 6, ambao ni 5') },
      { lines: L(['marks = [70, 80, 90]', 'total = 0', 'for m in marks:', '    total = total + 1', 'print(total)'], ['const marks = [70, 80, 90];', 'let total = 0;', 'for (const m of marks) {', '  total = total + 1;', '}', 'console.log(total);']), bug: 4,
        why: t('It adds 1 each time instead of adding the mark m: total = total + m.', 'Inaongeza 1 kila mara badala ya kuongeza alama m: total = total + m.'), what: t('add up all the marks (240)', 'kujumlisha alama zote (240)') },
      { lines: L(['age = 12', 'if age > 12:', '    print("You can join the club")', 'print("Bye")'], ['const age = 12;', 'if (age > 12) {', '  console.log("You can join the club");', '}']), bug: 2,
        why: t('Children aged exactly 12 should join too, so it must be >= instead of >.', 'Watoto wenye umri wa 12 hasa wanapaswa kujiunga pia, kwa hiyo lazima iwe >= badala ya >.'), what: t('let children aged 12 and over join the club', 'kuwaruhusu watoto wa miaka 12 na zaidi kujiunga na klabu') },
    ],
  },

  testing: {
    remember: [
      { q: t('What does a test do?', 'Test inafanya nini?'), correct: t('Checks that code gives the answer you expect', 'Inakagua kwamba msimbo unatoa jibu unalotarajia'), wrong: [t('Makes the code run faster', 'Inafanya msimbo uende kwa kasi'), t('Writes the code for you', 'Inakuandikia msimbo'), t('Hides the code from others', 'Inaficha msimbo kutoka kwa wengine')] },
      { q: t('Which line is a test?', 'Mstari upi ni test?'), correct: L('assert add(2, 3) == 5', 'console.assert(add(2, 3) === 5);'), wrong: L(['total = 2 + 3', 'print("add")', 'def add(a, b):'], ['let total = 2 + 3;', 'console.log("add");', 'function add(a, b) {']), codeOptions: true },
      { q: t('When should you run your tests?', 'Unapaswa kuendesha tests zako lini?'), correct: t('Every time you change the code', 'Kila mara unapobadilisha msimbo'), wrong: [t('Only once, at the very end', 'Mara moja tu, mwishoni kabisa'), t('Never - tests are only for teachers', 'Kamwe - tests ni za walimu tu'), t('Only when the computer is new', 'Kompyuta ikiwa mpya tu')] },
      { q: t('What is an "edge case"?', '"Edge case" ni nini?'), correct: t('An unusual input at the edge, like 0, an empty list or a very big number', 'Pembejeo isiyo ya kawaida ukingoni, kama 0, orodha tupu au namba kubwa sana'), wrong: [t('Code written at the edge of the screen', 'Msimbo ulioandikwa ukingoni mwa skrini'), t('The last line of a program', 'Mstari wa mwisho wa programu'), t('A broken keyboard key', 'Kitufe kilichovunjika cha kibodi')] },
    ],
    understand: [
      { code: L('def is_even(n):\n    return n % 2 == 0\n\nassert is_even(4) == True\nassert is_even(7) == False', 'function isEven(n) {\n  return n % 2 === 0;\n}\nconsole.assert(isEven(4) === true);\nconsole.assert(isEven(7) === false);'), correct: t('Two tests check the function gives the right answer for an even and an odd number', 'Tests mbili zinakagua kitendakazi kinatoa jibu sahihi kwa namba shufwa na witiri'), wrong: [t('It prints 4 and 7', 'Inaonyesha 4 na 7'), t('It turns 7 into an even number', 'Inageuza 7 kuwa namba shufwa'), t('It deletes the function', 'Inafuta kitendakazi')] },
      { code: L('def area(w, h):\n    return w * h\n\nassert area(3, 4) == 12\nassert area(0, 5) == 0', 'function area(w, h) {\n  return w * h;\n}\nconsole.assert(area(3, 4) === 12);\nconsole.assert(area(0, 5) === 0);'), correct: t('Tests area with a normal case and an edge case (zero width)', 'Inapima area kwa hali ya kawaida na edge case (upana sifuri)'), wrong: [t('Draws two rectangles', 'Inachora mistatili miwili'), t('Checks that area is always 12', 'Inakagua kwamba area daima ni 12'), t('Changes w and h to 0', 'Inabadilisha w na h kuwa 0')] },
      { code: L('def add(a, b):\n    return a - b\n\nassert add(2, 2) == 4   # fails!', 'function add(a, b) {\n  return a - b;\n}\nconsole.assert(add(2, 2) === 4); // fails!'), correct: t('The test fails because add subtracts - the test caught a bug', 'Test inashindwa kwa sababu add inatoa - test imekamata bug'), wrong: [t('The test is wrong because 2 + 2 is not 4', 'Test si sahihi kwa sababu 2 + 2 si 4'), t('The program is correct', 'Programu ni sahihi'), t('The test makes add subtract', 'Test inafanya add itoe')] },
    ],
    apply: [
      { prompt: t('Write a test that checks double(5) gives 10.', 'Andika test inayokagua kwamba double(5) inatoa 10.'), starter: L('def double(n):\n    return n * 2\n\n', 'function double(n) {\n  return n * 2;\n}\n\n'),
        patterns: L([/assert\s+double\s*\(\s*5\s*\)\s*==\s*10/], [/console\.assert\s*\(\s*double\s*\(\s*5\s*\)\s*===?\s*10/]),
        start: L('assert double(5) ==', 'console.assert(double(5) ==='), solution: L('def double(n):\n    return n * 2\n\nassert double(5) == 10', 'function double(n) {\n  return n * 2;\n}\n\nconsole.assert(double(5) === 10);') },
      { prompt: L(t('Write two tests for is_adult(age): age 20 should give True and age 9 should give False.', 'Andika tests mbili za is_adult(age): umri 20 utoe True na umri 9 utoe False.'), t('Write two tests for isAdult(age): age 20 should give true and age 9 should give false.', 'Andika tests mbili za isAdult(age): umri 20 utoe true na umri 9 utoe false.')),
        starter: L('def is_adult(age):\n    return age >= 18\n\n', 'function isAdult(age) {\n  return age >= 18;\n}\n\n'),
        patterns: L([/assert\s+is_adult\s*\(\s*20\s*\)/, /assert\s+(not\s+is_adult\s*\(\s*9\s*\)|is_adult\s*\(\s*9\s*\)\s*(==\s*False|is\s+False))/], [/console\.assert\s*\(\s*isAdult\s*\(\s*20\s*\)/, /console\.assert\s*\(\s*(!\s*isAdult\s*\(\s*9\s*\)|isAdult\s*\(\s*9\s*\)\s*===?\s*false)/]),
        start: L('assert is_adult(20) == True', 'console.assert(isAdult(20) === true);'), solution: L('def is_adult(age):\n    return age >= 18\n\nassert is_adult(20) == True\nassert is_adult(9) == False', 'function isAdult(age) {\n  return age >= 18;\n}\n\nconsole.assert(isAdult(20) === true);\nconsole.assert(isAdult(9) === false);') },
      { prompt: t('Write a test for the edge case: the total of an empty list [] should be 0.', 'Andika test ya edge case: jumla ya orodha tupu [] iwe 0.'), starter: L('def total(numbers):\n    result = 0\n    for n in numbers:\n        result = result + n\n    return result\n\n', 'function total(numbers) {\n  let result = 0;\n  for (const n of numbers) {\n    result = result + n;\n  }\n  return result;\n}\n\n'),
        patterns: L([/assert\s+total\s*\(\s*\[\s*\]\s*\)\s*==\s*0/], [/console\.assert\s*\(\s*total\s*\(\s*\[\s*\]\s*\)\s*===?\s*0/]),
        start: L('assert total([]) ==', 'console.assert(total([]) ==='), solution: L('def total(numbers):\n    result = 0\n    for n in numbers:\n        result = result + n\n    return result\n\nassert total([]) == 0', 'function total(numbers) {\n  let result = 0;\n  for (const n of numbers) {\n    result = result + n;\n  }\n  return result;\n}\n\nconsole.assert(total([]) === 0);') },
    ],
    analyze: [
      { code: L('def triple(n):\n    return n + 3\n\nassert triple(0) == 0   # test A\nassert triple(2) == 6   # test B', 'function triple(n) {\n  return n + 3;\n}\nconsole.assert(triple(0) === 0); // test A\nconsole.assert(triple(2) === 6); // test B'), q: t('If we run each test, which ones FAIL?', 'Tukiendesha kila test, zipi ZINASHINDWA?'), correct: t('Both A and B', 'A na B zote'), wrong: [t('Only A', 'A tu'), t('Only B', 'B tu'), t('None of them', 'Hakuna')] },
      { code: L('def biggest(a, b):\n    if a > b:\n        return a\n    return b\n\nassert biggest(3, 9) == 9   # test A\nassert biggest(5, 5) == 5   # test B', 'function biggest(a, b) {\n  if (a > b) {\n    return a;\n  }\n  return b;\n}\nconsole.assert(biggest(3, 9) === 9); // test A\nconsole.assert(biggest(5, 5) === 5); // test B'), q: t('If we run each test, which ones FAIL?', 'Tukiendesha kila test, zipi ZINASHINDWA?'), correct: t('None of them - both pass', 'Hakuna - zote zinapita'), wrong: [t('Only A', 'A tu'), t('Only B', 'B tu'), t('Both A and B', 'A na B zote')] },
      { code: L('def first_letter(word):\n    return word[1]\n\nassert first_letter("cat") == "c"   # test A\nassert first_letter("ox") == "x"    # test B', 'function firstLetter(word) {\n  return word[1];\n}\nconsole.assert(firstLetter("cat") === "c"); // test A\nconsole.assert(firstLetter("ox") === "x");  // test B'), q: t('If we run each test, which ones FAIL?', 'Tukiendesha kila test, zipi ZINASHINDWA?'), correct: t('Only A', 'A tu'), wrong: [t('Only B', 'B tu'), t('Both A and B', 'A na B zote'), t('None of them', 'Hakuna')] },
    ],
    evaluate: [
      { lines: L(['def add(a, b):', '    return a + b', 'assert add(2, 2) == 4', 'assert add(2, 3) == 6', 'print("Tests done")'], ['function add(a, b) {', '  return a + b;', '}', 'console.assert(add(2, 3) === 6);', 'console.log("Tests done");']), bug: 4,
        why: t('The function is right but this test is wrong: 2 + 3 is 5, not 6. Tests can have bugs too!', 'Kitendakazi ni sahihi lakini test hii si sahihi: 2 + 3 ni 5, si 6. Tests nazo zinaweza kuwa na bugs!'), what: t('test that add() works', 'kupima kwamba add() inafanya kazi') },
      { lines: L(['def is_even(n):', '    return n % 2 == 1', 'assert is_even(4) == True', 'assert is_even(3) == False'], ['function isEven(n) {', '  return n % 2 === 1;', '}', 'console.assert(isEven(4) === true);']), bug: 2,
        why: t('An even number has remainder 0, so it should be n % 2 == 0. The tests caught it!', 'Namba shufwa ina baki 0, kwa hiyo inapaswa kuwa n % 2 == 0. Tests zimeikamata!'), what: t('check if a number is even, with tests', 'kukagua kama namba ni shufwa, pamoja na tests') },
      { lines: L(['def total(numbers):', '    result = 1', '    for n in numbers:', '        result = result + n', '    return result'], ['function total(numbers) {', '  let result = 1;', '  for (const n of numbers) {', '    result = result + n;', '  }', '  return result;', '}']), bug: 2,
        why: t('The total must start at 0. Starting at 1 makes every answer 1 too big - a test like total([]) == 0 catches it.', 'Jumla lazima ianze 0. Kuanza 1 kunafanya kila jibu lizidi kwa 1 - test kama total([]) == 0 inaikamata.'), what: t('add up a list of numbers (an empty list should give 0)', 'kujumlisha orodha ya namba (orodha tupu itoe 0)') },
    ],
  },

  searching_sorting: {
    remember: [
      { q: t('What is an algorithm?', 'Algorithm ni nini?'), correct: t('A clear list of steps to solve a problem', 'Orodha wazi ya hatua za kutatua tatizo'), wrong: [t('A type of computer', 'Aina ya kompyuta'), t('A secret password', 'Nenosiri la siri'), t('A spelling mistake', 'Kosa la tahajia')] },
      { q: t('What does sorting do?', 'Kupanga (sorting) kunafanya nini?'), correct: t('Puts items in order, like smallest to biggest or A to Z', 'Kunaweka vitu kwa mpangilio, kama kidogo hadi kikubwa au A hadi Z'), wrong: [t('Deletes the biggest item', 'Kunafuta kitu kikubwa zaidi'), t('Mixes the items up', 'Kunachanganya vitu'), t('Counts the items', 'Kunahesabu vitu')] },
      { q: t('How does a linear search find an item?', 'Linear search inapataje kitu?'), correct: t('It checks each item one by one from the start', 'Inakagua kila kitu kimoja kimoja kuanzia mwanzo'), wrong: [t('It guesses a random item', 'Inabahatisha kitu chochote'), t('It only looks at the last item', 'Inaangalia kitu cha mwisho tu'), t('It asks the user', 'Inamuuliza mtumiaji')] },
      { q: t('Binary search is very fast, but it only works when the list is...', 'Binary search ina kasi sana, lakini inafanya kazi tu orodha ikiwa...'), correct: t('Already sorted', 'Tayari imepangwa'), wrong: [t('Empty', 'Tupu'), t('Full of words', 'Imejaa maneno'), t('Shorter than 3 items', 'Fupi kuliko vitu 3')] },
    ],
    understand: [
      { code: L('names = ["Zawadi", "Amina", "Kito"]\nnames.sort()\nprint(names)', 'const names = ["Zawadi", "Amina", "Kito"];\nnames.sort();\nconsole.log(names);'), correct: t('Puts the names in A-to-Z order and prints them', 'Inapanga majina kwa mpangilio wa A hadi Z na kuyaonyesha'), wrong: [t('Prints the names backwards', 'Inaonyesha majina kinyume'), t('Prints only the first name', 'Inaonyesha jina la kwanza tu'), t('Deletes Zawadi', 'Inafuta Zawadi')] },
      { code: L('marks = [55, 90, 72]\nbest = marks[0]\nfor m in marks:\n    if m > best:\n        best = m\nprint(best)', 'const marks = [55, 90, 72];\nlet best = marks[0];\nfor (const m of marks) {\n  if (m > best) {\n    best = m;\n  }\n}\nconsole.log(best);'), correct: t('Finds and prints the biggest mark', 'Inatafuta na kuonyesha alama kubwa zaidi'), wrong: [t('Prints every mark', 'Inaonyesha kila alama'), t('Prints the first mark', 'Inaonyesha alama ya kwanza'), t('Adds up the marks', 'Inajumlisha alama')] },
      { code: L('animals = ["cat", "dog", "goat"]\nfound = False\nfor a in animals:\n    if a == "dog":\n        found = True\nprint(found)', 'const animals = ["cat", "dog", "goat"];\nlet found = false;\nfor (const a of animals) {\n  if (a === "dog") {\n    found = true;\n  }\n}\nconsole.log(found);'), correct: t('Searches the list for "dog" and prints whether it was found', 'Inatafuta "dog" kwenye orodha na kuonyesha kama limepatikana'), wrong: [t('Prints dog three times', 'Inaonyesha dog mara tatu'), t('Removes dog from the list', 'Inaondoa dog kwenye orodha'), t('Counts the animals', 'Inahesabu wanyama')] },
    ],
    apply: [
      { prompt: L(t('Sort the list numbers from smallest to biggest, then print it.', 'Panga orodha numbers kutoka ndogo hadi kubwa, kisha uionyeshe.'), t('Sort the list numbers from smallest to biggest (use the compare function (a, b) => a - b), then print it.', 'Panga orodha numbers kutoka ndogo hadi kubwa (tumia (a, b) => a - b), kisha uionyeshe.')),
        starter: L('numbers = [8, 3, 5]\n', 'const numbers = [8, 3, 5];\n'),
        patterns: L([/numbers\.sort\s*\(\s*\)|sorted\s*\(\s*numbers\s*\)/, /print\s*\(/], [/numbers\.sort\s*\(\s*\(?\s*(\w+)\s*,\s*(\w+)\s*\)?\s*=>\s*\1\s*-\s*\2/, /console\.log\s*\(/]),
        start: L('numbers.sort()', 'numbers.sort((a, b) => a - b);'), solution: L('numbers = [8, 3, 5]\nnumbers.sort()\nprint(numbers)', 'const numbers = [8, 3, 5];\nnumbers.sort((a, b) => a - b);\nconsole.log(numbers);') },
      { prompt: t('Write a loop that searches fruits for "mango" and prints "Found!" when it finds it.', 'Andika kitanzi kinachotafuta "mango" ndani ya fruits na kuonyesha "Found!" kikiipata.'), starter: L('fruits = ["banana", "mango", "orange"]\n', 'const fruits = ["banana", "mango", "orange"];\n'),
        patterns: L([/for\s+\w+\s+in\s+fruits/, /if\s+\w+\s*==\s*["']mango["']/, /print\s*\(\s*["']Found!/], [/for\s*\(/, /===?\s*["']mango["']/, /console\.log\s*\(\s*["']Found!/]),
        start: L('for fruit in fruits:', 'for (const fruit of fruits) {'), solution: L('fruits = ["banana", "mango", "orange"]\nfor fruit in fruits:\n    if fruit == "mango":\n        print("Found!")', 'const fruits = ["banana", "mango", "orange"];\nfor (const fruit of fruits) {\n  if (fruit === "mango") {\n    console.log("Found!");\n  }\n}') },
      { prompt: t('Find the smallest number in heights and print it.', 'Tafuta namba ndogo zaidi ndani ya heights na uionyeshe.'), starter: L('heights = [140, 128, 151]\n', 'const heights = [140, 128, 151];\n'),
        patterns: L([/min\s*\(\s*heights\s*\)|for\s+\w+\s+in\s+heights/, /print\s*\(/], [/Math\.min\s*\(\s*\.\.\.\s*heights\s*\)|for\s*\(/, /console\.log\s*\(/]),
        start: L('print(min(', 'console.log(Math.min(...'), solution: L('heights = [140, 128, 151]\nprint(min(heights))', 'const heights = [140, 128, 151];\nconsole.log(Math.min(...heights));') },
    ],
    analyze: [
      { code: L('nums = [4, 1, 3]\nnums.sort()\nprint(nums[0])', 'const nums = [4, 1, 3];\nnums.sort((a, b) => a - b);\nconsole.log(nums[0]);'), q: t('What will this print?', 'Hii itaonyesha nini?'), correct: '1', wrong: ['4', '3', '0'] },
      { code: L('items = [6, 2, 9, 5]\nsteps = 0\nfor x in items:\n    steps = steps + 1\n    if x == 9:\n        break\nprint(steps)', 'const items = [6, 2, 9, 5];\nlet steps = 0;\nfor (const x of items) {\n  steps = steps + 1;\n  if (x === 9) {\n    break;\n  }\n}\nconsole.log(steps);'), q: t('A linear search for 9. How many steps does it take?', 'Linear search ya 9. Inachukua hatua ngapi?'), correct: '3', wrong: ['4', '9', '2'] },
      { code: '[10, 20, 30, 40, 50, 60, 70]', q: t('Binary search looks for 70 in this sorted list. Which number does it check FIRST?', 'Binary search inatafuta 70 kwenye orodha hii iliyopangwa. Inakagua namba ipi KWANZA?'), correct: '40', wrong: ['10', '70', '20'] },
      { code: L('words = ["kiwi", "apple", "fig"]\nwords.sort()\nprint(words[-1])', 'const words = ["kiwi", "apple", "fig"];\nwords.sort();\nconsole.log(words[words.length - 1]);'), q: t('What will this print?', 'Hii itaonyesha nini?'), correct: 'kiwi', wrong: ['apple', 'fig', 'kiwi apple fig'] },
    ],
    evaluate: [
      { lines: L(['marks = [55, 90, 72]', 'best = 0', 'for m in marks:', '    if m < best:', '        best = m', 'print(best)'], ['const marks = [55, 90, 72];', 'let best = 0;', 'for (const m of marks) {', '  if (m < best) {', '    best = m;', '  }', '}', 'console.log(best);']), bug: 4,
        why: t('To find the biggest, check if m is GREATER than best: m > best.', 'Kupata kubwa zaidi, angalia kama m ni KUBWA kuliko best: m > best.'), what: t('find the biggest mark', 'kupata alama kubwa zaidi') },
      { lines: L(['names = ["Kito", "Amina"]', 'found = False', 'for n in names:', '    if n == "Amina":', '        found = False', 'print(found)'], ['const names = ["Kito", "Amina"];', 'let found = false;', 'for (const n of names) {', '  if (n === "Amina") {', '    found = false;', '  }', '}', 'console.log(found);']), bug: 5,
        why: t('When Amina is found, found must become True (true), not False.', 'Amina akipatikana, found lazima iwe True (true), si False.'), what: t('search for Amina and print that she was found', 'kumtafuta Amina na kuonyesha kwamba amepatikana') },
      { lines: L(['nums = [3, 8, 1]', 'smallest = nums[0]', 'for n in nums:', '    if n < smallest:', '        smallest = nums', 'print(smallest)'], ['const nums = [3, 8, 1];', 'let smallest = nums[0];', 'for (const n of nums) {', '  if (n < smallest) {', '    smallest = nums;', '  }', '}', 'console.log(smallest);']), bug: 5,
        why: t('It should store the number n, not the whole list: smallest = n.', 'Inapaswa kuhifadhi namba n, si orodha nzima: smallest = n.'), what: t('find the smallest number', 'kupata namba ndogo zaidi') },
    ],
  },

  recursion: {
    remember: [
      { q: t('What is recursion?', 'Recursion ni nini?'), correct: t('When a function calls itself', 'Pale kitendakazi kinapojiita chenyewe'), wrong: [t('When a loop runs forever', 'Pale kitanzi kinapoendelea milele'), t('When two programs talk', 'Pale programu mbili zinapozungumza'), t('When code is copied twice', 'Pale msimbo unaponakiliwa mara mbili')] },
      { q: t('What is the base case?', 'Base case ni nini?'), correct: t('The condition that stops the function calling itself again', 'Sharti linalozuia kitendakazi kujiita tena'), wrong: [t('The first line of the program', 'Mstari wa kwanza wa programu'), t('The biggest number in a list', 'Namba kubwa zaidi kwenye orodha'), t('A bag for carrying a laptop', 'Mfuko wa kubebea kompyuta')] },
      { q: t('What happens if a recursive function has NO base case?', 'Nini kinatokea kitendakazi cha recursion kikiwa HAKINA base case?'), correct: t('It keeps calling itself until the program crashes', 'Kinaendelea kujiita hadi programu ivunjike'), wrong: [t('It runs once and stops', 'Kinaendeshwa mara moja na kusimama'), t('It prints nothing and finishes', 'Hakionyeshi kitu na kumaliza'), t('It becomes faster', 'Kinakuwa na kasi zaidi')] },
      { q: t('Each time a recursive function calls itself, the problem should get...', 'Kila mara kitendakazi cha recursion kinapojiita, tatizo linapaswa kuwa...'), correct: t('Smaller - closer to the base case', 'Dogo zaidi - karibu na base case'), wrong: [t('Bigger', 'Kubwa zaidi'), t('Exactly the same', 'Sawa kabisa'), t('Deleted', 'Limefutwa')] },
    ],
    understand: [
      { code: L('def countdown(n):\n    if n == 0:\n        print("Blast off!")\n        return\n    print(n)\n    countdown(n - 1)\n\ncountdown(3)', 'function countdown(n) {\n  if (n === 0) {\n    console.log("Blast off!");\n    return;\n  }\n  console.log(n);\n  countdown(n - 1);\n}\ncountdown(3);'), correct: t('Counts down 3, 2, 1 and then prints Blast off!', 'Inahesabu kurudi nyuma 3, 2, 1 kisha inaonyesha Blast off!'), wrong: [t('Counts up 1, 2, 3', 'Inahesabu kwenda mbele 1, 2, 3'), t('Prints Blast off! three times', 'Inaonyesha Blast off! mara tatu'), t('Never stops', 'Haisimami kamwe')] },
      { code: L('def total(n):\n    if n == 0:\n        return 0\n    return n + total(n - 1)\n\nprint(total(4))', 'function total(n) {\n  if (n === 0) {\n    return 0;\n  }\n  return n + total(n - 1);\n}\nconsole.log(total(4));'), correct: t('Adds 4 + 3 + 2 + 1 and prints 10', 'Inajumlisha 4 + 3 + 2 + 1 na kuonyesha 10'), wrong: [t('Prints 4', 'Inaonyesha 4'), t('Prints 0', 'Inaonyesha 0'), t('Multiplies 4 by itself', 'Inazidisha 4 kwa yenyewe')] },
      { code: L('def stars(n):\n    if n == 0:\n        return ""\n    return "*" + stars(n - 1)\n\nprint(stars(3))', 'function stars(n) {\n  if (n === 0) {\n    return "";\n  }\n  return "*" + stars(n - 1);\n}\nconsole.log(stars(3));'), correct: t('Builds a row of 3 stars and prints ***', 'Inajenga mstari wa nyota 3 na kuonyesha ***'), wrong: [t('Prints 3', 'Inaonyesha 3'), t('Prints * on three lines', 'Inaonyesha * kwenye mistari mitatu'), t('Prints nothing', 'Haionyeshi kitu')] },
    ],
    apply: [
      { prompt: t('Finish the base case: when n is 0, the function should return 1.', 'Maliza base case: n ikiwa 0, kitendakazi kirudishe 1.'), starter: L('def factorial(n):\n    # base case here\n    return n * factorial(n - 1)\n\nprint(factorial(4))\n', 'function factorial(n) {\n  // base case here\n  return n * factorial(n - 1);\n}\nconsole.log(factorial(4));\n'),
        patterns: L([/if\s+n\s*(==|<=)\s*0\s*:\s*\n?\s*return\s+1\b/], [/if\s*\(\s*n\s*(===?|<=)\s*0\s*\)\s*\{?\s*return\s+1\b/]),
        start: L('if n == 0:', 'if (n === 0) {'), solution: L('def factorial(n):\n    if n == 0:\n        return 1\n    return n * factorial(n - 1)\n\nprint(factorial(4))', 'function factorial(n) {\n  if (n === 0) {\n    return 1;\n  }\n  return n * factorial(n - 1);\n}\nconsole.log(factorial(4));') },
      { prompt: t('Write a recursive countdown(n) that prints n, then calls countdown(n - 1), and stops at 0.', 'Andika countdown(n) ya recursion inayoonyesha n, kisha kuita countdown(n - 1), na kusimama 0.'),
        patterns: L([/def\s+countdown\s*\(\s*n\s*\)/, /if\s+n\s*(==|<=|<)\s*[01]/, /countdown\s*\(\s*n\s*-\s*1\s*\)/], [/function\s+countdown\s*\(\s*n\s*\)/, /if\s*\(\s*n\s*(===?|<=|<)\s*[01]/, /countdown\s*\(\s*n\s*-\s*1\s*\)/]),
        start: L('def countdown(n):', 'function countdown(n) {'), solution: L('def countdown(n):\n    if n == 0:\n        return\n    print(n)\n    countdown(n - 1)\n\ncountdown(5)', 'function countdown(n) {\n  if (n === 0) {\n    return;\n  }\n  console.log(n);\n  countdown(n - 1);\n}\ncountdown(5);') },
      { prompt: L(t('Complete the last line so sum_to(n) adds up n + (n - 1) + ... + 1.', 'Kamilisha mstari wa mwisho ili sum_to(n) ijumlishe n + (n - 1) + ... + 1.'), t('Complete the last line so sumTo(n) adds up n + (n - 1) + ... + 1.', 'Kamilisha mstari wa mwisho ili sumTo(n) ijumlishe n + (n - 1) + ... + 1.')),
        starter: L('def sum_to(n):\n    if n == 0:\n        return 0\n    return n + ____\n', 'function sumTo(n) {\n  if (n === 0) {\n    return 0;\n  }\n  return n + ____;\n}\n'),
        patterns: L([/return\s+n\s*\+\s*sum_to\s*\(\s*n\s*-\s*1\s*\)/], [/return\s+n\s*\+\s*sumTo\s*\(\s*n\s*-\s*1\s*\)/]),
        start: L('return n + sum_to(', 'return n + sumTo('), solution: L('def sum_to(n):\n    if n == 0:\n        return 0\n    return n + sum_to(n - 1)', 'function sumTo(n) {\n  if (n === 0) {\n    return 0;\n  }\n  return n + sumTo(n - 1);\n}') },
    ],
    analyze: [
      { code: L('def f(n):\n    if n == 1:\n        return 1\n    return n * f(n - 1)\n\nprint(f(3))', 'function f(n) {\n  if (n === 1) {\n    return 1;\n  }\n  return n * f(n - 1);\n}\nconsole.log(f(3));'), q: t('What will this print?', 'Hii itaonyesha nini?'), correct: '6', wrong: ['3', '1', '9'] },
      { code: L('def count(n):\n    if n == 0:\n        return\n    print(n)\n    count(n - 2)\n\ncount(6)', 'function count(n) {\n  if (n === 0) {\n    return;\n  }\n  console.log(n);\n  count(n - 2);\n}\ncount(6);'), q: t('Which numbers are printed?', 'Namba zipi zinaonyeshwa?'), correct: '6, 4, 2', wrong: ['6, 4, 2, 0', '6, 5, 4, 3, 2, 1', '6'] },
      { code: L('def power(base, n):\n    if n == 0:\n        return 1\n    return base * power(base, n - 1)\n\nprint(power(2, 3))', 'function power(base, n) {\n  if (n === 0) {\n    return 1;\n  }\n  return base * power(base, n - 1);\n}\nconsole.log(power(2, 3));'), q: t('What will this print?', 'Hii itaonyesha nini?'), correct: '8', wrong: ['6', '9', '5'] },
      { code: L('def hello(n):\n    if n == 0:\n        return\n    hello(n - 1)\n\nhello(3)', 'function hello(n) {\n  if (n === 0) {\n    return;\n  }\n  hello(n - 1);\n}\nhello(3);'), q: t('How many times is hello called in total (count the first call too)?', 'hello inaitwa mara ngapi kwa jumla (hesabu mwito wa kwanza pia)?'), correct: '4', wrong: ['3', '1', t('Forever', 'Milele')] },
    ],
    evaluate: [
      { lines: L(['def countdown(n):', '    if n == 0:', '        print("Go!")', '        return', '    print(n)', '    countdown(n + 1)'], ['function countdown(n) {', '  if (n === 0) {', '    console.log("Go!");', '    return;', '  }', '  console.log(n);', '  countdown(n + 1);', '}']), bug: L(6, 7),
        why: t('n + 1 moves AWAY from the base case 0, so it never stops. It should be n - 1.', 'n + 1 inaenda MBALI na base case 0, kwa hiyo haisimami. Inapaswa kuwa n - 1.'), what: t('count down to 0 and then print Go!', 'kuhesabu kurudi nyuma hadi 0 kisha kuonyesha Go!') },
      { lines: L(['def total(n):', '    print("adding", n)', '    return n + total(n - 1)', 'print(total(3))'], ['function total(n) {', '  console.log("adding", n);', '  return n + total(n - 1);', '}', 'console.log(total(3));']), bug: 3,
        why: t('There is no base case, so total keeps calling itself forever. Before this line it needs: if n is 0, return 0.', 'Hakuna base case, kwa hiyo total inaendelea kujiita milele. Kabla ya mstari huu inahitaji: n ikiwa 0, rudisha 0.'), what: t('add up 3 + 2 + 1', 'kujumlisha 3 + 2 + 1') },
      { lines: L(['def factorial(n):', '    if n == 0:', '        return 0', '    return n * factorial(n - 1)'], ['function factorial(n) {', '  if (n === 0) {', '    return 0;', '  }', '  return n * factorial(n - 1);', '}']), bug: 3,
        why: t('The base case must return 1. Returning 0 makes every answer 0, because anything times 0 is 0.', 'Base case lazima irudishe 1. Kurudisha 0 kunafanya kila jibu kuwa 0, kwa sababu chochote mara 0 ni 0.'), what: t('work out 4 × 3 × 2 × 1', 'kukokotoa 4 × 3 × 2 × 1') },
    ],
  },

  classes_objects: {
    remember: [
      { q: t('What is a class?', 'Class ni nini?'), correct: t('A blueprint for making objects', 'Ramani ya kutengeneza objects'), wrong: [t('Only a room in a school', 'Chumba cha shule tu'), t('A type of loop', 'Aina ya kitanzi'), t('A list of numbers', 'Orodha ya namba')] },
      { q: t('What is a method?', 'Method ni nini?'), correct: t('A function that belongs to an object, like bark()', 'Kitendakazi kinachomilikiwa na object, kama bark()'), wrong: [t('A variable outside a class', 'Kigeu nje ya class'), t('The name of the class', 'Jina la class'), t('A kind of comment', 'Aina ya maoni')] },
      { q: t('Which line makes a NEW object from the class Cat?', 'Mstari upi unatengeneza object MPYA kutoka class Cat?'), correct: L('tom = Cat("Tom")', 'const tom = new Cat("Tom");'), wrong: L(['class Cat:', 'def Cat(self):', 'Cat = "Tom"'], ['class Cat {', 'function Cat() {', 'Cat = "Tom";']), codeOptions: true },
      { q: t('Inside a class, what does self (Python) or this (JavaScript) mean?', 'Ndani ya class, self (Python) au this (JavaScript) inamaanisha nini?'), correct: t('The particular object that is using the method', 'Object hasa inayotumia method hiyo'), wrong: [t('The whole program', 'Programu nzima'), t('The computer itself', 'Kompyuta yenyewe'), t('The first class ever made', 'Class ya kwanza kabisa kutengenezwa')] },
    ],
    understand: [
      { code: L('class Dog:\n    def __init__(self, name):\n        self.name = name\n\n    def bark(self):\n        print(self.name + " says Woof!")\n\nrex = Dog("Rex")\nrex.bark()', 'class Dog {\n  constructor(name) {\n    this.name = name;\n  }\n  bark() {\n    console.log(this.name + " says Woof!");\n  }\n}\nconst rex = new Dog("Rex");\nrex.bark();'), correct: t('Makes a Dog object called Rex, which prints "Rex says Woof!"', 'Inatengeneza object ya Dog inayoitwa Rex, inayoonyesha "Rex says Woof!"'), wrong: [t('Prints Dog', 'Inaonyesha Dog'), t('Makes two dogs', 'Inatengeneza mbwa wawili'), t('Prints Woof! three times', 'Inaonyesha Woof! mara tatu')] },
      { code: L('class Counter:\n    def __init__(self):\n        self.count = 0\n\n    def add(self):\n        self.count = self.count + 1\n\nc = Counter()\nc.add()\nc.add()\nprint(c.count)', 'class Counter {\n  constructor() {\n    this.count = 0;\n  }\n  add() {\n    this.count = this.count + 1;\n  }\n}\nconst c = new Counter();\nc.add();\nc.add();\nconsole.log(c.count);'), correct: t('Makes a counter, adds 1 twice and prints 2', 'Inatengeneza kihesabu, inaongeza 1 mara mbili na kuonyesha 2'), wrong: [t('Prints 0', 'Inaonyesha 0'), t('Prints 1', 'Inaonyesha 1'), t('Makes two counters', 'Inatengeneza vihesabu viwili')] },
      { code: L('class Student:\n    def __init__(self, name, grade):\n        self.name = name\n        self.grade = grade\n\na = Student("Amina", 6)\nb = Student("Juma", 7)\nprint(b.name)', 'class Student {\n  constructor(name, grade) {\n    this.name = name;\n    this.grade = grade;\n  }\n}\nconst a = new Student("Amina", 6);\nconst b = new Student("Juma", 7);\nconsole.log(b.name);'), correct: t('Makes two Student objects, each with its own data, and prints Juma', 'Inatengeneza objects mbili za Student, kila moja na data yake, na kuonyesha Juma'), wrong: [t('Prints Amina', 'Inaonyesha Amina'), t('Prints 7', 'Inaonyesha 7'), t('Makes one student called Amina Juma', 'Inatengeneza mwanafunzi mmoja anayeitwa Amina Juma')] },
    ],
    apply: [
      { prompt: t('Make a Bird object called kasuku with the name "Kasuku", then call its sing() method.', 'Tengeneza object ya Bird inayoitwa kasuku yenye jina "Kasuku", kisha uite method yake sing().'), starter: L('class Bird:\n    def __init__(self, name):\n        self.name = name\n\n    def sing(self):\n        print(self.name + " sings!")\n\n', 'class Bird {\n  constructor(name) {\n    this.name = name;\n  }\n  sing() {\n    console.log(this.name + " sings!");\n  }\n}\n\n'),
        patterns: L([/kasuku\s*=\s*Bird\s*\(\s*["']Kasuku["']\s*\)/, /kasuku\.sing\s*\(\s*\)/], [/kasuku\s*=\s*new\s+Bird\s*\(\s*["']Kasuku["']\s*\)/, /kasuku\.sing\s*\(\s*\)/]),
        start: L('kasuku = Bird(', 'const kasuku = new Bird('), solution: L('class Bird:\n    def __init__(self, name):\n        self.name = name\n\n    def sing(self):\n        print(self.name + " sings!")\n\nkasuku = Bird("Kasuku")\nkasuku.sing()', 'class Bird {\n  constructor(name) {\n    this.name = name;\n  }\n  sing() {\n    console.log(this.name + " sings!");\n  }\n}\n\nconst kasuku = new Bird("Kasuku");\nkasuku.sing();') },
      { prompt: L(t('Write a class called Car whose __init__ takes a colour and stores it in self.colour.', 'Andika class inayoitwa Car ambayo __init__ yake inapokea colour na kuihifadhi katika self.colour.'), t('Write a class called Car whose constructor takes a colour and stores it in this.colour.', 'Andika class inayoitwa Car ambayo constructor yake inapokea colour na kuihifadhi katika this.colour.')),
        patterns: L([/class\s+Car\b/, /def\s+__init__\s*\(\s*self\s*,\s*colou?r/, /self\.colou?r\s*=\s*colou?r/], [/class\s+Car\b/, /constructor\s*\(\s*colou?r/, /this\.colou?r\s*=\s*colou?r/]),
        start: L('class Car:', 'class Car {'), solution: L('class Car:\n    def __init__(self, colour):\n        self.colour = colour', 'class Car {\n  constructor(colour) {\n    this.colour = colour;\n  }\n}') },
      { prompt: t('Add a method called greet that prints "Hello, I am " followed by the robot\'s name.', 'Ongeza method inayoitwa greet inayoonyesha "Hello, I am " ikifuatwa na jina la roboti.'), starter: L('class Robot:\n    def __init__(self, name):\n        self.name = name\n\n    # add greet here\n', 'class Robot {\n  constructor(name) {\n    this.name = name;\n  }\n  // add greet here\n}\n'),
        patterns: L([/def\s+greet\s*\(\s*self\s*\)/, /print\s*\([^\n]*self\.name/], [/greet\s*\(\s*\)\s*\{/, /console\.log\s*\([^\n]*this\.name/]),
        start: L('def greet(self):', 'greet() {'), solution: L('class Robot:\n    def __init__(self, name):\n        self.name = name\n\n    def greet(self):\n        print("Hello, I am " + self.name)', 'class Robot {\n  constructor(name) {\n    this.name = name;\n  }\n  greet() {\n    console.log("Hello, I am " + this.name);\n  }\n}') },
    ],
    analyze: [
      { code: L('class Box:\n    def __init__(self, size):\n        self.size = size\n\na = Box(3)\nb = Box(5)\na.size = a.size + b.size\nprint(a.size)', 'class Box {\n  constructor(size) {\n    this.size = size;\n  }\n}\nconst a = new Box(3);\nconst b = new Box(5);\na.size = a.size + b.size;\nconsole.log(a.size);'), q: t('What will this print?', 'Hii itaonyesha nini?'), correct: '8', wrong: ['3', '5', '35'] },
      { code: L('class Lamp:\n    def __init__(self):\n        self.on = False\n\n    def switch(self):\n        self.on = not self.on\n\nlamp = Lamp()\nlamp.switch()\nlamp.switch()\nlamp.switch()\nprint(lamp.on)', 'class Lamp {\n  constructor() {\n    this.on = false;\n  }\n  switch() {\n    this.on = !this.on;\n  }\n}\nconst lamp = new Lamp();\nlamp.switch();\nlamp.switch();\nlamp.switch();\nconsole.log(lamp.on);'), q: t('What will this print?', 'Hii itaonyesha nini?'), correct: L('True', 'true'), wrong: L(['False', '3', 'None'], ['false', '3', '0']) },
      { code: L('class Wallet:\n    def __init__(self):\n        self.money = 100\n\n    def spend(self, amount):\n        self.money = self.money - amount\n\nw = Wallet()\nw.spend(30)\nw.spend(20)\nprint(w.money)', 'class Wallet {\n  constructor() {\n    this.money = 100;\n  }\n  spend(amount) {\n    this.money = this.money - amount;\n  }\n}\nconst w = new Wallet();\nw.spend(30);\nw.spend(20);\nconsole.log(w.money);'), q: t('What will this print?', 'Hii itaonyesha nini?'), correct: '50', wrong: ['100', '70', '150'] },
    ],
    evaluate: [
      { lines: L(['class Cat:', '    def __init__(self, name):', '        name = name', '    def meow(self):', '        print(self.name + " says meow")'], ['class Cat {', '  constructor(name) {', '    name = name;', '  }', '  meow() {', '    console.log(this.name + " says meow");', '  }', '}']), bug: 3,
        why: L(t('It must store the name on the object: self.name = name. Otherwise self.name does not exist.', 'Lazima ihifadhi jina kwenye object: self.name = name. La sivyo self.name haipo.'), t('It must store the name on the object: this.name = name. Otherwise this.name is undefined.', 'Lazima ihifadhi jina kwenye object: this.name = name. La sivyo this.name ni undefined.')), what: t('make cats that can say their own name', 'kutengeneza paka wanaoweza kusema majina yao') },
      { lines: L(['class Dog:', '    def bark(self):', '        print("Woof!")', 'rex = Dog', 'rex.bark()'], ['class Dog {', '  bark() {', '    console.log("Woof!");', '  }', '}', 'const rex = Dog();', 'rex.bark();']), bug: L(4, 6),
        why: L(t('To make an object you must CALL the class with brackets: Dog().', 'Kutengeneza object lazima UITE class kwa mabano: Dog().'), t('In JavaScript you need the word new to make an object: new Dog().', 'Katika JavaScript unahitaji neno new kutengeneza object: new Dog().')), what: t('make a dog object and make it bark', 'kutengeneza object ya mbwa na kuifanya ibweke') },
      { lines: L(['class Score:', '    def __init__(self):', '        self.points = 0', '    def add(self):', '        self.points + 1'], ['class Score {', '  constructor() {', '    this.points = 0;', '  }', '  add() {', '    this.points + 1;', '  }', '}']), bug: L(5, 6),
        why: t('It works out points + 1 but never saves it. It should be points = points + 1 (on self / this).', 'Inakokotoa points + 1 lakini haihifadhi kamwe. Inapaswa kuwa points = points + 1 (kwenye self / this).'), what: t('add 1 point every time add() is called', 'kuongeza pointi 1 kila mara add() inapoitwa') },
    ],
  },

  teamwork: {
    remember: [
      { q: t('What is a commit?', 'Commit ni nini?'), correct: t('A saved snapshot of your code, with a message saying what changed', 'Picha iliyohifadhiwa ya msimbo wako, pamoja na ujumbe unaosema kilichobadilika'), wrong: [t('A promise to finish homework', 'Ahadi ya kumaliza kazi ya nyumbani'), t('Deleting old code', 'Kufuta msimbo wa zamani'), t('A type of loop', 'Aina ya kitanzi')] },
      { q: t('What is a branch for?', 'Branch ni ya nini?'), correct: t('Working on a new idea safely without breaking the main code', 'Kufanyia kazi wazo jipya kwa usalama bila kuvunja msimbo mkuu'), wrong: [t('Growing a tree inside the computer', 'Kukuza mti ndani ya kompyuta'), t('Making the code run faster', 'Kufanya msimbo uende kwa kasi'), t('Hiding code from your team', 'Kuficha msimbo kutoka kwa timu yako')] },
      { q: t('What is code review?', 'Ukaguzi wa msimbo (code review) ni nini?'), correct: t('A teammate reads your code and kindly suggests improvements before it is added', 'Mwenzako anasoma msimbo wako na kupendekeza maboresho kwa upole kabla haujaongezwa'), wrong: [t('A test the computer marks', 'Mtihani unaosahihishwa na kompyuta'), t('Reading code out loud alone', 'Kusoma msimbo kwa sauti peke yako'), t('Printing code on paper', 'Kuchapisha msimbo kwenye karatasi')] },
      { q: t('Which is the BEST commit message?', 'Ujumbe upi wa commit ni BORA ZAIDI?'), correct: '"Fix total not counting the last item"', wrong: ['"stuff"', '"changes"', '"aaaa"'], codeOptions: true },
    ],
    understand: [
      { code: 'git checkout -b add-high-scores\n# ...write the code...\ngit commit -m "Add high score table"', correct: t('Makes a new branch, then saves the work with a clear message', 'Inatengeneza branch mpya, kisha inahifadhi kazi kwa ujumbe wazi'), wrong: [t('Deletes the high scores', 'Inafuta alama za juu'), t('Sends the code to a printer', 'Inatuma msimbo kwa printa'), t('Starts the game', 'Inaanzisha mchezo')] },
      { code: 'Review comment on line 12:\n"Nice work! Could we call this variable\ntotal_price instead of x? It is easier to understand."', correct: t('A kind review suggesting a clearer variable name', 'Ukaguzi wa upole unaopendekeza jina wazi zaidi la kigeu'), wrong: [t('An error message from the computer', 'Ujumbe wa kosa kutoka kwa kompyuta'), t('A command that renames the variable by itself', 'Amri inayobadilisha jina la kigeu yenyewe'), t('A commit message', 'Ujumbe wa commit')] },
      { code: 'git log --oneline\n\n3f2a1c Add sound when you win\n9b7e44 Fix player falling through the floor\n1c0d9a Start the game project', correct: t('A history of saved changes, newest at the top', 'Historia ya mabadiliko yaliyohifadhiwa, mapya zaidi juu'), wrong: [t('Three bugs in the game', 'Bugs tatu kwenye mchezo'), t('Three branches', 'Branches tatu'), t('A list of players', 'Orodha ya wachezaji')] },
    ],
    apply: [
      { prompt: t('You fixed a bug where the score did not add bonus points. Write the git commit command with a clear message.', 'Umerekebisha bug ambapo alama haikuongeza pointi za ziada. Andika amri ya git commit yenye ujumbe wazi.'),
        patterns: [/git\s+commit\s+-m\s+["'][^"'\n]{12,}["']/, /(fix|bonus|score|rekebish|alama|pointi)/],
        start: 'git commit -m "', solution: 'git commit -m "Fix score not adding bonus points"' },
      { prompt: t('Write the git command that makes a new branch called add-sound and moves onto it.', 'Andika amri ya git inayotengeneza branch mpya inayoitwa add-sound na kuhamia humo.'),
        patterns: [/git\s+(checkout\s+-b|switch\s+-c)\s+add-sound\b/],
        start: 'git checkout -b', solution: 'git checkout -b add-sound' },
      { prompt: t('A teammate stored a price in a variable called x. Write a kind, helpful review comment: start with something you like, then suggest a better name.', 'Mwenzako amehifadhi bei katika kigeu kinachoitwa x. Andika maoni ya ukaguzi ya upole na msaada: anza na kitu unachopenda, kisha pendekeza jina bora.'),
        patterns: [/\b(good|great|nice|like|love|well|cool|awesome|nzuri|safi|vizuri|hongera|napenda|poa)/, /(price|bei|name|jina|rename|clear|wazi|call|ita)/],
        start: 'Nice work! Could we', solution: 'Nice work! Could we rename x to price? Then everyone knows what it stores.' },
    ],
    analyze: [
      { q: t('You make 3 commits on your branch and then merge it into main. How many of your new commits does main now have?', 'Unafanya commits 3 kwenye branch yako kisha unaiunganisha (merge) na main. Main sasa ina commits zako mpya ngapi?'), correct: '3', wrong: ['1', '0', '6'] },
      { q: t('Two teammates both change line 5 of the same file in different ways. What happens when they merge?', 'Wenzako wawili wanabadilisha mstari 5 wa faili moja kwa njia tofauti. Nini kinatokea wanapounganisha (merge)?'), correct: t('A merge conflict: a person must choose which change to keep', 'Mgongano (merge conflict): mtu lazima achague badiliko la kubaki'), wrong: [t('The computer picks one at random', 'Kompyuta inachagua moja kwa bahati'), t('Both lines are deleted', 'Mistari yote miwili inafutwa'), t('Nothing - it is always fine', 'Hakuna - daima iko sawa')] },
      { code: 'git log --oneline\n\nd41e0b Make the cat jump higher\n7a3b22 Add a cat sprite\n02c9f1 Create the game', q: t('Which commit was made FIRST?', 'Commit ipi ilifanywa KWANZA?'), correct: 'Create the game', wrong: ['Make the cat jump higher', 'Add a cat sprite', t('They were all made at the same time', 'Zote zilifanywa wakati mmoja')] },
      { q: t('Your newest commit broke the game. What does Git let you do?', 'Commit yako mpya zaidi imeharibu mchezo. Git inakuruhusu kufanya nini?'), correct: t('Go back to an earlier commit that worked', 'Kurudi kwenye commit ya awali iliyofanya kazi'), wrong: [t('Nothing - the old code is gone forever', 'Hakuna - msimbo wa zamani umepotea milele'), t('Only delete the whole project', 'Kufuta mradi wote tu'), t('Ask the computer to guess the fix', 'Kuiomba kompyuta ibahatishe marekebisho')] },
    ],
    evaluate: [
      { lines: ['git checkout -b fix-score', '# fix the score in the game file', 'git commit -m "x"', 'git push'], bug: 3,
        why: t('The message "x" tells teammates nothing. Say what changed, like "Fix score not adding bonus points".', 'Ujumbe "x" hauwaambii wenzako chochote. Sema kilichobadilika, kama "Fix score not adding bonus points".'), what: t('fix a bug on a branch and share it with the team', 'kurekebisha bug kwenye branch na kuishiriki na timu') },
      { lines: ['git checkout main', '# write a risky new feature directly here', 'git commit -m "Add jumping"', 'git push'], bug: 2,
        why: t('Risky work should happen on a new branch, not directly on main, so the working game never breaks.', 'Kazi yenye hatari inapaswa kufanywa kwenye branch mpya, si moja kwa moja kwenye main, ili mchezo unaofanya kazi usiharibike.'), what: t('add a new feature safely', 'kuongeza kipengele kipya kwa usalama') },
      { lines: ['Review: "Line 4 has a small bug - total starts at 1."', 'Review: "This is rubbish code."', 'Review: "Nice clear variable names!"', 'Review: "Maybe add a test for 0?"'], bug: 2,
        why: t('Reviews must be kind and helpful: say what to change and why - never insult the person.', 'Ukaguzi lazima uwe wa upole na msaada: sema kibadilishwe nini na kwa nini - usimtukane mtu kamwe.'), what: t('give a teammate kind, useful code review comments', 'kumpa mwenzako maoni ya ukaguzi ya upole na yenye manufaa') },
    ],
  },

  safe_coding: {
    remember: [
      { q: t('Where should a secret password NEVER be written?', 'Nenosiri la siri lisiandikwe WAPI kamwe?'), correct: t('Inside your code, where other people can read it', 'Ndani ya msimbo wako, ambapo watu wengine wanaweza kulisoma'), wrong: [t('Nowhere - passwords are fine anywhere', 'Popote - nenosiri ni sawa mahali popote'), t('In your memory', 'Kichwani mwako'), t('In a password manager', 'Katika kidhibiti cha manenosiri')] },
      { q: t('What is input validation?', 'Input validation ni nini?'), correct: t('Checking that what a user types is sensible before using it', 'Kukagua kwamba anachoandika mtumiaji kina maana kabla ya kukitumia'), wrong: [t('Typing faster', 'Kuandika kwa kasi'), t('Saving every input forever', 'Kuhifadhi kila pembejeo milele'), t('Letting any input in', 'Kuruhusu pembejeo yoyote')] },
      { q: t('Which is the strongest password?', 'Nenosiri lipi lina nguvu zaidi?'), correct: 'Twiga!Jumps7Over-Mlima', wrong: ['123456', 'password', 'amina2015'], codeOptions: true },
      { q: t('An app only needs a nickname to work. What personal information should it collect?', 'Programu inahitaji jina la utani tu ili kufanya kazi. Inapaswa kukusanya taarifa gani binafsi?'), correct: t('Only the nickname', 'Jina la utani tu'), wrong: [t('Name, home address and school', 'Jina, anwani ya nyumbani na shule'), t('Your parents\' phone numbers', 'Namba za simu za wazazi wako'), t('Everything, just in case', 'Kila kitu, ikiwezekana')] },
    ],
    understand: [
      { code: L('age = int(input("Age: "))\nif age < 0 or age > 120:\n    print("That age does not look right")', 'const age = Number(prompt("Age:"));\nif (age < 0 || age > 120) {\n  console.log("That age does not look right");\n}'), correct: t('Checks the age is sensible before using it (input validation)', 'Inakagua umri una maana kabla ya kuutumia (input validation)'), wrong: [t('Prints every age', 'Inaonyesha kila umri'), t('Sends the age to the internet', 'Inatuma umri kwenye intaneti'), t('Makes the user older', 'Inamfanya mtumiaji kuwa mzee zaidi')] },
      { code: L('API_KEY = "sk-12345-SECRET"\nprint("Starting app")', 'const API_KEY = "sk-12345-SECRET";\nconsole.log("Starting app");'), correct: t('It works, but the secret key is written in the code where anyone can read it - unsafe!', 'Inafanya kazi, lakini ufunguo wa siri umeandikwa kwenye msimbo ambapo yeyote anaweza kuusoma - si salama!'), wrong: [t('It is perfectly safe', 'Ni salama kabisa'), t('It prints the key', 'Inaonyesha ufunguo'), t('It deletes the key', 'Inafuta ufunguo')] },
      { code: L('print("Welcome, " + username)\n# never: print(password)', 'console.log("Welcome, " + username);\n// never: console.log(password);'), correct: t('Shows the username but keeps the password private', 'Inaonyesha jina la mtumiaji lakini inaweka nenosiri siri'), wrong: [t('Prints the password', 'Inaonyesha nenosiri'), t('Deletes the username', 'Inafuta jina la mtumiaji'), t('Asks for a password', 'Inaomba nenosiri')] },
    ],
    apply: [
      { prompt: t('Write a check: if the password is shorter than 8 characters, print "Too short".', 'Andika ukaguzi: nenosiri likiwa fupi kuliko herufi 8, onyesha "Too short".'), starter: L('password = "jambo"\n', 'const password = "jambo";\n'),
        patterns: L([/if\s+len\s*\(\s*password\s*\)\s*<\s*8/, /print\s*\(\s*["']Too short/], [/if\s*\(\s*password\.length\s*<\s*8/, /console\.log\s*\(\s*["']Too short/]),
        start: L('if len(password) < 8:', 'if (password.length < 8) {'), solution: L('password = "jambo"\nif len(password) < 8:\n    print("Too short")', 'const password = "jambo";\nif (password.length < 8) {\n  console.log("Too short");\n}') },
      { prompt: t('Check the age is between 5 and 18 before letting someone join the kids club. Otherwise print "Sorry, this club is for ages 5 to 18".', 'Kagua umri uko kati ya 5 na 18 kabla ya kumruhusu mtu kujiunga na klabu ya watoto. La sivyo onyesha "Sorry, this club is for ages 5 to 18".'), starter: L('age = 25\n', 'const age = 25;\n'),
        patterns: L([/\bif\b/, /\bage\s*[<>]=?\s*5\b|\b5\s*[<>]=?\s*age\b/, /\bage\s*[<>]=?\s*18\b|\b18\s*[<>]=?\s*age\b/, /print\s*\(/], [/\bif\s*\(/, /\bage\s*[<>]=?\s*5\b|\b5\s*[<>]=?\s*age\b/, /\bage\s*[<>]=?\s*18\b|\b18\s*[<>]=?\s*age\b/, /console\.log\s*\(/]),
        start: L('if 5 <= age <= 18:', 'if (age >= 5 && age <= 18) {'), solution: L('age = 25\nif 5 <= age <= 18:\n    print("Welcome!")\nelse:\n    print("Sorry, this club is for ages 5 to 18")', 'const age = 25;\nif (age >= 5 && age <= 18) {\n  console.log("Welcome!");\n} else {\n  console.log("Sorry, this club is for ages 5 to 18");\n}') },
      { prompt: t('The secret key is written in the code! Change it so the key is read from a safe setting (an environment variable) instead.', 'Ufunguo wa siri umeandikwa kwenye msimbo! Ubadilishe ili ufunguo usomwe kutoka mpangilio salama (environment variable) badala yake.'), starter: L('import os\nAPI_KEY = "sk-12345-SECRET"\n', 'const API_KEY = "sk-12345-SECRET";\n'),
        patterns: L([/API_KEY\s*=\s*os\.(environ|getenv)/, /^(?![\s\S]*sk-12345)/], [/API_KEY\s*=\s*process\.env/, /^(?![\s\S]*sk-12345)/]),
        start: L('API_KEY = os.environ.get(', 'const API_KEY = process.env.'), solution: L('import os\nAPI_KEY = os.environ.get("API_KEY")', 'const API_KEY = process.env.API_KEY;') },
    ],
    analyze: [
      { q: t('A "type your age" box gets these answers. Which one should it REJECT?', 'Kisanduku cha "andika umri wako" kinapata majibu haya. Kipi kinapaswa KUKATALIWA?'), correct: '-5', wrong: ['9', '12', '15'] },
      { code: L('pin = "4321"\nguess = "1234"\nif guess == pin:\n    print("Unlocked")\nelse:\n    print("Wrong PIN")', 'const pin = "4321";\nconst guess = "1234";\nif (guess === pin) {\n  console.log("Unlocked");\n} else {\n  console.log("Wrong PIN");\n}'), q: t('What will this print?', 'Hii itaonyesha nini?'), correct: 'Wrong PIN', wrong: ['Unlocked', '4321', t('Nothing', 'Hakuna kitu')] },
      { code: L('name = "  Amina  "\nclean = name.strip()\nprint("[" + clean + "]")', 'const name = "  Amina  ";\nconst clean = name.trim();\nconsole.log("[" + clean + "]");'), q: t('Cleaning input: what will this print?', 'Kusafisha pembejeo: hii itaonyesha nini?'), correct: '[Amina]', wrong: ['[  Amina  ]', 'Amina', '[ Amina ]'] },
      { q: t('A game asks "What is your home address?" just to let you play. Is that safe?', 'Mchezo unauliza "Anwani yako ya nyumbani ni ipi?" ili tu kukuruhusu kucheza. Je, ni salama?'), correct: t('No - a game does not need your address, so it should not ask', 'Hapana - mchezo hauhitaji anwani yako, kwa hiyo haupaswi kuuliza'), wrong: [t('Yes, games always need addresses', 'Ndiyo, michezo daima inahitaji anwani'), t('Yes, if the game is fun', 'Ndiyo, kama mchezo unafurahisha'), t('Only on weekends', 'Wikendi tu')] },
    ],
    evaluate: [
      { lines: L(['username = input("Name: ")', 'password = input("Password: ")', 'print("Hi " + username)', 'print("Your password is " + password)'], ['const username = prompt("Name:");', 'const password = prompt("Password:");', 'console.log("Hi " + username);', 'console.log("Your password is " + password);']), bug: 4,
        why: t('Never show a password on the screen - someone could be watching.', 'Usionyeshe kamwe nenosiri kwenye skrini - mtu anaweza kuwa anaangalia.'), what: t('log a user in safely', 'kumwingiza mtumiaji kwa usalama') },
      { lines: L(['DB_PASSWORD = "kenya2024"', 'def connect():', '    print("Connecting...")', 'connect()'], ['const DB_PASSWORD = "kenya2024";', 'function connect() {', '  console.log("Connecting...");', '}', 'connect();']), bug: 1,
        why: t('Secrets must not be written in code. Read them from a safe setting like an environment variable.', 'Siri hazipaswi kuandikwa kwenye msimbo. Zisome kutoka mpangilio salama kama environment variable.'), what: t('connect to a database safely', 'kuunganisha na hifadhidata kwa usalama') },
      { lines: L(['age = int(input("Age: "))', 'if age > 0:', '    print("Welcome to the kids club!")', 'print("Bye")'], ['const age = Number(prompt("Age:"));', 'if (age > 0) {', '  console.log("Welcome to the kids club!");', '}']), bug: 2,
        why: t('This lets in age 99 or 500! Check both ends: age 5 to 18.', 'Hii inaruhusu umri 99 au 500! Kagua pande zote mbili: umri 5 hadi 18.'), what: t('only let children aged 5 to 18 into the kids club', 'kuwaruhusu tu watoto wa miaka 5 hadi 18 kujiunga na klabu ya watoto') },
    ],
  },

  data_apis: {
    remember: [
      { q: t('What is JSON?', 'JSON ni nini?'), correct: t('A text format for sharing data, made of lists and labelled values', 'Muundo wa maandishi wa kushiriki data, uliotengenezwa kwa orodha na thamani zenye lebo'), wrong: [t('A person called Jason', 'Mtu anayeitwa Jason'), t('A type of virus', 'Aina ya virusi'), t('A drawing program', 'Programu ya kuchora')] },
      { q: t('What is an API?', 'API ni nini?'), correct: t('A way for a program to ask another program or website for data', 'Njia ya programu kuomba data kutoka programu nyingine au tovuti'), wrong: [t('A kind of apple', 'Aina ya tufaha'), t('A broken program', 'Programu iliyoharibika'), t('A keyboard shortcut', 'Njia ya mkato ya kibodi')] },
      { q: t('Which line turns JSON text into data your program can use?', 'Mstari upi unageuza maandishi ya JSON kuwa data ambayo programu yako inaweza kutumia?'), correct: L('data = json.loads(text)', 'const data = JSON.parse(text);'), wrong: L(['data = text.upper()', 'data = print(text)', 'data = len(text)'], ['const data = text.toUpperCase();', 'const data = console.log(text);', 'const data = text.length;']), codeOptions: true },
      { q: t('Before showing data from the internet, a careful coder should...', 'Kabla ya kuonyesha data kutoka intaneti, mwandishi makini anapaswa...'), correct: t('Check it arrived and has the keys they need', 'Kuhakikisha imefika na ina keys anazohitaji'), wrong: [t('Trust it completely', 'Kuiamini kabisa'), t('Delete it', 'Kuifuta'), t('Print every secret in it', 'Kuonyesha kila siri ndani yake')] },
    ],
    understand: [
      { code: '{\n  "name": "Kenya",\n  "capital": "Nairobi",\n  "counties": 47\n}', correct: t('JSON data about Kenya with three labelled values', 'Data ya JSON kuhusu Kenya yenye thamani tatu zenye lebo'), wrong: [t('A program that prints Kenya', 'Programu inayoonyesha Kenya'), t('A list of 47 names', 'Orodha ya majina 47'), t('A web page', 'Ukurasa wa wavuti')] },
      { code: L('import json\nreply = \'{"temp": 24, "rain": true}\'\ndata = json.loads(reply)\nif data["rain"]:\n    print("Take an umbrella!")', 'const reply = \'{"temp": 24, "rain": true}\';\nconst data = JSON.parse(reply);\nif (data.rain) {\n  console.log("Take an umbrella!");\n}'), correct: t('Reads weather data and prints a reminder if it will rain', 'Inasoma data ya hali ya hewa na kuonyesha ukumbusho kama mvua itanyesha'), wrong: [t('Makes it rain', 'Inaleta mvua'), t('Prints 24 umbrellas', 'Inaonyesha miavuli 24'), t('Sends the weather to the internet', 'Inatuma hali ya hewa kwenye intaneti')] },
      { code: '[\n  {"name": "Amina", "points": 30},\n  {"name": "Juma", "points": 45}\n]', correct: t('A JSON list of two players, each with a name and points', 'Orodha ya JSON ya wachezaji wawili, kila mmoja na jina na pointi'), wrong: [t('One player called Amina Juma', 'Mchezaji mmoja anayeitwa Amina Juma'), t('Just two numbers', 'Namba mbili tu'), t('A program that adds points', 'Programu inayojumlisha pointi')] },
    ],
    apply: [
      { prompt: t('Turn the JSON text into data, then print the city.', 'Geuza maandishi ya JSON kuwa data, kisha onyesha mji.'), starter: L('import json\ntext = \'{"city": "Eldoret", "altitude": 2100}\'\n', 'const text = \'{"city": "Eldoret", "altitude": 2100}\';\n'),
        patterns: L([/json\.loads\s*\(\s*text\s*\)/, /\[\s*["']city["']\s*\]/], [/JSON\.parse\s*\(\s*text\s*\)/, /(\.city\b|\[\s*["']city["']\s*\])/]),
        start: L('data = json.loads(text)', 'const data = JSON.parse(text);'), solution: L('import json\ntext = \'{"city": "Eldoret", "altitude": 2100}\'\ndata = json.loads(text)\nprint(data["city"])', 'const text = \'{"city": "Eldoret", "altitude": 2100}\';\nconst data = JSON.parse(text);\nconsole.log(data.city);') },
      { prompt: t('Print the name of the SECOND player in the list.', 'Onyesha jina la mchezaji wa PILI kwenye orodha.'), starter: L('players = [\n    {"name": "Amina", "points": 30},\n    {"name": "Juma", "points": 45}\n]\n', 'const players = [\n  { name: "Amina", points: 30 },\n  { name: "Juma", points: 45 }\n];\n'),
        patterns: L([/players\s*\[\s*1\s*\]\s*\[\s*["']name["']\s*\]/], [/players\s*\[\s*1\s*\]\s*(\.name\b|\[\s*["']name["']\s*\])/]),
        start: L('print(players[1]', 'console.log(players[1]'), solution: L('players = [\n    {"name": "Amina", "points": 30},\n    {"name": "Juma", "points": 45}\n]\nprint(players[1]["name"])', 'const players = [\n  { name: "Amina", points: 30 },\n  { name: "Juma", points: 45 }\n];\nconsole.log(players[1].name);') },
      { prompt: t('Turn the pet data into JSON text and print it.', 'Geuza data ya mnyama kipenzi kuwa maandishi ya JSON na uyaonyeshe.'), starter: L('import json\npet = {"name": "Simba", "age": 3}\n', 'const pet = { name: "Simba", age: 3 };\n'),
        patterns: L([/json\.dumps\s*\(\s*pet\s*\)/], [/JSON\.stringify\s*\(\s*pet\s*\)/]),
        start: L('print(json.dumps(', 'console.log(JSON.stringify('), solution: L('import json\npet = {"name": "Simba", "age": 3}\nprint(json.dumps(pet))', 'const pet = { name: "Simba", age: 3 };\nconsole.log(JSON.stringify(pet));') },
    ],
    analyze: [
      { code: '{"team": "Harambee Stars", "goals": [2, 0, 3]}', q: t('How many goals were scored in the third game?', 'Magoli mangapi yalifungwa katika mchezo wa tatu?'), correct: '3', wrong: ['2', '0', '5'] },
      { code: L('data = {"weather": {"city": "Nakuru", "temp": 22}}\nprint(data["weather"]["temp"])', 'const data = { weather: { city: "Nakuru", temp: 22 } };\nconsole.log(data.weather.temp);'), q: t('What will this print?', 'Hii itaonyesha nini?'), correct: '22', wrong: ['Nakuru', 'weather', 'temp'] },
      { code: L('players = [{"name": "Amina", "pts": 30}, {"name": "Juma", "pts": 45}]\ntotal = 0\nfor p in players:\n    total = total + p["pts"]\nprint(total)', 'const players = [{ name: "Amina", pts: 30 }, { name: "Juma", pts: 45 }];\nlet total = 0;\nfor (const p of players) {\n  total = total + p.pts;\n}\nconsole.log(total);'), q: t('What will this print?', 'Hii itaonyesha nini?'), correct: '75', wrong: ['30', '45', '3045'] },
      { code: '[\n  {"animal": "lion", "count": 12},\n  {"animal": "zebra", "count": 40},\n  {"animal": "rhino", "count": 3}\n]', q: t('Park data from an API: which animal has the biggest count?', 'Data ya mbuga kutoka API: mnyama yupi ana idadi kubwa zaidi?'), correct: 'zebra', wrong: ['lion', 'rhino', t('They are all equal', 'Wote ni sawa')] },
    ],
    evaluate: [
      { lines: ['{', '  "name": "Kenya",', '  "capital": "Nairobi"', '  "counties": 47', '}'], bug: 3,
        why: t('Every value except the last must be followed by a comma: "Nairobi",', 'Kila thamani isipokuwa ya mwisho lazima ifuatwe na koma: "Nairobi",'), what: t('describe Kenya as JSON', 'kuielezea Kenya kama JSON') },
      { lines: L(['import json', 'text = \'{"city": "Kisumu"}\'', 'data = json.loads(text)', 'print(data["town"])'], ['const text = \'{"city": "Kisumu"}\';', 'const data = JSON.parse(text);', 'console.log(data["town"]);', 'console.log("Done");']), bug: L(4, 3),
        why: t('The key in the data is "city", not "town".', 'Key ndani ya data ni "city", si "town".'), what: t('print the city from the data', 'kuonyesha mji kutoka kwenye data') },
      { lines: ['{', '  \'name\': \'Simba\',', '  "age": 3', '}'], bug: 2,
        why: t('JSON must use double quotes " " for keys and text, not single quotes.', 'JSON lazima itumie alama za nukuu mbili " " kwa keys na maandishi, si nukuu moja.'), what: t('describe a pet as JSON', 'kumwelezea mnyama kipenzi kama JSON') },
    ],
  },
};

module.exports = { PRO_CONCEPTS, PRO_BANK, PRO_PATTERNS, PRO_LANGUAGES };
