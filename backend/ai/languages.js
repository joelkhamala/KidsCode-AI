'use strict';
/**
 * Programming languages KidsCode can teach, with the age bands and school
 * curricula they appear in.
 *
 * `curricula` only lists references we have verified in official or widely
 * cited curriculum documents (see docs/AI_LEARNING_ENGINE.md for sources).
 * Leave it empty rather than guessing.
 *
 * runtime:
 *   'js'   - code is executed in the server sandbox and auto-graded by output
 *   'none' - code is checked by structure (and by the AI model when available)
 */

const { PRO_CONCEPTS, PRO_PATTERNS } = require('./proContent');

// Pro skills of the life-long Coding Journey (taught in Python and JavaScript).
const PRO_CONCEPT_IDS = PRO_CONCEPTS.map((c) => c.id);

const PROGRAMMING_CONCEPTS = ['sequence', 'output', 'variables', 'arithmetic', 'conditionals', 'loops', 'while_loops', 'lists', 'functions', 'parameters_return'];

const LANGUAGES = [
  {
    id: 'blocks', name: 'KidsCode Blocks', nameSw: 'Vitalu vya KidsCode', kind: 'visual', icon: '🧱',
    minAge: 7, maxAge: 12, runtime: 'none', renderer: 'blocks',
    description: { en: 'Drag-and-drop blocks (Google Blockly) - the KidsCode playground language.', sw: 'Vitalu vya kuburuta na kudondosha (Google Blockly) - lugha ya uwanja wa michezo wa KidsCode.' },
    concepts: PROGRAMMING_CONCEPTS,
    curricula: [
      'Kenya proposal: KidsCode block-programming pathway (Blockly)',
      'Australian Curriculum: Digital Technologies - visual programming, Years 3-6',
    ],
  },
  {
    id: 'scratch', name: 'Scratch', nameSw: 'Scratch', kind: 'visual', icon: '🐱',
    minAge: 7, maxAge: 13, runtime: 'none', renderer: 'scratch',
    description: { en: 'MIT\'s block language, widely used to introduce coding in Kenyan CBC classrooms.', sw: 'Lugha ya vitalu ya MIT, inatumika sana kufundisha msimbo katika madarasa ya CBC Kenya.' },
    // Scratch custom blocks cannot return values, so parameters_return is excluded.
    concepts: PROGRAMMING_CONCEPTS.filter((c) => c !== 'parameters_return'),
    curricula: [
      'Kenya CBC - Scratch used to introduce coding and computational thinking (Scratch Foundation / Robotics Society of Kenya teacher training)',
      'Australian Curriculum: Digital Technologies - visual programming, Years 3-6',
    ],
  },
  {
    id: 'python', name: 'Python', nameSw: 'Python', kind: 'text', icon: '🐍',
    minAge: 10, maxAge: 99, runtime: 'none', renderer: 'python',
    description: { en: 'A friendly text language used in science, AI and many school syllabuses.', sw: 'Lugha rafiki ya maandishi inayotumika katika sayansi, AI na mitaala mingi ya shule.' },
    concepts: [...PROGRAMMING_CONCEPTS, ...PRO_CONCEPT_IDS],
    curricula: [
      'Kenya - KICD-approved coding curriculum in Python for ages 7-16 (Kodris Africa)',
      'England National Curriculum KS3 - at least one textual language (Python is the most common choice)',
      'Australian Curriculum: Digital Technologies - general-purpose programming, Years 7-10',
      'India CBSE Class XI-XII Computer Science (Code 083)',
    ],
  },
  {
    id: 'javascript', name: 'JavaScript', nameSw: 'JavaScript', kind: 'text', icon: '🟨',
    minAge: 10, maxAge: 99, runtime: 'js', renderer: 'javascript',
    description: { en: 'The language of the web. KidsCode can run it instantly and check your answers.', sw: 'Lugha ya wavuti. KidsCode inaweza kuiendesha papo hapo na kukagua majibu yako.' },
    concepts: [...PROGRAMMING_CONCEPTS, ...PRO_CONCEPT_IDS],
    curricula: [
      'Australian Curriculum: Digital Technologies - general-purpose programming, Years 7-10',
      'KidsCode lessons (existing JavaScript modules)',
    ],
  },
  {
    id: 'html_css', name: 'HTML & CSS', nameSw: 'HTML na CSS', kind: 'markup', icon: '🌐',
    minAge: 9, maxAge: 99, runtime: 'none', renderer: null,
    description: { en: 'Build and style your own web pages.', sw: 'Jenga na upambe kurasa zako za wavuti.' },
    concepts: ['html_structure', 'css_styling'],
    curricula: ['KidsCode "Web Wizards" module'],
  },
  {
    id: 'java', name: 'Java', nameSw: 'Java', kind: 'text', icon: '☕',
    minAge: 13, maxAge: 99, runtime: 'none', renderer: 'java',
    description: { en: 'A popular language for apps (including Android) and university courses.', sw: 'Lugha maarufu ya programu (ikiwemo Android) na kozi za vyuo vikuu.' },
    concepts: PROGRAMMING_CONCEPTS,
    curricula: ['USA - AP Computer Science A (College Board)'],
  },
  {
    id: 'c', name: 'C', nameSw: 'C', kind: 'text', icon: '⚙️',
    minAge: 14, maxAge: 99, runtime: 'none', renderer: 'c',
    description: { en: 'A classic language that shows how computers really work.', sw: 'Lugha ya zamani inayoonyesha jinsi kompyuta zinavyofanya kazi kweli.' },
    concepts: PROGRAMMING_CONCEPTS,
    curricula: [],
  },
  {
    id: 'cpp', name: 'C++', nameSw: 'C++', kind: 'text', icon: '➕',
    minAge: 14, maxAge: 99, runtime: 'none', renderer: 'cpp',
    description: { en: 'Used for games, robotics and coding competitions.', sw: 'Inatumika kwa michezo, roboti na mashindano ya msimbo.' },
    concepts: PROGRAMMING_CONCEPTS,
    curricula: [],
  },
  {
    id: 'csharp', name: 'C#', nameSw: 'C#', kind: 'text', icon: '🎮',
    minAge: 13, maxAge: 99, runtime: 'none', renderer: 'csharp',
    description: { en: 'Used to make games with Unity and Windows apps.', sw: 'Inatumika kutengeneza michezo kwa Unity na programu za Windows.' },
    concepts: PROGRAMMING_CONCEPTS,
    curricula: ['England - offered in some KS4 classrooms (King\'s College London survey)'],
  },
];

/**
 * Patterns that show a concept has been used in a learner's own code.
 * Used for static checking of Apply/Create work in languages we do not execute.
 */
const CONSTRUCT_PATTERNS = {
  output: {
    python: /\bprint\s*\(/, javascript: /console\.log\s*\(/, java: /System\.out\.print/, c: /\bprintf\s*\(|\bputs\s*\(/,
    cpp: /\bcout\s*<</, csharp: /Console\.Write/, blocks: /\b(print|say)\b/i, scratch: /\bsay\b|\bthink\b/i,
  },
  variables: {
    python: /^\s*[A-Za-z_]\w*\s*=(?!=)/m, javascript: /\b(let|const|var)\s+[A-Za-z_$]/,
    java: /\b(int|String|double|boolean|char|var)\s+[A-Za-z_]\w*\s*=/, c: /\b(int|char|float|double)\s*\*?\s*[A-Za-z_]\w*\s*(\[\s*\])?\s*=/,
    cpp: /\b(int|std::string|string|double|bool|char|auto)\s+[A-Za-z_]\w*\s*=/, csharp: /\b(int|string|double|bool|var)\s+[A-Za-z_]\w*\s*=/,
    blocks: /\bset\s+\w+\s+to\b/i, scratch: /\bset\s*\[/i,
  },
  arithmetic: { any: /[\w)\]]\s*[-+*/%]\s*[\w(]/ },
  conditionals: { any: /\bif\b/ },
  loops: {
    python: /\bfor\s+\w+\s+in\b/, javascript: /\bfor\s*\(/, java: /\bfor\s*\(/, c: /\bfor\s*\(/, cpp: /\bfor\s*\(/,
    csharp: /\b(for|foreach)\s*\(/, blocks: /\b(count with|repeat)\b/i, scratch: /\brepeat\b/i,
  },
  while_loops: { any: /\bwhile\b/, blocks: /\brepeat while\b/i, scratch: /\brepeat until\b/i },
  lists: {
    python: /\[[^\]]*\]/, javascript: /\[[^\]]*\]/, java: /\[\s*\]|new\s+\w+\s*\[|List</, c: /\w+\s*\[\s*\d*\s*\]\s*=/,
    cpp: /vector\s*<|\w+\s*\[\s*\d*\s*\]\s*=/, csharp: /\[\s*\]|List</, blocks: /\bcreate list\b|\blist\b/i, scratch: /\badd\b.*\bto\s*\[/i,
  },
  functions: {
    python: /\bdef\s+\w+\s*\(/, javascript: /\bfunction\s+\w+\s*\(|=>/, java: /\bstatic\s+\w+\s+(?!main\b)\w+\s*\(/,
    c: /^\s*\w[\w\s*]*\s+(?!main\b)\w+\s*\([^;]*\)\s*\{/m, cpp: /^\s*\w[\w\s*:<>]*\s+(?!main\b)\w+\s*\([^;]*\)\s*\{/m,
    csharp: /\bstatic\s+\w+\s+(?!Main\b)\w+\s*\(/, blocks: /^\s*to\s+\w+/im, scratch: /\bdefine\b/i,
  },
  parameters_return: { any: /\breturn\b/ },
  html_structure: { any: /<\s*(h[1-6]|p|ul|ol|li|body|html|div)\b/i },
  css_styling: { any: /\{[^}]*:[^}]*\}|style\s*=/i },
};

Object.assign(CONSTRUCT_PATTERNS, PRO_PATTERNS);

function constructPattern(concept, language) {
  const entry = CONSTRUCT_PATTERNS[concept];
  if (!entry) return null;
  return entry[language] || entry.any || null;
}

const BY_ID = Object.fromEntries(LANGUAGES.map((l) => [l.id, l]));

/** Languages suitable for a learner's age (unknown age -> everything). */
function languagesForAge(age) {
  if (!age) return LANGUAGES;
  return LANGUAGES.filter((l) => age >= l.minAge - 1); // allow keen learners one year early
}

/** Suggest a first language: blocks for young children, Python for older ones. */
function suggestedLanguage(age) {
  if (!age || age < 10) return 'blocks';
  return 'python';
}

module.exports = { LANGUAGES, BY_ID, PROGRAMMING_CONCEPTS, PRO_CONCEPT_IDS, CONSTRUCT_PATTERNS, constructPattern, languagesForAge, suggestedLanguage };
