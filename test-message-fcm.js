#!/usr/bin/env node

/**
 * Test Message and FCM Notification Flow
 * Tests sending a message and verifies FCM notification is triggered
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

// Test credentials
const testUser1 = {
  email: 'n@gmail.com',
  password: 'password',
  token: null,
  id: null,
};

const testUser2 = {
  email: 'w@gmail.com',
  password: 'password',
  token: null,
  id: null,
};

async function log(title, message, data = null) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`📌 ${title}`);
  console.log(`${'='.repeat(70)}`);
  console.log(message);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

async function test() {
  try {
    // 1. Health check
    await log('Step 1: Health Check', 'Checking if API is running...');
    try {
      const healthRes = await axios.get(`${API_BASE}/notifications/health`);
      console.log('✅ API Health:', healthRes.data.message);
    } catch (err) {
      console.log('❌ API not responding. Make sure server is running on port 3000');
      process.exit(1);
    }

    // 2. Login User 1
    await log('Step 2: Login User 1', `Logging in ${testUser1.email}...`);
    try {
      const loginRes = await axios.post(`${API_BASE}/auth/login`, {
        email: testUser1.email,
        password: testUser1.password,
      });
      testUser1.token = loginRes.data.data.token;
      testUser1.id = loginRes.data.data.user._id;
      console.log('✅ Logged in successfully');
      console.log(`   User ID: ${testUser1.id}`);
      console.log(`   Token: ${testUser1.token.substring(0, 50)}...`);
    } catch (err) {
      console.log('❌ Login failed:', err.response?.data?.message || err.message);
      process.exit(1);
    }

    // 3. Check User 1's FCM tokens
    await log('Step 3: Check FCM Tokens for User 1', 'Fetching registered tokens...');
    try {
      const tokensRes = await axios.get(`${API_BASE}/notifications/tokens`, {
        headers: { Authorization: `Bearer ${testUser1.token}` },
      });
      console.log('✅ User 1 tokens:');
      if (tokensRes.data.data && tokensRes.data.data.length > 0) {
        tokensRes.data.data.forEach(t => {
          console.log(`   Token: ${t.fcmToken.substring(0, 30)}...`);
          console.log(`   Platform: ${t.platform}`);
        });
      } else {
        console.log('   ⚠️ No tokens found for user 1');
      }
    } catch (err) {
      console.log('⚠️ Could not fetch tokens:', err.response?.data?.message || err.message);
    }

    // 4. Login User 2
    await log('Step 4: Login User 2', `Logging in ${testUser2.email}...`);
    try {
      const loginRes = await axios.post(`${API_BASE}/auth/login`, {
        email: testUser2.email,
        password: testUser2.password,
      });
      testUser2.token = loginRes.data.data.token;
      testUser2.id = loginRes.data.data.user._id;
      console.log('✅ Logged in successfully');
      console.log(`   User ID: ${testUser2.id}`);
    } catch (err) {
      console.log('❌ Login failed:', err.response?.data?.message || err.message);
      process.exit(1);
    }

    // 5. Create or get conversation
    await log('Step 5: Start Conversation', 'Creating conversation between users...');
    let conversationId = null;
    try {
      const convRes = await axios.post(
        `${API_BASE}/messages/start-conversation`,
        {
          participantId: testUser2.id,
        },
        {
          headers: { Authorization: `Bearer ${testUser1.token}` },
        }
      );
      conversationId = convRes.data.data._id;
      console.log('✅ Conversation created/found');
      console.log(`   Conversation ID: ${conversationId}`);
    } catch (err) {
      console.log('⚠️ Could not create conversation:', err.response?.data?.message || err.message);
      // Use a dummy ID for testing
      conversationId = 'test-conv-' + Date.now();
      console.log(`   Using test conversation ID: ${conversationId}`);
    }

    // 6. Send Message (THIS SHOULD TRIGGER FCM)
    await log(
      'Step 6: Send Message',
      `Sending message from ${testUser1.email} to ${testUser2.email}...`
    );
    await log('💡 IMPORTANT', 'Watch the server logs for FCM notification output. You should see:');
    console.log('   📱 [MSG] Sending FCM notification to receiver');
    console.log('   ✅ [FCM] Batch notifications sent: X success');
    console.log('   \n   If you see "No active FCM tokens found", it means tokens aren\'t in FCMToken collection yet.');

    try {
      const msgRes = await axios.post(
        `${API_BASE}/messages/send`,
        {
          conversationId: conversationId,
          receiverId: testUser2.id,
          text: 'Hello! This is a test message to trigger FCM notification. Sent at ' + new Date().toISOString(),
        },
        {
          headers: { Authorization: `Bearer ${testUser1.token}` },
        }
      );
      console.log('\n✅ Message sent successfully!');
      console.log(`   Message ID: ${msgRes.data.data._id}`);
      console.log(`   Status: ${msgRes.status}`);
    } catch (err) {
      console.log('❌ Failed to send message:', err.response?.data?.message || err.message);
      if (err.response?.data) {
        console.log('Response:', err.response.data);
      }
    }

    // 7. Summary
    await log('✅ Test Complete', 'Check the server logs above for FCM notification status');
    console.log('📝 Expected behavior:');
    console.log('   1. Message sent successfully (201 status)');
    console.log('   2. Server logs show "Sending FCM notification to receiver"');
    console.log('   3. FCM notification sent to active tokens');
    console.log('   4. Or graceful error if receiver has no active tokens');
  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    process.exit(1);
  }
}

test().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
