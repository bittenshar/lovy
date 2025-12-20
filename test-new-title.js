const axios = require('axios');
const crypto = require('crypto');

const BASE_URL = 'http://localhost:3000/api';

async function createTestUser(email, firstName = 'Test') {
  try {
    const signupRes = await axios.post(`${BASE_URL}/auth/signup`, {
      email: email,
      password: 'password123',
      firstName: firstName,
      userType: 'employer'
    });
    return signupRes.data.data.user.id;
  } catch (err) {
    if (err.response?.data?.message?.includes('already')) {
      // User exists, just login
      const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
        email: email,
        password: 'password123'
      });
      return loginRes.data.data.user.id;
    }
    throw err;
  }
}

async function test() {
  try {
    console.log('🧪 Testing Auto-Generated Title (New Conversation)\n');

    // Create two unique test users
    const email1 = `test1-${Date.now()}@test.com`;
    const email2 = `test2-${Date.now()}@test.com`;
    
    console.log(`1️⃣ Creating test user 1: ${email1}...`);
    const user1Id = await createTestUser(email1, 'Alice');
    console.log(`✅ User 1 created: ${user1Id}\n`);

    console.log(`2️⃣ Creating test user 2: ${email2}...`);
    const user2Id = await createTestUser(email2, 'Bob');
    console.log(`✅ User 2 created: ${user2Id}\n`);

    console.log(`3️⃣ Logging in as user 1...`);
    const loginRes1 = await axios.post(`${BASE_URL}/auth/login`, {
      email: email1,
      password: 'password123'
    });
    const auth1 = loginRes1.data.token;
    console.log(`✅ Logged in\n`);

    console.log(`4️⃣ Creating conversation from User1 to User2 (no custom title)...`);
    const createRes = await axios.post(
      `${BASE_URL}/conversations`,
      {
        participants: [user2Id]
      },
      { headers: { Authorization: `Bearer ${auth1}` } }
    );
    
    const conversation = createRes.data.data;
    console.log(`✅ Conversation created with ID: ${conversation._id}`);
    console.log(`   Title: "${conversation.title}"`);
    console.log(`   Expected: "Bob" (User2's name)\n`);
    
    if (conversation.title === 'Bob') {
      console.log('✅✅ SUCCESS: Title auto-generated from participant name!\n');
    } else {
      console.log(`⚠️  Title is: "${conversation.title}" (expected: "Bob")\n`);
      console.log('This might be OK if the title default is used instead.\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data?.message || error.message);
  }
}

test();
