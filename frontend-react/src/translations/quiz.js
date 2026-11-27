// Quiz content translations. Correct answer indexes stay in the English source so
// both languages always point to the same option. Mirrors lessons.js helper style.
const quizContent = {
  en: {
    1: {
      title: 'Welcome to Coding! 🚀',
      description: 'Test your understanding of basic coding concepts',
      passingScore: 70,
      questions: [
        {
          question: 'What does console.log("Hello") do?',
          options: ['Deletes the word Hello', 'Prints "Hello" to the console', 'Creates a variable named Hello', 'Stops the program'],
          correct: 1,
          explanation: 'console.log() is used to print messages and values to the console, helping you see what your code is doing!'
        },
        {
          question: 'Which keyword creates a variable that CAN be changed later?',
          options: ['const', 'let', 'var', 'Both let and var'],
          correct: 3,
          explanation: 'Both "let" and "var" create variables that can be changed. "const" creates variables that cannot be changed!'
        },
        {
          question: 'What is the result of: 5 + 3 * 2',
          options: ['16', '11', '13', '10'],
          correct: 1,
          explanation: 'Multiplication happens before addition! So 3 * 2 = 6, then 5 + 6 = 11. Remember PEMDAS!'
        },
        {
          question: 'What does this code print? let age = 10; if (age > 12) { console.log("Teen"); } else { console.log("Kid"); }',
          options: ['Teen', 'Kid', 'Nothing', 'Error'],
          correct: 1,
          explanation: 'Since 10 is NOT greater than 12, the else block runs and prints "Kid"!'
        },
        {
          question: 'What is a variable best compared to?',
          options: ['A loop that repeats', 'A labeled box that stores information', 'A decision maker', 'A printer'],
          correct: 1,
          explanation: 'A variable is like a labeled box - you put information in it and can get it out later by using its name!'
        },
        {
          question: 'What does the + operator do with text? "Hello" + " " + "World"',
          options: ['Adds the numbers', 'Joins the text together', 'Causes an error', 'Deletes the text'],
          correct: 1,
          explanation: 'The + operator joins (concatenates) text together! "Hello" + " " + "World" becomes "Hello World"'
        }
      ]
    },
    2: {
      title: 'Creative Animations 🎨',
      description: 'Test your turtle graphics and loop knowledge',
      passingScore: 70,
      questions: [
        {
          question: 'To draw a square, how many times should you repeat: forward(100); right(90);',
          options: ['2 times', '3 times', '4 times', '5 times'],
          correct: 2,
          explanation: 'A square has 4 sides, so you need to repeat the forward and turn commands 4 times!'
        },
        {
          question: 'What does this loop do? for (let i = 0; i < 3; i++) { console.log("Hi"); }',
          options: ['Prints "Hi" 2 times', 'Prints "Hi" 3 times', 'Prints "Hi" 4 times', 'Causes an error'],
          correct: 1,
          explanation: 'The loop starts at 0 and runs while i < 3, so it runs for i=0, i=1, and i=2. That\'s 3 times!'
        },
        {
          question: 'To draw a triangle, what angle should you turn at each corner?',
          options: ['90 degrees', '120 degrees', '60 degrees', '180 degrees'],
          correct: 1,
          explanation: 'For a triangle, you turn 120 degrees at each corner. The exterior angles of a triangle are 120 degrees!'
        },
        {
          question: 'What happens after penUp() is called?',
          options: ['The turtle draws a line', 'The turtle moves without drawing', 'The turtle changes color', 'The turtle stops moving'],
          correct: 1,
          explanation: 'penUp() lifts the pen, so the turtle can move around without drawing lines!'
        },
        {
          question: 'How do you make the turtle draw in red?',
          options: ['red()', 'color("red")', 'paint("red")', 'setColor(red)'],
          correct: 1,
          explanation: 'Use color("red") to change the turtle\'s pen color. Put the color name in quotes!'
        },
        {
          question: 'What does i++ do in a for loop?',
          options: ['Decreases i by 1', 'Increases i by 1', 'Multiplies i by 2', 'Resets i to 0'],
          correct: 1,
          explanation: 'i++ is shorthand for i = i + 1. It increases the value of i by 1 each time the loop runs!'
        }
      ]
    },
    3: {
      title: 'Game Design Basics 🎮',
      description: 'Test your game logic and function knowledge',
      passingScore: 70,
      questions: [
        {
          question: 'What does Math.floor(Math.random() * 6) + 1 give you?',
          options: ['A random number from 0 to 5', 'A random number from 1 to 6', 'A random number from 0 to 6', 'Always gives 6'],
          correct: 1,
          explanation: 'Math.random() * 6 gives 0 to 5.999, Math.floor() rounds down to 0-5, then +1 makes it 1-6. Perfect for a dice roll!'
        },
        {
          question: 'What does this function return? function double(x) { return x * 2; } double(5);',
          options: ['5', '10', '7', 'Nothing'],
          correct: 1,
          explanation: 'The function takes 5, multiplies it by 2, and returns 10!'
        },
        {
          question: 'What is score after this code? let score = 10; score += 5; score++;',
          options: ['10', '15', '16', '11'],
          correct: 2,
          explanation: 'Start with 10, add 5 (now 15), then add 1 with ++ (now 16)!'
        },
        {
          question: 'What are parameters in a function?',
          options: ['The function name', 'Values you pass into the function', 'The return value', 'The function body'],
          correct: 1,
          explanation: 'Parameters are like ingredients - you pass them into the function so it can use them!'
        },
        {
          question: 'How do you call a function named "jump" that takes no parameters?',
          options: ['function jump()', 'jump()', 'call jump()', 'run jump'],
          correct: 1,
          explanation: 'To call a function, write its name followed by parentheses: jump()'
        },
        {
          question: 'What does return do in a function?',
          options: ['Prints to console', 'Sends a value back to where the function was called', 'Stops the program', 'Creates a variable'],
          correct: 1,
          explanation: 'return sends a value back to whoever called the function, so they can use it!'
        }
      ]
    },
    4: {
      title: 'Web Wizards 🌐',
      description: 'Test your HTML and CSS knowledge',
      passingScore: 70,
      questions: [
        {
          question: 'Which HTML tag creates a clickable link?',
          options: ['<link>', '<a>', '<href>', '<url>'],
          correct: 1,
          explanation: 'The <a> tag (anchor) creates links! Use it like: <a href="url">Click me</a>'
        },
        {
          question: 'What does CSS stand for?',
          options: ['Computer Style Sheets', 'Cascading Style Sheets', 'Creative Style System', 'Colorful Site Styles'],
          correct: 1,
          explanation: 'CSS stands for Cascading Style Sheets - it makes websites beautiful!'
        },
        {
          question: 'Which CSS property changes the background color?',
          options: ['color', 'background-color', 'bg-color', 'background'],
          correct: 1,
          explanation: 'Use background-color to change the background! Example: background-color: blue;'
        },
        {
          question: 'What does <h1> create?',
          options: ['A paragraph', 'The biggest heading', 'A link', 'An image'],
          correct: 1,
          explanation: '<h1> creates the biggest heading. Headings go from <h1> (biggest) to <h6> (smallest)!'
        },
        {
          question: 'How do you make text bold in HTML?',
          options: ['<bold>', '<b> or <strong>', '<text-bold>', '<weight>'],
          correct: 1,
          explanation: 'Use <b> or <strong> to make text bold! <strong> also tells screen readers it\'s important.'
        },
        {
          question: 'What does the <div> tag do?',
          options: ['Creates a division', 'Creates a container for grouping elements', 'Divides the page', 'Creates a button'],
          correct: 1,
          explanation: '<div> is a container that groups elements together. It\'s like a box that holds other HTML elements!'
        }
      ]
    },
    5: {
      title: 'Python Explorers 🐍',
      description: 'Test your Python knowledge',
      passingScore: 70,
      questions: [
        {
          question: 'How do you create a comment in Python?',
          options: ['//', '#', '/*', '--'],
          correct: 1,
          explanation: 'In Python, use # for comments. In JavaScript, we use //!'
        },
        {
          question: 'What is the output? print(5 + 3 * 2)',
          options: ['16', '11', '13', '10'],
          correct: 1,
          explanation: 'Just like in JavaScript, multiplication happens first! 3 * 2 = 6, then 5 + 6 = 11'
        },
        {
          question: 'What is a list in Python similar to in JavaScript?',
          options: ['Object', 'Array', 'String', 'Function'],
          correct: 1,
          explanation: 'Python lists are like JavaScript arrays - they store multiple items in order!'
        },
        {
          question: 'How do you print "Hello" in Python?',
          options: ['console.log("Hello")', 'print("Hello")', 'echo "Hello"', 'System.out.println("Hello")'],
          correct: 1,
          explanation: 'In Python, use print()! In JavaScript, we use console.log()'
        },
        {
          question: 'What is a dictionary in Python similar to in JavaScript?',
          options: ['Array', 'Object', 'String', 'Number'],
          correct: 1,
          explanation: 'Python dictionaries are like JavaScript objects - they store key-value pairs!'
        },
        {
          question: 'What does indentation do in Python?',
          options: ['Makes code look nice', 'Defines code blocks (like { } in JavaScript)', 'Nothing important', 'Creates comments'],
          correct: 1,
          explanation: 'In Python, indentation is VERY important! It defines code blocks, like curly braces { } do in JavaScript!'
        }
      ]
    }
  },
  sw: {
    1: {
      title: 'Karibu kwa Kupiga Msimbo! 🚀',
      description: 'Jaribu uelewa wako wa misingi ya kupiga msimbo',
      questions: [
        {
          question: 'console.log("Hello") hufanya nini?',
          options: ['Inafuta neno Hello', 'Inachapisha "Hello" kwenye koni', 'Inaunda kigeuzi kinachoitwa Hello', 'Inasimamisha programu'],
          explanation: 'console.log() hutumiwa kuchapisha ujumbe na maadili kwenye koni, ili uone kile msimbo wako unafanya!'
        },
        {
          question: 'Ni neno gani la ufunguo linalounda kigeuzi kinachoweza kubadilishwa baadaye?',
          options: ['const', 'let', 'var', 'Zote let na var'],
          explanation: '"let" na "var" zote huunda vigeuzi vinavyoweza kubadilishwa. "const" huunda kigeuzi ambacho hakiwezi kubadilishwa!'
        },
        {
          question: 'Matokeo ya 5 + 3 * 2 ni nini?',
          options: ['16', '11', '13', '10'],
          explanation: 'Kuzidisha hufanyika kabla ya kuongeza! Kwa hivyo 3 * 2 = 6, kisha 5 + 6 = 11. Kumbuka utaratibu wa hesabu!'
        },
        {
          question: 'Msimbo huu unachapisha nini? let age = 10; if (age > 12) { console.log("Teen"); } else { console.log("Kid"); }',
          options: ['Teen', 'Kid', 'Hakuna kitu', 'Hitilafu'],
          explanation: 'Kwa sababu 10 SI kubwa kuliko 12, sehemu ya else inaendeshwa na kuchapisha "Kid"!'
        },
        {
          question: 'Kigeuzi kinaweza kulinganishwa na nini?',
          options: ['Kitanzi kinachorudia', 'Sanduku lenye lebo la kuhifadhi taarifa', 'Mfanyi wa maamuzi', 'Kichapishi'],
          explanation: 'Kigeuzi ni kama sanduku lenye lebo - unaweka taarifa ndani na kuitoa baadaye kwa kutumia jina lake!'
        },
        {
          question: 'Opereta + hufanya nini kwa maandishi? "Hello" + " " + "World"',
          options: ['Huongeza nambari', 'Huousha maandishi pamoja', 'Husababisha hitilafu', 'Hufuta maandishi'],
          explanation: 'Opereta + huunganisha maandishi pamoja! "Hello" + " " + "World" inakuwa "Hello World"'
        }
      ]
    },
    2: {
      title: 'Uhuishaji wa Ubunifu 🎨',
      description: 'Jaribu ujuzi wako wa michoro ya kobe na vilaza',
      questions: [
        {
          question: 'Ili kuchora mraba, unapaswa kurudia amri hii mara ngapi: forward(100); right(90);',
          options: ['mara 2', 'mara 3', 'mara 4', 'mara 5'],
          explanation: 'Mraba una pande 4, kwa hivyo unarudia amri za kusonga mbele na kugeuka mara 4!'
        },
        {
          question: 'Kitanzi hiki hufanya nini? for (let i = 0; i < 3; i++) { console.log("Hi"); }',
          options: ['Inachapisha "Hi" mara 2', 'Inachapisha "Hi" mara 3', 'Inachapisha "Hi" mara 4', 'Husababisha hitilafu'],
          explanation: 'Kitanzi huanza saa 0 na kiendelea i < 3, kwa hivyo kinaendeshwa kwa i=0, i=1, na i=2. Hiyo ni mara 3!'
        },
        {
          question: 'Ili kuchora pembetatu, unapaswa kugeuka digrii ngapi kwenye kila kona?',
          options: ['digrii 90', 'digrii 120', 'digrii 60', 'digrii 180'],
          explanation: 'Kwa pembetatu, unageuka digrii 120 kwenye kila kona. Pembe za nje za pembetatu ni digrii 120!'
        },
        {
          question: 'Nini hutokea baada ya penUp() kuitwa?',
          options: ['Kobe huchora mstari', 'Kobe husogea bila kuchora', 'Kobe hubadilisha rangi', 'Kobe huacha kusogea'],
          explanation: 'penUp() inainua kalamu, kwa hivyo kobe inaweza kusogea bila kuchora mistari!'
        },
        {
          question: 'Unamfanyaje kobe achore kwa rangi nyekundu?',
          options: ['red()', 'color("red")', 'paint("red")', 'setColor(red)'],
          explanation: 'Tumia color("red") kubadilisha rangi ya kalamu ya kobe. Weka jina la rangi kwenye alama za nukuu!'
        },
        {
          question: 'i++ hufanya nini kwenye kitanzi cha for?',
          options: ['Hupunguza i kwa 1', 'Huongeza i kwa 1', 'Huzidisha i kwa 2', 'Huirudisha i kuwa 0'],
          explanation: 'i++ ni kifupisho cha i = i + 1. Huongeza thamani ya i kwa 1 kila wakati kitanzi kinapoendeshwa!'
        }
      ]
    },
    3: {
      title: 'Misingi ya Kubuni Michezo 🎮',
      description: 'Jaribu mantiki ya mchezo na ujuzi wa kazi (functions)',
      questions: [
        {
          question: 'Math.floor(Math.random() * 6) + 1 hukupa nini?',
          options: ['Nambari ya nasibu kutoka 0 hadi 5', 'Nambari ya nasibu kutoka 1 hadi 6', 'Nambari ya nasibu kutoka 0 hadi 6', 'Hutoa 6 kila wakati'],
          explanation: 'Math.random() * 6 hutoa 0 hadi 5.999, Math.floor() huzungusha chini hadi 0-5, kisha +1 hufanya iwe 1-6. Inafaa kwa kutupa kete!'
        },
        {
          question: 'Kazi hii inarudisha nini? function double(x) { return x * 2; } double(5);',
          options: ['5', '10', '7', 'Hakuna kitu'],
          explanation: 'Kazi inachukua 5, kuizidisha kwa 2, na kurudisha 10!'
        },
        {
          question: 'Alama ni nini baada ya msimbo huu? let score = 10; score += 5; score++;',
          options: ['10', '15', '16', '11'],
          explanation: 'Anza na 10, ongeza 5 (sasa 15), kisha ongeza 1 kwa ++ (sasa 16)!'
        },
        {
          question: 'Vigezo (parameters) kwenye kazi ni nini?',
          options: ['Jina la kazi', 'Maadili unayoyapeleka kwenye kazi', 'Thamani inayorudishwa', 'Mwili wa kazi'],
          explanation: 'Vigezo ni kama viungo - unavipeleka kwenye kazi ili ivitumie!'
        },
        {
          question: 'Unapoita kazi inayoitwa "jump" isiyo na vigezo, unaandikaje?',
          options: ['function jump()', 'jump()', 'call jump()', 'run jump'],
          explanation: 'Ili kuita kazi, andika jina lake likifuatwa na mabano: jump()'
        },
        {
          question: 'return hufanya nini kwenye kazi?',
          options: ['Huchapisha kwenye koni', 'Hurudisha thamani mahali kazi ilipoitiwa', 'Husimamisha programu', 'Huunda kigeuzi'],
          explanation: 'return hurudisha thamani kwa aliyeita kazi, ili aiweze kutumia!'
        }
      ]
    },
    4: {
      title: 'Wachawi wa Wavuti 🌐',
      description: 'Jaribu ujuzi wako wa HTML na CSS',
      questions: [
        {
          question: 'Lebo gani ya HTML hutengeneza kiungo kinachobofyeka?',
          options: ['<link>', '<a>', '<href>', '<url>'],
          explanation: 'Lebo <a> (anchor) hutengeneza viungo! Tumia kama: <a href="url">Bofya hapa</a>'
        },
        {
          question: 'CSS inasimamia nini?',
          options: ['Computer Style Sheets', 'Cascading Style Sheets', 'Creative Style System', 'Colorful Site Styles'],
          explanation: 'CSS inasimamia Cascading Style Sheets - hufanya tovuti kuwa nzuri!'
        },
        {
          question: 'Sifa gani ya CSS hubadilisha rangi ya mandharinyuma?',
          options: ['color', 'background-color', 'bg-color', 'background'],
          explanation: 'Tumia background-color kubadilisha mandharinyuma! Mfano: background-color: blue;'
        },
        {
          question: '<h1> hutengeneza nini?',
          options: ['Aya', 'Kichwa kikubwa zaidi', 'Kiungo', 'Picha'],
          explanation: '<h1> hutengeneza kichwa kikubwa zaidi. Vichwa huanza <h1> (kikubwa) hadi <h6> (kidogo)!'
        },
        {
          question: 'Unafanyaje maandishi kuwa nzito kwenye HTML?',
          options: ['<bold>', '<b> au <strong>', '<text-bold>', '<weight>'],
          explanation: 'Tumia <b> au <strong> kufanya maandishi kuwa nzito! <strong> pia huambia visoma skrini kuwa ni muhimu.'
        },
        {
          question: 'Lebo <div> hufanya nini?',
          options: ['Huunda mgawanyiko', 'Huunda chombo cha kukusanya vitu', 'Hugawanya ukurasa', 'Huunda kitufe'],
          explanation: '<div> ni chombo kinachokusanya vitu pamoja. Ni kama sanduku linaloshikilia vitu vingine vya HTML!'
        }
      ]
    },
    5: {
      title: 'Wachunguzi wa Python 🐍',
      description: 'Jaribu ujuzi wako wa Python',
      questions: [
        {
          question: 'Unaundaje maoni (comment) kwenye Python?',
          options: ['//', '#', '/*', '--'],
          explanation: 'Katika Python, tumia # kwa maoni. Katika JavaScript, tunatumia //!'
        },
        {
          question: 'Matokeo ni nini? print(5 + 3 * 2)',
          options: ['16', '11', '13', '10'],
          explanation: 'Kama katika JavaScript, kuzidisha hufanyika kwanza! 3 * 2 = 6, kisha 5 + 6 = 11'
        },
        {
          question: 'Orodha (list) kwenye Python ni sawa na nini kwenye JavaScript?',
          options: ['Kitu (Object)', 'Safu (Array)', 'Mnyororo (String)', 'Kazi (Function)'],
          explanation: 'Orodha za Python ni kama safu za JavaScript - zihifadhi vitu vingi kwa mpangilio!'
        },
        {
          question: 'Unachapishaje "Hello" kwenye Python?',
          options: ['console.log("Hello")', 'print("Hello")', 'echo "Hello"', 'System.out.println("Hello")'],
          explanation: 'Katika Python, tumia print()! Katika JavaScript, tunatumia console.log()'
        },
        {
          question: 'Kamusi (dictionary) kwenye Python ni sawa na nini kwenye JavaScript?',
          options: ['Safu (Array)', 'Kitu (Object)', 'Mnyororo (String)', 'Nambari'],
          explanation: 'Kamusi za Python ni kama vitu vya JavaScript - zihifadhi jozi za ufunguo na thamani!'
        },
        {
          question: 'Uingizaji (indentation) hufanya nini kwenye Python?',
          options: ['Hufanya msimbo uoneke mzuri', 'Huainisha vizuizi vya msimbo (kama { } kwenye JavaScript)', 'Hakuna maana muhimu', 'Huunda maoni'],
          explanation: 'Katika Python, uingizaji ni MUHIMU sana! Huainisha vizuizi vya msimbo, kama mabano { } yanavyofanya kwenye JavaScript!'
        }
      ]
    }
  }
};

// Same fallback pattern as lessons.js: always keep a usable English answer.
export const getTranslatedQuiz = (moduleId, language = 'en') => {
  const base = quizContent.en[moduleId] || quizContent.en[1];
  const localized = quizContent[language]?.[moduleId];
  if (!localized) return base;
  return {
    ...base,
    title: localized.title || base.title,
    description: localized.description || base.description,
    questions: base.questions.map((q, i) => {
      const lq = localized.questions?.[i] || {};
      return {
        ...q,
        question: lq.question || q.question,
        options: lq.options || q.options,
        explanation: lq.explanation || q.explanation
      };
    })
  };
};

// If a quiz (or a question) comes from the API with a translations map, use it;
// otherwise fall back to the bundled translation above. API shape is unchanged.
export const localizeQuiz = (quiz, language = 'en') => {
  if (!quiz) return quiz;
  const localized = quiz.translations?.[language];
  if (!localized) return quiz;
  return {
    ...quiz,
    title: localized.title || quiz.title,
    description: localized.description || quiz.description,
    questions: (quiz.questions || []).map((q, i) => {
      const lq = localized.questions?.[i] || {};
      return {
        ...q,
        question: lq.question || q.question,
        options: lq.options || q.options,
        explanation: lq.explanation || q.explanation
      };
    })
  };
};

export default quizContent;
