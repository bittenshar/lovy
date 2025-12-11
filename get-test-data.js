/**
 * Helper script to extract conversation IDs and tokens from running app
 * This helps you gather the right parameters for test-message-send.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Conversation = require('./models/conversation');
const User = require('./src/modules/users/user.model');

async function main() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/workconnect', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📊 TEST DATA GATHERING');
    console.log('═══════════════════════════════════════════════════════\n');

    // Get conversations
    const conversations = await Conversation.find().limit(5).populate('participants', '_id email firstName');
    
    if (conversations.length === 0) {
      console.log('❌ No conversations found in database');
      process.exit(0);
    }

    console.log(`✅ Found ${conversations.length} conversation(s):\n`);
    
    conversations.forEach((conv, index) => {
      console.log(`${index + 1}. Conversation ID: ${conv._id}`);
      console.log(`   Participants: ${conv.participants.map(p => `${p.email} (${p._id})`).join(', ')}`);
      console.log(`   Last message: ${conv.lastMessageText || 'None'}`);
      console.log();
    });

    // Get users
    const users = await User.find().limit(5).select('_id email firstName fcmToken');
    
    console.log(`✅ Found ${users.length} user(s):\n`);
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. User: ${user.email}`);
      console.log(`   ID: ${user._id}`);
      console.log(`   FCM Token: ${user.fcmToken ? user.fcmToken.substring(0, 30) + '...' : '❌ NO TOKEN'}`);
      console.log();
    });

    console.log('═══════════════════════════════════════════════════════');
    console.log('🔐 To get a JWT token, login via the app and check:');
    console.log('   - SharedPreferences (Android) for "auth_token"');
    console.log('   - Keychain (iOS) for token');
    console.log('   OR use: POST /api/auth/login with credentials');
    console.log('═══════════════════════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
