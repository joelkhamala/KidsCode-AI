const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./codequest.db');

console.log('\n=== Testing Leaderboard Data ===\n');

// Check leaderboard cache
db.all(`SELECT * FROM leaderboard_cache ORDER BY rank LIMIT 10`, [], (err, cache) => {
  if (err) {
    console.error('Error reading leaderboard_cache:', err);
  } else {
    console.log('Leaderboard Cache entries:', cache.length);
    if (cache.length > 0) {
      console.log('Top 3:');
      cache.slice(0, 3).forEach(entry => {
        console.log(`  #${entry.rank} - User ID ${entry.user_id}: ${entry.xp} XP`);
      });
    } else {
      console.log('  ⚠️ Leaderboard cache is empty!');
    }
  }
  
  // Check users with XP
  db.all(`SELECT id, username, email, xp, streak FROM users WHERE account_type = 'child' ORDER BY xp DESC LIMIT 10`, [], (err, users) => {
    if (err) {
      console.error('Error reading users:', err);
    } else {
      console.log('\n=== Top Users by XP ===');
      console.log('Total child users with XP:', users.length);
      users.forEach((user, index) => {
        console.log(`  #${index + 1} - ${user.username}: ${user.xp || 0} XP, ${user.streak || 0} streak`);
      });
      
      if (users.length > 0 && users[0].xp === 0) {
        console.log('\n⚠️ WARNING: Users have 0 XP. Leaderboard will be empty.');
      }
    }
    
    // Check friendships
    db.get(`SELECT COUNT(*) as count FROM friendships`, [], (err, result) => {
      if (err) {
        console.error('Error:', err);
      } else {
        console.log('\n=== Friendships ===');
        console.log('Total friendships:', result.count);
      }
      
      // Check friend requests
      db.get(`SELECT COUNT(*) as count FROM friend_requests`, [], (err, result) => {
        if (err) {
          console.error('Error:', err);
        } else {
          console.log('Total friend requests:', result.count);
        }
        
        db.close();
      });
    });
  });
});
