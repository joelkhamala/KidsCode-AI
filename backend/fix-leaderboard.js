const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'codequest.db');

console.log('🔧 Fixing leaderboard_cache table UNIQUE constraint...\n');

const db = new sqlite3.Database(DB_PATH);

db.serialize(() => {
  // Backup existing data
  db.run(`CREATE TABLE IF NOT EXISTS leaderboard_cache_backup AS SELECT * FROM leaderboard_cache`, (err) => {
    if (err) {
      console.error('❌ Error backing up data:', err);
      db.close();
      return;
    }
    console.log('✅ Backed up existing leaderboard data');
    
    // Drop old table
    db.run(`DROP TABLE leaderboard_cache`, (err) => {
      if (err) {
        console.error('❌ Error dropping table:', err);
        db.close();
        return;
      }
      console.log('✅ Dropped old leaderboard_cache table');
      
      // Create new table with UNIQUE constraint on user_id
      db.run(`
        CREATE TABLE leaderboard_cache (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL UNIQUE,
          username TEXT NOT NULL,
          display_name TEXT,
          avatar_url TEXT,
          total_xp INTEGER DEFAULT 0,
          lessons_completed INTEGER DEFAULT 0,
          achievements_count INTEGER DEFAULT 0,
          current_streak INTEGER DEFAULT 0,
          rank_position INTEGER,
          last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) {
          console.error('❌ Error creating new table:', err);
          db.close();
          return;
        }
        console.log('✅ Created new leaderboard_cache table with UNIQUE constraint on user_id');
        
        // Restore data (removing duplicates)
        db.run(`
          INSERT INTO leaderboard_cache (id, user_id, username, display_name, avatar_url, total_xp, lessons_completed, achievements_count, current_streak, rank_position, last_updated)
          SELECT id, user_id, username, display_name, avatar_url, total_xp, lessons_completed, achievements_count, current_streak, rank_position, last_updated
          FROM leaderboard_cache_backup
          GROUP BY user_id
          HAVING id = MAX(id)
        `, (err) => {
          if (err) {
            console.error('❌ Error restoring data:', err);
            db.close();
            return;
          }
          console.log('✅ Restored leaderboard data (removed duplicates)');
          
          // Drop backup table
          db.run(`DROP TABLE leaderboard_cache_backup`, (err) => {
            if (err) {
              console.error('❌ Error dropping backup:', err);
              db.close();
              return;
            }
            console.log('✅ Cleaned up backup table');
            
            console.log('\n🎉 Fix complete! You can now restart the server with: node server.js\n');
            
            db.close();
          });
        });
      });
    });
  });
});
