'use strict';
/**
 * Course 3 - Python & Artificial Intelligence (modules 112-114).
 * TVET CDACC Computer Science L6, ICT/CU/CS/CR/08/6/A "Artificial Intelligence":
 *   LO1 AI fundamentals, LO2 problem-solving techniques (logic, inferencing, machine learning),
 *   LO3 the Python programming environment (syntax, PEP 8, data types, control structures,
 *       functions, OOP, NumPy, pandas, Matplotlib), LO4 AI programs in Python (K-Nearest
 *       Neighbours and Naive Bayes - built from scratch so the mathematics is visible).
 *
 * Lesson format: see adultCourse/index.js. Checks with in: 'output' run the learner's program.
 */

const M112 = {
  id: 112, order: 12, icon: '🐍', color: '#3776ab', difficulty: 'beginner',
  title: 'Python Foundations',
  description: 'The Python environment, PEP 8, data types, control structures and functions.',
  lessons: [
    {
      title: 'The Python Environment and Syntax', minutes: 45,
      content: `Python is a popular language for automation, data analysis and artificial intelligence because its code reads almost like English.

## Installing Python
On your own computer: download the installer from python.org, tick {{Add python.exe to PATH}}, run it, then check with {{python --version}} in Command Prompt. In KidsCode, Python is ready on the server - just write and press Run.

## The Zen of Python and PEP 8
Type {{import this}} to read the Zen of Python ("Beautiful is better than ugly. Readability counts."). {{PEP 8}} is the official style guide:
- 4 spaces per indent (never mix tabs and spaces)
- {{snake_case}} names for variables and functions: {{total_sales}}
- {{CapWords}} for classes: {{BankAccount}}
- Spaces around operators: {{x = a + b}}
- Lines no longer than 79 characters

## Syntax basics
~~~
# A comment starts with #
shop = "Duka la Mama"     # a variable: no type needed
items = 3
price = 120.5
print("Welcome to", shop)
print(f"{items} items cost {items * price} shillings")   # f-string
~~~
- {{Indentation}} is part of the syntax: the lines inside an if or a loop must be indented
- Variables are created by assigning to them; Python works out the type
- {{print()}} writes to the screen; {{input()}} reads a line the user types`,
      example: { python: `# Greeting a customer
customer = "Achieng"
balance = 1500
print("Habari", customer)
print(f"Your balance is KES {balance}")` },
      challenge: 'Write a short receipt. Store a customer name, an item and a price of 250 in variables, add a comment, and print "Customer: <name>", "Item: <item>" and "Total: KES 250" using an f-string for the total.',
      checks: [
        { label: 'Has a comment', in: 'code', re: /^\s*#/m },
        { label: 'Uses an f-string', in: 'code', re: /\bf["']/ },
        { label: 'Prints the customer and item', in: 'output', re: /Customer:\s*\S+[\s\S]*Item:\s*\S+/ },
        { label: 'Prints "Total: KES 250"', in: 'output', re: /Total:\s*KES\s*250\b/ },
      ],
      hints: ['price = 250', 'print(f"Total: KES {price}")'],
      quiz: [
        { q: 'According to PEP 8, how many spaces should one indent level use?', options: ['4', '2', '8', 'One tab'], why: 'PEP 8 recommends 4 spaces per indentation level.' },
        { q: 'Which name follows PEP 8 for a variable?', options: ['total_sales', 'TotalSales', 'totalSales', 'TOTAL-SALES'], why: 'Variables and functions use snake_case.' },
        { q: 'What starts a comment in Python?', options: ['#', '//', '--', '/*'], why: 'Everything after # on a line is a comment.' },
      ],
      oral: 'Explain why indentation matters more in Python than in Java.',
      solution: { python: `# A simple receipt
name = "Wanjiku"
item = "Maize flour"
price = 250
print(f"Customer: {name}")
print(f"Item: {item}")
print(f"Total: KES {price}")` },
    },
    {
      title: 'Python Data Types', minutes: 55,
      content: `Every value in Python has a type. Use {{type(x)}} to see it.

## Numbers, text and truth
- {{int}}: 42
- {{float}}: 3.75
- {{bool}}: True / False
- {{str}}: "Nakuru" - text, with methods such as {{.upper()}}, {{.split()}}, {{len(s)}}

## Collections
~~~
marks = [67, 82, 45, 90]            # list: ordered, can change
marks.append(73)
point = (36.8, -1.28)               # tuple: ordered, cannot change
towns = {"Nairobi", "Kisumu", "Nairobi"}   # set: no duplicates -> 2 items
student = {"name": "Kamau", "age": 19, "course": "ICT"}   # dict: key -> value
print(student["name"])              # Kamau
student["age"] = 20                 # update a value
~~~

## Useful built-in functions
- {{len()}}, {{sum()}}, {{min()}}, {{max()}}, {{sorted()}}, {{round(x, 2)}}
- {{int("5")}}, {{float("2.5")}}, {{str(10)}} convert between types

## Choosing a collection
- A list when order matters and items can repeat (daily sales)
- A tuple for fixed groups (a GPS point)
- A set for unique items or fast membership tests ({{"Kisumu" in towns}})
- A dict to look values up by a key (a phone book)`,
      example: { python: `prices = {"sugar": 165, "tea": 295, "milk": 65}
print("Items:", len(prices))
print("Most expensive:", max(prices, key=prices.get))
cities = ["Nairobi", "Mombasa", "Nairobi", "Kisumu"]
print("Unique cities:", sorted(set(cities)))` },
      challenge: 'Create a dict student with keys name, age and town; a list marks = [70, 85, 64, 91]; and a set of the subjects ["Maths", "ICT", "Maths", "English"]. Print "Name: <name>", "Average: 77.5", "Highest: 91" and "Subjects: 3".',
      checks: [
        { label: 'Uses a dictionary', in: 'code', re: /\{\s*["']name["']\s*:/ },
        { label: 'Uses a set', in: 'code', re: /set\s*\(|\{\s*["'][A-Z]\w*["']\s*,/ },
        { label: 'Prints the name, average and highest', in: 'output', re: /Name:\s*\S+[\s\S]*Average:\s*77\.5[\s\S]*Highest:\s*91/ },
        { label: 'Prints the number of unique subjects', in: 'output', re: /Subjects:\s*3\b/ },
      ],
      hints: ['sum(marks) / len(marks) gives the average.', 'len(set(subjects)) counts unique subjects.'],
      quiz: [
        { q: 'Which collection cannot be changed after it is created?', options: ['tuple', 'list', 'dict', 'set'], why: 'Tuples are immutable.' },
        { q: 'What does len({"a", "b", "a"}) return?', options: ['2', '3', '1', 'An error'], why: 'A set keeps only unique items.' },
        { q: 'How do you read the value for key "age" in dict d?', options: ['d["age"]', 'd.age', 'd(age)', 'd[age()]'], why: 'Square brackets with the key look up the value.' },
      ],
      oral: 'Give a real example where you would use a list, a tuple, a set and a dictionary.',
      solution: { python: `student = {"name": "Kamau", "age": 19, "town": "Nyeri"}
marks = [70, 85, 64, 91]
subjects = set(["Maths", "ICT", "Maths", "English"])
print("Name:", student["name"])
print("Average:", sum(marks) / len(marks))
print("Highest:", max(marks))
print("Subjects:", len(subjects))` },
    },
    {
      title: 'Control Structures in Python', minutes: 50,
      content: `## Selection
~~~
amount = 2500
if amount <= 100:
    fee = 0
elif amount <= 1500:
    fee = 15
else:
    fee = 30
print("Fee:", fee)
~~~
Logical operators are the words {{and}}, {{or}}, {{not}}.

## Looping
~~~
for day in ["Mon", "Tue", "Wed"]:      # loop over a list
    print(day)

for n in range(1, 6):                  # 1, 2, 3, 4, 5
    print(n * n)

balance = 1000
years = 0
while balance < 2000:                  # repeat while a condition holds
    balance *= 1.1
    years += 1
~~~
- {{range(start, stop, step)}} stops just before {{stop}}
- {{break}} leaves the loop; {{continue}} skips to the next round
- {{enumerate(items)}} gives the position and the item together

## A classic exercise
"Harambee": for 1 to 15 print the number, but print {{Hara}} for multiples of 3, {{Mbee}} for multiples of 5 and {{Harambee}} for multiples of both. Check the "both" case first!`,
      example: { python: `scores = [85, 62, 40]
for s in scores:
    if s >= 70:
        print(s, "Pass")
    elif s >= 50:
        print(s, "Referral")
    else:
        print(s, "Fail")` },
      challenge: 'Print the numbers 1 to 15, but print "Hara" for multiples of 3, "Mbee" for multiples of 5 and "Harambee" for multiples of both. Then use a while loop to print "Years: 8" - the years KES 1000 takes to reach 2000 at 10% a year.',
      checks: [
        { label: 'Uses a for loop with range', in: 'code', re: /for\s+\w+\s+in\s+range\s*\(/ },
        { label: 'Uses a while loop', in: 'code', re: /^\s*while\s+.+:/m },
        { label: 'Prints the right words', in: 'output', re: /Hara[\s\S]*Mbee[\s\S]*Harambee/i },
        { label: 'Prints the number of years', in: 'output', re: /Years:\s*8\b/ },
      ],
      hints: ['Check n % 15 == 0 before n % 3 and n % 5.', 'Multiply the balance by 1.1 each year.'],
      quiz: [
        { q: 'What does range(1, 5) produce?', options: ['1, 2, 3, 4', '1, 2, 3, 4, 5', '0, 1, 2, 3, 4', '5 numbers starting at 0'], why: 'range stops just before the stop value.' },
        { q: 'Which keyword is Python\'s "else if"?', options: ['elif', 'elseif', 'else if', 'ifelse'], why: 'Python uses elif.' },
        { q: 'Which word combines two conditions so both must be true?', options: ['and', '&&', 'both', 'plus'], why: 'Python uses the words and, or, not.' },
      ],
      oral: 'Explain why the order of the checks matters in the Harambee exercise.',
      solution: { python: `for n in range(1, 16):
    if n % 15 == 0:
        print("Harambee")
    elif n % 3 == 0:
        print("Hara")
    elif n % 5 == 0:
        print("Mbee")
    else:
        print(n)
balance = 1000
years = 0
while balance < 2000:
    balance *= 1.1
    years += 1
print("Years:", years)` },
    },
    {
      title: 'Functions: Built-in, User-defined and Lambda', minutes: 55,
      content: `A {{function}} is a named, reusable block of code.

## Built-in functions
Python includes {{print len sum min max sorted round abs int float str type range enumerate zip map filter}} and more.

## User-defined functions
~~~
def add_vat(amount, rate=0.16):        # rate has a default value
    """Return the amount including VAT."""   # a docstring
    return round(amount * (1 + rate), 2)

print(add_vat(1000))          # 1160.0
print(add_vat(1000, 0.08))    # 1080.0
print(add_vat(rate=0.1, amount=500))   # keyword arguments
~~~
- {{def}} defines a function; {{return}} sends a value back
- A function without return gives {{None}}
- Variables created inside a function are {{local}} to it

## Lambda functions
A {{lambda}} is a small, unnamed, one-expression function - handy for sorting and filtering:
~~~
square = lambda x: x * x
print(square(6))                                  # 36

products = [("tea", 295), ("milk", 65), ("sugar", 165)]
cheapest_first = sorted(products, key=lambda p: p[1])
expensive = list(filter(lambda p: p[1] > 100, products))
prices_with_vat = list(map(lambda p: p[1] * 1.16, products))
~~~`,
      example: { python: `def greet(name, greeting="Habari"):
    return f"{greeting}, {name}!"

print(greet("Otieno"))
print(greet("Amina", "Karibu"))
double = lambda x: x * 2
print(list(map(double, [1, 2, 3])))` },
      challenge: 'Write a function average(numbers) that returns the mean of a list, and a function grade(score) that returns "Pass" for 70+ and "Fail" otherwise. Use a lambda to sort [("Kamau", 64), ("Akinyi", 88), ("Omar", 75)] by score, highest first. Print "Average: 75.67" (rounded to 2), then each name and grade in order: "Akinyi Pass", "Omar Pass", "Kamau Fail".',
      checks: [
        { label: 'Defines average() and grade()', in: 'code', re: /def\s+average\s*\([\s\S]*def\s+grade\s*\(|def\s+grade\s*\([\s\S]*def\s+average\s*\(/ },
        { label: 'Uses a lambda', in: 'code', re: /lambda\s+\w+\s*:/ },
        { label: 'Prints the average', in: 'output', re: /Average:\s*75\.67/ },
        { label: 'Prints the sorted names with grades', in: 'output', re: /Akinyi\s+Pass[\s\S]*Omar\s+Pass[\s\S]*Kamau\s+Fail/i },
      ],
      hints: ['round(sum(numbers) / len(numbers), 2)', 'sorted(people, key=lambda p: p[1], reverse=True)'],
      quiz: [
        { q: 'What does a Python function return if it has no return statement?', options: ['None', '0', 'An empty string', 'False'], why: 'Functions return None by default.' },
        { q: 'What is a lambda?', options: ['A small unnamed function with one expression', 'A loop', 'A built-in module', 'A type of list'], why: 'lambda x: x * 2 is an anonymous function.' },
        { q: 'In def pay(rate=0.16), what is 0.16?', options: ['A default value for the parameter', 'The return value', 'A global variable', 'A required argument'], why: 'It is used when no value is passed.' },
      ],
      oral: 'Explain when you would use a lambda instead of a normal def function.',
      solution: { python: `def average(numbers):
    return round(sum(numbers) / len(numbers), 2)

def grade(score):
    return "Pass" if score >= 70 else "Fail"

people = [("Kamau", 64), ("Akinyi", 88), ("Omar", 75)]
print("Average:", average([p[1] for p in people]))
for name, score in sorted(people, key=lambda p: p[1], reverse=True):
    print(name, grade(score))` },
    },
  ],
};

const M113 = {
  id: 113, order: 13, icon: '📊', color: '#3776ab', difficulty: 'intermediate',
  title: 'Object-Oriented and Scientific Python',
  description: 'Classes in Python, then NumPy, pandas and Matplotlib for working with data.',
  lessons: [
    {
      title: 'Object-Oriented Python', minutes: 55,
      content: `Python supports object-oriented programming with {{classes}}.

~~~
class Matatu:
    fare_increase = 0          # class variable: shared by every matatu
    count = 0

    def __init__(self, route, seats, fare):   # constructor
        self.route = route                     # instance variables
        self.seats = seats
        self.fare = fare
        Matatu.count += 1

    def full_trip_income(self):                # instance method
        return self.seats * (self.fare + Matatu.fare_increase)

    @classmethod
    def raise_fares(cls, amount):              # class method: works on the class
        cls.fare_increase += amount

a = Matatu("Town - Rongai", 14, 100)
b = Matatu("Thika - Juja", 33, 80)
Matatu.raise_fares(20)
print(a.full_trip_income())   # 14 * 120 = 1680
print(Matatu.count)           # 2
~~~
- {{self}} is the current object (like {{this}} in Java)
- {{__init__}} runs when you create an object
- A {{class variable}} belongs to the class; an {{instance variable}} to one object
- {{@classmethod}} receives the class ({{cls}}); {{@staticmethod}} receives neither

## Inheritance
~~~
class ElectricMatatu(Matatu):
    def full_trip_income(self):
        return super().full_trip_income() + 200   # green bonus
~~~`,
      example: { python: `class Product:
    vat = 0.16
    def __init__(self, name, price):
        self.name = name
        self.price = price
    def price_with_vat(self):
        return round(self.price * (1 + Product.vat), 2)

p = Product("Jiko", 950)
print(p.name, p.price_with_vat())` },
      challenge: 'Create a class Account with a class variable interest_rate = 0.05, an __init__(self, owner, balance), a method add_interest() that adds a year\'s interest, and a classmethod set_rate(cls, rate). Create an account for "Njeri" with 10000, set the rate to 0.1, add interest, and print "Njeri: 11000.0".',
      checks: [
        { label: 'Defines class Account with __init__', in: 'code', re: /class\s+Account\b[\s\S]*def\s+__init__\s*\(\s*self/ },
        { label: 'Has a class variable interest_rate', in: 'code', re: /^\s{4}interest_rate\s*=/m },
        { label: 'Has a @classmethod', in: 'code', re: /@classmethod\s*\n\s*def\s+\w+\s*\(\s*cls/ },
        { label: 'Prints the new balance', in: 'output', re: /Njeri:\s*11000(?:\.\d+)?/ },
      ],
      hints: ['In set_rate: cls.interest_rate = rate', 'In add_interest: self.balance += self.balance * Account.interest_rate'],
      quiz: [
        { q: 'What does self refer to in a method?', options: ['The object the method was called on', 'The class', 'The parent class', 'The module'], why: 'self is the current instance.' },
        { q: 'Which method runs when an object is created?', options: ['__init__', '__main__', 'create', 'new'], why: '__init__ is the constructor.' },
        { q: 'What does a @classmethod receive as its first argument?', options: ['The class (cls)', 'The object (self)', 'Nothing', 'The parent class'], why: 'Class methods work on the class itself.' },
      ],
      oral: 'Explain the difference between a class variable and an instance variable with an example.',
      solution: { python: `class Account:
    interest_rate = 0.05

    def __init__(self, owner, balance):
        self.owner = owner
        self.balance = balance

    def add_interest(self):
        self.balance += self.balance * Account.interest_rate

    @classmethod
    def set_rate(cls, rate):
        cls.interest_rate = rate

acc = Account("Njeri", 10000)
Account.set_rate(0.1)
acc.add_interest()
print(f"{acc.owner}: {acc.balance}")` },
    },
    {
      title: 'NumPy: Fast Numerical Arrays', minutes: 55,
      content: `{{NumPy}} is the core scientific module in Python. Its {{ndarray}} holds numbers of one type and does maths on the whole array at once ({{vectorisation}}) - far faster than loops.

~~~
import numpy as np

rainfall = np.array([12.5, 0.0, 33.2, 8.1, 0.0, 21.7, 5.4])   # mm per day
print(rainfall.sum())        # total
print(rainfall.mean())       # average
print(rainfall.max(), rainfall.argmax())   # wettest day and its index
print(rainfall[rainfall > 10])             # boolean filtering
print(rainfall * 0.0394)                   # every value converted to inches
~~~

## Creating arrays
- {{np.array([1, 2, 3])}} from a list
- {{np.zeros(5)}}, {{np.ones((2, 3))}}, {{np.arange(0, 10, 2)}}, {{np.linspace(0, 1, 5)}}

## Shape and statistics
~~~
sales = np.array([[120, 90, 150],
                  [80, 110, 95]])     # 2 shops x 3 days
print(sales.shape)          # (2, 3)
print(sales.sum(axis=1))    # total per shop: [360 285]
print(sales.mean(axis=0))   # average per day
print(np.std(sales))        # standard deviation
~~~
Use {{round(x, 2)}} or {{np.round(arr, 2)}} to tidy decimals.`,
      example: { python: `import numpy as np
temps = np.array([24, 26, 23, 28, 30, 27, 25])
print("Week average:", round(temps.mean(), 1))
print("Hot days:", temps[temps >= 27])
print("In Fahrenheit:", temps * 9 / 5 + 32)` },
      challenge: 'Using NumPy, create the array of daily sales [1200, 950, 1800, 1300, 2100]. Print "Total: 7350", "Mean: 1470.0", "Std: 419.05" (rounded to 2 places) and "Above mean: [1800 2100]" using boolean filtering.',
      checks: [
        { label: 'Imports NumPy', in: 'code', re: /import\s+numpy\s+as\s+np|from\s+numpy\s+import/ },
        { label: 'Creates an array with np.array', in: 'code', re: /np\.array\s*\(/ },
        { label: 'Prints the total, mean and standard deviation', in: 'output', re: /Total:\s*7350\b[\s\S]*Mean:\s*1470(?:\.\d+)?[\s\S]*Std:\s*419\.05(?:\d)?/ },
        { label: 'Prints the days above the mean', in: 'output', re: /Above mean:[\s\S]*1800[\s\S]*2100/ },
      ],
      hints: ['sales[sales > sales.mean()] filters with a condition.', 'round(float(sales.std()), 2)'],
      quiz: [
        { q: 'Why is NumPy faster than a Python loop for maths on many numbers?', options: ['It works on the whole array at once in compiled code', 'It uses fewer variables', 'It skips some numbers', 'It runs on the GPU only'], why: 'Vectorised operations run in optimised C code.' },
        { q: 'What does arr.shape return for a 2 x 3 array?', options: ['(2, 3)', '6', '[2, 3]', '(3, 2)'], why: 'shape is a tuple of (rows, columns).' },
        { q: 'What does arr[arr > 10] do?', options: ['Keeps only the values greater than 10', 'Sets values above 10 to True', 'Counts values above 10', 'Removes the first 10 values'], why: 'A boolean mask filters the array.' },
      ],
      oral: 'Explain vectorisation and why it matters for data analysis and AI.',
      solution: { python: `import numpy as np
sales = np.array([1200, 950, 1800, 1300, 2100])
print("Total:", sales.sum())
print("Mean:", sales.mean())
print("Std:", round(float(sales.std()), 2))
print("Above mean:", sales[sales > sales.mean()])` },
    },
    {
      title: 'pandas: Data Analysis with DataFrames', minutes: 60,
      content: `{{pandas}} organises data in tables called {{DataFrames}} - like a spreadsheet you control with code.

~~~
import pandas as pd

data = {
    "student": ["Akinyi", "Kamau", "Wanjiru", "Omar", "Chebet"],
    "county":  ["Kisumu", "Nyeri", "Nairobi", "Mombasa", "Kericho"],
    "score":   [88, 64, 75, 91, 58],
}
df = pd.DataFrame(data)
print(df.head())                    # first rows
print(df["score"].mean())           # one column
print(df[df["score"] >= 70])        # filter rows
print(df.sort_values("score", ascending=False))
df["passed"] = df["score"] >= 70    # new column
print(df.describe())                # count, mean, std, min, max ...
~~~

## Grouping
~~~
sales = pd.DataFrame({
    "region": ["Coast", "Rift", "Coast", "Nairobi", "Rift"],
    "amount": [1200, 800, 950, 2000, 1100],
})
print(sales.groupby("region")["amount"].sum())
~~~

## Useful methods
- {{df.shape}}, {{df.columns}}, {{df.info()}}
- {{df.loc[row, column]}} by label, {{df.iloc[0]}} by position
- {{pd.read_csv("file.csv")}} loads real data files
- {{df.isna().sum()}} finds missing values; {{df.fillna(0)}} replaces them`,
      example: { python: `import pandas as pd
df = pd.DataFrame({"item": ["tea", "sugar", "milk"], "price": [295, 165, 65]})
df["with_vat"] = (df["price"] * 1.16).round(2)
print(df)
print("Cheapest:", df.loc[df["price"].idxmin(), "item"])` },
      challenge: 'Create a DataFrame of five students with names and scores 88, 64, 75, 91 and 58. Print "Average: 75.2", "Top: <name of the 91 student>" and "Passed: 3" (scores of 70 or more). Then group the sales of regions Coast 1200, Rift 800, Coast 950 and print the total for Coast as "Coast: 2150".',
      checks: [
        { label: 'Imports pandas', in: 'code', re: /import\s+pandas\s+as\s+pd|from\s+pandas\s+import/ },
        { label: 'Creates a DataFrame', in: 'code', re: /DataFrame\s*\(/ },
        { label: 'Uses groupby', in: 'code', re: /\.groupby\s*\(/ },
        { label: 'Prints the average, top student and pass count', in: 'output', re: /Average:\s*75\.2(?:0)?[\s\S]*Top:\s*\w+[\s\S]*Passed:\s*3\b/ },
        { label: 'Prints the Coast total', in: 'output', re: /Coast:\s*2150\b/ },
      ],
      hints: ['df.loc[df["score"].idxmax(), "name"] gives the top name.', 'totals = sales.groupby("region")["amount"].sum(); totals["Coast"]'],
      quiz: [
        { q: 'What is a pandas DataFrame?', options: ['A table of rows and columns', 'A single list of numbers', 'A chart', 'A database server'], why: 'A DataFrame is a two-dimensional labelled table.' },
        { q: 'What does df[df["score"] >= 70] return?', options: ['Only the rows with a score of 70 or more', 'True or False', 'The score column', 'The number of passes'], why: 'A condition inside [] filters rows.' },
        { q: 'Which method summarises count, mean, std, min and max?', options: ['describe()', 'summary()', 'info()', 'stats()'], why: 'describe() gives descriptive statistics.' },
      ],
      oral: 'Describe how a county government could use pandas to analyse data from its health centres.',
      solution: { python: `import pandas as pd
df = pd.DataFrame({
    "name": ["Akinyi", "Kamau", "Wanjiru", "Omar", "Chebet"],
    "score": [88, 64, 75, 91, 58],
})
print("Average:", df["score"].mean())
print("Top:", df.loc[df["score"].idxmax(), "name"])
print("Passed:", int((df["score"] >= 70).sum()))
sales = pd.DataFrame({"region": ["Coast", "Rift", "Coast"], "amount": [1200, 800, 950]})
totals = sales.groupby("region")["amount"].sum()
print("Coast:", totals["Coast"])` },
    },
    {
      title: 'Matplotlib: Visualising Data', minutes: 45,
      content: `{{Matplotlib}} draws charts from data. A chart often shows a pattern faster than a table.

~~~
import matplotlib.pyplot as plt

months = ["Jan", "Feb", "Mar", "Apr"]
rain = [65, 48, 120, 210]

fig, ax = plt.subplots()             # a figure with one set of axes
ax.plot(months, rain, marker="o")    # line chart
ax.set_title("Nairobi rainfall (mm)")
ax.set_xlabel("Month")
ax.set_ylabel("Rainfall")
fig.savefig("rainfall.png")          # save the picture
~~~

## Chart types
- {{ax.plot}}: line chart - trends over time
- {{ax.bar}}: bar chart - compare categories
- {{ax.scatter}}: scatter plot - relationship between two numbers (used a lot in machine learning)
- {{ax.hist}}: histogram - how values are spread
- {{ax.pie}}: pie chart - parts of a whole

## Good charts
- Always give a title and axis labels with units
- Start bar charts at zero
- Do not use more colours than you need

In KidsCode your program runs on a server without a screen, so save charts with {{fig.savefig()}} and check them with code, for example {{ax.get_title()}} or {{len(ax.patches)}} (the number of bars).`,
      example: { python: `import matplotlib.pyplot as plt
fig, ax = plt.subplots()
ax.scatter([1, 2, 3, 4], [10, 19, 31, 38])
ax.set_title("Advertising vs sales")
fig.savefig("scatter.png")
print("Points plotted:", len(ax.collections[0].get_offsets()))` },
      challenge: 'Draw a bar chart of sales for Coast 2150, Rift 1900 and Nairobi 2000 with the title "Sales by region" and a y-axis label "KES". Save it as sales.png and print "Title: Sales by region" and "Bars: 3" using ax.get_title() and len(ax.patches).',
      checks: [
        { label: 'Imports matplotlib.pyplot', in: 'code', re: /import\s+matplotlib\.pyplot\s+as\s+plt/ },
        { label: 'Draws a bar chart with a y label', in: 'code', re: /\.bar\s*\([\s\S]*set_ylabel\s*\(|set_ylabel\s*\([\s\S]*\.bar\s*\(/ },
        { label: 'Saves the figure', in: 'code', re: /savefig\s*\(/ },
        { label: 'Prints the title and number of bars', in: 'output', re: /Title:[\s\S]*Sales[\s\S]*by[\s\S]*region[\s\S]*Bars:\s*3\b/i },
      ],
      hints: ['fig, ax = plt.subplots(); ax.bar(regions, amounts)', 'print("Bars:", len(ax.patches))'],
      quiz: [
        { q: 'Which chart best shows a trend over time?', options: ['Line chart', 'Pie chart', 'Histogram', 'Scatter plot'], why: 'Line charts connect values in order.' },
        { q: 'Which chart shows the relationship between two numeric variables?', options: ['Scatter plot', 'Pie chart', 'Bar chart', 'Table'], why: 'Each point is one pair of values.' },
        { q: 'How do you save a Matplotlib figure to a file?', options: ['fig.savefig("chart.png")', 'plt.write("chart.png")', 'fig.export()', 'ax.save()'], why: 'savefig writes the figure as an image.' },
      ],
      oral: 'Explain which chart you would use to show monthly M-Pesa transactions, and why.',
      solution: { python: `import matplotlib.pyplot as plt
regions = ["Coast", "Rift", "Nairobi"]
amounts = [2150, 1900, 2000]
fig, ax = plt.subplots()
ax.bar(regions, amounts)
ax.set_title("Sales by region")
ax.set_ylabel("KES")
fig.savefig("sales.png")
print("Title:", ax.get_title())
print("Bars:", len(ax.patches))` },
    },
  ],
};

const M114 = {
  id: 114, order: 14, icon: '🤖', color: '#3776ab', difficulty: 'advanced',
  title: 'Artificial Intelligence with Python',
  description: 'What AI is, logic and inference, machine learning, K-Nearest Neighbours and Naive Bayes.',
  lessons: [
    {
      title: 'Foundations and Applications of AI', minutes: 50,
      content: `{{Artificial Intelligence (AI)}} is the study of building machines that perform tasks that normally need human intelligence: reasoning, learning, understanding language and recognising images.

## A short history
- 1950: Alan Turing proposes the "imitation game" (Turing test)
- 1956: the term AI is coined at the Dartmouth workshop
- 1970s-80s: {{expert systems}} that encode experts' rules
- 2010s: {{deep learning}} with large data and fast GPUs
- Today: large language models, chat assistants, self-driving research

## Foundations - AI borrows from
{{Mathematics}} (logic, probability), {{economics}} and {{decision theory}} (choosing the best action), {{neurology}} (how neurons work), {{psychology}} (how people think), {{engineering}} (building the machines) and {{computer networking}} (sharing data and computing power).

## Applications
- {{Expert systems}}: rules from experts (crop disease advice)
- {{Machine learning}}: learning patterns from data (M-Pesa fraud detection, credit scoring)
- {{Natural language processing}}: understanding text and speech (Swahili chatbots, translation)
- {{Computer vision}}: understanding images (counting livestock from drone photos)
- {{Gaming}} and {{robotics}}
- {{Artificial neural networks}}: layers of simple "neurons" that learn
- {{Intelligent agents}}: perceive their environment and act to reach a goal

## A tiny expert system
An expert system stores {{if-then rules}} and an {{inference engine}} applies them to facts:
~~~
facts = {"yellow_leaves": True, "dry_soil": True}
if facts["yellow_leaves"] and facts["dry_soil"]:
    print("Advice: water the crop")
~~~`,
      example: { python: `rules = [
    ({"fever", "chills"}, "Possible malaria - visit a clinic for a test"),
    ({"cough", "fever"}, "Possible flu - rest and drink fluids"),
]
symptoms = {"fever", "chills"}
for conditions, advice in rules:
    if conditions <= symptoms:
        print(advice)` },
      challenge: 'Build a small crop expert system. Store at least three rules as (set of symptoms, advice) pairs, including ({"yellow_leaves", "dry_soil"}, "Water the crop") and ({"holes_in_leaves"}, "Check for fall armyworm"). For the facts {"yellow_leaves", "dry_soil", "holes_in_leaves"} print every matching advice, then "Rules fired: 2".',
      checks: [
        { label: 'Stores rules in a list', in: 'code', re: /\[\s*\(\s*\{/ },
        { label: 'Checks each rule against the facts', in: 'code', re: /for\s+.+\s+in\s+\w+\s*:[\s\S]*if\s+/ },
        { label: 'Prints both matching pieces of advice', in: 'output', re: /Water the crop[\s\S]*fall armyworm|fall armyworm[\s\S]*Water the crop/ },
        { label: 'Prints the number of rules fired', in: 'output', re: /Rules fired:\s*2\b/ },
      ],
      hints: ['conditions <= facts is True when every condition is in the facts (subset).', 'Count how many rules matched in a variable.'],
      quiz: [
        { q: 'What does an expert system use to make decisions?', options: ['If-then rules from human experts', 'Random guesses', 'Only images', 'Spreadsheets'], why: 'Expert systems encode expert knowledge as rules.' },
        { q: 'Who proposed a test for machine intelligence in 1950?', options: ['Alan Turing', 'Bill Gates', 'Ada Lovelace', 'Tim Berners-Lee'], why: 'The Turing test.' },
        { q: 'Which AI field deals with understanding human language?', options: ['Natural language processing', 'Computer vision', 'Robotics', 'Expert systems'], why: 'NLP covers text and speech.' },
      ],
      oral: 'Describe three ways AI is already used in Kenya and which AI field each belongs to.',
      solution: { python: `rules = [
    ({"yellow_leaves", "dry_soil"}, "Water the crop"),
    ({"holes_in_leaves"}, "Check for fall armyworm"),
    ({"wilting", "wet_soil"}, "Improve drainage"),
]
facts = {"yellow_leaves", "dry_soil", "holes_in_leaves"}
fired = 0
for conditions, advice in rules:
    if conditions <= facts:
        print(advice)
        fired += 1
print("Rules fired:", fired)` },
    },
    {
      title: 'Logic, Inference and Reasoning', minutes: 55,
      content: `AI systems reason with {{logic}}.

## Logical operators
- {{AND}}: true only if both are true
- {{OR}}: true if at least one is true
- {{NOT}}: flips true and false

## Propositional logic
A {{proposition}} is a statement that is true or false: P = "it is raining", Q = "the road is muddy". We combine them: {{P AND Q}}, {{P → Q}} ("if P then Q", false only when P is true and Q is false).

A {{truth table}} lists every combination:
~~~
from itertools import product
for p, q in product([True, False], repeat=2):
    implies = (not p) or q
    print(p, q, implies)
~~~

## Predicate logic
Adds objects and quantifiers: "for all x, if x is a farmer then x owns land" - {{∀x Farmer(x) → OwnsLand(x)}}; "there exists" is {{∃}}.

## Types of inferencing
- {{Single inferencing}}: one rule gives a conclusion (if fever and chills then test for malaria)
- {{Multiple (chained) inferencing}}: conclusions feed further rules. {{Forward chaining}} starts from facts; {{backward chaining}} starts from a goal and looks for supporting facts
- {{Case-based reasoning}}: solve a new problem by finding the most similar past case (a help desk reusing old tickets)

## Machine learning
Instead of writing rules, the computer {{learns}} them from data.
- {{Supervised learning}}: data has labels (past loans marked "repaid" or "defaulted") - classification and regression
- {{Unsupervised learning}}: no labels; find groups (clustering customers by spending)`,
      example: { python: `from itertools import product
print("P     Q     P OR Q")
for p, q in product([True, False], repeat=2):
    print(p, q, p or q)` },
      challenge: 'Print the truth table of (A and B) or not C for all 8 combinations, one row per line as "A B C -> result" (for example "True True True -> True"). Then print "True rows: 5".',
      checks: [
        { label: 'Generates all combinations', in: 'code', re: /product\s*\(|for\s+\w+\s+in\s+\[\s*True\s*,\s*False\s*\][\s\S]*for\s+\w+\s+in/ },
        { label: 'Uses and, or, not', in: 'code', re: /\band\b[\s\S]*\bor\b[\s\S]*\bnot\b|\bnot\b[\s\S]*\band\b[\s\S]*\bor\b/ },
        { label: 'Prints the first and last rows correctly', in: 'output', re: /True\s+True\s+True\s*->\s*True[\s\S]*False\s+False\s+False\s*->\s*True/i },
        { label: 'Prints the number of true rows', in: 'output', re: /True rows:\s*5\b/ },
      ],
      hints: ['for a, b, c in product([True, False], repeat=3):', 'result = (a and b) or not c'],
      quiz: [
        { q: 'When is P → Q (P implies Q) false?', options: ['When P is true and Q is false', 'When both are false', 'When P is false', 'Never'], why: 'An implication fails only if the condition holds but the conclusion does not.' },
        { q: 'Which reasoning reuses the most similar past problem?', options: ['Case-based reasoning', 'Forward chaining', 'Predicate logic', 'Unsupervised learning'], why: 'Case-based reasoning adapts past cases.' },
        { q: 'Grouping customers without labels is an example of...', options: ['Unsupervised learning', 'Supervised learning', 'An expert system', 'Single inferencing'], why: 'Clustering finds groups in unlabelled data.' },
      ],
      oral: 'Explain forward chaining and backward chaining with a medical diagnosis example.',
      solution: { python: `from itertools import product
true_rows = 0
for a, b, c in product([True, False], repeat=3):
    result = (a and b) or not c
    if result:
        true_rows += 1
    print(a, b, c, "->", result)
print("True rows:", true_rows)` },
    },
    {
      title: 'Machine Learning with K-Nearest Neighbours', minutes: 60,
      content: `{{K-Nearest Neighbours (KNN)}} is a simple supervised learning algorithm: to classify a new item, find the {{k}} most similar labelled items and take a {{majority vote}}.

## The mathematics
Similarity is measured by {{Euclidean distance}}. For two points (x1, y1) and (x2, y2):
distance = √((x1 - x2)² + (y1 - y2)²)

## Steps
1. Compute the distance from the new point to every training point
2. Sort by distance and keep the k nearest
3. Count the labels among them and return the most common

~~~
import math
from collections import Counter

# (income in thousands, existing debt in thousands) -> loan decision
training = [((60, 5), "approve"), ((25, 20), "decline"), ((80, 10), "approve"),
            ((30, 25), "decline"), ((55, 8), "approve"), ((20, 15), "decline")]

def knn(point, data, k=3):
    nearest = sorted(data, key=lambda item: math.dist(point, item[0]))[:k]
    votes = Counter(label for _, label in nearest)
    return votes.most_common(1)[0][0]

print(knn((50, 12), training))   # approve
~~~

## Making good predictions
- Choose an odd {{k}} for two classes so votes cannot tie
- {{Scale}} features to similar ranges, or the biggest numbers dominate the distance
- Test on data the model has not seen and measure {{accuracy}}

Libraries such as {{scikit-learn}} provide {{KNeighborsClassifier}}, but building it yourself shows exactly how it decides.`,
      example: { python: `import math
a = (2, 3)
b = (5, 7)
print("Distance:", math.dist(a, b))   # 5.0
print("By hand:", math.sqrt((2 - 5) ** 2 + (3 - 7) ** 2))` },
      challenge: 'Classify fruit by (weight in grams, sweetness 1-10). Training data: ((150, 8), "mango"), ((170, 9), "mango"), ((140, 7), "mango"), ((120, 3), "lemon"), ((100, 2), "lemon"), ((110, 4), "lemon"). Write a knn(point, data, k) function using math.dist and print "(160, 8) -> mango", "(105, 3) -> lemon" and "Accuracy: 100%" by testing it on the training points themselves with k=3.',
      checks: [
        { label: 'Defines a knn function', in: 'code', re: /def\s+knn\s*\(/ },
        { label: 'Uses Euclidean distance', in: 'code', re: /math\.dist\s*\(|\*\*\s*2[\s\S]*sqrt|sqrt[\s\S]*\*\*\s*2/ },
        { label: 'Classifies both new fruits', in: 'output', re: /160[\s\S]*8[\s\S]*mango[\s\S]*105[\s\S]*3[\s\S]*lemon/i },
        { label: 'Prints the accuracy', in: 'output', re: /Accuracy:\s*100(\.0)?%/ },
      ],
      hints: ['sorted(data, key=lambda item: math.dist(point, item[0]))[:k]', 'Counter(labels).most_common(1)[0][0] gives the winning label.'],
      quiz: [
        { q: 'How does KNN classify a new point?', options: ['By a majority vote of its k nearest labelled points', 'By drawing a straight line', 'By random choice', 'By the average of all labels'], why: 'KNN looks at the nearest neighbours.' },
        { q: 'Why choose an odd k for two classes?', options: ['To avoid tied votes', 'Odd numbers are faster', 'Even k is not allowed', 'To make the distance smaller'], why: 'With an odd k, two classes cannot tie.' },
        { q: 'Why should features be scaled before KNN?', options: ['Large-valued features would dominate the distance', 'KNN only works on decimals', 'To remove labels', 'It makes k smaller'], why: 'Distances are sensitive to the size of each feature.' },
      ],
      oral: 'Explain step by step how KNN would decide whether an M-Pesa transaction is fraudulent.',
      solution: { python: `import math
from collections import Counter

training = [((150, 8), "mango"), ((170, 9), "mango"), ((140, 7), "mango"),
            ((120, 3), "lemon"), ((100, 2), "lemon"), ((110, 4), "lemon")]

def knn(point, data, k=3):
    nearest = sorted(data, key=lambda item: math.dist(point, item[0]))[:k]
    return Counter(label for _, label in nearest).most_common(1)[0][0]

for p in [(160, 8), (105, 3)]:
    print(p, "->", knn(p, training))
correct = sum(1 for features, label in training if knn(features, training) == label)
print(f"Accuracy: {correct / len(training) * 100:.0f}%")` },
    },
    {
      title: 'Machine Learning with Naive Bayes', minutes: 60,
      content: `{{Naive Bayes}} classifies using probabilities. It is fast and works well for text (spam filters) and categorical data.

## Bayes' theorem
P(class | evidence) = P(evidence | class) × P(class) / P(evidence)
- {{P(class)}}: the {{prior}} - how common the class is
- {{P(evidence | class)}}: the {{likelihood}} - how often this evidence appears in the class
- {{P(class | evidence)}}: the {{posterior}} - what we want

## Why "naive"?
It assumes the features are {{independent}} given the class, so the likelihood of several features is just the product of each one:
P(f1, f2 | class) = P(f1 | class) × P(f2 | class)

Because P(evidence) is the same for every class, we only compare {{prior × likelihoods}} and pick the largest.

## Example: will a customer leave (churn)?
~~~
data = [("prepaid", "yes", "leave"), ("prepaid", "no", "stay"),
        ("postpaid", "no", "stay"), ("prepaid", "yes", "leave"),
        ("postpaid", "yes", "stay"), ("prepaid", "no", "stay")]
# features: plan, complained   label: leave / stay

def score(label, plan, complained):
    rows = [r for r in data if r[2] == label]
    prior = len(rows) / len(data)
    p_plan = sum(r[0] == plan for r in rows) / len(rows)
    p_comp = sum(r[1] == complained for r in rows) / len(rows)
    return prior * p_plan * p_comp
~~~
For ("prepaid", "yes"): leave = 2/6 × 1 × 1 = 0.33, stay = 4/6 × 2/4 × 1/4 = 0.08 - predict {{leave}}.

## Smoothing
If a feature never appears with a class, its probability is 0 and wipes out everything. {{Laplace smoothing}} adds 1 to every count to avoid this.`,
      example: { python: `# P(rain) = 0.3, P(clouds | rain) = 0.9, P(clouds) = 0.45
p_rain = 0.3
p_clouds_given_rain = 0.9
p_clouds = 0.45
print("P(rain | clouds) =", round(p_clouds_given_rain * p_rain / p_clouds, 2))` },
      challenge: 'Using the six churn rows from the lesson, write a predict(plan, complained) function that computes prior × likelihoods for "leave" and "stay" and returns the larger. Print "leave score: 0.33", "stay score: 0.08" (2 decimals) for ("prepaid", "yes"), then "prediction: leave", and "postpaid/no -> stay".',
      checks: [
        { label: 'Defines a predict function', in: 'code', re: /def\s+predict\s*\(/ },
        { label: 'Computes a prior from the data', in: 'code', re: /len\s*\(\s*\w+\s*\)\s*\/\s*len\s*\(/ },
        { label: 'Prints both scores', in: 'output', re: /leave score:\s*0\.33(?:\d)?[\s\S]*stay score:\s*0\.08(?:\d)?/i },
        { label: 'Prints both predictions', in: 'output', re: /prediction:\s*leave[\s\S]*postpaid\/no -> stay/ },
      ],
      hints: ['prior = len(rows) / len(data) for the rows with that label.', 'Use round(value, 2) or f"{value:.2f}" when printing.'],
      quiz: [
        { q: 'In Bayes\' theorem, what is the prior?', options: ['How common the class is before seeing the evidence', 'The final answer', 'The evidence itself', 'The number of features'], why: 'P(class) is the prior.' },
        { q: 'Why is Naive Bayes called "naive"?', options: ['It assumes the features are independent given the class', 'It is only for beginners', 'It ignores the labels', 'It uses no mathematics'], why: 'The independence assumption keeps it simple.' },
        { q: 'What does Laplace smoothing prevent?', options: ['A zero probability wiping out the whole product', 'Overfitting in KNN', 'Negative probabilities', 'Too many classes'], why: 'Adding 1 to counts avoids zeros.' },
      ],
      oral: 'Explain how a Naive Bayes spam filter would decide whether an SMS is spam.',
      solution: { python: `data = [("prepaid", "yes", "leave"), ("prepaid", "no", "stay"),
        ("postpaid", "no", "stay"), ("prepaid", "yes", "leave"),
        ("postpaid", "yes", "stay"), ("prepaid", "no", "stay")]

def score(label, plan, complained):
    rows = [r for r in data if r[2] == label]
    prior = len(rows) / len(data)
    p_plan = sum(r[0] == plan for r in rows) / len(rows)
    p_comp = sum(r[1] == complained for r in rows) / len(rows)
    return prior * p_plan * p_comp

def predict(plan, complained):
    scores = {label: score(label, plan, complained) for label in ("leave", "stay")}
    return max(scores, key=scores.get), scores

label, scores = predict("prepaid", "yes")
print(f"leave score: {scores['leave']:.2f}")
print(f"stay score: {scores['stay']:.2f}")
print("prediction:", label)
print("postpaid/no ->", predict("postpaid", "no")[0])` },
    },
  ],
};

module.exports = { M112, M113, M114 };
