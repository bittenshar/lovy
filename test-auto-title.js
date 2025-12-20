const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

const users = {
  d: { email: 'd@gmail.com', password: 'password' },
  v: { email: 'v@gmail.com', password: 'password' }
};

async function test() {
  try {
    console.log('🧪 Testing Auto-Generated Conversation Title\n');

    // 1. Login as user d
    console.log('1️⃣ Logging in as d@gmail.com...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, users.d);
    const tokenD = loginRes.data.data.user.id;
    const nameD = loginRes.data.data.user.firstName;
    const authD = loginRes.data.token;
    console.log(`✅ Logged in as: ${nameD}\n`);

    // 2. Login as user v
    console.log('2️⃣ Logging in as v@gmail.com...');
    const loginResV = await axios.post(`${BASE_URL}/auth/login`, users.v);
    const tokenV = loginResV.data.data.user.id;
    const nameV = loginResV.data.data.user.firstName;
    const authV = loginResV.data.token;
    console.log(`✅ Logged in as: ${nameV}\n`);

    // 3. Create conversation WITHOUT custom title (should use participant name)
    console.log('3️⃣ Creating conversation WITHOUT custom title...');
    const createRes = await axios.post(
      `${BASE_URL}/conversations`,
      {
        participants: [tokenV]
      },
      { headers: { Authorization: `Bearer ${authD}` } }
    );
    
    const conversation = createRes.data.data;
    console.log(`✅ Conversation created with ID: ${conversation._id}`);
    console.log(`   Title: "${conversation.title}"`);
    console.log(`   Expected: "${nameV}" (the other participant's name)`);
    
    if (conversation.title === nameV) {
      console.log('\n✅✅ SUCCESS: Auto-generated title from participant name!\n');
    } else {
      console.log(`\n⚠️  Title is: "${conversation.title}" (not auto-generated as expected)\n`);
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

test();
