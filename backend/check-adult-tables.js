const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./codequest.db');

console.log('Checking for adult learner tables...\n');

db.all(`SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%adult%'`, (err, rows) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Adult tables found:', rows);
  }
  
  // Also check users table for adult_learner account type
  db.all(`SELECT DISTINCT account_type FROM users`, (err, types) => {
    if (err) {
      console.error('Error checking account types:', err);
    } else {
      console.log('\nAccount types in users table:', types);
    }
    db.close();
  });
});
