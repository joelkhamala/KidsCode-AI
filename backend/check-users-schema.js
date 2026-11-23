const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'codequest.db');
const db = new sqlite3.Database(DB_PATH);

console.log('Checking users table schema...\n');

db.get(`SELECT sql FROM sqlite_master WHERE type='table' AND name='users'`, (err, row) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Current users table schema:');
    console.log(row.sql);
  }
  db.close();
});
