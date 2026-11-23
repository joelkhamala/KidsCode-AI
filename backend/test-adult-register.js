const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'codequest.db');
const db = new sqlite3.Database(DB_PATH);

console.log('Testing adult learner registration...\n');

// Test data
const testData = {
  email: 'testadult@example.com',
  password: 'password123',
  firstName: 'John',
  lastName: 'Doe',
  phoneNumber: '+1234567890',
  occupation: 'Developer',
  educationLevel: 'Bachelor',
  learningGoals: 'Learn web development'
};

async function testRegistration() {
  try {
    const hashedPassword = await bcrypt.hash(testData.password, 10);
    
    db.run(
      `INSERT INTO users (account_type, email, password, first_name, last_name, phone_number) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      ['adult_learner', testData.email, hashedPassword, testData.firstName, testData.lastName, testData.phoneNumber],
      function (err) {
        if (err) {
          console.error('❌ Error inserting user:', err.message);
          db.close();
          return;
        }

        const userId = this.lastID;
        console.log('✅ User created with ID:', userId);

        // Create adult learner profile
        db.run(
          `INSERT INTO adult_learner_profiles (user_id, occupation, education_level, learning_goals) 
           VALUES (?, ?, ?, ?)`,
          [userId, testData.occupation, testData.educationLevel, testData.learningGoals],
          (err) => {
            if (err) {
              console.error('❌ Error creating profile:', err.message);
            } else {
              console.log('✅ Profile created successfully');
            }
            
            // Clean up test data
            db.run(`DELETE FROM adult_learner_profiles WHERE user_id = ?`, [userId]);
            db.run(`DELETE FROM users WHERE id = ?`, [userId], () => {
              console.log('✅ Test data cleaned up');
              db.close();
            });
          }
        );
      }
    );
  } catch (error) {
    console.error('❌ Error:', error);
    db.close();
  }
}

testRegistration();
