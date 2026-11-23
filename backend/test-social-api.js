const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./codequest.db');

console.log('\n=== Simulating Social API Calls ===\n');

// Simulate the leaderboard query
const timeframe = 'all';
const limit = 50;

let query = `
  SELECT u.id, u.username, u.display_name as displayName, u.avatar_url as avatarUrl,
         u.xp, u.streak, u.last_active as lastActive,
         (SELECT COUNT(*) FROM progress WHERE user_id = u.id AND completed = 1) as completedLessons,
         (SELECT COUNT(*) FROM user_achievements WHERE user_id = u.id) as achievementsCount
  FROM users u
  WHERE u.account_type = 'child'
`;

if (timeframe === 'week') {
  query += ` AND u.last_active >= date('now', '-7 days')`;
} else if (timeframe === 'month') {
  query += ` AND u.last_active >= date('now', '-30 days')`;
}

query += ` ORDER BY u.xp DESC LIMIT ?`;

console.log('Query:', query);
console.log('Limit:', limit);
console.log('');

db.all(query, [parseInt(limit)], (err, users) => {
  if (err) {
    console.error('❌ Error:', err);
  } else {
    console.log('✅ Query successful!');
    console.log('Users found:', users.length);
    console.log('');
    
    // Add rank positions
    const leaderboard = users.map((user, index) => ({
      ...user,
      rank: index + 1
    }));
    
    console.log('=== Leaderboard Data ===');
    leaderboard.forEach(user => {
      console.log(`#${user.rank} - ${user.username} (${user.displayName || 'N/A'})`);
      console.log(`   XP: ${user.xp}, Streak: ${user.streak}, Lessons: ${user.completedLessons}`);
    });
    
    console.log('\n=== JSON Response ===');
    console.log(JSON.stringify({ leaderboard }, null, 2));
  }
  
  db.close();
});
