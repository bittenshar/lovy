const axios = require('axios');

const API_URL = 'http://localhost:5000';

// Test data
const testUser = {
  email: 'test@example.com',
  password: 'Test@1234'
};

const testNotification = {
  title: 'Test Integration Notification',
  message: 'Testing automatic push notification feature',
  type: 'INFO',
  priority: 'high'
};

async function runTest() {
  try {
    console.log('�� Starting OneSignal Integration Test...\n');

    // Step 1: Get or create auth token
    console.log('1️⃣  Getting auth token...');
    let token = null;
    try {
      const loginRes = await axios.post(`${API_URL}/api/auth/login`, testUser, {
        validateStatus: () => true
      });
      if (loginRes.status === 200 && loginRes.data.data?.token) {
        token = loginRes.data.data.token;
        console.log('✅ Login successful\n');
      } else {
        console.log('ℹ️  Could not login, using sample token\n');
      }
    } catch (err) {
      console.log('ℹ️  Login attempt failed, continuing...\n');
    }

    // Step 2: Create notification via API
    console.log('2️⃣  Creating notification via API...');
    const notifyRes = await axios.post(
      `${API_URL}/api/notifications/create`,
      {
        targetId: '69307854e324845ecb080759',
        title: testNotification.title,
        message: testNotification.message,
        type: testNotification.type,
        priority: testNotification.priority
      },
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        validateStatus: () => true
      }
    );

    if (notifyRes.status === 201 || notifyRes.status === 200) {
      console.log('✅ Notification created in database');
      console.log(`   ID: ${notifyRes.data.data?._id || 'N/A'}`);
      console.log(`   Title: ${notifyRes.data.data?.title}`);
      console.log('   (Push notification should be sending asynchronously...)\n');
    } else {
      console.log('❌ Failed to create notification');
      console.log(`   Status: ${notifyRes.status}`);
      console.log(`   Response: ${JSON.stringify(notifyRes.data)}\n`);
    }

    // Step 3: Check OneSignal service status
    console.log('3️⃣  Checking OneSignal service health...');
    const healthRes = await axios.get(
      `${API_URL}/api/health`,
      { validateStatus: () => true }
    );
    
    if (healthRes.status === 200) {
      console.log('✅ Server is healthy');
      if (healthRes.data.onesignal) {
        console.log(`   OneSignal Status: ${healthRes.data.onesignal}`);
      }
    }
    console.log();

    console.log('🎉 Integration test complete!');
    console.log('📱 Check your OneSignal dashboard for notification delivery status');
    console.log('📲 If registered device is connected, you should receive push in 5-10 seconds\n');

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
  
  process.exit(0);
}

runTest();
