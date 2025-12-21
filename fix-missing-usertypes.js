#!/usr/bin/env node

/**
 * UTILITY: Fix users with missing userType
 * Run this to identify and fix users without userType set
 */

const mongoose = require('mongoose');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '.env') });

const User = require('./src/modules/users/user.model');
const WorkerProfile = require('./src/modules/workers/workerProfile.model');
const EmployerProfile = require('./src/modules/employers/employerProfile.model');

async function fixMissingUserTypes() {
  try {
    // Connect to MongoDB
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/talent');
    console.log('✅ Connected to MongoDB');

    // Find all users without userType
    const usersWithoutType = await User.find({ 
      $or: [
        { userType: null },
        { userType: undefined },
        { userType: '' }
      ]
    });

    console.log(`\n📋 Found ${usersWithoutType.length} users without userType`);

    if (usersWithoutType.length === 0) {
      console.log('✅ All users have userType set!');
      await mongoose.connection.close();
      return;
    }

    // For each user without type, try to infer from their profiles
    for (const user of usersWithoutType) {
      console.log(`\n🔍 Processing user: ${user.email} (${user._id})`);

      // Check if they have a WorkerProfile
      const workerProfile = await WorkerProfile.findOne({ user: user._id });
      if (workerProfile) {
        user.userType = 'worker';
        console.log('   ✅ Inferred as WORKER (has WorkerProfile)');
      } else {
        // Check if they have an EmployerProfile
        const employerProfile = await EmployerProfile.findOne({ user: user._id });
        if (employerProfile) {
          user.userType = 'employer';
          console.log('   ✅ Inferred as EMPLOYER (has EmployerProfile)');
        } else {
          // Default to worker if we can't determine
          user.userType = 'worker';
          console.log('   ⚠️ Defaulted to WORKER (no profile found)');
        }
      }

      // Save the user
      await user.save();
      console.log(`   💾 Saved user with userType: ${user.userType}`);
    }

    console.log(`\n✅ Fixed ${usersWithoutType.length} users!`);
    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixMissingUserTypes();
