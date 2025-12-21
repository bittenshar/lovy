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

const conversationSchema = new mongoose.Schema({
  participants: [String],
  createdAt: Date,
  updatedAt: Date,
  lastMessage: String,
  lastMessageTime: Date,
}, { collection: 'conversations' });

const messageSchema = new mongoose.Schema({
  conversationId: mongoose.Schema.Types.ObjectId,
  senderId: String,
  senderName: String,
  body: String,
  createdAt: { type: Date, default: Date.now },
  read: { type: Boolean, default: false },
}, { collection: 'messages' });

const UserFcmToken = mongoose.model('userfcmtoken', userFcmTokenSchema, 'userfcmtokens');
const Conversation = mongoose.model('Conversation', conversationSchema);
const Message = mongoose.model('Message', messageSchema);

// ===== USER MODEL =====
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

async function getOrCreateConversation(userId1, userId2) {
  try {
    // Find existing conversation
    let conversation = await Conversation.findOne({
      participants: { $all: [userId1, userId2] }
    });

    if (!conversation) {
      // Create new conversation
      conversation = new Conversation({
        participants: [userId1, userId2],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await conversation.save();
      console.log(`   ✅ Created conversation: ${conversation._id}`);
    } else {
      console.log(`   ✅ Found existing conversation: ${conversation._id}`);
    }

    return conversation;
  } catch (error) {
    console.log(`   ❌ Error managing conversation: ${error.message}`);
    return null;
  }
}

async function sendRealMessage(conversationId, senderId, senderName, messageBody) {
  try {
    // Create message in database
    const message = new Message({
      conversationId: conversationId,
      senderId: senderId,
      senderName: senderName,
      body: messageBody,
      createdAt: new Date(),
      read: false,
    });

    await message.save();

    if (process.argv[2] === '--verbose') {
      console.log(`   ✅ Message saved: "${messageBody}"`);
    }

    return message;
  } catch (error) {
    console.log(`   ❌ Error saving message: ${error.message}`);
    return null;
  }
}

async function sendFCMNotification(recipientId, senderName, conversationId, messageBody) {
  try {
    const recipientTokenData = await UserFcmToken.findOne({ userId: recipientId });
    
    if (!recipientTokenData || !recipientTokenData.tokens || recipientTokenData.tokens.length === 0) {
      return { sent: 0, failed: 0 };
    }

    const activeTokens = recipientTokenData.tokens.filter(t => t.isActive);
    let successCount = 0;
    let failureCount = 0;

    for (const tokenObj of activeTokens) {
      try {
        const notificationMessage = {
          notification: {
            title: `💬 ${senderName}`,
            body: messageBody.substring(0, 150),
          },
          data: {
            type: 'message',
            conversationId: conversationId.toString(),
            senderName: senderName,
            message: messageBody,
            timestamp: new Date().toISOString(),
            url: '/messages',
          },
          token: tokenObj.token,
        };

        await messaging.send(notificationMessage);
        successCount++;

        if (process.argv[2] === '--verbose') {
          console.log(`      ✅ FCM sent to: ${tokenObj.token.substring(0, 30)}...`);
        }
      } catch (error) {
        console.log(`      ❌ FCM failed: ${error.message}`);
        failureCount++;
      }
    }

    return { sent: successCount, failed: failureCount };
  } catch (error) {
    console.log(`   ❌ Error sending FCM: ${error.message}`);
    return { sent: 0, failed: 0 };
  }
}

async function main() {
  try {
    console.log('\n========== REAL MESSAGE + NOTIFICATION TEST ==========\n');
    
    // Connect to MongoDB
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(mongoUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected\n');

    // Get all users with tokens
    console.log('👥 Fetching users with active tokens...');
    const usersWithTokens = await UserFcmToken.find({
      'tokens.isActive': true,
    });

    if (usersWithTokens.length < 2) {
      console.log('❌ Need at least 2 users with tokens!');
      await mongoose.connection.close();
      return;
    }

    console.log(`✅ Found ${usersWithTokens.length} user(s) with tokens\n`);

    let totalMessagesSent = 0;
    let totalNotificationsSent = 0;
    let totalNotificationsFailed = 0;

    // Create conversations and exchange messages
    for (let i = 0; i < usersWithTokens.length; i++) {
      const user1 = usersWithTokens[i];
      const user1Details = await getUserDetails(user1.userId);
      const user1Name = user1Details 
        ? `${user1Details.firstName || ''} ${user1Details.lastName || ''}`.trim() || user1Details.email 
        : user1.userId;

      for (let j = 0; j < usersWithTokens.length; j++) {
        if (i === j) continue;

        const user2 = usersWithTokens[j];
        const user2Details = await getUserDetails(user2.userId);
        const user2Name = user2Details 
          ? `${user2Details.firstName || ''} ${user2Details.lastName || ''}`.trim() || user2Details.email 
          : user2.userId;

        console.log(`\n📨 ${user1Name} → ${user2Name}`);

        // Get or create conversation
        const conversation = await getOrCreateConversation(user1.userId, user2.userId);
        if (!conversation) continue;

        // Define real messages
        const messages = [
          'Hi! How are you doing?',
          'I wanted to follow up on the project we discussed.',
          'Do you have time to chat this week?',
        ];

        // Send each message
        for (let msgIdx = 0; msgIdx < messages.length; msgIdx++) {
          const messageBody = messages[msgIdx];

          // Save message to database
          const savedMessage = await sendRealMessage(
            conversation._id,
            user1.userId,
            user1Name,
            messageBody
          );

          if (!savedMessage) continue;

          // Send FCM notification
          const fcmResult = await sendFCMNotification(
            user2.userId,
            user1Name,
            conversation._id,
            messageBody
          );

          totalMessagesSent++;
          totalNotificationsSent += fcmResult.sent;
          totalNotificationsFailed += fcmResult.failed;

          // Add delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }

    console.log(`\n\n========== FINAL RESULTS ==========`);
    console.log(`✅ Real messages saved: ${totalMessagesSent}`);
    console.log(`✅ FCM notifications sent: ${totalNotificationsSent}`);
    console.log(`❌ FCM notifications failed: ${totalNotificationsFailed}`);
    console.log(`📊 Notification delivery rate: ${totalNotificationsSent > 0 ? ((totalNotificationsSent / (totalNotificationsSent + totalNotificationsFailed)) * 100).toFixed(2) : 0}%\n`);

    console.log('💬 IMPORTANT: Messages are now saved in MongoDB!');
    console.log('   Refresh your browser to see them in the chat UI.\n');

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
