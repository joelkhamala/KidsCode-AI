'use strict';
/**
 * The practice database for the Database Management course (modules 115-117).
 * A fresh in-memory copy is made for every run, so learners can change or drop anything.
 * Column names follow the lesson examples (customer_id, order_id, total, salary, ...).
 */
const SAMPLE_SQL = `
CREATE TABLE Customers (
  customer_id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  email TEXT UNIQUE,
  phone TEXT,
  city TEXT,
  age INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO Customers (name, first_name, last_name, email, phone, city, age, created_at) VALUES
 ('Amina Wanjiru', 'Amina', 'Wanjiru', 'amina.w@example.co.ke', '0712 345 001', 'Nairobi', 29, '2024-01-15'),
 ('Brian Otieno', 'Brian', 'Otieno', 'brian.o@example.co.ke', '0722 345 002', 'Kisumu', 35, '2024-02-03'),
 ('Cynthia Achieng', 'Cynthia', 'Achieng', 'cynthia.a@example.co.ke', '0733 345 003', 'Mombasa', 41, '2024-02-20'),
 ('David Kiprop', 'David', 'Kiprop', 'david.k@example.co.ke', '0712 345 004', 'Eldoret', 23, '2024-03-11'),
 ('Esther Mwende', 'Esther', 'Mwende', 'esther.m@example.co.ke', '0700 345 005', 'Machakos', 52, '2024-03-28'),
 ('Faith Njeri', 'Faith', 'Njeri', 'faith.n@example.co.ke', '0711 345 006', 'Nairobi', 17, '2024-04-09'),
 ('George Mutua', 'George', 'Mutua', 'george.m@example.co.ke', '0721 345 007', 'Nakuru', 38, '2024-05-02'),
 ('Halima Hassan', 'Halima', 'Hassan', 'halima.h@example.co.ke', '0734 345 008', 'Mombasa', 31, '2024-05-19'),
 ('Ian Kamau', 'Ian', 'Kamau', 'ian.k@example.co.ke', '0715 345 009', 'Nairobi', 45, '2024-06-07'),
 ('Joy Chebet', 'Joy', 'Chebet', 'joy.c@example.co.ke', '0726 345 010', 'Kericho', 27, '2024-07-14'),
 ('Kevin Omondi', 'Kevin', 'Omondi', 'kevin.o@example.co.ke', '0738 345 011', 'Kisumu', 19, '2024-08-01'),
 ('Lucy Wairimu', 'Lucy', 'Wairimu', NULL, '0713 345 012', 'Nyeri', 63, '2024-09-23');

CREATE TABLE Products (
  product_id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT,
  price REAL NOT NULL CHECK (price >= 0),
  stock INTEGER DEFAULT 0
);
INSERT INTO Products (name, category, price, stock) VALUES
 ('Maize flour 2kg', 'Food', 210, 120),
 ('Cooking oil 1L', 'Food', 380, 60),
 ('Sugar 1kg', 'Food', 165, 90),
 ('Tea leaves 500g', 'Food', 295, 45),
 ('Milk 500ml', 'Food', 65, 200),
 ('Bread loaf', 'Food', 70, 80),
 ('Exercise book', 'Stationery', 60, 300),
 ('Ball pen (box)', 'Stationery', 250, 40),
 ('School bag', 'Stationery', 1450, 15),
 ('Solar lamp', 'Electronics', 2300, 12),
 ('Phone charger', 'Electronics', 450, 35),
 ('Smartphone', 'Electronics', 14500, 5),
 ('Water tank 500L', 'Home', 7800, 3),
 ('Jiko (charcoal stove)', 'Home', 950, 20),
 ('Kiondo basket', 'Crafts', 1200, 18);

CREATE TABLE Orders (
  order_id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL REFERENCES Customers(customer_id),
  order_date TEXT,
  total REAL,
  status TEXT CHECK (status IN ('pending', 'completed', 'cancelled'))
);
INSERT INTO Orders (customer_id, order_date, total, status) VALUES
 (1, '2024-03-02', 1340, 'completed'),
 (1, '2024-06-18', 14500, 'completed'),
 (2, '2024-03-15', 590, 'completed'),
 (3, '2024-04-01', 7800, 'pending'),
 (3, '2024-08-22', 450, 'completed'),
 (4, '2024-04-20', 2300, 'cancelled'),
 (5, '2024-05-05', 1215, 'completed'),
 (7, '2024-06-11', 950, 'pending'),
 (8, '2024-07-03', 3750, 'completed'),
 (9, '2024-07-29', 165, 'completed'),
 (9, '2024-09-14', 16950, 'completed'),
 (10, '2024-10-02', 500, 'pending'),
 (11, '2024-11-19', 1200, 'completed'),
 (2, '2025-01-08', 2750, 'completed');

CREATE TABLE OrderItems (
  item_id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES Orders(order_id),
  product_id INTEGER NOT NULL REFERENCES Products(product_id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price REAL NOT NULL
);
INSERT INTO OrderItems (order_id, product_id, quantity, unit_price) VALUES
 (1, 1, 2, 210), (1, 2, 1, 380), (1, 3, 2, 165), (1, 7, 4, 60), (2, 12, 1, 14500),
 (3, 4, 2, 295), (4, 13, 1, 7800), (5, 11, 1, 450), (6, 10, 1, 2300), (7, 6, 3, 70),
 (7, 14, 1, 950), (8, 14, 1, 950), (9, 9, 1, 1450), (9, 10, 1, 2300), (10, 3, 1, 165),
 (11, 12, 1, 14500), (11, 10, 1, 2300), (11, 8, 1, 250), (12, 8, 2, 250), (13, 15, 1, 1200),
 (14, 9, 1, 1450), (14, 15, 1, 1200), (14, 7, 2, 60);

CREATE TABLE Employees (
  employee_id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  department TEXT,
  salary REAL,
  manager_id INTEGER REFERENCES Employees(employee_id),
  hire_date TEXT
);
INSERT INTO Employees (name, department, salary, manager_id, hire_date) VALUES
 ('Grace Akinyi', 'Management', 250000, NULL, '2018-02-01'),
 ('Peter Njoroge', 'Sales', 120000, 1, '2019-05-13'),
 ('Mercy Wambui', 'Sales', 78000, 2, '2021-03-22'),
 ('Samuel Kiptoo', 'Sales', 72000, 2, '2022-08-01'),
 ('Ruth Nyambura', 'IT', 140000, 1, '2019-11-04'),
 ('Collins Ouma', 'IT', 95000, 5, '2021-06-14'),
 ('Wanjiku Kariuki', 'IT', 88000, 5, '2023-01-09'),
 ('Hassan Abdi', 'Finance', 110000, 1, '2020-04-27'),
 ('Naomi Jepkosgei', 'Finance', 69000, 8, '2023-09-18'),
 ('Tom Mwangi', 'Support', 52000, 1, '2024-02-05');

CREATE TABLE Schools (
  school_id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  county TEXT
);
INSERT INTO Schools (name, county) VALUES
 ('Moi Forces Academy', 'Nairobi'),
 ('Kisumu Girls High School', 'Kisumu'),
 ('Shimo La Tewa School', 'Mombasa'),
 ('Kapsabet Boys High School', 'Nandi');

CREATE TABLE Students (
  student_id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  age INTEGER,
  enrollment_date TEXT,
  gpa REAL CHECK (gpa BETWEEN 0 AND 4),
  school_id INTEGER REFERENCES Schools(school_id)
);
INSERT INTO Students (name, email, age, enrollment_date, gpa, school_id) VALUES
 ('Wanjiru Kamau', 'wanjiru@example.ac.ke', 17, '2023-01-09', 3.8, 1),
 ('Otieno Ochieng', 'otieno@example.ac.ke', 16, '2023-01-09', 3.2, 2),
 ('Mwanaisha Said', 'mwanaisha@example.ac.ke', 18, '2022-01-10', 3.6, 3),
 ('Kiprono Rotich', 'kiprono@example.ac.ke', 17, '2022-01-10', 2.9, 4),
 ('Akinyi Adhiambo', 'akinyi@example.ac.ke', 16, '2024-01-08', 3.9, 2),
 ('Mutiso Musyoka', 'mutiso@example.ac.ke', 19, '2021-01-11', 2.4, 1),
 ('Chepkoech Langat', 'chepkoech@example.ac.ke', 17, '2023-01-09', 3.5, 4),
 ('Baraka Juma', 'baraka@example.ac.ke', 18, '2022-01-10', 3.1, 3),
 ('Njambi Githinji', 'njambi@example.ac.ke', 16, '2024-01-08', 3.7, NULL),
 ('Omar Farah', 'omar@example.ac.ke', 17, '2023-01-09', 2.7, NULL);

CREATE TABLE Accounts (
  account_id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL REFERENCES Customers(customer_id),
  account_type TEXT CHECK (account_type IN ('savings', 'current', 'mpesa')),
  balance REAL NOT NULL DEFAULT 0 CHECK (balance >= 0),
  opened_on TEXT
);
INSERT INTO Accounts (customer_id, account_type, balance, opened_on) VALUES
 (1, 'savings', 45000, '2023-05-01'),
 (1, 'mpesa', 3200, '2023-05-01'),
 (2, 'current', 128000, '2022-11-15'),
 (3, 'savings', 9800, '2024-01-20'),
 (5, 'savings', 310000, '2021-07-07'),
 (9, 'current', 56000, '2023-09-30'),
 (12, 'mpesa', 750, '2024-10-10');
`;

/** Short description of the tables for the editor's "Practice database" panel. */
const SAMPLE_TABLES = [
  { name: 'Customers', columns: ['customer_id', 'name', 'first_name', 'last_name', 'email', 'phone', 'city', 'age', 'created_at'], rows: 12 },
  { name: 'Products', columns: ['product_id', 'name', 'category', 'price', 'stock'], rows: 15 },
  { name: 'Orders', columns: ['order_id', 'customer_id', 'order_date', 'total', 'status'], rows: 14 },
  { name: 'OrderItems', columns: ['item_id', 'order_id', 'product_id', 'quantity', 'unit_price'], rows: 23 },
  { name: 'Employees', columns: ['employee_id', 'name', 'department', 'salary', 'manager_id', 'hire_date'], rows: 10 },
  { name: 'Schools', columns: ['school_id', 'name', 'county'], rows: 4 },
  { name: 'Students', columns: ['student_id', 'name', 'email', 'age', 'enrollment_date', 'gpa', 'school_id'], rows: 10 },
  { name: 'Accounts', columns: ['account_id', 'customer_id', 'account_type', 'balance', 'opened_on'], rows: 7 },
];

module.exports = { SAMPLE_SQL, SAMPLE_TABLES };
