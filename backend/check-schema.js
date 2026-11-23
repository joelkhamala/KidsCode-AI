const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./codequest.db');

console.log('Checking users table schema...\n');

db.all("PRAGMA table_info(users)", (err, columns) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Users table columns:');
    columns.forEach(col => {
      console.log(`  - ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''} ${col.dflt_value ? 'DEFAULT ' + col.dflt_value : ''}`);
    });
  }
  
  console.log('\n\nChecking parent_child_relationships table...\n');
  
  db.all("PRAGMA table_info(parent_child_relationships)", (err, columns) => {
    if (err) {
      console.error('Error:', err);
    } else {
      console.log('parent_child_relationships table columns:');
      columns.forEach(col => {
        console.log(`  - ${col.name} (${col.type})`);
      });
    }
    
    console.log('\n\nChecking notification_preferences table...\n');
    
    db.all("PRAGMA table_info(notification_preferences)", (err, columns) => {
      if (err) {
        console.error('Error:', err);
      } else {
        console.log('notification_preferences table columns:');
        columns.forEach(col => {
          console.log(`  - ${col.name} (${col.type})`);
        });
      }
      db.close();
    });
  });
});
