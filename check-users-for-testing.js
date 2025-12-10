// Quick script to check if other users exist in database
const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/team-management', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', userSchema, 'users');

async function checkUsers() {
  try {
    console.log('Fetching all users...\n');
    
    const users = await User.find({}, 'firstname lastname email _id').limit(10);
    
    console.log(`Found ${users.length} users:\n`);
    users.forEach((user, i) => {
      console.log(`${i + 1}. ${user.firstname} ${user.lastname}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   ID: ${user._id}\n`);
    });
    
    if (users.length >= 2) {
      console.log('\n✅ You have at least 2 users! Use for testing:');
      console.log(`\n   User 1: ${users[0].email} (${users[0]._id})`);
      console.log(`   User 2: ${users[1].email} (${users[1]._id})`);
    } else if (users.length === 1) {
      console.log('\n⚠️  Only 1 user found. Create a new user with:');
      console.log(`   
POST http://localhost:3000/api/auth/signup
Body: {
  "firstname": "Test",
  "lastname": "User2",
  "email": "testuser2@example.com",
  "password": "password123",
  "userType": "employer"
}
      `);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    mongoose.connection.close();
  }
}

checkUsers();
