'use strict';
/**
 * Course 2 - Java Programming (modules 109-111).
 * TVET CDACC Computer Science L6, ICT/CU/CS/CR/04/6/A "Fundamentals of Programming":
 *   LO1 programming concepts, LO2 the Java environment, LO3 data operations,
 *   LO4 control structures, LO5 methods, LO6 object-oriented programming.
 * Also covers the OOP outcome of ICT Technician L6 IT/CU/ICTA/CC/02/5/MA
 * (encapsulation, abstraction, inheritance, polymorphism).
 *
 * Lesson format: see adultCourse/index.js. Checks with in: 'output' run the learner's program.
 */

const M109 = {
  id: 109, order: 9, icon: '☕', color: '#e76f00', difficulty: 'beginner',
  title: 'Programming Concepts and Java Basics',
  description: 'How programs are made, your first Java program, data types, variables and calculations.',
  lessons: [
    {
      title: 'What Programming Is', minutes: 45,
      content: `A program is a set of instructions a computer follows exactly, in order. Programming is designing, writing, testing and maintaining those instructions.

## Phases of program development
- {{Establish requirements}}: what must the program do? (for example: "calculate a sacco member's loan repayment")
- {{Design}}: plan the steps as an algorithm, flowchart or pseudocode
- {{Coding}}: write the program in a language such as Java
- {{Test and debug}}: run it, find mistakes (bugs) and fix them
- {{Document}}: explain how it works for users and other developers
- {{Maintain}}: update it as needs change

## Key terms
- {{Algorithm}}: step-by-step procedure that solves a problem
- {{Source code}}: what the programmer writes (Main.java)
- {{Object code}}: the translated, not-yet-runnable form; in Java this is bytecode (Main.class)
- {{Machine code}}: binary instructions the processor runs
- {{Executable}}: a program ready to run
- {{Debugging}}: finding and fixing errors

## Translators
- {{Compiler}}: translates the whole program before it runs (javac turns Main.java into Main.class)
- {{Interpreter}}: translates and runs one statement at a time (Python, the Java Virtual Machine running bytecode)
- {{Assembler}}: translates assembly language into machine code

## A first look at Java
~~~
public class Main {
    public static void main(String[] args) {
        System.out.println("Step 1: Establish requirements");
    }
}
~~~
{{System.out.println}} prints one line. Every statement ends with a semicolon.`,
      example: { java: `public class Main {
    public static void main(String[] args) {
        System.out.println("Algorithm: make chai");
        System.out.println("1. Boil water");
        System.out.println("2. Add tea leaves and milk");
        System.out.println("3. Add sugar and serve");
    }
}` },
      challenge: 'Write a Java program that prints the six phases of program development, one per line, numbered "Phase 1:" to "Phase 6:".',
      checks: [
        { label: 'Has a main method', in: 'code', re: /public\s+static\s+void\s+main\s*\(\s*String/ },
        { label: 'Prints Phase 1 (requirements)', in: 'output', re: /Phase\s+1[:\-]?/i },
        { label: 'Prints the design and coding phases', in: 'output', re: /Phase\s+2[\s\S]*Phase\s+3/i },
        { label: 'Prints Phase 6 (maintain)', in: 'output', re: /Phase\s+6/i },
      ],
      hints: ['Use one System.out.println(...) line for each phase.', 'The phases are: requirements, design, coding, test and debug, document, maintain.'],
      quiz: [
        { q: 'Which translator converts a whole Java source file into bytecode before it runs?', options: ['Compiler (javac)', 'Assembler', 'Interpreter only', 'Debugger'], why: 'javac compiles Main.java into Main.class (bytecode) before the program runs.' },
        { q: 'What is source code?', options: ['The program as written by the programmer', 'Binary instructions for the CPU', 'The compiled .class file', 'A list of bugs'], why: 'Source code is the human-readable program text.' },
        { q: 'Which phase comes right after designing the program?', options: ['Coding', 'Maintenance', 'Documentation', 'Establishing requirements'], why: 'Requirements, design, coding, test and debug, document, maintain.' },
      ],
      oral: 'Explain the difference between a compiler and an interpreter, using Java as an example.',
      solution: { java: `public class Main {
    public static void main(String[] args) {
        System.out.println("Phase 1: Establish program requirements");
        System.out.println("Phase 2: Design the program");
        System.out.println("Phase 3: Coding");
        System.out.println("Phase 4: Test and debug");
        System.out.println("Phase 5: Document");
        System.out.println("Phase 6: Maintain");
    }
}` },
    },
    {
      title: 'The Java Environment and Syntax', minutes: 50,
      content: `To write Java on your own computer you install the {{JDK}} (Java Development Kit), which contains the compiler {{javac}} and the {{java}} launcher. On Windows you also set the {{JAVA_HOME}} environment variable and add its bin folder to {{Path}}, so {{java -version}} works in Command Prompt. IDEs such as {{Eclipse}} or {{IntelliJ IDEA}} add an editor, debugger and Run button. In KidsCode the server has the JDK, so you can write and run code straight away.

## Features of Java
- Platform independent: compile once, run on any computer with a JVM
- Object-oriented, strongly typed and secure
- Huge library (lists, dates, networking) and used for Android and banking systems

## Syntax rules
- {{Case sensitive}}: {{Total}} and {{total}} are different names
- {{Class names}} start with a capital letter: {{BankAccount}}
- {{Method names}} start with a small letter: {{calculateTax}}
- The {{file name}} must match the public class: {{Main.java}} for {{public class Main}}
- Every program starts in {{public static void main(String[] args)}}
- {{Identifiers}} (names) use letters, digits, _ and $, and cannot start with a digit or be a keyword
- {{Keywords}} are reserved: class, public, static, void, int, if, for, new, return ...
- {{Modifiers}}: access (public, private, protected) and non-access (static, final, abstract)
- Comments: {{// one line}} and {{/* several lines */}}

~~~
// A program that greets a customer
public class Main {
    public static void main(String[] args) {
        String customer = "Wanjiru";   // a variable
        System.out.println("Karibu, " + customer + "!");
        System.out.print("Your order is ready. ");
        System.out.println("Asante!");
    }
}
~~~
{{print}} stays on the same line; {{println}} ends the line. The {{+}} operator joins strings.`,
      example: { java: `// Prints a shop's opening hours
public class Main {
    public static void main(String[] args) {
        String shop = "Mama Mboga Fresh";
        System.out.println("Welcome to " + shop);
        System.out.print("Open: ");
        System.out.println("Mon-Sat, 7am to 8pm");
    }
}` },
      challenge: 'Write a class Main whose program stores your town in a String variable called town and prints "I am learning Java in <town>" and, on the next line, "Java is case sensitive". Add at least one comment.',
      checks: [
        { label: 'Has a comment', in: 'code', re: /\/\/|\/\*/ },
        { label: 'Declares a String variable called town', in: 'code', re: /String\s+town\s*=/ },
        { label: 'Prints "I am learning Java in ..."', in: 'output', re: /I am learning Java in\s+\S/i },
        { label: 'Prints "Java is case sensitive"', in: 'output', re: /Java is case sensitive/i },
      ],
      hints: ['String town = "Kisumu";', 'Join text and a variable with +: "I am learning Java in " + town'],
      quiz: [
        { q: 'What must the file be called for public class Invoice?', options: ['Invoice.java', 'invoice.java', 'Main.java', 'Invoice.class'], why: 'The file name must match the public class name exactly, including capitals.' },
        { q: 'Which of these is a valid Java identifier?', options: ['totalSales', '2ndPlace', 'class', 'net-pay'], why: 'Identifiers cannot start with a digit, be a keyword or contain "-".' },
        { q: 'What does the JDK contain that the plain JRE does not?', options: ['The javac compiler', 'The JVM', 'The class library', 'A web browser'], why: 'The JDK adds development tools such as javac to the runtime.' },
      ],
      oral: 'Describe how you would install Java on a Windows computer and check that it works.',
      solution: { java: `public class Main {
    public static void main(String[] args) {
        // where I live
        String town = "Nakuru";
        System.out.println("I am learning Java in " + town);
        System.out.println("Java is case sensitive");
    }
}` },
    },
    {
      title: 'Data Types, Variables and Constants', minutes: 55,
      content: `A {{variable}} is a named storage location with a {{data type}}. Java checks types when it compiles, which catches many mistakes early.

## Common data types
- {{int}}: whole numbers (quantity = 12)
- {{long}}: very large whole numbers (phone numbers as numbers, populations)
- {{double}} / {{float}}: numbers with decimals (price = 249.50)
- {{boolean}}: true or false (isPaid = true)
- {{char}}: one character ('A')
- {{String}}: text ("Mombasa") - a class, so it starts with a capital S

## Statements
- {{Declaration}}: int stock;
- {{Expression}}: stock = stock - 2;
- {{Control-flow}}: if, for, while (next module)

## Kinds of variables
- {{Local}}: declared inside a method; exists only while it runs
- {{Instance}}: declared in a class; each object has its own copy
- {{Class (static)}}: declared with static; shared by all objects

## Constants
A constant never changes. Use {{final}} and CAPITAL names:
~~~
final double VAT_RATE = 0.16;   // real (floating-point) constant
final int MAX_ITEMS = 50;       // integer constant
final char GRADE = 'A';         // single character constant
final String SHOP = "Duka";     // string constant
~~~

## Data operations
~~~
int quantity = 3;                 // assignment
double unitPrice = 120.0;
double subtotal = quantity * unitPrice;      // arithmetic
double total = subtotal + subtotal * VAT_RATE;
System.out.println("Total: " + total);       // reading a variable
~~~
Converting between types: {{(int) 7.9}} gives 7; {{Integer.parseInt("42")}} turns text into a number.

## Doubles are approximate
Computers store doubles in binary, so {{1500 * 4 * 1.16}} prints {{6959.999999999999}}. For money, format the result: {{System.out.printf("%.2f%n", total)}} prints 6960.00. (Banks use {{BigDecimal}} for exact amounts.)`,
      example: { java: `public class Main {
    public static void main(String[] args) {
        final double VAT_RATE = 0.16;
        String item = "Solar lamp";
        int quantity = 2;
        double price = 2300.0;
        boolean delivered = false;
        double total = quantity * price * (1 + VAT_RATE);
        System.out.println(item + " x" + quantity + " = " + total);
        System.out.println("Delivered: " + delivered);
    }
}` },
      challenge: 'Store a product name (String), price 1500.0 (double), quantity 4 (int) and inStock true (boolean), and a constant final double VAT_RATE = 0.16. Print the product, then the total with two decimal places: "Total with VAT: 6960.00".',
      checks: [
        { label: 'Uses a String, an int, a double and a boolean', in: 'code', re: /String\s+\w+\s*=[\s\S]*?(?=[\s\S]*\bint\s+\w+\s*=)(?=[\s\S]*\bdouble\s+\w+\s*=)(?=[\s\S]*\bboolean\s+\w+\s*=)/ },
        { label: 'Declares the constant VAT_RATE with final', in: 'code', re: /final\s+double\s+VAT_RATE\s*=\s*0\.16/ },
        { label: 'Prints the total with VAT (6960.00)', in: 'output', re: /Total with VAT:\s*6960(?:\.\d+)?/i },
      ],
      hints: ['total = price * quantity * (1 + VAT_RATE)', 'Doubles are stored in binary, so 6960 can print as 6959.999999999999. Use System.out.printf("Total with VAT: %.2f%n", total);'],
      quiz: [
        { q: 'Which keyword makes a variable a constant?', options: ['final', 'static', 'const', 'fixed'], why: 'final means the value cannot change after it is set.' },
        { q: 'Which type best stores a price such as 249.50?', options: ['double', 'int', 'boolean', 'char'], why: 'double stores numbers with decimals.' },
        { q: 'A variable declared inside a method is a...', options: ['local variable', 'class variable', 'instance variable', 'constant'], why: 'Local variables live only inside the method that declares them.' },
      ],
      oral: 'Explain the difference between local, instance and class variables, with an example of each from a shop system.',
      solution: { java: `public class Main {
    public static void main(String[] args) {
        final double VAT_RATE = 0.16;
        String product = "Water tank";
        double price = 1500.0;
        int quantity = 4;
        boolean inStock = true;
        System.out.println("Product: " + product + " (in stock: " + inStock + ")");
        double total = price * quantity * (1 + VAT_RATE);
        System.out.printf("Total with VAT: %.2f%n", total);
    }
}` },
    },
    {
      title: 'Operators and Formulas', minutes: 55,
      content: `Programs often turn a formula into code. Java has the usual {{arithmetic operators}}: {{+ - * /}} and {{%}} (remainder). Dividing two ints drops the decimals ({{7 / 2}} is 3), so use doubles for money and measurements.

## The Math class
- {{Math.PI}}: 3.14159...
- {{Math.pow(a, b)}}: a to the power b
- {{Math.sqrt(x)}}: square root
- {{Math.round(x)}}: nearest whole number

## Area of a circle
~~~
double radius = 7;
double area = Math.PI * radius * radius;
System.out.printf("Area: %.2f%n", area);   // 153.94
~~~
{{printf}} formats numbers: {{%.2f}} shows two decimal places and {{%n}} ends the line.

## Compound interest
Amount = P x (1 + r)^n, for principal P, rate r per year and n years.
~~~
double principal = 50000;   // KES
double rate = 0.10;         // 10% a year
int years = 2;
double amount = principal * Math.pow(1 + rate, years);
System.out.printf("Amount: %.2f%n", amount);   // 60500.00
~~~

## Quadratic equations
For ax² + bx + c = 0 the roots are (-b ± √(b² - 4ac)) / 2a:
~~~
double a = 1, b = -3, c = 2;
double d = b * b - 4 * a * c;          // discriminant
double x1 = (-b + Math.sqrt(d)) / (2 * a);
double x2 = (-b - Math.sqrt(d)) / (2 * a);
System.out.println(x1 + " and " + x2); // 2.0 and 1.0
~~~
If the discriminant is negative there are no real roots - you will handle that with if in the next module.`,
      example: { java: `public class Main {
    public static void main(String[] args) {
        double radius = 3.5;
        double area = Math.PI * radius * radius;
        double circumference = 2 * Math.PI * radius;
        System.out.printf("Area: %.2f%n", area);
        System.out.printf("Circumference: %.2f%n", circumference);
    }
}` },
      challenge: 'A chama saves KES 10000 at 12% interest a year for 3 years. Print "Amount: 14049.28" using compound interest, then solve x² - 5x + 6 = 0 and print "Roots: 3.0 and 2.0".',
      checks: [
        { label: 'Uses Math.pow for compound interest', in: 'code', re: /Math\.pow\s*\(/ },
        { label: 'Uses Math.sqrt for the roots', in: 'code', re: /Math\.sqrt\s*\(/ },
        { label: 'Prints the amount 14049.28', in: 'output', re: /Amount\s*[\s:=]*14049(?:\.\d+)?/i },
        { label: 'Prints the roots 3.0 and 2.0', in: 'output', re: /Roots?[\s\S]*[23][\.\d]*[\s\S]*[23][\.\d]*/i },
      ],
      hints: ['amount = 10000 * Math.pow(1 + 0.12, 3)', 'For x² - 5x + 6: a = 1, b = -5, c = 6'],
      quiz: [
        { q: 'What is the value of 7 / 2 when both are ints?', options: ['3', '3.5', '4', '3.0'], why: 'Integer division drops the decimal part.' },
        { q: 'Which operator gives the remainder?', options: ['%', '/', '//', 'mod()'], why: '% is the remainder (modulus) operator: 7 % 2 is 1.' },
        { q: 'What does %.2f do in printf?', options: ['Shows a number with two decimal places', 'Prints two numbers', 'Rounds to the nearest 2', 'Prints a percentage'], why: '%.2f formats a decimal number with two digits after the point.' },
      ],
      oral: 'Walk through how you turned the compound interest formula into Java, naming each variable and operator you used.',
      solution: { java: `public class Main {
    public static void main(String[] args) {
        double amount = 10000 * Math.pow(1 + 0.12, 3);
        System.out.printf("Amount: %.2f%n", amount);
        double a = 1, b = -5, c = 6;
        double d = b * b - 4 * a * c;
        double x1 = (-b + Math.sqrt(d)) / (2 * a);
        double x2 = (-b - Math.sqrt(d)) / (2 * a);
        System.out.println("Roots: " + x1 + " and " + x2);
    }
}` },
    },
  ],
};

const M110 = {
  id: 110, order: 10, icon: '🔀', color: '#e76f00', difficulty: 'intermediate',
  title: 'Control Structures, Arrays and Methods',
  description: 'Decisions, loops, break and continue, arrays and enums, and writing your own methods.',
  lessons: [
    {
      title: 'Decision Making: if, else and switch', minutes: 55,
      content: `{{Decision-making statements}} choose which code runs.

## if, if-else and else-if
~~~
int score = 74;
if (score >= 70) {
    System.out.println("Pass");
} else if (score >= 50) {
    System.out.println("Referral");
} else {
    System.out.println("Fail");
}
~~~
Comparison operators: {{== != > < >= <=}}. Logical operators: {{&&}} (and), {{||}} (or), {{!}} (not). Compare Strings with {{.equals()}}, not ==.

## switch
Use switch when one value selects between many fixed choices:
~~~
String day = "SAT";
switch (day) {
    case "SAT":
    case "SUN":
        System.out.println("Weekend rates");
        break;
    default:
        System.out.println("Weekday rates");
}
~~~
Without {{break}}, execution "falls through" into the next case.

## Where you meet decisions
- M-Pesa charges in bands of the amount sent
- Grading marks, approving loans, applying discounts
- Validating input ("Invalid" when a value is out of range)`,
      example: { java: `public class Main {
    public static void main(String[] args) {
        int amount = 2500;
        int fee;
        if (amount <= 100) {
            fee = 0;
        } else if (amount <= 1500) {
            fee = 15;
        } else {
            fee = 30;
        }
        System.out.println("Sending " + amount + " costs " + fee);
    }
}` },
      challenge: 'Write a method-free program that grades three scores 85, 62 and 40 (store them in variables). Print "85: Pass", "62: Referral", "40: Fail" (70 and above Pass, 50-69 Referral, below 50 Fail). Then use a switch on the String "MON" to print "Weekday".',
      checks: [
        { label: 'Uses if / else if / else', in: 'code', re: /if\s*\([\s\S]*else\s+if\s*\([\s\S]*else\s*\{/ },
        { label: 'Uses a switch statement', in: 'code', re: /switch\s*\(/ },
        { label: 'Grades all three scores correctly', in: 'output', re: /85[\s:\-]*Pass[\s\S]*62[\s:\-]*Referral[\s\S]*40[\s:\-]*Fail/i },
        { label: 'Prints Weekday from the switch', in: 'output', re: /Weekday/i },
      ],
      hints: ['You can repeat the same if / else if / else block for each score, or loop over them.', 'case "MON": System.out.println("Weekday"); break;'],
      quiz: [
        { q: 'How should you compare two Strings in Java?', options: ['a.equals(b)', 'a == b', 'a = b', 'compare(a, b)'], why: '== compares object references; equals compares the text.' },
        { q: 'What happens if a switch case has no break?', options: ['It falls through to the next case', 'It stops the program', 'It skips the default', 'It gives a compile error'], why: 'Without break, execution continues into the following case.' },
        { q: 'Which operator means "and"?', options: ['&&', '||', '!', '&|'], why: '&& is true only when both sides are true.' },
      ],
      oral: 'Explain when you would choose a switch statement instead of a chain of if-else statements.',
      solution: { java: `public class Main {
    public static void main(String[] args) {
        int[] scores = {85, 62, 40};
        for (int s : scores) {
            if (s >= 70) {
                System.out.println(s + ": Pass");
            } else if (s >= 50) {
                System.out.println(s + ": Referral");
            } else {
                System.out.println(s + ": Fail");
            }
        }
        String day = "MON";
        switch (day) {
            case "SAT":
            case "SUN":
                System.out.println("Weekend");
                break;
            default:
                System.out.println("Weekday");
        }
    }
}` },
    },
    {
      title: 'Loops: for, while, do-while, break and continue', minutes: 55,
      content: `{{Looping statements}} repeat code.

## for - when you know how many times
~~~
for (int month = 1; month <= 12; month++) {
    System.out.println("Month " + month);
}
~~~

## while - while a condition stays true
~~~
double balance = 1000;
int years = 0;
while (balance < 2000) {
    balance = balance * 1.10;   // 10% growth
    years++;
}
System.out.println("Doubles in " + years + " years");
~~~

## do-while - runs at least once
~~~
int pin;
do {
    pin = 1234;   // in a real app: read from the user
} while (pin != 1234);
~~~

## Branching statements
- {{break}}: leave the loop now
- {{continue}}: skip the rest of this round and go to the next one
- {{return}}: leave the whole method
~~~
for (int i = 1; i <= 10; i++) {
    if (i % 2 == 0) continue;   // skip even numbers
    if (i > 7) break;           // stop after 7
    System.out.println(i);      // prints 1 3 5 7
}
~~~
Watch out for {{infinite loops}}: something inside a while loop must eventually make the condition false.`,
      example: { java: `public class Main {
    public static void main(String[] args) {
        int total = 0;
        int day = 1;
        while (day <= 7) {
            total += 50;      // save 50 shillings a day
            day++;
        }
        System.out.println("Saved in a week: " + total);
    }
}` },
      challenge: 'Print the multiplication table of 7 from "7 x 1 = 7" to "7 x 10 = 70" with a for loop. Then use a while loop to count how many years KES 1000 takes to reach at least 2000 at 10% a year and print "Years: 8".',
      checks: [
        { label: 'Uses a for loop', in: 'code', re: /for\s*\(\s*int\s+\w+\s*=/ },
        { label: 'Uses a while loop', in: 'code', re: /while\s*\(/ },
        { label: 'Prints the full 7 times table', in: 'output', re: /7\s*[x\*]\s*1\b[\s\S]*7\s*[x\*]\s*10\b[\s\S]*70\b/i },
        { label: 'Prints the number of years (8)', in: 'output', re: /(?:Years?|took)\s*[:=]?\s*8(?:\.\d+)?/i },
      ],
      hints: ['System.out.println("7 x " + i + " = " + (7 * i));', 'Multiply the balance by 1.10 each year and count the years.'],
      quiz: [
        { q: 'Which loop always runs its body at least once?', options: ['do-while', 'for', 'while', 'for-each'], why: 'do-while checks its condition after the body.' },
        { q: 'What does continue do inside a loop?', options: ['Skips to the next round of the loop', 'Ends the loop', 'Ends the program', 'Repeats the same round'], why: 'continue jumps to the next iteration.' },
        { q: 'Which loop is best when you know the number of repetitions in advance?', options: ['for', 'while', 'do-while', 'switch'], why: 'A for loop has a counter built in.' },
      ],
      oral: 'Explain the difference between break and continue, and describe an infinite loop and how to avoid it.',
      solution: { java: `public class Main {
    public static void main(String[] args) {
        for (int i = 1; i <= 10; i++) {
            System.out.println("7 x " + i + " = " + (7 * i));
        }
        double balance = 1000;
        int years = 0;
        while (balance < 2000) {
            balance = balance * 1.10;
            years++;
        }
        System.out.println("Years: " + years);
    }
}` },
    },
    {
      title: 'Arrays and Enums', minutes: 50,
      content: `An {{array}} stores many values of the same type in one variable. Positions ({{indexes}}) start at 0.

~~~
double[] sales = {1200.0, 950.5, 1800.0, 1300.0, 2100.0};
System.out.println(sales[0]);        // first: 1200.0
System.out.println(sales.length);    // 5
sales[1] = 1000.0;                   // update a value
String[] towns = new String[3];      // empty array of 3 Strings
~~~

## Going through an array
~~~
double total = 0;
for (int i = 0; i < sales.length; i++) {
    total += sales[i];
}
// the for-each loop is shorter when you do not need the index
double best = sales[0];
for (double s : sales) {
    if (s > best) best = s;
}
~~~
Reading {{sales[5]}} in a 5-item array throws {{ArrayIndexOutOfBoundsException}}.

## Two-dimensional arrays
~~~
int[][] seats = new int[3][4];   // 3 rows of 4 seats in a matatu
seats[0][2] = 1;                 // row 0, seat 2 taken
~~~

## Enums
An {{enum}} is a fixed set of named values - safer than using strings:
~~~
enum Day { MON, TUE, WED, THU, FRI, SAT, SUN }
Day today = Day.SAT;
System.out.println(today);             // SAT
System.out.println(Day.values().length); // 7
~~~`,
      example: { java: `public class Main {
    enum Size { SMALL, MEDIUM, LARGE }
    public static void main(String[] args) {
        int[] marks = {67, 82, 45, 90};
        int sum = 0;
        for (int m : marks) sum += m;
        System.out.println("Average mark: " + (sum / marks.length));
        Size cup = Size.LARGE;
        System.out.println("Cup size: " + cup);
    }
}` },
      challenge: 'Store five daily sales 1200, 950, 1800, 1300 and 2100 in an int array. Print "Total: 7350", "Highest: 2100" and "Days: 5". Then declare an enum Day with the seven days and print "Days in a week: 7" using Day.values().length.',
      checks: [
        { label: 'Declares an array', in: 'code', re: /\w+\s*\[\]\s+\w+\s*=|\w+\s+\w+\s*\[\]\s*=/ },
        { label: 'Declares an enum', in: 'code', re: /enum\s+Day\s*\{/ },
        { label: 'Prints the total and highest sale', in: 'output', re: /(?:Total|Sum)\s*[:=]?\s*7350[\s\S]*(?:Highest|Max)\s*[:=]?\s*2100/i },
        { label: 'Prints the number of days and the enum count', in: 'output', re: /Days?\s*[:=]?\s*5\b[\s\S]*7\b/i },
      ],
      hints: ['int[] sales = {1200, 950, 1800, 1300, 2100};', 'Declare the enum inside the class but outside main: enum Day { MON, TUE, ... }'],
      quiz: [
        { q: 'What is the index of the first item in a Java array?', options: ['0', '1', '-1', 'It depends on the array'], why: 'Array indexes always start at 0.' },
        { q: 'What does arr.length give for an array of 5 items?', options: ['5', '4', '6', 'The last item'], why: 'length is the number of items.' },
        { q: 'Why use an enum instead of Strings for days?', options: ['Only the listed values are allowed, so typos are caught', 'Enums use less memory than ints', 'Enums can be changed at runtime', 'Strings cannot be compared'], why: 'An enum limits a variable to a fixed set of named values.' },
      ],
      oral: 'Explain how you would find the highest value in an array, step by step.',
      solution: { java: `public class Main {
    enum Day { MON, TUE, WED, THU, FRI, SAT, SUN }
    public static void main(String[] args) {
        int[] sales = {1200, 950, 1800, 1300, 2100};
        int total = 0;
        int highest = sales[0];
        for (int s : sales) {
            total += s;
            if (s > highest) highest = s;
        }
        System.out.println("Total: " + total);
        System.out.println("Highest: " + highest);
        System.out.println("Days: " + sales.length);
        System.out.println("Days in a week: " + Day.values().length);
    }
}` },
    },
    {
      title: 'Methods', minutes: 60,
      content: `A {{method}} is a named block of code that does one job. Methods avoid repetition and make programs easier to test.

## Structure
~~~
public static double addVat(double amount) {   // modifiers, return type, name, parameters
    return amount * 1.16;                       // body and return value
}
~~~
- {{void}} methods do something but return nothing
- {{Calling}} a method: {{double total = addVat(1000);}}

## Parameters are passed by value
The method gets a copy of the value. Changing the copy does not change the caller's variable.

## Method overloading
Several methods may share a name if their parameters differ:
~~~
static int area(int side) { return side * side; }
static int area(int length, int width) { return length * width; }
~~~

## Variable arguments
~~~
static int sum(int... numbers) {   // any number of ints
    int total = 0;
    for (int n : numbers) total += n;
    return total;
}
sum(1, 2);  sum(5, 10, 15, 20);
~~~

## Also part of the syllabus
- {{Command-line arguments}} arrive in main's {{String[] args}}
- {{this}} refers to the current object (used in classes, next module)
- {{finalize()}} was called before garbage collection; it is deprecated in modern Java, so do not rely on it

~~~
public class Main {
    static String greet(String name) {
        return "Habari " + name;
    }
    public static void main(String[] args) {
        System.out.println(greet("Otieno"));
    }
}
~~~`,
      example: { java: `public class Main {
    static double addVat(double amount) {
        return amount * 1.16;
    }
    static void printReceipt(String item, double price) {
        System.out.println(item + ": " + addVat(price));
    }
    public static void main(String[] args) {
        printReceipt("Bread", 70);
        printReceipt("Milk", 65);
    }
}` },
      challenge: 'Write a method getGrade(int score) that returns "Pass" (70+), "Referral" (50-69) or "Fail", and two overloaded methods average(int a, int b) and average(int a, int b, int c) that return a double. Print "getGrade(75) = Pass", "average(60, 80) = 70.0" and "average(60, 70, 80) = 70.0".',
      checks: [
        { label: 'Defines getGrade(int ...) returning a String', in: 'code', re: /static\s+String\s+getGrade\s*\(\s*int\s+\w+\s*\)/ },
        { label: 'Overloads average with 2 and 3 parameters', in: 'code', re: /average\s*\(\s*int\s+\w+\s*,\s*int\s+\w+\s*\)[\s\S]*average\s*\(\s*int\s+\w+\s*,\s*int\s+\w+\s*,\s*int\s+\w+\s*\)|average\s*\(\s*int\s+\w+\s*,\s*int\s+\w+\s*,\s*int\s+\w+\s*\)[\s\S]*average\s*\(\s*int\s+\w+\s*,\s*int\s+\w+\s*\)/ },
        { label: 'Prints the grade for 75', in: 'output', re: /(?:getGrade|grade)[\s\(\)=:]*(?:75)?[\s\(\)=:]*Pass/i },
        { label: 'Prints both averages as 70.0', in: 'output', re: /70\.?0?[\s\S]*70\.?0?/i },
      ],
      hints: ['Divide by 2.0 or 3.0 (not 2 or 3) so the result keeps its decimals.', 'Methods called from main must be static.'],
      quiz: [
        { q: 'What does a void method return?', options: ['Nothing', 'An empty String', '0', 'null'], why: 'void means the method does not return a value.' },
        { q: 'What is method overloading?', options: ['Several methods with the same name but different parameters', 'A method that calls itself', 'A method that is too long', 'Replacing a parent method in a child class'], why: 'Overloading uses the same name with different parameter lists.' },
        { q: 'Java passes primitive arguments...', options: ['by value (a copy)', 'by reference', 'by name', 'only as Strings'], why: 'The method receives a copy of the value.' },
      ],
      oral: 'Explain why splitting a program into methods makes it easier to test and maintain.',
      solution: { java: `public class Main {
    static String getGrade(int score) {
        if (score >= 70) return "Pass";
        else if (score >= 50) return "Referral";
        else return "Fail";
    }
    static double average(int a, int b) {
        return (a + b) / 2.0;
    }
    static double average(int a, int b, int c) {
        return (a + b + c) / 3.0;
    }
    public static void main(String[] args) {
        System.out.println("getGrade(75) = " + getGrade(75));
        System.out.println("average(60, 80) = " + average(60, 80));
        System.out.println("average(60, 70, 80) = " + average(60, 70, 80));
    }
}` },
    },
  ],
};

const M111 = {
  id: 111, order: 11, icon: '🧱', color: '#e76f00', difficulty: 'intermediate',
  title: 'Object-Oriented Programming in Java',
  description: 'Classes and objects, encapsulation, inheritance, abstraction and polymorphism.',
  lessons: [
    {
      title: 'Classes and Objects', minutes: 55,
      content: `{{Object-oriented programming (OOP)}} models a program as objects that have {{attributes}} (data) and {{methods}} (behaviour). A {{class}} is the blueprint; an {{object}} is one thing built from it.

~~~
class Student {
    String name;          // attributes (instance variables)
    int marks;

    Student(String name, int marks) {   // constructor: runs when an object is created
        this.name = name;               // this = the object being built
        this.marks = marks;
    }

    String describe() {                 // a method
        return name + " scored " + marks;
    }
}

public class Main {
    public static void main(String[] args) {
        Student a = new Student("Akinyi", 81);   // creating objects with new
        Student b = new Student("Kiprop", 67);
        System.out.println(a.describe());        // calling a method
        System.out.println(b.describe());
    }
}
~~~

## Words to know
- {{Instantiation}}: creating an object with {{new}}
- {{Constructor}}: special method with the class name and no return type
- {{this}}: the current object; tells a field apart from a parameter with the same name
- {{static}} members belong to the class, not to each object (for example a counter of all students)

## The four pillars of OOP
- {{Encapsulation}}: keep data private, expose safe methods
- {{Abstraction}}: show what an object does, hide how
- {{Inheritance}}: a new class reuses an existing one
- {{Polymorphism}}: one call behaves differently for different objects`,
      example: { java: `class Product {
    String name;
    double price;
    Product(String name, double price) {
        this.name = name;
        this.price = price;
    }
    double priceWithVat() {
        return price * 1.16;
    }
}
public class Main {
    public static void main(String[] args) {
        Product p = new Product("Jiko", 950);
        System.out.println(p.name + " costs " + p.priceWithVat());
    }
}` },
      challenge: 'Create a class Matatu with attributes route (String) and seats (int), a constructor, and a method describe() that returns "<route> matatu with <seats> seats". Create two objects and print "Town - Rongai matatu with 14 seats" and "Thika - Juja matatu with 33 seats".',
      checks: [
        { label: 'Declares a class Matatu', in: 'code', re: /class\s+Matatu\b/ },
        { label: 'Has a constructor using this', in: 'code', re: /Matatu\s*\(\s*String\s+\w+\s*,\s*int\s+\w+\s*\)[\s\S]*this\.\w+\s*=/ },
        { label: 'Creates objects with new', in: 'code', re: /new\s+Matatu\s*\(/ },
        { label: 'Prints both matatus', in: 'output', re: /14[\s\S]*33|33[\s\S]*14/i },
      ],
      hints: ['Put class Matatu above public class Main (without public).', 'describe() returns route + " matatu with " + seats + " seats"'],
      quiz: [
        { q: 'What is the relationship between a class and an object?', options: ['A class is a blueprint; an object is built from it', 'They are the same thing', 'An object contains many classes', 'A class is a running program'], why: 'Objects are instances of a class.' },
        { q: 'What does the keyword this refer to?', options: ['The current object', 'The parent class', 'The main method', 'The last created object'], why: 'this refers to the object whose method or constructor is running.' },
        { q: 'Which keyword creates an object?', options: ['new', 'create', 'object', 'make'], why: 'new calls the constructor and returns the new object.' },
      ],
      oral: 'Explain the four pillars of object-oriented programming in your own words.',
      solution: { java: `class Matatu {
    String route;
    int seats;
    Matatu(String route, int seats) {
        this.route = route;
        this.seats = seats;
    }
    String describe() {
        return route + " matatu with " + seats + " seats";
    }
}
public class Main {
    public static void main(String[] args) {
        Matatu a = new Matatu("Town - Rongai", 14);
        Matatu b = new Matatu("Thika - Juja", 33);
        System.out.println(a.describe());
        System.out.println(b.describe());
    }
}` },
    },
    {
      title: 'Encapsulation', minutes: 50,
      content: `{{Encapsulation}} means hiding an object's data and allowing changes only through methods that check the rules. This protects the object from being put into an invalid state.

~~~
class BankAccount {
    private double balance;               // hidden: no one can write account.balance = -500

    public double getBalance() {          // getter: read access
        return balance;
    }

    public void deposit(double amount) {
        if (amount > 0) balance += amount;
    }

    public boolean withdraw(double amount) {
        if (amount <= 0 || amount > balance) {
            return false;                 // refuse: not enough money
        }
        balance -= amount;
        return true;
    }
}
~~~

## Access modifiers
- {{private}}: only inside the class
- (no modifier): inside the same package
- {{protected}}: package and subclasses
- {{public}}: everywhere

## Why it matters
- The class controls its own rules (no negative balances)
- You can change how data is stored without breaking other code
- Bugs are easier to find because only a few methods change the data

The same idea is called {{data hiding}}. Combined with {{abstraction}} (the user of BankAccount only needs deposit, withdraw and getBalance), it makes large systems manageable.`,
      example: { java: `class Thermometer {
    private double celsius;
    public void setCelsius(double c) {
        if (c >= -50 && c <= 60) celsius = c;
    }
    public double getFahrenheit() {
        return celsius * 9 / 5 + 32;
    }
}
public class Main {
    public static void main(String[] args) {
        Thermometer t = new Thermometer();
        t.setCelsius(25);
        System.out.println(t.getFahrenheit());
    }
}` },
      challenge: 'Write a BankAccount class with a private double balance, deposit(amount), withdraw(amount) that refuses to go below zero (returns false), and getBalance(). Deposit 5000, withdraw 1500, try to withdraw 10000, then print "Balance: 3500.0" and "Big withdrawal allowed: false".',
      checks: [
        { label: 'balance is private', in: 'code', re: /private\s+double\s+balance/ },
        { label: 'Has deposit, withdraw and getBalance methods', in: 'code', re: /void\s+deposit\s*\([\s\S]*withdraw\s*\([\s\S]*getBalance\s*\(|getBalance\s*\([\s\S]*deposit\s*\([\s\S]*withdraw\s*\(/ },
        { label: 'Prints the correct balance', in: 'output', re: /Balance\s*[\s:=]*3500(?:\.\d{1,2})?/i },
        { label: 'Refuses the overdraft', in: 'output', re: /(?:allowed|overdraft|withdraw.*10000)[\s:=]*(?:false|no|refused)/i },
      ],
      hints: ['withdraw should check amount > balance before subtracting.', 'Store the result: boolean ok = acc.withdraw(10000);'],
      quiz: [
        { q: 'Which modifier hides a field from other classes?', options: ['private', 'public', 'static', 'final'], why: 'private members are only visible inside their class.' },
        { q: 'What is a getter?', options: ['A method that returns the value of a private field', 'A constructor', 'A method that deletes data', 'A static variable'], why: 'Getters give read access to hidden data.' },
        { q: 'What is the main benefit of encapsulation?', options: ['The class can enforce its own rules on its data', 'Programs run faster', 'Classes can have more methods', 'You no longer need constructors'], why: 'Only the class methods can change the data, so rules are always applied.' },
      ],
      oral: 'Using an M-Pesa wallet as an example, explain why the balance should be private.',
      solution: { java: `class BankAccount {
    private double balance;
    public void deposit(double amount) {
        if (amount > 0) balance += amount;
    }
    public boolean withdraw(double amount) {
        if (amount <= 0 || amount > balance) return false;
        balance -= amount;
        return true;
    }
    public double getBalance() {
        return balance;
    }
}
public class Main {
    public static void main(String[] args) {
        BankAccount acc = new BankAccount();
        acc.deposit(5000);
        acc.withdraw(1500);
        boolean ok = acc.withdraw(10000);
        System.out.println("Balance: " + acc.getBalance());
        System.out.println("Big withdrawal allowed: " + ok);
    }
}` },
    },
    {
      title: 'Inheritance', minutes: 55,
      content: `{{Inheritance}} lets a new class ({{subclass}}, {{derived class}}) reuse and extend an existing class ({{superclass}}, {{base class}}). Use it for an "is a" relationship: a Car is a Vehicle.

~~~
class Vehicle {
    protected String make;
    protected int year;

    Vehicle(String make, int year) {
        this.make = make;
        this.year = year;
    }

    String info() {
        return year + " " + make;
    }
}

class Car extends Vehicle {
    private int doors;

    Car(String make, int year, int doors) {
        super(make, year);          // call the parent's constructor first
        this.doors = doors;
    }

    @Override
    String info() {                 // overriding: replace the parent's version
        return super.info() + ", " + doors + " doors";
    }
}
~~~

## Key points
- {{extends}} creates the subclass; Java allows one direct parent class
- {{super(...)}} calls the parent constructor; {{super.method()}} calls the parent's method
- {{@Override}} marks a method that replaces the parent's one (the compiler checks the name)
- {{protected}} fields are visible to subclasses

## Types of inheritance
- {{Single}}: Car extends Vehicle
- {{Multilevel}}: ElectricCar extends Car extends Vehicle
- {{Hierarchical}}: Car and Lorry both extend Vehicle
- {{Multiple}}: not allowed for classes in Java (C++ allows it); Java uses {{interfaces}} instead`,
      example: { java: `class Employee {
    protected String name;
    Employee(String name) { this.name = name; }
    double pay() { return 30000; }
}
class Manager extends Employee {
    Manager(String name) { super(name); }
    @Override
    double pay() { return super.pay() + 20000; }
}
public class Main {
    public static void main(String[] args) {
        System.out.println(new Employee("Wambui").pay());
        System.out.println(new Manager("Hassan").pay());
    }
}` },
      challenge: 'Create a Vehicle class (make, year, method info() returning "<year> <make>") and a Car class that extends Vehicle, adds doors, calls super(...) and overrides info() to add ", <doors> doors". Print "2019 Toyota" for a Vehicle and "2021 Mazda, 4 doors" for a Car.',
      checks: [
        { label: 'Car extends Vehicle', in: 'code', re: /class\s+Car\s+extends\s+Vehicle/ },
        { label: 'Calls super(...) in the constructor', in: 'code', re: /super\s*\(/ },
        { label: 'Overrides info()', in: 'code', re: /@Override[\s\S]*info\s*\(/ },
        { label: 'Prints both descriptions', in: 'output', re: /2019[\s\S]*Toyota[\s\S]*2021[\s\S]*Mazda[\s\S]*4[\s\S]*doors/i },
      ],
      hints: ['super(make, year) must be the first line of the Car constructor.', 'return super.info() + ", " + doors + " doors";'],
      quiz: [
        { q: 'Which keyword creates a subclass?', options: ['extends', 'implements', 'inherits', 'super'], why: 'class Car extends Vehicle.' },
        { q: 'What does super(...) do in a constructor?', options: ['Calls the parent class constructor', 'Creates a new parent object', 'Overrides a method', 'Makes the class abstract'], why: 'super(...) runs the superclass constructor.' },
        { q: 'Which kind of inheritance does Java NOT allow between classes?', options: ['Multiple inheritance', 'Single inheritance', 'Multilevel inheritance', 'Hierarchical inheritance'], why: 'A Java class can extend only one class; interfaces fill that gap.' },
      ],
      oral: 'Describe an inheritance hierarchy for a hospital system and explain what each subclass adds.',
      solution: { java: `class Vehicle {
    protected String make;
    protected int year;
    Vehicle(String make, int year) {
        this.make = make;
        this.year = year;
    }
    String info() {
        return year + " " + make;
    }
}
class Car extends Vehicle {
    private int doors;
    Car(String make, int year, int doors) {
        super(make, year);
        this.doors = doors;
    }
    @Override
    String info() {
        return super.info() + ", " + doors + " doors";
    }
}
public class Main {
    public static void main(String[] args) {
        System.out.println(new Vehicle("Toyota", 2019).info());
        System.out.println(new Car("Mazda", 2021, 4).info());
    }
}` },
    },
    {
      title: 'Abstraction and Polymorphism', minutes: 60,
      content: `{{Abstraction}} shows what something does and hides how. In Java you express it with {{abstract classes}} and {{interfaces}}.

~~~
abstract class Shape {
    abstract double area();          // no body: each shape must provide one
    String describe() {
        return getClass().getSimpleName() + " area " + Math.round(area());
    }
}

class Circle extends Shape {
    private double r;
    Circle(double r) { this.r = r; }
    double area() { return Math.PI * r * r; }
}

class Rectangle extends Shape {
    private double w, h;
    Rectangle(double w, double h) { this.w = w; this.h = h; }
    double area() { return w * h; }
}
~~~
You cannot write {{new Shape()}} - an abstract class is only a template.

## Interfaces
An {{interface}} lists methods a class promises to have. A class can implement many interfaces:
~~~
interface Payable { double amountDue(); }
class Invoice implements Payable {
    public double amountDue() { return 1200; }
}
~~~

## Polymorphism ("many forms")
A variable of the parent type can hold any child object, and the right method runs for each:
~~~
Shape[] shapes = { new Circle(2), new Rectangle(3, 4) };
for (Shape s : shapes) {
    System.out.println(s.describe());   // Circle area 13, Rectangle area 12
}
~~~
- {{Run-time polymorphism}}: overriding (as above)
- {{Compile-time polymorphism}}: overloading (several methods with one name)

## Templates (generics)
C++ class templates become {{generics}} in Java: {{ArrayList<String>}} is a list that only holds Strings, checked by the compiler.`,
      example: { java: `import java.util.ArrayList;
interface Payable { double amountDue(); }
class Salary implements Payable {
    public double amountDue() { return 45000; }
}
class Rent implements Payable {
    public double amountDue() { return 18000; }
}
public class Main {
    public static void main(String[] args) {
        ArrayList<Payable> bills = new ArrayList<>();
        bills.add(new Salary());
        bills.add(new Rent());
        double total = 0;
        for (Payable p : bills) total += p.amountDue();
        System.out.println("Total due: " + total);
    }
}` },
      challenge: 'Create an abstract class Shape with abstract double area(), and classes Circle (radius) and Rectangle (width, height) that extend it. Put a Circle of radius 7 and a Rectangle 5 by 4 in one Shape[] array, loop over it, and print "Circle: 153.94" and "Rectangle: 20.00" (two decimals, using printf or String.format).',
      checks: [
        { label: 'Declares an abstract class with an abstract method', in: 'code', re: /abstract\s+class\s+Shape[\s\S]*abstract\s+double\s+area\s*\(\s*\)\s*;/ },
        { label: 'Circle and Rectangle extend Shape', in: 'code', re: /class\s+Circle\s+extends\s+Shape[\s\S]*class\s+Rectangle\s+extends\s+Shape|class\s+Rectangle\s+extends\s+Shape[\s\S]*class\s+Circle\s+extends\s+Shape/ },
        { label: 'Uses a Shape array (polymorphism)', in: 'code', re: /Shape\s*\[\]\s+\w+\s*=/ },
        { label: 'Prints both areas', in: 'output', re: /153\.94[\s\S]*20\.00|20\.00[\s\S]*153\.94/i },
      ],
      hints: ['s.getClass().getSimpleName() gives "Circle" or "Rectangle".', 'System.out.printf("%s: %.2f%n", name, s.area());'],
      quiz: [
        { q: 'Can you create an object of an abstract class with new?', options: ['No', 'Yes, always', 'Only inside main', 'Only if it has a constructor'], why: 'Abstract classes are templates; only their concrete subclasses can be instantiated.' },
        { q: 'What is polymorphism?', options: ['One call behaving differently depending on the object', 'A class with many constructors', 'Hiding data with private', 'Copying a class'], why: 'The method that runs depends on the actual object type.' },
        { q: 'How many interfaces can a Java class implement?', options: ['Many', 'Only one', 'None', 'Two at most'], why: 'A class can implement any number of interfaces.' },
      ],
      oral: 'Explain the difference between an abstract class and an interface, and when you would use each.',
      solution: { java: `abstract class Shape {
    abstract double area();
}
class Circle extends Shape {
    private double r;
    Circle(double r) { this.r = r; }
    double area() { return Math.PI * r * r; }
}
class Rectangle extends Shape {
    private double w, h;
    Rectangle(double w, double h) { this.w = w; this.h = h; }
    double area() { return w * h; }
}
public class Main {
    public static void main(String[] args) {
        Shape[] shapes = { new Circle(7), new Rectangle(5, 4) };
        for (Shape s : shapes) {
            System.out.printf("%s: %.2f%n", s.getClass().getSimpleName(), s.area());
        }
    }
}` },
    },
  ],
};

module.exports = { M109, M110, M111 };
