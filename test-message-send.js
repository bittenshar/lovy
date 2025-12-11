/**
 * Test script to send a message via API and see FCM logs
 * Usage: node test-message-send.js <conversationId> <messageText> <token>
 * 
 * Example: node test-message-send.js 693aca0a0f824721b5143af7 "Hello from test" "your-jwt-token"
 */

const axios = require('axios');

const args = process.argv.slice(2);
const conversationId = args[0];
const messageText = args[1] || 'Test message from script';
const token = args[2];

if (!conversationId || !token) {
  console.error('❌ Usage: node test-message-send.js <conversationId> <messageText> <token>');
  process.exit(1);
}

const API_BASE = 'https://lovy-dusky.vercel.app/api';

console.log('\n═══════════════════════════════════════════════════════');
console.log('📨 TEST MESSAGE SEND SCRIPT');
console.log('═══════════════════════════════════════════════════════');
console.log(`🔗 API Base: ${API_BASE}`);
console.log(`📝 Conversation ID: ${conversationId}`);
console.log(`💬 Message: ${messageText}`);
console.log(`🔐 Token: ${token.substring(0, 20)}...`);
console.log('═══════════════════════════════════════════════════════\n');

async function sendMessage() {
  try {
    console.log('📤 Sending message request...\n');
    
    const response = await axios.post(
      `${API_BASE}/conversations/${conversationId}/messages`,
      {
        body: messageText
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    console.log('\n✅ MESSAGE SENT SUCCESSFULLY!');
    console.log('📊 Response Status:', response.status);
    console.log('📊 Message ID:', response.data?.data?._id);
    console.log('📊 Response:', JSON.stringify(response.data, null, 2));
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('🎯 Next Steps:');
    console.log('1. Check the Vercel logs: vercel logs --follow');
    console.log('2. Look for 📨 [MSG] and 🔔 [FCM] logs');
    console.log('3. Verify notification was sent to recipient');
    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ ERROR SENDING MESSAGE:');
    if (error.response) {
      console.error('📊 Status:', error.response.status);
      console.error('📊 Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('📊 Message:', error.message);
    }
    process.exit(1);
  }
}

sendMessage();
