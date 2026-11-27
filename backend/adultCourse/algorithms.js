'use strict';
/**
 * Course 5 - Algorithms & Data Structures (modules 118-120), practised in Java as the
 * curriculum specifies.
 * TVET CDACC Computer Science L6, ICT/CU/CS/CR/09/6/A "Algorithms and Data Structures":
 *   LO1 fundamental principles of algorithms (analysis, complexity, greedy, divide and conquer),
 *   LO2 data structure concepts and arrays, LO3 linked lists (singly, doubly, circular),
 *   LO4 stacks and queues, LO5 search techniques, LO6 sorting techniques.
 * Also the data-structures outcome of ICT Technician L6 IT/CU/ICTA/CC/02/5/MA.
 */

const M118 = {
  id: 118, order: 18, icon: '🧮', color: '#0f766e', difficulty: 'intermediate',
  title: 'Algorithm Fundamentals',
  description: 'What makes a good algorithm, measuring efficiency, greedy and divide-and-conquer strategies, and arrays.',
  lessons: [
    {
      title: 'Algorithms and Complexity', minutes: 55,
      content: `An {{algorithm}} is a finite sequence of clear steps that solves a problem.

## Characteristics of a good algorithm
- {{Input}}: zero or more well-defined inputs
- {{Output}}: at least one result
- {{Definiteness}}: every step is precise and unambiguous
- {{Finiteness}}: it always stops
- {{Effectiveness}}: each step can actually be carried out
- {{Independence}}: it can be written in any programming language

## Algorithm analysis
We compare algorithms by how their cost grows with the input size {{n}}:
- {{Time complexity}}: how many steps
- {{Space complexity}}: how much extra memory

{{Big-O notation}} describes the growth for large n:
- {{O(1)}} constant - reading arr[5]
- {{O(log n)}} logarithmic - binary search (halves the data each step)
- {{O(n)}} linear - checking every item once
- {{O(n log n)}} - merge sort
- {{O(n²)}} quadratic - comparing every item with every other (bubble sort)

## Two ways to add 1 to n
~~~
static long sumLoop(int n) {          // O(n): n additions
    long total = 0;
    for (int i = 1; i <= n; i++) total += i;
    return total;
}
static long sumFormula(int n) {       // O(1): one calculation
    return (long) n * (n + 1) / 2;
}
~~~
Both give the same answer, but for n = 1,000,000 the loop does a million additions and the formula one. Choosing the better algorithm usually matters more than a faster computer.`,
      example: { java: `public class Main {
    public static void main(String[] args) {
        int[] sizes = {10, 100, 1000};
        for (int n : sizes) {
            int steps = 0;
            for (int i = 0; i < n; i++) for (int j = 0; j < n; j++) steps++;
            System.out.println("n = " + n + ": O(n^2) steps = " + steps);
        }
    }
}` },
      challenge: 'Write sumLoop(n) that adds 1 to n with a loop and counts its steps in a static int steps, and sumFormula(n) using n(n+1)/2. Print "sumLoop(1000) = 500500", "sumFormula(1000) = 500500" and "Loop steps: 1000".',
      checks: [
        { label: 'Has both methods', in: 'code', re: /sumLoop\s*\(\s*int\s+\w+\s*\)[\s\S]*sumFormula\s*\(\s*int\s+\w+\s*\)|sumFormula\s*\(\s*int\s+\w+\s*\)[\s\S]*sumLoop\s*\(\s*int\s+\w+\s*\)/ },
        { label: 'Uses the formula n(n+1)/2', in: 'code', re: /\(\s*\w+\s*\+\s*1\s*\)\s*\/\s*2/ },
        { label: 'Both give 500500', in: 'output', re: /sumLoop\(1000\) = 500500[\s\S]*sumFormula\(1000\) = 500500/ },
        { label: 'Counts 1000 loop steps', in: 'output', re: /Loop steps:\s*1000\b/ },
      ],
      hints: ['static int steps = 0; then steps++ inside the loop.', 'return (long) n * (n + 1) / 2;'],
      quiz: [
        { q: 'What is the time complexity of checking every item in a list once?', options: ['O(n)', 'O(1)', 'O(n²)', 'O(log n)'], why: 'The work grows in step with n.' },
        { q: 'Which characteristic says an algorithm must always stop?', options: ['Finiteness', 'Definiteness', 'Effectiveness', 'Output'], why: 'A finite algorithm ends after a limited number of steps.' },
        { q: 'Which grows slowest as n gets large?', options: ['O(log n)', 'O(n)', 'O(n log n)', 'O(n²)'], why: 'Logarithmic growth is very slow.' },
      ],
      oral: 'Explain Big-O notation and why an O(n²) algorithm becomes a problem for large data.',
      solution: { java: `public class Main {
    static int steps = 0;
    static long sumLoop(int n) {
        long total = 0;
        for (int i = 1; i <= n; i++) {
            total += i;
            steps++;
        }
        return total;
    }
    static long sumFormula(int n) {
        return (long) n * (n + 1) / 2;
    }
    public static void main(String[] args) {
        System.out.println("sumLoop(1000) = " + sumLoop(1000));
        System.out.println("sumFormula(1000) = " + sumFormula(1000));
        System.out.println("Loop steps: " + steps);
    }
}` },
    },
    {
      title: 'Greedy Algorithms: Counting Coins', minutes: 50,
      content: `A {{greedy algorithm}} makes the choice that looks best {{right now}} at each step, hoping this leads to the best overall answer.

## Counting coins
To give change with the fewest notes and coins, always take the largest denomination that still fits:
Kenyan shillings: 1000, 500, 200, 100, 50, 40, 20, 10, 5, 1

Change for 1287:
- 1000 → 287 left
- 200 → 87 left
- 50 → 37 left
- 20 → 17 left
- 10 → 7 left
- 5 → 2 left
- 1, 1 → 0
That is 8 pieces.

~~~
int[] notes = {1000, 500, 200, 100, 50, 40, 20, 10, 5, 1};
int amount = 1287;
for (int d : notes) {
    int count = amount / d;     // how many of this note fit
    if (count > 0) {
        System.out.println(d + " x " + count);
        amount = amount % d;    // what is left
    }
}
~~~

## When greedy fails
With coins {1, 3, 4} and amount 6, greedy takes 4 + 1 + 1 (3 coins), but 3 + 3 (2 coins) is better. Greedy is fast and simple, but only {{correct for some problems}} - real currencies are designed so it works.

## Other greedy algorithms
- {{Activity selection}}: pick the meeting that ends earliest, then the next that fits
- {{Dijkstra's shortest path}} and {{Kruskal's minimum spanning tree}} (cheapest way to connect towns with cables)
- {{Huffman coding}} for compression`,
      example: { java: `public class Main {
    public static void main(String[] args) {
        int[] coins = {4, 3, 1};
        int amount = 6;
        int used = 0;
        for (int c : coins) {
            used += amount / c;
            amount %= c;
        }
        System.out.println("Greedy uses " + used + " coins (3 + 3 needs only 2)");
    }
}` },
      challenge: 'Write a greedy method that gives change using the Kenyan denominations 1000, 500, 200, 100, 50, 40, 20, 10, 5 and 1. For 1287, print each denomination used as "<value> x <count>" (for example "1000 x 1" and "1 x 2") and finally "Notes and coins: 8".',
      checks: [
        { label: 'Uses an array of denominations', in: 'code', re: /\{\s*1000\s*,\s*500\s*,\s*200/ },
        { label: 'Uses division and remainder', in: 'code', re: /\/\s*\w+[\s\S]*%=?\s*\w+|%=?\s*\w+[\s\S]*\/\s*\w+/ },
        { label: 'Prints the denominations used', in: 'output', re: /1000[\s\S]*200[\s\S]*50[\s\S]*20[\s\S]*10[\s\S]*5[\s\S]*1 x 2/ },
        { label: 'Prints the total pieces', in: 'output', re: /Notes and coins:\s*8\b/ },
      ],
      hints: ['count = amount / d; amount = amount % d;', 'Only print when count > 0, and add count to a running total.'],
      quiz: [
        { q: 'What does a greedy algorithm do at each step?', options: ['Takes the choice that looks best right now', 'Tries every possible answer', 'Splits the problem in half', 'Chooses at random'], why: 'Greedy makes the locally best choice.' },
        { q: 'With coins {1, 3, 4}, how many coins does greedy use for 6?', options: ['3', '2', '6', '1'], why: '4 + 1 + 1 - although 3 + 3 uses only 2.' },
        { q: 'Which is a greedy algorithm?', options: ['Dijkstra\'s shortest path', 'Bubble sort', 'Linear search', 'Binary search'], why: 'Dijkstra always expands the nearest unvisited node.' },
      ],
      oral: 'Explain why the greedy coin algorithm works for Kenyan shillings but not for every set of coins.',
      solution: { java: `public class Main {
    static int giveChange(int amount) {
        int[] notes = {1000, 500, 200, 100, 50, 40, 20, 10, 5, 1};
        int pieces = 0;
        for (int d : notes) {
            int count = amount / d;
            if (count > 0) {
                System.out.println(d + " x " + count);
                pieces += count;
                amount = amount % d;
            }
        }
        return pieces;
    }
    public static void main(String[] args) {
        System.out.println("Notes and coins: " + giveChange(1287));
    }
}` },
    },
    {
      title: 'Divide and Conquer and Recursion', minutes: 55,
      content: `{{Divide and conquer}} solves a big problem in three steps:
- {{Divide}} (break) it into smaller sub-problems of the same kind
- {{Conquer}} (solve) each sub-problem, usually by {{recursion}}
- {{Merge}} (combine) the answers

## Recursion
A {{recursive}} method calls itself on a smaller input. It needs a {{base case}} that stops the calls:
~~~
static long factorial(int n) {
    if (n <= 1) return 1;            // base case
    return n * factorial(n - 1);     // recursive case
}
~~~
Without a base case the calls never end and Java throws {{StackOverflowError}}.

## Maximum of an array by divide and conquer
~~~
static int max(int[] a, int lo, int hi) {
    if (lo == hi) return a[lo];                 // one item: it is the max
    int mid = (lo + hi) / 2;                    // divide
    int left = max(a, lo, mid);                 // conquer left half
    int right = max(a, mid + 1, hi);            // conquer right half
    return Math.max(left, right);               // merge
}
~~~

## Fast power
x^n = (x^(n/2))² - halving n each time makes it O(log n):
~~~
static long power(long x, int n) {
    if (n == 0) return 1;
    long half = power(x, n / 2);
    return n % 2 == 0 ? half * half : half * half * x;
}
~~~
Famous divide-and-conquer algorithms: {{binary search}}, {{merge sort}}, {{quick sort}}.`,
      example: { java: `public class Main {
    static long factorial(int n) {
        if (n <= 1) return 1;
        return n * factorial(n - 1);
    }
    public static void main(String[] args) {
        for (int n = 1; n <= 5; n++) {
            System.out.println(n + "! = " + factorial(n));
        }
    }
}` },
      challenge: 'Write a recursive divide-and-conquer method max(int[] a, int lo, int hi) and a recursive power(long x, int n). For the array {42, 17, 97, 8, 63, 55} print "Max: 97", and print "2^10 = 1024" and "3^5 = 243".',
      checks: [
        { label: 'max splits the array with a midpoint', in: 'code', re: /static\s+int\s+max\s*\([\s\S]*mid[\s\S]*max\s*\([\s\S]*max\s*\(/ },
        { label: 'power is recursive with a base case', in: 'code', re: /power\s*\([\s\S]*if\s*\(\s*\w+\s*==\s*0\s*\)[\s\S]*power\s*\(/ },
        { label: 'Prints the maximum', in: 'output', re: /Max:\s*97\b/ },
        { label: 'Prints both powers', in: 'output', re: /2\^10 = 1024[\s\S]*3\^5 = 243/ },
      ],
      hints: ['Base case for max: if (lo == hi) return a[lo];', 'Base case for power: if (n == 0) return 1;'],
      quiz: [
        { q: 'What are the three steps of divide and conquer?', options: ['Divide, conquer, merge', 'Input, process, output', 'Sort, search, print', 'Plan, code, test'], why: 'Break the problem, solve the parts, combine the answers.' },
        { q: 'What happens if a recursive method has no base case?', options: ['It never stops and causes a StackOverflowError', 'It returns 0', 'It runs once', 'The compiler adds one'], why: 'Each call adds a stack frame until memory runs out.' },
        { q: 'Which algorithm uses divide and conquer?', options: ['Merge sort', 'Linear search', 'Counting coins', 'Bubble sort'], why: 'Merge sort splits, sorts halves and merges.' },
      ],
      oral: 'Explain recursion and the role of the base case, using factorial as your example.',
      solution: { java: `public class Main {
    static int max(int[] a, int lo, int hi) {
        if (lo == hi) return a[lo];
        int mid = (lo + hi) / 2;
        int left = max(a, lo, mid);
        int right = max(a, mid + 1, hi);
        return Math.max(left, right);
    }
    static long power(long x, int n) {
        if (n == 0) return 1;
        long half = power(x, n / 2);
        return n % 2 == 0 ? half * half : half * half * x;
    }
    public static void main(String[] args) {
        int[] a = {42, 17, 97, 8, 63, 55};
        System.out.println("Max: " + max(a, 0, a.length - 1));
        System.out.println("2^10 = " + power(2, 10));
        System.out.println("3^5 = " + power(3, 5));
    }
}` },
    },
    {
      title: 'Data Structures and Array Operations', minutes: 55,
      content: `## Key concepts
- {{Data}}: raw values (42, "Kisumu")
- {{Data type}}: what values are allowed and what you can do with them (int, String)
- {{Data structure}}: a way of organising data so it can be used efficiently - arrays, linked lists, stacks, queues, trees, graphs
- {{Object}}: data together with the operations on it

## Arrays
An {{array}} stores items in {{contiguous}} memory, so reading any position is O(1). Its size is fixed, so we keep a separate {{size}} for how many slots are used.

## Inserting
To insert at index i, shift every item from i to the end one place right, then write the new value - O(n):
~~~
static int insertAt(int[] a, int size, int index, int value) {
    for (int i = size; i > index; i--) a[i] = a[i - 1];   // shift right
    a[index] = value;
    return size + 1;
}
~~~
- At the {{beginning}}: index 0 (everything moves)
- At a {{given index}}: as above
- {{After}} index i: insert at i + 1; {{before}} index i: insert at i

## Deleting, searching and updating
~~~
static int deleteAt(int[] a, int size, int index) {
    for (int i = index; i < size - 1; i++) a[i] = a[i + 1];   // shift left
    return size - 1;
}
static int search(int[] a, int size, int value) {
    for (int i = 0; i < size; i++) if (a[i] == value) return i;
    return -1;                                                 // not found
}
a[2] = 99;   // update: O(1)
~~~
{{Arrays.toString(Arrays.copyOf(a, size))}} prints the used part of the array.`,
      example: { java: `import java.util.Arrays;
public class Main {
    public static void main(String[] args) {
        int[] a = new int[5];
        int size = 0;
        a[size++] = 7;
        a[size++] = 3;
        a[1] = 30;   // update
        System.out.println(Arrays.toString(Arrays.copyOf(a, size)));
    }
}` },
      challenge: 'Start with int[] a = new int[10] holding 10, 20, 30, 40 (size 4). Using your own insertAt, deleteAt and search methods: insert 5 at the beginning, insert 25 after the value 20, then delete 40. Print "After inserts: [5, 10, 20, 25, 30, 40]", "After delete: [5, 10, 20, 25, 30]" and "Index of 25: 3".',
      checks: [
        { label: 'Has insertAt and deleteAt methods', in: 'code', re: /insertAt\s*\([\s\S]*deleteAt\s*\(|deleteAt\s*\([\s\S]*insertAt\s*\(/ },
        { label: 'Shifts items with a loop', in: 'code', re: /a\s*\[\s*\w+\s*\]\s*=\s*a\s*\[\s*\w+\s*[-+]\s*1\s*\]/ },
        { label: 'Prints the array after inserting', in: 'output', re: /After inserts:\s*\[5, 10, 20, 25, 30, 40\]/ },
        { label: 'Prints the array after deleting and the search result', in: 'output', re: /After delete:\s*\[5, 10, 20, 25, 30\][\s\S]*Index of 25:\s*3\b/ },
      ],
      hints: ['Insert after the value 20: find its index with search(), then insert at index + 1.', 'Keep track of size: size = insertAt(a, size, 0, 5);'],
      quiz: [
        { q: 'Why is reading a[i] O(1) for an array?', options: ['Items are stored next to each other, so the address is calculated directly', 'Arrays are always sorted', 'Java caches arrays', 'Arrays are small'], why: 'Contiguous storage allows direct indexing.' },
        { q: 'What is the cost of inserting at the beginning of an array of n items?', options: ['O(n) - every item must shift', 'O(1)', 'O(log n)', 'O(n²)'], why: 'All items move one place right.' },
        { q: 'What does a linear search return when the value is missing (by convention)?', options: ['-1', '0', 'null', 'The last index'], why: '-1 cannot be a valid index.' },
      ],
      oral: 'Compare inserting into the middle of an array with updating a value in an array, in terms of work done.',
      solution: { java: `import java.util.Arrays;
public class Main {
    static int insertAt(int[] a, int size, int index, int value) {
        for (int i = size; i > index; i--) a[i] = a[i - 1];
        a[index] = value;
        return size + 1;
    }
    static int deleteAt(int[] a, int size, int index) {
        for (int i = index; i < size - 1; i++) a[i] = a[i + 1];
        return size - 1;
    }
    static int search(int[] a, int size, int value) {
        for (int i = 0; i < size; i++) if (a[i] == value) return i;
        return -1;
    }
    public static void main(String[] args) {
        int[] a = new int[10];
        int size = 0;
        for (int v : new int[]{10, 20, 30, 40}) a[size++] = v;
        size = insertAt(a, size, 0, 5);
        size = insertAt(a, size, search(a, size, 20) + 1, 25);
        System.out.println("After inserts: " + Arrays.toString(Arrays.copyOf(a, size)));
        size = deleteAt(a, size, search(a, size, 40));
        System.out.println("After delete: " + Arrays.toString(Arrays.copyOf(a, size)));
        System.out.println("Index of 25: " + search(a, size, 25));
    }
}` },
    },
  ],
};

const M119 = {
  id: 119, order: 19, icon: '🔗', color: '#0f766e', difficulty: 'intermediate',
  title: 'Linked Lists, Stacks and Queues',
  description: 'Singly, doubly and circular linked lists, stacks (LIFO) and queues (FIFO), built yourself in Java.',
  lessons: [
    {
      title: 'Singly Linked Lists', minutes: 60,
      content: `A {{linked list}} stores items in {{nodes}}. Each node holds a value and a {{reference}} (link) to the next node. The list remembers only its first node, the {{head}}.

~~~
class Node {
    int value;
    Node next;
    Node(int value) { this.value = value; }
}
~~~
head → [10] → [20] → [30] → null

## Compared with arrays
- Inserting or deleting at the front is {{O(1)}} - no shifting
- The list grows one node at a time - no fixed size
- But reaching the i-th item is {{O(n)}}: you must follow the links from the head

## Basic operations
~~~
// insert at the end
void append(int v) {
    Node n = new Node(v);
    if (head == null) { head = n; return; }
    Node cur = head;
    while (cur.next != null) cur = cur.next;
    cur.next = n;
}
// delete the first node holding v
void delete(int v) {
    if (head == null) return;
    if (head.value == v) { head = head.next; return; }
    Node cur = head;
    while (cur.next != null && cur.next.value != v) cur = cur.next;
    if (cur.next != null) cur.next = cur.next.next;   // skip over it
}
~~~

## Reversing a list
Walk the list once and turn every arrow around:
~~~
Node prev = null, cur = head;
while (cur != null) {
    Node next = cur.next;
    cur.next = prev;
    prev = cur;
    cur = next;
}
head = prev;
~~~`,
      example: { java: `class Node {
    String value;
    Node next;
    Node(String value) { this.value = value; }
}
public class Main {
    public static void main(String[] args) {
        Node head = new Node("Mombasa");
        head.next = new Node("Nairobi");
        head.next.next = new Node("Kisumu");
        for (Node cur = head; cur != null; cur = cur.next) {
            System.out.println(cur.value);
        }
    }
}` },
      challenge: 'Build your own LinkedList class (with a Node class) that supports append, display (values joined by " -> "), reverse and delete. Append 10, 20, 30 and print "List: 10 -> 20 -> 30"; reverse it and print "Reversed: 30 -> 20 -> 10"; delete 20 and print "After delete: 30 -> 10".',
      checks: [
        { label: 'Defines a Node class with a next link', in: 'code', re: /class\s+Node[\s\S]*Node\s+next\s*;/ },
        { label: 'Has append, reverse and delete methods', in: 'code', re: /void\s+append\s*\([\s\S]*void\s+reverse\s*\([\s\S]*void\s+delete\s*\(|void\s+append\s*\([\s\S]*void\s+delete\s*\([\s\S]*void\s+reverse\s*\(/ },
        { label: 'Prints the list and the reversed list', in: 'output', re: /List:[\s\S]*10[\s\S]*20[\s\S]*30[\s\S]*Reversed:[\s\S]*30[\s\S]*20[\s\S]*10/ },
        { label: 'Prints the list after deleting 20', in: 'output', re: /After delete:\s*30 -> 10\b/ },
      ],
      hints: ['Use java.util.StringJoiner(" -> ") or build the String in a loop.', 'Do not use java.util.LinkedList - the point is to build it yourself.'],
      quiz: [
        { q: 'What does each node of a singly linked list contain?', options: ['A value and a link to the next node', 'Only a value', 'Links to all other nodes', 'An index number'], why: 'Nodes chain together through their next links.' },
        { q: 'What is the cost of reaching the 100th item of a linked list?', options: ['O(n) - follow links from the head', 'O(1)', 'O(log n)', 'O(n²)'], why: 'There is no direct indexing.' },
        { q: 'Which operation is cheaper in a linked list than in an array?', options: ['Inserting at the front', 'Reading the i-th item', 'Binary search', 'Sorting'], why: 'No shifting is needed - just change the head.' },
      ],
      oral: 'Explain step by step how reversing a singly linked list works.',
      solution: { java: `import java.util.StringJoiner;
class Node {
    int value;
    Node next;
    Node(int value) { this.value = value; }
}
class LinkedList {
    Node head;
    void append(int v) {
        Node n = new Node(v);
        if (head == null) { head = n; return; }
        Node cur = head;
        while (cur.next != null) cur = cur.next;
        cur.next = n;
    }
    void delete(int v) {
        if (head == null) return;
        if (head.value == v) { head = head.next; return; }
        Node cur = head;
        while (cur.next != null && cur.next.value != v) cur = cur.next;
        if (cur.next != null) cur.next = cur.next.next;
    }
    void reverse() {
        Node prev = null, cur = head;
        while (cur != null) {
            Node next = cur.next;
            cur.next = prev;
            prev = cur;
            cur = next;
        }
        head = prev;
    }
    String display() {
        StringJoiner j = new StringJoiner(" -> ");
        for (Node cur = head; cur != null; cur = cur.next) j.add(String.valueOf(cur.value));
        return j.toString();
    }
}
public class Main {
    public static void main(String[] args) {
        LinkedList list = new LinkedList();
        list.append(10);
        list.append(20);
        list.append(30);
        System.out.println("List: " + list.display());
        list.reverse();
        System.out.println("Reversed: " + list.display());
        list.delete(20);
        System.out.println("After delete: " + list.display());
    }
}` },
    },
    {
      title: 'Doubly and Circular Linked Lists', minutes: 55,
      content: `## Doubly linked lists
Each node links to the {{next}} and the {{previous}} node, and the list keeps both a {{head}} and a {{tail}}:
null ← [A] ⇄ [B] ⇄ [C] → null
~~~
class DNode {
    String value;
    DNode prev, next;
    DNode(String value) { this.value = value; }
}
void append(String v) {
    DNode n = new DNode(v);
    if (head == null) { head = tail = n; return; }
    tail.next = n;
    n.prev = tail;
    tail = n;
}
~~~
- You can walk {{forwards}} from head and {{backwards}} from tail
- Deleting a node you already hold is O(1): link its neighbours to each other
- Cost: an extra reference per node
Used for browser back/forward history and music playlists.

## Circular linked lists
The last node links back to the first, so there is no null at the end:
[1] → [2] → [3] → back to [1]
~~~
last.next = head;     // close the circle
Node cur = head;
for (int i = 0; i < 6; i++) {     // walk round twice
    System.out.print(cur.value + " ");
    cur = cur.next;
}
~~~
Be careful: a loop like {{while (cur != null)}} never ends on a circular list - count steps or stop when you are back at the head.

Used for round-robin scheduling (an operating system giving each program a turn) and multiplayer turns.`,
      example: { java: `class DNode {
    int value;
    DNode prev, next;
    DNode(int value) { this.value = value; }
}
public class Main {
    public static void main(String[] args) {
        DNode a = new DNode(1), b = new DNode(2);
        a.next = b;
        b.prev = a;
        System.out.println("b's previous is " + b.prev.value);
    }
}` },
      challenge: 'Build a doubly linked list with append, then print "Forward: A B C" walking from the head and "Backward: C B A" walking from the tail. Then make a circular list of 1, 2, 3 and print "Circular: 1 2 3 1 2 3" by walking six steps.',
      checks: [
        { label: 'Nodes have prev and next links', in: 'code', re: /\bprev\b[\s\S]*\bnext\b|\bnext\b[\s\S]*\bprev\b/ },
        { label: 'Keeps a tail reference', in: 'code', re: /\btail\b/ },
        { label: 'Walks forwards and backwards', in: 'output', re: /Forward:[\s\S]*A[\s\S]*B[\s\S]*C[\s\S]*Backward:[\s\S]*C[\s\S]*B[\s\S]*A/ },
        { label: 'Walks round the circular list twice', in: 'output', re: /Circular:\s*1 2 3 1 2 3\b/ },
      ],
      hints: ['Backwards: for (DNode cur = tail; cur != null; cur = cur.prev)', 'Circular: after linking 1 -> 2 -> 3, set three.next = one.'],
      quiz: [
        { q: 'What extra link does a doubly linked list node have?', options: ['A link to the previous node', 'A link to the head', 'A link to the middle', 'An index'], why: 'prev allows walking backwards.' },
        { q: 'In a circular linked list, what does the last node point to?', options: ['The first node', 'null', 'Itself', 'The middle node'], why: 'The list forms a circle.' },
        { q: 'Which is a typical use of a circular list?', options: ['Round-robin scheduling', 'Binary search', 'Storing a sorted dictionary', 'Undoing typing'], why: 'Each process gets a turn, round and round.' },
      ],
      oral: 'Explain the trade-off between singly and doubly linked lists.',
      solution: { java: `class DNode {
    String value;
    DNode prev, next;
    DNode(String value) { this.value = value; }
}
class DoublyList {
    DNode head, tail;
    void append(String v) {
        DNode n = new DNode(v);
        if (head == null) { head = tail = n; return; }
        tail.next = n;
        n.prev = tail;
        tail = n;
    }
}
class CNode {
    int value;
    CNode next;
    CNode(int value) { this.value = value; }
}
public class Main {
    public static void main(String[] args) {
        DoublyList d = new DoublyList();
        d.append("A");
        d.append("B");
        d.append("C");
        StringBuilder f = new StringBuilder("Forward:");
        for (DNode cur = d.head; cur != null; cur = cur.next) f.append(" ").append(cur.value);
        System.out.println(f);
        StringBuilder b = new StringBuilder("Backward:");
        for (DNode cur = d.tail; cur != null; cur = cur.prev) b.append(" ").append(cur.value);
        System.out.println(b);
        CNode one = new CNode(1), two = new CNode(2), three = new CNode(3);
        one.next = two;
        two.next = three;
        three.next = one;
        StringBuilder c = new StringBuilder("Circular:");
        CNode cur = one;
        for (int i = 0; i < 6; i++) {
            c.append(" ").append(cur.value);
            cur = cur.next;
        }
        System.out.println(c);
    }
}` },
    },
    {
      title: 'Stacks', minutes: 55,
      content: `A {{stack}} is a Last-In, First-Out ({{LIFO}}) structure - like a pile of plates: you add and remove at the top only.

## Operations
- {{push(x)}}: put x on top
- {{pop()}}: remove and return the top
- {{peek()}}: look at the top without removing it
- {{isEmpty()}}
All are O(1).

## An array-based stack
~~~
class CharStack {
    private char[] items = new char[100];
    private int top = -1;              // -1 means empty
    void push(char c) { items[++top] = c; }
    char pop() { return items[top--]; }
    char peek() { return items[top]; }
    boolean isEmpty() { return top == -1; }
}
~~~
Popping an empty stack is an {{underflow}}; pushing onto a full one an {{overflow}}.

## Uses
- {{Undo}} in editors (the last change is undone first)
- The {{call stack}}: every method call is pushed, and popped when it returns (that is why infinite recursion overflows it)
- Checking {{balanced brackets}} in code
- Evaluating expressions and the browser back button

## Balanced brackets
Push every opening bracket; on a closing bracket, pop and check it matches. At the end the stack must be empty.
"{[()]}" is balanced; "([)]" is not.`,
      example: { java: `public class Main {
    public static void main(String[] args) {
        String word = "Kenya";
        char[] stack = new char[word.length()];
        int top = -1;
        for (char c : word.toCharArray()) stack[++top] = c;   // push
        StringBuilder reversed = new StringBuilder();
        while (top >= 0) reversed.append(stack[top--]);        // pop
        System.out.println(reversed);
    }
}` },
      challenge: 'Write your own stack class with push, pop, peek and isEmpty, and use it in a method balanced(String s) that checks brackets ( ) [ ] { }. Print "{[()]} balanced: true", "([)] balanced: false" and "((() balanced: false".',
      checks: [
        { label: 'Defines a stack class with push and pop', in: 'code', re: /class\s+\w*Stack\w*[\s\S]*void\s+push\s*\([\s\S]*pop\s*\(/ },
        { label: 'Has a balanced method', in: 'code', re: /boolean\s+balanced\s*\(\s*String/ },
        { label: 'Accepts the balanced string', in: 'output', re: /\{\s*\[\s*\(\s*\)\s*\]\s*\}\s*balanced:\s*true/i },
        { label: 'Rejects both unbalanced strings', in: 'output', re: /\(\[\)\] balanced: false[\s\S]*\(\(\(\) balanced: false/ },
      ],
      hints: ['On a closing bracket: if the stack is empty or the popped bracket does not match, return false.', 'At the end return stack.isEmpty().'],
      quiz: [
        { q: 'What does LIFO mean?', options: ['Last in, first out', 'Last in, final out', 'List in, function out', 'Least important first out'], why: 'The most recently added item leaves first.' },
        { q: 'Which operation reads the top item without removing it?', options: ['peek', 'pop', 'push', 'poll'], why: 'peek only looks.' },
        { q: 'Which feature uses a stack?', options: ['Undo in a text editor', 'A printer queue', 'Binary search', 'A matatu stage queue'], why: 'The last action is undone first.' },
      ],
      oral: 'Explain how a stack is used to check that brackets in a program are balanced.',
      solution: { java: `class CharStack {
    private char[] items = new char[100];
    private int top = -1;
    void push(char c) { items[++top] = c; }
    char pop() { return items[top--]; }
    char peek() { return items[top]; }
    boolean isEmpty() { return top == -1; }
}
public class Main {
    static boolean balanced(String s) {
        CharStack st = new CharStack();
        for (char c : s.toCharArray()) {
            if (c == '(' || c == '[' || c == '{') {
                st.push(c);
            } else if (c == ')' || c == ']' || c == '}') {
                if (st.isEmpty()) return false;
                char open = st.pop();
                if ((c == ')' && open != '(') || (c == ']' && open != '[') || (c == '}' && open != '{')) return false;
            }
        }
        return st.isEmpty();
    }
    public static void main(String[] args) {
        for (String s : new String[]{"{[()]}", "([)]", "((()"}) {
            System.out.println(s + " balanced: " + balanced(s));
        }
    }
}` },
    },
    {
      title: 'Queues', minutes: 55,
      content: `A {{queue}} is First-In, First-Out ({{FIFO}}) - like passengers at a matatu stage: the first to arrive boards first.

## Operations
- {{enqueue(x)}}: add x at the {{rear}}
- {{dequeue()}}: remove and return the item at the {{front}}
- {{peek()}}, {{isEmpty()}}, {{isFull()}}

## The circular array queue
A simple array queue wastes space as the front moves forward. A {{circular queue}} wraps the indexes round with {{% capacity}}:
~~~
class CircularQueue {
    private String[] items;
    private int front = 0, rear = -1, count = 0;
    CircularQueue(int capacity) { items = new String[capacity]; }

    boolean enqueue(String x) {
        if (count == items.length) return false;        // full
        rear = (rear + 1) % items.length;
        items[rear] = x;
        count++;
        return true;
    }
    String dequeue() {
        if (count == 0) return null;                     // empty
        String x = items[front];
        front = (front + 1) % items.length;
        count--;
        return x;
    }
}
~~~
Every operation is O(1).

## Uses
- Printer jobs, customer service lines, M-Pesa transaction processing
- {{Breadth-first search}} in graphs (next course)
- Message queues between parts of a system

A {{priority queue}} serves the most urgent item first (hospital triage) instead of the oldest.`,
      example: { java: `import java.util.ArrayDeque;
public class Main {
    public static void main(String[] args) {
        ArrayDeque<String> stage = new ArrayDeque<>();
        stage.add("Wanjiku");
        stage.add("Otieno");
        System.out.println("Boards first: " + stage.poll());
        System.out.println("Still waiting: " + stage);
    }
}` },
      challenge: 'Write your own CircularQueue with capacity 3 (enqueue, dequeue, isFull, display). Enqueue A, B and C, dequeue once and print "Served: A", enqueue D and print "Queue: B C D" and "Full: true".',
      checks: [
        { label: 'Defines a queue class with enqueue and dequeue', in: 'code', re: /class\s+\w*Queue\w*[\s\S]*enqueue\s*\([\s\S]*dequeue\s*\(/ },
        { label: 'Wraps indexes with %', in: 'code', re: /%\s*\w+(\.length)?/ },
        { label: 'Serves the first arrival', in: 'output', re: /Served:\s*A\b/ },
        { label: 'Shows the queue and that it is full', in: 'output', re: /Queue:[\s\S]*B[\s\S]*C[\s\S]*D[\s\S]*Full:\s*true/i },
      ],
      hints: ['rear = (rear + 1) % items.length;', 'To display, start at front and take count items, wrapping with %.'],
      quiz: [
        { q: 'What does FIFO mean?', options: ['First in, first out', 'Fast in, fast out', 'First in, final out', 'File in, file out'], why: 'The earliest arrival is served first.' },
        { q: 'Why use a circular array for a queue?', options: ['So freed slots at the front are reused', 'To sort the items', 'To make it a stack', 'To allow duplicates'], why: 'Indexes wrap around instead of running off the end.' },
        { q: 'Which serves the most urgent item first?', options: ['A priority queue', 'A stack', 'A circular queue', 'A linked list'], why: 'Priority queues order by importance.' },
      ],
      oral: 'Compare a stack and a queue and give a real-life use of each.',
      solution: { java: `class CircularQueue {
    private String[] items;
    private int front = 0, rear = -1, count = 0;
    CircularQueue(int capacity) { items = new String[capacity]; }
    boolean isFull() { return count == items.length; }
    boolean enqueue(String x) {
        if (isFull()) return false;
        rear = (rear + 1) % items.length;
        items[rear] = x;
        count++;
        return true;
    }
    String dequeue() {
        if (count == 0) return null;
        String x = items[front];
        front = (front + 1) % items.length;
        count--;
        return x;
    }
    String display() {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < count; i++) {
            if (i > 0) sb.append(" ");
            sb.append(items[(front + i) % items.length]);
        }
        return sb.toString();
    }
}
public class Main {
    public static void main(String[] args) {
        CircularQueue q = new CircularQueue(3);
        q.enqueue("A");
        q.enqueue("B");
        q.enqueue("C");
        System.out.println("Served: " + q.dequeue());
        q.enqueue("D");
        System.out.println("Queue: " + q.display());
        System.out.println("Full: " + q.isFull());
    }
}` },
    },
  ],
};

const M120 = {
  id: 120, order: 20, icon: '🔎', color: '#0f766e', difficulty: 'advanced',
  title: 'Searching and Sorting',
  description: 'Linear and binary search, then bubble, selection and insertion sort and how to compare them.',
  lessons: [
    {
      title: 'Linear and Binary Search', minutes: 55,
      content: `{{Searching}} finds the position of a value in a collection.

## Linear search - O(n)
Check each item from the start until you find it. Works on {{any}} list, sorted or not.
~~~
static int linearSearch(int[] a, int target) {
    for (int i = 0; i < a.length; i++) {
        if (a[i] == target) return i;
    }
    return -1;
}
~~~

## Binary search - O(log n)
Works only on a {{sorted}} array. Look at the middle: if the target is smaller, keep the left half, otherwise the right half. Each step halves the search space.
~~~
static int binarySearch(int[] a, int target) {
    int lo = 0, hi = a.length - 1;
    while (lo <= hi) {
        int mid = (lo + hi) / 2;
        if (a[mid] == target) return mid;
        if (a[mid] < target) lo = mid + 1;   // go right
        else hi = mid - 1;                   // go left
    }
    return -1;
}
~~~

## How big is the difference?
For 1,000,000 sorted items, linear search may need 1,000,000 comparisons; binary search needs about 20 (2^20 ≈ 1,000,000).

## When to use which
- Unsorted data, or searching only once: linear search
- Sorted data searched many times: binary search (sort once, search fast)
- Exact lookups by key in a database: an index or a hash table (Database course)`,
      example: { java: `public class Main {
    public static void main(String[] args) {
        String[] towns = {"Eldoret", "Kisumu", "Mombasa", "Nairobi", "Nakuru"};
        int lo = 0, hi = towns.length - 1, steps = 0;
        while (lo <= hi) {
            int mid = (lo + hi) / 2;
            steps++;
            int cmp = towns[mid].compareTo("Nakuru");
            if (cmp == 0) { System.out.println("Found at " + mid + " in " + steps + " steps"); break; }
            if (cmp < 0) lo = mid + 1; else hi = mid - 1;
        }
    }
}` },
      challenge: 'Write linearSearch and binarySearch for int arrays. Using the sorted array {3, 8, 15, 21, 34, 42, 57, 63}, print "linear(42) = 5", "binary(42) = 5", "binary(10) = -1", and the comparisons each needed to find 63: "Linear comparisons: 8" and "Binary comparisons: 4".',
      checks: [
        { label: 'Has both search methods', in: 'code', re: /linearSearch\s*\([\s\S]*binarySearch\s*\(|binarySearch\s*\([\s\S]*linearSearch\s*\(/ },
        { label: 'Binary search uses a middle index', in: 'code', re: /mid\s*=\s*\(?\s*lo\s*\+\s*hi\s*\)?\s*\/\s*2|mid\s*=\s*lo\s*\+\s*\(\s*hi\s*-\s*lo\s*\)\s*\/\s*2/ },
        { label: 'Finds 42 both ways and reports a missing value', in: 'output', re: /linear\(42\) = 5[\s\S]*binary\(42\) = 5[\s\S]*binary\(10\) = -1/ },
        { label: 'Counts the comparisons for 63', in: 'output', re: /Linear comparisons:\s*8\b[\s\S]*Binary comparisons:\s*4\b/ },
      ],
      hints: ['Use static int counters and reset them before each count.', 'Count one comparison each time you look at a[i] or a[mid].'],
      quiz: [
        { q: 'What must be true before binary search can be used?', options: ['The array is sorted', 'The array is small', 'The values are unique', 'The array has an even length'], why: 'Binary search relies on order to discard half.' },
        { q: 'What is the time complexity of binary search?', options: ['O(log n)', 'O(n)', 'O(1)', 'O(n²)'], why: 'Each step halves the remaining items.' },
        { q: 'About how many steps does binary search need for 1,000,000 items?', options: ['About 20', 'About 1,000', 'About 500,000', 'About 1,000,000'], why: '2^20 is about one million.' },
      ],
      oral: 'Explain why binary search is so much faster than linear search, and when you still use linear search.',
      solution: { java: `public class Main {
    static int comparisons = 0;
    static int linearSearch(int[] a, int target) {
        for (int i = 0; i < a.length; i++) {
            comparisons++;
            if (a[i] == target) return i;
        }
        return -1;
    }
    static int binarySearch(int[] a, int target) {
        int lo = 0, hi = a.length - 1;
        while (lo <= hi) {
            int mid = (lo + hi) / 2;
            comparisons++;
            if (a[mid] == target) return mid;
            if (a[mid] < target) lo = mid + 1;
            else hi = mid - 1;
        }
        return -1;
    }
    public static void main(String[] args) {
        int[] a = {3, 8, 15, 21, 34, 42, 57, 63};
        System.out.println("linear(42) = " + linearSearch(a, 42));
        System.out.println("binary(42) = " + binarySearch(a, 42));
        System.out.println("binary(10) = " + binarySearch(a, 10));
        comparisons = 0;
        linearSearch(a, 63);
        System.out.println("Linear comparisons: " + comparisons);
        comparisons = 0;
        binarySearch(a, 63);
        System.out.println("Binary comparisons: " + comparisons);
    }
}` },
    },
    {
      title: 'Bubble Sort', minutes: 50,
      content: `{{Sorting}} puts items in order. {{Bubble sort}} repeatedly walks through the array and swaps neighbours that are in the wrong order; after each pass the largest remaining item has "bubbled" to the end.

~~~
static void bubbleSort(int[] a) {
    for (int pass = 0; pass < a.length - 1; pass++) {
        boolean swapped = false;
        for (int i = 0; i < a.length - 1 - pass; i++) {
            if (a[i] > a[i + 1]) {
                int t = a[i]; a[i] = a[i + 1]; a[i + 1] = t;   // swap
                swapped = true;
            }
        }
        if (!swapped) break;    // already sorted - stop early
    }
}
~~~

## Words used to describe sorting algorithms
- {{In place}}: needs only a little extra memory (bubble sort swaps inside the array). {{Not in place}}: needs a second array (merge sort)
- {{Stable}}: equal items keep their original order (important when sorting customers by town after sorting by name). Bubble sort is stable because it only swaps when {{a[i] > a[i + 1]}}
- {{Adaptive}}: faster when the data is nearly sorted. With the {{swapped}} flag, bubble sort finishes a sorted array in one pass. {{Non-adaptive}} algorithms do the same work regardless

## Cost
Worst and average case {{O(n²)}} comparisons; best case {{O(n)}} for already sorted data. Simple to understand, but too slow for large data.`,
      example: { java: `import java.util.Arrays;
public class Main {
    public static void main(String[] args) {
        int[] a = {5, 1, 4};
        System.out.println("Start: " + Arrays.toString(a));
        if (a[0] > a[1]) { int t = a[0]; a[0] = a[1]; a[1] = t; }
        System.out.println("After one swap: " + Arrays.toString(a));
    }
}` },
      challenge: 'Implement bubble sort with an early exit and a swap counter. Sort {29, 10, 14, 37, 13} and print "Sorted: [10, 13, 14, 29, 37]" and "Swaps: 5". Then sort the already sorted {1, 2, 3, 4, 5} and print "Passes on sorted data: 1".',
      checks: [
        { label: 'Swaps neighbours', in: 'code', re: /a\s*\[\s*\w+\s*\]\s*>\s*a\s*\[\s*\w+\s*\+\s*1\s*\]/ },
        { label: 'Stops early when nothing was swapped', in: 'code', re: /swapped[\s\S]*break/ },
        { label: 'Sorts the array and counts swaps', in: 'output', re: /Sorted:[\s\S]*10[\s\S]*13[\s\S]*14[\s\S]*29[\s\S]*37[\s\S]*Swaps:\s*5/ },
        { label: 'Needs only one pass on sorted data', in: 'output', re: /Passes on sorted data:\s*1\b/ },
      ],
      hints: ['Count passes with a counter that goes up at the start of each outer loop.', 'Return the counts from the method or keep them in static fields.'],
      quiz: [
        { q: 'What does it mean that a sort is stable?', options: ['Equal items keep their original order', 'It never crashes', 'It always takes the same time', 'It uses no memory'], why: 'Stability preserves the relative order of equal keys.' },
        { q: 'What is bubble sort\'s worst-case complexity?', options: ['O(n²)', 'O(n log n)', 'O(n)', 'O(log n)'], why: 'Nested passes compare roughly n × n pairs.' },
        { q: 'What makes bubble sort adaptive?', options: ['Stopping when a pass makes no swaps', 'Using a second array', 'Sorting from the middle', 'Recursion'], why: 'An already sorted array finishes in one pass.' },
      ],
      oral: 'Explain the terms stable, adaptive and in place using bubble sort as the example.',
      solution: { java: `import java.util.Arrays;
public class Main {
    static int swaps, passes;
    static void bubbleSort(int[] a) {
        swaps = 0;
        passes = 0;
        for (int pass = 0; pass < a.length - 1; pass++) {
            passes++;
            boolean swapped = false;
            for (int i = 0; i < a.length - 1 - pass; i++) {
                if (a[i] > a[i + 1]) {
                    int t = a[i]; a[i] = a[i + 1]; a[i + 1] = t;
                    swaps++;
                    swapped = true;
                }
            }
            if (!swapped) break;
        }
    }
    public static void main(String[] args) {
        int[] a = {29, 10, 14, 37, 13};
        bubbleSort(a);
        System.out.println("Sorted: " + Arrays.toString(a));
        System.out.println("Swaps: " + swaps);
        bubbleSort(new int[]{1, 2, 3, 4, 5});
        System.out.println("Passes on sorted data: " + passes);
    }
}` },
    },
    {
      title: 'Selection Sort and Insertion Sort', minutes: 55,
      content: `## Selection sort
Find the smallest item in the unsorted part and swap it to the front; repeat for the rest.
~~~
static void selectionSort(int[] a) {
    for (int i = 0; i < a.length - 1; i++) {
        int min = i;
        for (int j = i + 1; j < a.length; j++) {
            if (a[j] < a[min]) min = j;
        }
        int t = a[i]; a[i] = a[min]; a[min] = t;
    }
}
~~~
- Always O(n²) comparisons - {{non-adaptive}}
- At most n - 1 swaps - useful when writing data is expensive
- {{Not stable}}: the long-distance swap can jump an item over an equal one

## Insertion sort
Take the next item and slide it left into its place among the already sorted items - like sorting cards in your hand.
~~~
static void insertionSort(int[] a) {
    for (int i = 1; i < a.length; i++) {
        int key = a[i];
        int j = i - 1;
        while (j >= 0 && a[j] > key) {
            a[j + 1] = a[j];      // shift right
            j--;
        }
        a[j + 1] = key;
    }
}
~~~
- O(n²) worst case, but {{O(n)}} for nearly sorted data - {{adaptive}}
- {{Stable}} and {{in place}}
- Fast in practice for small arrays (Java's own sort uses it for small pieces)

## Comparing the three simple sorts
| | Best | Worst | Stable | Adaptive |
- Bubble: O(n), O(n²), yes, yes (with early exit)
- Selection: O(n²), O(n²), no, no
- Insertion: O(n), O(n²), yes, yes
For large data use O(n log n) sorts: {{merge sort}}, {{quick sort}}, or simply {{Arrays.sort()}}.`,
      example: { java: `import java.util.Arrays;
public class Main {
    public static void main(String[] args) {
        int[] hand = {7, 3, 9};
        int key = hand[1];   // 3 must move before 7
        hand[1] = hand[0];
        hand[0] = key;
        System.out.println(Arrays.toString(hand));
    }
}` },
      challenge: 'Implement selectionSort and insertionSort. Sort copies of {64, 25, 12, 22, 11} with each and print "Selection: [11, 12, 22, 25, 64]" and "Insertion: [11, 12, 22, 25, 64]". Then print "Arrays.sort agrees: true" by comparing your result with Arrays.sort using Arrays.equals.',
      checks: [
        { label: 'Has selectionSort and insertionSort', in: 'code', re: /selectionSort\s*\(\s*int\s*\[\]\s*\w+\s*\)[\s\S]*insertionSort\s*\(\s*int\s*\[\]\s*\w+\s*\)|insertionSort\s*\(\s*int\s*\[\]\s*\w+\s*\)[\s\S]*selectionSort\s*\(\s*int\s*\[\]\s*\w+\s*\)/ },
        { label: 'Insertion sort shifts with a while loop', in: 'code', re: /while\s*\(\s*\w+\s*>=\s*0\s*&&/ },
        { label: 'Both sorts give the right order', in: 'output', re: /Selection:[\s\S]*11[\s\S]*12[\s\S]*22[\s\S]*25[\s\S]*64[\s\S]*Insertion:[\s\S]*11[\s\S]*12[\s\S]*22[\s\S]*25[\s\S]*64/ },
        { label: 'Matches Arrays.sort', in: 'output', re: /Arrays\.sort agrees:\s*true/ },
      ],
      hints: ['int[] copy = original.clone(); sorts a copy and leaves the original alone.', 'Arrays.equals(mine, theirs) compares two arrays item by item.'],
      quiz: [
        { q: 'Which simple sort is not stable?', options: ['Selection sort', 'Insertion sort', 'Bubble sort', 'Merge sort'], why: 'Its long-distance swaps can reorder equal items.' },
        { q: 'Which sort works like arranging playing cards in your hand?', options: ['Insertion sort', 'Selection sort', 'Bubble sort', 'Binary search'], why: 'Each new card is slid into place.' },
        { q: 'Which algorithm would you use to sort a million records?', options: ['An O(n log n) sort such as merge sort', 'Bubble sort', 'Selection sort', 'Linear search'], why: 'O(n²) sorts are far too slow for large data.' },
      ],
      oral: 'Compare bubble, selection and insertion sort and say which you would choose for nearly sorted data, and why.',
      solution: { java: `import java.util.Arrays;
public class Main {
    static void selectionSort(int[] a) {
        for (int i = 0; i < a.length - 1; i++) {
            int min = i;
            for (int j = i + 1; j < a.length; j++) if (a[j] < a[min]) min = j;
            int t = a[i]; a[i] = a[min]; a[min] = t;
        }
    }
    static void insertionSort(int[] a) {
        for (int i = 1; i < a.length; i++) {
            int key = a[i];
            int j = i - 1;
            while (j >= 0 && a[j] > key) {
                a[j + 1] = a[j];
                j--;
            }
            a[j + 1] = key;
        }
    }
    public static void main(String[] args) {
        int[] original = {64, 25, 12, 22, 11};
        int[] s = original.clone();
        selectionSort(s);
        System.out.println("Selection: " + Arrays.toString(s));
        int[] ins = original.clone();
        insertionSort(ins);
        System.out.println("Insertion: " + Arrays.toString(ins));
        int[] ref = original.clone();
        Arrays.sort(ref);
        System.out.println("Arrays.sort agrees: " + Arrays.equals(ins, ref));
    }
}` },
    },
  ],
};

module.exports = { M118, M119, M120 };
