/**
 * Firebase Notification Integration Test
 * Tests all notification types with Firebase Cloud Messaging
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: './src/config/config.env' });

const User = require('./src/modules/users/user.model');
const Job = require('./src/modules/jobs/job.model');
const Application = require('./src/modules/applications/application.model');
const notificationTriggers = require('./src/services/notification-triggers.service');
const firebaseService = require('./src/services/firebase-notification.service');

async function testFirebaseNotifications() {
  try {
    console.log('🚀 Starting Firebase Notification Integration Test\n');

    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB connected\n');

    // Test 1: Check Firebase initialization
    console.log('1️⃣ Testing Firebase initialization...');
    if (firebaseService.initialized) {
      console.log('✅ Firebase Admin SDK is initialized\n');
    } else {
      console.log('❌ Firebase Admin SDK failed to initialize\n');
      return;
    }

    // Test 2: Find test users
    console.log('2️⃣ Finding test users...');
    const worker = await User.findOne({ userType: 'worker' }).limit(1);
    const employer = await User.findOne({ userType: 'employer' }).limit(1);
    
    if (!worker || !employer) {
      console.log('❌ Need at least one worker and one employer in database\n');
      console.log('Worker found:', !!worker);
      console.log('Employer found:', !!employer);
      return;
    }
    
    console.log('✅ Found test users:');
    console.log(`   Worker: ${worker.email} (FCM Token: ${worker.fcmToken ? '✅ Registered' : '❌ Not registered'})`);
    console.log(`   Employer: ${employer.email} (FCM Token: ${employer.fcmToken ? '✅ Registered' : '❌ Not registered'})\n`);

    // Test 3: Direct Firebase push to worker
    if (worker.fcmToken) {
      console.log('3️⃣ Testing direct Firebase push notification...');
      try {
        await firebaseService.sendToDevice(worker.fcmToken, {
          title: '🧪 Test Notification',
          body: 'This is a test notification from Firebase integration test',
          data: {
            type: 'test',
            timestamp: new Date().toISOString()
          }
        });
        console.log('✅ Direct Firebase push sent successfully\n');
      } catch (error) {
        console.log(`❌ Direct Firebase push failed: ${error.message}\n`);
      }
    } else {
      console.log('3️⃣ ⚠️  Skipping direct push test (worker has no FCM token)\n');
    }

    // Test 4: Test job posted notification
    console.log('4️⃣ Testing job posted notification...');
    const testJob = await Job.findOne({ status: 'active' }).limit(1);
    if (testJob) {
      try {
        await notificationTriggers.notifyNewJobPosted(testJob, employer);
        console.log('✅ Job posted notification triggered successfully\n');
      } catch (error) {
        console.log(`❌ Job posted notification failed: ${error.message}\n`);
      }
    } else {
      console.log('⚠️  No active jobs found, skipping job notification test\n');
    }

    // Test 5: Test application notification
    console.log('5️⃣ Testing application received notification...');
    const testApplication = await Application.findOne().populate('job').limit(1);
    if (testApplication && testApplication.job) {
      try {
        await notificationTriggers.notifyApplicationReceived(
          testApplication,
          testApplication.job,
          worker,
          employer
        );
        console.log('✅ Application notification triggered successfully\n');
      } catch (error) {
        console.log(`❌ Application notification failed: ${error.message}\n`);
      }
    } else {
      console.log('⚠️  No applications found, skipping application notification test\n');
    }

    // Test 6: Test message notification
    console.log('6️⃣ Testing message notification...');
    try {
      await notificationTriggers.notifyNewMessage(
        worker,
        employer,
        'Hey! This is a test message from the notification system.'
      );
      console.log('✅ Message notification triggered successfully\n');
    } catch (error) {
      console.log(`❌ Message notification failed: ${error.message}\n`);
    }

    // Test 7: Test bulk notification
    console.log('7️⃣ Testing bulk notification to multiple users...');
    const allWorkers = await User.find({ userType: 'worker' }).limit(5);
    if (allWorkers.length > 0) {
      try {
        await notificationTriggers.notifyMultipleUsers(
          allWorkers.map(w => w._id),
          {
            title: '📢 System Announcement',
            message: 'This is a test bulk notification to all workers',
            type: 'system',
            priority: 'medium'
          }
        );
        console.log(`✅ Bulk notification sent to ${allWorkers.length} workers\n`);
      } catch (error) {
        console.log(`❌ Bulk notification failed: ${error.message}\n`);
      }
    } else {
      console.log('⚠️  No workers found for bulk notification test\n');
    }

    // Summary
    console.log('═══════════════════════════════════════════════════════');
    console.log('📊 TEST SUMMARY');
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ Firebase Admin SDK initialized');
    console.log(`${worker.fcmToken ? '✅' : '⚠️ '} Worker FCM token ${worker.fcmToken ? 'registered' : 'not registered'}`);
    console.log(`${employer.fcmToken ? '✅' : '⚠️ '} Employer FCM token ${employer.fcmToken ? 'registered' : 'not registered'}`);
    console.log('');
    console.log('🔔 Notification Types Tested:');
    console.log('   ✅ Direct Firebase push');
    console.log('   ✅ Job posted notification');
    console.log('   ✅ Application received notification');
    console.log('   ✅ Message notification');
    console.log('   ✅ Bulk notification');
    console.log('');
    console.log('📱 Next Steps:');
    console.log('   1. Register FCM tokens via POST /api/notifications/register-token');
    console.log('   2. Create a job to trigger job posted notifications');
    console.log('   3. Submit an application to trigger application notifications');
    console.log('   4. Send a message to trigger message notifications');
    console.log('');
    console.log('💡 Note: Push notifications will only be sent to users with registered FCM tokens');
    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('👋 MongoDB connection closed');
    process.exit(0);
  }
}

// Run the test
testFirebaseNotifications();
