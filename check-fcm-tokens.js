#!/usr/bin/env node

/**
 * Quick FCM Token Debug Script
 * Check if tokens are being registered in the database
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/.env' });

async function checkTokens() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const User = require('./src/modules/users/user.model');
    const FCMToken = require('./models/fcmToken');

    // Get all users with FCM tokens
    console.log('\n📱 Users with FCM tokens in User collection:');
    const usersWithTokens = await User.find(
      { fcmToken: { $exists: true, $ne: null } },
      'email fcmToken platform fcmTokenUpdatedAt'
    ).limit(5);

    if (usersWithTokens.length === 0) {
      console.log('   ❌ No users with FCM tokens found');
    } else {
      usersWithTokens.forEach(user => {
        console.log(`   📧 ${user.email}`);
        console.log(`      Token: ${user.fcmToken.substring(0, 30)}...`);
        console.log(`      Platform: ${user.platform}`);
        console.log(`      Updated: ${user.fcmTokenUpdatedAt}`);
      });
    }

    // Get all FCM tokens
    console.log('\n📱 All FCM tokens in FCMToken collection:');
    const allTokens = await FCMToken.find({})
      .populate('userId', 'email')
      .limit(5);

    if (allTokens.length === 0) {
      console.log('   ❌ No FCM tokens found');
    } else {
      allTokens.forEach(doc => {
        console.log(`   📧 ${doc.userId?.email || 'Unknown'}`);
        console.log(`      Token: ${doc.fcmToken.substring(0, 30)}...`);
        console.log(`      Device: ${doc.deviceName} (${doc.deviceId})`);
        console.log(`      Active: ${doc.isActive}`);
        console.log(`      Last Used: ${doc.lastUsed}`);
      });
    }

    // Count stats
    console.log('\n📊 Statistics:');
    const userCount = await User.countDocuments({ fcmToken: { $exists: true, $ne: null } });
    const tokenCount = await FCMToken.countDocuments({ isActive: true });
    const inactiveCount = await FCMToken.countDocuments({ isActive: false });

    console.log(`   Users with tokens: ${userCount}`);
    console.log(`   Active FCM tokens: ${tokenCount}`);
    console.log(`   Inactive FCM tokens: ${inactiveCount}`);

    // Find users WITHOUT tokens
    console.log('\n❌ Users WITHOUT FCM tokens (can\'t receive notifications):');
    const usersWithoutTokens = await User.find(
      { fcmToken: { $exists: false } },
      'email createdAt'
    ).limit(5);

    if (usersWithoutTokens.length === 0) {
      console.log('   ✅ All users have tokens!');
    } else {
      usersWithoutTokens.forEach(user => {
        console.log(`   📧 ${user.email} (created: ${user.createdAt})`);
      });
    }

    console.log('\n💡 Solution: Users need to log in with the Flutter app to register their token');
    console.log('   After login, they will receive notifications.');

    await mongoose.connection.close();
    console.log('\n✅ Done');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkTokens();
