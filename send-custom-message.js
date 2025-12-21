const admin = require('firebase-admin');
const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const readline = require('readline');

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

function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function question(rl, prompt) {
  return new Promise(resolve => {
    rl.question(prompt, resolve);
  });
}

async function getUserDetails(userId) {
  try {
    const user = await User.findById(userId).select('email firstName lastName');
    return user;
  } catch (error) {
    return null;
  }
}

async function listAllUsers() {
  try {
    const usersWithTokens = await UserFcmToken.find({
      'tokens.isActive': true,
    });

    console.log('\n📋 Available Users:\n');
    for (let i = 0; i < usersWithTokens.length; i++) {
      const user = usersWithTokens[i];
      const details = await getUserDetails(user.userId);
      const email = details?.email || 'Unknown';
      console.log(`   ${i + 1}. ${email}`);
      console.log(`      ID: ${user.userId}\n`);
    }

    return usersWithTokens;
  } catch (error) {
    console.error('Error listing users:', error);
    return [];
  }
}

async function getOrCreateConversation(userId1, userId2) {
  try {
    let conversation = await Conversation.findOne({
      participants: { $all: [userId1, userId2] }
    });

    if (!conversation) {
      conversation = new Conversation({
        participants: [userId1, userId2],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await conversation.save();
    }

    return conversation;
  } catch (error) {
    console.log(`Error managing conversation: ${error.message}`);
    return null;
  }
}

async function sendMessageAndNotify(conversationId, senderId, senderName, recipientId, messageBody) {
  try {
    // Save message
    const message = new Message({
      conversationId: conversationId,
      senderId: senderId,
      senderName: senderName,
      body: messageBody,
      createdAt: new Date(),
      read: false,
    });

    await message.save();
    console.log(`   ✅ Message saved`);

    // Send FCM
    const recipientTokenData = await UserFcmToken.findOne({ userId: recipientId });
    
    if (!recipientTokenData || !recipientTokenData.tokens || recipientTokenData.tokens.length === 0) {
      console.log(`   ⚠️ No tokens found for recipient`);
      return;
    }

    const activeTokens = recipientTokenData.tokens.filter(t => t.isActive);
    let sentCount = 0;

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
        sentCount++;
      } catch (error) {
        console.log(`   ⚠️ FCM error: ${error.message}`);
      }
    }

    console.log(`   ✅ Notification sent to ${sentCount} device(s)`);
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
}

async function main() {
  try {
    console.log('\n========== SEND CUSTOM MESSAGE ==========\n');
    
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(mongoUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected');

    const rl = createInterface();

    const usersWithTokens = await listAllUsers();

    if (usersWithTokens.length < 2) {
      console.log('❌ Need at least 2 users!');
      rl.close();
      await mongoose.connection.close();
      return;
    }

    // Get sender
    const senderIdx = parseInt(await question(rl, '\nSelect sender (1-' + usersWithTokens.length + '): ')) - 1;
    if (senderIdx < 0 || senderIdx >= usersWithTokens.length) {
      console.log('❌ Invalid sender!');
      rl.close();
      await mongoose.connection.close();
      return;
    }

    const sender = usersWithTokens[senderIdx];
    const senderDetails = await getUserDetails(sender.userId);
    const senderName = senderDetails 
      ? `${senderDetails.firstName || ''} ${senderDetails.lastName || ''}`.trim() || senderDetails.email 
      : sender.userId;

    // Get recipient
    const recipientIdx = parseInt(await question(rl, 'Select recipient (1-' + usersWithTokens.length + '): ')) - 1;
    if (recipientIdx < 0 || recipientIdx >= usersWithTokens.length) {
      console.log('❌ Invalid recipient!');
      rl.close();
      await mongoose.connection.close();
      return;
    }

    const recipient = usersWithTokens[recipientIdx];
    const recipientDetails = await getUserDetails(recipient.userId);
    const recipientName = recipientDetails 
      ? `${recipientDetails.firstName || ''} ${recipientDetails.lastName || ''}`.trim() || recipientDetails.email 
      : recipient.userId;

    // Get message
    const messageBody = await question(rl, `\nEnter message from ${senderName} to ${recipientName}:\n> `);

    if (!messageBody.trim()) {
      console.log('❌ Message cannot be empty!');
      rl.close();
      await mongoose.connection.close();
      return;
    }

    rl.close();

    console.log(`\n📨 Sending message...`);
    console.log(`   From: ${senderName}`);
    console.log(`   To: ${recipientName}`);
    console.log(`   Message: "${messageBody}"\n`);

    // Get or create conversation
    const conversation = await getOrCreateConversation(sender.userId, recipient.userId);
    if (!conversation) {
      console.log('❌ Failed to create conversation!');
      await mongoose.connection.close();
      return;
    }

    // Send message and notification
    await sendMessageAndNotify(
      conversation._id,
      sender.userId,
      senderName,
      recipient.userId,
      messageBody
    );

    console.log('\n✅ Done! Message sent & notification delivered');
    console.log('💡 Tip: Refresh your browser to see the message\n');

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
