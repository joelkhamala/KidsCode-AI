const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'codequest.db');

function migrateDatabase() {
  const db = new sqlite3.Database(DB_PATH);

  console.log('🔄 Starting database migration for teacher accounts...');

  db.serialize(() => {
    // Step 1: Create backup of users table
    console.log('📦 Creating backup of users table...');
    db.run(`CREATE TABLE IF NOT EXISTS users_backup AS SELECT * FROM users`);

    // Step 2: Drop the old users table
    console.log('🗑️  Dropping old users table...');
    db.run(`DROP TABLE IF EXISTS users`);

    // Step 3: Create new users table with teacher account type
    console.log('✨ Creating new users table with teacher support...');
    db.run(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_type TEXT DEFAULT 'child' CHECK(account_type IN ('parent', 'child', 'teacher')),
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

    // Step 4: Restore data from backup
    console.log('📥 Restoring data from backup...');
    db.run(`
      INSERT INTO users 
      SELECT * FROM users_backup
    `);

    // Step 5: Create teacher_student_relationships table
    console.log('🏫 Creating teacher_student_relationships table...');
    db.run(`
      CREATE TABLE IF NOT EXISTS teacher_student_relationships (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        teacher_id INTEGER NOT NULL,
        student_id INTEGER NOT NULL,
        class_name TEXT,
        enrollment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        can_view_progress INTEGER DEFAULT 1,
        can_approve_lessons INTEGER DEFAULT 1,
        status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'graduated')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(teacher_id, student_id)
      )
    `);

    // Step 6: Clean up backup table
    console.log('🧹 Cleaning up backup table...');
    db.run(`DROP TABLE IF EXISTS users_backup`, (err) => {
      if (err) {
        console.error('❌ Error during migration:', err);
      } else {
        console.log('✅ Migration completed successfully!');
        console.log('');
        console.log('📝 Summary:');
        console.log('   - Users table updated to support teacher accounts');
        console.log('   - Teacher-student relationships table created');
        console.log('   - All existing data preserved');
        console.log('');
        console.log('🎉 You can now create teacher accounts!');
      }
      db.close();
    });
  });
}

// Run migration
migrateDatabase();
