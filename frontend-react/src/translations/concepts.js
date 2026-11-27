// Kid-friendly concept explanations used on the Lesson page (English / Kiswahili).
// HTML markup is intentionally kept in the strings; Lesson.js renders it as before.
const conceptExplanations = {
  en: {
    1: {
      0: {
        title: "What is Code? 🤖",
        explanation: "Code is like a <strong>secret recipe</strong> or a <strong>special instruction manual</strong> that tells computers, tablets, and robots exactly what to do! Just like you use words to tell a friend a story, programmers use code (special languages) to tell machines how to play games, show videos, or turn on lights.<br><br>Think of it this way: When you want your friend to make a sandwich, you tell them step by step: 'First, get two slices of bread. Then, add peanut butter. Finally, put the slices together.' Code works the same way! You write instructions step by step, and the computer follows them exactly!",
        example: "console.log('Hello, World!'); // This tells the computer to say hello!",
        analogy: "Code is like giving directions to a robot friend who does exactly what you say! If you say 'turn left,' it turns left. If you say 'jump,' it jumps! But you have to be very clear and use the special words (code) that the robot understands."
      },
      1: {
        title: "What is console.log? 🖨️",
        explanation: "Think of <code>console.log()</code> as a magic printer! Whatever you put inside the parentheses () gets printed to the screen. It's like telling the computer to show you a message!",
        example: "console.log('Hello!'); // This prints: Hello!",
        analogy: "It's like writing a note and showing it to someone!"
      },
      2: {
        title: "What are Variables? 📦",
        explanation: "Variables are like <strong>labeled boxes</strong> where you can store things! Imagine you have a toy box with a label that says 'LEGO' - you know what's inside without opening it!<br><br>In coding, you create a box (variable), give it a name, and put something inside it. Later, whenever you need what's in that box, you just call it by its name! The computer remembers what you put in there.<br><br>For example, if you create a variable called <code>age</code> and put the number 10 inside, the computer will remember that <code>age</code> means 10. You can use it over and over again!",
        example: "let age = 10; // A box named 'age' with 10 inside\nlet name = 'Alex'; // A box named 'name' with 'Alex' inside",
        analogy: "Like a toy box with a label - you know what's inside by reading the label! You can have many boxes: one for toys, one for books, one for snacks. Each box has a name and holds something special."
      },
      3: {
        title: "What are Numbers and Math? ➕",
        explanation: "Computers are <strong>super fast calculators</strong>! They can do math problems in the blink of an eye. You can add (+), subtract (-), multiply (*), and divide (/) numbers, and the computer does it instantly!<br><br>Just like in school math, you can write <code>5 + 3</code> and the computer knows the answer is 8. But computers can do thousands of calculations per second! That's why they're so good at games, counting scores, and solving puzzles.",
        example: "let total = 5 + 3; // total is now 8\nlet double = 10 * 2; // double is now 20\nlet half = 100 / 2; // half is now 50",
        analogy: "Like using a calculator, but the computer does it for you automatically! Imagine having a super-smart friend who can solve any math problem instantly!"
      },
      4: {
        title: "What are Strings (Text)? 📝",
        explanation: "Strings are <strong>words and sentences</strong> in code! You put them in quotes (\"\") to tell the computer 'this is text, not a math problem or code command.'<br><br>For example, if you write <code>\"Hello\"</code>, the computer knows you mean the word 'Hello' - not a variable or command. You can join strings together like building with blocks! <code>\"Hello\" + \" \" + \"World\"</code> becomes <code>\"Hello World\"</code>!<br><br>Strings can be names, messages, stories, or anything you want to write!",
        example: "let name = 'Alex'; // A string with the name Alex\nlet greeting = 'Hello, ' + name; // Joins strings: 'Hello, Alex'",
        analogy: "Like writing words on paper - the quotes are like the paper edges that show where your words start and end! You can write anything: your name, a story, a joke, or a secret message!"
      }
    },
    2: {
      1: {
        title: "What are If Statements? 🤔",
        explanation: "If statements help the computer make decisions! It's like asking a question: 'IF this is true, THEN do this.' The computer checks and decides what to do!",
        example: "if (age > 10) { console.log('You are old enough!'); }",
        analogy: "Like a choose-your-own-adventure book - different choices lead to different outcomes!"
      },
      2: {
        title: "What are Loops? 🔄",
        explanation: "Loops make the computer repeat things! Instead of writing the same code 100 times, you tell the computer 'do this 100 times.' It's a shortcut!",
        example: "for (let i = 0; i < 5; i++) { console.log('Hi!'); }",
        analogy: "Like doing jumping jacks - you count and repeat the same action!"
      },
      3: {
        title: "What are Comparisons? ⚖️",
        explanation: "Comparisons check if things are equal, bigger, or smaller! Use == for 'equal to', > for 'greater than', < for 'less than'. The computer answers true or false!",
        example: "5 > 3 // This is true! 5 is bigger than 3",
        analogy: "Like comparing heights - who is taller?"
      }
    },
    3: {
      1: {
        title: "What are Functions? 🎁",
        explanation: "Functions are like recipes! You write the steps once, give it a name, and then you can use that recipe anytime by calling its name. No need to write the steps again!",
        example: "function sayHello() { console.log('Hello!'); }",
        analogy: "Like a recipe card - write it once, use it many times!"
      },
      2: {
        title: "What are Parameters? 📥",
        explanation: "Parameters are like ingredients for your function recipe! You can give different ingredients each time you use the function, and it will work with whatever you give it!",
        example: "function greet(name) { console.log('Hi ' + name); }",
        analogy: "Like making a sandwich - same recipe, but you can choose different fillings!"
      },
      3: {
        title: "What is Return? 📤",
        explanation: "Return is like getting an answer back! When a function finishes its job, it can give you a result. You can save that result and use it later!",
        example: "function add(a, b) { return a + b; }",
        analogy: "Like asking a friend to solve a math problem - they give you the answer!"
      }
    },
    4: {
      1: {
        title: "What are Arrays? 📚",
        explanation: "Arrays are like a list or a row of boxes! Each box holds something, and they're numbered starting from 0. You can store many things in one array!",
        example: "let colors = ['red', 'blue', 'green'];",
        analogy: "Like a bookshelf - each book has a position (0, 1, 2...)"
      },
      2: {
        title: "What are Objects? 🎒",
        explanation: "Objects are like backpacks with labeled pockets! Each pocket has a name (key) and something inside (value). You can organize related information together!",
        example: "let person = { name: 'Alex', age: 10 };",
        analogy: "Like a backpack with labeled compartments - pencil case, lunch box, etc!"
      }
    },
    5: {
      1: {
        title: "What is Turtle Graphics? 🐢",
        explanation: "Imagine a turtle with a pen! You tell the turtle to move forward, turn left or right, and it draws as it moves. You're the turtle's teacher!",
        example: "forward(100); // Turtle walks forward 100 steps",
        analogy: "Like remote-controlling a robot that draws!"
      },
      2: {
        title: "What are Angles? 📐",
        explanation: "Angles are how much the turtle turns! 90 degrees is a square corner (like the corner of a book). 180 degrees is turning around completely!",
        example: "right(90); // Turn right like making a square corner",
        analogy: "Like turning a steering wheel - small turns or big turns!"
      }
    }
  },
  sw: {
    1: {
      0: {
        title: "Msimbo ni Nini? 🤖",
        explanation: "Msimbo ni kama <strong>mapishi ya siri</strong> au <strong>kitabu maalum cha maelekezo</strong> kinachowaambia kompyuta, vidonge na roboti nini cha kufanya! Kama vile unavyotumia maneno kumwambia rafiki hadithi, waandishi wa msimbo hutumia msimbo (lugha maalum) kuambia mashine jinsi ya kucheza michezo, kuonyesha video, au kuwasha taa.<br><br>Fikiria hivi: unapotaka rafiki wako atengeneze sandwichi, unamwambia hatua kwa hatua: 'Kwanza, chukua vipande viwili vya mkate. Kisha, weka siagi ya karanga. Mwishowe, viunge pamoja.' Msimbo hufanya kazi hivyo hivyo! Unaandika maelekezo hatua kwa hatua, na kompyuta inayafuata kwa usahihi!",
        example: "console.log('Habari, Dunia!'); // Hii inaambia kompyuta iseme habari!",
        analogy: "Msimbo ni kama kutoa maelekezo kwa rafiki roboti anayefanya hasa kile unachosema! Ukisema 'geuka kushoto,' anageuka kushoto. Ukisema 'ruka,' anaruka! Lakini lazima uwe wazi na utumie maneno maalum (msimbo) anayoelewa."
      },
      1: {
        title: "console.log ni nini? 🖨️",
        explanation: "Fikiria <code>console.log()</code> kama kichapishi cha uchawi! Kile unachoweka kwenye mabano () kinachapishwa kwenye skrini. Ni kama kuambia kompyuta ikuonyeshe ujumbe!",
        example: "console.log('Habari!'); // Hii inachapisha: Habari!",
        analogy: "Ni kama kuandika ujumbe na kumwonyesha mtu!"
      },
      2: {
        title: "Vigeuzi ni nini? 📦",
        explanation: "Vigeuzi ni kama <strong>masanduku yenye lebo</strong> ambapo unahifadhi vitu! Fikiria una sanduku la vifinyo lenye lebo inayosema 'LEGO' - unajua kilicho ndani bila kulifungua!<br><br>Katika kupiga msimbo, unaunda sanduku (kigeuzi), unalipa jina, na kuweka kitu ndani. Baadaye, unapohitaji kilicho ndani, unakiita tu kwa jina lake! Kompyuta inakumbuka ulichoweka.<br><br>Kwa mfano, ukiunda kigeuzi kinachoitwa <code>umri</code> na kuweka nambari 10 ndani, kompyuta itakumbuka kwamba <code>umri</code> inamaanisha 10. Unaweza kuitumia mara nyingi!",
        example: "let umri = 10; // Sanduku linaloitwa 'umri' lenye 10 ndani\nlet jina = 'Alex'; // Sanduku linaloitwa 'jina' lenye 'Alex' ndani",
        analogy: "Kama sanduku la vifinyo lenye lebo - unajua kilicho ndani kwa kusoma lebo! Unaweza kuwa na masanduku mengi: moja la vifinyo, moja la vitabu, moja la vyakula. Kila sanduku lina jina na linashikilia kitu maalum."
      },
      3: {
        title: "Nambari na Hesabu ni nini? ➕",
        explanation: "Kompyuta ni <strong>vikokotozi vya haraka sana</strong>! Zinaweza kutatua hesabu kwa muda mfupi sana. Unaweza kuongeza (+), kutoa (-), kuzidisha (*), na kugawanya (/) nambari, na kompyuta inafanya mara moja!<br><br>Kama kwa hesabu ya shule, unaweza kuandika <code>5 + 3</code> na kompyuta inajua kwamba jibu ni 8. Lakini kompyuta zinaweza kutatua maelfu ya hesabu kwa sekunde! Ndiyo maana zinafaa kwa michezo, kuhesabu alama, na kutatua mafumbo.",
        example: "let jumla = 5 + 3; // jumla sasa ni 8\nlet maraMbili = 10 * 2; // maraMbili sasa ni 20\nlet nusu = 100 / 2; // nusu sasa ni 50",
        analogy: "Kama kutumia kikokotoo, lakini kompyuta inakufanyia kazi! Fikiria kuwa na rafiki mwenye akili sana anayeweza kutatua hesabu yoyote mara moja!"
      },
      4: {
        title: "Manandishi (Strings) ni nini? 📝",
        explanation: "Manandishi ni <strong>maneno na sentensi</strong> kwenye msimbo! Unazifunga kwenye alama za nukuu (\"\") ili kuambia kompyuta 'hii ni maandishi, si hesabu wala amri.'<br><br>Kwa mfano, ukiandika <code>\"Habari\"</code>, kompyuta inajua unamaanisha neno 'Habari' - si kigeuzi wala amri. Unaweza kuunganisha manandishi kama kujenga vitalu! <code>\"Habari\" + \" \" + \"Dunia\"</code> inakuwa <code>\"Habari Dunia\"</code>!<br><br>Manandishi yanaweza kuwa majina, ujumbe, hadithi, au chochote unachotaka kuandika!",
        example: "let jina = 'Alex'; // Manandishi yenye jina Alex\nlet salamu = 'Habari, ' + jina; // Huunganisha: 'Habari, Alex'",
        analogy: "Kama kuandika maneno kwenye karatasi - alama za nukuu ni kama kingo za karatasi zinazonyesha wapi maneno yako yanaanza na kuishia! Unaweza kuandika chochote: jina lako, hadithi, utani, au ujumbe wa siri!"
      }
    },
    2: {
      1: {
        title: "Kauli za If ni nini? 🤔",
        explanation: "Kauli za if husaidia kompyuta kufanya maamuzi! Ni kama kuuliza swali: 'IKIWA hii ni kweli, BASI fanya hivi.' Kompyuta inakagua na kuamua nini cha kufanya!",
        example: "if (umri > 10) { console.log('Umefikia umri unaoruhusiwa!'); }",
        analogy: "Kama kitabu cha 'chagua njia yako' - chaguo tofauti huleta matokeo tofauti!"
      },
      2: {
        title: "Vilaza ni nini? 🔄",
        explanation: "Vilaza vinamfanya kompyuta kurudia vitu! Badala ya kuandika msimbo huo huo mara 100, unamwambia kompyuta 'fanya hivi mara 100.' Ni njia ya mkato!",
        example: "for (let i = 0; i < 5; i++) { console.log('Habari!'); }",
        analogy: "Kama kufanya mazoezi ya kujirusha mikono - unahesabu na kurudia kitu kile kile!"
      },
      3: {
        title: "Kulinganisha ni nini? ⚖️",
        explanation: "Kulinganisha huangalia kama vitu ni sawa, vikubwa, au vidogo! Tumia == kwa 'sawa na', > kwa 'kubwa kuliko', < kwa 'ndogo kuliko'. Kompyuta hujibu kweli au si kweli!",
        example: "5 > 3 // Hii ni kweli! 5 ni kubwa kuliko 3",
        analogy: "Kama kulinganisha urefu - nani ni mrefu zaidi?"
      }
    },
    3: {
      1: {
        title: "Kazi (Functions) ni nini? 🎁",
        explanation: "Kazi ni kama mapishi! Unaandika hatua mara moja, unalipa jina, na kisha unaweza kutumia mapishi hayo wakati wowote kwa kuita jina lake. Huhitaji kuandika hatua tena!",
        example: "function semaHabari() { console.log('Habari!'); }",
        analogy: "Kama kadi ya mapishi - andika mara moja, tumia mara nyingi!"
      },
      2: {
        title: "Vigezo vya Kazi ni nini? 📥",
        explanation: "Vigezo ni kama viungo vya mapishi yako ya kazi! Unaweza kutoa viungo tofauti kila unapoitumia kazi, na itafanya kazi na kile unachokipa!",
        example: "function salimu(jina) { console.log('Habari ' + jina); }",
        analogy: "Kama kutengeneza sandwichi - mapishi yale yale, lakini unaweza kuchagua viungo tofauti!"
      },
      3: {
        title: "Return ni nini? 📤",
        explanation: "Return ni kama kupata jibu tena! Kazi ikimaliza kazi yake, inaweza kukupa matokeo. Unaweza kuhifadhi matokeo hayo na kuyatumia baadaye!",
        example: "function jumlisha(a, b) { return a + b; }",
        analogy: "Kama kumwambia rafiki atatue hesabu - anakupa jibu!"
      }
    },
    4: {
      1: {
        title: "Safu (Arrays) ni nini? 📚",
        explanation: "Safu ni kama orodha au safu ya masanduku! Kila sanduku lina kitu, na zimehesabiwa kuanzia 0. Unaweza kuhifadhi vitu vingi kwenye safu moja!",
        example: "let rangi = ['nyekundu', 'buluu', 'kijani'];",
        analogy: "Kama rafu ya vitabu - kila kitabu kina nafasi yake (0, 1, 2...)"
      },
      2: {
        title: "Vitu (Objects) ni nini? 🎒",
        explanation: "Vitu ni kama mikoba yenye mifuko yenye lebo! Kila mfuko una jina (ufunguo) na kitu ndani (thamani). Unaweza kupanga taarifa zinazohusiana pamoja!",
        example: "let mtu = { jina: 'Alex', umri: 10 };",
        analogy: "Kama mkoba wenye sehemu zilizo na lebo - kisanduku cha penseli, kisanduku cha chakula, n.k!"
      }
    },
    5: {
      1: {
        title: "Michoro ya Kobe ni nini? 🐢",
        explanation: "Fikiria kobe mwenye kalamu! Unamwambia kobe asonge mbele, ageuke kushoto au kulia, na anachora anaposogea. Wewe ni mwalimu wa kobe!",
        example: "forward(100); // Kobe anatembea hatua 100 mbele",
        analogy: "Kama kudhibiti roboti kwa kidhibiti cha mbali inayochora!"
      },
      2: {
        title: "Pembe ni nini? 📐",
        explanation: "Pembe ni kiasi cha kugeuka kwa kobe! Digrii 90 ni kona ya mraba (kama kona ya kitabu). Digrii 180 ni kugeuka kabisa!",
        example: "right(90); // Geuka kulia kama kutengeneza kona ya mraba",
        analogy: "Kama kugeuza usukani - mageuzo madogo au makubwa!"
      }
    }
  }
};

// Fallback pattern matches lessons.js: missing Kiswahili content uses English.
export const getTranslatedConcept = (moduleId, lessonId, language = 'en') => {
  return conceptExplanations[language]?.[moduleId]?.[lessonId] || conceptExplanations.en[moduleId]?.[lessonId] || null;
};

export default conceptExplanations;
