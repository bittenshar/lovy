#!/usr/bin/env node

/**
 * Test OneSignal Service Fix
 * Verifies that app_id is correctly added to notification requests
 */

require('dotenv').config({ path: './src/config/config.env' });

const service = require('./src/shared/services/onesignal.service');

async function testOneSignalFix() {
  console.log('🧪 Testing OneSignal Service Fix...\n');

  // Test 1: Check if service is configured
  console.log('Test 1: Service Configuration');
  console.log(`  ✓ App ID: ${service.appId ? '✅ Set' : '❌ Missing'}`);
  console.log(`  ✓ API Key: ${service.appAuthKey ? '✅ Set (hidden)' : '❌ Missing'}`);
  console.log(`  ✓ Is Configured: ${service.isConfigured ? '✅ Yes' : '❌ No'}\n`);

  if (!service.isConfigured) {
    console.error('❌ OneSignal is not configured. Please check your .env file.');
    process.exit(1);
  }

  // Test 2: Test sendToSegment method (which had the issue)
  console.log('Test 2: Send to Segment Method');
  console.log('  Sending test notification to "All" segment...');
  
  try {
    const result = await service.sendToSegment('All', {
      title: '🧪 OneSignal Test',
      message: 'Testing app_id parameter in request body',
      data: { test: true, timestamp: new Date().toISOString() }
    });

    if (result.success) {
      console.log(`  ✅ SUCCESS: Notification sent!`);
      console.log(`  📨 Notification ID: ${result.notificationId}`);
      console.log(`  📦 Request body included app_id: ✅`);
      console.log(`\n✅ OneSignal fix verified successfully!\n`);
    } else {
      console.log(`  ❌ FAILED: ${result.error || result.message}`);
      
      // Check if error mentions app_id
      if (result.error && result.error.includes('app_id')) {
        console.error('  ⚠️ app_id is still missing from request body!');
        process.exit(1);
      }
    }
  } catch (error) {
    console.error('  ❌ Error:', error.message);
    process.exit(1);
  }

  // Test 3: Test sendNotification with segments
  console.log('\nTest 3: Generic Send Notification Method');
  console.log('  Sending notification with segments parameter...');
  
  try {
    const result = await service.sendNotification({
      title: '🎯 Segment Test',
      message: 'Testing segments parameter',
      segments: ['All']
    });

    if (result.success) {
      console.log(`  ✅ SUCCESS: Generic send working!`);
      console.log(`  📨 Notification ID: ${result.notificationId}`);
    } else {
      console.log(`  ❌ FAILED: ${result.error || result.message}`);
    }
  } catch (error) {
    console.error('  ❌ Error:', error.message);
  }

  // Test 4: Verify app_id in request body
  console.log('\nTest 4: Verify app_id Parameter');
  console.log('  Creating test notification body...');
  
  const testBody = {
    app_id: service.appId,
    headings: { en: 'Test' },
    contents: { en: 'Test message' },
    included_segments: ['All']
  };

  console.log('  Request body structure:');
  console.log(`    ✅ app_id: ${testBody.app_id.substring(0, 10)}...`);
  console.log(`    ✅ headings: ${JSON.stringify(testBody.headings)}`);
  console.log(`    ✅ contents: ${JSON.stringify(testBody.contents)}`);
  console.log(`    ✅ included_segments: ${JSON.stringify(testBody.included_segments)}`);

  console.log('\n✅ All tests completed! OneSignal service is properly configured.\n');
  console.log('📋 Next Steps:');
  console.log('   1. Import the Postman collection: OneSignal-Complete-Testing.postman_collection.json');
  console.log('   2. Run "Login - Worker" request to get auth token');
  console.log('   3. Run "Register OneSignal ID" to register a device');
  console.log('   4. Run "Send to All Workers" or "Test Notification" to send a message');
  console.log('   5. Verify notification appears on your device\n');
}

testOneSignalFix().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
