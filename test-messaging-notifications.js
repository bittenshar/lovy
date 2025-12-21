#!/usr/bin/env node

/**
 * 📨 FCM Messaging Notification Tester
 * 
 * Sends test notifications to specific user IDs
 * Notifications appear in the messaging/conversation feature
 * 
 * Usage:
 *   node test-messaging-notifications.js
 */

const admin = require('firebase-admin');
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const readline = require('readline');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, 'src', 'config', 'config.env') });

// Initialize Firebase
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || 
                          path.join(__dirname, 'firebase-service-account.json');

console.log('\n🚀 FCM Messaging Notification Tester');
console.log('=====================================\n');

try {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('✅ Firebase Admin SDK initialized\n');
} catch (error) {
  console.error('❌ Firebase init failed:', error.message);
  process.exit(1);
}

// Connect to MongoDB
const mongoUrl = process.env.MONGO_URI || process.env.DATABASE_URL;
mongoose.connect(mongoUrl)
  .then(() => console.log('✅ MongoDB connected\n'))
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    process.exit(1);
  });

// Define UserFcmToken schema
const userFcmTokenSchema = new mongoose.Schema({
  userId: String,
  tokens: [{
    token: String,
    deviceType: String,
    isActive: Boolean
  }]
});

const UserFcmToken = mongoose.model('userfcmtoken', userFcmTokenSchema, 'userfcmtokens');

// Test notifications data
const testNotifications = [
  {
    title: '💬 New Message',
    body: 'You received a message from your employer',
    data: {
      type: 'message',
      conversationId: '69485ec5b4a8682b6484a0eb',
      senderId: '690bcb90264fa29974e8e184',
      senderName: 'Test Sender'
    }
  },
  {
    title: '💼 Job Update',
    body: 'A job you applied for has been updated',
    data: {
      type: 'job_update',
      jobId: 'job123',
      title: 'Senior Developer Position'
    }
  },
  {
    title: '👥 Team Notification',
    body: 'New activity in your team',
    data: {
      type: 'team_update',
      teamId: 'team456'
    }
  }
];

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function to prompt user
function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

// Main testing function
async function startTesting() {
  try {
    console.log('📋 Option 1: Test both known user IDs');
    console.log('📋 Option 2: Test by custom user ID');
    console.log('📋 Option 3: List all users with tokens\n');
    
    const choice = await prompt('Enter your choice (1-3): ');

    if (choice === '1') {
      await testKnownUsers();
    } else if (choice === '2') {
      await testCustomUserId();
    } else if (choice === '3') {
      await listAllUsers();
    } else {
      console.log('❌ Invalid choice');
    }

    rl.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    rl.close();
    process.exit(1);
  }
}

// Test known user IDs (from MongoDB)
async function testKnownUsers() {
  console.log('\n🔍 Fetching users with stored FCM tokens...\n');

  const users = await UserFcmToken.find({}).limit(2);

  if (users.length === 0) {
    console.log('❌ No users with FCM tokens found');
    return;
  }

  console.log(`✅ Found ${users.length} user(s) with tokens\n`);

  for (const userDoc of users) {
    await sendNotificationsToUser(userDoc.userId, userDoc.tokens);
  }
}

// Test custom user ID
async function testCustomUserId() {
  const userId = await prompt('\n📝 Enter User ID to test: ');

  const userDoc = await UserFcmToken.findOne({ userId });

  if (!userDoc) {
    console.log(`❌ No tokens found for user ID: ${userId}`);
    return;
  }

  console.log(`✅ Found ${userDoc.tokens.length} token(s) for this user\n`);
  await sendNotificationsToUser(userId, userDoc.tokens);
}

// List all users with tokens
async function listAllUsers() {
  console.log('\n👥 All Users with FCM Tokens:\n');

  const users = await UserFcmToken.find({});

  if (users.length === 0) {
    console.log('No users with tokens');
    return;
  }

  users.forEach((user, index) => {
    console.log(`${index + 1}. User ID: ${user.userId}`);
    console.log(`   Tokens: ${user.tokens.length}`);
    user.tokens.forEach((t, i) => {
      console.log(`   ${i + 1}) Device: ${t.deviceType}, Active: ${t.isActive}`);
      console.log(`      Token: ${t.token.substring(0, 40)}...`);
    });
    console.log();
  });

  // Ask which user to test
  const userIndex = await prompt('Enter user number to test (or 0 to skip): ');
  
  if (userIndex !== '0' && parseInt(userIndex) > 0 && parseInt(userIndex) <= users.length) {
    const selectedUser = users[parseInt(userIndex) - 1];
    await sendNotificationsToUser(selectedUser.userId, selectedUser.tokens);
  }
}

// Send notifications to specific user
async function sendNotificationsToUser(userId, tokens) {
  if (!tokens || tokens.length === 0) {
    console.log(`❌ No tokens for user ${userId}`);
    return;
  }

  console.log(`\n📨 Sending ${testNotifications.length} notifications to User: ${userId}`);
  console.log('===============================================\n');

  for (let i = 0; i < testNotifications.length; i++) {
    const notif = testNotifications[i];
    
    // Send to all tokens for this user
    for (let j = 0; j < tokens.length; j++) {
      const token = tokens[j];
      
      if (!token.isActive) {
        console.log(`⏭️  Notification ${i + 1}, Token ${j + 1}: Skipped (inactive)`);
        continue;
      }

      try {
        process.stdout.write(`📤 Notification ${i + 1}, Token ${j + 1}: ${notif.title}... `);

        const message = {
          notification: {
            title: notif.title,
            body: notif.body
          },
          data: {
            ...notif.data,
            timestamp: new Date().toISOString(),
            userId: userId
          },
          token: token.token
        };

        const response = await admin.messaging().send(message);
        
        console.log(`✅ Sent`);
        console.log(`     Response ID: ${response.substring(0, 50)}...`);
        console.log(`     Device Type: ${token.deviceType}`);

        // Wait between sends
        await new Promise(r => setTimeout(r, 1000));

      } catch (error) {
        console.log(`❌ Failed`);
        console.log(`     Error: ${error.message}`);
      }
    }
  }

  console.log('\n✅ Test complete!');
  console.log('👀 Check your browser tabs for notifications\n');
}

// Start the testing
startTesting();
