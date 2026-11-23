'use strict';
/** Adult course - Part 3: JavaScript and jQuery (modules 105-108). Format: see html.js. */

const M105 = {
  id: 105, order: 5, icon: '⚡', color: '#ca8a04', difficulty: 'intermediate', hours: 25,
  title: 'JavaScript Basics',
  description: 'Statements, variables, operators, decisions, loops and changing the page with the DOM.',
  lessons: [
    {
      title: 'Introduction to JavaScript', minutes: 60,
      content: `JavaScript is the programming language of the web. It makes pages interactive: reacting to clicks, checking forms, updating content without reloading.

## Where JavaScript runs
In the browser, inside a {{<script>}} element or a linked file:
~~~
<script src="app.js"></script>
~~~
Put scripts at the end of the body (or use {{defer}}) so the HTML loads first.

## Your first statements
~~~
// This is a comment - the computer ignores it
console.log("Habari, dunia!");
console.log(2 + 3);
~~~
- {{console.log()}} prints messages to the console - your main debugging tool. Open it with F12 > Console. In this course the output appears under the preview.
- Each statement ends with a semicolon.
- JavaScript is case-sensitive: {{console.Log}} will not work.
- Comments: {{//}} for one line, {{/* ... */}} for several lines.`,
      example: { js: '// Say hello\nconsole.log("Hello from JavaScript!");' },
      challenge: 'In the JavaScript panel, write a comment and use console.log to print a greeting and the result of a calculation.',
      checks: [
        { label: 'A comment (// or /* */)', in: 'js', re: /\/\/.+|\/\*[\s\S]*?\*\// },
        { label: 'console.log with text', in: 'js', re: /console\.log\s*\(\s*["'`][^"'`]+["'`]/ },
        { label: 'console.log with a calculation', in: 'js', re: /console\.log\s*\([^)]*\d\s*[-+*/%]\s*\d/ },
      ],
      hints: ['console.log("Hello"); and console.log(10 * 3);', 'Press Run, then read the output under the preview.'],
      quiz: [
        { q: 'Where does console.log() output appear?', options: ['In the browser\'s developer console', 'On the web page as a heading', 'In the page title', 'In an email'], why: 'console.log writes to the console - used for checking code.' },
        { q: 'Which is a single-line JavaScript comment?', options: ['// note', '<!-- note -->', '# note', '** note'], why: '// starts a one-line comment in JavaScript.' },
        { q: 'Is JavaScript case-sensitive?', options: ['Yes - console.log and Console.Log are different', 'No', 'Only for strings', 'Only in Chrome'], why: 'Names must match exactly.' },
      ],
      oral: 'Describe three things JavaScript can do on a web page that HTML and CSS cannot.',
    },
    {
      title: 'Variables and Operators', minutes: 75,
      content: `Variables store values so you can use them later.

~~~
const vatRate = 0.16;        cannot be reassigned
let quantity = 3;            can change later
quantity = quantity + 1;
~~~
- Use {{const}} by default and {{let}} when the value must change. Avoid the old {{var}}.
- Names: start with a letter, use camelCase ({{totalPrice}}), make them meaningful.

## Operators
- Arithmetic: {{+ - * / %}} ({{%}} is the remainder) and {{**}} (power)
- Assignment: {{= += -= *=}}
- Increment: {{count++}}

## Joining text
~~~
const name = "Wanjiru";
console.log("Hello " + name);          concatenation
console.log(\`Hello \${name}, you have \${quantity} items\`);   template literal
~~~
Template literals use backticks and {{\${ }}} - they are easier to read than joining with +.`,
      example: { js: 'const price = 250;\nlet quantity = 2;\nconst total = price * quantity;\nconsole.log("Total: " + total);' },
      challenge: 'Declare a const price and a let quantity, calculate a total by multiplying them, and print it using a template literal.',
      checks: [
        { label: 'A const variable', in: 'js', re: /\bconst\s+[A-Za-z_$][\w$]*\s*=/ },
        { label: 'A let variable', in: 'js', re: /\blet\s+[A-Za-z_$][\w$]*\s*=/ },
        { label: 'A multiplication', in: 'js', re: /[\w)\]]\s*\*\s*[\w(]/ },
        { label: 'A template literal with ${...}', in: 'js', re: /`[^`]*\$\{[^}]+\}[^`]*`/ },
      ],
      hints: ['Template literals use backticks: `Total is ${total}`'],
      quiz: [
        { q: 'Which keyword should you use for a value that never changes?', options: ['const', 'let', 'var', 'static'], why: 'const prevents reassignment.' },
        { q: 'What is 17 % 5?', options: ['2', '3', '3.4', '85'], why: '% gives the remainder: 17 = 3*5 + 2.' },
        { q: 'Which name follows camelCase?', options: ['totalPrice', 'TotalPrice!', 'total price', 'total-price'], why: 'camelCase: first word lowercase, next words capitalised, no spaces.' },
      ],
      oral: 'Explain the difference between const and let, and when you would use each.',
    },
    {
      title: 'Making Decisions', minutes: 75,
      content: `Programs make decisions with {{if}}, {{else if}} and {{else}}.

~~~
const score = 74;
if (score >= 80) {
  console.log("Distinction");
} else if (score >= 60) {
  console.log("Credit");
} else if (score >= 40) {
  console.log("Pass");
} else {
  console.log("Fail");
}
~~~

## Comparison operators
{{=== !== > < >= <=}} - always use {{===}} (strict equality), which compares value and type.

## Logical operators
- {{&&}} - and: both must be true
- {{||}} - or: at least one must be true
- {{!}} - not

~~~
if (age >= 18 && hasId) { ... }
~~~

## The switch statement
~~~
switch (day) {
  case "Sat":
  case "Sun":
    console.log("Weekend");
    break;
  default:
    console.log("Weekday");
}
~~~`,
      example: { js: 'const temperature = 30;\nif (temperature > 25) {\n  console.log("It is hot");\n} else {\n  console.log("It is cool");\n}' },
      challenge: 'Write a grade calculator: store a score, then use if / else if / else with >= to print the grade.',
      checks: [
        { label: 'An if statement', in: 'js', re: /\bif\s*\(/ },
        { label: 'At least one else if', in: 'js', re: /\belse\s+if\s*\(/ },
        { label: 'A final else', in: 'js', re: /\belse\s*\{/ },
        { label: 'Uses >= to compare', in: 'js', re: />=/ },
      ],
      hints: ['Check the highest grade first, then go down.'],
      quiz: [
        { q: 'What does 5 === "5" give?', options: ['false', 'true', 'undefined', 'an error'], why: '=== compares type too: number vs string.' },
        { q: 'Which condition is true only when both parts are true?', options: ['a && b', 'a || b', '!a', 'a === b'], why: '&& means "and".' },
        { q: 'In an if / else if chain, how many blocks run?', options: ['Only the first one whose condition is true', 'All true ones', 'All of them', 'Only the else'], why: 'The chain stops at the first true condition.' },
      ],
      oral: 'Walk through how your grade calculator decides what to print for a score of 65.',
    },
    {
      title: 'Loops', minutes: 75,
      content: `Loops repeat code.

## for loop
~~~
for (let i = 1; i <= 5; i++) {
  console.log("Day " + i);
}
~~~
Start, condition, step: start at 1, continue while i <= 5, add 1 each time.

## while loop
~~~
let balance = 1000;
while (balance > 0) {
  balance -= 300;
}
~~~
Make sure the condition becomes false eventually - otherwise the loop never ends.

## for...of - loop through a list
~~~
const counties = ["Nairobi", "Kisumu", "Nakuru"];
for (const county of counties) {
  console.log(county);
}
~~~

## break and continue
{{break}} leaves the loop; {{continue}} skips to the next repeat.`,
      example: { js: 'for (let i = 1; i <= 3; i++) {\n  console.log("Count: " + i);\n}' },
      challenge: 'Use a for loop to print the numbers 1 to 10 and add them up; print the total (55) after the loop.',
      checks: [
        { label: 'A for loop', in: 'js', re: /\bfor\s*\(\s*(let|var)\s+\w+\s*=/ },
        { label: 'Loops up to 10', in: 'js', re: /<=\s*10|<\s*11/ },
        { label: 'Adds to a total inside the loop', in: 'js', re: /\w+\s*\+=\s*\w+|\w+\s*=\s*\w+\s*\+\s*\w+/ },
        { label: 'Prints with console.log', in: 'js', re: /console\.log\s*\(/ },
      ],
      hints: ['let total = 0; before the loop, then total += i; inside it.'],
      quiz: [
        { q: 'How many times does for (let i = 0; i < 4; i++) run?', options: ['4', '3', '5', 'Forever'], why: 'i takes the values 0, 1, 2, 3.' },
        { q: 'What does break do inside a loop?', options: ['Stops the loop immediately', 'Skips one repeat', 'Restarts the loop', 'Pauses the program'], why: 'break exits the loop.' },
        { q: 'Which loop is simplest for going through every item of an array?', options: ['for...of', 'while(true)', 'do...nothing', 'switch'], why: 'for...of gives each item in turn.' },
      ],
      oral: 'What is an infinite loop, and how do you avoid writing one?',
    },
    {
      title: 'Changing the Page with the DOM', minutes: 90,
      content: `The DOM (Document Object Model) is the browser's model of your HTML. JavaScript uses it to find elements and change them.

## Finding elements
~~~
const title = document.getElementById("title");
const button = document.querySelector("#greet");
const items = document.querySelectorAll(".item");
~~~

## Changing elements
~~~
title.textContent = "Karibu!";
title.style.color = "green";
title.classList.add("highlight");
~~~
Use {{textContent}} for plain text. {{innerHTML}} reads HTML - never put text typed by users into innerHTML, because it can run harmful code (XSS).

## Reacting to events
~~~
button.addEventListener("click", function () {
  title.textContent = "You clicked the button!";
});
~~~
Common events: {{click}}, {{input}}, {{submit}}, {{change}}, {{keydown}}.`,
      example: { html: '<h2 id="message">Hello</h2>\n<button id="change">Change it</button>', js: 'const message = document.getElementById("message");\ndocument.getElementById("change").addEventListener("click", function () {\n  message.textContent = "Changed by JavaScript!";\n});' },
      challenge: 'Add a paragraph with an id and a button with an id. In JavaScript, when the button is clicked, change the paragraph\'s textContent.',
      checks: [
        { label: 'HTML: a <button> with an id', in: 'html', re: /<button[^>]*id\s*=\s*["'][^"']+["']/i },
        { label: 'HTML: an element with an id to change', in: 'html', re: /<(p|h[1-6]|div|span)[^>]*id\s*=\s*["'][^"']+["']/i },
        { label: 'JS finds elements (getElementById or querySelector)', in: 'js', re: /document\.(getElementById|querySelector)\s*\(/ },
        { label: 'JS listens for a click', in: 'js', re: /addEventListener\s*\(\s*["']click["']/ },
        { label: 'JS changes textContent', in: 'js', re: /\.textContent\s*=/ },
      ],
      hints: ['The id in getElementById("x") must match id="x" in the HTML - without a #.', 'Press the button in the preview to test it.'],
      quiz: [
        { q: 'Which method finds an element by its id?', options: ['document.getElementById("name")', 'document.findId("name")', 'document.id("name")', 'window.get("#name")'], why: 'getElementById finds the element with that id.' },
        { q: 'Why avoid putting user input into innerHTML?', options: ['It can run harmful code (XSS)', 'It is slower to type', 'It only works in Chrome', 'It deletes the page'], why: 'innerHTML parses HTML, including scripts and event attributes.' },
        { q: 'Which event happens when a button is pressed?', options: ['click', 'press', 'load', 'hover'], why: 'The click event fires on press.' },
      ],
      oral: 'Explain what the DOM is and how JavaScript uses it to react to a button click.',
    },
  ],
};

const M106 = {
  id: 106, order: 6, icon: '📊', color: '#a16207', difficulty: 'intermediate', hours: 25,
  title: 'JavaScript Data Types',
  description: 'Strings, numbers, booleans, arrays and objects - and converting between them safely.',
  lessons: [
    {
      title: 'Primitive Data Types', minutes: 60,
      content: `Every value in JavaScript has a type.

- {{string}} - text: {{"Mombasa"}}, {{'KSh'}}
- {{number}} - whole or decimal numbers: {{42}}, {{3.5}}
- {{boolean}} - {{true}} or {{false}}
- {{undefined}} - a variable that has no value yet
- {{null}} - "intentionally empty"
- {{bigint}} and {{symbol}} - for special cases

## Checking a type
~~~
console.log(typeof "hello");   string
console.log(typeof 7);         number
console.log(typeof true);      boolean
console.log(typeof undefined); undefined
console.log(typeof null);      object (a famous old bug!)
~~~

JavaScript is dynamically typed: the same variable can hold different types over time. That is flexible but can cause bugs, so keep each variable to one type.`,
      example: { js: 'const city = "Eldoret";\nconst altitude = 2100;\nconst isCold = true;\nconsole.log(typeof city, typeof altitude, typeof isCold);' },
      challenge: 'Create variables holding a string, a number, a boolean and null, and print the typeof each one.',
      checks: [
        { label: 'A string value', in: 'js', re: /=\s*["'`][^"'`]*["'`]/ },
        { label: 'A number value', in: 'js', re: /=\s*-?\d+(\.\d+)?\s*;?/ },
        { label: 'A boolean value', in: 'js', re: /=\s*(true|false)\b/ },
        { label: 'A null value', in: 'js', re: /=\s*null\b/ },
        { label: 'Uses typeof', in: 'js', re: /\btypeof\b/ },
      ],
      hints: ['console.log(typeof myVariable);'],
      quiz: [
        { q: 'What type is "25"?', options: ['string', 'number', 'boolean', 'undefined'], why: 'Quotes make it a string.' },
        { q: 'A variable declared with let x; has what value?', options: ['undefined', 'null', '0', 'an empty string'], why: 'Declared but not assigned = undefined.' },
        { q: 'What does typeof true return?', options: ['"boolean"', '"true"', '"string"', '"bool"'], why: 'true is a boolean.' },
      ],
      oral: 'What is the difference between null and undefined?',
    },
    {
      title: 'Working with Strings', minutes: 60,
      content: `Strings have many useful properties and methods:

~~~
const fullName = "  Achieng Otieno  ";
const clean = fullName.trim();              "Achieng Otieno"
console.log(clean.length);                  14
console.log(clean.toUpperCase());           "ACHIENG OTIENO"
console.log(clean.slice(0, 7));             "Achieng"
console.log(clean.includes("Otieno"));      true
console.log(clean.split(" "));              ["Achieng", "Otieno"]
console.log(clean.replace("Otieno", "O."));  "Achieng O."
~~~

- Positions start at 0.
- Strings are immutable: methods return a new string, they do not change the original.
- {{trim()}} is essential for cleaning input typed by users.`,
      example: { js: 'const course = "web development";\nconsole.log(course.toUpperCase());\nconsole.log(course.length);' },
      challenge: 'Store a full name with extra spaces. Print it trimmed, in uppercase, its length, and the first name using split.',
      checks: [
        { label: 'Uses trim()', in: 'js', re: /\.trim\s*\(\s*\)/ },
        { label: 'Uses toUpperCase()', in: 'js', re: /\.toUpperCase\s*\(\s*\)/ },
        { label: 'Uses .length', in: 'js', re: /\.length\b/ },
        { label: 'Uses split', in: 'js', re: /\.split\s*\(/ },
      ],
      hints: ['name.trim().split(" ")[0] gives the first word.'],
      quiz: [
        { q: 'What does "Kenya".length return?', options: ['5', '4', '6', '"Kenya"'], why: 'K-e-n-y-a is 5 characters.' },
        { q: 'What does "Nairobi".slice(0, 4) return?', options: ['"Nair"', '"Nairo"', '"airo"', '"bi"'], why: 'From position 0 up to (not including) 4.' },
        { q: 'After name.toUpperCase(), is name changed?', options: ['No - a new string is returned', 'Yes', 'Only the first letter', 'It becomes undefined'], why: 'Strings are immutable.' },
      ],
      oral: 'Why is trim() important when processing what users type into a form?',
    },
    {
      title: 'Numbers and the Math Object', minutes: 60,
      content: `## Number pitfalls
~~~
console.log(0.1 + 0.2);         0.30000000000000004
console.log((0.1 + 0.2).toFixed(2));   "0.30"
~~~
Computers store decimals approximately. For money, round with {{toFixed(2)}} for display, or calculate in whole cents/shillings.

## Converting text to numbers
~~~
Number("42")        42
parseInt("42px")    42
parseFloat("3.5kg") 3.5
Number("abc")       NaN  (Not a Number)
Number.isNaN(value) check for NaN
~~~

## The Math object
~~~
Math.round(4.6)   5
Math.floor(4.6)   4
Math.ceil(4.1)    5
Math.max(3, 9, 2) 9
Math.random()     a decimal from 0 up to (not including) 1
Math.floor(Math.random() * 6) + 1    a dice roll from 1 to 6
~~~`,
      example: { js: 'const price = 1250;\nconst vat = price * 0.16;\nconsole.log("VAT: " + vat.toFixed(2));' },
      challenge: 'Calculate 16% VAT on a price and print it with toFixed(2), then simulate a dice roll from 1 to 6 with Math.floor and Math.random.',
      checks: [
        { label: 'Multiplies by 0.16 (16% VAT)', in: 'js', re: /\*\s*0?\.16\b|0?\.16\s*\*/ },
        { label: 'Uses toFixed(2)', in: 'js', re: /\.toFixed\s*\(\s*2\s*\)/ },
        { label: 'Uses Math.floor', in: 'js', re: /Math\.floor\s*\(/ },
        { label: 'Uses Math.random', in: 'js', re: /Math\.random\s*\(\s*\)/ },
      ],
      hints: ['Math.floor(Math.random() * 6) + 1'],
      quiz: [
        { q: 'What does Math.floor(7.9) return?', options: ['7', '8', '7.9', '0'], why: 'floor rounds down.' },
        { q: 'What is Number("hello")?', options: ['NaN', '0', '"hello"', 'undefined'], why: 'Text that is not a number becomes NaN.' },
        { q: 'How should you show a money amount with two decimals?', options: ['amount.toFixed(2)', 'Math.round(amount, 2)', 'amount.decimals(2)', 'String(amount, 2)'], why: 'toFixed(2) formats with exactly two decimal places.' },
      ],
      oral: 'Why does 0.1 + 0.2 not exactly equal 0.3, and how do you handle money safely?',
    },
    {
      title: 'Arrays', minutes: 75,
      content: `An array stores an ordered list of values.

~~~
const counties = ["Nairobi", "Mombasa", "Kisumu"];
console.log(counties[0]);        "Nairobi" (positions start at 0)
console.log(counties.length);    3
counties.push("Nakuru");         add to the end
counties.pop();                  remove from the end
console.log(counties.indexOf("Kisumu"));   2
console.log(counties.includes("Embu"));     false
~~~

## Powerful array methods
~~~
const prices = [120, 450, 80, 300];
prices.forEach(p => console.log(p));               do something with each
const withVat = prices.map(p => p * 1.16);         new array, every item changed
const cheap = prices.filter(p => p < 200);         new array, only matching items
const total = prices.reduce((sum, p) => sum + p, 0);   combine into one value
~~~
{{map}}, {{filter}} and {{reduce}} do not change the original array - they return new values.`,
      example: { js: 'const fruits = ["mango", "banana"];\nfruits.push("pawpaw");\nconsole.log(fruits.length);' },
      challenge: 'Make an array of 5 counties, push a sixth, use filter to keep names longer than 6 letters, and print each kept name with forEach.',
      checks: [
        { label: 'An array of at least 5 strings', in: 'js', re: /\[\s*(["'][^"']*["']\s*,\s*){4,}["'][^"']*["']/ },
        { label: 'Uses push', in: 'js', re: /\.push\s*\(/ },
        { label: 'Uses filter', in: 'js', re: /\.filter\s*\(/ },
        { label: 'Uses forEach', in: 'js', re: /\.forEach\s*\(/ },
      ],
      hints: ['const long = counties.filter(c => c.length > 6);'],
      quiz: [
        { q: 'What is the index of the first item in an array?', options: ['0', '1', '-1', 'first'], why: 'Arrays are zero-indexed.' },
        { q: 'Which method returns a new array with only the matching items?', options: ['filter', 'map', 'push', 'forEach'], why: 'filter keeps items that pass the test.' },
        { q: 'What does [1, 2, 3].map(n => n * 2) return?', options: ['[2, 4, 6]', '[1, 2, 3]', '12', '6'], why: 'map transforms every item.' },
      ],
      oral: 'Explain the difference between map, filter and forEach with an example from a shop.',
    },
    {
      title: 'Objects and JSON', minutes: 75,
      content: `Objects group related data using named properties (key: value).

~~~
const student = {
  name: "Kiprono",
  age: 24,
  courses: ["HTML", "CSS"],
  greet() {
    return "Hi, I am " + this.name;
  }
};
console.log(student.name);          dot notation
console.log(student["age"]);        bracket notation
student.email = "k@example.com";    add a property
console.log(student.greet());
~~~

## Arrays of objects
Real data is usually a list of objects:
~~~
const products = [
  { name: "Maize flour", price: 180 },
  { name: "Sugar", price: 220 }
];
~~~

## JSON
JSON (JavaScript Object Notation) is the text format used to send data between servers and browsers.
~~~
const text = JSON.stringify(student);   object -> JSON text
const back = JSON.parse(text);          JSON text -> object
~~~
In JSON, keys and strings must use double quotes.`,
      example: { js: 'const car = { make: "Toyota", year: 2018 };\nconsole.log(car.make);\nconsole.log(JSON.stringify(car));' },
      challenge: 'Create a student object with a name, an age and a courses array. Print one property with dot notation and the whole object with JSON.stringify.',
      checks: [
        { label: 'An object literal with properties', in: 'js', re: /=\s*\{\s*["']?\w+["']?\s*:/ },
        { label: 'A property that is an array', in: 'js', re: /\w+["']?\s*:\s*\[/ },
        { label: 'Dot notation access', in: 'js', re: /\b[a-zA-Z_$][\w$]*\.(?!log|stringify|parse)[a-zA-Z_$][\w$]*\b/ },
        { label: 'Uses JSON.stringify', in: 'js', re: /JSON\.stringify\s*\(/ },
      ],
      hints: ['const student = { name: "...", age: 20, courses: ["HTML"] };'],
      quiz: [
        { q: 'How do you read the price property of item?', options: ['item.price', 'item->price', 'item(price)', 'price.item'], why: 'Dot notation reads properties.' },
        { q: 'What does JSON.parse do?', options: ['Turns JSON text into an object', 'Turns an object into text', 'Sends data to a server', 'Deletes an object'], why: 'parse reads JSON text.' },
        { q: 'Which is valid JSON?', options: ['{"name": "Ali"}', "{name: 'Ali'}", "{'name': 'Ali'}", '{name = "Ali"}'], why: 'JSON keys and strings need double quotes.' },
      ],
      oral: 'Describe how a list of products could be stored as an array of objects and sent as JSON.',
    },
    {
      title: 'Type Conversion and Comparison', minutes: 60,
      content: `JavaScript sometimes converts types automatically (coercion), which can surprise you:

~~~
console.log("5" + 2);    "52"  (+ joins strings)
console.log("5" - 2);    3     (- converts to numbers)
console.log("5" == 5);   true  (loose equality converts types)
console.log("5" === 5);  false (strict equality - no conversion)
~~~
Always use {{===}} and {{!==}}.

## Converting on purpose
~~~
Number("42") + 8      50
String(2026)          "2026"
Boolean("")           false
~~~

## Truthy and falsy
These values count as false in an {{if}}: {{false}}, {{0}}, {{""}}, {{null}}, {{undefined}}, {{NaN}}. Everything else is truthy.

~~~
const input = "";
if (!input) {
  console.log("Please fill in the field");
}
~~~
Values read from forms are always strings - convert them before doing maths.`,
      example: { js: 'const fromForm = "15";\nconst quantity = Number(fromForm);\nconsole.log(quantity + 5);' },
      challenge: 'Convert the string "42" to a number with Number(), add 8, and check with === that the result equals 50. Also test an empty string with an if.',
      checks: [
        { label: 'Converts with Number()', in: 'js', re: /Number\s*\(\s*["']42["']\s*\)|Number\s*\(/ },
        { label: 'Compares with ===', in: 'js', re: /===/ },
        { label: 'Checks 50', in: 'js', re: /===\s*50|50\s*===/ },
        { label: 'An if that tests a value', in: 'js', re: /\bif\s*\(/ },
      ],
      hints: ['console.log(Number("42") + 8 === 50);'],
      quiz: [
        { q: 'What is "3" + 4 in JavaScript?', options: ['"34"', '7', '"7"', 'NaN'], why: '+ with a string joins text.' },
        { q: 'Which value is falsy?', options: ['0', '"0"', '[]', '"false"'], why: '0 is falsy; non-empty strings and arrays are truthy.' },
        { q: 'Why convert form values before doing maths?', options: ['Form values are always strings', 'Forms only send numbers', 'It makes the page faster', 'It is not needed'], why: 'input.value is always a string.' },
      ],
      oral: 'Explain why === is safer than == with an example that goes wrong.',
    },
  ],
};

const M107 = {
  id: 107, order: 7, icon: '🔧', color: '#475569', difficulty: 'intermediate', hours: 20,
  title: 'JavaScript Functions',
  description: 'Reusable code with functions: parameters, return values, arrow functions, scope, callbacks and errors.',
  lessons: [
    {
      title: 'Declaring and Calling Functions', minutes: 60,
      content: `A function is a named, reusable block of code.

~~~
function calculateArea(width, height) {
  return width * height;
}

const area = calculateArea(4, 5);
console.log(area);   20
~~~

- {{width}} and {{height}} are parameters - placeholders for the values passed in.
- {{4}} and {{5}} are arguments - the actual values.
- {{return}} sends a value back and ends the function. Without return, a function gives {{undefined}}.
- Name functions with verbs: {{calculateTotal}}, {{showMessage}}, {{isValidEmail}}.

## Why use functions?
- Write once, use many times (DRY: Don't Repeat Yourself).
- Give a name to a piece of logic so code reads like a description.
- Test small pieces separately.`,
      example: { js: 'function greet(name) {\n  return "Hello, " + name + "!";\n}\nconsole.log(greet("Amina"));' },
      challenge: 'Write a function calculateArea(width, height) that returns the area, then call it and print the result.',
      checks: [
        { label: 'A function named calculateArea with two parameters', in: 'js', re: /function\s+calculateArea\s*\(\s*\w+\s*,\s*\w+\s*\)/ },
        { label: 'It returns a multiplication', in: 'js', re: /return\s+\w+\s*\*\s*\w+/ },
        { label: 'The function is called', in: 'js', re: /calculateArea\s*\(\s*[\d\w]+\s*,\s*[\d\w]+\s*\)[^{]*$/m },
        { label: 'The result is printed', in: 'js', re: /console\.log\s*\(/ },
      ],
      hints: ['console.log(calculateArea(3, 4)); should print 12.'],
      quiz: [
        { q: 'In function add(a, b), what are a and b?', options: ['Parameters', 'Arguments', 'Return values', 'Global variables'], why: 'Parameters are listed in the definition.' },
        { q: 'What does a function return if it has no return statement?', options: ['undefined', '0', 'null', 'false'], why: 'Without return, the result is undefined.' },
        { q: 'Which is the best function name?', options: ['calculateTotal', 'x', 'function1', 'stuff'], why: 'Descriptive verb names make code readable.' },
      ],
      oral: 'Explain the difference between parameters and arguments using your calculateArea function.',
    },
    {
      title: 'Function Expressions and Arrow Functions', minutes: 60,
      content: `Functions are values - you can store them in variables.

~~~
const square = function (n) {
  return n * n;
};
~~~

## Arrow functions
A shorter syntax, very common in modern code:
~~~
const square = (n) => n * n;          implicit return
const add = (a, b) => {
  const total = a + b;
  return total;                       a block needs return
};
const sayHi = () => console.log("Hi");
~~~

Arrow functions are perfect for short callbacks:
~~~
const prices = [100, 250, 400];
const doubled = prices.map(p => p * 2);
const big = prices.filter(p => p > 200);
~~~

Note: arrow functions do not have their own {{this}}, so use a normal function for object methods.`,
      example: { js: 'const double = n => n * 2;\nconsole.log([1, 2, 3].map(double));' },
      challenge: 'Write an arrow function square, then use it with map on an array of numbers and print the new array.',
      checks: [
        { label: 'An arrow function stored in a variable', in: 'js', re: /(const|let)\s+\w+\s*=\s*\(?\s*\w*\s*\)?\s*=>/ },
        { label: 'Uses map', in: 'js', re: /\.map\s*\(/ },
        { label: 'Prints the result', in: 'js', re: /console\.log\s*\(/ },
      ],
      hints: ['const square = n => n * n;  then  numbers.map(square)'],
      quiz: [
        { q: 'What does (x) => x + 1 return for 4?', options: ['5', '4', 'undefined', 'x + 1'], why: 'One-line arrow functions return the expression.' },
        { q: 'When does an arrow function need the return keyword?', options: ['When its body uses curly braces { }', 'Always', 'Never', 'Only with two parameters'], why: 'A block body needs an explicit return.' },
        { q: 'Which is NOT a valid arrow function?', options: ['=> x * 2', 'x => x * 2', '(a, b) => a + b', '() => 42'], why: 'An arrow function needs parameters (or empty brackets) before =>.' },
      ],
      oral: 'Compare a function declaration with an arrow function. When would you choose each?',
    },
    {
      title: 'Scope and Closures', minutes: 75,
      content: `## Scope
Scope decides where a variable can be used.
- Global scope: declared outside any function - visible everywhere (use sparingly).
- Function scope: declared inside a function - only visible there.
- Block scope: {{let}} and {{const}} inside {{{ }}} (if, for) only exist in that block.

~~~
const shop = "Duka";          global
function sell() {
  const item = "Soap";        only inside sell()
  if (true) {
    let qty = 2;              only inside this if block
  }
}
~~~

## Closures
A function remembers the variables from where it was created, even after the outer function has finished:

~~~
function makeCounter() {
  let count = 0;
  return function () {
    count++;
    return count;
  };
}
const next = makeCounter();
console.log(next());   1
console.log(next());   2
~~~
Closures keep data private - nothing outside can change {{count}} directly.`,
      example: { js: 'function makeGreeter(greeting) {\n  return function (name) {\n    return greeting + ", " + name;\n  };\n}\nconst hello = makeGreeter("Habari");\nconsole.log(hello("Juma"));' },
      challenge: 'Write makeCounter(): it keeps a count variable and returns a function that adds 1 and returns the new count. Call the returned function at least twice.',
      checks: [
        { label: 'A function makeCounter', in: 'js', re: /function\s+makeCounter\s*\(|makeCounter\s*=\s*(function|\()/ },
        { label: 'It has a count variable', in: 'js', re: /let\s+\w+\s*=\s*0/ },
        { label: 'It returns a function', in: 'js', re: /return\s+(function|\(\s*\)\s*=>|\w+\s*=>)/ },
        { label: 'The counter is called at least twice', in: 'js', re: /(\b\w+\s*\(\s*\)[\s\S]*){3}/ },
      ],
      hints: ['const next = makeCounter(); console.log(next()); console.log(next());'],
      quiz: [
        { q: 'A variable declared with let inside an if block is visible...', options: ['Only inside that block', 'In the whole file', 'In every function', 'Only after the block'], why: 'let and const are block-scoped.' },
        { q: 'What is a closure?', options: ['A function that remembers variables from where it was created', 'A function with no parameters', 'A way to close the browser', 'A loop that ends'], why: 'Closures capture their surrounding variables.' },
        { q: 'Why avoid many global variables?', options: ['Any code can change them, causing hard-to-find bugs', 'They are slower to type', 'They are not allowed', 'They use more colours'], why: 'Globals can clash and be changed from anywhere.' },
      ],
      oral: 'Explain how your counter keeps its count private.',
    },
    {
      title: 'Callbacks, Timers and Events', minutes: 75,
      content: `A callback is a function passed to another function, to be called later.

## Timers
~~~
setTimeout(function () {
  console.log("1 second later");
}, 1000);

const id = setInterval(() => console.log("tick"), 2000);
clearInterval(id);    stop it
~~~
Times are in milliseconds (1000 ms = 1 s). Code after setTimeout runs immediately - the callback runs later.

## Events use callbacks
~~~
document.getElementById("buy").addEventListener("click", () => {
  console.log("Added to cart");
});
~~~

## Callbacks in your own functions
~~~
function processOrder(order, onDone) {
  console.log("Processing " + order);
  onDone(order);
}
processOrder("Order 17", (o) => console.log(o + " complete"));
~~~
Later you will meet Promises and async/await, which make working with delayed results easier.`,
      example: { js: 'console.log("Start");\nsetTimeout(() => console.log("Done waiting"), 1000);\nconsole.log("End");' },
      challenge: 'Use setTimeout to print a message after 1 second, and add a click event listener to a button in your HTML that prints a message.',
      checks: [
        { label: 'Uses setTimeout with a delay', in: 'js', re: /setTimeout\s*\([\s\S]*,\s*\d+\s*\)/ },
        { label: 'HTML has a <button>', in: 'html', re: /<button[^>]*>/i },
        { label: 'A click event listener with a callback', in: 'js', re: /addEventListener\s*\(\s*["']click["']\s*,\s*(function|\(|\w+\s*=>|\w+\s*\))/ },
      ],
      hints: ['setTimeout(() => console.log("Hi"), 1000);'],
      quiz: [
        { q: 'What is a callback?', options: ['A function passed to another function to run later', 'A phone call from the server', 'A function that calls itself', 'An error message'], why: 'Callbacks are functions given to other functions.' },
        { q: 'setTimeout(fn, 2000) runs fn after...', options: ['2 seconds', '2000 seconds', '2 minutes', 'immediately'], why: 'Delays are in milliseconds.' },
        { q: 'In the example, which line prints first: "End" or "Done waiting"?', options: ['"End"', '"Done waiting"', 'They print together', 'Neither'], why: 'setTimeout does not block; "End" prints first.' },
      ],
      oral: 'Explain why "End" prints before "Done waiting" in the example.',
    },
    {
      title: 'Writing Reliable Functions', minutes: 75,
      content: `## Default parameters
~~~
function greet(name = "friend") {
  return "Hello, " + name;
}
greet();   "Hello, friend"
~~~

## Pure functions
A pure function returns the same output for the same input and does not change anything outside itself. Pure functions are easy to test and reuse.

## Handling errors
~~~
function divide(a, b) {
  if (b === 0) {
    throw new Error("Cannot divide by zero");
  }
  return a / b;
}

try {
  console.log(divide(10, 0));
} catch (error) {
  console.log("Problem: " + error.message);
} finally {
  console.log("Calculation finished");
}
~~~
- {{throw}} signals a problem.
- {{try}} runs code that might fail; {{catch}} handles the error so the program keeps working.
- Check inputs at the start of a function (guard clauses) and give clear error messages.`,
      example: { js: 'function percent(part, total = 100) {\n  return (part / total) * 100;\n}\nconsole.log(percent(25));' },
      challenge: 'Write divide(a, b) that throws an Error when b is 0. Call it inside try / catch and print the error message. Use a default parameter in any function.',
      checks: [
        { label: 'A divide function', in: 'js', re: /function\s+divide\s*\(|divide\s*=\s*(function|\()/ },
        { label: 'Throws an Error', in: 'js', re: /throw\s+new\s+Error\s*\(/ },
        { label: 'Uses try and catch', in: 'js', re: /try\s*\{[\s\S]*\}\s*catch\s*\(/ },
        { label: 'A default parameter', in: 'js', re: /function\s*\w*\s*\([^)]*\w+\s*=(?!=)\s*[^)]+\)|\(\s*[^)]*\w+\s*=(?!=)\s*[^)]+\)\s*=>/ },
      ],
      hints: ['if (b === 0) { throw new Error("Cannot divide by zero"); }'],
      quiz: [
        { q: 'What does catch do?', options: ['Handles an error so the program can continue', 'Creates an error', 'Repeats the code', 'Stops the browser'], why: 'catch receives the thrown error.' },
        { q: 'Which function is pure?', options: ['const add = (a, b) => a + b;', 'A function that changes a global total', 'A function that prints and changes the page', 'A function that returns a random number'], why: 'Same input, same output, no side effects.' },
        { q: 'greet(name = "friend") is called as greet(). What is name?', options: ['"friend"', 'undefined', 'null', 'An error'], why: 'The default value is used.' },
      ],
      oral: 'Why is it better to throw a clear error than to let a function return a wrong answer silently?',
    },
  ],
};

const M108 = {
  id: 108, order: 8, icon: '📚', color: '#0769ad', difficulty: 'advanced', hours: 25,
  title: 'JavaScript Libraries',
  description: 'Using a library (jQuery) for selections, events, effects and data - then a complete final project.',
  lessons: [
    {
      title: 'What is a Library? Getting Started with jQuery', minutes: 60,
      content: `A library is ready-made code you add to your project so you do not have to write everything yourself. jQuery is one of the most widely used JavaScript libraries and is still found on millions of websites.

## Adding jQuery
~~~
<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
<script src="app.js"></script>
~~~
(In this course jQuery is already loaded in the preview.)

## The $ function
~~~
$(function () {
  $("#title").text("Page ready!");
});
~~~
- {{$(...)}} selects elements using CSS selectors.
- {{$(function () { ... })}} runs your code when the page has loaded (document ready).

## Library vs framework
- A library: you call it when you need it (jQuery, Chart.js).
- A framework: it calls your code and decides the structure (React, Angular, Vue).

Modern browsers can do much of what jQuery does with plain JavaScript, but understanding jQuery helps you maintain existing sites.`,
      example: { html: '<h2 id="title">Loading...</h2>', js: '$(function () {\n  $("#title").text("jQuery is working!");\n});' },
      challenge: 'Add an element with id="title". Use jQuery document ready ($(function(){...})) to change its text with .text().',
      checks: [
        { label: 'HTML has an element with id="title"', in: 'html', re: /id\s*=\s*["']title["']/i },
        { label: 'Uses document ready', in: 'js', re: /\$\s*\(\s*(function\s*\(|\(\s*\)\s*=>)|\$\s*\(\s*document\s*\)\s*\.ready\s*\(/ },
        { label: 'Selects #title with $', in: 'js', re: /\$\s*\(\s*["']#title["']\s*\)/ },
        { label: 'Changes it with .text()', in: 'js', re: /\.text\s*\(\s*["'`]/ },
      ],
      hints: ['$("#title").text("New text");'],
      quiz: [
        { q: 'What is a JavaScript library?', options: ['Ready-made code you call from your project', 'A place to borrow books', 'A type of database', 'A browser'], why: 'Libraries provide reusable functions.' },
        { q: 'What does $("#menu") select?', options: ['The element with id="menu"', 'All menus', 'Elements with class="menu"', 'The <menu> tag only'], why: 'jQuery uses CSS selectors: # is an id.' },
        { q: 'What is the main difference between a library and a framework?', options: ['You call a library; a framework calls your code', 'Libraries are always bigger', 'Frameworks cannot be used on websites', 'There is no difference'], why: 'This is called "inversion of control".' },
      ],
      oral: 'Explain what jQuery is and why many existing websites still use it.',
    },
    {
      title: 'Selecting and Changing Elements with jQuery', minutes: 75,
      content: `## Selecting
~~~
$("p")              every paragraph
$(".product")       every element with class="product"
$("#cart li")       list items inside #cart
~~~
jQuery methods work on every selected element at once.

## Reading and changing content
~~~
$("#price").text("KSh 500");                  plain text
$("#info").html("<strong>In stock</strong>");  HTML (only trusted content!)
$("input#name").val();                        read a form value
~~~

## Styles and classes
~~~
$("h1").css("color", "darkgreen");
$(".card").addClass("highlight");
$(".card").removeClass("highlight");
$(".card").toggleClass("open");
~~~

## Adding and removing elements
~~~
$("#list").append("<li>New item</li>");
$("#list li:first").remove();
~~~

Chaining: {{$("h1").addClass("big").css("color", "navy");}}`,
      example: { html: '<ul id="list">\n  <li>Bread</li>\n</ul>', js: '$(function () {\n  $("#list").append("<li>Milk</li>");\n});' },
      challenge: 'Using jQuery: add a class to an element with addClass, change a style with .css(), and append a new li to a list.',
      checks: [
        { label: 'HTML has a list (<ul> or <ol>)', in: 'html', re: /<(ul|ol)[^>]*>/i },
        { label: 'Uses .addClass()', in: 'js', re: /\.addClass\s*\(/ },
        { label: 'Uses .css()', in: 'js', re: /\.css\s*\(/ },
        { label: 'Uses .append()', in: 'js', re: /\.append\s*\(\s*["'`]\s*<li/ },
      ],
      hints: ['$("#list").append("<li>New item</li>");'],
      quiz: [
        { q: 'Which jQuery method reads the value typed into an input?', options: ['.val()', '.text()', '.value', '.input()'], why: '.val() gets and sets form values.' },
        { q: 'What does $(".item").addClass("done") affect?', options: ['Every element with class="item"', 'Only the first .item', 'The page title', 'Nothing until reload'], why: 'jQuery methods apply to all selected elements.' },
        { q: 'Which method adds content at the end inside an element?', options: ['.append()', '.prepend()', '.remove()', '.after()'], why: 'append adds inside, at the end.' },
      ],
      oral: 'What is method chaining in jQuery? Give an example.',
    },
    {
      title: 'Handling Events with jQuery', minutes: 60,
      content: `~~~
$("#toggle").on("click", function () {
  $("#details").toggle();
});
~~~

- {{.on("click", handler)}} is the recommended way to attach events ({{.click()}} is a shortcut).
- Inside the handler, {{$(this)}} is the element that was clicked.
- {{event.preventDefault()}} stops the browser's default action, such as submitting a form or following a link.

~~~
$("#signup").on("submit", function (event) {
  event.preventDefault();
  const email = $("#email").val().trim();
  if (!email.includes("@")) {
    $("#error").text("Please enter a valid email");
  }
});

$(".tab").on("click", function () {
  $(".tab").removeClass("active");
  $(this).addClass("active");
});
~~~

## Showing and hiding
{{.show()}}, {{.hide()}} and {{.toggle()}}.`,
      example: { html: '<button id="btn">Show / hide</button>\n<p id="secret">Surprise!</p>', js: '$(function () {\n  $("#btn").on("click", function () {\n    $("#secret").toggle();\n  });\n});' },
      challenge: 'Add a button and a paragraph. With jQuery, make the button show and hide the paragraph using .on("click") and .toggle().',
      checks: [
        { label: 'HTML has a <button>', in: 'html', re: /<button[^>]*>/i },
        { label: 'Uses .on("click") or .click()', in: 'js', re: /\.on\s*\(\s*["']click["']|\.click\s*\(\s*(function|\()/ },
        { label: 'Uses .toggle() (or .show()/.hide())', in: 'js', re: /\.(toggle|show|hide)\s*\(/ },
      ],
      hints: ['Put your code inside $(function () { ... }) so the elements exist.'],
      quiz: [
        { q: 'Inside a jQuery click handler, what is $(this)?', options: ['The element that was clicked', 'The whole page', 'The window', 'The first button on the page'], why: 'this refers to the element that received the event.' },
        { q: 'What does event.preventDefault() do on a form submit?', options: ['Stops the form from sending and reloading the page', 'Deletes the form', 'Submits twice', 'Clears the inputs'], why: 'It cancels the browser\'s default action.' },
        { q: 'Which method shows an element if hidden and hides it if shown?', options: ['.toggle()', '.show()', '.switch()', '.flip()'], why: 'toggle switches visibility.' },
      ],
      oral: 'Describe how you would validate a form with jQuery before it is sent.',
    },
    {
      title: 'Effects and Animation', minutes: 60,
      content: `jQuery includes simple animations:

~~~
$("#notice").fadeOut(600);
$("#notice").fadeIn("slow");
$("#menu").slideToggle(300);
$("#box").animate({ width: "300px", opacity: 0.5 }, 800);
~~~

- Durations are in milliseconds or the words "slow" and "fast".
- Most effects accept a callback that runs when the animation finishes:

~~~
$("#alert").fadeOut(400, function () {
  $(this).remove();
});
~~~

## Use animation with care
- Keep animations short (200-500 ms) and purposeful.
- Some people feel unwell with a lot of motion - respect the {{prefers-reduced-motion}} setting for large animations.
- Modern CSS transitions ({{transition: opacity 0.3s}}) are often smoother and need no library.`,
      example: { html: '<button id="hide">Hide</button>\n<div id="box" style="background:#bae6fd;padding:20px">Box</div>', js: '$(function () {\n  $("#hide").on("click", function () {\n    $("#box").fadeOut(500);\n  });\n});' },
      challenge: 'Use jQuery to fade out an element when a button is clicked, and use slideToggle on another button to show and hide a menu.',
      checks: [
        { label: 'Uses .fadeOut() or .fadeIn()', in: 'js', re: /\.fade(Out|In|Toggle)\s*\(/ },
        { label: 'Uses .slideToggle()', in: 'js', re: /\.slideToggle\s*\(/ },
        { label: 'Effects run on click', in: 'js', re: /\.on\s*\(\s*["']click["']|\.click\s*\(/ },
      ],
      hints: ['$("#menu").slideToggle(300);'],
      quiz: [
        { q: 'What is a good duration for a small interface animation?', options: ['About 200-500 ms', '5 seconds', '30 seconds', 'As long as possible'], why: 'Short animations feel responsive.' },
        { q: 'How do you run code after fadeOut finishes?', options: ['Pass a callback function', 'Use a for loop', 'Call it twice', 'It is not possible'], why: 'Effects accept a completion callback.' },
        { q: 'Which can often replace simple jQuery fades?', options: ['CSS transitions', 'HTML tables', 'JSON', 'Media queries only'], why: 'CSS transitions animate without a library.' },
      ],
      oral: 'When is animation helpful on a website, and when is it harmful?',
    },
    {
      title: 'Working with Data (AJAX and JSON)', minutes: 75,
      content: `AJAX lets a page load data from a server without reloading. Data usually arrives as JSON.

~~~
$.getJSON("/api/products", function (products) {
  $.each(products, function (index, product) {
    $("#products").append("<li>" + product.name + "</li>");
  });
}).fail(function () {
  $("#error").text("Could not load products. Please try again.");
});
~~~

## Building a page from data
Whether data comes from a server or is already in your code, the pattern is the same: loop over it and add elements.

~~~
const products = [
  { name: "Maize flour 2kg", price: 180 },
  { name: "Cooking oil 1L", price: 350 }
];
$.each(products, function (i, p) {
  $("#list").append($("<li>").text(p.name + " - KSh " + p.price));
});
~~~
Using {{$("<li>").text(...)}} is safer than building HTML strings, because text is never treated as code.

## The modern alternative
~~~
fetch("/api/products")
  .then(response => response.json())
  .then(products => console.log(products));
~~~
Always handle errors - networks fail, especially on mobile data.`,
      example: { html: '<ul id="list"></ul>', js: 'const towns = ["Nyeri", "Kitale"];\n$(function () {\n  $.each(towns, function (i, town) {\n    $("#list").append($("<li>").text(town));\n  });\n});' },
      challenge: 'Store an array of product objects (name and price). Use $.each to append an li for each product to a list in your HTML, showing name and price.',
      checks: [
        { label: 'HTML has a list to fill', in: 'html', re: /<(ul|ol)[^>]*id\s*=\s*["'][^"']+["']/i },
        { label: 'An array of objects with name and price', in: 'js', re: /\[\s*\{[^}]*name\s*:[^}]*price\s*:|\[\s*\{[^}]*price\s*:[^}]*name\s*:/ },
        { label: 'Uses $.each', in: 'js', re: /\$\.each\s*\(/ },
        { label: 'Appends list items', in: 'js', re: /\.append\s*\(/ },
      ],
      hints: ['Inside $.each(products, function (i, p) { ... }) use p.name and p.price.'],
      quiz: [
        { q: 'What does AJAX allow?', options: ['Loading data without reloading the page', 'Styling the page', 'Creating databases', 'Writing HTML faster'], why: 'AJAX requests data in the background.' },
        { q: 'Why use $("<li>").text(value) instead of building an HTML string?', options: ['Text is never run as code, so it is safer', 'It is shorter', 'It is required by JSON', 'It loads faster from the server'], why: 'It prevents XSS from untrusted data.' },
        { q: 'Why add .fail() or error handling to data requests?', options: ['Networks can fail and users need a message', 'It makes requests faster', 'It is decorative', 'Servers never fail'], why: 'Always plan for failure.' },
      ],
      oral: 'Explain how a shopping site could load its product list with AJAX and what should happen if the network fails.',
    },
    {
      title: 'Final Project: Your Portfolio Website', minutes: 240,
      content: `Bring everything together in a one-page portfolio you can show employers and clients.

## Requirements
- Semantic structure: {{header}} with your name and a {{nav}}, {{main}} with sections (About, Skills, Projects, Contact), and a {{footer}}.
- A projects section using cards laid out with Flexbox.
- Responsive design: a media query that stacks the cards on small screens.
- A contact form with labelled inputs.
- Interaction with JavaScript or jQuery: for example a button that shows more details, a dark-mode toggle, or form validation.

## Professional checklist
- Every image has alt text; headings are in order.
- Colours have good contrast; text is easy to read on a phone.
- File names are lowercase; code is indented and commented.
- Test in two browsers and on a phone-sized screen.

## Next steps
Publish your site for free with GitHub Pages or Netlify, add it to your CV, and keep improving it as you learn.`,
      example: { html: '<header>\n  <h1>Your Name</h1>\n  <nav><a href="#projects">Projects</a> <a href="#contact">Contact</a></nav>\n</header>\n<main>\n  <section id="projects">\n    <h2>Projects</h2>\n    <div class="cards">\n      <article class="card">Project 1</article>\n      <article class="card">Project 2</article>\n    </div>\n  </section>\n</main>\n<footer>&copy; 2026</footer>', css: '.cards { display: flex; gap: 16px; }\n@media (max-width: 600px) { .cards { flex-direction: column; } }', js: 'document.querySelector("h1").addEventListener("click", () => console.log("Hello!"));' },
      challenge: 'Build your portfolio page: header with nav, main with at least two sections, a footer, a Flexbox card layout with a media query, a labelled contact form, and at least one JavaScript or jQuery interaction.',
      checks: [
        { label: 'A <header> with a <nav>', in: 'html', re: /<header[^>]*>[\s\S]*<nav[\s\S]*<\/header>/i },
        { label: 'A <main> with at least two <section>s', in: 'html', re: /<main[^>]*>([\s\S]*<section[^>]*>){2}[\s\S]*<\/main>/i },
        { label: 'A <footer>', in: 'html', re: /<footer[^>]*>[\s\S]*<\/footer>/i },
        { label: 'A form with a label', in: 'html', re: /<form[^>]*>[\s\S]*<label[\s\S]*<\/form>/i },
        { label: 'Flexbox layout', in: 'css', re: /display\s*:\s*flex/i },
        { label: 'A media query', in: 'css', re: /@media[^{]*\{/i },
        { label: 'JavaScript or jQuery interaction', in: 'js', re: /addEventListener\s*\(|\.on\s*\(\s*["']\w+["']|\.click\s*\(/ },
      ],
      hints: ['Start from the example and add one requirement at a time - press Check after each step.'],
      quiz: [
        { q: 'Which element should wrap your site\'s main navigation links?', options: ['<nav>', '<aside>', '<footer>', '<table>'], why: 'nav marks the main navigation.' },
        { q: 'What makes your card layout stack on phones?', options: ['A media query that sets flex-direction: column', 'Adding more <br> tags', 'Making images bigger', 'Using a table'], why: 'Media queries adapt the layout.' },
        { q: 'Which is a free way to publish a static website?', options: ['GitHub Pages', 'Sending the HTML by SMS', 'Printing it', 'Saving it to a USB stick'], why: 'GitHub Pages and Netlify host static sites for free.' },
      ],
      oral: 'Present your portfolio: explain its structure, how it adapts to phones, and one interactive feature you built.',
    },
  ],
};

module.exports = { M105, M106, M107, M108 };
