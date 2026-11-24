'use strict';
/**
 * Course 6 - Mathematics for Computing (modules 121-123), practised in Python.
 * TVET CDACC Computer Science L6, ICT/CU/CS/CR/03/6/A "Mathematics for Computer Science":
 *   linear algebra, Boolean algebra, set theory, calculus, probability and statistics.
 * ICT Technician L6, IT/CU/ICTA/CC/01/6/MA "Discrete Mathematical Concepts":
 *   set theory, matrices, number systems, logic gates, sequences and series, graph theory.
 */

const M121 = {
  id: 121, order: 21, icon: '🔢', color: '#7c3aed', difficulty: 'beginner',
  title: 'Number Systems and Logic',
  description: 'Binary, octal and hexadecimal, Boolean algebra and logic gates, and simplifying expressions.',
  lessons: [
    {
      title: 'Number Systems', minutes: 50,
      content: `Computers store everything as {{binary}} - patterns of 0s and 1s ({{bits}}). Programmers also use octal and hexadecimal as short ways to write binary.

## The four common bases
- {{Decimal}} (base 10): digits 0-9 - 45
- {{Binary}} (base 2): digits 0-1 - 101101
- {{Octal}} (base 8): digits 0-7 - 55
- {{Hexadecimal}} (base 16): 0-9 then A-F - 2D

Each position is a power of the base: binary 101101 = 1×32 + 0×16 + 1×8 + 1×4 + 0×2 + 1×1 = 45.

## Decimal to binary - repeated division
Divide by 2 and keep the remainders, then read them bottom to top:
45 ÷ 2 = 22 r1, 22 ÷ 2 = 11 r0, 11 ÷ 2 = 5 r1, 5 ÷ 2 = 2 r1, 2 ÷ 2 = 1 r0, 1 ÷ 2 = 0 r1 → 101101
~~~
def to_binary(n):
    digits = ""
    while n > 0:
        digits = str(n % 2) + digits
        n //= 2
    return digits or "0"
~~~

## Python helpers
- {{bin(45)}} → '0b101101', {{oct(45)}} → '0o55', {{hex(255)}} → '0xff'
- {{int("101101", 2)}} → 45, {{int("ff", 16)}} → 255
- {{format(255, "X")}} → 'FF'

## Hexadecimal in real life
One hex digit is exactly four bits, so a byte is two hex digits: colours on the web ({{#FF8800}}), MAC addresses and memory addresses.

## Codes for characters and digits
- {{ASCII}}: 7-bit codes for English characters ('A' = 65); {{ord("A")}} and {{chr(65)}}
- {{EBCDIC}}: an older 8-bit IBM code
- {{BCD}} (binary-coded decimal): each decimal digit as 4 bits (45 → 0100 0101)
- {{Unicode / UTF-8}}: every language, including Kiswahili and emoji`,
      example: { python: `n = 13
print("13 in binary:", bin(n)[2:])
print("13 in octal:", oct(n)[2:])
print("13 in hex:", hex(n)[2:].upper())
print("Letter K is ASCII", ord("K"))` },
      challenge: 'Write your own to_binary(n) using repeated division (do not use bin inside it). Print "45 -> 101101", then "Check: True" comparing your answer with bin(45)[2:], "255 in hex: FF" and "1101 in decimal: 13".',
      checks: [
        { label: 'Defines to_binary with repeated division', in: 'code', re: /def\s+to_binary\s*\([\s\S]*%\s*2[\s\S]*\/\/=?\s*2|def\s+to_binary\s*\([\s\S]*\/\/=?\s*2[\s\S]*%\s*2/ },
        { label: 'Converts 45 to binary', in: 'output', re: /45 -> 101101/ },
        { label: 'Checks against bin()', in: 'output', re: /Check:\s*True/ },
        { label: 'Converts to hex and from binary', in: 'output', re: /255 in hex:\s*FF[\s\S]*1101 in decimal:\s*13\b/ },
      ],
      hints: ['digits = str(n % 2) + digits; n //= 2', 'format(255, "X") gives FF; int("1101", 2) gives 13.'],
      quiz: [
        { q: 'What is binary 1010 in decimal?', options: ['10', '8', '12', '1010'], why: '1×8 + 0×4 + 1×2 + 0×1 = 10.' },
        { q: 'How many bits does one hexadecimal digit represent?', options: ['4', '2', '8', '16'], why: '16 = 2⁴, so one hex digit is four bits.' },
        { q: 'Which code represents characters from every language, including emoji?', options: ['Unicode (UTF-8)', 'ASCII', 'BCD', 'EBCDIC'], why: 'Unicode covers all writing systems.' },
      ],
      oral: 'Explain step by step how to convert 156 from decimal to binary and hexadecimal.',
      solution: { python: `def to_binary(n):
    digits = ""
    while n > 0:
        digits = str(n % 2) + digits
        n //= 2
    return digits or "0"

print("45 ->", to_binary(45))
print("Check:", to_binary(45) == bin(45)[2:])
print("255 in hex:", format(255, "X"))
print("1101 in decimal:", int("1101", 2))` },
    },
    {
      title: 'Boolean Algebra and Logic Gates', minutes: 55,
      content: `{{Boolean algebra}} works with two values: true (1) and false (0). It describes how digital circuits and program conditions behave.

## Basic operations
- {{AND}} (A·B): 1 only if both are 1
- {{OR}} (A + B): 1 if at least one is 1
- {{NOT}} (A'): flips the value

## Secondary operations (gates)
- {{NAND}}: NOT AND - 0 only when both are 1
- {{NOR}}: NOT OR - 1 only when both are 0
- {{XOR}} (exclusive OR): 1 when the inputs differ
- {{XNOR}}: 1 when the inputs are the same
NAND and NOR are {{universal gates}}: any circuit can be built from NAND gates alone.

## Truth tables
~~~
print("A B | AND OR XOR")
for a in (0, 1):
    for b in (0, 1):
        print(a, b, "|", a & b, a | b, a ^ b)
~~~
In Python, {{&}}, {{|}} and {{^}} work bit by bit on 0 and 1; {{1 - a}} or {{int(not a)}} gives NOT.

## Order of operations
NOT first, then AND, then OR - just like brackets, multiplication, addition. A + B·C means A + (B·C).

## De Morgan's theorems
- (A·B)' = A' + B'  - NOT(A AND B) equals NOT A OR NOT B
- (A + B)' = A'·B'  - NOT(A OR B) equals NOT A AND NOT B
These let you swap AND for OR - very useful when simplifying conditions in code.

## Where you see it
Every if statement, every search filter (Google's AND/OR), and every circuit in the processor.`,
      example: { python: `print("A B | NOR")
for a in (0, 1):
    for b in (0, 1):
        print(a, b, "|", int(not (a or b)))` },
      challenge: 'Print a truth table with the header "A B | NAND XOR" and one row per input pair in the form "0 0 | 1 0". Then check both De Morgan theorems for all inputs and print "De Morgan 1 holds: True" and "De Morgan 2 holds: True".',
      checks: [
        { label: 'Loops over all input pairs', in: 'code', re: /for\s+\w+\s+in\s+[\s\S]*for\s+\w+\s+in|product\s*\(/ },
        { label: 'Prints the NAND/XOR truth table', in: 'output', re: /A B \| NAND XOR\n0 0 \| 1 0\n0 1 \| 1 1\n1 0 \| 1 1\n1 1 \| 0 0/ },
        { label: 'Checks De Morgan 1', in: 'output', re: /De Morgan 1 holds:\s*True/ },
        { label: 'Checks De Morgan 2', in: 'output', re: /De Morgan 2 holds:\s*True/ },
      ],
      hints: ['NAND: int(not (a and b)); XOR: a ^ b', 'all(... for a in (0, 1) for b in (0, 1)) checks every combination.'],
      quiz: [
        { q: 'When is the output of XOR 1?', options: ['When the inputs are different', 'When both inputs are 1', 'When both inputs are 0', 'Always'], why: 'Exclusive OR means one or the other, not both.' },
        { q: 'By De Morgan, NOT(A AND B) equals...', options: ['NOT A OR NOT B', 'NOT A AND NOT B', 'A OR B', 'A AND B'], why: '(A·B)\' = A\' + B\'.' },
        { q: 'Which gates are called universal?', options: ['NAND and NOR', 'AND and OR', 'XOR and XNOR', 'NOT only'], why: 'Any circuit can be built from NAND (or NOR) alone.' },
      ],
      oral: 'Explain De Morgan\'s theorems and show how they can simplify an if statement.',
      solution: { python: `print("A B | NAND XOR")
for a in (0, 1):
    for b in (0, 1):
        print(a, b, "|", int(not (a and b)), a ^ b)
d1 = all((not (a and b)) == ((not a) or (not b)) for a in (0, 1) for b in (0, 1))
d2 = all((not (a or b)) == ((not a) and (not b)) for a in (0, 1) for b in (0, 1))
print("De Morgan 1 holds:", d1)
print("De Morgan 2 holds:", d2)` },
    },
    {
      title: 'Simplifying Boolean Expressions', minutes: 55,
      content: `Simpler expressions mean cheaper circuits and clearer code.

## Laws of Boolean algebra
- {{AND laws}}: A·0 = 0, A·1 = A, A·A = A, A·A' = 0
- {{OR laws}}: A + 0 = A, A + 1 = 1, A + A = A, A + A' = 1
- {{Inversion}}: (A')' = A
- {{Commutative}}: A·B = B·A, A + B = B + A
- {{Associative}}: (A·B)·C = A·(B·C)
- {{Distributive}}: A·(B + C) = A·B + A·C
- {{Absorption}}: A + A·B = A, A·(A + B) = A
- {{De Morgan}}: (A·B)' = A' + B', (A + B)' = A'·B'

## Simplifying algebraically
A·B + A·B'
= A·(B + B')    (distributive)
= A·1           (B + B' = 1)
= A

## Using truth tables
Two expressions are equal if they give the same output for {{every}} input. A program can check this:
~~~
from itertools import product
same = all((a and b) or (a and not b) == a for a, b in product((0, 1), repeat=2))
~~~

## Karnaugh maps
A {{K-map}} arranges a truth table as a grid where neighbouring cells differ by one variable. Groups of 1s (in sizes 1, 2, 4, 8) give the simplified terms. For F = A'B + AB the two 1s sit in the B column, so F = B.

## In code
if (paid and member) or (paid and not member): simplifies to if paid:`,
      example: { python: `from itertools import product
# Absorption law: A + A·B = A
ok = all(bool(a or (a and b)) == bool(a) for a, b in product((0, 1), repeat=2))
print("A + AB = A:", ok)` },
      challenge: 'Using truth tables over all inputs, prove three simplifications and print each result: "AB + AB\' = A: True", "(A+B)(A+B\') = A: True" and "A\'B + AB = B: True". Then show that a wrong simplification fails: print "A + B = A: False".',
      checks: [
        { label: 'Checks every input combination', in: 'code', re: /product\s*\(|for\s+\w+\s+in\s+\(\s*0\s*,\s*1\s*\)[\s\S]*for\s+\w+\s+in/ },
        { label: 'Uses all() or equivalent comparison', in: 'code', re: /\ball\s*\(|==/ },
        { label: 'Proves the three simplifications', in: 'output', re: /AB \+ AB' = A:\s*True[\s\S]*\(A\+B\)\(A\+B'\) = A:\s*True[\s\S]*A'B \+ AB = B:\s*True/ },
        { label: 'Shows the wrong one fails', in: 'output', re: /A \+ B = A:\s*False/ },
      ],
      hints: ['Write a helper equal(f, g) that compares f(a, b) and g(a, b) for every a, b in (0, 1).', 'Use bool(...) on both sides so 0/1 and True/False compare correctly.'],
      quiz: [
        { q: 'What is A + A\' always equal to?', options: ['1', '0', 'A', 'A\''], why: 'A variable or its complement is always true.' },
        { q: 'Simplify A + A·B.', options: ['A', 'B', 'A·B', '1'], why: 'Absorption law.' },
        { q: 'In a Karnaugh map, neighbouring cells differ by...', options: ['one variable', 'two variables', 'all variables', 'nothing'], why: 'This lets adjacent 1s be grouped.' },
      ],
      oral: 'Simplify A·B + A·B\' step by step, naming the law used in each step.',
      solution: { python: `from itertools import product

def equal(f, g):
    return all(bool(f(a, b)) == bool(g(a, b)) for a, b in product((0, 1), repeat=2))

print("AB + AB' = A:", equal(lambda a, b: (a and b) or (a and not b), lambda a, b: a))
print("(A+B)(A+B') = A:", equal(lambda a, b: (a or b) and (a or not b), lambda a, b: a))
print("A'B + AB = B:", equal(lambda a, b: ((not a) and b) or (a and b), lambda a, b: b))
print("A + B = A:", equal(lambda a, b: a or b, lambda a, b: a))` },
    },
  ],
};

const M122 = {
  id: 122, order: 22, icon: '📐', color: '#7c3aed', difficulty: 'intermediate',
  title: 'Sets, Matrices and Sequences',
  description: 'Set theory and Venn diagrams, vectors and matrices, and arithmetic and geometric sequences.',
  lessons: [
    {
      title: 'Set Theory', minutes: 50,
      content: `A {{set}} is a well-defined collection of distinct objects (its {{elements}}).

## Representing sets
- {{Statement form}}: "the vowels of English"
- {{Tabular (roster) form}}: {a, e, i, o, u}
- {{Set-builder notation}}: {x | x is an even number less than 10} = {2, 4, 6, 8}

## Kinds of sets
- {{Finite}} / {{infinite}}
- {{Empty}} set ∅ and {{singleton}} set (one element)
- {{Universal set}} U: everything under discussion
- {{Subset}}: A ⊆ B if every element of A is in B; {{proper subset}} A ⊂ B if also A ≠ B
- {{Cardinality}} |A|: the number of elements

## Operations
- {{Union}} A ∪ B: in A or B
- {{Intersection}} A ∩ B: in both
- {{Difference}} A − B: in A but not B
- {{Complement}} A': in U but not in A
- {{Cartesian product}} A × B: all ordered pairs (a, b); |A × B| = |A| × |B|

{{Venn diagrams}} draw sets as overlapping circles inside a rectangle for U.

## In Python
~~~
ict = {"Akinyi", "Baraka", "Chebet", "Daudi"}
maths = {"Chebet", "Daudi", "Esther"}
print(ict | maths)        # union
print(ict & maths)        # intersection
print(ict - maths)        # difference
print(ict <= {"Akinyi", "Baraka", "Chebet", "Daudi", "Fatma"})   # subset
from itertools import product
print(len(list(product(ict, maths))))   # Cartesian product: 12 pairs
~~~
SQL uses the same ideas: UNION, INTERSECT and EXCEPT.`,
      example: { python: `evens = {x for x in range(1, 11) if x % 2 == 0}   # set-builder style
primes = {2, 3, 5, 7}
print("Evens:", sorted(evens))
print("Even primes:", evens & primes)` },
      challenge: 'With U = {1, ..., 10}, A = {1, 2, 3, 4, 5} and B = {4, 5, 6, 7}, print "Union: 7", "Intersection: [4, 5]", "A - B: [1, 2, 3]", "Complement of A: [6, 7, 8, 9, 10]", "A x B pairs: 20" and "{1, 2} proper subset of A: True".',
      checks: [
        { label: 'Uses set operators', in: 'code', re: /\|[\s\S]*&|&[\s\S]*\||\.union\(|\.intersection\(/ },
        { label: 'Builds the Cartesian product', in: 'code', re: /product\s*\(|for\s+\w+\s+in\s+A[\s\S]*for\s+\w+\s+in\s+B/ },
        { label: 'Prints union, intersection and difference', in: 'output', re: /Union:\s*7\b[\s\S]*Intersection:\s*\[4, 5\][\s\S]*A - B:\s*\[1, 2, 3\]/ },
        { label: 'Prints complement, product size and subset test', in: 'output', re: /Complement of A:\s*\[6, 7, 8, 9, 10\][\s\S]*A x B pairs:\s*20\b[\s\S]*proper subset of A:\s*True/ },
      ],
      hints: ['U = set(range(1, 11)); the complement of A is U - A.', 'A proper subset test in Python is {1, 2} < A.'],
      quiz: [
        { q: 'If |A| = 3 and |B| = 4, how many pairs are in A × B?', options: ['12', '7', '1', '64'], why: '|A × B| = |A| × |B|.' },
        { q: 'Which operation gives the elements in both sets?', options: ['Intersection', 'Union', 'Difference', 'Complement'], why: 'A ∩ B keeps the common elements.' },
        { q: 'A set with exactly one element is called...', options: ['a singleton set', 'an empty set', 'a universal set', 'an infinite set'], why: 'Singleton means one element.' },
      ],
      oral: 'Use a Venn diagram to explain union, intersection and complement with students taking ICT and Maths.',
      solution: { python: `from itertools import product
U = set(range(1, 11))
A = {1, 2, 3, 4, 5}
B = {4, 5, 6, 7}
print("Union:", len(A | B))
print("Intersection:", sorted(A & B))
print("A - B:", sorted(A - B))
print("Complement of A:", sorted(U - A))
print("A x B pairs:", len(list(product(A, B))))
print("{1, 2} proper subset of A:", {1, 2} < A)` },
    },
    {
      title: 'Vectors, Matrices and Linear Equations', minutes: 60,
      content: `## Vectors
A {{vector}} has size and direction, written as a list of numbers: v = (3, 4).
- {{Addition}} / {{subtraction}}: add matching parts - (1, 2) + (3, 4) = (4, 6)
- {{Scalar multiplication}}: 2 × (3, 4) = (6, 8)
- {{Dot product}}: (1, 2)·(3, 4) = 1×3 + 2×4 = 11 - used to measure similarity in AI
- Length |v| = √(3² + 4²) = 5

## Matrices
A {{matrix}} is a rectangular grid of numbers (rows × columns).
- Types: {{square}}, {{identity}} I, {{zero}}, {{diagonal}}, {{row}}/{{column}} matrix
- {{Addition}} and {{scalar multiplication}}: element by element
- {{Matrix multiplication}}: row × column (shapes must fit)
- {{Transpose}} Aᵀ: rows become columns
- {{Determinant}} of [[a, b], [c, d]] = ad − bc; if it is 0 the matrix has no inverse
- {{Inverse}} A⁻¹: A × A⁻¹ = I

## Solving linear equations
2x + 3y = 13
x − y = −1
In matrix form A·X = B, so X = A⁻¹·B:
~~~
import numpy as np
A = np.array([[2, 3], [1, -1]])
B = np.array([13, -1])
print(np.linalg.det(A))         # about -5
print(np.linalg.solve(A, B))    # [2. 3.] -> x = 2, y = 3
print(A.T)                      # transpose
print(A @ np.array([2, 3]))     # matrix-vector product: [13 -1]
~~~
Floating-point results can be slightly off (−5.000000000000001), so {{round()}} before printing.

Computers use matrices for graphics (rotating images), machine learning (every neural network layer) and solving systems of equations in engineering.`,
      example: { python: `import numpy as np
v = np.array([3, 4])
w = np.array([1, 2])
print("v + w =", v + w)
print("Dot product:", np.dot(v, w))
print("Length of v:", np.linalg.norm(v))` },
      challenge: 'Solve 2x + 3y = 13 and x − y = −1 with NumPy. Print "det = -5.0" (rounded to 1 place), "x = 2.0, y = 3.0", the transpose as "Transpose: [[2, 1], [3, -1]]" (use .tolist()) and the dot product of (1, 2, 3) and (4, 5, 6) as "Dot: 32".',
      checks: [
        { label: 'Uses numpy.linalg', in: 'code', re: /linalg\.(solve|inv|det)\s*\(/ },
        { label: 'Prints the determinant and solution', in: 'output', re: /det = -5\.0[\s\S]*x = 2\.0, y = 3\.0/ },
        { label: 'Prints the transpose', in: 'output', re: /Transpose:\s*\[\[2, 1\], \[3, -1\]\]/ },
        { label: 'Prints the dot product', in: 'output', re: /Dot:\s*32\b/ },
      ],
      hints: ['x, y = np.linalg.solve(A, B); round(float(x), 1)', 'A.T.tolist() gives a plain Python list.'],
      quiz: [
        { q: 'What is the determinant of [[a, b], [c, d]]?', options: ['ad − bc', 'ab − cd', 'a + d', 'ac − bd'], why: 'Multiply the diagonals and subtract.' },
        { q: 'If a matrix has determinant 0, it...', options: ['has no inverse', 'is the identity', 'is a vector', 'has two solutions'], why: 'A zero determinant means the matrix is singular.' },
        { q: 'What is the dot product of (1, 2) and (3, 4)?', options: ['11', '10', '(3, 8)', '24'], why: '1×3 + 2×4 = 11.' },
      ],
      oral: 'Explain how you would write a system of two linear equations in matrix form and solve it.',
      solution: { python: `import numpy as np
A = np.array([[2, 3], [1, -1]])
B = np.array([13, -1])
print("det =", round(float(np.linalg.det(A)), 1))
x, y = np.linalg.solve(A, B)
print(f"x = {round(float(x), 1)}, y = {round(float(y), 1)}")
print("Transpose:", A.T.tolist())
print("Dot:", int(np.dot([1, 2, 3], [4, 5, 6])))` },
    },
    {
      title: 'Sequences and Series', minutes: 50,
      content: `A {{sequence}} is an ordered list of numbers (terms); a {{series}} is the sum of the terms.

## Arithmetic sequences - add the same difference d
2, 5, 8, 11, ... (a = 2, d = 3)
- nth term: {{aₙ = a + (n − 1)d}}
- Sum of n terms: {{Sₙ = n/2 × (2a + (n − 1)d)}}

Example - a chama savings plan: save 100 in week 1 and 50 more each week.
Week 10: 100 + 9 × 50 = 550. Total after 10 weeks: 10/2 × (200 + 450) = 3250.

## Geometric sequences - multiply by the same ratio r
1000, 1100, 1210, ... (a = 1000, r = 1.1)
- nth term: {{aₙ = a × r^(n − 1)}}
- Sum of n terms: {{Sₙ = a(rⁿ − 1)/(r − 1)}} for r ≠ 1

Example - an investment growing 10% a year: the 5th year's value is 1000 × 1.1⁴ = 1464.1.

## In Python
~~~
a, d, n = 100, 50, 10
terms = [a + (k - 1) * d for k in range(1, n + 1)]
print(terms[-1], sum(terms))          # 550 3250
geo = [1000 * 1.1 ** (k - 1) for k in range(1, 6)]
print(round(geo[-1], 2), round(sum(geo), 2))
~~~

## Other sequences in computing
- {{Fibonacci}}: 1, 1, 2, 3, 5, 8 - each term is the sum of the two before
- Powers of two: 1, 2, 4, 8, 16 - memory sizes and binary place values
- Loops that double or halve (binary search) follow geometric sequences - that is where log n comes from`,
      example: { python: `fib = [1, 1]
while len(fib) < 10:
    fib.append(fib[-1] + fib[-2])
print("Fibonacci:", fib)` },
      challenge: 'A member saves 100 in week 1 and 50 more each week. Print "Week 10 saving: 550" and "Total after 10 weeks: 3250" using the arithmetic formulas. An investment of 1000 grows 10% a year: print "Year 5 value: 1464.1" and "Sum of 5 years: 6105.1" (rounded to 1 place) using the geometric formulas.',
      checks: [
        { label: 'Uses the arithmetic nth-term formula', in: 'code', re: /\(\s*\w+\s*-\s*1\s*\)\s*\*\s*\w+/ },
        { label: 'Uses a power for the geometric sequence', in: 'code', re: /\*\*/ },
        { label: 'Prints the arithmetic results', in: 'output', re: /Week 10 saving:\s*550\b[\s\S]*Total after 10 weeks:\s*3250\b/ },
        { label: 'Prints the geometric results', in: 'output', re: /Year 5 value:\s*1464\.1\b[\s\S]*Sum of 5 years:\s*6105\.1\b/ },
      ],
      hints: ['a + (n - 1) * d and n / 2 * (2 * a + (n - 1) * d)', 'a * r ** (n - 1) and a * (r ** n - 1) / (r - 1)'],
      quiz: [
        { q: 'What is the 6th term of 3, 7, 11, 15, ...?', options: ['23', '27', '19', '21'], why: 'a + 5d = 3 + 20 = 23.' },
        { q: 'In 2, 6, 18, 54, ... what is the common ratio?', options: ['3', '4', '2', '6'], why: 'Each term is 3 times the one before.' },
        { q: 'Which kind of sequence models compound interest?', options: ['Geometric', 'Arithmetic', 'Fibonacci', 'Constant'], why: 'The amount is multiplied by the same factor each year.' },
      ],
      oral: 'Explain the difference between an arithmetic and a geometric sequence using savings examples.',
      solution: { python: `a, d, n = 100, 50, 10
print("Week 10 saving:", a + (n - 1) * d)
print("Total after 10 weeks:", int(n / 2 * (2 * a + (n - 1) * d)))
g, r, m = 1000, 1.1, 5
print("Year 5 value:", round(g * r ** (m - 1), 1))
print("Sum of 5 years:", round(g * (r ** m - 1) / (r - 1), 1))` },
    },
  ],
};

const M123 = {
  id: 123, order: 23, icon: '🕸️', color: '#7c3aed', difficulty: 'advanced',
  title: 'Graphs, Calculus, Probability and Statistics',
  description: 'Graph theory and shortest paths, functions and calculus, probability, and descriptive statistics.',
  lessons: [
    {
      title: 'Graph Theory', minutes: 60,
      content: `A {{graph}} G = (V, E) is a set of {{vertices}} (nodes) joined by {{edges}} (links). Road maps, social networks, the internet and computer networks are all graphs.

## Vocabulary
- {{Undirected}} edges go both ways (roads); {{directed}} edges one way (following someone online)
- {{Weighted}} edges carry a number (distance in km)
- {{Degree}} of a vertex: how many edges touch it (in a directed graph: in-degree and out-degree)
- {{Path}}: a route along edges; {{cycle}}: a path that returns to its start
- {{Connected}} graph: there is a path between every pair of vertices
- {{Tree}}: a connected graph with no cycles

## Representing a graph
{{Adjacency list}} - each vertex lists its neighbours (good for sparse graphs):
~~~
roads = {
    "Mombasa": ["Nairobi"],
    "Nairobi": ["Mombasa", "Nakuru", "Nyeri"],
    "Nakuru": ["Nairobi", "Kisumu", "Eldoret"],
    "Kisumu": ["Nakuru", "Eldoret"],
    "Eldoret": ["Nakuru", "Kisumu"],
    "Nyeri": ["Nairobi"],
}
~~~
{{Adjacency matrix}} - a V × V grid with 1 where an edge exists (good for dense graphs).

## Breadth-first search (BFS)
BFS explores in layers using a {{queue}}, so the first time it reaches a vertex it has used the {{fewest edges}}:
~~~
from collections import deque
def shortest_path(graph, start, goal):
    queue = deque([[start]])
    seen = {start}
    while queue:
        path = queue.popleft()
        if path[-1] == goal:
            return path
        for nxt in graph[path[-1]]:
            if nxt not in seen:
                seen.add(nxt)
                queue.append(path + [nxt])
~~~
For weighted roads (kilometres instead of hops) use {{Dijkstra's algorithm}}.`,
      example: { python: `friends = {"Amina": ["Brian", "Chebet"], "Brian": ["Amina"], "Chebet": ["Amina", "Daudi"], "Daudi": ["Chebet"]}
for person, links in friends.items():
    print(person, "has degree", len(links))` },
      challenge: 'Store the road graph from the lesson as an adjacency list. Print "Degree of Nairobi: 3", "Edges: 6" (each undirected edge counted once) and use BFS to print the route with the fewest hops from Mombasa to Kisumu: "Mombasa -> Nairobi -> Nakuru -> Kisumu" and "Hops: 3".',
      checks: [
        { label: 'Stores an adjacency list', in: 'code', re: /\{\s*["']\w+["']\s*:\s*\[/ },
        { label: 'Uses a queue for BFS', in: 'code', re: /deque\s*\(|\.pop\s*\(\s*0\s*\)/ },
        { label: 'Prints the degree and number of edges', in: 'output', re: /Degree of Nairobi:\s*3\b[\s\S]*Edges:\s*6\b/ },
        { label: 'Prints the shortest route', in: 'output', re: /Mombasa -> Nairobi -> Nakuru -> Kisumu[\s\S]*Hops:\s*3\b/ },
      ],
      hints: ['Edges = sum of all degrees divided by 2 (the handshake lemma).', '" -> ".join(path) prints the route; hops = len(path) - 1.'],
      quiz: [
        { q: 'What is the degree of a vertex?', options: ['The number of edges touching it', 'Its distance from the start', 'Its position in the list', 'The number of vertices'], why: 'Degree counts incident edges.' },
        { q: 'Which search finds the route with the fewest edges?', options: ['Breadth-first search', 'Depth-first search', 'Binary search', 'Linear search'], why: 'BFS explores layer by layer.' },
        { q: 'A connected graph with no cycles is a...', options: ['tree', 'circuit', 'complete graph', 'matrix'], why: 'Trees are connected and acyclic.' },
      ],
      oral: 'Explain how a ride-hailing app could use graphs to find a route between two places.',
      solution: { python: `from collections import deque
roads = {
    "Mombasa": ["Nairobi"],
    "Nairobi": ["Mombasa", "Nakuru", "Nyeri"],
    "Nakuru": ["Nairobi", "Kisumu", "Eldoret"],
    "Kisumu": ["Nakuru", "Eldoret"],
    "Eldoret": ["Nakuru", "Kisumu"],
    "Nyeri": ["Nairobi"],
}

def shortest_path(graph, start, goal):
    queue = deque([[start]])
    seen = {start}
    while queue:
        path = queue.popleft()
        if path[-1] == goal:
            return path
        for nxt in graph[path[-1]]:
            if nxt not in seen:
                seen.add(nxt)
                queue.append(path + [nxt])

print("Degree of Nairobi:", len(roads["Nairobi"]))
print("Edges:", sum(len(v) for v in roads.values()) // 2)
route = shortest_path(roads, "Mombasa", "Kisumu")
print(" -> ".join(route))
print("Hops:", len(route) - 1)` },
    },
    {
      title: 'Functions and Calculus', minutes: 60,
      content: `## Functions
A {{function}} f maps each input x in its {{domain}} to exactly one output f(x) in its {{range}}.
- {{Linear}}: f(x) = mx + c - a straight line with gradient m and y-intercept c
- {{Power}}: f(x) = xⁿ
- {{Intercepts}}: where the graph crosses the axes (x-intercept where f(x) = 0)

## Limits
The {{limit}} of f(x) as x approaches a is the value f(x) gets close to. Calculus is built on limits.

## Differential calculus - rate of change
The {{derivative}} f'(x) is the gradient (rate of change) at x:
f'(x) = limit as h → 0 of (f(x + h) − f(x)) / h
Rules: power rule d/dx xⁿ = n·xⁿ⁻¹; sum rule; chain rule.
A computer can estimate it with a tiny h:
~~~
def derivative(f, x, h=1e-6):
    return (f(x + h) - f(x - h)) / (2 * h)
~~~

## Optimisation
A maximum or minimum occurs where f'(x) = 0. A business with profit P(x) = −2x² + 40x (x = hundreds of items) has P'(x) = −4x + 40 = 0 at x = 10, so the maximum profit is P(10) = 200.

## Integral calculus - area
The {{definite integral}} ∫ f(x) dx from a to b is the area under the curve. The {{trapezium rule}} approximates it by many thin trapezia:
~~~
def integrate(f, a, b, n=1000):
    h = (b - a) / n
    total = (f(a) + f(b)) / 2
    for i in range(1, n):
        total += f(a + i * h)
    return total * h
~~~
∫ x² dx from 0 to 3 = 3³/3 = 9. Exact techniques - integration by parts, the reverse chain rule and u-substitution - give formulas; numerical methods work for any function.`,
      example: { python: `f = lambda x: 3 * x + 2          # a linear function
print("f(4) =", f(4))
print("x-intercept:", round(-2 / 3, 3))
print("gradient:", f(1) - f(0))` },
      challenge: 'For the profit function P(x) = -2x² + 40x, write a numerical derivative and print "P\'(5) = 20.0" (rounded to 1 place). Find the maximum by checking x from 0 to 20 and print "Max profit 200 at x = 10". Write the trapezium rule and print "Area under x^2 from 0 to 3: 9.0" (rounded to 2 places).',
      checks: [
        { label: 'Has a numerical derivative function', in: 'code', re: /def\s+\w*deriv\w*\s*\([\s\S]*\/\s*\(?\s*(2\s*\*\s*)?h/ },
        { label: 'Has a trapezium-rule integral', in: 'code', re: /def\s+\w*integr\w*\s*\(/ },
        { label: 'Prints the derivative and the maximum', in: 'output', re: /P'\(5\) = 20\.0[\s\S]*Max profit 200 at x = 10\b/ },
        { label: 'Prints the area', in: 'output', re: /Area under x\^2 from 0 to 3:\s*9\.0\b/ },
      ],
      hints: ['(f(x + h) - f(x - h)) / (2 * h) with h = 1e-6', 'max(range(21), key=P) gives the x with the biggest profit.'],
      quiz: [
        { q: 'What does the derivative of a function measure?', options: ['Its rate of change (gradient)', 'The area under it', 'Its largest value', 'Its domain'], why: 'f\'(x) is the instantaneous rate of change.' },
        { q: 'Using the power rule, what is the derivative of x³?', options: ['3x²', 'x²', '3x³', 'x⁴/4'], why: 'd/dx xⁿ = n·xⁿ⁻¹.' },
        { q: 'What does a definite integral represent?', options: ['The area under a curve between two points', 'The slope at a point', 'Where the graph crosses zero', 'The number of turning points'], why: 'Integration accumulates area.' },
      ],
      oral: 'Explain how a business could use derivatives to find the production level that gives maximum profit.',
      solution: { python: `P = lambda x: -2 * x ** 2 + 40 * x

def derivative(f, x, h=1e-6):
    return (f(x + h) - f(x - h)) / (2 * h)

def integrate(f, a, b, n=1000):
    h = (b - a) / n
    total = (f(a) + f(b)) / 2
    for i in range(1, n):
        total += f(a + i * h)
    return total * h

print("P'(5) =", round(derivative(P, 5), 1))
best = max(range(21), key=P)
print(f"Max profit {P(best)} at x = {best}")
print("Area under x^2 from 0 to 3:", round(integrate(lambda x: x ** 2, 0, 3), 2))` },
    },
    {
      title: 'Probability', minutes: 55,
      content: `{{Probability}} measures how likely an event is, from 0 (impossible) to 1 (certain).

## Key terms
- {{Experiment}}: an action with uncertain results (rolling a die)
- {{Outcome}}: one result (a 4)
- {{Sample space}} S: all outcomes {1, 2, 3, 4, 5, 6}
- {{Event}}: a set of outcomes ("an even number" = {2, 4, 6})
- For equally likely outcomes: {{P(E) = |E| / |S|}}

## Axioms of probability
- 0 ≤ P(E) ≤ 1
- P(S) = 1
- For events that cannot happen together: P(A or B) = P(A) + P(B)
- {{Complement}}: P(not A) = 1 − P(A)

## Counting
- {{Permutations}} (order matters): ⁿPᵣ = n! / (n − r)! - ways to choose a chairperson and secretary from 5 people: ⁵P₂ = 20
- {{Combinations}} (order does not matter): ⁿCᵣ = n! / (r!(n − r)!) - ways to choose a committee of 3 from 10: ¹⁰C₃ = 120
~~~
import math
print(math.perm(5, 2), math.comb(10, 3))   # 20 120
~~~

## Conditional probability
{{P(A | B) = P(A and B) / P(B)}} - the probability of A given that B happened.
A shop gets 60% of its phones from supplier X and 40% from Y; 2% of X's and 5% of Y's are faulty. P(faulty) = 0.6 × 0.02 + 0.4 × 0.05 = 0.032. Given a phone is faulty, P(from Y | faulty) = 0.02 / 0.032 = 0.625 - this is {{Bayes' theorem}}, used in the Naive Bayes classifier.

## Simulation
When the maths is hard, simulate: {{random.randint(1, 6)}} thousands of times and count.`,
      example: { python: `from itertools import product
outcomes = list(product(range(1, 7), repeat=2))
doubles = [o for o in outcomes if o[0] == o[1]]
print("P(double) =", len(doubles), "/", len(outcomes))` },
      challenge: 'Print "Committees of 3 from 10: 120" and "Chair and secretary from 5: 20" with math.comb and math.perm. Using the sample space of two dice, print "P(sum is 7) = 0.17" (2 places). For the faulty-phone example print "P(faulty) = 0.032" and "P(Y | faulty) = 0.625".',
      checks: [
        { label: 'Uses math.comb and math.perm', in: 'code', re: /math\.comb\s*\([\s\S]*math\.perm\s*\(|math\.perm\s*\([\s\S]*math\.comb\s*\(/ },
        { label: 'Builds the two-dice sample space', in: 'code', re: /product\s*\(\s*range\s*\(\s*1\s*,\s*7\s*\)|for\s+\w+\s+in\s+range\s*\(\s*1\s*,\s*7\s*\)[\s\S]*for\s+\w+\s+in\s+range\s*\(\s*1\s*,\s*7\s*\)/ },
        { label: 'Prints the counts and the dice probability', in: 'output', re: /Committees of 3 from 10:\s*120[\s\S]*Chair and secretary from 5:\s*20[\s\S]*P\(sum is 7\) = 0\.17/ },
        { label: 'Prints the conditional probability', in: 'output', re: /P\(faulty\) = 0\.032[\s\S]*P\(Y \| faulty\) = 0\.625/ },
      ],
      hints: ['sevens = [o for o in outcomes if sum(o) == 7]', 'P(Y | faulty) = (0.4 * 0.05) / P(faulty)'],
      quiz: [
        { q: 'How many ways can a committee of 2 be chosen from 4 people?', options: ['6', '12', '8', '4'], why: '⁴C₂ = 6 (order does not matter).' },
        { q: 'If P(rain) = 0.3, what is P(no rain)?', options: ['0.7', '0.3', '1.3', '0'], why: 'Complement rule: 1 − 0.3.' },
        { q: 'When does order matter?', options: ['Permutations', 'Combinations', 'Both', 'Neither'], why: 'Permutations count arrangements.' },
      ],
      oral: 'Explain the difference between permutations and combinations with an example from a chama election.',
      solution: { python: `import math
from itertools import product
print("Committees of 3 from 10:", math.comb(10, 3))
print("Chair and secretary from 5:", math.perm(5, 2))
outcomes = list(product(range(1, 7), repeat=2))
sevens = [o for o in outcomes if sum(o) == 7]
print(f"P(sum is 7) = {len(sevens) / len(outcomes):.2f}")
p_faulty = 0.6 * 0.02 + 0.4 * 0.05
print(f"P(faulty) = {p_faulty:.3f}")
print(f"P(Y | faulty) = {0.4 * 0.05 / p_faulty:.3f}")` },
    },
    {
      title: 'Descriptive Statistics', minutes: 50,
      content: `{{Statistics}} summarises data so we can understand it and make decisions.

## Measures of central tendency
- {{Mean}}: the sum divided by the count
- {{Median}}: the middle value when sorted (the average of the two middle values for an even count) - not pulled by extreme values
- {{Mode}}: the most frequent value

## Measures of spread
- {{Range}}: largest − smallest
- {{Variance}}: the average squared distance from the mean
- {{Standard deviation}}: the square root of the variance, in the data's own units
Use the {{population}} formulas (divide by n) for a whole population and the {{sample}} formulas (divide by n − 1) for a sample.

## Python's statistics module
~~~
import statistics as st
rain = [12, 0, 33, 8, 0, 21, 5]
print(st.mean(rain), st.median(rain), st.mode(rain))
print(max(rain) - min(rain))            # range
print(round(st.pstdev(rain), 2))        # population standard deviation
print(round(st.stdev(rain), 2))         # sample standard deviation
~~~

## Reading results
- Mean much bigger than median → a few very large values (salaries, land prices)
- Small standard deviation → values close together (consistent production)
- Always ask: how was the sample collected, and is it big enough?

These measures feed straight into data analysis with pandas and into machine learning (scaling features, spotting outliers).`,
      example: { python: `import statistics as st
salaries = [25000, 27000, 26000, 28000, 250000]
print("Mean:", st.mean(salaries))
print("Median:", st.median(salaries))
print("The one very high salary pulls the mean up.")` },
      challenge: 'For the exam scores [56, 72, 72, 85, 64, 90, 72, 49, 81, 59] print "Mean: 70", "Median: 72.0", "Mode: 72", "Range: 41" and the population standard deviation as "Std dev: 12.46" (2 places).',
      checks: [
        { label: 'Uses the statistics module or computes the measures', in: 'code', re: /import\s+statistics|statistics\.|sum\s*\([\s\S]*len\s*\(/ },
        { label: 'Prints mean, median and mode', in: 'output', re: /Mean:\s*70\b[\s\S]*Median:\s*72\.0\b[\s\S]*Mode:\s*72\b/ },
        { label: 'Prints the range', in: 'output', re: /Range:\s*41\b/ },
        { label: 'Prints the standard deviation', in: 'output', re: /Std dev:\s*12\.46\b/ },
      ],
      hints: ['statistics.pstdev(scores) is the population standard deviation.', 'statistics.median returns 72.0 here because the count is even.'],
      quiz: [
        { q: 'Which average is least affected by one extreme value?', options: ['Median', 'Mean', 'Range', 'Variance'], why: 'The median depends only on the middle values.' },
        { q: 'What does a small standard deviation tell you?', options: ['The values are close to the mean', 'The mean is small', 'There are few values', 'The data is wrong'], why: 'Standard deviation measures spread.' },
        { q: 'What is the mode of 3, 5, 5, 8, 9?', options: ['5', '6', '8', '3'], why: '5 appears most often.' },
      ],
      oral: 'Explain why a news report about "average income" might use the median instead of the mean.',
      solution: { python: `import statistics as st
scores = [56, 72, 72, 85, 64, 90, 72, 49, 81, 59]
print("Mean:", st.mean(scores))
print("Median:", st.median(scores))
print("Mode:", st.mode(scores))
print("Range:", max(scores) - min(scores))
print(f"Std dev: {st.pstdev(scores):.2f}")` },
    },
  ],
};

module.exports = { M121, M122, M123 };
