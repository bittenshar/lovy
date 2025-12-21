/**
 * Test FCM Notification
 * Sends a test push notification to a stored FCM token
 */

const admin = require('firebase-admin');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, 'src', 'config', 'config.env') });

// Initialize Firebase with service account
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || 
                          path.join(__dirname, 'firebase-service-account.json');

console.log('📋 [TEST] FCM Test Notification Script');
console.log('📁 Service Account Path:', serviceAccountPath);

try {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('✅ [TEST] Firebase initialized');
} catch (error) {
  console.error('❌ [TEST] Failed to initialize Firebase:', error.message);
  process.exit(1);
}

// Test token from the stored database record
const TEST_FCM_TOKEN = 'cfkdhsqbqm-ZzsKyKWUZLS:APA91bG8C--o2NvFDtwiIvT2QOTsP4x-cA6FGwR_ix654kvhPiW8qXW7Q1D0K975qIe_Mv2Vyr8Ico3Eh6lxBrLf1tSko_MRz009gSh1majxWEBgcdI2Tv0';

async function sendTestNotification() {
  try {
    console.log('\n🔔 [TEST] Sending test notification...');
    console.log('📍 Token:', TEST_FCM_TOKEN.substring(0, 30) + '...');
    
    const message = {
      notification: {
        title: '🎉 FCM Test Successful!',
        body: 'Your FCM token is working perfectly!'
      },
      data: {
        type: 'test_notification',
        timestamp: new Date().toISOString(),
        message: 'FCM token verification successful'
      },
      token: TEST_FCM_TOKEN
    };

    console.log('📤 Sending message:', JSON.stringify(message, null, 2));

    const response = await admin.messaging().send(message);
    
    console.log('\n✅ [TEST] SUCCESS! Notification sent');
    console.log('📨 Response ID:', response);
    console.log('\n👀 Check your Flutter app for the notification!');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ [TEST] FAILED! Error sending notification:');
    console.error('   Error:', error.message);
    console.error('   Code:', error.code);
    
    if (error.code === 'messaging/invalid-registration-token') {
      console.error('\n⚠️  The FCM token is invalid or has expired');
      console.error('   This could mean:');
      console.error('   1. Token was deleted from Firebase');
      console.error('   2. App was uninstalled');
      console.error('   3. User revoked permissions');
    }
    
    process.exit(1);
  }
}

sendTestNotification();
