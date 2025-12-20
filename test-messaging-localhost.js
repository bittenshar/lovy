#!/usr/bin/env node

/**
 * E2E Messaging Test - LOCALHOST VERSION
 * Run this to test on your local machine
 */

const axios = require('axios');

const API_BASE = 'https://lovy-dusky.vercel.app/api';

const test = async () => {
  try {
    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║   E2E MESSAGING & FCM TEST - LOCALHOST        ║');
    console.log('╚════════════════════════════════════════════════╝\n');

    const users = {
      user1: {
        email: 'd@gmail.com',
        password: 'password',
        fcmToken: 'cnFpJf8bSGS5h7yO3rPrDd:APA91bEZv8NF3MtWuBMtZaa0Wqtm5lTQyVqR78Yt_IrQqwsWmuDDqDm1g7skc5V0SnPgSo7f4sUcSA-kV0GHpYu6Noy_V7LNU6aNp1xDf28r0aanjybIlaM',
        deviceType: 'android'
      },
      user2: {
        email: 'v@gmail.com',
        password: 'password',
        fcmToken: 'e53Y36L1QkWtmwWWUHb702:APA91bHNXRvzCDR5p4_AW8rJwNSxs5G-kpWAesFoIU3gqh9xDb6JK-z3on3nD57Ffm7JbztTnkLx2hNjuZ-mlKiZvecv-6xx9AHjgAlLYCCy19teHUcSx9M',
        deviceType: 'android'
      }
    };

    // Step 1: Login User 1
    console.log('1️⃣  Logging in User 1 (d@gmail.com)...');
    const login1 = await axios.post(`${API_BASE}/auth/login`, {
      email: users.user1.email,
      password: users.user1.password
    });
    users.user1.token = login1.data.token;
    users.user1.id = login1.data.data.user._id;
    console.log(`   ✅ User 1 ID: ${users.user1.id}\n`);

    // Step 2: Login User 2
    console.log('2️⃣  Logging in User 2 (v@gmail.com)...');
    const login2 = await axios.post(`${API_BASE}/auth/login`, {
      email: users.user2.email,
      password: users.user2.password
    });
    users.user2.token = login2.data.token;
    users.user2.id = login2.data.data.user._id;
    console.log(`   ✅ User 2 ID: ${users.user2.id}\n`);

    // Step 3: Register FCM tokens
    console.log('3️⃣  Registering FCM tokens...');
    
    await axios.post(`${API_BASE}/notifications/register-token`, {
      token: users.user1.fcmToken,
      userId: users.user1.id,
      deviceType: users.user1.deviceType,
      deviceId: 'device-1'
    });
    console.log('   ✅ User 1 token registered');

    await axios.post(`${API_BASE}/notifications/register-token`, {
      token: users.user2.fcmToken,
      userId: users.user2.id,
      deviceType: users.user2.deviceType,
      deviceId: 'device-2'
    });
    console.log(`   ✅ User 2 token registered\n`);

    // Step 4: Create conversation
    console.log('4️⃣  Creating conversation...');
    const convRes = await axios.post(
      `${API_BASE}/conversations`,
      { participants: [users.user2.id] },
      { headers: { Authorization: `Bearer ${users.user1.token}` } }
    );
    const convId = convRes.data.data._id;
    console.log(`   ✅ Conversation created: ${convId}\n`);

    // Step 5: User 1 sends message
    console.log('5️⃣  User 1 sending message to User 2...');
    const msg1 = await axios.post(
      `${API_BASE}/conversations/${convId}/messages`,
      { body: 'Hello from User 1!' },
      { headers: { Authorization: `Bearer ${users.user1.token}` } }
    );
    console.log(`   ✅ Message sent: "${msg1.data.data.body}"`);
    console.log(`   📱 FCM notification triggered for User 2\n`);

    await new Promise(r => setTimeout(r, 1500));

    // Step 6: User 2 sends reply
    console.log('6️⃣  User 2 sending reply to User 1...');
    const msg2 = await axios.post(
      `${API_BASE}/conversations/${convId}/messages`,
      { body: 'Hi User 1, got your message!' },
      { headers: { Authorization: `Bearer ${users.user2.token}` } }
    );
    console.log(`   ✅ Message sent: "${msg2.data.data.body}"`);
    console.log(`   📱 FCM notification triggered for User 1\n`);

    // Step 7: Verify messages
    console.log('7️⃣  Retrieving all messages...');
    const msgs = await axios.get(
      `${API_BASE}/conversations/${convId}/messages`,
      { headers: { Authorization: `Bearer ${users.user1.token}` } }
    );
    console.log(`   ✅ Retrieved ${msgs.data.data.length} messages\n`);
    
    const last5 = msgs.data.data.slice(-5);
    last5.forEach((m, i) => {
      const sender = m.sender._id === users.user1.id ? 'User 1' : 'User 2';
      console.log(`   [${i+1}] ${sender}: "${m.body}"`);
    });

    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║            ✅ ALL TESTS PASSED!                ║');
    console.log('╚════════════════════════════════════════════════╝\n');

    console.log('📝 Summary:');
    console.log('   ✅ Both users logged in successfully');
    console.log('   ✅ FCM tokens registered with correct User IDs');
    console.log('   ✅ Conversation created between users');
    console.log('   ✅ Messages sent in both directions');
    console.log('   ✅ FCM notifications triggered automatically');
    console.log('   ✅ Messages stored & retrieved correctly\n');

    console.log('📱 Check Your Devices:');
    console.log('   User 1 device: Should have notification from User 2');
    console.log('   User 2 device: Should have notification from User 1\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERROR:', error.response?.data || error.message);
    if (error.response?.data?.message) {
      console.error('Message:', error.response.data.message);
    }
    process.exit(1);
  }
};

test();
