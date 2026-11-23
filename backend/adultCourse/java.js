'use strict';
/**
 * Adult course - Java Programming (modules 109-111).
 * Based on TVET CDACC Unit: ICT/OS/CS/CR/04/6/A "Understand Fundamentals of Programming"
 *
 * Lesson format (see adultCourse/index.js):
 *   title, minutes      lesson name and suggested study time
 *   content             explanation. Formatting: "## " headings, "- " bullets,
 *                       ~~~ fenced code blocks, {{inline code}}
 *   challenge           the practical task
 *   checks              [{ label, in: 'html'|'css'|'js', re }] - all must pass
 *   hints               short tips
 *   quiz                written test: [{ q, options: [correct, ...wrong], why }]
 *   oral                a question to explain aloud
 */

const M109 = {
  id: 109, order: 9, icon: '☕', color: '#007396', difficulty: 'beginner', hours: 30,
  title: 'Java Fundamentals',
  description: 'Programming concepts, Java environment setup, data types, variables and basic operations.',
  lessons: [
    {
      title: 'What is Programming?', minutes: 60,
      content: `Programming is the process of writing instructions that computers follow to solve problems and perform tasks.

## Phases of Program Development
- Establish program requirements: understand what the program must do
- Design a program: plan the solution (logic, data structures, flow)
- Coding: write the program in a chosen language
- Code test and debug: run the program and fix errors
- Document: write clear notes about how it works
- Maintain: update and improve the program over time

## Key Programming Concepts
- {{Algorithm}}: a step-by-step procedure to solve a problem
- {{Source code}}: the program written in a human-readable language
- {{Object code}}: compiled source code (intermediate form)
- {{Machine code}}: the final executable form the computer runs
- {{Compiling}}: translating source code to machine code
- {{Debugging}}: finding and fixing errors

## Why Java?
Java is a powerful, platform-independent language used in business, Android development, and large-scale systems. Write once, run anywhere.`,
      challenge: 'Write a brief explanation of the difference between source code and machine code, and what a compiler does.',
      checks: [
        { label: 'Explains source code', in: 'js', re: /source.*code/i },
        { label: 'Explains machine code', in: 'js', re: /machine.*code|executable/i },
        { label: 'Mentions compiler', in: 'js', re: /compil/i },
      ],
      hints: ['Think of a compiler as a translator from human language to computer language.'],
      quiz: [
        { q: 'Which phase comes first in program development?', options: ['Establish requirements', 'Coding', 'Testing', 'Maintenance'], why: 'Understanding requirements guides the whole project.' },
        { q: 'What does a compiler do?', options: ['Translates source code to machine code', 'Runs the program', 'Tests for errors', 'Documents code'], why: 'A compiler translates human-readable code to executable code.' },
        { q: 'What is an algorithm?', options: ['A step-by-step procedure to solve a problem', 'A programming language', 'A type of variable', 'A Java library'], why: 'An algorithm is the logic behind a solution.' },
      ],
      oral: 'Describe the six phases of program development as if teaching a beginner.',
    },
    {
      title: 'Java Environment Setup', minutes: 45,
      content: `Before writing Java programs, you must install the Java Development Kit (JDK).

## What You Need
- {{JDK (Java Development Kit)}}: tools to compile and run Java programs
- {{IDE (Integrated Development Environment)}}: a code editor like Eclipse or IntelliJ IDEA (optional but recommended)
- {{Text editor}}: you can also write Java in Notepad and compile from the command line

## Installation Steps
1. Download the JDK from oracle.com
2. Install it (the installer sets up the environment automatically)
3. Verify: open Command Prompt or Terminal and type {{java -version}} and {{javac -version}}
4. If you see version numbers, installation succeeded

## First Java Program
Every Java program starts in a class with a {{main}} method:
~~~
public class HelloWorld {
  public static void main(String[] args) {
    System.out.println("Habari, Dunia!");
  }
}
~~~

Steps:
1. Save as {{HelloWorld.java}} (filename must match the class name)
2. Compile: {{javac HelloWorld.java}} → creates {{HelloWorld.class}}
3. Run: {{java HelloWorld}} → outputs the message`,
      challenge: 'Write a Java program with a class HelloWorld that prints "I am learning Java programming".',
      checks: [
        { label: 'Starts with public class HelloWorld', in: 'js', re: /public\s+class\s+HelloWorld/i },
        { label: 'Has main method', in: 'js', re: /public\s+static\s+void\s+main\s*\(\s*String\[\]\s+args\s*\)/i },
        { label: 'Uses System.out.println', in: 'js', re: /System\.out\.println\s*\(\s*["']I am learning Java/i },
      ],
      hints: ['Class names start with capital letters. The filename must be HelloWorld.java.', 'Java is case-sensitive: println not PrintLn.'],
      quiz: [
        { q: 'What does JDK stand for?', options: ['Java Development Kit', 'Java Debug Kit', 'Java Design Knowledge', 'Java Document Kit'], why: 'JDK is the toolkit for Java development.' },
        { q: 'What must the filename match?', options: ['The class name', 'The method name', 'The IDE name', 'The JDK version'], why: 'The .java filename must match the public class name.' },
        { q: 'Which command compiles Java source code?', options: ['javac', 'java', 'compile', 'jar'], why: 'javac is the Java compiler.' },
      ],
      oral: 'Explain what the JDK is and why you need it to write Java programs.',
    },
    {
      title: 'Java Syntax and First Steps', minutes: 60,
      content: `Java syntax has specific rules you must follow.

## Comments
- {{// single line comment}}
- {{/* multi-line comment */}}
- {{/** Javadoc - generates documentation */}}

## Variables and Data Types
{{int}}, {{double}}, {{String}}, {{boolean}}

~~~
int age = 25;
double salary = 45000.50;
String name = "Kamau";
boolean isActive = true;
~~~

## Declaring Variables
~~~
// declaration and assignment
int count = 0;

// declaration only (default: 0 for numbers, false for boolean, null for objects)
int total;
total = 50;
~~~

## Java Naming Conventions
- Variables and methods: camelCase ({{firstName}}, {{calculateTotal()}})
- Classes: PascalCase ({{HelloWorld}}, {{BankAccount}})
- Constants: UPPER_CASE ({{final double PI = 3.14159;}})

## Output
{{System.out.println()}} prints a line and moves to the next line.
{{System.out.print()}} prints without a newline.

~~~
System.out.println("Hello");
System.out.println("World");

System.out.print("Hello ");
System.out.print("World");   // outputs: Hello World (same line)
~~~`,
      challenge: 'Create a Java program that declares variables for a person: name (String), age (int), height (double), and prints them.',
      checks: [
        { label: 'Declares a String variable', in: 'js', re: /String\s+\w+\s*=\s*["'][^"']+["']/ },
        { label: 'Declares an int variable', in: 'js', re: /int\s+\w+\s*=\s*\d+/ },
        { label: 'Declares a double variable', in: 'js', re: /double\s+\w+\s*=\s*\d+\.?\d*/ },
        { label: 'Uses println to output each variable', in: 'js', re: /System\.out\.println.*\);.*System\.out\.println.*\);.*System\.out\.println/s },
      ],
      hints: ['Choose meaningful variable names. Use System.out.println for each variable.'],
      quiz: [
        { q: 'What data type stores whole numbers?', options: ['int', 'double', 'String', 'boolean'], why: 'int is for whole numbers like age or count.' },
        { q: 'What data type stores text?', options: ['String', 'Text', 'Char', 'Array'], why: 'String stores text like names and messages.' },
        { q: 'What is the correct camelCase format?', options: ['firstName', 'FirstName', 'first_name', 'FIRSTNAME'], why: 'camelCase: first word lowercase, next words capitalised.' },
      ],
      oral: 'Explain the difference between int, double, and String variables.',
    },
  ],
};

const M110 = {
  id: 110, order: 10, icon: '🔄', color: '#007396', difficulty: 'intermediate', hours: 35,
  title: 'Control Structures and Methods',
  description: 'Conditionals (if/else), loops (for/while), and creating reusable methods.',
  lessons: [
    {
      title: 'Conditional Statements', minutes: 75,
      content: `Conditionals let programs make decisions.

## if Statement
~~~
int temperature = 30;
if (temperature > 25) {
  System.out.println("It is hot");
}
~~~

## if-else
~~~
int score = 55;
if (score >= 60) {
  System.out.println("Pass");
} else {
  System.out.println("Fail");
}
~~~

## if-else if-else
~~~
int grade = 75;
if (grade >= 80) {
  System.out.println("Distinction");
} else if (grade >= 60) {
  System.out.println("Credit");
} else if (grade >= 40) {
  System.out.println("Pass");
} else {
  System.out.println("Fail");
}
~~~

## Comparison Operators
{{==}} (equal), {{!=}} (not equal), {{>}}, {{<}}, {{>=}}, {{<=}}

## Logical Operators
- {{&&}} (and): both conditions must be true
- {{||}} (or): at least one must be true
- {{!}} (not): reverses the boolean value

~~~
int age = 20;
boolean hasLicense = true;
if (age >= 18 && hasLicense) {
  System.out.println("You can drive");
}
~~~

## switch Statement
~~~
int day = 3;
switch (day) {
  case 1:
  case 2:
  case 3:
  case 4:
  case 5:
    System.out.println("Weekday");
    break;
  case 6:
  case 7:
    System.out.println("Weekend");
    break;
  default:
    System.out.println("Invalid day");
}
~~~`,
      challenge: 'Write a program that asks for a student\'s score (60-100) and prints: "Pass" (>=70), "Fail" (<70), or "Invalid" (outside range).',
      checks: [
        { label: 'Uses if statement', in: 'js', re: /\bif\s*\(/ },
        { label: 'Uses else if or nested conditions', in: 'js', re: /else\s+if\s*\(|if.*&&|if.*\|\|/ },
        { label: 'Uses else clause', in: 'js', re: /\belse\s*\{/ },
        { label: 'Checks >= 70 or similar logic', in: 'js', re: />=\s*70|<\s*70|>=\s*\w+/ },
      ],
      hints: ['Check the highest score first. Use && to test both boundaries.'],
      quiz: [
        { q: 'Which operator checks if a score is 85 or higher?', options: ['>=', '==', '<=', '!='], why: '>= means greater than or equal to.' },
        { q: 'What does && mean?', options: ['Both conditions must be true', 'At least one must be true', 'The first must be true', 'Neither must be true'], why: '&& is the logical "and" operator.' },
        { q: 'In if-else if-else, what happens when the first condition is true?', options: ['The rest are skipped', 'All are checked', 'The else runs', 'Nothing happens'], why: 'Once a condition is true, the chain stops.' },
      ],
      oral: 'Walk through your program\'s logic for a score of 65.',
    },
    {
      title: 'for and while Loops', minutes: 90,
      content: `Loops repeat code multiple times.

## for Loop
Repeats a fixed number of times:
~~~
for (int i = 1; i <= 5; i++) {
  System.out.println("Count: " + i);
}
~~~
- {{int i = 1}}: initialize the counter
- {{i <= 5}}: condition (loop runs while true)
- {{i++}}: increment (run after each repetition)

## Summing with a Loop
~~~
int sum = 0;
for (int i = 1; i <= 10; i++) {
  sum = sum + i;
}
System.out.println("Sum: " + sum);  // prints 55
~~~

## while Loop
Repeats while a condition is true:
~~~
int count = 0;
while (count < 3) {
  System.out.println("Hello");
  count++;
}
~~~

Use while when you don't know how many times to repeat (e.g., reading user input until they quit).

## do-while
Runs at least once, then checks:
~~~
int choice = 0;
do {
  System.out.println("Menu: 1=Play, 2=Quit");
  choice = readInput();
} while (choice != 2);
~~~

## break and continue
- {{break}}: exit the loop early
- {{continue}}: skip to the next repetition

~~~
for (int i = 1; i <= 10; i++) {
  if (i == 5) break;           // stops at 5
  if (i == 3) continue;        // skips 3
  System.out.println(i);       // prints 1, 2, 4
}
~~~`,
      challenge: 'Write a program that prints the multiplication table for 7 (7×1 to 7×10) using a for loop.',
      checks: [
        { label: 'Uses a for loop', in: 'js', re: /for\s*\(\s*int\s+\w+\s*=/ },
        { label: 'Loop variable increments', in: 'js', re: /\+\+|i\s*=\s*i\s*\+\s*1/ },
        { label: 'Prints multiplication results', in: 'js', re: /System\.out\.println.*\*|System\.out\.println.*7/ },
      ],
      hints: ['Multiply 7 by the loop counter. The output might look: 7 x 1 = 7, 7 x 2 = 14, ...'],
      quiz: [
        { q: 'Which loop is best when you know the exact number of repetitions?', options: ['for loop', 'while loop', 'do-while loop', 'if loop'], why: 'for loops are ideal for a fixed number of iterations.' },
        { q: 'What does i++ do?', options: ['Increases i by 1', 'Decreases i by 1', 'Multiplies i by 1', 'Keeps i the same'], why: '++ increments by 1 each time.' },
        { q: 'What is the output of the loop for (int i=1; i<=3; i++) System.out.println(i);?', options: ['1\\n2\\n3', '0\\n1\\n2', '1\\n2\\n3\\n4', 'Infinite loop'], why: 'The loop runs for i = 1, 2, 3, then stops (4 is not <= 3).' },
      ],
      oral: 'Explain how the for loop\'s three parts (initialization, condition, increment) control the repetitions.',
    },
    {
      title: 'Methods and Functions', minutes: 75,
      content: `Methods are reusable blocks of code that perform a specific task.

## Method Structure
~~~
public static returnType methodName(parameter1, parameter2) {
  // code here
  return result;    // only if returnType is not void
}
~~~

## Void Method (no return value)
~~~
public static void greet(String name) {
  System.out.println("Hello, " + name);
}
~~~
Called: {{greet("Kamau");}}

## Method with Return Value
~~~
public static int add(int a, int b) {
  return a + b;
}
~~~
Called: {{int result = add(5, 3);}}

## Multiple Parameters
~~~
public static double calculateSalary(double rate, int hours) {
  if (hours > 40) {
    return rate * 40 + rate * 1.5 * (hours - 40);  // overtime
  } else {
    return rate * hours;
  }
}
~~~

## Method Overloading
Same name, different parameters:
~~~
public static void print(int x) { ... }
public static void print(String x) { ... }
public static void print(double x) { ... }
~~~

Call {{print(5);}} or {{print("hello");}} - Java chooses the right one.

## Benefits of Methods
- Reusable code (DRY: Don't Repeat Yourself)
- Easier to test and debug
- More readable programs
- Separation of concerns`,
      challenge: 'Create a method called getGrade that takes a score (int) and returns a grade (String): 70-100 = "Pass", below 70 = "Fail".',
      checks: [
        { label: 'Method declaration with public static', in: 'js', re: /public\s+static\s+\w+\s+getGrade/ },
        { label: 'Takes an int parameter', in: 'js', re: /getGrade\s*\(\s*int\s+\w+\s*\)/ },
        { label: 'Returns a String', in: 'js', re: /public\s+static\s+String\s+getGrade/ },
        { label: 'Uses if-else to decide', in: 'js', re: /if.*return.*else.*return/s },
      ],
      hints: ['Check if score >= 70. Use return inside the if and else blocks.'],
      quiz: [
        { q: 'What does void mean in a method?', options: ['It returns nothing', 'It returns null', 'It takes no parameters', 'It is private'], why: 'void methods do not return a value.' },
        { q: 'What must follow method parameters?', options: ['A return statement', 'Curly braces', 'A semicolon', 'void'], why: 'Methods with a non-void return type must return a value.' },
        { q: 'What is method overloading?', options: ['Multiple methods with the same name but different parameters', 'Calling a method twice', 'Using a method inside another method', 'Declaring a method twice'], why: 'Java picks the right method based on the parameters you pass.' },
      ],
      oral: 'Describe how to call your getGrade method with a score of 85 and use the returned grade.',
    },
  ],
};

const M111 = {
  id: 111, order: 11, icon: '🏗️', color: '#007396', difficulty: 'advanced', hours: 35,
  title: 'Object-Oriented Programming',
  description: 'Classes, objects, attributes, inheritance, and building reusable code with OOP.',
  lessons: [
    {
      title: 'Classes and Objects', minutes: 90,
      content: `Object-Oriented Programming (OOP) organises code around objects - things with data (attributes) and behaviour (methods).

## Class vs Object
- {{Class}}: a blueprint (like an architect\'s design)
- {{Object}}: an instance of a class (the actual house built from the design)

## Creating a Class
~~~
public class Student {
  // Attributes
  private String name;
  private int age;
  private double gpa;
  
  // Constructor - initializes objects
  public Student(String name, int age, double gpa) {
    this.name = name;
    this.age = age;
    this.gpa = gpa;
  }
  
  // Methods
  public void printInfo() {
    System.out.println(name + ", age " + age + ", GPA " + gpa);
  }
  
  public double getGpa() {
    return gpa;
  }
}
~~~

## Creating Objects
~~~
Student student1 = new Student("Alice", 20, 3.8);
Student student2 = new Student("Bob", 21, 3.5);

student1.printInfo();      // Alice, age 20, GPA 3.8
double gpa = student2.getGpa();
~~~

## Encapsulation: private and public
- {{public}}: accessible from anywhere
- {{private}}: accessible only within the class (protects data)

~~~
public class BankAccount {
  private double balance;    // only BankAccount can change this
  
  public void deposit(double amount) {
    if (amount > 0) balance = balance + amount;
  }
  
  public double getBalance() {
    return balance;
  }
}
~~~

## This Keyword
{{this}} refers to the current object:
~~~
public Student(String name) {
  this.name = name;    // this.name is the attribute, name is the parameter
}
~~~`,
      challenge: 'Create a BankAccount class with balance (private double), constructor, deposit(amount), withdraw(amount), and getBalance() methods.',
      checks: [
        { label: 'Class declaration', in: 'js', re: /public\s+class\s+BankAccount/ },
        { label: 'Private double balance', in: 'js', re: /private\s+double\s+balance/ },
        { label: 'Constructor method', in: 'js', re: /public\s+BankAccount\s*\(/ },
        { label: 'deposit method', in: 'js', re: /public\s+\w+\s+deposit\s*\(/ },
        { label: 'withdraw method', in: 'js', re: /public\s+\w+\s+withdraw\s*\(/ },
      ],
      hints: ['Use this.balance to access the attribute. Check that amount > 0 before depositing.'],
      quiz: [
        { q: 'What is the difference between a class and an object?', options: ['A class is a blueprint; an object is an instance', 'They are the same', 'A class is temporary; an object is permanent', 'An object is a blueprint'], why: 'A class defines the structure; objects are created from that structure.' },
        { q: 'Why use private for attributes?', options: ['To protect data and control how it is accessed', 'To hide the class', 'To make programs faster', 'To reduce memory'], why: 'private encapsulation prevents direct changes and maintains data integrity.' },
        { q: 'What does the constructor do?', options: ['Initializes objects when they are created', 'Deletes objects', 'Copies objects', 'Declares a class'], why: 'Constructors set up initial values when new objects are created.' },
      ],
      oral: 'Explain how you would create two BankAccount objects and deposit money into them.',
    },
    {
      title: 'Inheritance', minutes: 90,
      content: `Inheritance lets classes share code. A child class inherits attributes and methods from a parent class.

## Parent and Child Classes
~~~
// Parent class
public class Animal {
  protected String name;      // protected: visible to child classes
  
  public Animal(String name) {
    this.name = name;
  }
  
  public void makeSound() {
    System.out.println(name + " makes a sound");
  }
}

// Child class extends parent
public class Dog extends Animal {
  public Dog(String name) {
    super(name);    // calls parent constructor
  }
  
  // Override parent method
  @Override
  public void makeSound() {
    System.out.println(name + " barks");
  }
}
~~~

## Usage
~~~
Dog dog = new Dog("Buddy");
dog.makeSound();    // Buddy barks
~~~

## super Keyword
- {{super()}}: calls the parent constructor
- {{super.method()}}: calls a parent method

## Method Overriding vs Overloading
- {{Overriding}}: child class replaces parent method (same name, same parameters)
- {{Overloading}}: multiple methods same name, different parameters (in one class)

## Why Inheritance?
- DRY (Don't Repeat Yourself): shared code in parent class
- Hierarchy: organise related classes
- Polymorphism: treat different objects the same way

## Example
~~~
Animal[] animals = {new Dog("Rex"), new Cat("Whiskers")};
for (Animal a : animals) {
  a.makeSound();    // calls the right version for each
}
~~~`,
      challenge: 'Create a Vehicle class (make, model, year) and a Car class that extends Vehicle and adds doors and mileage.',
      checks: [
        { label: 'Vehicle class with attributes', in: 'js', re: /public\s+class\s+Vehicle|private\s+String\s+(make|model)|private\s+int\s+year/ },
        { label: 'Car extends Vehicle', in: 'js', re: /public\s+class\s+Car\s+extends\s+Vehicle/ },
        { label: 'Car has additional attributes', in: 'js', re: /(doors|mileage)/ },
        { label: 'Uses super in constructor', in: 'js', re: /super\s*\(/ },
      ],
      hints: ['Vehicle is the parent; Car is the child. Use super() to initialize parent attributes.'],
      quiz: [
        { q: 'Which keyword makes a class inherit from another?', options: ['extends', 'implements', 'inherits', 'includes'], why: 'extends creates the parent-child relationship.' },
        { q: 'What does @Override do?', options: ['Marks that a method replaces the parent\'s version', 'Prevents overriding', 'Copies a method', 'Creates a new method'], why: '@Override is an annotation showing you are replacing a parent method.' },
        { q: 'What is a benefit of inheritance?', options: ['Code reuse and hierarchy', 'Faster programs', 'Smaller file size', 'More memory'], why: 'Inheritance avoids repeating shared code.' },
      ],
      oral: 'Explain the relationship between Vehicle and Car, and how Car inherits from Vehicle.',
    },
  ],
};

module.exports = { M109, M110, M111 };
