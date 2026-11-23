'use strict';
/**
 * Adult course - Database Management (modules 115-117).
 * Based on TVET CDACC Unit: ICT/OS/CS/CR/05/6/A "Demonstrate Database Management Skills"
 *
 * Lesson format: see java.js
 */

const M115 = {
  id: 115, order: 15, icon: '🗄️', color: '#336791', difficulty: 'beginner', hours: 28,
  title: 'Database Fundamentals',
  description: 'Understanding databases, data structures, relational model, and SQL basics.',
  lessons: [
    {
      title: 'What is a Database?', minutes: 60,
      content: `A database is an organized collection of structured data stored and accessed electronically.

## Why Databases?
- Reliability: backup and recovery mechanisms
- Efficiency: fast queries even on millions of records
- Concurrency: multiple users access data simultaneously without conflicts
- Security: protect sensitive information with permissions
- Scalability: grow from thousands to billions of records

## Example Uses
- Banking: account balances, transactions
- Hospitals: patient records, appointments
- E-commerce: product catalogues, orders
- Social networks: user profiles, connections

## Types of Databases
1. {{Relational}}: organized in tables with rows and columns (SQL Server, PostgreSQL, MySQL)
2. {{NoSQL}}: flexible structure (MongoDB, Cassandra) - for big data, real-time
3. {{Graph}}: relationships between entities (Neo4j) - for social networks, recommendations
4. {{Document}}: store JSON-like documents (CouchDB)

This course focuses on {{Relational Databases}}.

## Key Concepts
- {{Record}}: one row of data (a customer, a transaction)
- {{Field}}: one column (customer name, email)
- {{Table}}: collection of related records
- {{Database}}: collection of related tables
- {{Schema}}: structure (which tables, fields, relationships)

## Relational Model
Data stored in tables. Each table has:
- Rows (records): each is unique
- Columns (fields): each has a data type (text, number, date)
- Primary key: unique identifier for each row

## DBMS (Database Management System)
Software that manages databases:
- Create, modify, delete tables
- Insert, update, delete data
- Query data efficiently
- Enforce security and backups

Examples: MySQL, PostgreSQL, SQL Server, SQLite`,
      challenge: 'List three real-world businesses and the tables you would create for their database.',
      checks: [
        { label: 'Mentions three businesses', in: 'js', re: /[\w\s]+(store|bank|hospital|school|restaurant|hotel)/i },
        { label: 'Mentions multiple tables', in: 'js', re: /(customers?|orders?|products?|employees?|accounts?|patients?){2,}/i },
        { label: 'Describes at least one field', in: 'js', re: /field|column|name|id|date|email|address/i },
      ],
      hints: ['Think of a bank: tables for customers, accounts, transactions. A hospital: patients, doctors, appointments.'],
      quiz: [
        { q: 'What is a primary key?', options: ['A unique identifier for each row', 'The main table', 'The first column', 'A password'], why: 'Primary key uniquely identifies each record.' },
        { q: 'Which is a Relational Database Management System?', options: ['MySQL', 'MongoDB', 'Redis', 'Hadoop'], why: 'MySQL is a popular relational DBMS.' },
        { q: 'What is the advantage of databases over spreadsheets?', options: ['Handle millions of records efficiently, enforce security', 'Easier to use', 'Free of charge', 'Only one'], why: 'Databases scale and enforce data integrity better.' },
      ],
      oral: 'Explain what a relational database is and give an example of a real-world table.',
    },
    {
      title: 'Relational Model and Database Design', minutes: 90,
      content: `The relational model organises data to minimize redundancy and maintain integrity.

## Entities and Relationships
An {{entity}} is something we track (Customer, Order, Product). A {{relationship}} is a connection between entities.

## Entity-Relationship (ER) Model
Visual design before creating tables. Shows entities as boxes and relationships as lines.

{{Example}}
~~~
┌─────────────┐          ┌─────────┐
│  Customer   │          │  Order  │
├─────────────┤          ├─────────┤
│ customer_id │◄─────────│ order_id│
│ name        │ 1    *   │ order_date│
│ email       │          │ total   │
└─────────────┘          └─────────┘

One customer can have many orders.
~~~

## Table Structure
~~~
CREATE TABLE Customers (
  customer_id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE,
  phone VARCHAR(20),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Orders (
  order_id INT PRIMARY KEY AUTO_INCREMENT,
  customer_id INT NOT NULL,
  order_date DATE,
  total DECIMAL(10, 2),
  FOREIGN KEY (customer_id) REFERENCES Customers(customer_id)
);
~~~

## Keys
- {{Primary Key (PK)}}: uniquely identifies a row (e.g., customer_id)
- {{Foreign Key (FK)}}: references a PK in another table (links tables together)
- {{Unique Key}}: ensures no duplicates (e.g., email)

## Relationships
1. {{One-to-Many}} (1:*): One customer has many orders
   - Most common
   - FK in the "many" table points to PK in the "one" table

2. {{One-to-One}} (1:1): One person has one passport
   - FK in either table

3. {{Many-to-Many}} (*:*): Many students enroll in many courses
   - Requires a {{junction table}}
   ~~~
   Student ──┬────── Enrollment ────┬──── Course
             │   student_id   │     course_id  │
             │   course_id    │
   ~~~

## Normalization
Process of organizing data to reduce redundancy:

{{First Normal Form (1NF)}}: Remove repeating groups
- Each field holds only one value (not a list)

{{Second Normal Form (2NF)}}: 1NF + remove partial dependencies
- Non-key fields depend on the entire primary key

{{Third Normal Form (3NF)}}: 2NF + remove transitive dependencies
- Non-key fields depend only on the PK

Example of denormalization (bad):
~~~
Order(order_id, customer_name, customer_email, customer_phone, ...)
╲ Repeats customer info for each order → redundancy
~~~

Normalized (good):
~~~
Customer(customer_id, name, email, phone)
Order(order_id, customer_id, order_date)
╲ Each customer stored once, FK links orders
~~~`,
      challenge: 'Draw an ER diagram for a library system: Library, Book, Member, BorrowRecord. Show relationships.',
      checks: [
        { label: 'Mentions four entities', in: 'js', re: /(library|book|member|borrowrecord)/i },
        { label: 'Shows at least two relationships', in: 'js', re: /(has|contains|borrows|many)/i },
        { label: 'Mentions primary or foreign keys', in: 'js', re: /(primary key|foreign key|pk|fk|id)/i },
      ],
      hints: ['A library has many books. A member borrows many books over time. Each borrow record links member, book, and date.'],
      quiz: [
        { q: 'What is a foreign key?', options: ['A reference to a primary key in another table', 'A key that is hidden', 'The main identifier', 'A temporary key'], why: 'FK creates relationships between tables.' },
        { q: 'Which relationship is "many students, many courses"?', options: ['Many-to-Many', 'One-to-Many', 'One-to-One', 'Many-to-One'], why: 'Many students can enroll in many courses.' },
        { q: 'What does normalization reduce?', options: ['Data redundancy', 'Query speed', 'Table count', 'Storage size'], why: 'Normalization minimizes storing the same data multiple times.' },
      ],
      oral: 'Explain a one-to-many relationship with an example (e.g., customers and orders).',
    },
    {
      title: 'SQL Basics: SELECT and WHERE', minutes: 75,
      content: `SQL (Structured Query Language) retrieves and manipulates data.

## SELECT: Retrieve Data
~~~
SELECT * FROM Customers;              # All rows, all columns
SELECT name, email FROM Customers;    # Specific columns
SELECT DISTINCT city FROM Customers;  # Unique cities only
~~~

## WHERE: Filter Rows
~~~
SELECT * FROM Customers WHERE age >= 18;
SELECT * FROM Orders WHERE total > 1000;
SELECT * FROM Orders WHERE order_date BETWEEN '2024-01-01' AND '2024-12-31';
~~~

## Comparison Operators
{{=}}, {{!=}}, {{<}}, {{>}}, {{<=}}, {{>=}}
{{LIKE}} (pattern matching), {{IN}}, {{BETWEEN}}

~~~
SELECT * FROM Products WHERE price > 100;
SELECT * FROM Customers WHERE name LIKE 'A%';    # Names starting with A
SELECT * FROM Customers WHERE city IN ('Nairobi', 'Mombasa');
~~~

## Logical Operators
{{AND}}, {{OR}}, {{NOT}}

~~~
SELECT * FROM Customers 
WHERE age >= 18 AND city = 'Nairobi';

SELECT * FROM Orders 
WHERE status = 'completed' OR status = 'pending';

SELECT * FROM Products 
WHERE NOT (price < 50);
~~~

## ORDER BY: Sort Results
~~~
SELECT * FROM Products ORDER BY price;              # Ascending
SELECT * FROM Products ORDER BY price DESC;         # Descending
SELECT * FROM Customers ORDER BY last_name, first_name;  # Multiple columns
~~~

## LIMIT: Restrict Rows
~~~
SELECT * FROM Customers LIMIT 10;              # First 10 rows
SELECT * FROM Customers LIMIT 10 OFFSET 20;    # Skip 20, get next 10 (pagination)
~~~

## Aggregate Functions
{{COUNT()}}, {{SUM()}}, {{AVG()}}, {{MIN()}}, {{MAX()}}

~~~
SELECT COUNT(*) FROM Orders;
SELECT AVG(price) FROM Products;
SELECT MAX(salary) FROM Employees;
~~~

## GROUP BY and HAVING
~~~
SELECT department, COUNT(*) FROM Employees 
GROUP BY department;
# Count employees by department

SELECT department, AVG(salary) FROM Employees 
GROUP BY department 
HAVING AVG(salary) > 50000;
# Show departments with average salary > 50,000
~~~`,
      challenge: 'Write SQL to list all products priced 100-500, ordered by price (lowest first), limit 20.',
      checks: [
        { label: 'Uses SELECT', in: 'js', re: /SELECT/i },
        { label: 'Uses WHERE with BETWEEN or >= and <=', in: 'js', re: /(BETWEEN|>=|<=)/i },
        { label: 'Uses ORDER BY', in: 'js', re: /ORDER\s+BY/i },
        { label: 'Uses LIMIT', in: 'js', re: /LIMIT/i },
      ],
      hints: ['Pattern: SELECT... FROM... WHERE price BETWEEN 100 AND 500 ORDER BY price ASC LIMIT 20;'],
      quiz: [
        { q: 'Which clause filters rows?', options: ['WHERE', 'SELECT', 'ORDER BY', 'LIMIT'], why: 'WHERE filters rows based on conditions.' },
        { q: 'What does DISTINCT do?', options: ['Returns only unique values', 'Sorts results', 'Groups rows', 'Counts rows'], why: 'DISTINCT removes duplicates.' },
        { q: 'Which function counts rows?', options: ['COUNT()', 'SUM()', 'AVG()', 'MAX()'], why: 'COUNT() counts matching rows.' },
      ],
      oral: 'Explain how you would find customers from Nairobi who spent more than 10,000.',
    },
  ],
};

const M116 = {
  id: 116, order: 16, icon: '📝', color: '#336791', difficulty: 'intermediate', hours: 32,
  title: 'SQL DDL and Joins',
  description: 'Creating/altering tables (DDL), JOINs to combine data from multiple tables.',
  lessons: [
    {
      title: 'SQL DDL: CREATE, ALTER, DROP', minutes: 75,
      content: `DDL (Data Definition Language) creates and modifies table structure.

## CREATE TABLE
~~~
CREATE TABLE Customers (
  customer_id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  phone VARCHAR(20),
  age INT CHECK (age >= 0),
  city VARCHAR(50) DEFAULT 'Nairobi',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
~~~

## Constraints
- {{PRIMARY KEY}}: uniquely identifies each row
- {{UNIQUE}}: no duplicates (but can have NULL)
- {{NOT NULL}}: field must have a value
- {{CHECK}}: value must satisfy condition
- {{DEFAULT}}: default value if not specified
- {{FOREIGN KEY}}: reference to another table

## Data Types
- {{INT}}, {{BIGINT}}, {{DECIMAL(10,2)}}: numbers
- {{VARCHAR(100)}}, {{TEXT}}: text
- {{DATE}}, {{DATETIME}}, {{TIMESTAMP}}: date/time
- {{BOOLEAN}}: true/false

## ALTER TABLE: Modify Structure
~~~
ALTER TABLE Customers ADD COLUMN middle_name VARCHAR(50);
ALTER TABLE Customers DROP COLUMN phone;
ALTER TABLE Customers MODIFY COLUMN age INT DEFAULT 18;
ALTER TABLE Customers ADD CONSTRAINT chk_age CHECK (age >= 18);
~~~

## DROP TABLE
~~~
DROP TABLE Orders;         # Delete table and data
DROP TABLE IF EXISTS Temp; # Delete only if exists
~~~

## CREATE with FOREIGN KEY
~~~
CREATE TABLE Orders (
  order_id INT PRIMARY KEY AUTO_INCREMENT,
  customer_id INT NOT NULL,
  order_date DATE,
  total DECIMAL(10, 2),
  FOREIGN KEY (customer_id) REFERENCES Customers(customer_id)
    ON DELETE CASCADE   # delete orders if customer deleted
    ON UPDATE CASCADE   # update order if customer_id changes
);
~~~

## Best Practices
- Use meaningful names (not {{t1}}, {{col1}})
- Use correct data types (not TEXT for numbers)
- Add NOT NULL for essential fields
- Use FOREIGN KEY to maintain referential integrity`,
      challenge: 'Create a Students table: id (PK), name, enrollment_date, gpa, school_id (FK to Schools).',
      checks: [
        { label: 'Uses CREATE TABLE', in: 'js', re: /CREATE\s+TABLE/i },
        { label: 'Has primary key', in: 'js', re: /PRIMARY\s+KEY/i },
        { label: 'Has foreign key', in: 'js', re: /FOREIGN\s+KEY|REFERENCES/i },
        { label: 'Uses NOT NULL', in: 'js', re: /NOT\s+NULL/i },
      ],
      hints: ['Columns: student_id (INT, PK, AUTO_INCREMENT), name (VARCHAR, NOT NULL), enrollment_date (DATE), gpa (DECIMAL), school_id (INT, FK).'],
      quiz: [
        { q: 'Which constraint ensures no duplicate values?', options: ['UNIQUE', 'PRIMARY KEY', 'NOT NULL', 'CHECK'], why: 'UNIQUE prevents duplicates (NULL allowed); PK also prevents duplicates.' },
        { q: 'What is a FOREIGN KEY?', options: ['A reference to a PK in another table', 'An encrypted key', 'A temporary key', 'A backup key'], why: 'FK links tables and maintains referential integrity.' },
        { q: 'Which data type for email?', options: ['VARCHAR(100)', 'INT', 'DATE', 'BOOLEAN'], why: 'Email is text, so VARCHAR is appropriate.' },
      ],
      oral: 'Explain the difference between UNIQUE and PRIMARY KEY constraints.',
    },
    {
      title: 'SQL JOINs: Combining Tables', minutes: 90,
      content: `JOINs combine data from multiple tables using relationships.

## INNER JOIN (most common)
Returns rows with matching values in both tables.

~~~
SELECT Customers.name, Orders.order_id, Orders.total
FROM Customers
INNER JOIN Orders ON Customers.customer_id = Orders.customer_id
WHERE Orders.total > 1000;

╲ Shows customers and their orders (only customers who ordered)
~~~

## LEFT JOIN
All rows from left table + matching rows from right table (NULLs if no match).

~~~
SELECT Customers.name, Orders.order_id
FROM Customers
LEFT JOIN Orders ON Customers.customer_id = Orders.customer_id;

╲ Shows all customers even if they haven't ordered (order_id is NULL)
~~~

## RIGHT JOIN
All rows from right table + matching rows from left table.

~~~
SELECT Customers.name, Orders.order_id
FROM Customers
RIGHT JOIN Orders ON Customers.customer_id = Orders.customer_id;

╲ Shows all orders and their customers (rarely used; use LEFT JOIN instead)
~~~

## FULL OUTER JOIN
All rows from both tables. (Not in all DBMSs; use UNION instead)

~~~
SELECT * FROM Customers
FULL OUTER JOIN Orders ON Customers.customer_id = Orders.customer_id;

╲ All customers and all orders, NULLs where no match
~~~

## Cross Join
Cartesian product: every row from table A with every row from table B (rarely needed).

~~~
SELECT * FROM Customers CROSS JOIN Products;
~~~

## Multiple JOINs
~~~
SELECT 
  Customers.name,
  Orders.order_id,
  Products.product_name
FROM Customers
INNER JOIN Orders ON Customers.customer_id = Orders.customer_id
INNER JOIN OrderItems ON Orders.order_id = OrderItems.order_id
INNER JOIN Products ON OrderItems.product_id = Products.product_id;

╲ Customer → Order → OrderItem → Product (4-way join)
~~~

## Join Syntax Alternatives
~~~
-- Explicit JOIN (recommended)
SELECT * FROM A INNER JOIN B ON A.id = B.a_id;

-- Implicit JOIN (older style - use ON, not WHERE)
SELECT * FROM A, B WHERE A.id = B.a_id;
~~~

## Aliases
Shorter names for readability:
~~~
SELECT c.name, o.order_id
FROM Customers c
INNER JOIN Orders o ON c.customer_id = o.customer_id;
~~~

## Self Join
A table joined with itself (e.g., employee and their manager):
~~~
SELECT e.name AS employee, m.name AS manager
FROM Employees e
LEFT JOIN Employees m ON e.manager_id = m.employee_id;
~~~`,
      challenge: 'Write SQL to show all students and their schools, including students with no school assigned.',
      checks: [
        { label: 'Uses JOIN (any type)', in: 'js', re: /(INNER|LEFT|RIGHT|FULL|CROSS)?\s*JOIN/i },
        { label: 'Uses ON to match tables', in: 'js', re: /ON\s+\w+\.\w+\s*=\s*\w+\.\w+/ },
        { label: 'Selects from both tables', in: 'js', re: /students?|schools?/i },
      ],
      hints: ['LEFT JOIN Schools: students on left, so all students show (school is NULL if not assigned).'],
      quiz: [
        { q: 'What does INNER JOIN return?', options: ['Rows with matches in both tables', 'All rows from both tables', 'Only rows from the left table', 'Only rows from the right table'], why: 'INNER JOIN returns only matching rows.' },
        { q: 'Which JOIN shows all left table rows + matches from right?', options: ['LEFT JOIN', 'INNER JOIN', 'RIGHT JOIN', 'CROSS JOIN'], why: 'LEFT JOIN includes all left rows, even if no match.' },
        { q: 'When is CROSS JOIN useful?', options: ['Rarely; it produces a huge result set', 'Always use it', 'For filtering', 'For sorting'], why: 'CROSS JOIN multiplies rows, rarely needed.' },
      ],
      oral: 'Explain LEFT JOIN vs INNER JOIN with an example (customers and orders).',
    },
    {
      title: 'SQL DML: INSERT, UPDATE, DELETE', minutes: 75,
      content: `DML (Data Manipulation Language) modifies data.

## INSERT: Add Rows
~~~
INSERT INTO Customers (name, email, age, city)
VALUES ('Alice', 'alice@example.com', 28, 'Nairobi');

-- Multiple rows
INSERT INTO Customers (name, email, age) VALUES
  ('Bob', 'bob@example.com', 35),
  ('Charlie', 'charlie@example.com', 42);

-- From another table
INSERT INTO CustomerBackup
SELECT * FROM Customers WHERE created_at < '2023-01-01';
~~~

## UPDATE: Modify Data
~~~
UPDATE Customers SET age = 29 WHERE customer_id = 1;

UPDATE Customers 
SET city = 'Mombasa', age = age + 1 
WHERE country = 'Kenya';

-- Dangerous: updates ALL rows without WHERE
UPDATE Customers SET active = 0;  ⚠️
~~~

## DELETE: Remove Rows
~~~
DELETE FROM Customers WHERE customer_id = 5;

DELETE FROM Customers WHERE age < 18;

-- Dangerous: deletes ALL rows
DELETE FROM Customers;  ⚠️
~~~

## Transactions
Ensure all-or-nothing execution:
~~~
BEGIN TRANSACTION;
  UPDATE Accounts SET balance = balance - 100 WHERE account_id = 1;
  UPDATE Accounts SET balance = balance + 100 WHERE account_id = 2;
COMMIT;  -- both succeed or both fail

ROLLBACK;  -- undo changes
~~~

## Best Practices
- Always use WHERE (except for bulk operations)
- Test SELECT before UPDATE/DELETE with the same WHERE
- Use transactions for related operations
- Backup before major changes
- Use LIMIT to test before large operations

## Validating Updates
~~~
-- Bad: might violate constraints
UPDATE Customers SET email = NULL WHERE age < 18;

-- Good: check NOT NULL constraint first
UPDATE Customers SET email = 'student@school.com' WHERE age < 18 AND email IS NULL;
~~~`,
      challenge: 'Write SQL to insert 3 products, then update the price of one, then delete products below 50.',
      checks: [
        { label: 'Uses INSERT', in: 'js', re: /INSERT/i },
        { label: 'Uses UPDATE with WHERE', in: 'js', re: /UPDATE.*WHERE/i },
        { label: 'Uses DELETE with WHERE', in: 'js', re: /DELETE.*WHERE/i },
      ],
      hints: ['INSERT INTO Products (name, price) VALUES (...); UPDATE Products SET price=... WHERE...; DELETE FROM Products WHERE price < 50;'],
      quiz: [
        { q: 'What must follow UPDATE to avoid changing all rows?', options: ['WHERE clause', 'SELECT', 'LIMIT', 'ORDER BY'], why: 'WHERE limits which rows are updated.' },
        { q: 'What does ROLLBACK do?', options: ['Undoes changes in a transaction', 'Saves changes', 'Deletes rows', 'Closes database'], why: 'ROLLBACK reverts uncommitted changes.' },
        { q: 'Which is most dangerous?', options: ['DELETE FROM table;', 'UPDATE table SET...WHERE...', 'INSERT INTO table', 'SELECT * FROM table'], why: 'DELETE without WHERE deletes everything.' },
      ],
      oral: 'Explain the importance of WHERE clause in UPDATE and DELETE statements.',
    },
  ],
};

const M117 = {
  id: 117, order: 17, icon: '🔍', color: '#336791', difficulty: 'advanced', hours: 32,
  title: 'Advanced Queries and Indexing',
  description: 'Subqueries, views, stored procedures, indexing, and query optimization.',
  lessons: [
    {
      title: 'Subqueries and Views', minutes: 90,
      content: `Subqueries and views simplify complex queries and provide abstraction.

## Subqueries (Inner Queries)
A query inside another query:

~~~
-- Find customers who spent more than average
SELECT name, (SELECT AVG(total) FROM Orders) as avg_order
FROM Customers
WHERE customer_id IN (
  SELECT customer_id FROM Orders 
  WHERE total > (SELECT AVG(total) FROM Orders)
);

-- Scalar subquery (returns one value)
SELECT name FROM Customers 
WHERE age > (SELECT AVG(age) FROM Customers);

-- Table subquery (returns rows)
SELECT * FROM Customers 
WHERE customer_id IN (SELECT customer_id FROM Orders WHERE total > 1000);
~~~

## EXISTS
Check if rows exist:
~~~
SELECT name FROM Customers c
WHERE EXISTS (
  SELECT 1 FROM Orders o WHERE o.customer_id = c.customer_id
);

╲ Show customers who have at least one order
~~~

## Correlated Subquery
Subquery references columns from outer query:
~~~
SELECT name, age FROM Customers c1
WHERE age > (
  SELECT AVG(age) FROM Customers c2 
  WHERE c2.city = c1.city
);

╲ Customers older than average in their city
~~~

## UNION
Combine results from multiple queries:
~~~
SELECT name, 'Premium' as type FROM PremiumCustomers
UNION
SELECT name, 'Regular' as type FROM RegularCustomers;

UNION ALL  -- keeps duplicates; UNION removes them
~~~

## Views: Saved Queries
A virtual table created from a query:
~~~
CREATE VIEW HighValueOrders AS
SELECT o.order_id, c.name, o.total
FROM Orders o
INNER JOIN Customers c ON o.customer_id = c.customer_id
WHERE o.total > 5000;

-- Use it like a table
SELECT * FROM HighValueOrders;
SELECT * FROM HighValueOrders WHERE total > 10000;

-- Drop view
DROP VIEW HighValueOrders;
~~~

## Benefits of Views
- Simplify complex queries (hide complexity)
- Security (expose only needed columns)
- Reusable logic
- Abstraction (table structure can change)

## Example: Real Estate View
~~~
CREATE VIEW PropertyListings AS
SELECT 
  p.property_id,
  p.address,
  p.price,
  COUNT(v.viewing_id) as views
FROM Properties p
LEFT JOIN Viewings v ON p.property_id = v.property_id
GROUP BY p.property_id;

-- Now agents use: SELECT * FROM PropertyListings WHERE price < 1000000;
~~~`,
      challenge: 'Create a view showing students with grade GPA >= 3.5 and their school names.',
      checks: [
        { label: 'Uses CREATE VIEW', in: 'js', re: /CREATE\s+VIEW/i },
        { label: 'Uses SELECT with WHERE', in: 'js', re: /SELECT.*WHERE.*>=/i },
        { label: 'Uses JOIN', in: 'js', re: /JOIN/i },
      ],
      hints: ['CREATE VIEW HighAchievers AS SELECT s.name, sc.school_name FROM Students s JOIN Schools sc ON s.school_id = sc.school_id WHERE s.gpa >= 3.5;'],
      quiz: [
        { q: 'What is a view?', options: ['A virtual table created from a query', 'A physical table', 'A backup', 'A security log'], why: 'Views are saved queries that act like tables.' },
        { q: 'What does UNION do?', options: ['Combines results from multiple queries', 'Joins two tables', 'Creates a view', 'Updates rows'], why: 'UNION stacks query results vertically.' },
        { q: 'What is a correlated subquery?', options: ['A subquery that references the outer query', 'A subquery with UNION', 'A simple subquery', 'A view'], why: 'It references columns from the outer query.' },
      ],
      oral: 'Explain how you would use a view to simplify data access for non-technical users.',
    },
    {
      title: 'Indexing and Query Optimization', minutes: 90,
      content: `Indexing speeds up queries dramatically.

## What is an Index?
Like a book index: jumps to relevant pages instead of reading every page.

~~~
-- Without index: scan all 1 million customer rows (slow)
SELECT * FROM Customers WHERE email = 'alice@example.com';

-- With index on email: jump directly (fast)
CREATE INDEX idx_email ON Customers(email);
~~~

## Types of Indexes
1. {{Primary Key}}: automatic, unique, ordered
2. {{Unique Index}}: ensures no duplicates
3. {{Composite Index}}: index on multiple columns
4. {{Full-text Index}}: for text search

## Creating Indexes
~~~
-- Single column
CREATE INDEX idx_customer_id ON Orders(customer_id);
CREATE UNIQUE INDEX idx_email ON Customers(email);

-- Multiple columns
CREATE INDEX idx_order_date_total ON Orders(order_date, total);

-- Drop index
DROP INDEX idx_customer_id ON Orders;
~~~

## When to Index
✓ Columns used in WHERE, JOIN, ORDER BY
✓ Foreign keys
✓ Columns with many unique values
✓ Large tables

✗ Small tables (< 10,000 rows)
✗ Columns with few unique values (yes/no, gender)
✗ Updated frequently (index maintenance overhead)

## Example: Good Index
~~~
-- Customer queries: find by email, filter by city
CREATE INDEX idx_city ON Customers(city);
CREATE UNIQUE INDEX idx_email ON Customers(email);

-- Now these are fast:
SELECT * FROM Customers WHERE email = 'alice@example.com';
SELECT COUNT(*) FROM Customers WHERE city = 'Nairobi';
~~~

## EXPLAIN: Check Query Performance
~~~
EXPLAIN SELECT * FROM Orders WHERE customer_id = 5;

╲ Shows: type, possible indexes, rows examined
╲ Look for: "Using index" (good), "Using filesort" (slow)
~~~

## Query Optimization Tips
1. Use specific columns in SELECT (not *)
2. Add WHERE conditions to filter early
3. Index WHERE, JOIN, ORDER BY columns
4. Avoid functions in WHERE (prevents index use)
5. Join on indexed columns
6. Consider denormalization for read-heavy queries

## Example: Slow Query
~~~
SELECT * FROM Orders WHERE YEAR(order_date) = 2024;  -- Function prevents index use
╲ Better:
SELECT * FROM Orders WHERE order_date >= '2024-01-01' AND order_date < '2025-01-01';
~~~

## Execution Plan
Database shows how it executes a query:
- Seq Scan: reads entire table (slow)
- Index Scan: uses index (fast)
- Hash Join: matches rows quickly
- Sort: expensive operation (use ORDER BY wisely)`,
      challenge: 'Identify which columns in a Students table should be indexed and why.',
      checks: [
        { label: 'Mentions student_id', in: 'js', re: /student_id|id|primary\s+key/i },
        { label: 'Mentions lookup columns', in: 'js', re: /email|name|enrollment|foreign\s+key/i },
        { label: 'Explains reason', in: 'js', re: /(where|join|filter|lookup|search|fast)/i },
      ],
      hints: ['Primary key (student_id): automatic. Email: unique lookups. School_id: foreign key joins. Enrollment_date: range queries.'],
      quiz: [
        { q: 'What is an index?', options: ['A data structure that speeds up lookups', 'A table backup', 'A query log', 'A primary key'], why: 'Indexes act like a book index for fast searches.' },
        { q: 'Which type of query benefits most from indexes?', options: ['WHERE, JOIN, ORDER BY', 'Simple SELECT *', 'INSERT', 'UPDATE'], why: 'Indexes speed up filtering and joining.' },
        { q: 'When should you NOT create an index?', options: ['On small tables or low-cardinality columns', 'On foreign keys', 'On unique columns', 'On WHERE clauses'], why: 'Indexes have overhead; small tables don\'t benefit.' },
      ],
      oral: 'Explain how an index speeds up a query to find a customer by email.',
    },
  ],
};

module.exports = { M115, M116, M117 };
