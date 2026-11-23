const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = process.env.KIDSCODE_DB_PATH || path.join(__dirname, 'codequest.db');
const db = new sqlite3.Database(DB_PATH);

console.log('🌱 Seeding Adult Learner Curriculum...\n');

db.serialize(() => {
  // Insert adult learning modules
  console.log('📚 Creating modules...');
  
  const modules = [
    {
      id: 101,
      title: 'HTML Basics',
      description: 'Understand HTML fundamentals, document structure, and core elements',
      icon: '📄',
      color: '#e34c26',
      order_num: 1,
      difficulty: 'beginner',
      target_audience: 'adults',
      estimated_hours: 20
    },
    {
      id: 102,
      title: 'HTML Elements',
      description: 'Master basic HTML elements, attributes, and semantic markup',
      icon: '🏗️',
      color: '#264de4',
      order_num: 2,
      difficulty: 'beginner',
      target_audience: 'adults',
      estimated_hours: 20
    },
    {
      id: 103,
      title: 'Web Page Formatting',
      description: 'Learn layout elements and page structure techniques',
      icon: '📐',
      color: '#f06529',
      order_num: 3,
      difficulty: 'beginner',
      target_audience: 'adults',
      estimated_hours: 20
    },
    {
      id: 104,
      title: 'Applying Styles',
      description: 'Master CSS fundamentals, styling concepts, and external stylesheets',
      icon: '🎨',
      color: '#2965f1',
      order_num: 4,
      difficulty: 'intermediate',
      target_audience: 'adults',
      estimated_hours: 25
    },
    {
      id: 105,
      title: 'JavaScript Basics',
      description: 'Understand JavaScript fundamentals and DOM manipulation',
      icon: '⚡',
      color: '#f7df1e',
      order_num: 5,
      difficulty: 'intermediate',
      target_audience: 'adults',
      estimated_hours: 25
    },
    {
      id: 106,
      title: 'JavaScript Data Types',
      description: 'Work with variables, data types, expressions, and arrays',
      icon: '📊',
      color: '#f0db4f',
      order_num: 6,
      difficulty: 'intermediate',
      target_audience: 'adults',
      estimated_hours: 25
    },
    {
      id: 107,
      title: 'JavaScript Functions',
      description: 'Create and use functions for reusable, modular code',
      icon: '🔧',
      color: '#323330',
      order_num: 7,
      difficulty: 'intermediate',
      target_audience: 'adults',
      estimated_hours: 20
    },
    {
      id: 108,
      title: 'JavaScript Libraries',
      description: 'Master jQuery framework for efficient DOM manipulation and events',
      icon: '📚',
      color: '#0769ad',
      order_num: 8,
      difficulty: 'advanced',
      target_audience: 'adults',
      estimated_hours: 25
    }
  ];

  const moduleStmt = db.prepare(`
    INSERT OR REPLACE INTO modules 
    (id, title, description, icon, color, order_num, difficulty, target_audience, estimated_hours) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  modules.forEach(m => {
    moduleStmt.run(m.id, m.title, m.description, m.icon, m.color, m.order_num, m.difficulty, m.target_audience, m.estimated_hours);
  });
  moduleStmt.finalize();
  console.log(`✅ Created ${modules.length} modules`);

  // Insert lessons for Module 101: HTML Basics
  console.log('📝 Creating lessons...');
  
  const lessons = [
    // Module 101: HTML Basics (5 lessons)
    {
      module_id: 101,
      title: 'What is HTML?',
      content: 'HTML (HyperText Markup Language) is the standard markup language for creating web pages. It describes the structure and content of a webpage using elements and tags.',
      example_code: '<!DOCTYPE html>\n<html>\n<head>\n  <title>My First Page</title>\n</head>\n<body>\n  <h1>Hello World!</h1>\n</body>\n</html>',
      challenge: 'Create a basic HTML document with a title and a heading that says "Welcome to Web Development"',
      hints: '["Start with <!DOCTYPE html>", "Use <html>, <head>, and <body> tags", "Add a <title> in the head section"]',
      order_num: 1,
      has_practical_test: 1,
      has_written_test: 1
    },
    {
      module_id: 101,
      title: 'HTML Document Structure',
      content: 'Every HTML document follows a standard structure: DOCTYPE declaration, html element, head section (metadata), and body section (visible content).',
      example_code: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>Document Structure</title>\n</head>\n<body>\n  <!-- Content goes here -->\n</body>\n</html>',
      challenge: 'Build a complete HTML document structure with proper DOCTYPE, language attribute, and character encoding',
      hints: '["Use lang attribute in html tag", "Add meta charset in head", "Remember to close all tags"]',
      order_num: 2,
      has_practical_test: 1
    },
    {
      module_id: 101,
      title: 'Core HTML Elements',
      content: 'The core elements of HTML include: <html> (root element), <head> (metadata container), <title> (page title), and <body> (visible content).',
      example_code: '<html>\n  <head>\n    <title>Core Elements Demo</title>\n  </head>\n  <body>\n    <h1>Main Content</h1>\n    <p>This is a paragraph.</p>\n  </body>\n</html>',
      challenge: 'Create a page using all core elements with meaningful content about yourself',
      hints: '["Title appears in browser tab", "Body contains all visible content", "Use proper nesting"]',
      order_num: 3,
      has_practical_test: 1,
      has_written_test: 1
    },
    {
      module_id: 101,
      title: 'Creating HTML Files',
      content: 'HTML files are plain text files with .html extension. They can be created in any text editor and viewed in web browsers.',
      example_code: '<!-- Save this as index.html -->\n<!DOCTYPE html>\n<html>\n<head>\n  <title>My Website</title>\n</head>\n<body>\n  <h1>Welcome!</h1>\n</body>\n</html>',
      challenge: 'Create and save an HTML file, then describe the process of viewing it in a browser',
      hints: '["Use .html extension", "Open file in browser", "Use proper file naming conventions"]',
      order_num: 4,
      has_practical_test: 1,
      has_oral_test: 1
    },
    {
      module_id: 101,
      title: 'HTML Terminology',
      content: 'Key terms: Element (complete tag structure), Tag (opening/closing markers), Attribute (additional information), Content (text between tags).',
      example_code: '<!-- Element -->\n<p class="intro">Hello</p>\n\n<!-- Tag: <p> and </p> -->\n<!-- Attribute: class="intro" -->\n<!-- Content: Hello -->',
      challenge: 'Identify and explain elements, tags, attributes, and content in a given HTML snippet',
      hints: '["Elements have opening and closing tags", "Attributes go in opening tag", "Content is between tags"]',
      order_num: 5,
      has_written_test: 1,
      has_oral_test: 1
    },

    // Module 102: HTML Elements (6 lessons)
    {
      module_id: 102,
      title: 'Paragraphs and Text',
      content: 'The <p> tag defines paragraphs. The <br> tag creates line breaks. Text can be formatted with <strong>, <em>, and other tags.',
      example_code: '<p>This is a paragraph.</p>\n<p>This is another paragraph with a<br>line break.</p>\n<p>This text is <strong>bold</strong> and this is <em>italic</em>.</p>',
      challenge: 'Create a page with multiple paragraphs, line breaks, and text formatting',
      hints: '["<p> for paragraphs", "<br> for line breaks", "<strong> for bold, <em> for italic"]',
      order_num: 1,
      has_practical_test: 1
    },
    {
      module_id: 102,
      title: 'Headings',
      content: 'HTML provides six levels of headings: <h1> to <h6>. <h1> is the most important, <h6> is the least important.',
      example_code: '<h1>Main Heading</h1>\n<h2>Subheading</h2>\n<h3>Sub-subheading</h3>\n<p>Regular paragraph text.</p>',
      challenge: 'Create a document outline using all six heading levels appropriately',
      hints: '["Use h1 for main title", "Use h2-h6 for subsections", "Only one h1 per page"]',
      order_num: 2,
      has_practical_test: 1,
      has_written_test: 1
    },
    {
      module_id: 102,
      title: 'Images',
      content: 'The <img> tag embeds images. Required attributes: src (image source) and alt (alternative text for accessibility).',
      example_code: '<img src="photo.jpg" alt="A beautiful sunset">\n<img src="logo.png" alt="Company Logo" width="200">',
      challenge: 'Add three images to a page with proper src and alt attributes',
      hints: '["src points to image file", "alt describes the image", "Always include alt for accessibility"]',
      order_num: 3,
      has_practical_test: 1
    },
    {
      module_id: 102,
      title: 'Links',
      content: 'The <a> tag creates hyperlinks. The href attribute specifies the destination URL.',
      example_code: '<a href="https://example.com">Visit Example</a>\n<a href="about.html">About Us</a>\n<a href="#section1">Jump to Section 1</a>',
      challenge: 'Create a navigation menu with links to external sites and internal pages',
      hints: '["href for destination", "Use descriptive link text", "Can link to external or internal pages"]',
      order_num: 4,
      has_practical_test: 1
    },
    {
      module_id: 102,
      title: 'Lists',
      content: 'HTML supports ordered lists (<ol>), unordered lists (<ul>), and list items (<li>).',
      example_code: '<ul>\n  <li>Item 1</li>\n  <li>Item 2</li>\n</ul>\n\n<ol>\n  <li>First</li>\n  <li>Second</li>\n</ol>',
      challenge: 'Create both an ordered and unordered list with at least 5 items each',
      hints: '["<ul> for bullet points", "<ol> for numbered lists", "<li> for each item"]',
      order_num: 5,
      has_practical_test: 1
    },
    {
      module_id: 102,
      title: 'HTML Attributes',
      content: 'Attributes provide additional information about elements. Common attributes: id, class, src, href, alt, title.',
      example_code: '<div id="header" class="container">\n  <img src="logo.png" alt="Logo" title="Our Logo">\n  <a href="home.html" class="nav-link">Home</a>\n</div>',
      challenge: 'Create elements using id, class, and other attributes appropriately',
      hints: '["id must be unique", "class can be reused", "Attributes go in opening tag"]',
      order_num: 6,
      has_practical_test: 1,
      has_written_test: 1
    }
  ];

  const lessonStmt = db.prepare(`
    INSERT INTO lessons 
    (module_id, title, content, example_code, challenge, hints, order_num, has_practical_test, has_written_test, has_oral_test) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  lessons.forEach(l => {
    lessonStmt.run(
      l.module_id, l.title, l.content, l.example_code, l.challenge, l.hints, l.order_num,
      l.has_practical_test || 0, l.has_written_test || 0, l.has_oral_test || 0
    );
  });
  lessonStmt.finalize();
  console.log(`✅ Created ${lessons.length} lessons`);

  setTimeout(() => {
    console.log('\n✨ Adult curriculum seeded successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - ${modules.length} modules created`);
    console.log(`   - ${lessons.length} lessons created`);
    console.log('   - Total estimated hours: 170');
    console.log('\n🎓 Adult learner curriculum is ready!\n');
    
    db.close();
  }, 1000);
});
