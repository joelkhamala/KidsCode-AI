const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./codequest.db');

console.log('\n=== Checking Social/Friend Tables ===\n');

// Check for friend-related tables
db.all(
  `SELECT name FROM sqlite_master WHERE type='table' AND (name LIKE '%friend%' OR name LIKE '%social%' OR name LIKE '%leaderboard%')`,
  [],
  (err, tables) => {
    if (err) {
      console.error('Error:', err);
    } else {
      console.log('Social/Friend tables found:', tables.length);
      tables.forEach(t => console.log('  -', t.name));
    }
    
    // Check all tables
    db.all(`SELECT name FROM sqlite_master WHERE type='table'`, [], (err, allTables) => {
      if (err) {
        console.error('Error:', err);
      } else {
        console.log('\n=== All Tables ===');
        allTables.forEach(t => console.log('  -', t.name));
      }
      
      // Check if users table has necessary columns
      db.all(`PRAGMA table_info(users)`, [], (err, columns) => {
        if (err) {
          console.error('Error:', err);
        } else {
          console.log('\n=== Users Table Columns ===');
          columns.forEach(c => console.log(`  - ${c.name} (${c.type})`));
        }
        
        // Check user count
        db.get(`SELECT COUNT(*) as count FROM users`, [], (err, result) => {
          if (err) {
            console.error('Error:', err);
          } else {
            console.log('\n=== User Count ===');
            console.log('  Total users:', result.count);
          }
          
          db.close();
        });
      });
    });
  }
);
