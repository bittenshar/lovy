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

// Define schemas inline
const messageSchema = new mongoose.Schema({
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  body: { type: String, required: true },
  readBy: {
    type: [mongoose.Schema.Types.ObjectId],
    default: []
  }
}, { timestamps: true });

messageSchema.index({ conversation: 1, createdAt: 1 });

const conversationSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  }],
  title: [{
    role: { type: String, enum: ['worker'] },
    name: { type: String }
  }],
  lastMessage: mongoose.Schema.Types.ObjectId,
  lastMessageText: String,
  lastMessageSenderId: mongoose.Schema.Types.ObjectId,
  lastMessageTime: Date,
  unreadCount: { type: Map, of: Number, default: new Map() },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

conversationSchema.index({ participants: 1 });
conversationSchema.index({ updatedAt: -1 });

const userFcmTokenSchema = new mongoose.Schema({
  userId: String,
  tokens: [{
    token: String,
    deviceType: String,
    isActive: Boolean
  }]
});

// Create models
const Message = mongoose.model('Message', messageSchema, 'messages');
const Conversation = mongoose.model('Conversation', conversationSchema, 'conversations');
const UserFcmToken = mongoose.model('UserFcmToken', userFcmTokenSchema, 'userfcmtokens');

const userSchema = new mongoose.Schema({
  email: String,
  firstName: String,
  lastName: String,
  role: String
});

const User = mongoose.model('User', userSchema, 'users');

async function main() {
  try {
    console.log('\n🔗 Connecting to MongoDB...');
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);
      mongoose.connection.once('connected', () => {
        clearTimeout(timeout);
        resolve();
      });
    });
    console.log('✅ Connected\n');

    // Get users with tokens
    const usersWithTokens = await UserFcmToken.find({ 'tokens.isActive': true });
    console.log(`👥 Found ${usersWithTokens.length} users with active tokens\n`);

    if (usersWithTokens.length < 2) {
      console.log('❌ Need at least 2 users!');
      process.exit(0);
    }

    const usersList = [];
    for (const userToken of usersWithTokens) {
      const user = await User.findById(userToken.userId);
      const email = user?.email || 'Unknown';
      const name = user?.firstName || email.split('@')[0];
      
      usersList.push({
        userId: userToken.userId,
        email,
        name,
        tokens: userToken.tokens.filter(t => t.isActive)
      });
      
      console.log(`   ${usersList.length}. ${email} (${name})`);
    }

    console.log(`\n========== CREATING REAL MESSAGES ==========\n`);

    let totalMessages = 0;
    let totalNotifications = 0;

    // For each sender
    for (const sender of usersList) {
      // To each receiver
      for (const receiver of usersList) {
        if (sender.userId === receiver.userId) continue;

        // Find or create conversation
        let conversation = await Conversation.findOne({
          participants: { $all: [sender.userId, receiver.userId] }
        });

        if (!conversation) {
          conversation = await Conversation.create({
            participants: [sender.userId, receiver.userId],
            title: [
              { name: sender.name, role: 'worker' },
              { name: receiver.name, role: 'worker' }
            ]
          });
          console.log(`\n💬 ${sender.email} → ${receiver.email}`);
          console.log(`   Conversation: ${conversation._id}`);
        }

        // Create 3 real messages
        const messages = [
          `Hey ${receiver.name}! How are you doing? 👋`,
          `I wanted to check in with you. When are you free?`,
          `Let me know! 😊`
        ];

        for (const body of messages) {
          // Create message
          const message = await Message.create({
            conversation: conversation._id,
            sender: sender.userId,
            body: body
          });

          console.log(`   ✅ "${body}"`);
          totalMessages++;

          // Send notification
          for (const tokenObj of receiver.tokens) {
            try {
              await messaging.send({
                notification: {
                  title: `${sender.name}`,
                  body: body.substring(0, 80)
                },
                data: {
                  type: 'message',
                  conversationId: conversation._id.toString(),
                  senderId: sender.userId,
                  senderName: sender.name,
                  message: body
                },
                token: tokenObj.token
              });
              totalNotifications++;
            } catch (err) {
              console.log(`      ⚠️  Notification failed`);
            }
          }
        }
      }
    }

    console.log(`\n========== RESULTS ==========`);
    console.log(`✅ Messages: ${totalMessages}`);
    console.log(`✅ Notifications: ${totalNotifications}`);

    console.log(`\n🎯 NOW:\n   1. Refresh browser (Cmd+R)\n   2. Check Messages tab\n   3. Click conversation\n   4. See REAL messages! ✅\n`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌', error.message);
    process.exit(1);
  }
}

main();
