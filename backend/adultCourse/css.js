'use strict';
/** Adult course - Part 2: CSS (module 104). Format: see html.js. */

const M104 = {
  id: 104, order: 4, icon: '🎨', color: '#2965f1', difficulty: 'intermediate', hours: 25,
  title: 'Applying Styles',
  description: 'CSS fundamentals: selectors, colours and fonts, the box model, Flexbox layout and responsive design.',
  lessons: [
    {
      title: 'Introduction to CSS', minutes: 60,
      content: `CSS (Cascading Style Sheets) controls how HTML looks: colours, fonts, spacing and layout.

## A CSS rule
~~~
h1 {
  color: #1d4ed8;
  font-size: 32px;
}
~~~
- {{h1}} is the selector - which elements to style.
- {{color}} and {{font-size}} are properties; {{#1d4ed8}} and {{32px}} are values.
- Each declaration ends with a semicolon; rules are wrapped in curly braces.

## Three ways to add CSS
- Inline: {{<p style="color: red;">}} - avoid, hard to maintain.
- Internal: a {{<style>}} element in the {{<head>}}.
- External (best): a separate file linked with {{<link rel="stylesheet" href="styles.css">}} - one file styles the whole site.

## The cascade
When several rules style the same element, the more specific rule wins; if they are equally specific, the later rule wins. In this course the CSS panel works like an external stylesheet for your page.`,
      example: { html: '<h1>Welcome</h1>\n<p>Styled with CSS.</p>', css: 'h1 {\n  color: #1d4ed8;\n}\np {\n  font-size: 18px;\n}' },
      challenge: 'In the CSS panel, give all h1 headings a colour and all paragraphs a font-size. Add an h1 and a p in the HTML panel to see the result.',
      checks: [
        { label: 'HTML has an <h1> and a <p>', in: 'html', re: /<h1[^>]*>[\s\S]*<\/h1>[\s\S]*<p|<p[\s\S]*<h1/i },
        { label: 'A CSS rule for h1 that sets color', in: 'css', re: /(^|[\s,}])h1\s*\{[^}]*\bcolor\s*:/i },
        { label: 'A CSS rule for p that sets font-size', in: 'css', re: /(^|[\s,}])p\s*\{[^}]*font-size\s*:/i },
      ],
      hints: ['Write rules in the CSS panel, not inside the HTML.', 'Do not forget the semicolon after each value.'],
      quiz: [
        { q: 'In the rule p { color: red; }, what is "p"?', options: ['The selector', 'The property', 'The value', 'The declaration block'], why: 'The selector chooses which elements are styled.' },
        { q: 'Which way of adding CSS is best for a whole website?', options: ['An external stylesheet', 'Inline style attributes', 'A <style> in every page', 'CSS inside JavaScript strings'], why: 'One external file styles every page and is easy to maintain.' },
        { q: 'Two equally specific rules set different colours. Which wins?', options: ['The one that comes later', 'The one that comes first', 'Neither - an error appears', 'The shorter one'], why: 'With equal specificity, the later rule wins.' },
      ],
      oral: 'Explain the "cascade" in Cascading Style Sheets.',
    },
    {
      title: 'Selectors and Specificity', minutes: 60,
      content: `## Common selectors
~~~
p { }                 every <p>
.highlight { }        elements with class="highlight"
#main { }             the element with id="main"
nav a { }             links inside a nav (descendant)
h1, h2 { }            h1 and h2 (group)
a:hover { }           a link while the mouse is over it
li:first-child { }    the first item of each list
input[type="email"] { }   attribute selector
~~~

## Specificity
When rules conflict, the more specific selector wins:
- element selectors (p) - lowest
- class, attribute and pseudo-class selectors (.card, :hover) - higher
- id selectors (#main) - higher still
- inline styles - highest

Prefer classes for styling: they are reusable and easy to override. Avoid {{!important}} - it makes styles hard to change later.`,
      example: { html: '<p class="highlight">Important notice</p>\n<a href="#">Hover me</a>', css: '.highlight {\n  background: #fef08a;\n}\na:hover {\n  color: green;\n}' },
      challenge: 'Create a .highlight class with a background colour, style an element with id="main", and change link colour on hover with a:hover. Use them in your HTML.',
      checks: [
        { label: 'A .highlight class rule with a background', in: 'css', re: /\.highlight\s*\{[^}]*background(-color)?\s*:/i },
        { label: 'An #main id rule', in: 'css', re: /#main\s*\{[^}]*:[^}]*\}/i },
        { label: 'An a:hover rule', in: 'css', re: /a:hover\s*\{[^}]*:/i },
        { label: 'HTML uses class="highlight" and id="main"', in: 'html', re: /class\s*=\s*["'][^"']*highlight[\s\S]*id\s*=\s*["']main["']|id\s*=\s*["']main["'][\s\S]*class\s*=\s*["'][^"']*highlight/i },
      ],
      hints: ['Classes start with a dot (.), ids with a hash (#) in CSS - but not in the HTML attribute.'],
      quiz: [
        { q: 'Which selector matches <div class="card">?', options: ['.card', '#card', 'card', '*card'], why: 'A dot selects by class.' },
        { q: 'Which selector is the most specific?', options: ['#header', '.header', 'header', 'div header'], why: 'id selectors beat classes and elements.' },
        { q: 'What does "nav a" select?', options: ['Links inside a nav', 'The nav and all links', 'Only the first link', 'A nav inside a link'], why: 'A space means "descendant of".' },
      ],
      oral: 'Why do professional developers usually style with classes instead of ids?',
    },
    {
      title: 'Colours, Fonts and Text', minutes: 60,
      content: `## Colours
~~~
color: navy;                  named colour
color: #0f766e;               hexadecimal
color: rgb(15, 118, 110);     red, green, blue (0-255)
background-color: rgba(0, 0, 0, 0.5);   with transparency
color: hsl(170, 77%, 26%);    hue, saturation, lightness
~~~
Check contrast: dark text on a light background (or the opposite) is easiest to read.

## Fonts
~~~
body {
  font-family: "Segoe UI", Arial, sans-serif;
  font-size: 16px;
  line-height: 1.6;
}
~~~
- Always end a font stack with a generic family ({{serif}}, {{sans-serif}}, {{monospace}}) as a fallback.
- {{font-weight}}: 400 is normal, 700 is bold.
- {{line-height}} around 1.5 makes paragraphs comfortable to read.

## Text
{{text-align}}, {{text-transform: uppercase}}, {{text-decoration: none}} (removes link underlines), {{letter-spacing}}.

Web fonts (for example from Google Fonts) are added with a {{<link>}} in the head and then used in font-family.`,
      example: { html: '<h1>Safari Tours</h1>\n<p>Book your trip today.</p>', css: 'body {\n  font-family: Arial, sans-serif;\n}\nh1 {\n  color: #0f766e;\n}' },
      challenge: 'Set a font-family with a generic fallback on body, give h1 a hexadecimal colour, and give paragraphs a line-height.',
      checks: [
        { label: 'body has a font-family ending with a generic family', in: 'css', re: /body\s*\{[^}]*font-family\s*:[^;}]*\b(sans-serif|serif|monospace|cursive|system-ui)\b/i },
        { label: 'h1 has a colour', in: 'css', re: /h1\s*\{[^}]*\bcolor\s*:\s*(#[0-9a-f]{3,8}|[a-z]+|rgb[a]?\([^)]*\))/i },
        { label: 'p has a line-height', in: 'css', re: /(^|[\s,}])p\s*\{[^}]*line-height\s*:/i },
      ],
      hints: ['Example: font-family: Verdana, sans-serif;'],
      quiz: [
        { q: 'Why end a font stack with "sans-serif"?', options: ['So there is a fallback if other fonts are missing', 'To make text bold', 'It is required by HTML', 'To load Google Fonts'], why: 'The generic family is used if no listed font is available.' },
        { q: 'Which is a valid hexadecimal colour?', options: ['#1e40af', 'rgb#1e40af', '1e40af%', 'hex(1e40af)'], why: 'Hex colours start with # followed by 3, 6 or 8 hex digits.' },
        { q: 'What does rgba(0, 0, 0, 0.5) mean?', options: ['Black at 50% transparency', 'Red at 50% size', 'White text', 'An invalid colour'], why: 'The fourth value is the alpha (opacity).' },
      ],
      oral: 'How would you choose colours and fonts so that a website is easy for everyone to read?',
    },
    {
      title: 'The Box Model', minutes: 75,
      content: `Every element is a rectangular box made of four layers:

~~~
margin   - space outside the border
border   - the line around the element
padding  - space between the border and the content
content  - the text or image itself
~~~

~~~
.card {
  width: 300px;
  padding: 16px;
  border: 2px solid #cbd5e1;
  border-radius: 12px;
  margin: 20px auto;
  box-sizing: border-box;
}
~~~

- Shorthand {{margin: 10px 20px}} = 10px top and bottom, 20px left and right.
- {{margin: 0 auto}} centres a block that has a width.
- By default {{width}} only counts the content, so padding and border make the box bigger. {{box-sizing: border-box}} includes them in the width, which is much easier to work with - most developers apply it to every element.
- {{border-radius}} rounds the corners.

Open the browser's Developer Tools (F12) and inspect any element to see its box model.`,
      example: { html: '<div class="card">\n  <h2>Box</h2>\n  <p>Padding, border and margin.</p>\n</div>', css: '.card {\n  padding: 16px;\n  border: 2px solid #94a3b8;\n}' },
      challenge: 'Style a .card with padding, a border, a margin, rounded corners (border-radius) and box-sizing: border-box. Add a div with class="card" in the HTML.',
      checks: [
        { label: 'HTML has an element with class="card"', in: 'html', re: /class\s*=\s*["'][^"']*\bcard\b/i },
        { label: '.card has padding', in: 'css', re: /\.card\s*\{[^}]*padding\s*:/i },
        { label: '.card has a border', in: 'css', re: /\.card\s*\{[^}]*border\s*:/i },
        { label: '.card has a margin', in: 'css', re: /\.card\s*\{[^}]*margin\s*:/i },
        { label: '.card has border-radius', in: 'css', re: /\.card\s*\{[^}]*border-radius\s*:/i },
        { label: 'box-sizing: border-box', in: 'css', re: /box-sizing\s*:\s*border-box/i },
      ],
      hints: ['border needs a width, a style and a colour: border: 1px solid #ccc;'],
      quiz: [
        { q: 'Which layer is between the border and the content?', options: ['Padding', 'Margin', 'Outline', 'Shadow'], why: 'Padding is inside the border.' },
        { q: 'What does box-sizing: border-box change?', options: ['Width includes padding and border', 'It removes the border', 'It adds a margin', 'It makes the box a circle'], why: 'With border-box, the width is the full visible box.' },
        { q: 'How can you centre a block with a fixed width horizontally?', options: ['margin: 0 auto;', 'padding: center;', 'text-align: middle;', 'border: auto;'], why: 'Auto left and right margins centre the block.' },
      ],
      oral: 'Explain the four parts of the CSS box model using a framed photograph as an analogy.',
    },
    {
      title: 'Layout with Flexbox', minutes: 90,
      content: `Flexbox arranges items in a row or a column and shares out the space between them.

~~~
.row {
  display: flex;
  justify-content: space-between;   main-axis alignment
  align-items: center;              cross-axis alignment
  gap: 16px;                        space between items
  flex-wrap: wrap;                  allow items to move to the next line
}
.row > div {
  flex: 1;                          each item grows to share the space
}
~~~

## Key properties on the container
- {{display: flex}} turns on Flexbox for the direct children.
- {{flex-direction: row | column}}
- {{justify-content}}: flex-start, center, space-between, space-around, space-evenly
- {{align-items}}: stretch, center, flex-start, flex-end
- {{gap}}: the space between items

## On the items
- {{flex: 1}} - grow to fill the available space
- {{order}} - change the visual order

Flexbox is ideal for navigation bars, card rows and centring content. For two-dimensional page grids, CSS Grid ({{display: grid}}) is also available.`,
      example: { html: '<div class="row">\n  <div>One</div>\n  <div>Two</div>\n  <div>Three</div>\n</div>', css: '.row {\n  display: flex;\n  gap: 12px;\n}\n.row > div {\n  background: #e0f2fe;\n  padding: 12px;\n}' },
      challenge: 'Make a .row container with three child boxes. Use display: flex, a gap and justify-content: space-between.',
      checks: [
        { label: 'HTML: a .row with three child elements', in: 'html', re: /class\s*=\s*["'][^"']*\brow\b[^>]*>(\s*<(div|section|article|li)[^>]*>[\s\S]*?<\/\2>){3}/i },
        { label: '.row uses display: flex', in: 'css', re: /\.row\s*\{[^}]*display\s*:\s*flex/i },
        { label: '.row has a gap', in: 'css', re: /\.row\s*\{[^}]*\bgap\s*:/i },
        { label: 'justify-content set', in: 'css', re: /justify-content\s*:\s*(space-between|center|space-around|space-evenly|flex-start|flex-end)/i },
      ],
      hints: ['display: flex goes on the parent (.row), not on the children.'],
      quiz: [
        { q: 'Where do you put display: flex?', options: ['On the container (parent)', 'On every child', 'On the <body> only', 'On the text'], why: 'Flexbox is turned on for the container; its children become flex items.' },
        { q: 'Which property centres flex items vertically in a row?', options: ['align-items: center', 'justify-content: center', 'vertical-align: middle', 'text-align: center'], why: 'align-items controls the cross axis.' },
        { q: 'What does gap: 16px do in a flex container?', options: ['Adds 16px between items', 'Adds 16px padding inside each item', 'Moves the container 16px', 'Sets the font size'], why: 'gap is the space between flex items.' },
      ],
      oral: 'Explain how you would build a navigation bar with the logo on the left and links on the right using Flexbox.',
    },
    {
      title: 'Responsive Design and External Stylesheets', minutes: 90,
      content: `Most visitors in Kenya browse on phones, so pages must adapt to any screen size.

## Mobile-first media queries
Write styles for small screens first, then add rules for bigger screens - or change the layout below a breakpoint:

~~~
.row {
  display: flex;
  gap: 16px;
}
@media (max-width: 600px) {
  .row {
    flex-direction: column;
  }
}
~~~

## Flexible units
- {{%}} - relative to the parent
- {{rem}} - relative to the root font size (1rem = 16px by default)
- {{vw}} / {{vh}} - percent of the viewport width / height
- {{max-width: 100%}} on images stops them overflowing the screen.

## Linking the stylesheet
On a real site save your CSS in {{styles.css}} and link it in every page's head:

~~~
<link rel="stylesheet" href="styles.css">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
~~~

Test with the device toolbar in Developer Tools (Ctrl+Shift+M).`,
      example: { html: '<link rel="stylesheet" href="styles.css">\n<div class="row"><div>A</div><div>B</div></div>', css: '.row { display: flex; }\n@media (max-width: 600px) {\n  .row { flex-direction: column; }\n}' },
      challenge: 'Link an external stylesheet in the HTML, and write a media query for screens up to 600px wide that changes a flex .row to flex-direction: column. Also make images responsive with max-width: 100%.',
      checks: [
        { label: 'HTML links a stylesheet with <link rel="stylesheet">', in: 'html', re: /<link[^>]*rel\s*=\s*["']stylesheet["'][^>]*href|<link[^>]*href[^>]*rel\s*=\s*["']stylesheet["']/i },
        { label: 'A media query with max-width', in: 'css', re: /@media[^{]*max-width\s*:\s*\d+(px|em|rem)/i },
        { label: 'flex-direction: column inside the media query', in: 'css', re: /@media[^{]*\{[\s\S]*flex-direction\s*:\s*column/i },
        { label: 'Images with max-width: 100%', in: 'css', re: /img\s*\{[^}]*max-width\s*:\s*100%/i },
      ],
      hints: ['@media (max-width: 600px) { .row { flex-direction: column; } }', 'Remember the extra closing brace for the media query.'],
      quiz: [
        { q: 'What does @media (max-width: 600px) mean?', options: ['Apply these rules on screens 600px wide or smaller', 'Apply on screens wider than 600px', 'Make every element 600px wide', 'Load a 600px image'], why: 'max-width rules apply up to that width.' },
        { q: 'Which unit is relative to the root font size?', options: ['rem', 'px', 'vh', 'pt'], why: 'rem = root em.' },
        { q: 'Why use an external stylesheet?', options: ['One file styles every page and is cached by the browser', 'It is the only way CSS works', 'It hides your CSS from users', 'It makes HTML shorter by deleting tags'], why: 'Shared and cached - faster and easier to maintain.' },
      ],
      oral: 'What does "mobile-first" mean and why is it important in Kenya?',
    },
  ],
};

module.exports = { M104 };
