'use strict';
/**
 * Adult course - Part 1: HTML (modules 101-103).
 *
 * Lesson format (see adultCourse/index.js):
 *   title, minutes      lesson name and suggested study time
 *   content             explanation. Formatting: "## " headings, "- " bullets,
 *                       ~~~ fenced code blocks, {{inline code}}
 *   example             { html, css, js } starter code ("Load example")
 *   challenge           the practical task
 *   checks              [{ label, in: 'html'|'css'|'js', re }] - all must pass for the practical test
 *   hints               short tips
 *   quiz                written test: [{ q, options: [correct, ...wrong], why }]
 *   oral                a question to explain aloud (oral test practice)
 */

const M101 = {
  id: 101, order: 1, icon: '📄', color: '#e34c26', difficulty: 'beginner', hours: 20,
  title: 'HTML Basics',
  description: 'What HTML is, how a web page is built, and how to create, save and view your first pages.',
  lessons: [
    {
      title: 'What is HTML?', minutes: 45,
      content: `HTML (HyperText Markup Language) is the language used to describe the structure of every web page. It is not a programming language - it does not make decisions or calculate. Instead it marks up content so the browser knows what each part is: a heading, a paragraph, a list, a picture or a link.

## How a web page reaches you
- A web server stores HTML files.
- Your browser (Chrome, Firefox, Edge, Safari) downloads the file.
- The browser reads the HTML and draws (renders) the page.

## Tags and elements
HTML uses tags written inside angle brackets. Most tags come in pairs: an opening tag {{<p>}} and a closing tag {{</p>}}. The opening tag, the content and the closing tag together make an element.

~~~
<h1>Karibu!</h1>
<p>This is my first web page.</p>
~~~

## The three web languages
- HTML - structure and meaning (this course starts here)
- CSS - presentation: colours, fonts, layout
- JavaScript - behaviour: reacting to clicks, changing the page

HTML5 is the current version, maintained by the WHATWG and W3C.`,
      example: { html: '<h1>Hello, Kenya!</h1>\n<p>I am learning web development.</p>' },
      challenge: 'Create a main heading (h1) with your name and a paragraph (p) describing the job you want to do with web development.',
      checks: [
        { label: 'A main heading <h1> ... </h1>', in: 'html', re: /<h1[^>]*>[\s\S]*\S[\s\S]*<\/h1>/i },
        { label: 'A paragraph <p> ... </p>', in: 'html', re: /<p[^>]*>[\s\S]*\S[\s\S]*<\/p>/i },
      ],
      hints: ['Every opening tag needs a matching closing tag with a slash: </h1>.', 'Put your text between the opening and closing tags.'],
      quiz: [
        { q: 'What does HTML stand for?', options: ['HyperText Markup Language', 'High Transfer Machine Language', 'Home Tool Markup Language', 'Hyperlink and Text Management Language'], why: 'HTML = HyperText Markup Language.' },
        { q: 'Which statement about HTML is true?', options: ['It describes the structure of a page', 'It is used to store databases', 'It is a programming language for calculations', 'It only works in Chrome'], why: 'HTML is a markup language: it describes what each part of a page is.' },
        { q: 'Which program reads HTML and draws the page?', options: ['A web browser', 'A spreadsheet', 'A compiler', 'An email client only'], why: 'Browsers render HTML into the page you see.' },
      ],
      oral: 'Explain the difference between HTML, CSS and JavaScript as if you were talking to a new colleague.',
    },
    {
      title: 'HTML Document Structure', minutes: 60,
      content: `Every complete HTML page follows the same skeleton. Browsers can show pages without it, but professional pages always include it so they display correctly everywhere.

~~~
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Portfolio</title>
  </head>
  <body>
    <h1>Welcome</h1>
  </body>
</html>
~~~

## What each part does
- {{<!DOCTYPE html>}} tells the browser this is an HTML5 document.
- {{<html lang="en">}} wraps the whole page; {{lang}} helps screen readers and search engines.
- {{<head>}} holds information about the page (not shown on the page itself).
- {{<meta charset="UTF-8">}} makes sure every character (including Kiswahili and emoji) displays correctly.
- {{<title>}} is the text shown on the browser tab and in search results.
- {{<body>}} holds everything visitors see.

Indent nested elements by two spaces so your structure is easy to read.`,
      example: { html: '<!DOCTYPE html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8">\n    <title>My Page</title>\n  </head>\n  <body>\n    <h1>Welcome</h1>\n  </body>\n</html>' },
      challenge: 'Write a complete HTML document whose title is "My Portfolio" and whose body contains a main heading.',
      checks: [
        { label: 'Starts with <!DOCTYPE html>', in: 'html', re: /<!doctype html>/i },
        { label: '<html> element with a lang attribute', in: 'html', re: /<html[^>]*\slang\s*=\s*["']?[a-z-]+/i },
        { label: '<head> section with <meta charset="UTF-8">', in: 'html', re: /<meta[^>]*charset\s*=\s*["']?utf-8/i },
        { label: '<title>My Portfolio</title>', in: 'html', re: /<title>\s*My Portfolio\s*<\/title>/i },
        { label: '<body> containing an <h1>', in: 'html', re: /<body[^>]*>[\s\S]*<h1[^>]*>[\s\S]*<\/h1>[\s\S]*<\/body>/i },
      ],
      hints: ['Start from the example and change the title.', 'The <title> goes inside <head>, the heading goes inside <body>.'],
      quiz: [
        { q: 'Where is the text of the <title> element shown?', options: ['On the browser tab', 'As the biggest heading on the page', 'At the bottom of the page', 'Nowhere'], why: 'The title appears on the tab and in search results.' },
        { q: 'Which element holds everything visitors see on the page?', options: ['<body>', '<head>', '<meta>', '<title>'], why: 'Visible content goes in <body>.' },
        { q: 'Why add <meta charset="UTF-8">?', options: ['So all characters and symbols display correctly', 'To make the page load faster', 'To add a colour theme', 'To link a stylesheet'], why: 'UTF-8 covers almost every character in every language.' },
      ],
      oral: 'Walk through the parts of an HTML document skeleton and say why each one is needed.',
    },
    {
      title: 'Elements, Tags and Attributes', minutes: 60,
      content: `## Elements
An element is an opening tag, its content and a closing tag: {{<p>Hello</p>}}. Elements can be nested inside each other, but they must close in the reverse order they opened:

~~~
<p>This is <strong>very</strong> important.</p>   correct
<p>This is <strong>very</p></strong>              wrong
~~~

## Empty (void) elements
Some elements have no content and no closing tag, for example {{<br>}}, {{<hr>}}, {{<img>}} and {{<meta>}}.

## Attributes
Attributes give extra information about an element. They go inside the opening tag as {{name="value"}}:

~~~
<a href="https://www.kenya.go.ke" title="Government of Kenya">Visit the site</a>
<img src="nairobi.jpg" alt="Nairobi skyline at sunset">
~~~

- {{href}} - where a link goes
- {{src}} - which file an image loads
- {{alt}} - text describing an image (needed for accessibility)
- {{title}} - extra information shown on hover

Always put attribute values in double quotes and write tag names in lowercase.`,
      example: { html: '<p>Read the <strong>instructions</strong> carefully.</p>\n<a href="https://www.w3.org" title="World Wide Web Consortium">W3C</a>' },
      challenge: 'Create a link that has both an href and a title attribute, and an image that has both src and alt attributes.',
      checks: [
        { label: 'A link <a> with an href attribute', in: 'html', re: /<a[^>]*\shref\s*=\s*["'][^"']+["']/i },
        { label: 'The link also has a title attribute', in: 'html', re: /<a[^>]*\stitle\s*=\s*["'][^"']+["']/i },
        { label: 'An image <img> with a src attribute', in: 'html', re: /<img[^>]*\ssrc\s*=\s*["'][^"']+["']/i },
        { label: 'The image has alt text', in: 'html', re: /<img[^>]*\salt\s*=\s*["'][^"']+["']/i },
      ],
      hints: ['Attributes go inside the opening tag: <a href="..." title="...">.', '<img> is a void element - it has no closing tag.'],
      quiz: [
        { q: 'Which of these is a void (empty) element?', options: ['<br>', '<p>', '<h1>', '<a>'], why: '<br> has no content and no closing tag.' },
        { q: 'Where are attributes written?', options: ['Inside the opening tag', 'Inside the closing tag', 'Between the tags as text', 'In a separate file only'], why: 'Attributes always go in the opening tag.' },
        { q: 'What is the alt attribute of an image for?', options: ['Describing the image for people who cannot see it', 'Changing the image size', 'Making the image a link', 'Choosing the image file'], why: 'alt text is read by screen readers and shown if the image fails to load.' },
      ],
      oral: 'Explain what an element, a tag and an attribute are, using a link as your example.',
    },
    {
      title: 'Comments, Whitespace and Special Characters', minutes: 45,
      content: `## Comments
Comments are notes for developers. Browsers ignore them:

~~~
<!-- Main navigation starts here -->
~~~

Use comments to explain sections of a page, but never put passwords or private information in them - anyone can read your HTML.

## Whitespace
Browsers collapse several spaces and line breaks into a single space. To start a new line use {{<br>}}, and to separate content use new elements such as paragraphs.

## Character entities
Some characters have a special meaning in HTML, so you write them as entities:

- {{&lt;}} shows <
- {{&gt;}} shows >
- {{&amp;}} shows &
- {{&copy;}} shows ©
- {{&nbsp;}} a space that never breaks onto a new line

~~~
<p>Use the &lt;p&gt; tag for paragraphs.</p>
<p>&copy; 2026 Amina's Web Studio</p>
~~~`,
      example: { html: '<!-- Footer -->\n<p>Tags look like &lt;this&gt;.</p>\n<p>&copy; 2026 My Company</p>' },
      challenge: 'Add an HTML comment, a paragraph that shows the text <p> on the page using entities, and a copyright line using &copy;.',
      checks: [
        { label: 'An HTML comment <!-- ... -->', in: 'html', re: /<!--[\s\S]*?-->/ },
        { label: 'Shows a tag as text using &lt; and &gt;', in: 'html', re: /&lt;[\s\S]*?&gt;/i },
        { label: 'A copyright line using &copy;', in: 'html', re: /&copy;/i },
      ],
      hints: ['&lt; is "less than" and &gt; is "greater than".', 'Comments start with <!-- and end with -->.'],
      quiz: [
        { q: 'How do you show the character < as text on a page?', options: ['&lt;', '&less;', '<<', '\\<'], why: '&lt; is the entity for "less than".' },
        { q: 'What does the browser do with five spaces in a row in your HTML?', options: ['Shows a single space', 'Shows five spaces', 'Shows an error', 'Starts a new line'], why: 'Whitespace collapses into one space.' },
        { q: 'Who can read the comments in your HTML?', options: ['Anyone who views the page source', 'Only you', 'Only the web server', 'Nobody'], why: 'Comments are sent to every visitor - keep secrets out of them.' },
      ],
      oral: 'Why should you never put passwords or private notes in HTML comments?',
    },
    {
      title: 'Creating, Saving and Viewing HTML Files', minutes: 60,
      content: `## Tools of a web developer
- A code editor such as Visual Studio Code (free) - it colours your code and helps you type.
- One or more browsers to test your pages.
- The browser's Developer Tools (press F12) to inspect elements and see errors.

## Files and folders
- Save HTML files with the {{.html}} extension.
- The home page of a site is usually called {{index.html}}.
- Use lowercase file names without spaces: {{contact-us.html}}, not {{Contact Us.html}}.
- Keep images in a folder such as {{images/}}.

## Relative and absolute paths
~~~
<a href="contact.html">Contact</a>            same folder
<img src="images/logo.png" alt="Logo">        inside the images folder
<a href="https://example.com">Example</a>      a full (absolute) address
~~~

## Checking your work
Open the file in a browser by double-clicking it, or drag it into a browser window. Use the free W3C validator (validator.w3.org) to find mistakes in your HTML.`,
      example: { html: '<h1>About Me</h1>\n<p>I build simple, fast websites for small businesses.</p>\n<a href="contact.html">Contact me</a>' },
      challenge: 'Build a small "About" page: a main heading, a paragraph about yourself, and a relative link to a page called contact.html.',
      checks: [
        { label: 'A main heading <h1>', in: 'html', re: /<h1[^>]*>[\s\S]*\S[\s\S]*<\/h1>/i },
        { label: 'A paragraph about you', in: 'html', re: /<p[^>]*>[\s\S]*\S[\s\S]*<\/p>/i },
        { label: 'A relative link to contact.html', in: 'html', re: /<a[^>]*href\s*=\s*["'](\.\/)?contact\.html["']/i },
      ],
      hints: ['A relative link only needs the file name: href="contact.html".', 'Do not start the address with http:// for a page in the same folder.'],
      quiz: [
        { q: 'What is the usual file name for a website home page?', options: ['index.html', 'home.txt', 'main.css', 'start.js'], why: 'Web servers open index.html by default.' },
        { q: 'Which file name follows good practice?', options: ['contact-us.html', 'Contact Us.html', 'CONTACT US!.HTML', 'contact us.htm l'], why: 'Use lowercase and hyphens, no spaces.' },
        { q: 'href="images/logo.png" is an example of...', options: ['A relative path', 'An absolute URL', 'An email link', 'A CSS rule'], why: 'It is relative to the current page\'s folder.' },
      ],
      oral: 'Describe how you would organise the files and folders for a small business website.',
    },
  ],
};

const M102 = {
  id: 102, order: 2, icon: '🏗️', color: '#264de4', difficulty: 'beginner', hours: 20,
  title: 'HTML Elements',
  description: 'Headings, text formatting, lists, links, images, media and tables - the building blocks of every page.',
  lessons: [
    {
      title: 'Headings and Paragraphs', minutes: 45,
      content: `## Headings
HTML has six heading levels, from {{<h1>}} (most important) to {{<h6>}} (least important). They form the outline of your page - like the headings in a report.

- Use one {{<h1>}} per page for the main topic.
- Use {{<h2>}} for sections and {{<h3>}} for sub-sections.
- Never skip levels just to get a smaller size - use CSS for size.

## Paragraphs and breaks
- {{<p>}} - a paragraph of text
- {{<br>}} - a line break inside a paragraph (for addresses or poems)
- {{<hr>}} - a thematic break between sections

~~~
<h1>Tourism in Kenya</h1>
<h2>National Parks</h2>
<p>Kenya has more than 20 national parks.</p>
<hr>
<h2>Beaches</h2>
<p>Diani and Watamu attract visitors all year.</p>
~~~

Search engines and screen readers use your headings to understand the page, so a clear heading structure improves both accessibility and SEO.`,
      example: { html: '<h1>My Report</h1>\n<h2>Introduction</h2>\n<p>This report explains...</p>' },
      challenge: 'Write an article outline: one h1, at least two h2 sections each followed by a paragraph, and an hr between the sections.',
      checks: [
        { label: 'One main heading <h1>', in: 'html', re: /<h1[^>]*>[\s\S]*?<\/h1>/i },
        { label: 'At least two <h2> section headings', in: 'html', re: /(<h2[^>]*>[\s\S]*?<\/h2>[\s\S]*){2}/i },
        { label: 'At least two paragraphs', in: 'html', re: /(<p[^>]*>[\s\S]*?<\/p>[\s\S]*){2}/i },
        { label: 'An <hr> between sections', in: 'html', re: /<hr\s*\/?>/i },
      ],
      hints: ['Write h1 first, then h2 + p, then <hr>, then h2 + p.'],
      quiz: [
        { q: 'How many <h1> elements should a typical page have?', options: ['One', 'Six', 'None', 'One per paragraph'], why: 'One h1 for the main topic of the page.' },
        { q: 'You want smaller heading text. What should you do?', options: ['Keep the right heading level and change the size with CSS', 'Use <h6> for everything', 'Use <p> with bold text', 'Skip from h1 to h5'], why: 'Heading levels describe structure; CSS controls looks.' },
        { q: 'Which element creates a line break inside a paragraph?', options: ['<br>', '<hr>', '<lb>', '<break>'], why: '<br> breaks the line.' },
      ],
      oral: 'Why do headings matter for people using screen readers and for search engines?',
    },
    {
      title: 'Text Formatting and Semantics', minutes: 60,
      content: `Semantic elements describe the meaning of text, not just how it looks.

- {{<strong>}} - strong importance (shown bold)
- {{<em>}} - emphasis (shown italic)
- {{<mark>}} - highlighted text
- {{<small>}} - side comments and fine print
- {{<sub>}} and {{<sup>}} - subscript (H₂O) and superscript (x²)
- {{<blockquote>}} - a long quotation from another source
- {{<q>}} - a short inline quotation
- {{<code>}} and {{<pre>}} - computer code and pre-formatted text
- {{<abbr title="...">}} - an abbreviation with its full meaning

~~~
<p>Water is H<sub>2</sub>O and the area is 5m<sup>2</sup>.</p>
<p><strong>Warning:</strong> save your work <em>often</em>.</p>
<blockquote>Elimu ni ufunguo wa maisha.</blockquote>
<p><abbr title="Kenya Revenue Authority">KRA</abbr> deadlines are in June.</p>
~~~

Prefer {{<strong>}} and {{<em>}} over the old {{<b>}} and {{<i>}} when the text really is important or emphasised.`,
      example: { html: '<p><strong>Note:</strong> the meeting is <em>tomorrow</em>.</p>' },
      challenge: 'Write a paragraph that uses strong and em, a chemical formula using sub (for example H2O), and a blockquote.',
      checks: [
        { label: 'Uses <strong>', in: 'html', re: /<strong>[\s\S]*?<\/strong>/i },
        { label: 'Uses <em>', in: 'html', re: /<em>[\s\S]*?<\/em>/i },
        { label: 'A formula with <sub>', in: 'html', re: /<sub>[\s\S]*?<\/sub>/i },
        { label: 'A <blockquote>', in: 'html', re: /<blockquote[^>]*>[\s\S]*?<\/blockquote>/i },
      ],
      hints: ['H<sub>2</sub>O puts the 2 below the line.'],
      quiz: [
        { q: 'Which element marks text as strongly important?', options: ['<strong>', '<big>', '<mark>', '<sup>'], why: '<strong> gives strong importance.' },
        { q: 'How do you write the "2" in x² ?', options: ['x<sup>2</sup>', 'x<sub>2</sub>', 'x<small>2</small>', 'x^2 inside <code>'], why: '<sup> is superscript.' },
        { q: 'Which element is best for a long quotation from a book?', options: ['<blockquote>', '<q>', '<cite> only', '<pre>'], why: '<blockquote> is for long quotations.' },
      ],
      oral: 'What is the difference between <strong> and <b>, and why does it matter?',
    },
    {
      title: 'Lists', minutes: 45,
      content: `## Unordered lists
Use {{<ul>}} when the order does not matter. Each item is an {{<li>}}.

## Ordered lists
Use {{<ol>}} for steps or rankings. Attributes: {{start="5"}} to start at 5, {{type="a"}} for letters, {{reversed}} to count down.

## Nested lists
Put a whole list inside an {{<li>}}:

~~~
<ol>
  <li>Boil water</li>
  <li>Add ingredients
    <ul>
      <li>Tea leaves</li>
      <li>Milk</li>
    </ul>
  </li>
  <li>Serve hot</li>
</ol>
~~~

## Description lists
For terms and their definitions use {{<dl>}}, {{<dt>}} (term) and {{<dd>}} (description):

~~~
<dl>
  <dt>HTML</dt>
  <dd>The structure of a web page</dd>
</dl>
~~~`,
      example: { html: '<ul>\n  <li>Mango</li>\n  <li>Pawpaw</li>\n</ul>' },
      challenge: 'Write an ordered list of at least 3 steps for making chai, with a nested unordered list of ingredients inside one step, and a description list with 2 terms.',
      checks: [
        { label: 'An ordered list <ol>', in: 'html', re: /<ol[^>]*>[\s\S]*<\/ol>/i },
        { label: 'At least 3 list items', in: 'html', re: /(<li[^>]*>[\s\S]*?){3}/i },
        { label: 'A <ul> nested inside a list item', in: 'html', re: /<li[^>]*>[^]*?<ul[^>]*>[\s\S]*?<\/ul>[\s\S]*?<\/li>/i },
        { label: 'A description list with <dl>, <dt> and <dd>', in: 'html', re: /<dl[^>]*>[\s\S]*<dt[^>]*>[\s\S]*<dd[^>]*>[\s\S]*<\/dl>/i },
      ],
      hints: ['Close the nested </ul> before closing its </li>.'],
      quiz: [
        { q: 'Which list should you use for step-by-step instructions?', options: ['<ol>', '<ul>', '<dl>', '<li> on its own'], why: 'Steps have an order, so use an ordered list.' },
        { q: 'Where does a nested list go?', options: ['Inside an <li>', 'Between </li> and <li>', 'After </ol>', 'Inside <dt>'], why: 'A nested list belongs inside a list item.' },
        { q: 'In a description list, which element holds the term?', options: ['<dt>', '<dd>', '<dl>', '<li>'], why: '<dt> = description term.' },
      ],
      oral: 'When would you choose an ordered, unordered or description list? Give an example of each.',
    },
    {
      title: 'Links and Navigation', minutes: 60,
      content: `Links ({{<a>}} anchor elements) connect pages together - they are the "hyper" in HyperText.

~~~
<a href="about.html">About us</a>
<a href="https://www.ktdabooks.co.ke" target="_blank" rel="noopener">KTDA Books</a>
<a href="mailto:info@example.com">Email us</a>
<a href="tel:+254700000000">Call us</a>
<a href="#contact">Jump to contact details</a>
...
<section id="contact">...</section>
~~~

## Good practice
- Link text should describe the destination: "Download the price list", not "click here".
- {{target="_blank"}} opens a new tab - add {{rel="noopener"}} for security.
- In-page links use {{#}} followed by the {{id}} of the element to jump to.
- Group main links in a {{<nav>}} element so assistive technology can find them.`,
      example: { html: '<nav>\n  <a href="index.html">Home</a>\n  <a href="services.html">Services</a>\n</nav>' },
      challenge: 'Build a nav with: an external link that opens in a new tab with rel="noopener", a mailto link, and an in-page link to #contact. Add an element with id="contact".',
      checks: [
        { label: 'A <nav> element', in: 'html', re: /<nav[^>]*>[\s\S]*<\/nav>/i },
        { label: 'External link with target="_blank"', in: 'html', re: /<a[^>]*href\s*=\s*["']https?:\/\/[^"']+["'][^>]*target\s*=\s*["']_blank["']|<a[^>]*target\s*=\s*["']_blank["'][^>]*href\s*=\s*["']https?:\/\//i },
        { label: 'rel="noopener" on the new-tab link', in: 'html', re: /rel\s*=\s*["'][^"']*noopener/i },
        { label: 'An email (mailto:) link', in: 'html', re: /href\s*=\s*["']mailto:[^"']+["']/i },
        { label: 'An in-page link to #contact', in: 'html', re: /href\s*=\s*["']#contact["']/i },
        { label: 'An element with id="contact"', in: 'html', re: /id\s*=\s*["']contact["']/i },
      ],
      hints: ['<a href="https://..." target="_blank" rel="noopener">', 'The id has no #, the link does: href="#contact" and id="contact".'],
      quiz: [
        { q: 'Which link text is best?', options: ['Download the 2026 price list', 'Click here', 'Link', 'More'], why: 'Descriptive link text helps everyone, including screen-reader users.' },
        { q: 'What does href="#prices" do?', options: ['Jumps to the element with id="prices" on the same page', 'Opens prices.html', 'Sends an email', 'Nothing'], why: '# links point to an id on the page.' },
        { q: 'Why add rel="noopener" with target="_blank"?', options: ['It stops the new page from controlling your page (security)', 'It makes the link bold', 'It opens the link in the same tab', 'It is required for all links'], why: 'noopener protects your page from the opened page.' },
      ],
      oral: 'Explain the difference between an absolute link, a relative link and an in-page link.',
    },
    {
      title: 'Images and Media', minutes: 60,
      content: `## Images
~~~
<img src="images/maasai-mara.jpg" alt="Wildebeest crossing the Mara River" width="600" height="400">
~~~

- {{alt}} is required: describe what the image shows. Use {{alt=""}} only for purely decorative images.
- Give {{width}} and {{height}} so the page does not jump while loading.
- Use JPG for photos, PNG for graphics with transparency, SVG for logos and icons, WebP for small modern files.

## Figures with captions
~~~
<figure>
  <img src="chart.png" alt="Sales rose 20% in 2026">
  <figcaption>Figure 1: Sales by quarter</figcaption>
</figure>
~~~

## Audio and video
~~~
<video src="intro.mp4" controls width="480"></video>
<audio src="podcast.mp3" controls></audio>
~~~

The {{controls}} attribute shows play, pause and volume buttons. Avoid {{autoplay}} with sound - it annoys visitors.`,
      example: { html: '<figure>\n  <img src="https://picsum.photos/300/200" alt="A random landscape photo" width="300" height="200">\n  <figcaption>A sample photo</figcaption>\n</figure>' },
      challenge: 'Create a figure with an image (with alt text) and a figcaption, and add a video element with controls.',
      checks: [
        { label: 'A <figure> element', in: 'html', re: /<figure[^>]*>[\s\S]*<\/figure>/i },
        { label: 'An image with alt text inside the figure', in: 'html', re: /<figure[^>]*>[\s\S]*<img[^>]*alt\s*=\s*["'][^"']+["'][\s\S]*<\/figure>/i },
        { label: 'A <figcaption>', in: 'html', re: /<figcaption[^>]*>[\s\S]*\S[\s\S]*<\/figcaption>/i },
        { label: 'A <video> with controls', in: 'html', re: /<video[^>]*\scontrols/i },
      ],
      hints: ['The figcaption goes inside the figure, after the image.'],
      quiz: [
        { q: 'Which format is best for a company logo that must stay sharp at any size?', options: ['SVG', 'JPG', 'GIF', 'BMP'], why: 'SVG is a vector format - sharp at every size.' },
        { q: 'What should alt text contain?', options: ['A short description of what the image shows', 'The file name', 'The word "image"', 'Keywords repeated many times'], why: 'Describe the content and purpose of the image.' },
        { q: 'Which attribute shows play and pause buttons on a video?', options: ['controls', 'buttons', 'play', 'autoplay'], why: 'controls shows the built-in player controls.' },
      ],
      oral: 'Why should you set width and height on images and keep image files small?',
    },
    {
      title: 'Tables', minutes: 60,
      content: `Tables show data in rows and columns - timetables, price lists, results. Do not use tables for page layout; use CSS for that.

~~~
<table>
  <caption>Class timetable</caption>
  <thead>
    <tr><th scope="col">Day</th><th scope="col">Subject</th><th scope="col">Time</th></tr>
  </thead>
  <tbody>
    <tr><td>Monday</td><td>HTML</td><td>9:00</td></tr>
    <tr><td>Tuesday</td><td>CSS</td><td>9:00</td></tr>
  </tbody>
</table>
~~~

- {{<caption>}} - the table title
- {{<thead>}}, {{<tbody>}}, {{<tfoot>}} - group header, body and footer rows
- {{<tr>}} - a table row
- {{<th>}} - a header cell; {{scope="col"}} or {{scope="row"}} helps screen readers
- {{<td>}} - a data cell
- {{colspan="2"}} / {{rowspan="2"}} - a cell that spans columns or rows`,
      example: { html: '<table>\n  <tr><th>Item</th><th>Price</th></tr>\n  <tr><td>Tea</td><td>30</td></tr>\n</table>' },
      challenge: 'Create a timetable table with a caption, a thead row of th header cells, and at least two tbody rows of data.',
      checks: [
        { label: 'A <table> with a <caption>', in: 'html', re: /<table[^>]*>[\s\S]*<caption[^>]*>[\s\S]*\S[\s\S]*<\/caption>/i },
        { label: 'A <thead> with <th> header cells', in: 'html', re: /<thead[^>]*>[\s\S]*<th[^>]*>[\s\S]*<\/thead>/i },
        { label: 'A <tbody> with at least two rows', in: 'html', re: /<tbody[^>]*>([\s\S]*?<tr[^>]*>){2}[\s\S]*<\/tbody>/i },
        { label: 'Data cells <td>', in: 'html', re: /<td[^>]*>/i },
      ],
      hints: ['Start from the example in the lesson and change the data.'],
      quiz: [
        { q: 'Which element makes a header cell?', options: ['<th>', '<td>', '<thead>', '<tr>'], why: '<th> = table header cell.' },
        { q: 'Should tables be used to lay out a whole page?', options: ['No - use CSS for layout', 'Yes, always', 'Only on mobile', 'Only for footers'], why: 'Tables are for data, CSS is for layout.' },
        { q: 'What does colspan="3" do?', options: ['Makes a cell stretch across 3 columns', 'Adds 3 columns', 'Repeats the cell 3 times', 'Sets the width to 3px'], why: 'colspan merges cells across columns.' },
      ],
      oral: 'Explain how to make a data table accessible to someone using a screen reader.',
    },
  ],
};

const M103 = {
  id: 103, order: 3, icon: '📐', color: '#f06529', difficulty: 'beginner', hours: 20,
  title: 'Web Page Formatting',
  description: 'Page layout elements, semantic structure, forms, and accessible, search-friendly pages.',
  lessons: [
    {
      title: 'Block and Inline Elements: div and span', minutes: 45,
      content: `Every element is displayed as either block or inline.

## Block elements
Start on a new line and take the full width: {{<div>}}, {{<p>}}, {{<h1>}}, {{<ul>}}, {{<section>}}.

## Inline elements
Sit inside a line of text and take only the space they need: {{<span>}}, {{<a>}}, {{<strong>}}, {{<img>}}.

## div and span
{{<div>}} and {{<span>}} have no meaning of their own. They are containers you can style with CSS using a {{class}} or {{id}}:

~~~
<div class="card">
  <h2>Basic Plan</h2>
  <p>Only <span class="price">KSh 500</span> per month.</p>
</div>
~~~

- {{class}} can be reused on many elements.
- {{id}} must be unique on the page.

Use a semantic element (header, nav, article...) when one fits; use div/span only when nothing else does.`,
      example: { html: '<div class="box">\n  <p>Total: <span class="price">KSh 1,200</span></p>\n</div>' },
      challenge: 'Create a div with class "card" that contains a heading and a paragraph with a span whose class is "price".',
      checks: [
        { label: 'A <div> with class="card"', in: 'html', re: /<div[^>]*class\s*=\s*["'][^"']*\bcard\b/i },
        { label: 'A heading inside the card', in: 'html', re: /<div[^>]*card[^>]*>[\s\S]*<h[1-6][^>]*>[\s\S]*<\/div>/i },
        { label: 'A <span> with class="price"', in: 'html', re: /<span[^>]*class\s*=\s*["'][^"']*\bprice\b/i },
      ],
      hints: ['class="card" goes inside the opening <div> tag.'],
      quiz: [
        { q: 'Which element is inline by default?', options: ['<span>', '<div>', '<p>', '<section>'], why: 'span is inline; the others are block elements.' },
        { q: 'Which is true about id and class?', options: ['An id must be unique; a class can be reused', 'A class must be unique; an id can be reused', 'Both must be unique', 'Neither can be styled'], why: 'ids are unique per page.' },
        { q: 'When should you use a <div>?', options: ['When no semantic element fits', 'For every paragraph', 'Instead of headings', 'Only inside tables'], why: 'Prefer meaningful elements; div is the fallback container.' },
      ],
      oral: 'Explain the difference between block and inline elements with an example of each.',
    },
    {
      title: 'Semantic Page Layout', minutes: 60,
      content: `HTML5 added elements that describe the parts of a page:

~~~
<header>
  <h1>Jua Kali Crafts</h1>
  <nav>
    <a href="#products">Products</a>
    <a href="#contact">Contact</a>
  </nav>
</header>
<main>
  <article>
    <h2>New sandals in stock</h2>
    <p>Handmade in Nairobi from recycled tyres.</p>
  </article>
  <section id="products">...</section>
</main>
<aside>Opening hours: 8am - 6pm</aside>
<footer>&copy; 2026 Jua Kali Crafts</footer>
~~~

- {{<header>}} - introduction, logo, main heading, navigation
- {{<nav>}} - main navigation links
- {{<main>}} - the main content (one per page)
- {{<section>}} - a themed group of content, usually with a heading
- {{<article>}} - self-contained content: a blog post, product, news item
- {{<aside>}} - related side content
- {{<footer>}} - copyright, contacts, links

These elements make pages easier to style, easier to read for screen readers, and easier for search engines to understand.`,
      example: { html: '<header><h1>My Site</h1></header>\n<main><p>Content</p></main>\n<footer>&copy; 2026</footer>' },
      challenge: 'Build a page skeleton with a header containing a nav, a main containing an article, an aside, and a footer.',
      checks: [
        { label: '<header> containing a <nav>', in: 'html', re: /<header[^>]*>[\s\S]*<nav[^>]*>[\s\S]*<\/nav>[\s\S]*<\/header>/i },
        { label: '<main> containing an <article>', in: 'html', re: /<main[^>]*>[\s\S]*<article[^>]*>[\s\S]*<\/article>[\s\S]*<\/main>/i },
        { label: 'An <aside>', in: 'html', re: /<aside[^>]*>[\s\S]*<\/aside>/i },
        { label: 'A <footer>', in: 'html', re: /<footer[^>]*>[\s\S]*<\/footer>/i },
      ],
      hints: ['Copy the structure from the lesson, then write your own content.'],
      quiz: [
        { q: 'How many <main> elements should a page have?', options: ['One', 'One per section', 'None', 'As many as you like'], why: 'There is one main content area per page.' },
        { q: 'Which element suits a self-contained blog post?', options: ['<article>', '<aside>', '<nav>', '<footer>'], why: 'An article can stand on its own.' },
        { q: 'Which element is best for the copyright notice?', options: ['<footer>', '<header>', '<main>', '<nav>'], why: 'Copyright and contacts go in the footer.' },
      ],
      oral: 'Describe the layout of a news website using semantic elements.',
    },
    {
      title: 'Forms: Collecting Information', minutes: 75,
      content: `Forms let visitors send information: sign-ups, orders, enquiries.

~~~
<form action="/register" method="post">
  <label for="email">Email</label>
  <input type="email" id="email" name="email" required>

  <label for="password">Password</label>
  <input type="password" id="password" name="password" minlength="8" required>

  <button type="submit">Create account</button>
</form>
~~~

- {{action}} - where the data is sent; {{method}} - {{get}} (in the address) or {{post}} (in the request body - use this for private data).
- Every input needs a {{name}} so its value is sent.
- {{<label for="id">}} connects a label to an input. Clicking the label focuses the input, and screen readers read it aloud.
- Useful input types: {{text}}, {{email}}, {{password}}, {{tel}}, {{number}}, {{date}}, {{checkbox}}, {{radio}}.
- {{required}}, {{minlength}}, {{min}}, {{max}} and {{pattern}} let the browser check the data before sending.

Remember: browser checks help users, but the server must always check the data again.`,
      example: { html: '<form>\n  <label for="name">Name</label>\n  <input type="text" id="name" name="name">\n  <button type="submit">Send</button>\n</form>' },
      challenge: 'Build a sign-up form with labelled email and password inputs (both required) and a submit button.',
      checks: [
        { label: 'A <form> element', in: 'html', re: /<form[^>]*>[\s\S]*<\/form>/i },
        { label: 'Labels connected with for="..."', in: 'html', re: /<label[^>]*\sfor\s*=\s*["'][^"']+["']/i },
        { label: 'An email input', in: 'html', re: /<input[^>]*type\s*=\s*["']email["']/i },
        { label: 'A password input', in: 'html', re: /<input[^>]*type\s*=\s*["']password["']/i },
        { label: 'Required fields', in: 'html', re: /<input[^>]*\srequired/i },
        { label: 'A submit button', in: 'html', re: /<button[^>]*type\s*=\s*["']submit["']|<input[^>]*type\s*=\s*["']submit["']/i },
      ],
      hints: ['The label\'s for must match the input\'s id.', 'Add the word required inside the <input> tag.'],
      quiz: [
        { q: 'Which method should a login form use?', options: ['post', 'get', 'put in the URL', 'none'], why: 'post keeps passwords out of the address bar and history.' },
        { q: 'What connects a <label> to an <input>?', options: ['The label\'s for matches the input\'s id', 'Putting them on the same line', 'The same class', 'The name attribute'], why: 'for="x" links to id="x".' },
        { q: 'Is browser validation (required, minlength) enough on its own?', options: ['No - the server must check the data too', 'Yes, always', 'Only on Chrome', 'Only for passwords'], why: 'Users can bypass browser checks; always validate on the server.' },
      ],
      oral: 'Why must data from a form be checked again on the server even when the browser already checked it?',
    },
    {
      title: 'More Form Controls', minutes: 60,
      content: `## Choosing from options
~~~
<fieldset>
  <legend>Preferred contact</legend>
  <input type="radio" id="c-phone" name="contact" value="phone">
  <label for="c-phone">Phone</label>
  <input type="radio" id="c-email" name="contact" value="email">
  <label for="c-email">Email</label>
</fieldset>

<label for="county">County</label>
<select id="county" name="county">
  <option value="nairobi">Nairobi</option>
  <option value="mombasa">Mombasa</option>
</select>

<label for="msg">Message</label>
<textarea id="msg" name="message" rows="4" required></textarea>

<input type="checkbox" id="terms" name="terms" required>
<label for="terms">I agree to the terms</label>
~~~

- Radio buttons with the same {{name}} form a group - only one can be chosen.
- Checkboxes allow several choices.
- {{<fieldset>}} and {{<legend>}} group related controls with a caption.
- {{<select>}} is a drop-down list; {{<textarea>}} is a multi-line text box.
- {{placeholder}} shows an example, but never replaces a label.`,
      example: { html: '<label for="county">County</label>\n<select id="county" name="county">\n  <option>Nairobi</option>\n  <option>Kisumu</option>\n</select>' },
      challenge: 'Build a feedback form with a fieldset and legend, a group of radio buttons sharing one name, a select drop-down, and a required textarea.',
      checks: [
        { label: 'A <fieldset> with a <legend>', in: 'html', re: /<fieldset[^>]*>[\s\S]*<legend[^>]*>[\s\S]*\S[\s\S]*<\/legend>[\s\S]*<\/fieldset>/i },
        { label: 'At least two radio buttons', in: 'html', re: /(<input[^>]*type\s*=\s*["']radio["'][\s\S]*){2}/i },
        { label: 'A <select> with options', in: 'html', re: /<select[^>]*>[\s\S]*<option[\s\S]*<\/select>/i },
        { label: 'A required <textarea>', in: 'html', re: /<textarea[^>]*\srequired/i },
      ],
      hints: ['Give both radio buttons the same name, e.g. name="rating".'],
      quiz: [
        { q: 'What makes radio buttons work as one group?', options: ['The same name attribute', 'The same id', 'Being inside a <div>', 'The same value'], why: 'Radios with the same name are one group.' },
        { q: 'Which control lets a user choose several options?', options: ['Checkboxes', 'Radio buttons', 'A <legend>', 'A single <select> without multiple'], why: 'Checkboxes allow several choices.' },
        { q: 'Can a placeholder replace a label?', options: ['No - placeholders disappear when typing', 'Yes, always', 'Only for passwords', 'Only on mobile'], why: 'Labels must stay visible and readable.' },
      ],
      oral: 'Describe a form for booking a hotel room and which controls you would use for each piece of information.',
    },
    {
      title: 'Accessibility and SEO Basics', minutes: 60,
      content: `An accessible page works for everyone, including people who use screen readers, keyboards or zoom. Good accessibility also helps search engines (SEO).

## Checklist
- Set the language: {{<html lang="en">}}.
- Give every image meaningful {{alt}} text.
- Use headings in order (h1, then h2...).
- Label every form control.
- Make link text descriptive.
- Ensure good colour contrast between text and background.
- Everything must work with the keyboard (Tab, Enter, Space).
- Add {{aria-label}} to buttons that show only an icon.

## Head information for search and mobile
~~~
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="description" content="Affordable web design for small businesses in Nakuru.">
<button aria-label="Open menu">☰</button>
~~~

- The {{viewport}} meta tag makes pages display correctly on phones.
- The {{description}} meta tag is often shown under your link in search results.`,
      example: { html: '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<button aria-label="Close">✕</button>' },
      challenge: 'Add a viewport meta tag, a meta description, and an icon-only button that has an aria-label.',
      checks: [
        { label: 'A viewport meta tag', in: 'html', re: /<meta[^>]*name\s*=\s*["']viewport["'][^>]*content\s*=\s*["'][^"']*width\s*=\s*device-width/i },
        { label: 'A meta description', in: 'html', re: /<meta[^>]*name\s*=\s*["']description["'][^>]*content\s*=\s*["'][^"']{10,}["']/i },
        { label: 'A button with aria-label', in: 'html', re: /<button[^>]*aria-label\s*=\s*["'][^"']+["']/i },
      ],
      hints: ['A meta description should be one helpful sentence about the page.'],
      quiz: [
        { q: 'What does the viewport meta tag do?', options: ['Makes the page fit phone screens properly', 'Adds a page title', 'Improves image quality', 'Blocks search engines'], why: 'Without it phones show a zoomed-out desktop page.' },
        { q: 'A button only shows the icon ☰. How do screen-reader users know what it does?', options: ['Add aria-label="Open menu"', 'Make it bigger', 'Add a tooltip image', 'Nothing is needed'], why: 'aria-label gives the button an accessible name.' },
        { q: 'Where is the meta description often shown?', options: ['Under your link in search results', 'On the browser tab', 'At the top of the page', 'In the footer'], why: 'Search engines use it as the result snippet.' },
      ],
      oral: 'Name five things you would check to make a web page accessible.',
    },
  ],
};

module.exports = { M101, M102, M103 };
