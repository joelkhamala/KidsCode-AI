'use strict';
/**
 * Adult course - Python Programming & AI (modules 112-114).
 * Based on TVET CDACC Units:
 *   - ICT/OS/CS/CR/08/6/A "Understand Artificial Intelligence Concepts"
 *   - Programming with Python for AI and machine learning
 *
 * Lesson format: see java.js
 */

const M112 = {
  id: 112, order: 12, icon: '🐍', color: '#3776ab', difficulty: 'beginner', hours: 28,
  title: 'Python Basics and Data Types',
  description: 'Python syntax, variables, data types (integers, floats, strings, lists, dictionaries), and basic operations.',
  lessons: [
    {
      title: 'Introduction to Python', minutes: 60,
      content: `Python is a popular, beginner-friendly language used in web development, data science, artificial intelligence, and automation.

## Why Python?
- Simple, readable syntax (looks like English)
- Powerful: used by Google, NASA, Netflix
- Great for AI and machine learning
- Cross-platform: runs on Windows, Mac, Linux

## Installation
1. Download from python.org
2. Run the installer (tick "Add to PATH" on Windows)
3. Verify: open Command Prompt or Terminal, type {{python --version}}

## Your First Program
~~~
print("Habari, Dunia!")
print("2 + 3 =", 2 + 3)
~~~

Run it:
~~~
python hello.py
~~~

## Indentation
Python uses indentation (spaces at the start of lines) to show code blocks. This is mandatory:
~~~
if 5 > 3:
    print("True")    # indented 4 spaces
else:
    print("False")   # indented 4 spaces
~~~

## Comments
~~~
# This is a single-line comment
"""
This is a multi-line comment
used for documentation
"""
~~~

## Why is Python Good for AI?
- Clear syntax helps focus on logic, not syntax
- Rich libraries: NumPy, Pandas, Scikit-Learn, TensorFlow
- Fast to prototype and test ideas`,
      challenge: 'Write a Python program that prints your name and three things you want to learn.',
      checks: [
        { label: 'Uses print()', in: 'js', re: /print\s*\(/ },
        { label: 'Prints at least 3 lines', in: 'js', re: /print.*print.*print/s },
        { label: 'Has a comment', in: 'js', re: /#/ },
      ],
      hints: ['Each print() on a new line prints on a separate line.'],
      quiz: [
        { q: 'What character indicates a comment in Python?', options: ['#', '//', '/*', '--'], why: '# starts a Python comment.' },
        { q: 'Why is indentation important in Python?', options: ['It defines code blocks (if, loops, functions)', 'It makes code run faster', 'It is optional', 'It only affects readability'], why: 'Indentation is mandatory in Python for structure.' },
        { q: 'What does print() do?', options: ['Prints text to the screen', 'Saves to a file', 'Checks if something is true', 'Declares a variable'], why: 'print() displays output.' },
      ],
      oral: 'Explain why Python is a good choice for learning AI and machine learning.',
    },
    {
      title: 'Variables and Data Types', minutes: 90,
      content: `Variables store data. Python automatically detects the data type.

## Naming Variables
Like Java: start with a letter, use snake_case ({{first_name}}, {{age}}) or camelCase.

## Primitive Data Types
~~~
# Integer (whole numbers)
age = 25
year = 2024

# Float (decimal numbers)
height = 1.75
price = 99.99

# String (text)
name = "Alice"
message = 'Hello world'
quote = """Line 1
Line 2"""

# Boolean (True/False)
is_active = True
has_license = False
~~~

## Type Function
Check the type:
~~~
print(type(age))        # <class 'int'>
print(type(height))     # <class 'float'>
print(type(name))       # <class 'str'>
print(type(is_active))  # <class 'bool'>
~~~

## String Operations
~~~
greeting = "Hello"
name = "Kenya"
message = greeting + ", " + name     # concatenation
print(message)                        # Hello, Kenya

# Repetition
print("Ha" * 3)                       # HaHaHa

# String methods
text = "python"
print(text.upper())                   # PYTHON
print(text.capitalize())              # Python
print(text.replace("p", "P"))         # Python
~~~

## Type Conversion
~~~
age_str = "25"
age_int = int(age_str)      # converts to integer

price = 99.99
price_str = str(price)      # converts to string
~~~

## List (Collection of Values)
~~~
numbers = [1, 2, 3, 4, 5]
fruits = ["apple", "banana", "orange"]
mixed = [1, "hello", 3.14, True]

# Access by index (starts at 0)
print(fruits[0])            # apple
print(fruits[-1])           # orange (last item)

# List methods
fruits.append("grape")      # add to end
fruits.insert(1, "mango")   # add at position 1
fruits.remove("apple")      # remove by value
length = len(fruits)        # 4
~~~

## Dictionary (Key-Value Pairs)
~~~
student = {
  "name": "Alice",
  "age": 20,
  "gpa": 3.8
}

# Access by key
print(student["name"])      # Alice

# Add or update
student["major"] = "Computer Science"
student["age"] = 21

# Check if key exists
if "name" in student:
  print(student["name"])
~~~`,
      challenge: 'Create a person dictionary with name, age, city, and email. Print each field.',
      checks: [
        { label: 'Creates a dictionary with {}', in: 'js', re: /\{.*[":]/s },
        { label: 'Has at least 4 key-value pairs', in: 'js', re: /(["']?\w+["']?\s*[:=]\s*["']?\w+["']?).*\n.*(["']?\w+["']?\s*[:=]\s*["']?\w+["']?)/ },
        { label: 'Accesses dictionary values', in: 'js', re: /\[\s*["']\w+["']\s*\]|\.get\s*\(/ },
      ],
      hints: ['Use student["name"] or student.get("name") to access values.'],
      quiz: [
        { q: 'What data type is 3.14?', options: ['float', 'int', 'string', 'number'], why: 'Decimal numbers are floats.' },
        { q: 'Which data structure uses key-value pairs?', options: ['Dictionary', 'List', 'Tuple', 'Set'], why: 'Dictionaries map keys to values.' },
        { q: 'What is the first index in a list?', options: ['0', '1', '-1', 'undefined'], why: 'Python indexing starts at 0.' },
      ],
      oral: 'Explain the difference between a list and a dictionary with examples.',
    },
    {
      title: 'Control Structures', minutes: 90,
      content: `Control structures (if, for, while) direct program flow.

## if-elif-else
~~~
score = 75
if score >= 80:
    print("Distinction")
elif score >= 60:
    print("Credit")
elif score >= 40:
    print("Pass")
else:
    print("Fail")
~~~

## Comparison and Logical Operators
{{==}}, {{!=}}, {{>}}, {{<}}, {{>=}}, {{<=}}
{{and}}, {{or}}, {{not}}

~~~
age = 20
has_id = True
if age >= 18 and has_id:
    print("Can vote")
~~~

## for Loop
Iterate over a sequence:
~~~
numbers = [1, 2, 3, 4, 5]
for num in numbers:
    print(num * 2)      # 2, 4, 6, 8, 10

# range() generates numbers
for i in range(1, 6):   # 1, 2, 3, 4, 5
    print(i)

# Access index
fruits = ["apple", "banana", "orange"]
for index, fruit in enumerate(fruits):
    print(index, fruit)  # 0 apple, 1 banana, 2 orange
~~~

## while Loop
Repeat while condition is true:
~~~
count = 0
while count < 3:
    print("Hello")
    count += 1
~~~

## Loop Control
~~~
for i in range(10):
    if i == 3:
        continue    # skip to next iteration
    if i == 7:
        break       # exit loop
    print(i)        # prints 0, 1, 2, 4, 5, 6
~~~

## Nested Loops
~~~
for i in range(3):
    for j in range(2):
        print(i, j)
# Outputs: (0,0), (0,1), (1,0), (1,1), (2,0), (2,1)
~~~

## List Comprehension
Concise way to create lists:
~~~
squares = [x**2 for x in range(5)]   # [0, 1, 4, 9, 16]
even = [x for x in range(10) if x % 2 == 0]   # [0, 2, 4, 6, 8]
~~~`,
      challenge: 'Write a program that prints all numbers from 1 to 20 that are divisible by 3.',
      checks: [
        { label: 'Uses a loop', in: 'js', re: /for.*in\s+range|while/ },
        { label: 'Checks divisibility with %', in: 'js', re: /%\s*3/ },
        { label: 'Prints matching numbers', in: 'js', re: /print/ },
      ],
      hints: ['Use % (modulo) to check if a number is divisible by 3: n % 3 == 0.'],
      quiz: [
        { q: 'What does range(1, 6) produce?', options: ['[1, 2, 3, 4, 5]', '[1, 2, 3, 4, 5, 6]', '[0, 1, 2, 3, 4, 5]', '[1, 6]'], why: 'range(1, 6) produces 1 to 5 (end is exclusive).' },
        { q: 'What does "and" do in a condition?', options: ['Both conditions must be true', 'At least one must be true', 'The first must be true', 'Neither must be true'], why: 'and requires all conditions to be true.' },
        { q: 'What does continue do?', options: ['Skips to the next iteration', 'Exits the loop', 'Pauses the loop', 'Restarts the loop'], why: 'continue jumps to the next iteration.' },
      ],
      oral: 'Explain how you would use a for loop to sum the numbers 1 through 100.',
    },
  ],
};

const M113 = {
  id: 113, order: 13, icon: '📊', color: '#3776ab', difficulty: 'intermediate', hours: 32,
  title: 'Functions and Data Analysis',
  description: 'Defining functions, using NumPy and Pandas for data processing and analysis.',
  lessons: [
    {
      title: 'Functions in Python', minutes: 75,
      content: `Functions are reusable blocks of code.

## Defining Functions
~~~
def greet(name):
    print("Hello, " + name)

greet("Alice")
greet("Bob")
~~~

## Return Values
~~~
def add(a, b):
    return a + b

result = add(5, 3)
print(result)    # 8
~~~

## Default Parameters
~~~
def introduce(name, age=18):
    print(name + " is " + str(age) + " years old")

introduce("Alice")          # age defaults to 18
introduce("Bob", 25)        # age is 25
~~~

## Multiple Return Values
~~~
def divide(a, b):
    if b == 0:
        return None
    quotient = a // b
    remainder = a % b
    return quotient, remainder

q, r = divide(17, 5)
print(q, r)    # 3 1
~~~

## Docstrings (Documentation)
~~~
def calculate_grade(score):
    """
    Convert a score to a grade.
    Args: score (int) - 0 to 100
    Returns: grade (str) - "A", "B", "C", etc.
    """
    if score >= 80:
        return "A"
    elif score >= 60:
        return "B"
    else:
        return "C"
~~~

## Scope
Variables inside a function are local (not accessible outside):
~~~
def test():
    local_var = 10
    return local_var

x = test()
# print(local_var)  # Error: undefined
~~~

## *args and **kwargs
Accept any number of arguments:
~~~
def sum_all(*numbers):
    total = 0
    for num in numbers:
        total += num
    return total

print(sum_all(1, 2, 3))        # 6
print(sum_all(10, 20, 30, 40)) # 100
~~~`,
      challenge: 'Write a function that takes a list of numbers and returns the average.',
      checks: [
        { label: 'Defines a function with def', in: 'js', re: /def\s+\w+\s*\(/ },
        { label: 'Takes a list parameter', in: 'js', re: /def.*\(.*\)/ },
        { label: 'Uses sum() or loop to add', in: 'js', re: /sum\s*\(|for.*in.*:[\s\S]*\+=/ },
        { label: 'Returns the average', in: 'js', re: /return.*\/|return.*len/ },
      ],
      hints: ['sum(list) adds all items. len(list) counts items. Average = sum / count.'],
      quiz: [
        { q: 'What keyword defines a function?', options: ['def', 'function', 'func', 'define'], why: 'def starts a function definition.' },
        { q: 'What must follow a function definition line?', options: ['Indented code', 'Curly braces', 'A semicolon', 'return'], why: 'Function bodies are indented.' },
        { q: 'What scope does a local variable have?', options: ['Only inside the function', 'The whole program', 'The whole file', 'Global'], why: 'Local variables exist only in their function.' },
      ],
      oral: 'Explain how to call your average function with [80, 90, 85, 95].',
    },
    {
      title: 'NumPy and Data Processing', minutes: 90,
      content: `NumPy is a library for numerical computing and working with arrays.

## Installation
{{pip install numpy}}

## Creating Arrays
~~~
import numpy as np

# From a list
arr = np.array([1, 2, 3, 4, 5])

# Generate sequences
zeros = np.zeros(5)              # [0. 0. 0. 0. 0.]
ones = np.ones(3)               # [1. 1. 1.]
arange = np.arange(0, 10, 2)    # [0, 2, 4, 6, 8]
linspace = np.linspace(0, 1, 5) # [0. 0.25 0.5 0.75 1.]
~~~

## Array Operations
~~~
arr = np.array([1, 2, 3, 4, 5])

# Element-wise operations (apply to each element)
print(arr * 2)         # [2 4 6 8 10]
print(arr + 10)        # [11 12 13 14 15]
print(np.sqrt(arr))    # [1. 1.41... 1.73... 2. 2.23...]

# Aggregations (combine elements)
print(np.sum(arr))     # 15
print(np.mean(arr))    # 3.0
print(np.max(arr))     # 5
print(np.min(arr))     # 1
print(np.std(arr))     # standard deviation
~~~

## 2D Arrays (Matrices)
~~~
matrix = np.array([
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9]
])

print(matrix[0, 1])    # 2 (row 0, col 1)
print(matrix[1])       # [4 5 6] (row 1)
print(matrix[:, 1])    # [2 5 8] (column 1)
~~~

## Indexing and Slicing
~~~
arr = np.arange(10)    # [0 1 2 3 4 5 6 7 8 9]
print(arr[2:5])        # [2 3 4]
print(arr[::2])        # [0 2 4 6 8] (every 2nd element)
print(arr[::-1])       # [9 8 7 6 5 4 3 2 1 0] (reversed)
~~~

## Boolean Indexing (Filtering)
~~~
arr = np.array([1, 5, 3, 8, 2, 9, 4])
mask = arr > 4
print(mask)            # [False True False True False True False]
print(arr[mask])       # [5 8 9]
~~~

## Random Numbers (useful for ML)
~~~
random_arr = np.random.rand(5)           # 5 random floats [0, 1)
random_int = np.random.randint(1, 7, 10) # 10 random ints [1, 7)
~~~`,
      challenge: 'Create a NumPy array [10, 20, 30, 40, 50], calculate mean and standard deviation.',
      checks: [
        { label: 'Imports numpy', in: 'js', re: /import\s+numpy|from\s+numpy/ },
        { label: 'Creates an array', in: 'js', re: /np\.array/ },
        { label: 'Uses np.mean()', in: 'js', re: /np\.mean|\.mean\(\)/ },
        { label: 'Uses np.std()', in: 'js', re: /np\.std|\.std\(\)/ },
      ],
      hints: ['Import with {{import numpy as np}}. Then use {{np.mean()}} and {{np.std()}}.'],
      quiz: [
        { q: 'What is NumPy used for?', options: ['Numerical computing with arrays', 'Web development', 'Database design', 'Graphics'], why: 'NumPy specialises in numerical array operations.' },
        { q: 'Which function computes the average of an array?', options: ['np.mean()', 'np.average()', 'np.sum()', 'All of the above'], why: 'np.mean() calculates the average.' },
        { q: 'How do you create an array of 5 zeros?', options: ['np.zeros(5)', 'np.array(0, 5)', 'np.zero(5)', 'np.empty(5)'], why: 'np.zeros(5) creates [0 0 0 0 0].' },
      ],
      oral: 'Explain what standard deviation tells you about a dataset.',
    },
    {
      title: 'Pandas for Data Analysis', minutes: 90,
      content: `Pandas is a library for data manipulation and analysis. It works with structured data (like spreadsheets).

## Installation
{{pip install pandas}}

## Series (1D Data)
~~~
import pandas as pd

# From a list
sales = pd.Series([100, 150, 200, 175, 225])
print(sales)
# 0    100
# 1    150
# ...

# With custom index (labels)
sales = pd.Series(
  [100, 150, 200],
  index=['Jan', 'Feb', 'Mar']
)
print(sales['Feb'])   # 150
~~~

## DataFrame (2D Table)
~~~
data = {
  'name': ['Alice', 'Bob', 'Charlie'],
  'age': [25, 30, 35],
  'salary': [50000, 60000, 70000]
}
df = pd.DataFrame(data)

print(df)
# Column access
print(df['name'])
# print(df.name)  # alternative

# Row access
print(df.loc[0])    # first row
print(df.iloc[0])   # by position

# Shape
print(df.shape)     # (3, 3) = 3 rows, 3 columns
~~~

## Basic Statistics
~~~
df = pd.DataFrame({
  'product': ['A', 'B', 'C'],
  'sales': [1000, 1500, 2000]
})

print(df['sales'].sum())      # total
print(df['sales'].mean())     # average
print(df['sales'].max())      # maximum
print(df['sales'].describe()) # summary stats
~~~

## Filtering Data
~~~
df = pd.DataFrame({
  'name': ['Alice', 'Bob', 'Charlie'],
  'age': [25, 30, 35]
})

# Filter rows where age > 25
over_25 = df[df['age'] > 25]
print(over_25)
# Shows Bob and Charlie
~~~

## Reading and Writing Files
~~~
# Read CSV
df = pd.read_csv('data.csv')

# Write to CSV
df.to_csv('output.csv', index=False)

# Read Excel
df = pd.read_excel('data.xlsx')
~~~`,
      challenge: 'Create a DataFrame with student names and scores. Calculate the average score.',
      checks: [
        { label: 'Imports pandas', in: 'js', re: /import\s+pandas|from\s+pandas/ },
        { label: 'Creates a DataFrame', in: 'js', re: /pd\.DataFrame|DataFrame\s*\(/ },
        { label: 'Accesses a column', in: 'js', re: /\[\s*['"][^'"]+["']\s*\]|\.loc|\.iloc/ },
        { label: 'Calculates mean', in: 'js', re: /\.mean\s*\(\)|np\.mean|\.average/ },
      ],
      hints: ['df = pd.DataFrame({...}) to create. df["column"].mean() to average.'],
      quiz: [
        { q: 'What is a DataFrame?', options: ['A 2D table (like spreadsheet)', 'A single column', 'A list', 'A dictionary'], why: 'DataFrames are 2D structures with rows and columns.' },
        { q: 'How do you read a CSV file in Pandas?', options: ['pd.read_csv()', 'pd.open_csv()', 'pd.import_csv()', 'pd.load_csv()'], why: 'pd.read_csv() loads CSV data.' },
        { q: 'What does df.shape tell you?', options: ['Number of rows and columns', 'File size', 'Data types', 'Column names'], why: 'shape returns (rows, columns).' },
      ],
      oral: 'Explain how to filter a dataset to show only students with scores above 70.',
    },
  ],
};

const M114 = {
  id: 114, order: 14, icon: '🤖', color: '#3776ab', difficulty: 'advanced', hours: 36,
  title: 'Machine Learning with Python',
  description: 'Introduction to machine learning, algorithms (K-Nearest Neighbours, Naïve Bayes), and building predictive models.',
  lessons: [
    {
      title: 'Machine Learning Fundamentals', minutes: 90,
      content: `Machine Learning teaches computers to learn from data and make predictions.

## Three Types of Machine Learning
1. {{Supervised Learning}}: learn from labeled examples (input + correct output)
   - Example: predicting house price from features (size, bedrooms, etc.)
   - Used for: classification (category prediction), regression (number prediction)

2. {{Unsupervised Learning}}: find patterns in data without labels
   - Example: grouping customers by buying behaviour
   - Used for: clustering, dimensionality reduction

3. {{Reinforcement Learning}}: learn by trial and error (reward/penalty)
   - Example: teaching a robot to walk
   - Used for: game AI, robotics

## Key Concepts
- {{Training data}}: data used to teach the model
- {{Test data}}: data used to evaluate the model (not seen during training)
- {{Features}}: input variables (age, income, education level)
- {{Target}}: output variable (approved for loan? yes/no)
- {{Accuracy}}: % of correct predictions
- {{Overfitting}}: model memorizes training data instead of learning patterns

## Workflow
1. Collect data (clean, remove errors)
2. Prepare data (split into training/test)
3. Choose algorithm
4. Train model (learn from training data)
5. Test model (check accuracy on test data)
6. Use model to predict new data

## Example: Predicting Loan Approval
Features: age, income, credit_score
Target: approved (1) or denied (0)

Train on 100 past applications → model learns patterns → predict for new applicants`,
      challenge: 'List three real-world problems where machine learning could help (one for each type).',
      checks: [
        { label: 'Mentions supervised learning', in: 'js', re: /supervised|labeled|classification|regression/i },
        { label: 'Mentions unsupervised learning', in: 'js', re: /unsupervised|unlabeled|clustering|pattern/i },
        { label: 'Mentions reinforcement learning', in: 'js', re: /reinforcement|trial|error|reward|robot/i },
      ],
      hints: ['Think of prediction (supervised), grouping (unsupervised), and learning by reward (reinforcement).'],
      quiz: [
        { q: 'What is supervised learning?', options: ['Learning from labeled data', 'Learning without labels', 'Learning by reward', 'Learning from images only'], why: 'Supervised learning uses labeled examples.' },
        { q: 'Which type groups similar data points?', options: ['Unsupervised (clustering)', 'Supervised', 'Reinforcement', 'Regression'], why: 'Clustering is an unsupervised technique.' },
        { q: 'Why split data into training and test sets?', options: ['To check if model generalizes to new data', 'To make training faster', 'To use more data', 'Standard practice'], why: 'Test data measures real-world performance.' },
      ],
      oral: 'Explain supervised and unsupervised learning with two different examples.',
    },
    {
      title: 'K-Nearest Neighbours (KNN)', minutes: 90,
      content: `K-Nearest Neighbours is a simple, effective supervised learning algorithm.

## How KNN Works
Predict the class of a new point by looking at the {{K}} closest training examples:
1. Calculate distance from new point to all training points
2. Find the K nearest points
3. Take a vote: the most common class among K neighbours wins

{{Example: K=3}}
New point (income=5000, credit_score=600)
- Nearest 3 neighbours: 2 approve, 1 reject
- Prediction: Approve

## Distance Metric
Most common: {{Euclidean distance}}
~~~
distance = √((x₂-x₁)² + (y₂-y₁)²)
~~~

## Scikit-Learn
~~~
from sklearn.neighbors import KNeighborsClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score

# Create toy data
X = [[1, 2], [3, 4], [5, 6], [7, 8]]
y = [0, 0, 1, 1]  # labels

# Split data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)

# Create and train model
model = KNeighborsClassifier(n_neighbors=3)
model.fit(X_train, y_train)

# Make predictions
predictions = model.predict(X_test)

# Evaluate
accuracy = accuracy_score(y_test, predictions)
print("Accuracy:", accuracy)
~~~

## Choosing K
- {{K=1}}: very flexible, may overfit (memorize training data)
- {{K=3, 5}}: balanced (often used)
- {{K=large}}: smoother, may underfit (miss patterns)

## Advantages and Disadvantages
Advantages:
- Simple to understand and implement
- No training needed (lazy learner)
- Works with any type of data

Disadvantages:
- Slow with large datasets (checks all points)
- Sensitive to irrelevant features
- Sensitive to the scale of features (normalize first)`,
      challenge: 'Write pseudocode or explanation for KNN algorithm with K=3 for predicting iris flower type.',
      checks: [
        { label: 'Mentions calculating distance', in: 'js', re: /distance|euclidean|calculate/i },
        { label: 'Mentions finding K nearest', in: 'js', re: /K|nearest|3|neighbours/i },
        { label: 'Mentions voting/majority', in: 'js', re: /vote|major|common|most|frequent/i },
      ],
      hints: ['KNN: 1) find distance, 2) pick K closest, 3) vote on class.'],
      quiz: [
        { q: 'What does KNN stand for?', options: ['K-Nearest Neighbours', 'Kernel Neural Network', 'Key Next Node', 'Known Network Knowledge'], why: 'KNN finds the K nearest training points.' },
        { q: 'If K=1, what happens?', options: ['The prediction is the class of the single nearest point', 'Takes average of all points', 'No learning occurs', 'Very robust'], why: 'K=1 is the most flexible but prone to overfitting.' },
        { q: 'Which library provides KNN?', options: ['scikit-learn', 'numpy', 'pandas', 'tensorflow'], why: 'sklearn.neighbors has KNeighborsClassifier.' },
      ],
      oral: 'Explain how K-Nearest Neighbours would predict if a new customer will approve a loan.',
    },
    {
      title: 'Naïve Bayes Algorithm', minutes: 90,
      content: `Naïve Bayes is a probabilistic classifier based on Bayes' theorem.

## Bayes' Theorem
{{P(A|B) = P(B|A) × P(A) / P(B)}}

Applied to classification:
{{P(Class|Features) = P(Features|Class) × P(Class) / P(Features)}}

Simple version: pick the class with highest probability

## "Naïve" Assumption
Assumes all features are independent (naive assumption - often not true in reality):
- Text classification: words are independent (not quite true)
- Iris: petal length and width are not independent
- Despite this, Naïve Bayes works well in practice

## Example: Email Spam Detection
Training data:
- Spam: "BUY NOW", "CLICK HERE", "FREE"
- Ham (normal): "meeting tomorrow", "coffee", "hello"

For a new email "BUY NOW":
- P(Spam | "BUY NOW") = High
- P(Ham | "BUY NOW") = Low
- Predict: Spam

## Scikit-Learn Implementation
~~~
from sklearn.naive_bayes import GaussianNB
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score

# Create data
X = [[5.1, 3.5], [7.0, 3.2], [6.3, 2.9]]
y = [0, 1, 1]

# Split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3)

# Train
model = GaussianNB()
model.fit(X_train, y_train)

# Predict
y_pred = model.predict(X_test)

# Evaluate
accuracy = accuracy_score(y_test, y_pred)
print("Accuracy:", accuracy)
~~~

## Variants
- {{GaussianNB}}: for continuous features (like heights, weights)
- {{MultinomialNB}}: for counts (word frequencies in text)
- {{BernoulliNB}}: for binary features (presence/absence)

## Advantages
- Fast training and prediction
- Works well with small datasets
- Handles high-dimensional data well (many features)
- Good for text classification

## Disadvantages
- "Naïve" independence assumption often wrong
- Less accurate than complex models if features are dependent
- May assign zero probability (use smoothing)`,
      challenge: 'Write pseudocode for Naïve Bayes applied to predicting customer churn (stay or leave).',
      checks: [
        { label: 'Mentions probability or Bayes', in: 'js', re: /probabilit|bayes|p\(|probability/i },
        { label: 'Mentions independence assumption', in: 'js', re: /independent|naive|assume/i },
        { label: 'Mentions training and predicting', in: 'js', re: /train|predict|learn/i },
      ],
      hints: ['Naïve Bayes calculates probability of class given features, assuming independence.'],
      quiz: [
        { q: 'What theorem does Naïve Bayes use?', options: ["Bayes' theorem", "Pythagorean theorem", "Central limit theorem", "Law of large numbers"], why: "Naïve Bayes applies Bayes' theorem." },
        { q: 'Which Naïve Bayes variant handles text?', options: ['MultinomialNB', 'GaussianNB', 'BernoulliNB', 'All of them'], why: 'MultinomialNB is designed for word counts.' },
        { q: 'Why is Naïve Bayes "naive"?', options: ['Assumes features are independent', 'Simple implementation', 'Works only on small data', 'No training needed'], why: 'The assumption that features are independent is often naive.' },
      ],
      oral: 'Explain how Naïve Bayes would classify an email as spam or ham.',
    },
  ],
};

module.exports = { M112, M113, M114 };
