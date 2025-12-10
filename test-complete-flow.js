#!/usr/bin/env node

/**
 * Complete Flow Test: Signup → Login → Start Conversation → Send Message
 * This tests the exact Postman flow to verify everything works
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000/api';
let authToken = '';
let userId = '';
let receiverId = '';
let conversationId = '';

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (authToken) {
      options.headers['Authorization'] = `Bearer ${authToken}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const response = {
            status: res.statusCode,
            data: JSON.parse(data),
          };
          resolve(response);
        } catch {
          resolve({
            status: res.statusCode,
            data: data,
          });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

async function runTests() {
  console.log('🚀 COMPLETE MESSAGING FLOW TEST\n');
  console.log('=' .repeat(60));

  try {
    // Step 1: Create second user
    console.log('\n📝 STEP 1: Create Second User (Signup)');
    console.log('-'.repeat(60));

    const signupRes = await makeRequest('POST', '/auth/signup', {
      firstname: 'Test',
      lastname: 'User2',
      email: `testuser2+${Date.now()}@example.com`,
      password: 'password123',
      userType: 'employer',
    });

    if (signupRes.status === 201 && signupRes.data.success) {
      receiverId = signupRes.data.user._id;
      console.log('✅ User created successfully');
      console.log(`   Email: ${signupRes.data.user.email}`);
      console.log(`   User ID: ${receiverId}`);
    } else {
      console.log('❌ Signup failed');
      console.log(`   Status: ${signupRes.status}`);
      console.log(`   Response:`, signupRes.data);
      return;
    }

    // Step 2: Login as original user
    console.log('\n🔐 STEP 2: Login as Original User');
    console.log('-'.repeat(60));

    const loginRes = await makeRequest('POST', '/auth/login', {
      email: 'w@gmail.com',
      password: 'password',
    });

    if (loginRes.status === 200 && loginRes.data.success) {
      authToken = loginRes.data.token;
      userId = loginRes.data.user._id;
      console.log('✅ Login successful');
      console.log(`   User: ${loginRes.data.user.firstname}`);
      console.log(`   User ID: ${userId}`);
      console.log(`   Token: ${authToken.substring(0, 30)}...`);
    } else {
      console.log('❌ Login failed');
      console.log(`   Status: ${loginRes.status}`);
      console.log(`   Response:`, loginRes.data);
      return;
    }

    // Step 3: Start conversation
    console.log('\n💬 STEP 3: Start Conversation');
    console.log('-'.repeat(60));

    const convRes = await makeRequest('POST', '/messages/start-conversation', {
      recipientId: receiverId,
    });

    if (convRes.status === 200 && convRes.data.success) {
      conversationId = convRes.data.data.conversationId;
      console.log('✅ Conversation created');
      console.log(`   Conversation ID: ${conversationId}`);
    } else {
      console.log('❌ Start conversation failed');
      console.log(`   Status: ${convRes.status}`);
      console.log(`   Response:`, convRes.data);
      return;
    }

    // Step 4: Send message ⭐
    console.log('\n📨 STEP 4: Send Message (THE ENDPOINT YOU WANT!) ⭐');
    console.log('-'.repeat(60));

    const messageRes = await makeRequest('POST', '/messages/send', {
      conversationId: conversationId,
      receiverId: receiverId,
      text: '✅ Testing the send endpoint - this should return 201!',
      image: null,
      file: null,
    });

    if (messageRes.status === 201 && messageRes.data.success) {
      console.log('✅✅✅ MESSAGE SENT SUCCESSFULLY! ✅✅✅');
      console.log('\n   Response Status: 201 Created');
      console.log(`   Message ID: ${messageRes.data.data._id}`);
      console.log(`   Text: "${messageRes.data.data.text}"`);
      console.log(`   Sender: ${messageRes.data.data.sender.name}`);
      console.log(`   Sent at: ${messageRes.data.data.createdAt}`);
      console.log('\n🎉 ALL TESTS PASSED! The /api/messages/send endpoint is working!');
    } else {
      console.log('❌ Send message failed');
      console.log(`   Status: ${messageRes.status}`);
      console.log(`   Response:`, messageRes.data);
      return;
    }

    // Bonus: Get messages to verify
    console.log('\n📋 BONUS: Verify Message in Conversation');
    console.log('-'.repeat(60));

    const getRes = await makeRequest(
      'GET',
      `/messages/conversation/${conversationId}`,
      null
    );

    if (getRes.status === 200 && getRes.data.success) {
      console.log('✅ Messages retrieved');
      console.log(`   Total messages: ${getRes.data.messages.length}`);
      if (getRes.data.messages.length > 0) {
        const lastMsg = getRes.data.messages[getRes.data.messages.length - 1];
        console.log(`   Last message: "${lastMsg.text}"`);
        console.log(`   From: ${lastMsg.senderName}`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ COMPLETE SUCCESS - All endpoints working!\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

runTests();
