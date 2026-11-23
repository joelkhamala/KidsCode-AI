const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'codequest.db');

console.log('🔧 Fixing progress table UNIQUE constraint...\n');

const db = new sqlite3.Database(DB_PATH);

db.serialize(() => {
  // Check if the constraint exists
  db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='progress'", (err, row) => {
    if (err) {
      console.error('❌ Error checking table:', err);
      return;
    }
    
    console.log('Current progress table schema:');
    console.log(row.sql);
    console.log('\n');
    
    // Check if UNIQUE constraint exists
    if (row.sql.includes('UNIQUE(user_id, lesson_id)')) {
      console.log('✅ UNIQUE constraint already exists! No fix needed.');
      db.close();
      return;
    }
    
    console.log('⚠️  UNIQUE constraint missing. Recreating table...\n');
    
    // Backup existing data
    db.run(`CREATE TABLE progress_backup AS SELECT * FROM progress`, (err) => {
      if (err) {
        console.error('❌ Error backing up data:', err);
        return;
      }
      console.log('✅ Backed up existing progress data');
      
      // Drop old table
      db.run(`DROP TABLE progress`, (err) => {
        if (err) {
          console.error('❌ Error dropping table:', err);
          return;
        }
        console.log('✅ Dropped old progress table');
        
        // Create new table with UNIQUE constraint
        db.run(`
          CREATE TABLE progress (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            module_id INTEGER,
            lesson_id INTEGER,
            completed INTEGER DEFAULT 0,
            last_code TEXT,
            score INTEGER DEFAULT 0,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            UNIQUE(user_id, lesson_id)
          )
        `, (err) => {
          if (err) {
            console.error('❌ Error creating new table:', err);
            return;
          }
          console.log('✅ Created new progress table with UNIQUE constraint');
          
          // Restore data (removing duplicates)
          db.run(`
            INSERT INTO progress (id, user_id, module_id, lesson_id, completed, last_code, score, updated_at)
            SELECT id, user_id, module_id, lesson_id, completed, last_code, score, updated_at
            FROM progress_backup
            GROUP BY user_id, lesson_id
            HAVING id = MAX(id)
          `, (err) => {
            if (err) {
              console.error('❌ Error restoring data:', err);
              return;
            }
            console.log('✅ Restored progress data (removed duplicates)');
            
            // Drop backup table
            db.run(`DROP TABLE progress_backup`, (err) => {
              if (err) {
                console.error('❌ Error dropping backup:', err);
                return;
              }
              console.log('✅ Cleaned up backup table');
              
              // Verify
              db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='progress'", (err, row) => {
                if (err) {
                  console.error('❌ Error verifying:', err);
                  return;
                }
                
                console.log('\n✅ Fix complete! New schema:');
                console.log(row.sql);
                console.log('\n🎉 You can now restart the server with: node server.js\n');
                
                db.close();
              });
            });
          });
        });
      });
    });
  });
});
