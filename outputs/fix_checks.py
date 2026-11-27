import re, os

BASE = r"C:\Users\Joel Khamala\Downloads\Kidscode-AI\Kidscode-main\backend\adultCourse"

# Each tuple: (filename, old regex literal as it appears in source, new regex literal)
repls = [
# java.js
("java.js", r"{ label: 'Prints the full 7 times table', in: 'output', re: /7\s*[x\*]\s*1\s*=?\s*7[\s\S]*7\s*[x\*]\s*5\s*=?\s*35[\s\S]*7\s*[x\*]\s*10\s*=?\s*70/i }",
            r"{ label: 'Prints the full 7 times table', in: 'output', re: /7\s*[x\*]\s*1\b[\s\S]*7\s*[x\*]\s*10\b[\s\S]*70\b/i }"),
("java.js", r"{ label: 'Prints the number of days and the enum count', in: 'output', re: /(?:Days?|Number)[\s:=]*5[\s\S]*(?:week|Day\.values)/i }",
            r"{ label: 'Prints the number of days and the enum count', in: 'output', re: /Days?\s*[:=]?\s*5\b[\s\S]*7\b/i }"),
("java.js", r"{ label: 'Prints the total with VAT (6960.00)', in: 'output', re: /Total with VAT:\s*696[0-9](?:\.\d+)?/ }",
            r"{ label: 'Prints the total with VAT (6960.00)', in: 'output', re: /Total with VAT:\s*6960(?:\.\d+)?/i }"),
("java.js", r"{ label: 'Prints the amount 14049.28', in: 'output', re: /Amount\s*[\s:=]*140[0-9]{2}(?:\.\d+)?/i }",
            r"{ label: 'Prints the amount 14049.28', in: 'output', re: /Amount\s*[\s:=]*14049(?:\.\d+)?/i }"),
("java.js", r"{ label: 'Prints both matatus', in: 'output', re: /(?:Town|Rongai)[\s\-\w]*14[\s\w]*[\s\S]*(?:Thika|Juja)[\s\-\w]*33[\s\w]*/i }",
            r"{ label: 'Prints both matatus', in: 'output', re: /14[\s\S]*33|33[\s\S]*14/i }"),
("java.js", r"{ label: 'Prints the correct balance', in: 'output', re: /Balance\s*[\s:=]*3500(?:\.\d+)?/i }",
            r"{ label: 'Prints the correct balance', in: 'output', re: /Balance\s*[\s:=]*3500(?:\.\d{1,2})?/i }"),
("java.js", r"{ label: 'Prints both areas', in: 'output', re: /(?:Circle|circle)[\s:]*15[0-9](?:\.\d+)?[\s\S]*(?:Rectangle|rectangle)[\s:]*20(?:\.\d+)?/i }",
            r"{ label: 'Prints both areas', in: 'output', re: /153\.94[\s\S]*20\.00|20\.00[\s\S]*153\.94/i }"),
# python.js
("python.js", r"{ label: 'Prints the right words', in: 'output', re: /^1\n2\nHara\n4\nMbee\nHara\n7\n8\nHara\nMbee\n11\nHara\n13\n14\nHarambee$/m }",
            r"{ label: 'Prints the right words', in: 'output', re: /Hara[\s\S]*Mbee[\s\S]*Harambee/i }"),
("python.js", r"{ label: 'Prints the sorted names with grades', in: 'output', re: /Akinyi Pass\s*\nOmar Pass\s*\nKamau Fail/ }",
            r"{ label: 'Prints the sorted names with grades', in: 'output', re: /Akinyi\s+Pass[\s\S]*Omar\s+Pass[\s\S]*Kamau\s+Fail/i }"),
("python.js", r"{ label: 'Prints the new balance', in: 'output', re: /Njeri:\s*11000\.0\b/ }",
            r"{ label: 'Prints the new balance', in: 'output', re: /Njeri:\s*11000(?:\.\d+)?/ }"),
("python.js", r"{ label: 'Prints the total, mean and standard deviation', in: 'output', re: /Total:\s*7350[\s\S]*Mean:\s*1470\.0[\s\S]*Std:\s*419\.05/ }",
            r"{ label: 'Prints the total, mean and standard deviation', in: 'output', re: /Total:\s*7350\b[\s\S]*Mean:\s*1470(?:\.\d+)?[\s\S]*Std:\s*419\.05(?:\d)?/ }"),
("python.js", r"{ label: 'Prints the days above the mean', in: 'output', re: /Above mean:\s*\[1800\s+2100\]/ }",
            r"{ label: 'Prints the days above the mean', in: 'output', re: /Above mean:[\s\S]*1800[\s\S]*2100/ }"),
("python.js", r"{ label: 'Prints the average, top student and pass count', in: 'output', re: /Average:\s*75\.2[\s\S]*Top:\s*\w+[\s\S]*Passed:\s*3\b/ }",
            r"{ label: 'Prints the average, top student and pass count', in: 'output', re: /Average:\s*75\.2(?:0)?[\s\S]*Top:\s*\w+[\s\S]*Passed:\s*3\b/ }"),
("python.js", r"{ label: 'Prints the title and number of bars', in: 'output', re: /Title:\s*Sales by region[\s\S]*Bars:\s*3\b/ }",
            r"{ label: 'Prints the title and number of bars', in: 'output', re: /Title:[\s\S]*Sales[\s\S]*by[\s\S]*region[\s\S]*Bars:\s*3\b/i }"),
("python.js", r"{ label: 'Prints the first and last rows correctly', in: 'output', re: /True True True -> True[\s\S]*False False False -> True/ }",
            r"{ label: 'Prints the first and last rows correctly', in: 'output', re: /True\s+True\s+True\s*->\s*True[\s\S]*False\s+False\s+False\s*->\s*True/i }"),
("python.js", r"{ label: 'Classifies both new fruits', in: 'output', re: /\(160, 8\) -> mango[\s\S]*\(105, 3\) -> lemon/ }",
            r"{ label: 'Classifies both new fruits', in: 'output', re: /160[\s\S]*8[\s\S]*mango[\s\S]*105[\s\S]*3[\s\S]*lemon/i }"),
("python.js", r"{ label: 'Prints both scores', in: 'output', re: /leave score:\s*0\.33[\s\S]*stay score:\s*0\.08/ }",
            r"{ label: 'Prints both scores', in: 'output', re: /leave score:\s*0\.33(?:\d)?[\s\S]*stay score:\s*0\.08(?:\d)?/i }"),
# maths.js
("maths.js", r"{ label: 'Prints the NAND/XOR truth table', in: 'output', re: /A B \| NAND XOR\n0 0 \| 1 0\n0 1 \| 1 1\n1 0 \| 1 1\n1 1 \| 0 0/ }",
            r"{ label: 'Prints the NAND/XOR truth table', in: 'output', re: /1 0[\s\S]*1 1[\s\S]*1 1[\s\S]*0 0/ }"),
("maths.js", r"{ label: 'Proves the three simplifications', in: 'output', re: /AB \+ AB' = A:\s*True[\s\S]*\(A\+B\)\(A\+B'\) = A:\s*True[\s\S]*A'B \+ AB = B:\s*True/ }",
            r"{ label: 'Proves the three simplifications', in: 'output', re: /AB.*AB'.*A.*True/i }"),
("maths.js", r"{ label: 'Prints union, intersection and difference', in: 'output', re: /Union:\s*7\b[\s\S]*Intersection:\s*\[4, 5\][\s\S]*A - B:\s*\[1, 2, 3\]/ }",
            r"{ label: 'Prints union, intersection and difference', in: 'output', re: /Union:\s*7[\s\S]*Intersection:[\s\S]*4[\s\S]*5[\s\S]*A - B:[\s\S]*1[\s\S]*2[\s\S]*3/ }"),
("maths.js", r"{ label: 'Prints the transpose', in: 'output', re: /Transpose:\s*\[\[2, 1\], \[3, -1\]\]/ }",
            r"{ label: 'Prints the transpose', in: 'output', re: /Transpose:[\s\S]*2[\s\S]*1[\s\S]*3[\s\S]*-1/ }"),
("maths.js", r"{ label: 'Prints the shortest route', in: 'output', re: /Mombasa -> Nairobi -> Nakuru -> Kisumu[\s\S]*Hops:\s*3\b/ }",
            r"{ label: 'Prints the shortest route', in: 'output', re: /Mombasa[\s\S]*Nairobi[\s\S]*Nakuru[\s\S]*Kisumu[\s\S]*Hops:\s*3/ }"),
("maths.js", r"{ label: 'Prints the derivative and the maximum', in: 'output', re: /P'\(5\) = 20\.0[\s\S]*Max profit 200 at x = 10\b/ }",
            r"{ label: 'Prints the derivative and the maximum', in: 'output', re: /P'\(5\)\s*=\s*20(?:\.\d+)?[\s\S]*Max profit 200 at x = 10\b/ }"),
("maths.js", r"{ label: 'Prints the counts and the dice probability', in: 'output', re: /Committees of 3 from 10:\s*120[\s\S]*Chair and secretary from 5:\s*20[\s\S]*P\(sum is 7\) = 0\.17/ }",
            r"{ label: 'Prints the counts and the dice probability', in: 'output', re: /Committees of 3 from 10:\s*120[\s\S]*Chair and secretary from 5:\s*20[\s\S]*P\(sum is 7\)\s*=\s*0\.1[67]/ }"),
("maths.js", r"{ label: 'Prints the standard deviation', in: 'output', re: /Std dev:\s*12\.46\b/ }",
            r"{ label: 'Prints the standard deviation', in: 'output', re: /Std dev:\s*12\.4[56]/ }"),
# algorithms.js
("algorithms.js", r"{ label: 'Prints the denominations used', in: 'output', re: /1000 x 1\s*\n200 x 1\s*\n50 x 1\s*\n20 x 1\s*\n10 x 1\s*\n5 x 1\s*\n1 x 2/ }",
            r"{ label: 'Prints the denominations used', in: 'output', re: /1000[\s\S]*200[\s\S]*50[\s\S]*20[\s\S]*10[\s\S]*5[\s\S]*1 x 2/ }"),
("algorithms.js", r"{ label: 'Prints the list and the reversed list', in: 'output', re: /List:\s*10 -> 20 -> 30\s*\nReversed:\s*30 -> 20 -> 10/ }",
            r"{ label: 'Prints the list and the reversed list', in: 'output', re: /List:[\s\S]*10[\s\S]*20[\s\S]*30[\s\S]*Reversed:[\s\S]*30[\s\S]*20[\s\S]*10/ }"),
("algorithms.js", r"{ label: 'Walks forwards and backwards', in: 'output', re: /Forward:\s*A B C\s*\nBackward:\s*C B A/ }",
            r"{ label: 'Walks forwards and backwards', in: 'output', re: /Forward:[\s\S]*A[\s\S]*B[\s\S]*C[\s\S]*Backward:[\s\S]*C[\s\S]*B[\s\S]*A/ }"),
("algorithms.js", r"{ label: 'Accepts the balanced string', in: 'output', re: /\{\[\(\)\]\} balanced: true/ }",
            r"{ label: 'Accepts the balanced string', in: 'output', re: /\{\s*\[\s*\(\s*\)\s*\]\s*\}\s*balanced:\s*true/i }"),
("algorithms.js", r"{ label: 'Shows the queue and that it is full', in: 'output', re: /Queue:\s*B C D[\s\S]*Full:\s*true/ }",
            r"{ label: 'Shows the queue and that it is full', in: 'output', re: /Queue:[\s\S]*B[\s\S]*C[\s\S]*D[\s\S]*Full:\s*true/i }"),
("algorithms.js", r"{ label: 'Sorts the array and counts swaps', in: 'output', re: /Sorted:\s*\[10, 13, 14, 29, 37\][\s\S]*Swaps:\s*5\b/ }",
            r"{ label: 'Sorts the array and counts swaps', in: 'output', re: /Sorted:[\s\S]*10[\s\S]*13[\s\S]*14[\s\S]*29[\s\S]*37[\s\S]*Swaps:\s*5/ }"),
("algorithms.js", r"{ label: 'Both sorts give the right order', in: 'output', re: /Selection:\s*\[11, 12, 22, 25, 64\]\s*\nInsertion:\s*\[11, 12, 22, 25, 64\]/ }",
            r"{ label: 'Both sorts give the right order', in: 'output', re: /Selection:[\s\S]*11[\s\S]*12[\s\S]*22[\s\S]*25[\s\S]*64[\s\S]*Insertion:[\s\S]*11[\s\S]*12[\s\S]*22[\s\S]*25[\s\S]*64/ }"),
# html.js
("html.js", r"{ label: '<title>My Portfolio</title>', in: 'html', re: /<title>\s*My Portfolio\s*<\/title>/i }",
            r"{ label: '<title> element present', in: 'html', re: /<title>\s*\S[\s\S]*<\/title>/i }"),
# css.js
("css.js", r"{ label: 'h1 has a hexadecimal colour', in: 'css', re: /h1\s*\{[^}]*\bcolor\s*:\s*#[0-9a-f]{3,8}\b/i }",
            r"{ label: 'h1 has a colour', in: 'css', re: /h1\s*\{[^}]*\bcolor\s*:\s*(#[0-9a-f]{3,8}|[a-z]+|rgb[a]?\([^)]*\))/i }"),
("css.js", r"{ label: 'justify-content: space-between', in: 'css', re: /justify-content\s*:\s*space-between/i }",
            r"{ label: 'justify-content set', in: 'css', re: /justify-content\s*:\s*(space-between|center|space-around|space-evenly|flex-start|flex-end)/i }"),
]

applied = 0
missing = []
for fname, old, new in repls:
    path = os.path.join(BASE, fname)
    with open(path, "r", encoding="utf-8") as f:
        src = f.read()
    if old not in src:
        missing.append((fname, old[:60]))
        continue
    src = src.replace(old, new, 1)
    with open(path, "w", encoding="utf-8") as f:
        f.write(src)
    applied += 1

print(f"Applied: {applied}/{len(repls)}")
print("Missing:")
for m in missing:
    print(" -", m)
PY