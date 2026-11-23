const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const db = new sqlite3.Database('./codequest.db');

// Test 1: Check if user exists with username
console.log('\n=== Test 1: Check user by username ===');
db.get('SELECT * FROM users WHERE username = ?', ['codemaster_alex'], (err, user) => {
  if (err) {
    console.error('Error:', err);
  } else if (user) {
    console.log('✅ User found by username:', user.username);
    console.log('   Email:', user.email);
    console.log('   Account Type:', user.account_type);
  } else {
    console.log('❌ User not found');
  }
});

// Test 2: Check if user exists with email
console.log('\n=== Test 2: Check user by email ===');
db.get('SELECT * FROM users WHERE email = ?', ['test@example.com'], (err, user) => {
  if (err) {
    console.error('Error:', err);
  } else if (user) {
    console.log('✅ User found by email:', user.email);
    console.log('   Username:', user.username);
    console.log('   Account Type:', user.account_type);
  } else {
    console.log('❌ User not found');
  }
});

// Test 3: Check if user exists with email OR username (our new query)
console.log('\n=== Test 3: Check user by email OR username ===');
const testInput = 'codemaster_alex'; // Try with username
db.get('SELECT * FROM users WHERE email = ? OR username = ?', [testInput, testInput], async (err, user) => {
  if (err) {
    console.error('Error:', err);
  } else if (user) {
    console.log('✅ User found with input "' + testInput + '"');
    console.log('   Username:', user.username);
    console.log('   Email:', user.email);
    console.log('   Account Type:', user.account_type);
    console.log('   Has password:', !!user.password);
    
    // Test password
    if (user.password) {
      const testPassword = 'password123';
      const isValid = await bcrypt.compare(testPassword, user.password);
      console.log('   Password "password123" valid:', isValid);
    }
  } else {
    console.log('❌ User not found');
  }
  
  db.close();
});
