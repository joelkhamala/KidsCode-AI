const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'codequest.db');
const db = new sqlite3.Database(DB_PATH);

console.log('🔍 Checking all table schemas...\n');

const tables = ['progress', 'learning_metrics', 'module_completions', 'leaderboard_cache'];

tables.forEach(tableName => {
  db.get(
    "SELECT sql FROM sqlite_master WHERE type='table' AND name=?",
    [tableName],
    (err, row) => {
      if (err) {
        console.error(`❌ Error checking ${tableName}:`, err);
        return;
      }
      
      if (!row) {
        console.log(`⚠️  Table ${tableName} not found\n`);
        return;
      }
      
      console.log(`✅ Table: ${tableName}`);
      console.log(row.sql);
      console.log('\n');
    }
  );
});

setTimeout(() => {
  db.close();
  console.log('Done!');
}, 2000);
