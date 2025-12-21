#!/usr/bin/env node

/**
 * 🎯 Advanced FCM Messaging Test Script
 * 
 * Quickly send test notifications without interactive prompts
 * 
 * Usage examples:
 *   # Send to all users with tokens
 *   node quick-test-notifications.js
 *   
 *   # Send to specific user ID
 *   node quick-test-notifications.js 690bcb90264fa29974e8e184
 */

const admin = require('firebase-admin');
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// Load env
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, 'src', 'config', 'config.env') });

// Init Firebase
const serviceAccount = require('./firebase-service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Init MongoDB
const mongoUrl = process.env.MONGO_URI || process.env.DATABASE_URL;
mongoose.connect(mongoUrl);

const userFcmTokenSchema = new mongoose.Schema({
  userId: String,
  tokens: [{
    token: String,
    deviceType: String,
    isActive: Boolean
  }]
});

const UserFcmToken = mongoose.model('userfcmtoken', userFcmTokenSchema, 'userfcmtokens');

// Get user ID from command line args
const targetUserId = process.argv[2];

async function sendTestNotifications() {
  try {
    console.log('\n🎯 FCM Messaging Quick Test\n');
    
    let users;
    
    if (targetUserId) {
      console.log(`🔍 Fetching tokens for user: ${targetUserId}\n`);
      const user = await UserFcmToken.findOne({ userId: targetUserId });
      users = user ? [user] : [];
    } else {
      console.log('🔍 Fetching all users with tokens\n');
      users = await UserFcmToken.find({});
    }

    if (users.length === 0) {
      console.log('❌ No users with tokens found\n');
      process.exit(1);
    }

    console.log(`✅ Found ${users.length} user(s)\n`);

    // Notification templates for different scenarios
    const notificationTemplates = {
      message: {
        title: '💬 New Message',
        body: 'You received a message from your colleague',
        data: {
          type: 'message',
          priority: 'high'
        }
      },
      job_alert: {
        title: '💼 New Job Match',
        body: 'A job matching your profile has been posted',
        data: {
          type: 'job_alert',
          priority: 'high'
        }
      },
      application_update: {
        title: '📋 Application Update',
        body: 'Status update on your job application',
        data: {
          type: 'application_update',
          priority: 'medium'
        }
      },
      verification: {
        title: '✅ Test Notification',
        body: 'This is a test push notification from FCM system',
        data: {
          type: 'test',
          priority: 'low'
        }
      }
    };

    const notificationType = process.argv[3] || 'verification';
    const template = notificationTemplates[notificationType] || notificationTemplates.verification;

    let totalSent = 0;
    let totalFailed = 0;

    for (const userDoc of users) {
      console.log(`\n👤 User: ${userDoc.userId}`);
      console.log(`   Tokens: ${userDoc.tokens.length}`);
      console.log(`   ---`);

      for (let i = 0; i < userDoc.tokens.length; i++) {
        const token = userDoc.tokens[i];

        if (!token.isActive) {
          console.log(`   Token ${i + 1}: ⏭️  Skipped (inactive)`);
          continue;
        }

        try {
          process.stdout.write(`   Token ${i + 1}: ${template.title}... `);

          const response = await admin.messaging().send({
            notification: {
              title: template.title,
              body: template.body
            },
            data: {
              ...template.data,
              timestamp: new Date().toISOString(),
              userId: userDoc.userId,
              tokenIndex: String(i)
            },
            token: token.token
          });

          console.log('✅');
          totalSent++;

          // Delay between sends
          await new Promise(r => setTimeout(r, 500));

        } catch (error) {
          console.log(`❌ (${error.code})`);
          totalFailed++;
        }
      }
    }

    console.log(`\n${'='.repeat(50)}`);
    console.log(`📊 Results:`);
    console.log(`   ✅ Sent: ${totalSent}`);
    console.log(`   ❌ Failed: ${totalFailed}`);
    console.log(`   📱 Check your browser tabs for notifications!`);
    console.log(`${'='.repeat(50)}\n`);

    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

sendTestNotifications();
