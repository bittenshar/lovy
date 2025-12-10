#!/usr/bin/env node

/**
 * FCM Token Migration Script
 * Migrates existing tokens from User collection to FCMToken collection
 * Run this once to populate FCMToken collection with existing tokens
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: __dirname + '/src/config/config.env' });

async function migrateTokens() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const User = require('./src/modules/users/user.model');
    const FCMToken = require('./models/fcmToken');

    // Find all users with FCM tokens
    const usersWithTokens = await User.find({
      fcmToken: { $exists: true, $ne: null },
    });

    console.log(`\n📱 Found ${usersWithTokens.length} users with FCM tokens`);

    let createdCount = 0;
    let errorCount = 0;

    for (const user of usersWithTokens) {
      try {
        const existingToken = await FCMToken.findOne({
          userId: user._id,
          fcmToken: user.fcmToken,
        });

        if (!existingToken) {
          // Create new FCMToken document
          const newToken = await FCMToken.create({
            userId: user._id,
            fcmToken: user.fcmToken,
            platform: user.platform || 'android',
            deviceId: 'migrated-from-user-collection',
            deviceName: 'Migrated Device',
            isActive: true,
            lastUsed: user.fcmTokenUpdatedAt || new Date(),
          });

          console.log(`✅ Created FCM token for ${user.email}`);
          createdCount++;
        } else {
          console.log(`⏭️  Token already exists for ${user.email}`);
        }
      } catch (error) {
        console.error(`❌ Error creating token for ${user.email}:`, error.message);
        errorCount++;
      }
    }

    console.log(`\n📊 Migration Summary:`);
    console.log(`   Created: ${createdCount}`);
    console.log(`   Errors: ${errorCount}`);
    console.log(`   Total: ${usersWithTokens.length}`);

    // Verify
    const tokenCount = await FCMToken.countDocuments({ isActive: true });
    console.log(`\n✅ Total active FCM tokens now: ${tokenCount}`);

    await mongoose.connection.close();
    console.log('\n✅ Migration complete!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

migrateTokens();
