/**
 * Test Notifications Flow - Register token and send notification
 * This tests the FULL flow with fallback token format
 */

require('dotenv').config();
const axios = require('axios');

const API_URL = 'https://lovy-dusky.vercel.app';
const USER_ID = '6937f46b0d806e9b33df0d9e';

// Create a fallback token in the same format that Flutter generates
const FALLBACK_TOKEN = `flutter_${Date.now()}_${Math.random().toString(36).substring(7)}`;

// Auth token from previous login
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MzdmNDZiMGQ4MDZlOWIzM2RmMGQ5ZSIsImlhdCI6MTc2NTI3NDgyMiwiZXhwIjoxNzY1ODc5NjIyfQ.r1WPQmIdRdCONm6hMpC_k8ec4gTqLmAed_9HSB9SS1k';

async function testNotificationsFlow() {
  try {
    console.log('\n🔧 ===== NOTIFICATION FLOW TEST =====\n');
    
    // Step 1: Register token
    console.log('📝 Step 1: Register FCM Token');
    console.log('   Token:', FALLBACK_TOKEN.substring(0, 50) + '...');
    console.log('   User ID:', USER_ID);
    
    const registerResponse = await axios.post(
      `${API_URL}/api/notifications/register-token`,
      {
        fcmToken: FALLBACK_TOKEN,
        userId: USER_ID,
        platform: 'android'
      },
      {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Token registered successfully');
    console.log('   Response:', registerResponse.data);
    
    // Step 2: Send test notification
    console.log('\n📤 Step 2: Send Test Notification');
    console.log('   Sending to User ID:', USER_ID);
    
    const notifyResponse = await axios.post(
      `${API_URL}/api/notifications/test`,
      {
        userId: USER_ID
      },
      {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Notification sent');
    console.log('   Response:', notifyResponse.data);
    
    console.log('\n✅ ===== FLOW TEST COMPLETE =====\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('   Status:', error.response.status);
      console.error('   Error Details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testNotificationsFlow();
