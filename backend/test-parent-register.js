const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./codequest.db');

async function testParentRegistration() {
  console.log('Testing parent registration...\n');
  
  const testData = {
    email: 'testparent@example.com',
    password: 'TestPass123',
    firstName: 'Test',
    lastName: 'Parent',
    phoneNumber: '+1234567890'
  };
  
  try {
    console.log('1. Hashing password...');
    const hashedPassword = await bcrypt.hash(testData.password, 10);
    console.log('   ✓ Password hashed successfully');
    
    console.log('\n2. Inserting into database...');
    db.run(
      `INSERT INTO users (account_type, email, password, first_name, last_name, phone_number) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['parent', testData.email, hashedPassword, testData.firstName, testData.lastName, testData.phoneNumber],
      function (err) {
        if (err) {
          console.error('   ✗ Database error:', err.message);
          console.error('   Error code:', err.code);
          console.error('   Full error:', err);
        } else {
          console.log('   ✓ Parent inserted successfully with ID:', this.lastID);
          
          console.log('\n3. Creating notification preferences...');
          db.run(
            `INSERT INTO notification_preferences (parent_id) VALUES (?)`,
            [this.lastID],
            (err) => {
              if (err) {
                console.error('   ✗ Notification preferences error:', err.message);
              } else {
                console.log('   ✓ Notification preferences created');
              }
              
              console.log('\n4. Verifying parent account...');
              db.get(
                'SELECT * FROM users WHERE id = ?',
                [this.lastID],
                (err, user) => {
                  if (err) {
                    console.error('   ✗ Query error:', err.message);
                  } else {
                    console.log('   ✓ Parent account verified:');
                    console.log('     - ID:', user.id);
                    console.log('     - Email:', user.email);
                    console.log('     - Account Type:', user.account_type);
                    console.log('     - First Name:', user.first_name);
                    console.log('     - Last Name:', user.last_name);
                  }
                  
                  db.close();
                  console.log('\n✅ Test complete!');
                }
              );
            }
          );
        }
      }
    );
  } catch (err) {
    console.error('Unexpected error:', err);
    db.close();
  }
}

testParentRegistration();
