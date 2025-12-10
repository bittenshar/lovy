const axios = require('axios');

(async () => {
  try {
    // Step 1: Login
    console.log('1. Logging in...');
    const loginRes = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'w@gmail.com',
      password: 'password',
    });
    const token = loginRes.data.token;
    const userId = loginRes.data.data?.user?._id;
    console.log('✓ Logged in:', userId);

    // Step 2: Start conversation
    console.log('\n2. Starting conversation...');
    const convRes = await axios.post(
      'http://localhost:3000/api/messages/start-conversation',
      { recipientId: userId },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('✗ Error: Cannot message self');
    console.log('Response:', JSON.stringify(convRes.data, null, 2));
  } catch (err) {
    if (err.response?.status === 400 && err.response?.data?.message?.includes('Cannot')) {
      console.log('✓ Expected error: Cannot start conversation with yourself');
      console.log('\nTo test properly, you need a SECOND user account.');
      console.log('\nAlternative: Create a second test user');
      console.log('\nTesting SEND endpoint assumption instead...\n');
      
      // Show what the send endpoint expects
      console.log('Send Message Endpoint Requirements:');
      console.log('─────────────────────────────────────');
      console.log('URL: POST /api/messages/send');
      console.log('\nHeaders:');
      console.log('  Authorization: Bearer {token}');
      console.log('  Content-Type: application/json');
      console.log('\nBody:');
      console.log(JSON.stringify({
        conversationId: 'valid_mongo_id',
        receiverId: 'valid_user_id',
        text: 'Your message here',
        image: null,
        file: null
      }, null, 2));
      
      console.log('\nExpected Response (201):');
      console.log(JSON.stringify({
        success: true,
        message: 'Message sent successfully',
        data: {
          _id: 'message_id',
          text: 'message_text',
          createdAt: '2025-12-09T17:29:23.132Z',
          sender: {
            _id: 'user_id',
            name: 'firstName',
            image: null
          }
        }
      }, null, 2));
    } else {
      console.error('Error:', err.message);
      console.error('Response:', err.response?.data);
    }
  }
})();
