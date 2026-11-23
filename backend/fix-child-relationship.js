const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'codequest.db');
const db = new sqlite3.Database(DB_PATH);

console.log('\n🔧 Fixing Child-Parent Relationships...\n');

// Get all parents
db.all('SELECT id, first_name, last_name, email FROM users WHERE account_type = ?', ['parent'], (err, parents) => {
  if (err) {
    console.error('Error:', err);
    return;
  }

  if (parents.length === 0) {
    console.log('❌ No parent accounts found!');
    console.log('Please create a parent account first.');
    db.close();
    return;
  }

  console.log('📋 Available Parents:');
  parents.forEach((parent, index) => {
    console.log(`${index + 1}. ${parent.first_name} ${parent.last_name} (ID: ${parent.id}) - ${parent.email}`);
  });

  // Get all children without parent relationships
  db.all(`
    SELECT u.id, u.username, u.display_name, u.email, u.parent_id
    FROM users u
    LEFT JOIN parent_child_relationships pcr ON u.id = pcr.child_id
    WHERE u.account_type = 'child' AND pcr.id IS NULL
  `, (err, orphanChildren) => {
    if (err) {
      console.error('Error:', err);
      db.close();
      return;
    }

    if (orphanChildren.length === 0) {
      console.log('\n✅ All children are already linked to parents!');
      db.close();
      return;
    }

    console.log('\n📋 Children without parent relationships:');
    orphanChildren.forEach((child, index) => {
      console.log(`${index + 1}. ${child.display_name || child.username} (ID: ${child.id}) - ${child.email}`);
    });

    // Auto-link: If there's only one parent, link all orphan children to that parent
    if (parents.length === 1) {
      const parentId = parents[0].id;
      console.log(`\n🔗 Auto-linking all children to ${parents[0].first_name} ${parents[0].last_name}...`);

      let completed = 0;
      orphanChildren.forEach(child => {
        // Update parent_id in users table
        db.run('UPDATE users SET parent_id = ? WHERE id = ?', [parentId, child.id], (err) => {
          if (err) {
            console.error(`Error updating child ${child.id}:`, err);
          }
        });

        // Create relationship
        db.run(
          'INSERT INTO parent_child_relationships (parent_id, child_id, relationship_type) VALUES (?, ?, ?)',
          [parentId, child.id, 'primary'],
          (err) => {
            if (err) {
              console.error(`Error creating relationship for child ${child.id}:`, err);
            } else {
              console.log(`✅ Linked ${child.display_name || child.username} to parent`);
            }
            
            completed++;
            if (completed === orphanChildren.length) {
              console.log('\n🎉 All children have been linked!');
              console.log('You can now use "View Progress" in the parent dashboard.');
              db.close();
            }
          }
        );
      });
    } else {
      console.log('\n⚠️  Multiple parents found. Please manually specify which children belong to which parent.');
      console.log('Run this SQL in the database:');
      console.log('\nINSERT INTO parent_child_relationships (parent_id, child_id, relationship_type)');
      console.log('VALUES (PARENT_ID, CHILD_ID, \'primary\');');
      db.close();
    }
  });
});
