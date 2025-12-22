#!/usr/bin/env node

/**
 * Fix missing userType values in User collection
 * Run: node fix-user-types.js
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://localhost:27017/talent';

async function fixUserTypes() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URL);
    console.log('✅ Connected to MongoDB');

    const User = require('./src/modules/users/user.model');

    // Find all users without userType
    console.log('\n🔍 Finding users without userType...');
    const usersWithoutType = await User.find({ userType: { $exists: false } }).lean();
    
    console.log(`📊 Found ${usersWithoutType.length} users without userType`);
    
    if (usersWithoutType.length === 0) {
      console.log('✅ All users have userType set');
      await mongoose.connection.close();
      return;
    }

    // Show the users
    console.log('\n👤 Users without userType:');
    usersWithoutType.forEach(user => {
      console.log(`   - ${user.email} (${user._id})`);
    });

    // Update them to 'worker' by default
    console.log('\n⚠️  Setting userType to "worker" for these users...');
    const result = await User.updateMany(
      { userType: { $exists: false } },
      { $set: { userType: 'worker' } }
    );
    
    console.log(`✅ Updated ${result.modifiedCount} users`);

    // Verify the fix
    console.log('\n✔️  Verifying fix...');
    const usersStillMissing = await User.find({ userType: { $exists: false } }).lean();
    console.log(`📊 Users still without userType: ${usersStillMissing.length}`);

    if (usersStillMissing.length === 0) {
      console.log('\n🎉 All users now have userType!');
    }

    await mongoose.connection.close();
    console.log('\n✅ Done');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixUserTypes();
