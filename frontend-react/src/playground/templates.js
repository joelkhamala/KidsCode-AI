// Playground templates. Each one is defined ONLY as blocks; its code (in every language)
// is generated from those blocks, so the blocks and the code can never disagree.
//
// The canvas is 400 x 300 and the turtle starts in the middle (200, 150) facing up.
// Every drawing below has been laid out to fit fully on that canvas.

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const num = (n) => `<shadow type="math_number"><field name="NUM">${n}</field></shadow>`;
const value = (name, inner) => `<value name="${name}">${inner}</value>`;

// A statement block: { type, inner, body? } → rendered with <next> chaining by `seq`.
const blk = (type, inner = '') => ({ type, inner });
const seq = (list) => {
  if (!list.length) return '';
  const [first, ...rest] = list;
  return `<block type="${first.type}">${first.inner}${rest.length ? `<next>${seq(rest)}</next>` : ''}</block>`;
};
const numOrBlock = (v) => (typeof v === 'number' ? num(v) : v);

const fwd = (n) => blk('turtle_forward', value('DIST', numOrBlock(n)));
const back = (n) => blk('turtle_backward', value('DIST', numOrBlock(n)));
const right = (n) => blk('turtle_right', value('ANGLE', numOrBlock(n)));
const left = (n) => blk('turtle_left', value('ANGLE', numOrBlock(n)));
const colour = (c) => blk('turtle_color', `<field name="COLOR">${esc(c)}</field>`);
const colourFrom = (inner) => blk('turtle_color_value', value('COLOR', inner));
const arc = (r, a) => blk('turtle_arc', value('RADIUS', numOrBlock(r)) + value('ANGLE', numOrBlock(a)));
const penUp = () => blk('turtle_penup');
const penDown = () => blk('turtle_pendown');
const say = (text) => blk('text_print', value('TEXT', `<shadow type="text"><field name="TEXT">${esc(text)}</field></shadow>`));
const repeat = (n, body) => blk('controls_repeat_ext', value('TIMES', num(n)) + `<statement name="DO">${seq(body)}</statement>`);
const setVar = (name, v) => blk('variables_set', `<field name="VAR">${esc(name)}</field>` + value('VALUE', numOrBlock(v)));
const changeVar = (name, by) => blk('math_change', `<field name="VAR">${esc(name)}</field>` + value('DELTA', num(by)));
const getVar = (name) => `<block type="variables_get"><field name="VAR">${esc(name)}</field></block>`;
const text = (t) => `<block type="text"><field name="TEXT">${esc(t)}</field></block>`;
const list = (items) => `<block type="lists_create_with"><mutation items="${items.length}"></mutation>${items.map((it, i) => value(`ADD${i}`, it)).join('')}</block>`;
const arith = (op, a, b) => `<block type="math_arithmetic"><field name="OP">${op}</field>${value('A', a)}${value('B', b)}</block>`;
const numBlock = (n) => `<block type="math_number"><field name="NUM">${n}</field></block>`;
const forEach = (varName, listXml, body) => blk('controls_forEach', `<field name="VAR">${esc(varName)}</field>` + value('LIST', listXml) + `<statement name="DO">${seq(body)}</statement>`);

const program = (statements) => `<xml xmlns="https://developers.google.com/blockly/xml">${seq(statements).replace('<block ', '<block x="30" y="30" ')}</xml>`;

const RAINBOW = ['red', 'orange', 'gold', 'green', 'blue', 'indigo', 'violet'];

export const TEMPLATES = [
  {
    id: 'square',
    icon: '🟦',
    nameKey: 'pg.tplSquare',
    // Square, 120 per side, centred on the canvas.
    blocks: program([
      penUp(), back(60), left(90), fwd(60), right(90), penDown(),
      colour('royalblue'),
      repeat(4, [fwd(120), right(90)]),
      say('I drew a square! 🟦'),
    ]),
  },
  {
    id: 'triangle',
    icon: '🔺',
    nameKey: 'pg.tplTriangle',
    // Equilateral triangle, 140 per side, sitting on a flat base.
    blocks: program([
      penUp(), back(60), left(90), fwd(70), right(90), penDown(),
      colour('seagreen'),
      right(30),
      repeat(3, [fwd(140), right(120)]),
      say('I drew a triangle! 🔺'),
    ]),
  },
  {
    id: 'star',
    icon: '⭐',
    nameKey: 'pg.tplStar',
    // Classic 5-point star: turning 144° five times brings the turtle back to the start.
    blocks: program([
      // Start at the left arm facing right, so one point ends up at the top.
      penUp(), fwd(18), left(90), fwd(80), right(180), penDown(),
      colour('goldenrod'),
      repeat(5, [fwd(160), right(144)]),
      say('I drew a star! ⭐'),
    ]),
  },
  {
    id: 'house',
    icon: '🏠',
    nameKey: 'pg.tplHouse',
    // Square walls with a triangle roof sitting exactly on top, plus a door.
    blocks: program([
      penUp(), back(100), left(90), fwd(60), right(90), penDown(),
      colour('saddlebrown'),
      repeat(4, [fwd(120), right(90)]),
      penUp(), fwd(120), right(90), penDown(),
      colour('crimson'),
      repeat(3, [fwd(120), left(120)]),
      penUp(), right(90), fwd(120), left(90), fwd(45), left(90), penDown(),
      colour('peru'),
      fwd(50), right(90), fwd(30), right(90), fwd(50),
      say('I drew a house! 🏠'),
    ]),
  },
  {
    id: 'spiral',
    icon: '🌀',
    nameKey: 'pg.tplSpiral',
    // Square spiral: each line is 7 steps longer than the one before.
    blocks: program([
      colour('purple'),
      setVar('size', 6),
      repeat(34, [fwd(getVar('size')), right(90), changeVar('size', 7)]),
      say('I drew a spiral! 🌀'),
    ]),
  },
  {
    id: 'flower',
    icon: '🌸',
    nameKey: 'pg.tplFlower',
    // 12 squares, each turned 30° from the last, make a flower. Then a stem.
    blocks: program([
      penUp(), fwd(40), penDown(),
      colour('deeppink'),
      repeat(12, [repeat(4, [fwd(50), right(90)]), right(30)]),
      right(180), penUp(), fwd(70), penDown(),
      colour('green'),
      fwd(80),
      say('I drew a flower! 🌸'),
    ]),
  },
  {
    id: 'rainbow',
    icon: '🌈',
    nameKey: 'pg.tplRainbow',
    // Seven half-circles that share one centre point. After each arc the turtle
    // walks back across to the start of the next, smaller arc.
    blocks: program([
      penUp(), back(90), left(90), fwd(130), right(90), penDown(),
      setVar('radius', 130),
      forEach('band', list(RAINBOW.map(text)), [
        colourFrom(getVar('band')),
        arc(getVar('radius'), 180),
        penUp(),
        right(90),
        fwd(arith('MINUS', arith('MULTIPLY', getVar('radius'), numBlock(2)), numBlock(14))),
        right(90),
        penDown(),
        changeVar('radius', -14),
      ]),
      say('I drew a rainbow! 🌈'),
    ]),
  },
];

// Step-by-step typed-code challenges (JavaScript). Every final example draws correctly
// on the 400 x 300 canvas with the turtle starting in the middle, facing up.
export const GUIDED_CHALLENGES = [
  {
    id: 'draw-square',
    title: 'Draw a Square 🟦',
    description: 'Learn forward() and right() to draw a perfect square!',
    steps: [
      { title: 'Move forward', instruction: 'Move the turtle forward. Type: <code>forward(100);</code>', hint: 'forward(100) moves the turtle 100 steps the way it is facing.', check: (c) => /forward\(\s*\d+/.test(c), example: 'forward(100);' },
      { title: 'Turn right', instruction: 'Now turn right by 90 degrees. Add: <code>right(90);</code>', hint: 'A square has 4 corners of 90 degrees.', check: (c) => /right\(\s*90\s*\)/.test(c), example: 'forward(100);\nright(90);' },
      { title: 'Use a loop', instruction: 'Repeat forward + right 4 times with a loop: <code>for (let i = 0; i &lt; 4; i++) { ... }</code>', hint: 'Put forward(100); and right(90); inside the { } of the loop.', check: (c) => /for\s*\(/.test(c) && c.includes('forward(') && c.includes('right('), example: 'for (let i = 0; i < 4; i++) {\n  forward(100);\n  right(90);\n}' },
      { title: 'Add colour', instruction: 'Add <code>color("blue");</code> before your loop.', hint: 'Try "red", "green", "purple" or "orange" too!', check: (c) => c.includes('color('), example: 'color("blue");\nfor (let i = 0; i < 4; i++) {\n  forward(100);\n  right(90);\n}' },
      { title: 'Run it!', instruction: 'Press ▶ Run to see your square!', hint: 'The Run button is at the top of the editor.', check: () => true, example: 'color("blue");\nfor (let i = 0; i < 4; i++) {\n  forward(100);\n  right(90);\n}\nconsole.log("I drew a blue square! 🟦");' },
    ],
  },
  {
    id: 'draw-house',
    title: 'Draw a House 🏠',
    description: 'Put a triangle roof on top of a square!',
    steps: [
      { title: 'Move down a bit', instruction: 'Lift the pen and step back so the house fits: <code>penUp(); backward(100); penDown();</code>', hint: 'penUp() lets the turtle move without drawing.', check: (c) => c.includes('penUp') && c.includes('backward('), example: 'penUp();\nbackward(100);\npenDown();' },
      { title: 'Draw the walls', instruction: 'Draw a square: repeat <code>forward(100); right(90);</code> 4 times.', hint: 'for (let i = 0; i < 4; i++) { forward(100); right(90); }', check: (c) => /for\s*\(/.test(c) && c.includes('right(90)'), example: 'penUp();\nbackward(100);\npenDown();\ncolor("saddlebrown");\nfor (let i = 0; i < 4; i++) {\n  forward(100);\n  right(90);\n}' },
      { title: 'Climb to the roof', instruction: 'Move to the top-left corner without drawing and face right: <code>penUp(); forward(100); right(90); penDown();</code>', hint: 'The roof starts at the top of the left wall.', check: (c) => (c.match(/penUp/g) || []).length >= 2, example: 'penUp();\nbackward(100);\npenDown();\ncolor("saddlebrown");\nfor (let i = 0; i < 4; i++) {\n  forward(100);\n  right(90);\n}\npenUp();\nforward(100);\nright(90);\npenDown();' },
      { title: 'Draw the roof', instruction: 'Draw a triangle by turning <b>left</b> 120 degrees 3 times.', hint: 'for (let i = 0; i < 3; i++) { forward(100); left(120); }', check: (c) => c.includes('left(120)'), example: 'penUp();\nbackward(100);\npenDown();\ncolor("saddlebrown");\nfor (let i = 0; i < 4; i++) {\n  forward(100);\n  right(90);\n}\npenUp();\nforward(100);\nright(90);\npenDown();\ncolor("crimson");\nfor (let i = 0; i < 3; i++) {\n  forward(100);\n  left(120);\n}' },
      { title: 'Celebrate!', instruction: 'Add <code>console.log("My house is done! 🏠");</code> at the end and press ▶ Run.', hint: 'console.log() prints to the output box.', check: (c) => c.includes('console.log('), example: 'penUp();\nbackward(100);\npenDown();\ncolor("saddlebrown");\nfor (let i = 0; i < 4; i++) {\n  forward(100);\n  right(90);\n}\npenUp();\nforward(100);\nright(90);\npenDown();\ncolor("crimson");\nfor (let i = 0; i < 3; i++) {\n  forward(100);\n  left(120);\n}\nconsole.log("My house is done! 🏠");' },
    ],
  },
  {
    id: 'colour-spiral',
    title: 'Colour Spiral 🌀',
    description: 'Use a list of colours and a loop to draw a rainbow spiral!',
    steps: [
      { title: 'Make a list of colours', instruction: 'Create a list: <code>let colors = ["red", "orange", "gold", "green", "blue", "purple"];</code>', hint: 'Lists use square brackets [ ] with commas between items.', check: (c) => /colors\s*=\s*\[/.test(c), example: 'let colors = ["red", "orange", "gold", "green", "blue", "purple"];' },
      { title: 'Loop 60 times', instruction: 'Add a loop: <code>for (let i = 0; i &lt; 60; i++) { }</code>', hint: 'The code inside the { } will run 60 times.', check: (c) => /for\s*\(/.test(c), example: 'let colors = ["red", "orange", "gold", "green", "blue", "purple"];\nfor (let i = 0; i < 60; i++) {\n\n}' },
      { title: 'Draw with each colour', instruction: 'Inside the loop add: <code>color(colors[i % 6]); forward(i * 2); right(61);</code>', hint: 'i % 6 goes 0,1,2,3,4,5,0,1… so the colours repeat.', check: (c) => c.includes('colors[') && c.includes('forward(') && c.includes('right('), example: 'let colors = ["red", "orange", "gold", "green", "blue", "purple"];\nfor (let i = 0; i < 60; i++) {\n  color(colors[i % 6]);\n  forward(i * 2);\n  right(61);\n}' },
      { title: 'Run it!', instruction: 'Press ▶ Run to see your colourful spiral!', hint: 'Try changing 61 to 59 or 91 and run again!', check: () => true, example: 'let colors = ["red", "orange", "gold", "green", "blue", "purple"];\nfor (let i = 0; i < 60; i++) {\n  color(colors[i % 6]);\n  forward(i * 2);\n  right(61);\n}\nconsole.log("Spiral done! 🌀");' },
    ],
  },
  {
    id: 'rainbow-arc',
    title: 'Rainbow with Arcs 🌈',
    description: 'Draw a real rainbow using arc() and a loop!',
    steps: [
      { title: 'Colours and size', instruction: 'Make the colour list and a starting radius:<br><code>let colors = ["red", "orange", "gold", "green", "blue", "indigo", "violet"];<br>let radius = 130;</code>', hint: 'The radius is how big the first (outside) arc is.', check: (c) => c.includes('colors') && /radius\s*=/.test(c), example: 'let colors = ["red", "orange", "gold", "green", "blue", "indigo", "violet"];\nlet radius = 130;' },
      { title: 'Go to the start', instruction: 'Move to the bottom-left of the rainbow without drawing:<br><code>penUp(); backward(90); left(90); forward(130); right(90); penDown();</code>', hint: 'The turtle ends up facing up, ready to curve to the right.', check: (c) => c.includes('penUp') && c.includes('backward(') && c.includes('left(90)'), example: 'let colors = ["red", "orange", "gold", "green", "blue", "indigo", "violet"];\nlet radius = 130;\npenUp();\nbackward(90);\nleft(90);\nforward(130);\nright(90);\npenDown();' },
      { title: 'Draw every band', instruction: 'Loop over the colours. Draw an arc, walk back to the start of the next band, and make the radius smaller.', hint: 'After an arc the turtle faces down: right(90) faces it back to the left.', check: (c) => /for\s*\(/.test(c) && c.includes('arc(') && c.includes('color('), example: 'let colors = ["red", "orange", "gold", "green", "blue", "indigo", "violet"];\nlet radius = 130;\npenUp();\nbackward(90);\nleft(90);\nforward(130);\nright(90);\npenDown();\nfor (let i = 0; i < colors.length; i++) {\n  color(colors[i]);\n  arc(radius, 180);\n  penUp();\n  right(90);\n  forward(radius * 2 - 14);\n  right(90);\n  penDown();\n  radius = radius - 14;\n}' },
      { title: 'Run it!', instruction: 'Press ▶ Run to see your rainbow!', hint: 'Try making the bands thicker by changing 14 to 18.', check: () => true, example: 'let colors = ["red", "orange", "gold", "green", "blue", "indigo", "violet"];\nlet radius = 130;\npenUp();\nbackward(90);\nleft(90);\nforward(130);\nright(90);\npenDown();\nfor (let i = 0; i < colors.length; i++) {\n  color(colors[i]);\n  arc(radius, 180);\n  penUp();\n  right(90);\n  forward(radius * 2 - 14);\n  right(90);\n  penDown();\n  radius = radius - 14;\n}\nconsole.log("Rainbow done! 🌈");' },
    ],
  },
];
