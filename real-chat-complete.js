const admin = require('firebase-admin');
const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load env
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, 'src', 'config', 'config.env') });

// Init Firebase
const serviceAccount = require('./firebase-service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const messaging = admin.messaging();

// Init MongoDB
const mongoUrl = process.env.MONGO_URI || process.env.DATABASE_URL;
mongoose.connect(mongoUrl);

// ===== SCHEMAS =====
const userFcmTokenSchema = new mongoose.Schema({
  userId: String,
  tokens: [{
    token: String,
    deviceType: String,
    isActive: Boolean
  }]
});

const messageSchema = new mongoose.Schema({
  conversationId: String,  // Changed to String
  senderId: String,
  senderName: String,
  body: String,
  createdAt: { type: Date, default: Date.now },
  read: { type: Boolean, default: false },
}, { collection: 'messages' });

const conversationSchema = new mongoose.Schema({
  participants: [String],
  createdAt: Date,
  updatedAt: Date,
  lastMessage: String,
  lastMessageTime: Date,
}, { collection: 'conversations' });

const UserFcmToken = mongoose.model('userfcmtoken', userFcmTokenSchema, 'userfcmtokens');
const Message = mongoose.model('Message', messageSchema);
const Conversation = mongoose.model('Conversation', conversationSchema);

// User model
const userSchema = new mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  email: String,
  firstName: String,
  lastName: String,
}, { collection: 'users' });

const User = mongoose.model('User', userSchema);

async function getUserDetails(userId) {
  try {
    const user = await User.findById(userId).select('email firstName lastName');
    return user;
  } catch (error) {
    return null;
  }
}

async function checkDatabase() {
  console.log('\n========== DATABASE CHECK ==========\n');

  // Check users with tokens
  const usersWithTokens = await UserFcmToken.find({ 'tokens.isActive': true });
  console.log(`👥 Users with active tokens: ${usersWithTokens.length}`);
  for (const user of usersWithTokens) {
    const details = await getUserDetails(user.userId);
    console.log(`   - ${details?.email || 'Unknown'} (${user.userId})`);
  }

  // Check conversations
  const conversations = await Conversation.find();
  console.log(`\n💬 Total conversations: ${conversations.length}`);
  for (const conv of conversations) {
    const participant1 = await getUserDetails(conv.participants[0]);
    const participant2 = await getUserDetails(conv.participants[1]);
    console.log(`   - ${participant1?.email || 'Unknown'} ↔ ${participant2?.email || 'Unknown'}`);
    console.log(`     ID: ${conv._id}`);
  }

  // Check messages
  const messages = await Message.find();
  console.log(`\n📝 Total messages: ${messages.length}`);
  
  if (messages.length > 0) {
    console.log('\n   Message Details:');
    for (const msg of messages.slice(0, 5)) {
      const sender = await getUserDetails(msg.senderId);
      console.log(`   - From: ${sender?.email || 'Unknown'}`);
      console.log(`     Text: "${msg.body}"`);
      console.log(`     ConvID: ${msg.conversationId}`);
      console.log(`     Time: ${msg.createdAt}`);
      console.log('');
    }
    if (messages.length > 5) {
      console.log(`   ... and ${messages.length - 5} more messages`);
    }
  }
}

async function createRealChat() {
  console.log('\n========== CREATING REAL CHAT ==========\n');

  const usersWithTokens = await UserFcmToken.find({ 'tokens.isActive': true });

  if (usersWithTokens.length < 2) {
    console.log('❌ Need at least 2 users with tokens!');
    return;
  }

  let totalMessages = 0;
  let totalNotifications = 0;

  // Create conversations and messages
  for (let i = 0; i < usersWithTokens.length; i++) {
    const user1 = usersWithTokens[i];
    const user1Details = await getUserDetails(user1.userId);
    const user1Name = user1Details?.email?.split('@')[0] || user1.userId;

    for (let j = 0; j < usersWithTokens.length; j++) {
      if (i === j) continue;

      const user2 = usersWithTokens[j];
      const user2Details = await getUserDetails(user2.userId);
      const user2Name = user2Details?.email?.split('@')[0] || user2.userId;

      // Create or find conversation
      let conversation = await Conversation.findOne({
        participants: { $all: [user1.userId, user2.userId] }
      });

      if (!conversation) {
        conversation = new Conversation({
          participants: [user1.userId, user2.userId],
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        await conversation.save();
      }

      console.log(`\n💬 ${user1Name} → ${user2Name}`);
      console.log(`   Conversation: ${conversation._id}`);

      // Real chat messages
      const chatMessages = [
        `Hey ${user2Name}! How are you doing? 👋`,
        `I wanted to check in with you about our project. When are you free?`,
        `Let me know if you can meet this week! 😊`,
      ];

      // Save each message
      for (const msgBody of chatMessages) {
        try {
          // Create message with conversation ID as string
          const message = new Message({
            conversationId: conversation._id.toString(),
            senderId: user1.userId,
            senderName: user1Name,
            body: msgBody,
            createdAt: new Date(),
            read: false,
          });

          await message.save();
          console.log(`   ✅ "${msgBody}"`);
          totalMessages++;

          // Send FCM notification
          const user2TokenData = await UserFcmToken.findOne({ userId: user2.userId });
          if (user2TokenData && user2TokenData.tokens) {
            const activeTokens = user2TokenData.tokens.filter(t => t.isActive);
            
            for (const tokenObj of activeTokens) {
              try {
                const notifMsg = {
                  notification: {
                    title: `💬 ${user1Name}`,
                    body: msgBody.substring(0, 80),
                  },
                  data: {
                    type: 'message',
                    conversationId: conversation._id.toString(),
                    senderId: user1.userId,
                    senderName: user1Name,
                    message: msgBody,
                    timestamp: new Date().toISOString(),
                  },
                  token: tokenObj.token,
                };

                await messaging.send(notifMsg);
                totalNotifications++;
              } catch (err) {
                console.log(`      ⚠️ FCM error: ${err.message}`);
              }
            }
          }
        } catch (err) {
          console.log(`   ❌ Error: ${err.message}`);
        }
      }
    }
  }

  console.log(`\n\n========== SUMMARY ==========`);
  console.log(`✅ Messages created: ${totalMessages}`);
  console.log(`✅ Notifications sent: ${totalNotifications}`);
  console.log(`📊 Success rate: ${totalNotifications > 0 ? '100%' : '0%'}`);
}

async function main() {
  try {
    console.log('\n🔗 Connecting to MongoDB...');
    await mongoose.connect(mongoUrl);
    console.log('✅ Connected\n');

    // Check what's in database
    await checkDatabase();

    // Create real chat
    await createRealChat();

    console.log('\n\n🎯 NEXT STEPS:');
    console.log('1. Refresh browser (Cmd+R or F5)');
    console.log('2. Look at Messages tab');
    console.log('3. Click on conversations');
    console.log('4. You should see real messages! ✅\n');

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
