const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'codequest.db');
const db = new sqlite3.Database(DB_PATH);

console.log('\n🔍 Checking Parent-Child Relationships...\n');

// Check all users
db.all('SELECT id, account_type, username, email, first_name, last_name, parent_id FROM users', (err, users) => {
  if (err) {
    console.error('Error:', err);
    return;
  }

  console.log('📋 ALL USERS:');
  console.log('─'.repeat(80));
  users.forEach(user => {
    console.log(`ID: ${user.id} | Type: ${user.account_type} | Username: ${user.username || 'N/A'} | Name: ${user.first_name || 'N/A'} ${user.last_name || 'N/A'} | Parent ID: ${user.parent_id || 'None'}`);
  });

  console.log('\n📊 PARENT-CHILD RELATIONSHIPS:');
  console.log('─'.repeat(80));
  
  db.all(`
    SELECT 
      pcr.id,
      pcr.parent_id,
      p.first_name || ' ' || p.last_name as parent_name,
      pcr.child_id,
      c.username as child_username,
      c.display_name as child_display_name
    FROM parent_child_relationships pcr
    LEFT JOIN users p ON pcr.parent_id = p.id
    LEFT JOIN users c ON pcr.child_id = c.id
  `, (err, relationships) => {
    if (err) {
      console.error('Error:', err);
      return;
    }

    if (relationships.length === 0) {
      console.log('❌ No parent-child relationships found!');
    } else {
      relationships.forEach(rel => {
        console.log(`Parent: ${rel.parent_name} (ID: ${rel.parent_id}) → Child: ${rel.child_display_name || rel.child_username} (ID: ${rel.child_id})`);
      });
    }

    console.log('\n✅ Check complete!\n');
    db.close();
  });
});
