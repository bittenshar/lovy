#!/usr/bin/env node

/**
 * Test FCM Token Flow
 * This script tests the complete FCM token registration and notification sending flow
 */

const axios = require('axios');

const API_BASE = 'https://lovy-dusky.vercel.app/api';

// Test users
const user1 = {
  email: 'testuser1@example.com',
  password: 'Test123!',
  token: null,
};

const user2 = {
  email: 'testuser2@example.com',
  password: 'Test123!',
  token: null,
};

const testTokens = {
  user1: 'dPbVQj3U1WA:APA91bHaB-example1-token1',
  user2: 'dPbVQj3U1WA:APA91bHaB-example2-token2',
};

async function log(title, message, data = null) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📌 ${title}`);
  console.log(`${'='.repeat(60)}`);
  console.log(message);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

async function test() {
  try {
    // 1. Check health
    await log('Step 1: Health Check', 'Checking if FCM service is healthy...');
    const healthRes = await axios.get(`${API_BASE}/notifications/health`);
    console.log('✅ FCM Service:', healthRes.data.message);

    // 2. Login user 1
    await log('Step 2: Login User 1', `Logging in ${user1.email}...`);
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: user1.email,
      password: user1.password,
    });
    user1.token = loginRes.data.data.token;
    user1.id = loginRes.data.data.user._id;
    console.log('✅ Logged in as:', user1.email);
    console.log('   User ID:', user1.id);
    console.log('   Token:', user1.token.substring(0, 50) + '...');

    // 3. Register FCM token for user 1
    await log(
      'Step 3: Register FCM Token for User 1',
      'Registering test FCM token for user 1...'
    );
    const registerRes = await axios.post(
      `${API_BASE}/notifications/register-token`,
      {
        fcmToken: testTokens.user1,
        platform: 'android',
        deviceId: 'test-device-1',
        deviceName: 'Test Device 1',
      },
      {
        headers: {
          Authorization: `Bearer ${user1.token}`,
        },
      }
    );
    console.log('✅ FCM Token registered:', registerRes.data.data);

    // 4. Get user 1's tokens
    await log('Step 4: Get User 1 Tokens', 'Fetching registered tokens for user 1...');
    const getTokensRes = await axios.get(`${API_BASE}/notifications/tokens`, {
      headers: {
        Authorization: `Bearer ${user1.token}`,
      },
    });
    console.log('✅ User 1 Tokens:', getTokensRes.data.data);

    // 5. Login user 2
    await log('Step 5: Login User 2', `Logging in ${user2.email}...`);
    const login2Res = await axios.post(`${API_BASE}/auth/login`, {
      email: user2.email,
      password: user2.password,
    });
    user2.token = login2Res.data.data.token;
    user2.id = login2Res.data.data.user._id;
    console.log('✅ Logged in as:', user2.email);
    console.log('   User ID:', user2.id);
    console.log('   Token:', user2.token.substring(0, 50) + '...');

    // 6. Register FCM token for user 2
    await log(
      'Step 6: Register FCM Token for User 2',
      'Registering test FCM token for user 2...'
    );
    const register2Res = await axios.post(
      `${API_BASE}/notifications/register-token`,
      {
        fcmToken: testTokens.user2,
        platform: 'android',
        deviceId: 'test-device-2',
        deviceName: 'Test Device 2',
      },
      {
        headers: {
          Authorization: `Bearer ${user2.token}`,
        },
      }
    );
    console.log('✅ FCM Token registered:', register2Res.data.data);

    // 7. Send test notification directly
    await log(
      'Step 7: Send Direct FCM Notification',
      'Sending test notification to user 2...'
    );
    try {
      const notifyRes = await axios.post(
        `${API_BASE}/notifications/send`,
        {
          fcmToken: testTokens.user2,
          title: 'Test Notification',
          body: 'This is a test notification',
          data: {
            screen: 'test',
            action: 'test_action',
          },
        },
        {
          headers: {
            Authorization: `Bearer ${user1.token}`,
          },
        }
      );
      console.log('✅ Notification sent:', notifyRes.data);
    } catch (notifyErr) {
      console.log(
        '⚠️ Notification send warning (expected with test tokens):',
        notifyErr.response?.data?.message || notifyErr.message
      );
    }

    // 8. Test message creation (which should trigger FCM)
    await log(
      'Step 8: Create Message (Should Trigger FCM)',
      'Creating a message from user 1 to user 2...'
    );
    try {
      const msgRes = await axios.post(
        `${API_BASE}/messages/send`,
        {
          conversationId: 'test-conversation-123',
          receiverId: user2.id,
          text: 'Hello from test user 1',
        },
        {
          headers: {
            Authorization: `Bearer ${user1.token}`,
          },
        }
      );
      console.log('✅ Message sent:', msgRes.data);
      console.log(
        '   (Check server logs for FCM notification attempt to user 2)'
      );
    } catch (msgErr) {
      console.log(
        '⚠️ Message error:',
        msgErr.response?.data?.message || msgErr.message
      );
    }

    await log('✅ Test Complete', 'All tests completed! Check server logs for FCM attempts.');
  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

test().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
