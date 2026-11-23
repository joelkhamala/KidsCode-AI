const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./codequest.db');

console.log('Starting database migration...\n');

db.serialize(() => {
  // Enable foreign keys
  db.run('PRAGMA foreign_keys = OFF');

  console.log('Step 1: Creating backup of users table...');
  db.run(`CREATE TABLE users_backup AS SELECT * FROM users`);

  console.log('Step 2: Dropping old users table...');
  db.run(`DROP TABLE users`);

  console.log('Step 3: Creating new users table with all columns...');
  db.run(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_type TEXT DEFAULT 'child' CHECK(account_type IN ('parent', 'child')),
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
  `);

  console.log('Step 4: Migrating existing data...');
  db.run(`
    INSERT INTO users (
      id, account_type, username, email, password, age, parent_email, 
      xp, streak, last_active, created_at
    )
    SELECT 
      id, 'child', username, email, password, age, parent_email,
      xp, streak, last_active, created_at
    FROM users_backup
  `);

  console.log('Step 5: Dropping backup table...');
  db.run(`DROP TABLE users_backup`);

  console.log('Step 6: Re-enabling foreign keys...');
  db.run('PRAGMA foreign_keys = ON');

  console.log('\n✅ Migration complete!');
  console.log('All existing users have been migrated as "child" accounts.');
  console.log('You can now create parent accounts.\n');

  db.close();
});
