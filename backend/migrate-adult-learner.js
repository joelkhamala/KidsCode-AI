const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'codequest.db');
const db = new sqlite3.Database(DB_PATH);

console.log('🚀 Starting Adult Learner Migration...\n');

db.serialize(() => {
  // 1. Update users table to support adult_learner account type
  console.log('📝 Updating users table...');
  db.run(`
    CREATE TABLE IF NOT EXISTS users_new (
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
      console.error('❌ Error updating users table:', err);
    } else {
      console.log('✅ Users table updated');
    }
  });

  // 2. Create adult learner profiles table
  console.log('📝 Creating adult_learner_profiles table...');
  db.run(`
    CREATE TABLE IF NOT EXISTS adult_learner_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      occupation TEXT,
      education_level TEXT,
      learning_goals TEXT,
      preferred_learning_pace TEXT DEFAULT 'self_paced',
      total_hours_logged INTEGER DEFAULT 0,
      certification_eligible INTEGER DEFAULT 0,
      certification_issued_date DATE,
      certificate_number TEXT UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) {
      console.error('❌ Error creating adult_learner_profiles:', err);
    } else {
      console.log('✅ adult_learner_profiles table created');
    }
  });

  // 3. Create assessment results table
  console.log('📝 Creating assessment_results table...');
  db.run(`
    CREATE TABLE IF NOT EXISTS assessment_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      lesson_id INTEGER NOT NULL,
      assessment_type TEXT CHECK(assessment_type IN ('practical', 'written', 'oral')),
      score INTEGER NOT NULL,
      max_score INTEGER NOT NULL,
      percentage INTEGER NOT NULL,
      passed INTEGER DEFAULT 0,
      feedback TEXT,
      submission_data TEXT,
      graded_by INTEGER,
      completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (lesson_id) REFERENCES lessons(id),
      FOREIGN KEY (graded_by) REFERENCES users(id)
    )
  `, (err) => {
    if (err) {
      console.error('❌ Error creating assessment_results:', err);
    } else {
      console.log('✅ assessment_results table created');
    }
  });

  // 4. Create learning hours log table
  console.log('📝 Creating learning_hours_log table...');
  db.run(`
    CREATE TABLE IF NOT EXISTS learning_hours_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      module_id INTEGER,
      lesson_id INTEGER,
      session_start DATETIME NOT NULL,
      session_end DATETIME,
      duration_minutes INTEGER,
      activity_type TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (module_id) REFERENCES modules(id),
      FOREIGN KEY (lesson_id) REFERENCES lessons(id)
    )
  `, (err) => {
    if (err) {
      console.error('❌ Error creating learning_hours_log:', err);
    } else {
      console.log('✅ learning_hours_log table created');
    }
  });

  // 5. Create certificates table
  console.log('📝 Creating certificates table...');
  db.run(`
    CREATE TABLE IF NOT EXISTS certificates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      certificate_number TEXT UNIQUE NOT NULL,
      curriculum_code TEXT DEFAULT 'ICT/CU/CP/CR/08/6/A',
      issue_date DATE NOT NULL,
      total_hours INTEGER NOT NULL,
      overall_score INTEGER,
      verification_code TEXT UNIQUE,
      pdf_path TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) {
      console.error('❌ Error creating certificates:', err);
    } else {
      console.log('✅ certificates table created');
    }
  });

  // 6. Update modules table for adult curriculum
  console.log('📝 Updating modules table...');
  db.run(`
    ALTER TABLE modules ADD COLUMN target_audience TEXT DEFAULT 'children' CHECK(target_audience IN ('children', 'adults', 'both'))
  `, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('❌ Error updating modules:', err);
    } else {
      console.log('✅ modules table updated');
    }
  });

  db.run(`
    ALTER TABLE modules ADD COLUMN estimated_hours INTEGER DEFAULT 0
  `, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('❌ Error updating modules:', err);
    } else {
      console.log('✅ modules table updated with estimated_hours');
    }
  });

  // 7. Update lessons table for assessments
  console.log('📝 Updating lessons table...');
  db.run(`
    ALTER TABLE lessons ADD COLUMN has_practical_test INTEGER DEFAULT 0
  `, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('❌ Error updating lessons:', err);
    } else {
      console.log('✅ lessons table updated');
    }
  });

  db.run(`
    ALTER TABLE lessons ADD COLUMN has_written_test INTEGER DEFAULT 0
  `, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('❌ Error updating lessons:', err);
    }
  });

  db.run(`
    ALTER TABLE lessons ADD COLUMN has_oral_test INTEGER DEFAULT 0
  `, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('❌ Error updating lessons:', err);
    }
  });

  db.run(`
    ALTER TABLE lessons ADD COLUMN assessment_criteria TEXT
  `, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('❌ Error updating lessons:', err);
    }
  });

  // Wait for all operations to complete
  setTimeout(() => {
    console.log('\n✨ Migration completed successfully!');
    console.log('\n📊 Summary:');
    console.log('   - Added adult_learner account type');
    console.log('   - Created adult_learner_profiles table');
    console.log('   - Created assessment_results table');
    console.log('   - Created learning_hours_log table');
    console.log('   - Created certificates table');
    console.log('   - Updated modules and lessons tables');
    console.log('\n🎓 Ready to add adult learner curriculum!\n');
    
    db.close();
  }, 2000);
});
