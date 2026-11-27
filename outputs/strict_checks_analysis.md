# Lesson Practice Checks — Overly Strict Analysis

Organized by file/language. For each entry: Lesson title | Check label | Current regex | Why too strict | Suggested flexible regex.

---

## java.js (Java)

1. **Lesson:** Loops: for, while, do-while, break and continue — **Label:** Prints the full 7 times table
   - **Current:** `/7\s*[x\*]\s*1\s*=?\s*7[\s\S]*7\s*[x\*]\s*5\s*=?\s*35[\s\S]*7\s*[x\*]\s*10\s*=?\s*70/i`
   - **Why:** Requires exact "7 x 1 = 7 ... 7 x 5 = 35 ... 7 x 10 = 70" wording/order. A learner using "7 * 1 = 7" or printing via a loop with different spacing fails.
   - **Suggested:** `/7\s*[x\*]\s*1\b[\s\S]*7\s*[x\*]\s*10\b[\s\S]*70\b/i` (test that the table starts at 1 and reaches 10 with the 70 result)

2. **Lesson:** Arrays and Enums — **Label:** Prints the number of days and the enum count
   - **Current:** `/(?:Days?|Number)[\s:=]*5[\s\S]*(?:week|Day\.values)/i`
   - **Why:** Requires the literal "week" or "Day.values" to appear after "5"; a learner printing "Days: 5" and "Days in a week: 7" on separate lines (solution style) can fail depending on ordering.
   - **Suggested:** `/Days?\s*[:=]?\s*5\b[\s\S]*7\b/` (test the two counts exist)

3. **Lesson:** Data Types, Variables and Constants — **Label:** Prints the total with VAT (6960.00)
   - **Current:** `/Total with VAT:\s*696[0-9](?:\.\d+)?/`
   - **Why:** Matches 6960–6969 with optional decimals; too loose on the integer part but still rejects a learner who prints "6960" without decimals or "6960.0".
   - **Suggested:** `/Total with VAT:\s*6960(?:\.\d+)?/i`

4. **Lesson:** Operators and Formulas — **Label:** Prints the amount 14049.28
   - **Current:** `/Amount\s*[\s:=]*140[0-9]{2}(?:\.\d+)?/i`
   - **Why:** Anchors to "140xx" with optional decimals; accepts 14000–14099 and rejects "14049.28" formatting variations like "14049.3".
   - **Suggested:** `/Amount\s*[\s:=]*14049(?:\.\d+)?/i`

5. **Lesson:** Classes and Objects — **Label:** Prints both matatus
   - **Current:** `/(?:Town|Rongai)[\s\-\w]*14[\s\w]*[\s\S]*(?:Thika|Juja)[\s\-\w]*33[\s\w]*/i`
   - **Why:** Requires the seat counts 14 and 33 to appear in a fixed relative order and adjacent to specific town names; valid output like "Rongai matatu with 14 seats" on its own line can fail.
   - **Suggested:** `/14[\s\S]*33|33[\s\S]*14/` plus a separate concept check for both numbers

6. **Lesson:** Encapsulation — **Label:** Prints the correct balance
   - **Current:** `/Balance\s*[\s:=]*3500(?:\.\d+)?/i`
   - **Why:** Accepts 3500.0 but also 3500.999; should accept any reasonable precision of 3500.
   - **Suggested:** `/Balance\s*[\s:=]*3500(?:\.\d{1,2})?/i`

7. **Lesson:** Abstraction and Polymorphism — **Label:** Prints both areas
   - **Current:** `/(?:Circle|circle)[\s:]*15[0-9](?:\.\d+)?[\s\S]*(?:Rectangle|rectangle)[\s:]*20(?:\.\d+)?/i`
   - **Why:** Requires Circle then Rectangle order and "15x"/"20" adjacent; rejects a learner who prints "Rectangle: 20.00" then "Circle: 153.94".
   - **Suggested:** `/153\.94[\s\S]*20\.00|20\.00[\s\S]*153\.94/` (test both values exist)

---

## python.js (Python)

1. **Lesson:** Control Structures in Python — **Label:** Prints the right words
   - **Current:** `/^1\n2\nHara\n4\nMbee\nHara\n7\n8\nHara\nMbee\n11\nHara\n13\n14\nHarambee$/m`
   - **Why:** Exact full-output match including line breaks and order; any trailing space, extra blank line, or alternate print of "Harambee" fails.
   - **Suggested:** Test that each multiple of 3 prints "Hara", each multiple of 5 prints "Mbee", and 15 prints "Harambee" (e.g. check the set of output lines contains the expected tokens)

2. **Lesson:** Functions: Built-in, User-defined and Lambda — **Label:** Prints the sorted names with grades
   - **Current:** `/Akinyi Pass\s*\nOmar Pass\s*\nKamau Fail/`
   - **Why:** Requires exact newline-separated order; a learner printing "Akinyi: Pass" or with extra spaces fails.
   - **Suggested:** `/Akinyi\s+Pass[\s\S]*Omar\s+Pass[\s\S]*Kamau\s+Fail/i`

3. **Lesson:** Object-Oriented and Scientific Python — **Label:** Prints the new balance
   - **Current:** `/Njeri:\s*11000\.0\b/`
   - **Why:** Exact float "11000.0"; rejects "11000", "11000.00", or "11000.0000001".
   - **Suggested:** `/Njeri:\s*11000(?:\.\d+)?/`

4. **Lesson:** NumPy — **Label:** Prints the total, mean and standard deviation
   - **Current:** `/Total:\s*7350[\s\S]*Mean:\s*1470\.0[\s\S]*Std:\s*419\.05/`
   - **Why:** Exact floats 1470.0 and 419.05; precision/format variations fail.
   - **Suggested:** `/Total:\s*7350\b[\s\S]*Mean:\s*1470(?:\.\d+)?[\s\S]*Std:\s*419\.05(?:\d)?/`

5. **Lesson:** NumPy — **Label:** Prints the days above the mean
   - **Current:** `/Above mean:\s*\[1800\s+2100\]/`
   - **Why:** Requires exact NumPy array repr with single spaces; a learner printing "Above mean: [1800 2100]" with different spacing or a list fails.
   - **Suggested:** `/Above mean:[\s\S]*1800[\s\S]*2100/`

6. **Lesson:** pandas — **Label:** Prints the average, top student and pass count
   - **Current:** `/Average:\s*75\.2[\s\S]*Top:\s*\w+[\s\S]*Passed:\s*3\b/`
   - **Why:** Exact float 75.2; rejects 75.20 or 75.1999999.
   - **Suggested:** `/Average:\s*75\.2(?:0)?[\s\S]*Top:\s*\w+[\s\S]*Passed:\s*3\b/`

7. **Lesson:** Matplotlib — **Label:** Prints the title and number of bars
   - **Current:** `/Title:\s*Sales by region[\s\S]*Bars:\s*3\b/`
   - **Why:** Requires exact title string "Sales by region" verbatim; a learner whose title differs slightly in casing/punctuation fails.
   - **Suggested:** `/Title:[\s\S]*Sales[\s\S]*by[\s\S]*region[\s\S]*Bars:\s*3\b/i`

8. **Lesson:** Logic, Inference and Reasoning — **Label:** Prints the first and last rows correctly
   - **Current:** `/True True True -> True[\s\S]*False False False -> True/`
   - **Why:** Exact formatting "True True True -> True"; spacing/casing variations fail.
   - **Suggested:** `/True\s+True\s+True\s*->\s*True[\s\S]*False\s+False\s+False\s*->\s*True/i`

9. **Lesson:** Machine Learning with K-Nearest Neighbours — **Label:** Classifies both new fruits
   - **Current:** `/\(160, 8\) -> mango[\s\S]*\(105, 3\) -> lemon/`
   - **Why:** Exact tuple formatting "(160, 8) -> mango"; a learner printing "160,8 -> mango" fails.
   - **Suggested:** `/160[\s\S]*8[\s\S]*mango[\s\S]*105[\s\S]*3[\s\S]*lemon/i`

10. **Lesson:** Machine Learning with Naive Bayes — **Label:** Prints both scores
    - **Current:** `/leave score:\s*0\.33[\s\S]*stay score:\s*0\.08/`
    - **Why:** Exact floats 0.33 and 0.08; precision/format variations fail.
    - **Suggested:** `/leave score:\s*0\.33(?:\d)?[\s\S]*stay score:\s*0\.08(?:\d)?/i`

---

## javascript.js (js.js)

1. **Lesson:** Changing the Page with the DOM — **Label:** HTML: a <button> with an id
   - **Current:** `/<button[^>]*id\s*=\s*["'][^"']+["']/i`
   - **Why:** Requires id attribute to be present directly; a learner using `id='btn'` with single quotes is fine, but the check is fine-grained. (Borderline — listed for consistency.)

2. **Lesson:** Arrays — **Label:** An array of at least 5 strings
   - **Current:** `/\[\s*(["'][^"']*["']\s*,\s*){4,}["'][^"']*["']/`
   - **Why:** Requires comma-separated quoted strings in a single literal; a learner building the array across multiple lines or with template strings fails.
   - **Suggested:** `/\[[\s\S]*["'][^"']*["'][\s\S]*\]/` (test that an array literal with strings exists)

3. **Lesson:** Objects and JSON — **Label:** Dot notation access
   - **Current:** `/\b[a-zA-Z_$][\w$]*\.(?!log|stringify|parse)[a-zA-Z_$][\w$]*\b/`
   - **Why:** Negative lookahead excludes common methods; a learner using `student.name` passes but `obj.greet()` (a method call) is excluded, failing valid code that accesses via method.
   - **Suggested:** `/\b\w+\.\w+\b/` (any dot access)

---

## maths.js (Mathematics)

1. **Lesson:** Boolean Algebra and Logic Gates — **Label:** Prints the NAND/XOR truth table
   - **Current:** `/A B \| NAND XOR\n0 0 \| 1 0\n0 1 \| 1 1\n1 0 \| 1 1\n1 1 \| 0 0/`
   - **Why:** Exact full-table string match including spacing; any formatting variation fails.
   - **Suggested:** Check that all four rows' NAND/XOR results appear (e.g. `/1 0[\s\S]*1 1[\s\S]*1 1[\s\S]*0 0/`)

2. **Lesson:** Simplifying Boolean Expressions — **Label:** Proves the three simplifications
   - **Current:** `/AB \+ AB' = A:\s*True[\s\S]*\(A\+B\)\(A\+B'\) = A:\s*True[\s\S]*A'B \+ AB = B:\s*True/`
   - **Why:** Requires exact label strings with apostrophes; a learner printing "AB + AB' = A: True" with different spacing fails.
   - **Suggested:** `/AB.*AB'.*A.*True/i` plus separate checks

3. **Lesson:** Set Theory — **Label:** Prints union, intersection and difference
   - **Current:** `/Union:\s*7\b[\s\S]*Intersection:\s*\[4, 5\][\s\S]*A - B:\s*\[1, 2, 3\]/`
   - **Why:** Exact array repr `[4, 5]` and `[1, 2, 3]`; ordering/spacing variations fail.
   - **Suggested:** `/Union:\s*7[\s\S]*Intersection:[\s\S]*4[\s\S]*5[\s\S]*A - B:[\s\S]*1[\s\S]*2[\s\S]*3/`

4. **Lesson:** Vectors, Matrices and Linear Equations — **Label:** Prints the transpose
   - **Current:** `/Transpose:\s*\[\[2, 1\], \[3, -1\]\]/`
   - **Why:** Exact nested-list repr; `.tolist()` spacing or tuple variants fail.
   - **Suggested:** `/Transpose:[\s\S]*2[\s\S]*1[\s\S]*3[\s\S]*-1/`

5. **Lesson:** Graph Theory — **Label:** Prints the shortest route
   - **Current:** `/Mombasa -> Nairobi -> Nakuru -> Kisumu[\s\S]*Hops:\s*3\b/`
   - **Why:** Requires exact arrow-separated path string; a learner printing the path as a list fails.
   - **Suggested:** `/Mombasa[\s\S]*Nairobi[\s\S]*Nakuru[\s\S]*Kisumu[\s\S]*Hops:\s*3/`

6. **Lesson:** Functions and Calculus — **Label:** Prints the derivative and the maximum
   - **Current:** `/P'\(5\) = 20\.0[\s\S]*Max profit 200 at x = 10\b/`
   - **Why:** Exact floats 20.0; precision variations fail.
   - **Suggested:** `/P'\(5\)\s*=\s*20(?:\.\d+)?[\s\S]*Max profit 200 at x = 10\b/`

7. **Lesson:** Probability — **Label:** Prints the counts and the dice probability
   - **Current:** `/Committees of 3 from 10:\s*120[\s\S]*Chair and secretary from 5:\s*20[\s\S]*P\(sum is 7\) = 0\.17/`
   - **Why:** Exact float 0.17; rejects 0.1667 or "0.166666...".
   - **Suggested:** `/Committees of 3 from 10:\s*120[\s\S]*Chair and secretary from 5:\s*20[\s\S]*P\(sum is 7\)\s*=\s*0\.1[67]/`

8. **Lesson:** Descriptive Statistics — **Label:** Prints the standard deviation
   - **Current:** `/Std dev:\s*12\.46\b/`
   - **Why:** Exact float 12.46; rejects 12.459... or 12.5.
   - **Suggested:** `/Std dev:\s*12\.4[56]/`

---

## algorithms.js (Algorithms & Data Structures)

1. **Lesson:** Greedy Algorithms: Counting Coins — **Label:** Prints the denominations used
   - **Current:** `/1000 x 1\s*\n200 x 1\s*\n50 x 1\s*\n20 x 1\s*\n10 x 1\s*\n5 x 1\s*\n1 x 2/`
   - **Why:** Exact newline-separated denomination lines; ordering/format variations fail.
   - **Suggested:** Check that each of 1000, 200, 50, 20, 10, 5, 1 appears with a count and the total is 8.

2. **Lesson:** Singly Linked Lists — **Label:** Prints the list and the reversed list
   - **Current:** `/List:\s*10 -> 20 -> 30\s*\nReversed:\s*30 -> 20 -> 10/`
   - **Why:** Exact arrow-format lines; spacing variations fail.
   - **Suggested:** `/List:[\s\S]*10[\s\S]*20[\s\S]*30[\s\S]*Reversed:[\s\S]*30[\s\S]*20[\s\S]*10/`

3. **Lesson:** Doubly and Circular Linked Lists — **Label:** Walks forwards and backwards
   - **Current:** `/Forward:\s*A B C\s*\nBackward:\s*C B A/`
   - **Why:** Exact space-separated line format.
   - **Suggested:** `/Forward:[\s\S]*A[\s\S]*B[\s\S]*C[\s\S]*Backward:[\s\S]*C[\s\S]*B[\s\S]*A/`

4. **Lesson:** Stacks — **Label:** Accepts the balanced string
   - **Current:** `/\{\[\(\)\]\} balanced: true/`
   - **Why:** Requires the literal "{[()]}" with no spaces; a learner formatting differently fails.
   - **Suggested:** `/\{\s*\[\s*\(\s*\)\s*\]\s*\}\s*balanced:\s*true/i`

5. **Lesson:** Queues — **Label:** Shows the queue and that it is full
   - **Current:** `/Queue:\s*B C D[\s\S]*Full:\s*true/`
   - **Why:** Exact "B C D" spacing; comma or bracketed variants fail.
   - **Suggested:** `/Queue:[\s\S]*B[\s\S]*C[\s\S]*D[\s\S]*Full:\s*true/i`

6. **Lesson:** Bubble Sort — **Label:** Sorts the array and counts swaps
   - **Current:** `/Sorted:\s*\[10, 13, 14, 29, 37\][\s\S]*Swaps:\s*5\b/`
   - **Why:** Exact array repr with spaces after commas; a learner printing "[10,13,14,29,37]" fails.
   - **Suggested:** `/Sorted:[\s\S]*10[\s\S]*13[\s\S]*14[\s\S]*29[\s\S]*37[\s\S]*Swaps:\s*5/`

7. **Lesson:** Selection Sort and Insertion Sort — **Label:** Both sorts give the right order
   - **Current:** `/Selection:\s*\[11, 12, 22, 25, 64\]\s*\nInsertion:\s*\[11, 12, 22, 25, 64\]/`
   - **Why:** Exact array repr on two lines; spacing/ordering variations fail.
   - **Suggested:** `/Selection:[\s\S]*11[\s\S]*12[\s\S]*22[\s\S]*25[\s\S]*64[\s\S]*Insertion:[\s\S]*11[\s\S]*12[\s\S]*22[\s\S]*25[\s\S]*64/`

---

## html.js / css.js

Most checks here are structural (tag presence, attribute presence) and are appropriately concept-focused. A few exact-string ones worth noting:

1. **html.js — Lesson:** HTML Document Structure — **Label:** `<title>My Portfolio</title>`
   - **Current:** `/<title>\s*My Portfolio\s*<\/title>/i`
   - **Why:** Requires the exact title "My Portfolio"; a learner using a different but valid title fails. The concept (a title exists) is what matters.
   - **Suggested:** `/<title>\s*\S[\s\S]*<\/title>/i`

2. **css.js — Lesson:** Colours, Fonts and Text — **Label:** h1 has a hexadecimal colour
   - **Current:** `/h1\s*\{[^}]*\bcolor\s*:\s*#[0-9a-f]{3,8}\b/i`
   - **Why:** Only accepts hex; a learner using `color: navy;` or `rgb(...)` for h1 fails despite a valid colour.
   - **Suggested:** `/h1\s*\{[^}]*\bcolor\s*:\s*(#[0-9a-f]{3,8}|[a-z]+|rgb[a]?\([^)]*\))/i`

3. **css.js — Lesson:** Layout with Flexbox — **Label:** justify-content: space-between
   - **Current:** `/justify-content\s*:\s*space-between/i`
   - **Why:** Requires the exact value "space-between"; a learner using "center" or "space-around" (still valid flexbox) fails.
   - **Suggested:** `/justify-content\s*:\s*(space-between|center|space-around|space-evenly|flex-start|flex-end)/i`

---

## Summary

The most common failure modes across all courses:
- **Exact newline/spacing requirements** (e.g. `\n` between output lines) — should use `[\s\S]*` between tokens.
- **Exact float formatting** (e.g. `75.2`, `1470.0`, `12.46`) — should accept `75.2`, `75.20`, `75.1999999`.
- **Exact array/list repr** (e.g. `[4, 5]`, `[10, 13, 14, 29, 37]`) — should accept spacing variations.
- **Exact arrow/separator strings** (e.g. `->`, `x`) — should accept `*`, `×`, or whitespace variants.
- **Order-dependent token checks** — should verify presence of all expected values, not a fixed sequence, where order is not part of the concept.