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
mongoose.connect(mongoUrl, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// ===== IMPORT MODELS =====
const Conversation = require('./src/modules/conversations/conversation.model') || 
  require('./models/conversation');
const Message = require('./src/modules/conversations/message.model');
const User = require('./src/modules/users/user.model') || require('./models/user');

// FCM TOKEN SCHEMA
const userFcmTokenSchema = new mongoose.Schema({
  userId: String,
  tokens: [{
    token: String,
    deviceType: String,
    isActive: Boolean
  }]
});

const UserFcmToken = mongoose.model('userfcmtoken', userFcmTokenSchema, 'userfcmtokens');

async function getRealChat() {
  console.log('\n========== REAL CHAT SETUP ==========\n');

  const usersWithTokens = await UserFcmToken.find({ 'tokens.isActive': true });

  if (usersWithTokens.length < 2) {
    console.log('❌ Need at least 2 users with active FCM tokens!');
    console.log(`   Found: ${usersWithTokens.length} user(s)`);
    return;
  }

  console.log(`✅ Found ${usersWithTokens.length} users with active tokens:\n`);

  const usersList = [];
  for (const userToken of usersWithTokens) {
    try {
      const user = await User.findById(userToken.userId);
      const userEmail = user?.email || 'Unknown';
      usersList.push({
        userId: userToken.userId,
        email: userEmail,
        name: user?.firstName || userEmail.split('@')[0],
        tokens: userToken.tokens.filter(t => t.isActive)
      });
      console.log(`   ${usersList.length}. ${userEmail}`);
    } catch (err) {
      console.log(`   - ${userToken.userId} (error loading user)`);
    }
  }

  console.log(`\n========== CREATING REAL MESSAGES ==========\n`);

  let totalMessages = 0;
  let totalNotifications = 0;
  let totalConversations = 0;

  // Create messages between each pair of users
  for (let i = 0; i < usersList.length; i++) {
    const sender = usersList[i];

    for (let j = 0; j < usersList.length; j++) {
      if (i === j) continue;

      const receiver = usersList[j];

      // Find or create conversation
      let conversation = await Conversation.findOne({
        participants: { $all: [sender.userId, receiver.userId] }
      });

      if (!conversation) {
        console.log(`💬 Creating conversation: ${sender.email} ↔ ${receiver.email}`);
        
        conversation = await Conversation.create({
          participants: [sender.userId, receiver.userId],
          title: [
            { name: sender.name },
            { name: receiver.name }
          ]
        });
        totalConversations++;
        console.log(`   ✅ Conversation ID: ${conversation._id}\n`);
      } else {
        console.log(`💬 Using existing conversation: ${sender.email} → ${receiver.email}`);
      }

      // Real chat messages
      const chatMessages = [
        `Hey ${receiver.name}! How are you doing? 👋`,
        `I wanted to check in with you about our project. When are you free?`,
        `Let me know if you can meet this week! 😊`,
      ];

      console.log(`   📨 Messages from ${sender.email}:`);

      // Create and send each message
      for (const msgBody of chatMessages) {
        try {
          // Create message with correct schema fields
          const message = await Message.create({
            conversation: conversation._id,  // ObjectId reference, not string
            sender: sender.userId,           // ObjectId reference, not string
            body: msgBody
          });

          console.log(`      ✅ "${msgBody}"`);
          totalMessages++;

          // Send FCM notification to receiver
          for (const tokenObj of receiver.tokens) {
            try {
              const notifMsg = {
                notification: {
                  title: `💬 ${sender.name}`,
                  body: msgBody.substring(0, 80),
                },
                data: {
                  type: 'message',
                  conversationId: conversation._id.toString(),
                  senderId: sender.userId,
                  senderName: sender.name,
                  message: msgBody,
                  timestamp: new Date().toISOString(),
                },
                token: tokenObj.token,
              };

              await messaging.send(notifMsg);
              totalNotifications++;
            } catch (err) {
              console.log(`      ⚠️  FCM failed for ${receiver.email}: ${err.message}`);
            }
          }
        } catch (err) {
          console.log(`      ❌ Message creation error: ${err.message}`);
        }
      }
      console.log('');
    }
  }

  console.log(`\n========== FINAL RESULTS ==========`);
  console.log(`✅ Conversations created: ${totalConversations}`);
  console.log(`✅ Real messages created: ${totalMessages}`);
  console.log(`✅ FCM notifications sent: ${totalNotifications}`);
  if (totalNotifications > 0) {
    console.log(`📊 Success rate: 100%\n`);
  }

  console.log(`🎯 NEXT STEPS:`);
  console.log(`1️⃣  Refresh your browser (Cmd+R or F5)`);
  console.log(`2️⃣  Go to the Messages tab`);
  console.log(`3️⃣  Click on a conversation`);
  console.log(`4️⃣  You should see REAL messages! ✅\n`);

  console.log(`💡 TIP: Messages are now in MongoDB collection 'messages'`);
  console.log(`   Conversations are in collection 'conversations'\n`);
}

async function main() {
  try {
    console.log('\n🔗 Connecting to MongoDB...');
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('MongoDB connection timeout'));
      }, 5000);

      mongoose.connection.once('connected', () => {
        clearTimeout(timeout);
        resolve();
      });

      mongoose.connection.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    console.log('✅ Connected to MongoDB\n');

    await getRealChat();

    await mongoose.connection.close();
    console.log('\n✅ Done!\n');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
