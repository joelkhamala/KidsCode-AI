'use strict';
/**
 * The life-long Coding Journey.
 *
 * Skills are grouped into named stages, from a newbie's first steps to professional
 * skills (debugging, testing, algorithms, classes, Git teamwork, safe coding, APIs).
 * A stage opens when the Coach unlocks one of its skills (its earlier skills reached
 * Apply), and it is complete when every thinking level of every skill in it is mastered.
 * Finishing a stage earns its rank title ("Loop Hero", "Bug Detective"...).
 *
 * After the last stage the journey never ends: Legend levels 1, 2, 3, ... Each Legend
 * level needs LEGEND_WINS_PER_LEVEL more correct Legend challenges (mixed practice of
 * every skill at the top thinking levels - see legendChallenge in learnerModel.js).
 */
const { IDS: LEVEL_IDS } = require('./bloom');
const { BY_ID: CONCEPTS } = require('./concepts');
const { BY_ID: LANGS } = require('./languages');
const model = require('./learnerModel');

const t = (en, sw) => ({ en, sw });
const LEGEND_WINS_PER_LEVEL = 5;

const STAGES = [
  // Web pages (HTML & CSS)
  { id: 'page_builder', icon: '🌐', concepts: ['html_structure'], name: t('Page Builder', 'Mjenzi wa Kurasa'), rank: t('Page Builder', 'Mjenzi wa Kurasa'),
    about: t('Build web pages with headings, paragraphs, lists, pictures and links.', 'Jenga kurasa za wavuti zenye vichwa, aya, orodha, picha na viungo.') },
  { id: 'style_designer', icon: '🎨', concepts: ['css_styling'], name: t('Style Designer', 'Mbunifu wa Mitindo'), rank: t('Web Designer', 'Mbunifu wa Wavuti'),
    about: t('Paint your pages with colours, sizes and spacing using CSS.', 'Paka kurasa zako rangi, ukubwa na nafasi kwa kutumia CSS.') },
  // Programming: newbie -> pro
  { id: 'first_steps', icon: '🐣', concepts: ['sequence', 'output'], name: t('First Steps', 'Hatua za Kwanza'), rank: t('Newbie Coder', 'Mwanafunzi Mpya wa Msimbo'),
    about: t('Give the computer orders one step at a time, and make it talk.', 'Ipe kompyuta maagizo hatua moja moja, na uifanye izungumze.') },
  { id: 'memory_maths', icon: '📦', concepts: ['variables', 'arithmetic'], name: t('Memory & Maths', 'Kumbukumbu na Hesabu'), rank: t('Number Ninja', 'Bingwa wa Namba'),
    about: t('Teach the computer to remember things and do sums for you.', 'Ifundishe kompyuta kukumbuka vitu na kukufanyia hesabu.') },
  { id: 'smart_choices', icon: '🚦', concepts: ['conditionals'], name: t('Smart Choices', 'Maamuzi Mahiri'), rank: t('Decision Maker', 'Mfanya Maamuzi'),
    about: t('Make programs that choose what to do: if this, then that.', 'Tengeneza programu zinazochagua la kufanya: kama hiki, basi kile.') },
  { id: 'repeat_power', icon: '🔁', concepts: ['loops', 'while_loops'], name: t('Repeat Power', 'Nguvu ya Kurudia'), rank: t('Loop Hero', 'Shujaa wa Vitanzi'),
    about: t('Make the computer repeat work for you - 10 times or a million times.', 'Ifanye kompyuta ikurudie kazi - mara 10 au mara milioni.') },
  { id: 'collections', icon: '🧺', concepts: ['lists', 'strings'], name: t('Collections', 'Mikusanyiko'), rank: t('Collector', 'Mkusanyaji'),
    about: t('Keep many things in one list, and play with words and letters.', 'Weka vitu vingi kwenye orodha moja, na ucheze na maneno na herufi.') },
  { id: 'own_commands', icon: '🧩', concepts: ['functions', 'parameters_return'], name: t('Your Own Commands', 'Amri Zako Mwenyewe'), rank: t('Builder', 'Mjenzi'),
    about: t('Invent your own commands (functions) that take inputs and give answers.', 'Buni amri zako mwenyewe (functions) zinazopokea pembejeo na kutoa majibu.') },
  { id: 'organise_data', icon: '🗂️', concepts: ['dictionaries'], name: t('Organise Data', 'Panga Data'), rank: t('Data Organiser', 'Mpangaji wa Data'),
    about: t('Store information in labelled boxes and find it by name.', 'Hifadhi taarifa kwenye masanduku yenye lebo na uzipate kwa jina.') },
  { id: 'bug_hunting', icon: '🔍', concepts: ['debugging', 'testing'], name: t('Bug Hunting', 'Kuwinda Bugs'), rank: t('Bug Detective', 'Mpelelezi wa Bugs'),
    about: t('Find and fix mistakes like a detective, and write tests that catch bugs for you.', 'Tafuta na urekebishe makosa kama mpelelezi, na uandike tests zinazokukamatia bugs.') },
  { id: 'clever_recipes', icon: '🧠', concepts: ['searching_sorting', 'recursion'], name: t('Clever Recipes', 'Mapishi Mahiri'), rank: t('Algorithm Thinker', 'Mfikiriaji wa Algorithms'),
    about: t('Search, sort and solve big problems by breaking them into smaller ones.', 'Tafuta, panga na utatue matatizo makubwa kwa kuyagawa kuwa madogo.') },
  { id: 'blueprints', icon: '🏗️', concepts: ['classes_objects'], name: t('Blueprints', 'Ramani'), rank: t('Software Architect', 'Msanifu wa Programu'),
    about: t('Design your own kinds of things (classes) - pets, players, bank accounts.', 'Buni aina zako mwenyewe za vitu (classes) - wanyama, wachezaji, akaunti za benki.') },
  { id: 'team_work', icon: '🤝', concepts: ['teamwork'], name: t('Team Work', 'Kazi ya Timu'), rank: t('Team Coder', 'Mwandishi wa Timu'),
    about: t('Code with others like the pros: save versions with Git and review each other\'s code kindly.', 'Andika msimbo na wengine kama wataalamu: hifadhi matoleo kwa Git na mkague msimbo wa kila mmoja kwa upole.') },
  { id: 'safe_coding', icon: '🛡️', concepts: ['safe_coding'], name: t('Safe Coding', 'Msimbo Salama'), rank: t('Cyber Guardian', 'Mlinzi wa Mtandao'),
    about: t('Protect people: keep secrets out of code, check inputs and respect privacy.', 'Walinde watu: weka siri nje ya msimbo, kagua pembejeo na uheshimu faragha.') },
  { id: 'internet_data', icon: '🌍', concepts: ['data_apis'], name: t('Talk to the Internet', 'Ongea na Intaneti'), rank: t('Pro Developer', 'Msanidi Programu Mtaalamu'),
    about: t('Read real-world data (JSON) and ask other computers for it with APIs.', 'Soma data halisi (JSON) na uiombe kutoka kompyuta nyingine kwa kutumia APIs.') },
];

const NEWBIE = t('Newbie Coder', 'Mwanafunzi Mpya wa Msimbo');

/** Where to keep going when a language's stages run out. */
const NEXT_LANGUAGE = {
  blocks: 'python', scratch: 'python', html_css: 'javascript', java: 'python', c: 'python', cpp: 'python', csharp: 'python',
};

/**
 * @param {object[]} rows mastery rows for the learner (all languages)
 * @param {string} language
 * @param {string} loc 'en' | 'sw'
 * @param {number} legendWins correct Legend challenges in this language
 */
function buildJourney(rows, language, loc, legendWins = 0) {
  const lang = LANGS[language];
  const map = model.indexRows(rows, language);
  const tr = (o) => (o ? o[loc] || o.en : '');

  // Stars and stages, once earned, stay earned: one wrong answer later must not take away a
  // child's rank or Legend level. (The Coach still uses live mastery to choose reviews.)
  const earned = (row) => Boolean(row && (row.mastered_at || model.isMastered(row)));
  const skill = (cid) => {
    const rowsFor = map[cid] || {};
    const levels = LEVEL_IDS.map((lv) => earned(rowsFor[lv]));
    const masteredLevels = levels.filter(Boolean).length;
    const started = Object.values(rowsFor).some((r) => r.attempts > 0);
    return {
      id: cid, icon: CONCEPTS[cid].icon, name: tr(CONCEPTS[cid].name),
      unlocked: started || model.isUnlocked(map, cid, language), masteredLevels, totalLevels: LEVEL_IDS.length,
      percent: Math.round((100 * masteredLevels) / LEVEL_IDS.length), mastered: masteredLevels === LEVEL_IDS.length,
    };
  };

  const stages = STAGES
    .map((s) => ({ s, skills: s.concepts.filter((c) => lang.concepts.includes(c)).map(skill) }))
    .filter(({ skills }) => skills.length > 0)
    .map(({ s, skills }, index) => {
      const done = skills.every((k) => k.mastered);
      const open = skills.some((k) => k.unlocked);
      const cells = skills.reduce((n, k) => n + k.masteredLevels, 0);
      const total = skills.reduce((n, k) => n + k.totalLevels, 0);
      // What a locked stage is waiting for: the earlier skills its first skill builds on.
      const needs = open ? [] : [...new Set(skills.flatMap((k) => CONCEPTS[k.id].prereqs))]
        .filter((p) => lang.concepts.includes(p) && !skills.some((k) => k.id === p) && !model.reachedApply(map, p))
        .map((p) => ({ id: p, icon: CONCEPTS[p].icon, name: tr(CONCEPTS[p].name) }));
      return {
        id: s.id, number: index + 1, icon: s.icon, name: tr(s.name), rank: tr(s.rank), about: tr(s.about),
        state: done ? 'done' : open ? 'open' : 'locked',
        percent: Math.round((100 * cells) / total), skills, needs,
        pro: skills.every((k) => CONCEPTS[k.id].pro),
      };
    });

  const finished = stages.length > 0 && stages.every((s) => s.state === 'done');
  const doneStages = stages.filter((s) => s.state === 'done');
  const current = stages.find((s) => s.state === 'open') || null;
  const legendLevel = finished ? 1 + Math.floor(legendWins / LEGEND_WINS_PER_LEVEL) : 0;

  let rank = doneStages.length ? doneStages[doneStages.length - 1].rank : tr(NEWBIE);
  if (finished) rank = loc === 'sw' ? `Gwiji ${legendLevel}` : `Legend ${legendLevel}`;

  const nextLanguage = NEXT_LANGUAGE[language] && LANGS[NEXT_LANGUAGE[language]];
  return {
    language,
    rank,
    stagesDone: doneStages.length,
    totalStages: stages.length,
    currentStage: current ? current.id : null,
    stages,
    legend: {
      unlocked: finished,
      level: legendLevel,
      wins: legendWins,
      winsPerLevel: LEGEND_WINS_PER_LEVEL,
      winsToNext: finished ? LEGEND_WINS_PER_LEVEL - (legendWins % LEGEND_WINS_PER_LEVEL) : null,
    },
    // Blocks, Scratch, HTML & CSS and the other languages continue in Python or JavaScript,
    // where the pro stages (Bug Hunting, Clever Recipes, Blueprints...) are taught.
    nextLanguage: nextLanguage ? { id: nextLanguage.id, name: loc === 'sw' ? nextLanguage.nameSw : nextLanguage.name, icon: nextLanguage.icon } : null,
  };
}

module.exports = { STAGES, LEGEND_WINS_PER_LEVEL, buildJourney };
