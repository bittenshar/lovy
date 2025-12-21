#!/usr/bin/env node

/**
 * 💬 INTERACTIVE REAL CHAT MESSAGE NOTIFICATION TEST
 * 
 * Send REAL chat messages between users with live notifications
 * Fully interactive - you control the conversation
 * 
 * Usage:
 *   node test-interactive-chat.js
 */

const admin = require('firebase-admin');
const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const readline = require('readline');

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

const userSchema = new mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  email: String,
  firstName: String,
  lastName: String,
}, { collection: 'users' });

const UserFcmToken = mongoose.model('UserFcmToken', userFcmTokenSchema);
const User = mongoose.model('User', userSchema);

function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function question(rl, prompt) {
  return new Promise(resolve => {
    rl.question(prompt, resolve);
  });
}

async function getUserByEmail(email) {
  try {
    return await User.findOne({ email }).select('_id email firstName lastName');
  } catch (error) {
    return null;
  }
}

async function sendChatNotification(recipientId, senderName, senderUserId, messageContent) {
  try {
    const recipientTokenData = await UserFcmToken.findOne({ userId: recipientId });
    
    if (!recipientTokenData || !recipientTokenData.tokens || recipientTokenData.tokens.length === 0) {
      return { sent: 0, failed: 0 };
    }

    const activeTokens = recipientTokenData.tokens.filter(t => t.isActive);
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
        successCount++;
      } catch (error) {
        failureCount++;
      }
    }

    return { sent: successCount, failed: failureCount };
  } catch (error) {
    return { sent: 0, failed: 0 };
  }
}

async function main() {
  try {
    console.log('\n========== INTERACTIVE REAL CHAT TEST ==========\n');
    
    // Connect to MongoDB
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected\n');

    // Get users
    console.log('👥 Loading users...');
    const userD = await getUserByEmail('d@gmail.com');
    const userV = await getUserByEmail('v@gmail.com');

    if (!userD || !userV) {
      console.log('❌ Could not find users');
      await mongoose.connection.close();
      return;
    }

    const userDId = userD._id.toString();
    const userVId = userV._id.toString();
    const userDName = `${userD.firstName} ${userD.lastName}`.trim() || userD.email;
    const userVName = `${userV.firstName} ${userV.lastName}`.trim() || userV.email;

    console.log(`✅ User D: ${userDName}`);
    console.log(`✅ User V: ${userVName}\n`);

    const rl = createInterface();

    console.log('📝 MODES:');
    console.log('  1. Send message from D to V');
    console.log('  2. Send message from V to D');
    console.log('  3. Exchange conversation (back and forth)');
    console.log('  4. Exit\n');

    let totalSent = 0;
    let continueLoop = true;

    while (continueLoop) {
      const mode = await question(rl, '🔘 Choose mode (1-4): ');

      switch (mode) {
        case '1':
          const msgD = await question(rl, `💬 ${userDName} says: `);
          if (msgD.trim()) {
            const result = await sendChatNotification(userVId, userDName, userDId, msgD);
            totalSent += result.sent;
            console.log(`✅ Sent to ${result.sent} device(s)\n`);
          }
          break;

        case '2':
          const msgV = await question(rl, `💬 ${userVName} says: `);
          if (msgV.trim()) {
            const result = await sendChatNotification(userDId, userVName, userVId, msgV);
            totalSent += result.sent;
            console.log(`✅ Sent to ${result.sent} device(s)\n`);
          }
          break;

        case '3':
          console.log('\n📞 SIMULATING CONVERSATION...\n');
          
          const messages = [
            { sender: 'D', msg: 'Hi! How are you today?' },
            { sender: 'V', msg: 'Great! How about you?' },
            { sender: 'D', msg: 'Doing well! Got a job opportunity for you' },
            { sender: 'V', msg: 'Sounds interesting! Tell me more' },
            { sender: 'D', msg: 'It\'s a remote position, great pay!' },
            { sender: 'V', msg: 'Count me in! When can we start?' },
          ];

          for (const { sender, msg } of messages) {
            if (sender === 'D') {
              console.log(`${userDName}: ${msg}`);
              const result = await sendChatNotification(userVId, userDName, userDId, msg);
              totalSent += result.sent;
            } else {
              console.log(`${userVName}: ${msg}`);
              const result = await sendChatNotification(userDId, userVName, userVId, msg);
              totalSent += result.sent;
            }
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          console.log('\n');
          break;

        case '4':
          continueLoop = false;
          break;

        default:
          console.log('Invalid choice. Try again.\n');
      }
    }

    console.log(`\n========== SUMMARY ==========`);
    console.log(`✅ Total notifications sent: ${totalSent}`);
    console.log(`📊 All messages delivered via FCM\n`);

    rl.close();
    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
