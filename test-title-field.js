const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

const users = {
  d: { email: 'd@gmail.com', password: 'password' },
  v: { email: 'v@gmail.com', password: 'password' }
};

async function test() {
  try {
    console.log('🧪 Testing Conversation Title Field\n');

    // 1. Login as user d
    console.log('1️⃣ Logging in as d@gmail.com...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, users.d);
    const tokenD = loginRes.data.data.user.id;
    const authD = loginRes.data.token;
    console.log(`✅ Logged in. User ID: ${tokenD}\n`);

    // 2. Login as user v
    console.log('2️⃣ Logging in as v@gmail.com...');
    const loginResV = await axios.post(`${BASE_URL}/auth/login`, users.v);
    const tokenV = loginResV.data.data.user.id;
    const authV = loginResV.data.token;
    console.log(`✅ Logged in. User ID: ${tokenV}\n`);

    // 3. Create conversation with title
    console.log('3️⃣ Creating conversation with custom title...');
    const createRes = await axios.post(
      `${BASE_URL}/conversations`,
      {
        participants: [tokenV],
        title: 'Custom Business Chat'
      },
      { headers: { Authorization: `Bearer ${authD}` } }
    );
    
    const conversation = createRes.data.data;
    console.log(`✅ Conversation created with ID: ${conversation._id}`);
    console.log(`   Title: "${conversation.title}"`);
    console.log(`   Participants: ${conversation.participants.join(', ')}\n`);

    // 4. Check that title is set correctly
    if (conversation.title === 'Custom Business Chat') {
      console.log('✅ TITLE FIELD IS CORRECTLY SET!\n');
    } else {
      console.log(`❌ Title is: "${conversation.title}" (expected: "Custom Business Chat")\n`);
    }

    // 5. Retrieve conversation and verify title persists
    console.log('4️⃣ Retrieving conversation list...');
    const listRes = await axios.get(
      `${BASE_URL}/conversations`,
      { headers: { Authorization: `Bearer ${authD}` } }
    );
    
    const conv = listRes.data.data.find(c => c._id === conversation._id);
    console.log(`✅ Retrieved conversation from database`);
    console.log(`   Title in DB: "${conv.title}"`);

    if (conv.title === 'Custom Business Chat') {
      console.log('\n✅✅ SUCCESS: Title field is working correctly!\n');
    } else {
      console.log(`\n❌ Title mismatch in database: "${conv.title}"\n`);
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    process.exit(1);
  }
}

test();
