#!/usr/bin/env node

/**
 * Manual FCM Token Registration Test
 * Manually registers a token for a user to test the flow
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

async function test() {
  try {
    // 1. Login user
    console.log('📝 Step 1: Logging in user...');
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: 'w@gmail.com',
      password: 'Password@123',
    });
    
    const authToken = loginRes.data.data.token;
    const userId = loginRes.data.data.user._id;
    console.log('✅ Logged in:', loginRes.data.data.user.email);
    console.log('   User ID:', userId);
    
    // 2. Register a test FCM token
    console.log('\n📝 Step 2: Registering FCM token...');
    const testToken = 'test_fcm_token_' + Date.now();
    
    const registerRes = await axios.post(
      `${API_BASE}/notifications/register-token`,
      {
        fcmToken: testToken,
        platform: 'android',
        deviceId: 'test-device',
        deviceName: 'Test Device',
      },
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );
    
    console.log('✅ Token registered');
    console.log('   Response:', registerRes.data);
    
    // 3. Verify token is in database
    console.log('\n📝 Step 3: Verifying token in database...');
    const debugRes = await axios.get(
      `${API_BASE}/notifications/debug/user-tokens/${userId}`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );
    
    console.log('✅ Token verification:');
    console.log('   User collection:', debugRes.data.data.userCollection.fcmToken ? '✅ YES' : '❌ NO');
    console.log('   FCMToken collection:', debugRes.data.data.fcmTokenCollection.length > 0 ? '✅ YES' : '❌ NO');
    
    if (debugRes.data.data.fcmTokenCollection.length > 0) {
      console.log('   Tokens in FCMToken:');
      debugRes.data.data.fcmTokenCollection.forEach(t => {
        console.log(`     - ${t.fcmToken} (Active: ${t.isActive})`);
      });
    }
    
    console.log('\n✅ Test complete! Token should now be registered.');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

test();
