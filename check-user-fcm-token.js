const mongoose = require('mongoose');
const User = require('./src/modules/users/user.model');
require('dotenv').config();

async function checkSpecificUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Check specific user
    const userId = '69307854e324845ecb080759';
    const user = await User.findById(userId).select('email fcmToken platform fcmTokenUpdatedAt');

    if (!user) {
      console.log(`❌ User ${userId} not found`);
      return;
    }

    console.log(`👤 User: ${user.email} (ID: ${userId})\n`);
    
    if (!user.fcmToken) {
      console.log('❌ No FCM token registered for this user');
      console.log('\nTo register a token:');
      console.log('1. Run the app: flutter run --debug');
      console.log('2. Check logs for: "FCM Token: ..."');
      console.log('3. Token will auto-register to backend');
      return;
    }

    const token = user.fcmToken;
    const isValid = token.length > 100 && (token.includes(':') || token.includes('_'));

    console.log(`📱 FCM Token Details:`);
    console.log(`   Valid Format: ${isValid ? '✅ YES' : '❌ NO'}`);
    console.log(`   Length: ${token.length} characters ${token.length > 100 ? '✅' : '❌ (< 100)'}`);
    console.log(`   Has Separators: ${(token.includes(':') || token.includes('_')) ? '✅ YES' : '❌ NO'}`);
    console.log(`   Full Token: ${token}`);
    console.log(`\n   Start: ${token.substring(0, 50)}...`);
    console.log(`   End:   ...${token.substring(Math.max(0, token.length - 30))}`);
    console.log(`\n   Platform: ${user.platform || 'unknown'}`);
    console.log(`   Last Updated: ${user.fcmTokenUpdatedAt || 'never'}`);

    if (!isValid) {
      console.log('\n⚠️  This token appears to be INVALID');
      console.log('    Reason: ' + (token.length < 100 ? 'Too short' : 'Missing separators'));
      console.log('\n💡 To fix:');
      console.log('   1. App needs to generate a new token');
      console.log('   2. Run: flutter clean && flutter run --debug');
      console.log('   3. Monitor logs for token registration');
    } else {
      console.log('\n✅ Token format appears valid');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

checkSpecificUser();
