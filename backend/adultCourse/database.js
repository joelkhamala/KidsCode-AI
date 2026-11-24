'use strict';
/**
 * Course 4 - Database Management (modules 115-117).
 * TVET CDACC Computer Science L6, ICT/CU/CS/CR/05/6/A "Database Management Skills":
 *   LO1 database fundamentals (relational model, RDBMS products, security), LO2 database design
 *   (ER modelling, normalisation, CRUD matrix), LO3 SQL (DDL, constraints, DML, joins),
 *   LO4 object-oriented databases, views and triggers, LO5 indexing and hashing,
 *   LO6 database applications (DSS, data mining, distributed databases, data warehouses).
 *
 * Practicals run on a fresh SQLite copy of the practice database (backend/sandbox/sampleDatabase.js):
 * Customers, Products, Orders, OrderItems, Employees, Schools, Students, Accounts.
 */

const M115 = {
  id: 115, order: 15, icon: '🗄️', color: '#336791', difficulty: 'beginner',
  title: 'Database Fundamentals and Design',
  description: 'The relational model, entity-relationship design, normalisation, security and integrity.',
  lessons: [
    {
      title: 'Databases and the Relational Model', minutes: 50,
      content: `A {{database}} is an organised collection of related data. A {{database management system (DBMS)}} - the {{database engine}} - stores it, keeps it consistent and answers questions about it.

## Why use a database instead of files?
- One copy of each fact: less duplication and fewer contradictions
- Many users at once, with access control
- Fast searching, sorting and summarising with SQL
- Backup, recovery and integrity rules built in

## The relational model
Data is stored in {{relations}} (tables):
- {{Attribute}} / column / {{field}}: one property, e.g. city
- {{Tuple}} / row / {{record}}: one item, e.g. one customer
- {{Domain}}: the allowed values of an attribute (age: whole numbers 0-120)
- {{Primary key (PK)}}: column(s) that uniquely identify each row (customer_id)
- {{Foreign key (FK)}}: a column that refers to another table's primary key (Orders.customer_id)

Properties of a relation: every row is unique, every value is {{atomic}} (one value per cell), and the order of rows and columns does not matter.

## RDBMS products
- {{Oracle}}: large enterprises, banks
- {{Microsoft SQL Server}}: businesses on Windows; installed with SQL Server Management Studio
- {{MySQL}} / MariaDB: websites and open-source systems
- {{Microsoft Access}}: small desktop databases
- {{SQLite}}: a database in one file, inside phones and apps - KidsCode's practice database uses it

## Your first query
~~~
SELECT name, city FROM Customers WHERE city = 'Mombasa';
~~~
{{SELECT}} chooses columns, {{FROM}} the table and {{WHERE}} filters rows. The practice database (see the panel beside the editor) is a fresh copy every time you press Run.`,
      example: { sql: `-- How many products are in each category?
SELECT category, COUNT(*) AS products
FROM Products
GROUP BY category;` },
      challenge: 'Write two queries. First list the name and city of every customer in Nairobi, sorted by name. Then count all customers with SELECT COUNT(*) AS customers FROM Customers;',
      checks: [
        { label: 'Filters with WHERE city = \'Nairobi\'', in: 'code', re: /WHERE\s+city\s*=\s*'Nairobi'/i },
        { label: 'Sorts with ORDER BY name', in: 'code', re: /ORDER\s+BY\s+name/i },
        { label: 'Returns the three Nairobi customers in order', in: 'output', re: /Amina Wanjiru \| Nairobi\nFaith Njeri \| Nairobi\nIan Kamau \| Nairobi/ },
        { label: 'Counts 12 customers', in: 'output', re: /customers\n12\b/ },
      ],
      hints: ['SELECT name, city FROM Customers WHERE city = \'Nairobi\' ORDER BY name;', 'End each statement with a semicolon.'],
      quiz: [
        { q: 'What uniquely identifies each row in a table?', options: ['The primary key', 'The foreign key', 'The first column', 'The table name'], why: 'A primary key value is unique for every row.' },
        { q: 'In the relational model, a row is also called a...', options: ['tuple', 'domain', 'attribute', 'relation'], why: 'Rows are tuples; columns are attributes.' },
        { q: 'Which product keeps a whole database in a single file inside apps and phones?', options: ['SQLite', 'Oracle', 'MS SQL Server', 'MySQL'], why: 'SQLite is an embedded, single-file database.' },
      ],
      oral: 'Explain primary keys and foreign keys using a school\'s students and classes as an example.',
      solution: { sql: `SELECT name, city FROM Customers WHERE city = 'Nairobi' ORDER BY name;
SELECT COUNT(*) AS customers FROM Customers;` },
    },
    {
      title: 'Database Design and ER Modelling', minutes: 60,
      content: `Good databases are designed before they are built. Database design has three phases:

## 1. Conceptual design - the Entity-Relationship Model (ERM)
- {{Entity}}: a thing we store data about (Member, Book)
- {{Attribute}}: a property of an entity (title, author)
- {{Relationship}}: how entities are linked (a Member borrows Books)
- {{Cardinality}}: one-to-one (1:1), one-to-many (1:N), many-to-many (M:N)

In {{UML}} notation each entity is a box listing its attributes, and lines show relationships with multiplicities such as {{1}} and {{0..*}}.

## 2. Logical design - tables
- Each entity becomes a table; each attribute a column
- A 1:N relationship becomes a foreign key on the "many" side
- An M:N relationship becomes a {{junction table}} with two foreign keys (Loans links Members and Books)

## 3. Physical design
Choose data types, indexes and storage for a particular DBMS.

~~~
CREATE TABLE Members (
  member_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);
CREATE TABLE Books (
  book_id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT
);
CREATE TABLE Loans (
  loan_id INTEGER PRIMARY KEY,
  member_id INTEGER NOT NULL REFERENCES Members(member_id),
  book_id INTEGER NOT NULL REFERENCES Books(book_id),
  loan_date TEXT
);
~~~

## Validating the model - the CRUD matrix
List each transaction against each table and mark whether it Creates, Reads, Updates or Deletes rows. Every table should be created by something and read by something; gaps show missing features.`,
      example: { sql: `-- 1:N - one school has many students
SELECT sc.name AS school, COUNT(st.student_id) AS students
FROM Schools sc
LEFT JOIN Students st ON st.school_id = sc.school_id
GROUP BY sc.name;` },
      challenge: 'Build the library design: create tables Members, Books and Loans (Loans has foreign keys to both). Insert member "Achieng", book "Kifo Kisimani" by "Kithaka wa Mberia", and a loan linking them. Then join the three tables to show the member name and book title.',
      checks: [
        { label: 'Creates the three tables', in: 'code', re: /CREATE\s+TABLE\s+Members[\s\S]*CREATE\s+TABLE\s+Books[\s\S]*CREATE\s+TABLE\s+Loans/i },
        { label: 'Loans has foreign keys', in: 'code', re: /CREATE\s+TABLE\s+Loans[\s\S]*?(REFERENCES|FOREIGN\s+KEY)[\s\S]*?(REFERENCES|FOREIGN\s+KEY)/i },
        { label: 'Joins the tables', in: 'code', re: /JOIN[\s\S]*JOIN/i },
        { label: 'Shows the loan', in: 'output', re: /Achieng \| Kifo Kisimani/ },
      ],
      hints: ['INSERT INTO Members (member_id, name) VALUES (1, \'Achieng\');', 'SELECT m.name, b.title FROM Loans l JOIN Members m ON ... JOIN Books b ON ...;'],
      quiz: [
        { q: 'How is a many-to-many relationship stored in tables?', options: ['With a junction table holding two foreign keys', 'With one big table', 'With two primary keys in each table', 'It cannot be stored'], why: 'A junction table (like Loans) links the two entities.' },
        { q: 'Which design phase produces the ER model?', options: ['Conceptual design', 'Physical design', 'Logical design', 'Testing'], why: 'The ER model is the conceptual design.' },
        { q: 'What does a CRUD matrix check?', options: ['Which transactions create, read, update or delete each table', 'How fast queries run', 'Which users have passwords', 'The size of each table'], why: 'It validates the model against the transactions it must support.' },
      ],
      oral: 'Describe the entities, relationships and cardinalities you would use for a hospital appointments system.',
      solution: { sql: `CREATE TABLE Members (member_id INTEGER PRIMARY KEY, name TEXT NOT NULL);
CREATE TABLE Books (book_id INTEGER PRIMARY KEY, title TEXT NOT NULL, author TEXT);
CREATE TABLE Loans (
  loan_id INTEGER PRIMARY KEY,
  member_id INTEGER NOT NULL REFERENCES Members(member_id),
  book_id INTEGER NOT NULL REFERENCES Books(book_id),
  loan_date TEXT
);
INSERT INTO Members (member_id, name) VALUES (1, 'Achieng');
INSERT INTO Books (book_id, title, author) VALUES (1, 'Kifo Kisimani', 'Kithaka wa Mberia');
INSERT INTO Loans (member_id, book_id, loan_date) VALUES (1, 1, '2026-11-24');
SELECT m.name, b.title
FROM Loans l
JOIN Members m ON m.member_id = l.member_id
JOIN Books b ON b.book_id = l.book_id;` },
    },
    {
      title: 'Normalisation', minutes: 55,
      content: `{{Normalisation}} organises tables to remove duplicated data and the problems it causes.

## Anomalies in an unnormalised table
| order | customer | phone | product | price |
- {{Update anomaly}}: a customer's phone is repeated on every order; changing it in one row leaves the others wrong
- {{Insert anomaly}}: you cannot store a new customer until they order
- {{Delete anomaly}}: deleting a customer's only order deletes the customer too

## The normal forms
- {{1NF}}: every cell holds one atomic value and there are no repeating groups (no "products: tea, sugar" in one cell)
- {{2NF}}: 1NF, and every non-key column depends on the {{whole}} primary key (no partial dependency on part of a composite key)
- {{3NF}}: 2NF, and non-key columns depend {{only}} on the key - not on other non-key columns (no transitive dependency such as order -> customer -> phone)

"The key, the whole key and nothing but the key."

## Example
Unnormalised: Sales(sale_id, client_name, client_phone, item, amount)
3NF:
~~~
CREATE TABLE Clients (client_id INTEGER PRIMARY KEY, name TEXT, phone TEXT);
CREATE TABLE Sales (sale_id INTEGER PRIMARY KEY,
                    client_id INTEGER REFERENCES Clients(client_id),
                    item TEXT, amount REAL);
~~~
Now the phone is stored once, and a join brings the data back together when needed.

Higher forms ({{BCNF}}, 4NF) exist; most business databases aim for 3NF, sometimes {{denormalising}} on purpose for speed in reporting.`,
      example: { sql: `-- The practice database is already normalised:
-- Orders store customer_id, not the customer's name and phone.
SELECT o.order_id, c.name, c.phone, o.total
FROM Orders o JOIN Customers c ON c.customer_id = o.customer_id
LIMIT 3;` },
      challenge: 'Normalise this data into Clients(client_id, name, phone) and Sales(sale_id, client_id, item, amount): Wekesa 0711000001 bought Tea 300 and Sugar 165; Zawadi 0722000002 bought Milk 65. Insert it, then show each client\'s name and total spent (SUM) ordered by name: "Wekesa | 465" and "Zawadi | 65".',
      checks: [
        { label: 'Creates Clients and Sales', in: 'code', re: /CREATE\s+TABLE\s+Clients[\s\S]*CREATE\s+TABLE\s+Sales/i },
        { label: 'Sales refers to Clients with a foreign key', in: 'code', re: /CREATE\s+TABLE\s+Sales[\s\S]*REFERENCES\s+Clients/i },
        { label: 'Totals per client with SUM and GROUP BY', in: 'code', re: /SUM\s*\([\s\S]*GROUP\s+BY/i },
        { label: 'Shows the totals', in: 'output', re: /Wekesa \| 465(\.0)?\nZawadi \| 65(\.0)?/ },
      ],
      hints: ['Each phone number appears once, in Clients.', 'SELECT c.name, SUM(s.amount) FROM Clients c JOIN Sales s ON ... GROUP BY c.name ORDER BY c.name;'],
      quiz: [
        { q: 'Which normal form requires atomic values with no repeating groups?', options: ['1NF', '2NF', '3NF', 'BCNF'], why: 'First normal form deals with atomic values.' },
        { q: 'A column that depends on another non-key column breaks which normal form?', options: ['3NF', '1NF', '2NF', 'None'], why: '3NF removes transitive dependencies.' },
        { q: 'Changing a phone number in one row but not the others is an...', options: ['update anomaly', 'insert anomaly', 'delete anomaly', 'integrity constraint'], why: 'Repeated data gets out of step when updated.' },
      ],
      oral: 'Explain the three anomalies normalisation prevents, using a school fees spreadsheet as the example.',
      solution: { sql: `CREATE TABLE Clients (client_id INTEGER PRIMARY KEY, name TEXT NOT NULL, phone TEXT);
CREATE TABLE Sales (sale_id INTEGER PRIMARY KEY,
                    client_id INTEGER NOT NULL REFERENCES Clients(client_id),
                    item TEXT, amount REAL);
INSERT INTO Clients VALUES (1, 'Wekesa', '0711000001'), (2, 'Zawadi', '0722000002');
INSERT INTO Sales (client_id, item, amount) VALUES (1, 'Tea', 300), (1, 'Sugar', 165), (2, 'Milk', 65);
SELECT c.name, SUM(s.amount) AS total
FROM Clients c JOIN Sales s ON s.client_id = c.client_id
GROUP BY c.name
ORDER BY c.name;` },
    },
    {
      title: 'Database Security and Integrity', minutes: 50,
      content: `{{Database security}} protects data from unauthorised access, change or loss.

## Security measures
- {{Authentication}}: proving who you are (username and password, two-factor codes)
- {{Access control}}: deciding what each user may do. In SQL Server, MySQL and Oracle:
~~~
GRANT SELECT, INSERT ON Orders TO cashier;
REVOKE DELETE ON Orders FROM cashier;
~~~
  Give each user the {{least privilege}} they need. (SQLite has no users, so these commands do not run here.)
- {{Encryption}} of data on disk and in transit (TLS)
- {{Auditing}}: logging who changed what (you will build this with a trigger)
- {{Backup}} and recovery: regular copies stored elsewhere, and tested restores

## Integrity control
Rules that keep data correct:
- {{Entity integrity}}: every row has a unique, non-null primary key
- {{Referential integrity}}: a foreign key must point to an existing row
- {{Domain integrity}}: CHECK, NOT NULL, UNIQUE, DEFAULT and data types

## Transactions
A {{transaction}} groups statements so they all succeed or none do ({{ACID}}: Atomic, Consistent, Isolated, Durable). Sending money must debit one account and credit another together:
~~~
BEGIN TRANSACTION;
UPDATE Accounts SET balance = balance - 500 WHERE account_id = 1;
UPDATE Accounts SET balance = balance + 500 WHERE account_id = 2;
COMMIT;          -- or ROLLBACK; to cancel everything since BEGIN
~~~
The practice Accounts table has {{CHECK (balance >= 0)}}, so an overdraft fails instead of corrupting data.`,
      example: { sql: `-- ROLLBACK cancels a transaction: the balance is unchanged afterwards
BEGIN TRANSACTION;
UPDATE Accounts SET balance = 0 WHERE account_id = 5;
ROLLBACK;
SELECT account_id, balance FROM Accounts WHERE account_id = 5;
-- Try it: UPDATE Accounts SET balance = -1 WHERE account_id = 7;  (the CHECK constraint refuses it)` },
      challenge: 'In a transaction (BEGIN TRANSACTION ... COMMIT), move 2000 from account 1 to account 3 in the Accounts table. Then show account_id and balance for accounts 1 and 3: account 1 should be 43000 and account 3 should be 130000.',
      checks: [
        { label: 'Uses a transaction', in: 'code', re: /BEGIN(\s+TRANSACTION)?\s*;[\s\S]*COMMIT\s*;/i },
        { label: 'Updates both accounts', in: 'code', re: /UPDATE\s+Accounts[\s\S]*UPDATE\s+Accounts/i },
        { label: 'Shows the new balances', in: 'output', re: /1 \| 43000(\.0)?\n3 \| 130000(\.0)?/ },
      ],
      hints: ['balance = balance - 2000 WHERE account_id = 1', 'SELECT account_id, balance FROM Accounts WHERE account_id IN (1, 3) ORDER BY account_id;'],
      quiz: [
        { q: 'What does ROLLBACK do?', options: ['Cancels every change since BEGIN', 'Saves the changes', 'Deletes the table', 'Restores last week\'s backup'], why: 'ROLLBACK undoes the open transaction.' },
        { q: 'Which principle says users get only the access they need?', options: ['Least privilege', 'Normalisation', 'Referential integrity', 'Atomicity'], why: 'Least privilege limits the damage of mistakes or attacks.' },
        { q: 'A foreign key that points to a missing row breaks...', options: ['referential integrity', 'entity integrity', 'authentication', '1NF'], why: 'Referential integrity requires referenced rows to exist.' },
      ],
      oral: 'Explain why sending money between M-Pesa accounts must happen inside a transaction.',
      solution: { sql: `BEGIN TRANSACTION;
UPDATE Accounts SET balance = balance - 2000 WHERE account_id = 1;
UPDATE Accounts SET balance = balance + 2000 WHERE account_id = 3;
COMMIT;
SELECT account_id, balance FROM Accounts WHERE account_id IN (1, 3) ORDER BY account_id;` },
    },
  ],
};

const M116 = {
  id: 116, order: 16, icon: '📝', color: '#336791', difficulty: 'intermediate',
  title: 'Structured Query Language (SQL)',
  description: 'Defining tables, changing data, querying with filters and groups, and joining tables.',
  lessons: [
    {
      title: 'Data Definition: CREATE, ALTER and DROP', minutes: 55,
      content: `{{SQL}} (Structured Query Language) is the standard language of relational databases. Its parts are:
- {{DDL}} - Data Definition Language: CREATE, ALTER, DROP
- {{DML}} - Data Manipulation Language: SELECT, INSERT, UPDATE, DELETE
- {{DCL}} - Data Control Language: GRANT, REVOKE
- {{TCL}} - Transaction Control: COMMIT, ROLLBACK

## CREATE TABLE with constraints
~~~
CREATE TABLE Suppliers (
  supplier_id INTEGER PRIMARY KEY,                 -- PRIMARY KEY
  name TEXT NOT NULL,                              -- NOT NULL
  email TEXT UNIQUE,                               -- UNIQUE
  county TEXT DEFAULT 'Nairobi',                   -- DEFAULT
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),   -- CHECK
  product_id INTEGER REFERENCES Products(product_id)   -- FOREIGN KEY
);
~~~

## ALTER TABLE
~~~
ALTER TABLE Suppliers ADD COLUMN phone TEXT;            -- add an attribute
ALTER TABLE Suppliers RENAME COLUMN county TO region;   -- rename
ALTER TABLE Suppliers DROP COLUMN phone;                -- drop an attribute
~~~
Changing a column's domain (type) is {{ALTER TABLE ... MODIFY}} in MySQL or {{ALTER COLUMN}} in SQL Server; SQLite instead rebuilds the table.

## DROP TABLE
~~~
DROP TABLE IF EXISTS Suppliers;    -- removes the table and all its rows
~~~
DROP cannot be undone outside a transaction - always double-check the table name.`,
      example: { sql: `CREATE TABLE Courses (
  course_id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  fee REAL CHECK (fee >= 0)
);
INSERT INTO Courses (title, fee) VALUES ('ICT Level 6', 45000);
SELECT * FROM Courses;` },
      challenge: 'Create a table Suppliers with supplier_id (primary key), name (NOT NULL), email (UNIQUE), county (DEFAULT \'Nairobi\') and rating (CHECK between 1 and 5). Add a phone column with ALTER TABLE. Insert supplier "Unga Millers" with rating 4 (no county), then SELECT name, county, rating FROM Suppliers.',
      checks: [
        { label: 'Uses PRIMARY KEY, NOT NULL and UNIQUE', in: 'code', re: /PRIMARY\s+KEY[\s\S]*NOT\s+NULL[\s\S]*UNIQUE/i },
        { label: 'Uses DEFAULT and CHECK', in: 'code', re: /DEFAULT\s+'Nairobi'[\s\S]*CHECK\s*\(|CHECK\s*\([\s\S]*DEFAULT\s+'Nairobi'/i },
        { label: 'Adds a column with ALTER TABLE', in: 'code', re: /ALTER\s+TABLE\s+Suppliers\s+ADD(\s+COLUMN)?\s+phone/i },
        { label: 'The default county is applied', in: 'output', re: /Unga Millers \| Nairobi \| 4/ },
      ],
      hints: ['county TEXT DEFAULT \'Nairobi\'', 'Leave county out of the INSERT so the default is used.'],
      quiz: [
        { q: 'Which SQL part do CREATE, ALTER and DROP belong to?', options: ['DDL', 'DML', 'DCL', 'TCL'], why: 'They define the structure, not the data.' },
        { q: 'Which constraint fills in a value when none is given?', options: ['DEFAULT', 'CHECK', 'UNIQUE', 'NOT NULL'], why: 'DEFAULT supplies a value automatically.' },
        { q: 'What does DROP TABLE do?', options: ['Deletes the table and all its data', 'Empties the table but keeps it', 'Hides the table', 'Renames the table'], why: 'DROP removes the whole table.' },
      ],
      oral: 'Explain each constraint you used in the Suppliers table and what mistake it prevents.',
      solution: { sql: `CREATE TABLE Suppliers (
  supplier_id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  county TEXT DEFAULT 'Nairobi',
  rating INTEGER CHECK (rating BETWEEN 1 AND 5)
);
ALTER TABLE Suppliers ADD COLUMN phone TEXT;
INSERT INTO Suppliers (name, email, rating) VALUES ('Unga Millers', 'sales@unga.example', 4);
SELECT name, county, rating FROM Suppliers;` },
    },
    {
      title: 'Data Manipulation: INSERT, UPDATE and DELETE', minutes: 50,
      content: `DML statements change the rows in a table.

## INSERT
~~~
INSERT INTO Products (name, category, price, stock)
VALUES ('Avocado', 'Food', 30, 200);

INSERT INTO Products (name, price) VALUES          -- several rows at once
  ('Pen', 20),
  ('Radio', 1800);
~~~
List the columns so the statement still works if the table changes.

## UPDATE ... SET
~~~
UPDATE Products SET price = 35 WHERE name = 'Avocado';
UPDATE Products SET stock = stock - 1 WHERE product_id = 3;
~~~

## DELETE
~~~
DELETE FROM Products WHERE price < 50;
~~~

## The most important rule
{{UPDATE and DELETE without WHERE change every row.}} Write the WHERE first, test it with a SELECT, then change SELECT to UPDATE or DELETE:
~~~
SELECT * FROM Products WHERE price < 50;    -- check what will be deleted
DELETE FROM Products WHERE price < 50;
~~~
The console tells you how many rows each statement changed - check it matches what you expected.`,
      example: { sql: `INSERT INTO Products (name, category, price) VALUES ('Mango', 'Food', 25);
SELECT name, price FROM Products WHERE name = 'Mango';` },
      challenge: 'Insert three products: Avocado (Food, 30), Pen (Stationery, 20) and Radio (Electronics, 1800). Update the price of Avocado to 35. Delete all products cheaper than 50. Finally SELECT COUNT(*) AS products FROM Products; - the answer should be 16.',
      checks: [
        { label: 'Inserts products', in: 'code', re: /INSERT\s+INTO\s+Products/i },
        { label: 'Updates with WHERE', in: 'code', re: /UPDATE\s+Products\s+SET[\s\S]*WHERE/i },
        { label: 'Deletes with WHERE', in: 'code', re: /DELETE\s+FROM\s+Products\s+WHERE/i },
        { label: 'Leaves 16 products', in: 'output', re: /products\n16\b/ },
      ],
      hints: ['The practice database starts with 15 products; you add 3 and delete the 2 below 50.', 'Run a SELECT with the same WHERE first to see which rows will change.'],
      quiz: [
        { q: 'What happens if you run DELETE FROM Products; with no WHERE?', options: ['Every row is deleted', 'Nothing happens', 'Only the first row is deleted', 'The table is dropped'], why: 'Without WHERE the statement applies to all rows.' },
        { q: 'Which statement changes existing values?', options: ['UPDATE', 'INSERT', 'ALTER', 'SELECT'], why: 'UPDATE ... SET changes values in rows.' },
        { q: 'Why list the column names in an INSERT?', options: ['It keeps working if the table gains columns', 'It is faster', 'SQL requires it', 'It skips constraints'], why: 'Naming columns makes the statement independent of column order.' },
      ],
      oral: 'Describe a safe routine for deleting data from a live database.',
      solution: { sql: `INSERT INTO Products (name, category, price) VALUES
  ('Avocado', 'Food', 30),
  ('Pen', 'Stationery', 20),
  ('Radio', 'Electronics', 1800);
UPDATE Products SET price = 35 WHERE name = 'Avocado';
DELETE FROM Products WHERE price < 50;
SELECT COUNT(*) AS products FROM Products;` },
    },
    {
      title: 'Querying: Filters, Sorting and Grouping', minutes: 60,
      content: `## Filtering rows with WHERE
~~~
SELECT * FROM Customers WHERE age >= 18 AND city = 'Nairobi';
SELECT * FROM Products WHERE price BETWEEN 100 AND 500;
SELECT * FROM Customers WHERE city IN ('Kisumu', 'Mombasa');
SELECT * FROM Customers WHERE name LIKE 'A%';      -- starts with A
SELECT * FROM Customers WHERE email IS NULL;       -- missing values
~~~

## Sorting and limiting
~~~
SELECT name, price FROM Products ORDER BY price DESC LIMIT 5;
~~~

## Aggregate functions
{{COUNT, SUM, AVG, MIN, MAX}} summarise many rows into one value:
~~~
SELECT COUNT(*), AVG(salary), MAX(salary) FROM Employees;
~~~

## GROUP BY and HAVING
{{GROUP BY}} makes one summary row per group. {{HAVING}} filters the groups (WHERE filters rows before grouping; HAVING filters after):
~~~
SELECT department, COUNT(*) AS staff, ROUND(AVG(salary), 2) AS avg_salary
FROM Employees
GROUP BY department
HAVING COUNT(*) >= 2
ORDER BY avg_salary DESC;
~~~

## Order of a SELECT
SELECT columns → FROM table → WHERE row filter → GROUP BY → HAVING group filter → ORDER BY → LIMIT

## Column aliases
{{AS}} renames a result column: {{SUM(total) AS revenue}}.`,
      example: { sql: `SELECT city, COUNT(*) AS customers
FROM Customers
GROUP BY city
ORDER BY customers DESC;` },
      challenge: 'Show each department\'s average salary, rounded to 2 decimals, but only departments whose average is above 90000, highest first. Columns: department, avg_salary. Expected rows: "Management | 250000" then "IT | 107666.67".',
      checks: [
        { label: 'Groups by department', in: 'code', re: /GROUP\s+BY\s+department/i },
        { label: 'Filters groups with HAVING', in: 'code', re: /HAVING\s+(ROUND\s*\()?\s*AVG\s*\(/i },
        { label: 'Sorts highest first', in: 'code', re: /ORDER\s+BY[\s\S]*DESC/i },
        { label: 'Returns Management then IT', in: 'output', re: /department \| avg_salary\nManagement \| 250000(\.0)?\nIT \| 107666\.67$/m },
      ],
      hints: ['ROUND(AVG(salary), 2) AS avg_salary', 'HAVING AVG(salary) > 90000 - Sales averages exactly 90000, so it is left out.'],
      quiz: [
        { q: 'What is the difference between WHERE and HAVING?', options: ['WHERE filters rows before grouping; HAVING filters groups after', 'They are the same', 'HAVING filters rows; WHERE filters groups', 'HAVING is only for text'], why: 'HAVING works on aggregated groups.' },
        { q: 'Which pattern finds names starting with A?', options: ["LIKE 'A%'", "LIKE '%A'", "= 'A*'", "IN ('A')"], why: '% matches any characters after A.' },
        { q: 'Which function counts rows?', options: ['COUNT(*)', 'SUM(*)', 'TOTAL()', 'ROWS()'], why: 'COUNT(*) counts the rows in each group.' },
      ],
      oral: 'Explain the order in which the parts of a SELECT statement are applied.',
      solution: { sql: `SELECT department, ROUND(AVG(salary), 2) AS avg_salary
FROM Employees
GROUP BY department
HAVING AVG(salary) > 90000
ORDER BY avg_salary DESC;` },
    },
    {
      title: 'Joining Tables', minutes: 60,
      content: `A {{join}} combines rows from two or more tables using a related column, usually a foreign key matching a primary key.

## INNER JOIN - only matching rows
~~~
SELECT o.order_id, c.name, o.total
FROM Orders o
INNER JOIN Customers c ON c.customer_id = o.customer_id
WHERE o.total > 5000;
~~~
{{o}} and {{c}} are {{table aliases}} that keep the query short.

## LEFT JOIN - every row from the left table
Rows with no match get NULL on the right:
~~~
SELECT s.name, sc.name AS school
FROM Students s
LEFT JOIN Schools sc ON sc.school_id = s.school_id;
~~~
Students without a school show {{NULL}}.

## Other joins
- {{RIGHT JOIN}}: every row from the right table
- {{FULL OUTER JOIN}}: every row from both
- {{CROSS JOIN}}: every combination (rarely wanted)
- {{Self join}}: a table joined to itself, e.g. employees and their managers:
~~~
SELECT e.name AS employee, m.name AS manager
FROM Employees e LEFT JOIN Employees m ON m.employee_id = e.manager_id;
~~~

## Joining several tables
~~~
SELECT c.name, p.name AS product, oi.quantity
FROM Orders o
JOIN Customers c ON c.customer_id = o.customer_id
JOIN OrderItems oi ON oi.order_id = o.order_id
JOIN Products p ON p.product_id = oi.product_id;
~~~
A join without an ON condition multiplies every row by every row - always check the ON clause.`,
      example: { sql: `SELECT e.name AS employee, m.name AS manager
FROM Employees e
LEFT JOIN Employees m ON m.employee_id = e.manager_id
LIMIT 4;` },
      challenge: 'Write two queries. First, with an INNER JOIN, list the customer name and total of every order over 10000, biggest first (expect "Ian Kamau | 16950" then "Amina Wanjiru | 14500"). Second, with a LEFT JOIN, list every student\'s name and school name, ordered by student name - the two students without a school must appear with NULL.',
      checks: [
        { label: 'Uses an INNER JOIN', in: 'code', re: /INNER\s+JOIN|\bJOIN\b[\s\S]*ON/i },
        { label: 'Uses a LEFT JOIN', in: 'code', re: /LEFT\s+(OUTER\s+)?JOIN/i },
        { label: 'Lists the big orders', in: 'output', re: /Ian Kamau \| 16950(\.0)?\nAmina Wanjiru \| 14500(\.0)?/ },
        { label: 'Shows students without a school', in: 'output', re: /Njambi Githinji \| NULL[\s\S]*Omar Farah \| NULL/ },
      ],
      hints: ['ON c.customer_id = o.customer_id', 'LEFT JOIN keeps every row of the first table (Students).'],
      quiz: [
        { q: 'Which join keeps every row of the first table even without a match?', options: ['LEFT JOIN', 'INNER JOIN', 'CROSS JOIN', 'SELF JOIN'], why: 'LEFT JOIN keeps all left rows and fills gaps with NULL.' },
        { q: 'What does a join without an ON condition produce?', options: ['Every combination of rows', 'No rows', 'Only matching rows', 'An error in every DBMS'], why: 'It becomes a cross join.' },
        { q: 'A query joining Employees to Employees to find managers is a...', options: ['self join', 'full join', 'natural join', 'subquery'], why: 'The table is joined to itself.' },
      ],
      oral: 'Explain the difference between an INNER JOIN and a LEFT JOIN with a students-and-schools example.',
      solution: { sql: `SELECT c.name, o.total
FROM Orders o
INNER JOIN Customers c ON c.customer_id = o.customer_id
WHERE o.total > 10000
ORDER BY o.total DESC;
SELECT s.name, sc.name AS school
FROM Students s
LEFT JOIN Schools sc ON sc.school_id = s.school_id
ORDER BY s.name;` },
    },
  ],
};

const M117 = {
  id: 117, order: 17, icon: '🔍', color: '#336791', difficulty: 'advanced',
  title: 'Advanced Database Concepts',
  description: 'Object-oriented databases and views, triggers, indexing and hashing, and database applications.',
  lessons: [
    {
      title: 'Object-Oriented Databases and Views', minutes: 50,
      content: `## Object-oriented databases (OODB)
An {{object-oriented database}} stores data as {{objects}}, as in Java or Python, instead of rows in tables.
- {{Classes}} describe objects; {{objects}} are stored with their {{attributes}} and methods
- {{Inheritance}}: a Lecturer class can inherit from Person
- Objects can contain other objects directly (no joins needed)

Comparison:
- Relational: tables, SQL, strong for reporting and many users (most business systems)
- Object-oriented: objects, good for complex, nested data (CAD drawings, multimedia)
- Document / NoSQL (MongoDB): flexible JSON documents for web apps

Most applications keep a relational database and use an {{ORM}} (object-relational mapper) such as Hibernate or SQLAlchemy to turn rows into objects.

## Views
A {{view}} is a saved query that behaves like a table. It gives users a simple, object-like picture and hides columns they should not see:
~~~
CREATE VIEW StudentReport AS
SELECT s.name, s.gpa, sc.name AS school
FROM Students s
JOIN Schools sc ON sc.school_id = s.school_id;

SELECT * FROM StudentReport WHERE gpa >= 3.5;
~~~
Benefits: simpler queries, security (show only some columns), and one place to change logic. A view stores no data - it runs its query each time.`,
      example: { sql: `CREATE VIEW CustomerOrders AS
SELECT c.name, COUNT(o.order_id) AS orders
FROM Customers c LEFT JOIN Orders o ON o.customer_id = c.customer_id
GROUP BY c.name;
SELECT * FROM CustomerOrders ORDER BY orders DESC LIMIT 3;` },
      challenge: 'Create a view TopStudents showing the name, gpa and school name of students with a GPA of 3.5 or more. Then SELECT * FROM TopStudents ORDER BY gpa DESC; - the first row should be "Akinyi Adhiambo | 3.9 | Kisumu Girls High School".',
      checks: [
        { label: 'Creates the view', in: 'code', re: /CREATE\s+VIEW\s+TopStudents\s+AS/i },
        { label: 'Filters on gpa >= 3.5', in: 'code', re: /gpa\s*>=\s*3\.5/i },
        { label: 'Queries the view', in: 'code', re: /SELECT[\s\S]*FROM\s+TopStudents/i },
        { label: 'Returns the top student first', in: 'output', re: /Akinyi Adhiambo \| 3\.9 \| Kisumu Girls High School/ },
      ],
      hints: ['CREATE VIEW TopStudents AS SELECT ... FROM Students s JOIN Schools sc ON ... WHERE s.gpa >= 3.5;', 'Students with no school are left out by an INNER JOIN.'],
      quiz: [
        { q: 'Does a view store its own copy of the data?', options: ['No, it runs its query each time', 'Yes, always', 'Only for numbers', 'Only the first time'], why: 'A (non-materialised) view is a saved query.' },
        { q: 'Which database type stores data as objects with inheritance?', options: ['Object-oriented database', 'Relational database', 'Spreadsheet', 'Flat file'], why: 'OODBs store objects directly.' },
        { q: 'What does an ORM do?', options: ['Maps database rows to program objects', 'Backs up the database', 'Encrypts passwords', 'Draws ER diagrams'], why: 'ORMs bridge relational tables and objects in code.' },
      ],
      oral: 'Explain two reasons a bank might give tellers access to a view instead of the full customer table.',
      solution: { sql: `CREATE VIEW TopStudents AS
SELECT s.name, s.gpa, sc.name AS school
FROM Students s
JOIN Schools sc ON sc.school_id = s.school_id
WHERE s.gpa >= 3.5;
SELECT * FROM TopStudents ORDER BY gpa DESC;` },
    },
    {
      title: 'Triggers', minutes: 50,
      content: `A {{trigger}} is SQL that runs automatically when a row is inserted, updated or deleted.

~~~
CREATE TABLE PriceLog (
  product_id INTEGER,
  old_price REAL,
  new_price REAL,
  changed_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER log_price_change
AFTER UPDATE OF price ON Products
BEGIN
  INSERT INTO PriceLog (product_id, old_price, new_price)
  VALUES (OLD.product_id, OLD.price, NEW.price);
END;
~~~
- {{BEFORE}} or {{AFTER}} the change
- {{INSERT}}, {{UPDATE}} (optionally {{OF column}}) or {{DELETE}}
- {{OLD}} is the row before the change; {{NEW}} the row after

## Uses
- {{Auditing}}: record who changed what and when
- {{Keeping totals in step}}: reduce stock when an order item is added
- {{Enforcing rules}} that constraints cannot express (in SQLite: {{SELECT RAISE(ABORT, 'message')}} stops the change)

## Cautions
Triggers run invisibly, so document them, keep them short, and avoid triggers that fire other triggers in long chains.`,
      example: { sql: `CREATE TRIGGER reduce_stock
AFTER INSERT ON OrderItems
BEGIN
  UPDATE Products SET stock = stock - NEW.quantity WHERE product_id = NEW.product_id;
END;
INSERT INTO OrderItems (order_id, product_id, quantity, unit_price) VALUES (1, 1, 5, 210);
SELECT name, stock FROM Products WHERE product_id = 1;` },
      challenge: 'Create a PriceLog table (product_id, old_price, new_price) and an AFTER UPDATE trigger on Products that logs price changes using OLD and NEW. Raise the price of product 2 (Cooking oil, 380) to 420, then SELECT product_id, old_price, new_price FROM PriceLog; - expect "2 | 380 | 420".',
      checks: [
        { label: 'Creates the log table', in: 'code', re: /CREATE\s+TABLE\s+PriceLog/i },
        { label: 'Creates an AFTER UPDATE trigger', in: 'code', re: /CREATE\s+TRIGGER[\s\S]*AFTER\s+UPDATE[\s\S]*ON\s+Products/i },
        { label: 'Uses OLD and NEW', in: 'code', re: /OLD\.\w+[\s\S]*NEW\.\w+|NEW\.\w+[\s\S]*OLD\.\w+/i },
        { label: 'Logs the change', in: 'output', re: /2 \| 380(\.0)? \| 420(\.0)?/ },
      ],
      hints: ['The trigger body goes between BEGIN and END; (with a semicolon after END).', 'UPDATE Products SET price = 420 WHERE product_id = 2;'],
      quiz: [
        { q: 'In an UPDATE trigger, what does OLD contain?', options: ['The row before the change', 'The row after the change', 'The oldest row in the table', 'The previous trigger'], why: 'OLD is the before-image; NEW is the after-image.' },
        { q: 'Which is a good use of a trigger?', options: ['Recording an audit log of changes', 'Drawing an ER diagram', 'Choosing an RDBMS', 'Writing the user manual'], why: 'Triggers react to data changes automatically.' },
        { q: 'When does an AFTER INSERT trigger run?', options: ['After each new row is added', 'Before the table is created', 'Only when you call it', 'Once a day'], why: 'It fires after the INSERT.' },
      ],
      oral: 'Describe how a supermarket could use triggers to keep stock levels correct.',
      solution: { sql: `CREATE TABLE PriceLog (product_id INTEGER, old_price REAL, new_price REAL);
CREATE TRIGGER log_price_change
AFTER UPDATE OF price ON Products
BEGIN
  INSERT INTO PriceLog (product_id, old_price, new_price)
  VALUES (OLD.product_id, OLD.price, NEW.price);
END;
UPDATE Products SET price = 420 WHERE product_id = 2;
SELECT product_id, old_price, new_price FROM PriceLog;` },
    },
    {
      title: 'Indexing and Hashing', minutes: 55,
      content: `Without help, the database reads {{every row}} to find a match (a full table scan). {{Indexes}} and {{hashing}} find rows quickly - like the index at the back of a textbook.

## Indexing
An {{index}} is a sorted structure (usually a {{B-tree}}) of a column's values with pointers to the rows.
- {{Dense index}}: one entry for every record
- {{Sparse index}}: one entry per block of records (needs the data sorted)
- {{Primary / clustered index}}: on the column the rows are stored in order of
- {{Secondary index}}: on any other column you search often

~~~
CREATE INDEX idx_customers_city ON Customers(city);
EXPLAIN QUERY PLAN SELECT * FROM Customers WHERE city = 'Nairobi';
-- detail: SEARCH Customers USING INDEX idx_customers_city (city=?)
~~~
{{EXPLAIN QUERY PLAN}} shows whether SQLite scans the table or uses an index.

Trade-off: indexes speed up reads but slow down inserts and updates and use space. Index columns used in WHERE, JOIN and ORDER BY - not every column.

## Hashing
A {{hash function}} turns a key into a bucket number, so a lookup goes straight to the right bucket.
- {{Static hashing}}: a fixed number of buckets; overflow chains grow as data grows
- {{Dynamic hashing}} (extendible, linear hashing): buckets split as the data grows, keeping lookups fast
Hashing is excellent for exact matches (account_id = 1042) but cannot help with ranges (BETWEEN) - B-tree indexes can.`,
      example: { sql: `EXPLAIN QUERY PLAN SELECT * FROM Customers WHERE city = 'Nairobi';
-- Without an index the plan says SCAN Customers` },
      challenge: 'Create an index idx_customers_city on Customers(city). Then run EXPLAIN QUERY PLAN for SELECT name FROM Customers WHERE city = \'Nairobi\'; and confirm the plan says it is USING INDEX idx_customers_city.',
      checks: [
        { label: 'Creates the index', in: 'code', re: /CREATE\s+INDEX\s+idx_customers_city\s+ON\s+Customers\s*\(\s*city\s*\)/i },
        { label: 'Uses EXPLAIN QUERY PLAN', in: 'code', re: /EXPLAIN\s+QUERY\s+PLAN/i },
        { label: 'The plan uses the index', in: 'output', re: /USING (COVERING )?INDEX idx_customers_city/i },
      ],
      hints: ['CREATE INDEX idx_customers_city ON Customers(city);', 'Put EXPLAIN QUERY PLAN in front of the SELECT.'],
      quiz: [
        { q: 'What is the main cost of adding an index?', options: ['Slower inserts and updates, and more storage', 'Slower SELECT queries', 'Less data integrity', 'It deletes duplicates'], why: 'Every change must also update the index.' },
        { q: 'Which index has an entry for every record?', options: ['Dense index', 'Sparse index', 'Hash bucket', 'Clustered key'], why: 'Dense indexes list every key.' },
        { q: 'Hashing is best for which kind of search?', options: ['Exact matches such as id = 1042', 'Ranges such as BETWEEN 1 AND 100', 'Sorting', 'LIKE \'%abc%\''], why: 'A hash jumps straight to one bucket.' },
      ],
      oral: 'Explain how you would decide which columns of an M-Pesa transactions table to index.',
      solution: { sql: `CREATE INDEX idx_customers_city ON Customers(city);
EXPLAIN QUERY PLAN SELECT name FROM Customers WHERE city = 'Nairobi';` },
    },
    {
      title: 'Database Applications and Data Warehouses', minutes: 55,
      content: `Databases power more than day-to-day transactions.

## Kinds of database applications
- {{Decision support systems (DSS)}}: help managers decide using summaries and "what-if" analysis
- {{Data mining}}: finding hidden patterns (customers who buy X also buy Y, fraud signals)
- {{Distributed databases}}: data stored across several sites that act as one database (bank branches); features: replication, fragmentation, location transparency
- {{Spatial and geographical databases}}: locations and shapes (county boundaries, delivery routes) - e.g. PostGIS
- {{Multimedia databases}}: images, audio and video with metadata
- {{Mobile and personal databases}}: SQLite on phones, synchronising when online

## Data warehouses
A {{data warehouse}} collects historical data from many systems for analysis (OLAP), separate from the live transaction system (OLTP). Data is loaded by {{ETL}}: Extract, Transform, Load.

A {{star schema}} has a central {{fact table}} of measurements (sales amounts) linked to {{dimension tables}} that describe them (product, region, date):
~~~
CREATE TABLE DimRegion (region_id INTEGER PRIMARY KEY, region TEXT);
CREATE TABLE DimProduct (product_id INTEGER PRIMARY KEY, product TEXT);
CREATE TABLE FactSales (
  region_id INTEGER REFERENCES DimRegion(region_id),
  product_id INTEGER REFERENCES DimProduct(product_id),
  amount REAL
);
SELECT r.region, SUM(f.amount) AS revenue
FROM FactSales f JOIN DimRegion r ON r.region_id = f.region_id
GROUP BY r.region ORDER BY revenue DESC;
~~~
Warehouses are often {{denormalised}} on purpose so reports need fewer joins.`,
      example: { sql: `-- A quick "decision support" summary from the live tables
SELECT status, COUNT(*) AS orders, SUM(total) AS value
FROM Orders
GROUP BY status;` },
      challenge: 'Build a small star schema: DimRegion (Coast, Rift, Nairobi), DimProduct (Tea, Sugar) and FactSales with these sales: Coast-Tea 1200, Coast-Sugar 950, Rift-Tea 800, Nairobi-Sugar 2000, Rift-Sugar 1100. Report revenue per region, highest first: "Coast | 2150", "Nairobi | 2000", "Rift | 1900".',
      checks: [
        { label: 'Creates dimension tables', in: 'code', re: /CREATE\s+TABLE\s+Dim\w+[\s\S]*CREATE\s+TABLE\s+Dim\w+/i },
        { label: 'Creates a fact table with foreign keys', in: 'code', re: /CREATE\s+TABLE\s+Fact\w+[\s\S]*REFERENCES/i },
        { label: 'Aggregates with SUM and GROUP BY', in: 'code', re: /SUM\s*\([\s\S]*GROUP\s+BY/i },
        { label: 'Reports revenue per region', in: 'output', re: /Coast \| 2150(\.0)?\nNairobi \| 2000(\.0)?\nRift \| 1900(\.0)?/ },
      ],
      hints: ['Give each dimension row an id, then insert facts using those ids.', 'ORDER BY revenue DESC'],
      quiz: [
        { q: 'In a star schema, which table holds the measurements such as sales amounts?', options: ['The fact table', 'A dimension table', 'The index', 'The view'], why: 'Facts are surrounded by descriptive dimensions.' },
        { q: 'What does ETL stand for?', options: ['Extract, Transform, Load', 'Enter, Test, Launch', 'Export, Table, Link', 'Encrypt, Transfer, Lock'], why: 'ETL moves data into the warehouse.' },
        { q: 'Finding that customers who buy bread also buy milk is an example of...', options: ['data mining', 'normalisation', 'hashing', 'authentication'], why: 'Data mining discovers patterns.' },
      ],
      oral: 'Explain how a supermarket chain could use a data warehouse to decide what to stock in each branch.',
      solution: { sql: `CREATE TABLE DimRegion (region_id INTEGER PRIMARY KEY, region TEXT);
CREATE TABLE DimProduct (product_id INTEGER PRIMARY KEY, product TEXT);
CREATE TABLE FactSales (
  region_id INTEGER REFERENCES DimRegion(region_id),
  product_id INTEGER REFERENCES DimProduct(product_id),
  amount REAL
);
INSERT INTO DimRegion VALUES (1, 'Coast'), (2, 'Rift'), (3, 'Nairobi');
INSERT INTO DimProduct VALUES (1, 'Tea'), (2, 'Sugar');
INSERT INTO FactSales VALUES (1, 1, 1200), (1, 2, 950), (2, 1, 800), (3, 2, 2000), (2, 2, 1100);
SELECT r.region, SUM(f.amount) AS revenue
FROM FactSales f JOIN DimRegion r ON r.region_id = f.region_id
GROUP BY r.region
ORDER BY revenue DESC;` },
    },
  ],
};

module.exports = { M115, M116, M117 };
