#!/usr/bin/env node

/**
 * 🔥 REAL CHAT MESSAGE NOTIFICATION TEST
 * 
 * Tests REAL conversation messages with FCM notifications
 * Simulates actual user-to-user messaging with notifications
 * 
 * Usage:
 *   node test-real-chat-notifications.js
 */

const admin = require('firebase-admin');
const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, 'src', 'config', 'config.env') });

// Initialize Firebase Admin
const serviceAccount = require('./firebase-service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id,
});

const messaging = admin.messaging();

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/work-connect';

// Database Models
const userFcmTokenSchema = new mongoose.Schema({
  userId: String,
  tokens: [{
    token: String,
    deviceType: String,
    isActive: Boolean,
  }],
}, { collection: 'userfcmtokens' });

const conversationSchema = new mongoose.Schema({
  initiatorId: String,
  recipientId: String,
  messages: [{
    senderId: String,
    body: String,
    createdAt: Date,
    readAt: Date,
  }],
  createdAt: Date,
  updatedAt: Date,
}, { collection: 'conversations' });

const userSchema = new mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  email: String,
  firstName: String,
  lastName: String,
}, { collection: 'users' });

const UserFcmToken = mongoose.model('UserFcmToken', userFcmTokenSchema);
const Conversation = mongoose.model('Conversation', conversationSchema);
const User = mongoose.model('User', userSchema);

async function getUserByEmail(email) {
  try {
    return await User.findOne({ email }).select('_id email firstName lastName');
  } catch (error) {
    console.log(`⚠️ Error finding user ${email}`);
    return null;
  }
}

async function getUserNameFromId(userId) {
  try {
    const user = await User.findById(userId).select('firstName lastName email');
    if (user) {
      return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
    }
    return userId.substring(0, 8);
  } catch (error) {
    return userId.substring(0, 8);
  }
}

async function sendChatNotification(recipientId, senderName, senderUserId, messageContent) {
  try {
    const recipientTokenData = await UserFcmToken.findOne({ userId: recipientId });
    
    if (!recipientTokenData || !recipientTokenData.tokens || recipientTokenData.tokens.length === 0) {
      return { sent: 0, failed: 0 };
    }

    const activeTokens = recipientTokenData.tokens.filter(t => t.isActive);
    if (activeTokens.length === 0) {
      return { sent: 0, failed: 0 };
    }

    let successCount = 0;
    let failureCount = 0;

    for (const tokenObj of activeTokens) {
      try {
        const notificationMessage = {
          notification: {
            title: `💬 ${senderName}`,
            body: messageContent.substring(0, 100),
          },
          data: {
            type: 'chat',
            senderId: senderUserId,
            senderName: senderName,
            message: messageContent,
            timestamp: new Date().toISOString(),
          },
          token: tokenObj.token,
        };

        const response = await messaging.send(notificationMessage);
        console.log(`      ✅ Notification sent: ${response}`);
        successCount++;
      } catch (error) {
        console.log(`      ❌ Failed to send: ${error.message}`);
        failureCount++;
      }
    }

    return { sent: successCount, failed: failureCount };
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return { sent: 0, failed: 0 };
  }
}

async function main() {
  try {
    console.log('\n========== REAL CHAT MESSAGE NOTIFICATION TEST ==========\n');
    
    // Connect to MongoDB
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected\n');

    // Get users by email
    console.log('👥 Looking up users by email...');
    const userD = await getUserByEmail('d@gmail.com');
    const userV = await getUserByEmail('v@gmail.com');

    if (!userD || !userV) {
      console.log('❌ Could not find one or both users');
      console.log(`   d@gmail.com: ${userD ? '✅' : '❌'}`);
      console.log(`   v@gmail.com: ${userV ? '✅' : '❌'}`);
      await mongoose.connection.close();
      return;
    }

    const userDId = userD._id.toString();
    const userVId = userV._id.toString();
    const userDName = `${userD.firstName} ${userD.lastName}`.trim() || userD.email;
    const userVName = `${userV.firstName} ${userV.lastName}`.trim() || userV.email;

    console.log(`✅ User D: ${userDName} (${userDId})`);
    console.log(`✅ User V: ${userVName} (${userVId})\n`);

    let totalSent = 0;
    let totalFailed = 0;

    // Test conversation 1: D sends messages to V
    console.log(`\n📤 SCENARIO 1: ${userDName} sends messages to ${userVName}`);
    console.log('=' .repeat(60));

    const messagesD2V = [
      'Hey! How are you doing today?',
      'I wanted to check if you are available for that job we discussed earlier',
      'Let me know your availability. Looking forward to hearing from you!',
    ];

    for (const msg of messagesD2V) {
      console.log(`\n💬 Message: "${msg}"`);
      const result = await sendChatNotification(userVId, userDName, userDId, msg);
      totalSent += result.sent;
      totalFailed += result.failed;
      console.log(`   Sent to ${result.sent} token(s), Failed: ${result.failed}`);
    }

    // Test conversation 2: V sends messages to D
    console.log(`\n\n📤 SCENARIO 2: ${userVName} sends messages to ${userDName}`);
    console.log('='.repeat(60));

    const messagesV2D = [
      'Hey! I\'m doing great, thanks for asking!',
      'Yes, I\'m definitely interested in that job opportunity',
      'I\'m available this week. When would be a good time to discuss?',
    ];

    for (const msg of messagesV2D) {
      console.log(`\n💬 Message: "${msg}"`);
      const result = await sendChatNotification(userDId, userVName, userVId, msg);
      totalSent += result.sent;
      totalFailed += result.failed;
      console.log(`   Sent to ${result.sent} token(s), Failed: ${result.failed}`);
    }

    console.log(`\n\n========== RESULTS ==========`);
    console.log(`✅ Total notifications sent: ${totalSent}`);
    console.log(`❌ Total notifications failed: ${totalFailed}`);
    console.log(`📊 Success rate: ${totalSent > 0 ? ((totalSent / (totalSent + totalFailed)) * 100).toFixed(2) : 0}%\n`);

    console.log('💡 TIP: Check both browser tabs for notifications!');
    console.log('   Tab 1 (d@gmail.com): Should receive 3 messages from V');
    console.log('   Tab 2 (v@gmail.com): Should receive 3 messages from D\n');

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main();
