const mongoose = require('mongoose');
const User = require('./src/modules/users/user.model');
require('dotenv').config();

async function checkTokens() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all users with FCM tokens
    const users = await User.find({ fcmToken: { $exists: true, $ne: null } }).select('email fcmToken platform fcmTokenUpdatedAt');

    if (users.length === 0) {
      console.log('❌ No users found with FCM tokens');
      return;
    }

    console.log(`📱 Found ${users.length} users with FCM tokens:\n`);
    users.forEach((user, index) => {
      const token = user.fcmToken;
      const isValid = token.length > 100 && (token.includes(':') || token.includes('_'));
      
      console.log(`${index + 1}. User: ${user.email}`);
      console.log(`   Token Valid: ${isValid ? '✅' : '❌'}`);
      console.log(`   Token Length: ${token.length}`);
      console.log(`   Token Start: ${token.substring(0, 50)}...`);
      console.log(`   Token End: ...${token.substring(Math.max(0, token.length - 20))}`);
      console.log(`   Platform: ${user.platform || 'unknown'}`);
      console.log(`   Updated: ${user.fcmTokenUpdatedAt || 'never'}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

checkTokens();
