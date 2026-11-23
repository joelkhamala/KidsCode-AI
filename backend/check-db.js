const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./codequest.db');

db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Database tables:');
    tables.forEach(t => console.log('  -', t.name));
  }
  db.close();
});
