#!/usr/bin/env node

/**
 * FCM Test Script - Send notification to specific user
 */

const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, 'src/config/config.env') });

const mongoose = require('mongoose');

const testFCMSpecific = async () => {
  try {
    console.log('\n╔════════════════════════════════════════════════════╗');
    console.log('║     FCM TEST - Send to Specific User               ║');
    console.log('╚════════════════════════════════════════════════════╝\n');

    // Firebase check
    console.log('📋 Step 1: Checking Firebase...');
    const firebaseConfig = require('./src/modules/notification/config/firebase');
    console.log(`   Firebase Initialized: ${firebaseConfig.isInitialized ? '✅ YES' : '❌ NO'}\n`);
    
    if (!firebaseConfig.isInitialized) {
      console.error('   ❌ Firebase not initialized');
      process.exit(1);
    }

    // Connect MongoDB
    console.log('📋 Step 2: Connecting to MongoDB...');
    const mongoUri = process.env.MONGO_URI;
    await mongoose.connect(mongoUri);
    console.log('   ✅ Connected\n');

    // Get the user's token
    const UserFcmToken = require('./src/modules/notification/UserFcmToken.model');
    const targetUserId = '690bcb90264fa29974e8e184';
    
    console.log('📋 Step 3: Checking tokens for user 690bcb90264fa29974e8e184...');
    const userTokens = await UserFcmToken.find({ userId: targetUserId });
    console.log(`   Found: ${userTokens.length} token(s)\n`);
    
    if (userTokens.length === 0) {
      console.error('   ❌ No tokens found for this user');
      console.log('   Register a token first using: POST /notifications/register-token\n');
      await mongoose.disconnect();
      process.exit(1);
    }

    userTokens.forEach((t, idx) => {
      console.log(`   [${idx + 1}] Token: ${t.token.substring(0, 50)}...`);
      console.log(`       Device: ${t.deviceType}`);
      console.log(`       Active: ${t.isActive ? '✅' : '❌'}`);
    });

    // Send test notification
    console.log('\n📋 Step 4: Sending Test Notification...\n');
    const notificationUtils = require('./src/modules/notification/notification.utils');
    
    const result = await notificationUtils.sendToUser(targetUserId, {
      title: '🧪 Test Message',
      body: 'This is a test notification!',
      data: {
        type: 'test',
        testId: 'manual-test-' + Date.now()
      }
    });

    console.log('\n📤 Result:');
    console.log(`   ✅ Success: ${result.success}`);
    console.log(`   📤 Sent: ${result.sent}`);
    console.log(`   ❌ Failed: ${result.failed || 0}`);
    
    if (result.responses && result.responses.length > 0) {
      console.log('\n   Message IDs:');
      result.responses.forEach((r, idx) => {
        console.log(`   [${idx + 1}] ${r.response}`);
      });
    }

    if (result.errors && result.errors.length > 0) {
      console.log('\n   ❌ Errors:');
      result.errors.forEach((e, idx) => {
        console.log(`   [${idx + 1}] ${e.error}`);
      });
    }

    console.log('\n════════════════════════════════════════════════════');
    if (result.success && result.sent > 0) {
      console.log('✅ TEST PASSED - Notification sent successfully!');
      console.log('Check your device for the notification');
    } else {
      console.log('❌ TEST FAILED - Notification not sent');
      console.log('Check Firebase credentials and token validity');
    }
    console.log('════════════════════════════════════════════════════\n');

    await mongoose.disconnect();
    process.exit(result.success && result.sent > 0 ? 0 : 1);

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    try {
      await mongoose.disconnect();
    } catch (e) {
      // ignore
    }
    process.exit(1);
  }
};

testFCMSpecific();
