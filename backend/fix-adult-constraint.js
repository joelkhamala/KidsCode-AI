const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'codequest.db');
const db = new sqlite3.Database(DB_PATH);

console.log('🔧 Fixing users table to support adult_learner...\n');

db.serialize(() => {
  // Step 0: Drop users_new if it exists
  console.log('0️⃣ Cleaning up any previous migration attempts...');
  db.run(`DROP TABLE IF EXISTS users_new`, (err) => {
    if (err) {
      console.error('❌ Error dropping users_new:', err.message);
    } else {
      console.log('✅ Cleanup complete');
    }
  });

  // Step 1: Create new table with correct constraint
  console.log('1️⃣ Creating new users table with adult_learner support...');
  db.run(`
    CREATE TABLE users_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_type TEXT DEFAULT 'child' CHECK(account_type IN ('parent', 'child', 'teacher', 'adult_learner')),
      username TEXT UNIQUE,
      email TEXT UNIQUE,
      password TEXT,
      first_name TEXT,
      last_name TEXT,
      phone_number TEXT,
      display_name TEXT,
      age INTEGER,
      parent_id INTEGER,
      parent_email TEXT,
      avatar_url TEXT,
      xp INTEGER DEFAULT 0,
      streak INTEGER DEFAULT 0,
      last_active DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) {
      console.error('❌ Error creating new table:', err.message);
      db.close();
      return;
    }
    console.log('✅ New table created');

    // Step 2: Copy all data from old table
    console.log('2️⃣ Copying existing data...');
    db.run(`
      INSERT INTO users_new 
      SELECT * FROM users
    `, (err) => {
      if (err) {
        console.error('❌ Error copying data:', err.message);
        db.close();
        return;
      }
      console.log('✅ Data copied');

      // Step 3: Drop old table
      console.log('3️⃣ Dropping old table...');
      db.run(`DROP TABLE users`, (err) => {
        if (err) {
          console.error('❌ Error dropping old table:', err.message);
          db.close();
          return;
        }
        console.log('✅ Old table dropped');

        // Step 4: Rename new table
        console.log('4️⃣ Renaming new table...');
        db.run(`ALTER TABLE users_new RENAME TO users`, (err) => {
          if (err) {
            console.error('❌ Error renaming table:', err.message);
            db.close();
            return;
          }
          console.log('✅ Table renamed');
          console.log('\n🎉 Users table updated successfully!');
          console.log('✨ adult_learner account type is now supported');
          db.close();
        });
      });
    });
  });
});
