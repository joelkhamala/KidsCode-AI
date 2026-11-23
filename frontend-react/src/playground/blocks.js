// Turtle blocks + code generators for the KIDSCODE playground.
//
// Blockly (and its language generators) are loaded from the CDN in public/index.html,
// so everything here reads them from window.Blockly at call time.
//
// One block program can be shown in several languages. JavaScript is what actually runs
// in KIDSCODE. Python uses Python's real `turtle` module, so the Python view runs as-is
// on a computer with Python installed. Lua, Dart and PHP have no built-in turtle, so the
// turtle commands there keep the KIDSCODE names (forward, right, ...).

const ORDER_NONE = 99; // "no precedence needed" — same value in every Blockly generator

export const CODE_LANGUAGES = [
  { id: 'javascript', label: 'JavaScript', global: 'JavaScript', runs: true },
  { id: 'python', label: 'Python', global: 'Python' },
  { id: 'lua', label: 'Lua', global: 'Lua' },
  { id: 'dart', label: 'Dart', global: 'Dart' },
  { id: 'php', label: 'PHP', global: 'PHP' },
];

const TURTLE_COLOUR = 160;

const BLOCK_DEFS = [
  { type: 'turtle_forward', message0: 'move forward %1 steps', args0: [{ type: 'input_value', name: 'DIST', check: 'Number' }], tooltip: 'Moves the turtle forward' },
  { type: 'turtle_backward', message0: 'move backward %1 steps', args0: [{ type: 'input_value', name: 'DIST', check: 'Number' }], tooltip: 'Moves the turtle backward' },
  { type: 'turtle_right', message0: 'turn right %1 degrees', args0: [{ type: 'input_value', name: 'ANGLE', check: 'Number' }], tooltip: 'Turns the turtle to the right (clockwise)' },
  { type: 'turtle_left', message0: 'turn left %1 degrees', args0: [{ type: 'input_value', name: 'ANGLE', check: 'Number' }], tooltip: 'Turns the turtle to the left (anticlockwise)' },
  { type: 'turtle_color', message0: 'set colour to %1', args0: [{ type: 'field_input', name: 'COLOR', text: 'red' }], tooltip: 'Pen colour, e.g. red, blue, gold, #ff8800' },
  { type: 'turtle_color_value', message0: 'set colour to %1', args0: [{ type: 'input_value', name: 'COLOR', check: 'String' }], tooltip: 'Pen colour from a variable or text block' },
  { type: 'turtle_arc', message0: 'draw arc: radius %1 angle %2', args0: [{ type: 'input_value', name: 'RADIUS', check: 'Number' }, { type: 'input_value', name: 'ANGLE', check: 'Number' }], inputsInline: true, tooltip: 'Draws a curve that bends to the right' },
  { type: 'turtle_penup', message0: 'pen up (stop drawing)', tooltip: 'Lift the pen: the turtle moves without drawing' },
  { type: 'turtle_pendown', message0: 'pen down (draw)', tooltip: 'Put the pen down: the turtle draws as it moves' },
  { type: 'turtle_clear', message0: 'clear the drawing', tooltip: 'Wipes the canvas (the turtle stays where it is)' },
].map(def => ({ previousStatement: null, nextStatement: null, colour: TURTLE_COLOUR, helpUrl: '', ...def }));

// How each turtle command is spelled in each language.
const SPELLING = {
  javascript: { forward: 'forward', backward: 'backward', right: 'right', left: 'left', color: 'color', penUp: 'penUp', penDown: 'penDown', clear: 'clear', end: ';' },
  python: { forward: 'forward', backward: 'backward', right: 'right', left: 'left', color: 'pencolor', penUp: 'penup', penDown: 'pendown', clear: 'clear', end: '' },
  lua: { forward: 'forward', backward: 'backward', right: 'right', left: 'left', color: 'color', penUp: 'penUp', penDown: 'penDown', clear: 'clear', end: '' },
  dart: { forward: 'forward', backward: 'backward', right: 'right', left: 'left', color: 'color', penUp: 'penUp', penDown: 'penDown', clear: 'clear', end: ';' },
  php: { forward: 'forward', backward: 'backward', right: 'right', left: 'left', color: 'color', penUp: 'penUp', penDown: 'penDown', clear: 'clear', end: ';' },
};

const getGenerator = (lang) => {
  const B = window.Blockly;
  const meta = CODE_LANGUAGES.find(l => l.id === lang);
  return B && meta ? B[meta.global] || null : null;
};

export const availableLanguages = () => CODE_LANGUAGES.filter(l => !!getGenerator(l.id));

const installGenerators = (lang, gen) => {
  const s = SPELLING[lang];
  const call = (name, args = '') => `${name}(${args})${s.end}\n`;
  const val = (block, input, fallback) => gen.valueToCode(block, input, ORDER_NONE) || fallback;
  const markTurtle = () => {
    if (lang === 'python') gen.definitions_['import_turtle'] = 'from turtle import *';
  };

  gen.forBlock['turtle_forward'] = (block) => { markTurtle(); return call(s.forward, val(block, 'DIST', '0')); };
  gen.forBlock['turtle_backward'] = (block) => { markTurtle(); return call(s.backward, val(block, 'DIST', '0')); };
  gen.forBlock['turtle_right'] = (block) => { markTurtle(); return call(s.right, val(block, 'ANGLE', '0')); };
  gen.forBlock['turtle_left'] = (block) => { markTurtle(); return call(s.left, val(block, 'ANGLE', '0')); };
  gen.forBlock['turtle_color'] = (block) => { markTurtle(); return call(s.color, gen.quote_(block.getFieldValue('COLOR') || 'black')); };
  gen.forBlock['turtle_color_value'] = (block) => { markTurtle(); return call(s.color, val(block, 'COLOR', gen.quote_('black'))); };
  gen.forBlock['turtle_penup'] = () => { markTurtle(); return call(s.penUp); };
  gen.forBlock['turtle_pendown'] = () => { markTurtle(); return call(s.penDown); };
  gen.forBlock['turtle_clear'] = () => { markTurtle(); return call(s.clear); };
  gen.forBlock['turtle_arc'] = (block) => {
    markTurtle();
    const r = val(block, 'RADIUS', '50');
    const a = val(block, 'ANGLE', '180');
    // Python's circle() bends left for a positive radius, so a right-bending arc uses -radius.
    if (lang === 'python') return call('circle', `${/^[\w.]+$/.test(r) ? `-${r}` : `-(${r})`}, ${a}`);
    return call('arc', `${r}, ${a}`);
  };

  // "print" should write to the output panel, never pop up an alert.
  if (lang === 'javascript') {
    gen.forBlock['text_print'] = (block) => `console.log(${val(block, 'TEXT', "''")});\n`;
  }

  // Keep "change x by n" readable for kids (Blockly's default adds type checks).
  gen.forBlock['math_change'] = (block) => {
    const v = gen.getVariableName(block.getFieldValue('VAR'));
    const d = val(block, 'DELTA', '0');
    const negative = /^-\d+(\.\d+)?$/.test(d);
    const op = negative ? '-' : '+';
    const amount = negative ? d.slice(1) : d;
    if (lang === 'lua') return `${v} = ${v} ${op} ${amount}\n`;
    return `${v} ${op}= ${amount}${s.end}\n`;
  };

  // A plain for...of loop is much easier for kids to read than Blockly's index loop.
  if (lang === 'javascript') {
    gen.forBlock['controls_forEach'] = (block) => {
      const v = gen.getVariableName(block.getFieldValue('VAR'));
      const listCode = val(block, 'LIST', '[]');
      const body = gen.statementToCode(block, 'DO');
      return `for (${v} of ${listCode}) {\n${body}}\n`;
    };
  }
};

let installed = false;

/** Define the turtle blocks and their code in every loaded language. Safe to call repeatedly. */
export const defineTurtleBlocks = () => {
  const B = window.Blockly;
  if (!B) return false;
  if (!B.Blocks['turtle_forward'] || !B.Blocks['turtle_color_value']) {
    BLOCK_DEFS.forEach(def => { delete B.Blocks[def.type]; });
    B.defineBlocksWithJsonArray(BLOCK_DEFS);
  }
  if (!installed) {
    CODE_LANGUAGES.forEach(l => {
      const gen = getGenerator(l.id);
      if (gen) installGenerators(l.id, gen);
    });
    installed = true;
  }
  return true;
};

const finishCode = (lang, rawCode) => {
  const code = rawCode.replace(/\n{3,}/g, '\n\n');
  if (lang === 'python' && code.includes('from turtle import *')) {
    // Python's turtle starts facing right; KIDSCODE's starts facing up.
    return code.replace('from turtle import *\n', 'from turtle import *\n\nsetheading(90)  # face up, like the KIDSCODE turtle\n')
      + 'done()  # keep the drawing window open\n';
  }
  return code;
};

/** Code for a live workspace in the given language ('' if that generator is unavailable). */
export const workspaceToCode = (workspace, lang = 'javascript') => {
  const gen = getGenerator(lang);
  if (!gen || !workspace) return '';
  defineTurtleBlocks();
  return finishCode(lang, gen.workspaceToCode(workspace));
};

/** Code for saved block XML, without needing a visible workspace. */
export const xmlToCode = (xmlText, lang = 'javascript') => {
  const B = window.Blockly;
  if (!B || !xmlText) return '';
  defineTurtleBlocks();
  const ws = new B.Workspace();
  try {
    B.Xml.domToWorkspace(B.utils.xml.textToDom(xmlText), ws);
    return workspaceToCode(ws, lang);
  } finally {
    ws.dispose();
  }
};

export const getToolbox = () => ({
  kind: 'categoryToolbox',
  contents: [
    {
      kind: 'category', name: '🐢 Turtle', colour: '#10b981',
      contents: [
        { kind: 'block', type: 'turtle_forward', inputs: { DIST: { shadow: { type: 'math_number', fields: { NUM: 100 } } } } },
        { kind: 'block', type: 'turtle_backward', inputs: { DIST: { shadow: { type: 'math_number', fields: { NUM: 50 } } } } },
        { kind: 'block', type: 'turtle_right', inputs: { ANGLE: { shadow: { type: 'math_number', fields: { NUM: 90 } } } } },
        { kind: 'block', type: 'turtle_left', inputs: { ANGLE: { shadow: { type: 'math_number', fields: { NUM: 90 } } } } },
        { kind: 'block', type: 'turtle_arc', inputs: { RADIUS: { shadow: { type: 'math_number', fields: { NUM: 50 } } }, ANGLE: { shadow: { type: 'math_number', fields: { NUM: 180 } } } } },
        { kind: 'block', type: 'turtle_color' },
        { kind: 'block', type: 'turtle_color_value', inputs: { COLOR: { shadow: { type: 'text', fields: { TEXT: 'blue' } } } } },
        { kind: 'block', type: 'turtle_penup' },
        { kind: 'block', type: 'turtle_pendown' },
        { kind: 'block', type: 'turtle_clear' },
      ],
    },
    {
      kind: 'category', name: '🔄 Loops', colour: '#f59e0b',
      contents: [
        { kind: 'block', type: 'controls_repeat_ext', inputs: { TIMES: { shadow: { type: 'math_number', fields: { NUM: 4 } } } } },
        { kind: 'block', type: 'controls_for', inputs: { FROM: { shadow: { type: 'math_number', fields: { NUM: 1 } } }, TO: { shadow: { type: 'math_number', fields: { NUM: 10 } } }, BY: { shadow: { type: 'math_number', fields: { NUM: 1 } } } } },
        { kind: 'block', type: 'controls_forEach' },
        { kind: 'block', type: 'controls_whileUntil' },
      ],
    },
    {
      kind: 'category', name: '📝 Output', colour: '#6366f1',
      contents: [
        { kind: 'block', type: 'text_print', inputs: { TEXT: { shadow: { type: 'text', fields: { TEXT: 'Hello!' } } } } },
        { kind: 'block', type: 'text' },
        { kind: 'block', type: 'text_join' },
      ],
    },
    {
      kind: 'category', name: '🔢 Math', colour: '#10b981',
      contents: [
        { kind: 'block', type: 'math_number' },
        { kind: 'block', type: 'math_arithmetic' },
        { kind: 'block', type: 'math_random_int', inputs: { FROM: { shadow: { type: 'math_number', fields: { NUM: 1 } } }, TO: { shadow: { type: 'math_number', fields: { NUM: 100 } } } } },
      ],
    },
    {
      kind: 'category', name: '❓ Logic', colour: '#ec4899',
      contents: [
        { kind: 'block', type: 'controls_if' },
        { kind: 'block', type: 'logic_compare' },
        { kind: 'block', type: 'logic_operation' },
        { kind: 'block', type: 'logic_boolean' },
      ],
    },
    { kind: 'category', name: '📦 Variables', colour: '#8b5cf6', custom: 'VARIABLE' },
    {
      kind: 'category', name: '📋 Lists', colour: '#f97316',
      contents: [
        { kind: 'block', type: 'lists_create_with' },
        { kind: 'block', type: 'lists_length' },
        { kind: 'block', type: 'lists_getIndex' },
      ],
    },
    { kind: 'category', name: '🔧 Functions', colour: '#06b6d4', custom: 'PROCEDURE' },
  ],
});
