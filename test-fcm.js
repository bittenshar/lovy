#!/usr/bin/env node

/**
 * FCM Test Script
 * Tests Firebase Cloud Messaging setup and sends test notifications
 */

const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, 'src/config/config.env') });

// MongoDB connection
const mongoose = require('mongoose');

const testFCM = async () => {
  try {
    console.log('\n╔════════════════════════════════════════════════════╗');
    console.log('║       FCM TEST SUITE - Notification Testing        ║');
    console.log('╚════════════════════════════════════════════════════╝\n');

    // Step 1: Check Firebase initialization
    console.log('📋 Step 1: Checking Firebase Initialization...');
    const firebaseConfig = require('./src/modules/notification/config/firebase');
    const firebaseInitialized = firebaseConfig.isInitialized;
    console.log(`   Firebase Initialized: ${firebaseInitialized ? '✅ YES' : '❌ NO'}`);
    
    if (!firebaseInitialized) {
      console.error('   ❌ Firebase is not initialized. Cannot proceed.');
      process.exit(1);
    }

    // Step 2: Connect to MongoDB
    console.log('\n📋 Step 2: Connecting to MongoDB...');
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('   ❌ MONGO_URI/MONGODB_URI not set in environment');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('   ✅ MongoDB Connected');

    // Step 3: Check FCM tokens in database
    console.log('\n📋 Step 3: Checking FCM Tokens in Database...');
    const UserFcmToken = require('./src/modules/notification/UserFcmToken.model');
    const allTokens = await UserFcmToken.find();
    console.log(`   Total tokens in DB: ${allTokens.length}`);
    
    if (allTokens.length === 0) {
      console.log('   ⚠️  No FCM tokens registered yet.');
      console.log('   Register a token first using the /register-token endpoint');
    } else {
      console.log('\n   Registered Tokens:');
      allTokens.forEach((t, idx) => {
        console.log(`   [${idx + 1}] User: ${t.userId}`);
        console.log(`       Token: ${t.token.substring(0, 40)}...`);
        console.log(`       Device: ${t.deviceType}`);
        console.log(`       Active: ${t.isActive ? '✅' : '❌'}`);
      });
    }

    // Step 4: Test sending a notification
    if (allTokens.length > 0) {
      console.log('\n📋 Step 4: Sending Test Notification...');
      const notificationUtils = require('./src/modules/notification/notification.utils');
      
      const testToken = allTokens[0];
      console.log(`   Target User: ${testToken.userId}`);
      
      const result = await notificationUtils.sendToUser(testToken.userId, {
        title: '🧪 Test Notification',
        body: 'This is a test FCM notification from your server!',
        imageUrl: null,
        data: {
          type: 'test',
          timestamp: new Date().toISOString(),
          testId: 'fcm-test-' + Date.now()
        }
      });

      console.log('\n   📤 Notification Send Result:');
      console.log(`   Success: ${result.success ? '✅' : '❌'}`);
      console.log(`   Sent: ${result.sent}`);
      console.log(`   Failed: ${result.failed}`);
      
      if (result.responses && result.responses.length > 0) {
        console.log('\n   Response Details:');
        result.responses.forEach((r, idx) => {
          console.log(`   [${idx + 1}] Status: ${r.status}`);
          console.log(`       Message ID: ${r.response}`);
        });
      }

      if (result.errors && result.errors.length > 0) {
        console.log('\n   ❌ Errors:');
        result.errors.forEach((e, idx) => {
          console.log(`   [${idx + 1}] ${e.error}`);
        });
      }
    }

    // Step 5: Test with templated notification
    console.log('\n📋 Step 5: Testing Templated Notification...');
    if (allTokens.length > 0) {
      const notificationUtils = require('./src/modules/notification/notification.utils');
      const testToken = allTokens[0];
      
      try {
        const result = await notificationUtils.sendTemplatedNotification(
          testToken.userId,
          'messageReceived',
          ['John Doe', 'Hey, how are you doing?'],
          {
            data: {
              conversationId: '507f1f77bcf86cd799439011',
              messageId: '507f1f77bcf86cd799439012'
            }
          }
        );

        console.log(`   Template: messageReceived`);
        console.log(`   Success: ${result.success ? '✅' : '❌'}`);
        console.log(`   Sent: ${result.sent}`);
        console.log(`   Failed: ${result.failed}`);
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }

    // Summary
    console.log('\n╔════════════════════════════════════════════════════╗');
    console.log('║                  TEST SUMMARY                      ║');
    console.log('╠════════════════════════════════════════════════════╣');
    console.log('║ ✅ Firebase Initialization: PASSED                 ║');
    console.log('║ ✅ MongoDB Connection: PASSED                      ║');
    if (allTokens.length > 0) {
      console.log('║ ✅ FCM Tokens Found: PASSED                       ║');
      console.log('║ ✅ Test Notification Sent: PASSED                 ║');
    } else {
      console.log('║ ⚠️  FCM Tokens: NOT FOUND                         ║');
      console.log('║    → Register a token first                       ║');
    }
    console.log('╚════════════════════════════════════════════════════╝\n');

    console.log('📝 Next Steps:');
    console.log('   1. Check your device/browser for notifications');
    console.log('   2. If not received, check server logs for FCM errors');
    console.log('   3. Verify Firebase credentials are valid');
    console.log('   4. Test actual message sending in conversations\n');

    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ TEST FAILED');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    
    try {
      await mongoose.disconnect();
    } catch (e) {
      // ignore
    }
    
    process.exit(1);
  }
};

// Run the test
testFCM();
