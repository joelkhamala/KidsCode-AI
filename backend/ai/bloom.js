'use strict';
/**
 * Bloom's revised taxonomy (Anderson & Krathwohl, 2001), adapted for young coders.
 *
 * Learners climb the ladder for each concept: they must master a level before the
 * next one unlocks (known -> unknown). Each level maps to activity types that
 * genuinely exercise that kind of thinking.
 */

const LEVELS = [
  {
    id: 'remember', order: 1, icon: '🧠',
    name: { en: 'Remember', sw: 'Kumbuka' },
    kidGoal: { en: 'I can spot it', sw: 'Naweza kuitambua' },
    verbs: ['recall', 'recognise', 'name', 'identify'],
    activityTypes: ['mcq'],
  },
  {
    id: 'understand', order: 2, icon: '💡',
    name: { en: 'Understand', sw: 'Elewa' },
    kidGoal: { en: 'I can explain what it does', sw: 'Naweza kueleza inachofanya' },
    verbs: ['explain', 'describe', 'summarise', 'classify'],
    activityTypes: ['mcq'],
  },
  {
    id: 'apply', order: 3, icon: '🛠️',
    name: { en: 'Apply', sw: 'Tumia' },
    kidGoal: { en: 'I can use it in code', sw: 'Naweza kuitumia kwenye msimbo' },
    verbs: ['use', 'complete', 'implement', 'execute'],
    activityTypes: ['write_code', 'complete_code'],
  },
  {
    id: 'analyze', order: 4, icon: '🔍',
    name: { en: 'Analyse', sw: 'Chambua' },
    kidGoal: { en: 'I can trace it and predict', sw: 'Naweza kufuatilia na kutabiri' },
    verbs: ['trace', 'predict', 'compare', 'break down'],
    activityTypes: ['predict_output'],
  },
  {
    id: 'evaluate', order: 5, icon: '⚖️',
    name: { en: 'Evaluate', sw: 'Tathmini' },
    kidGoal: { en: 'I can find and fix mistakes', sw: 'Naweza kupata na kurekebisha makosa' },
    verbs: ['debug', 'judge', 'critique', 'justify'],
    activityTypes: ['find_bug'],
  },
  {
    id: 'create', order: 6, icon: '🚀',
    name: { en: 'Create', sw: 'Unda' },
    kidGoal: { en: 'I can build something new', sw: 'Naweza kujenga kitu kipya' },
    verbs: ['design', 'build', 'invent', 'compose'],
    activityTypes: ['create'],
  },
];

const BY_ID = Object.fromEntries(LEVELS.map((l) => [l.id, l]));
const IDS = LEVELS.map((l) => l.id);

const levelIndex = (id) => IDS.indexOf(id);
const nextLevel = (id) => IDS[levelIndex(id) + 1] || null;
const prevLevel = (id) => IDS[levelIndex(id) - 1] || null;
const isHigherOrder = (id) => levelIndex(id) >= levelIndex('analyze');

module.exports = { LEVELS, BY_ID, IDS, levelIndex, nextLevel, prevLevel, isHigherOrder };
