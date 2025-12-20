const mongoose = require('mongoose');
require('dotenv').config();

async function diagnose() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected');

    const firebaseConfig = require('./src/modules/notification/config/firebase');
    console.log('\n📱 FIREBASE STATUS:');
    console.log('   Initialized:', firebaseConfig.isInitialized);

    const UserFcmToken = require('./models/fcmToken');
    const allTokens = await UserFcmToken.find();
    console.log('\n🔑 FCM TOKENS:');
    console.log('   Total:', allTokens.length);
    
    if (allTokens.length > 0) {
      allTokens.forEach((t, i) => {
        console.log(`   [${i}] User: ${t.userId}, Device: ${t.deviceType}, Active: ${t.isActive}`);
      });
    } else {
      console.log('   ⚠️  NO TOKENS!');
    }

    const Conversation = require('./models/conversation');
    const convs = await Conversation.find();
    console.log('\n💬 CONVERSATIONS:', convs.length);

    console.log('\n' + '='.repeat(60));
    if (!firebaseConfig.isInitialized) {
      console.log('❌ FIREBASE NOT INITIALIZED - notifications will fail');
    } else if (allTokens.length === 0) {
      console.log('❌ NO FCM TOKENS - register tokens first!');
    } else {
      console.log('✅ Everything looks good');
    }
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

diagnose();
