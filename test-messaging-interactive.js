const admin = require('firebase-admin');
const mongoose = require('mongoose');
const readline = require('readline');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, 'src', 'config', 'config.env') });

// Initialize Firebase Admin
const serviceAccount = require('./firebase-service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id,
});

const messaging = admin.messaging();

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/work-connect';

// User FCM Token Model
const userFcmTokenSchema = new mongoose.Schema({
  userId: String,
  tokens: [{
    token: String,
    deviceType: String,
    isActive: Boolean,
  }],
}, { collection: 'userfcmtokens' });

const UserFcmToken = mongoose.model('UserFcmToken', userFcmTokenSchema);

// User Model
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

    if (usersWithTokens.length === 0) {
      console.log('❌ No users with active tokens found!');
      return [];
    }

    console.log('\n📋 Users with active tokens:\n');
    for (let i = 0; i < usersWithTokens.length; i++) {
      const user = usersWithTokens[i];
      const details = await getUserDetails(user.userId);
      const email = details?.email || 'Unknown';
      const activeCount = user.tokens.filter(t => t.isActive).length;
      console.log(`   ${i + 1}. ${email} (${user.userId})`);
      console.log(`      └─ ${activeCount} active token(s)\n`);
    }

    return usersWithTokens;
  } catch (error) {
    console.error('Error listing users:', error);
    return [];
  }
}

async function sendMessageNotification(recipientId, senderName, senderUserId, message) {
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
            body: message.substring(0, 150),
          },
          data: {
            type: 'message',
            senderId: senderUserId,
            senderName: senderName,
            message: message,
            timestamp: new Date().toISOString(),
            url: '/messages',
          },
          token: tokenObj.token,
        };

        await messaging.send(notificationMessage);
        console.log(`      ✅ Sent to token: ${tokenObj.token.substring(0, 30)}...`);
        successCount++;
      } catch (error) {
        console.log(`      ❌ Failed: ${error.message}`);
        failureCount++;
      }
    }

    return { sent: successCount, failed: failureCount };
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return { sent: 0, failed: 0 };
  }
}

async function main() {
  try {
    console.log('\n========== MESSAGING CONVERSATION TEST ==========\n');
    
    // Connect to MongoDB
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected');

    const rl = createInterface();

    // Get all users
    const usersWithTokens = await listAllUsers();

    if (usersWithTokens.length === 0) {
      rl.close();
      await mongoose.connection.close();
      return;
    }

    // Ask user which mode to use
    console.log('\n🔧 Select mode:');
    console.log('   1. All users message each other');
    console.log('   2. Specific users message each other');
    const mode = await question(rl, '\nEnter choice (1 or 2): ');

    let senderIndices = [];
    let recipientIndices = [];

    if (mode === '1') {
      // All users message each other
      senderIndices = usersWithTokens.map((_, i) => i);
      recipientIndices = usersWithTokens.map((_, i) => i);
    } else if (mode === '2') {
      // Specific users
      const sendersInput = await question(rl, '\nEnter sender indices (comma-separated, e.g., 1,2): ');
      const recipientsInput = await question(rl, 'Enter recipient indices (comma-separated, e.g., 1,2): ');
      
      senderIndices = sendersInput.split(',').map(s => parseInt(s.trim()) - 1).filter(i => i >= 0 && i < usersWithTokens.length);
      recipientIndices = recipientsInput.split(',').map(r => parseInt(r.trim()) - 1).filter(i => i >= 0 && i < usersWithTokens.length);

      if (senderIndices.length === 0 || recipientIndices.length === 0) {
        console.log('❌ Invalid indices!');
        rl.close();
        await mongoose.connection.close();
        return;
      }
    } else {
      console.log('❌ Invalid choice!');
      rl.close();
      await mongoose.connection.close();
      return;
    }

    rl.close();

    let totalSent = 0;
    let totalFailed = 0;

    console.log('\n========== SENDING MESSAGES ==========\n');

    // Send messages
    for (const senderIdx of senderIndices) {
      const sender = usersWithTokens[senderIdx];
      const senderDetails = await getUserDetails(sender.userId);
      const senderName = senderDetails 
        ? `${senderDetails.firstName || ''} ${senderDetails.lastName || ''}`.trim() || senderDetails.email 
        : sender.userId;

      console.log(`📤 From: ${senderName}`);

      for (const recipientIdx of recipientIndices) {
        if (senderIdx === recipientIdx) continue;

        const recipient = usersWithTokens[recipientIdx];
        const recipientDetails = await getUserDetails(recipient.userId);
        const recipientName = recipientDetails 
          ? `${recipientDetails.firstName || ''} ${recipientDetails.lastName || ''}`.trim() || recipientDetails.email 
          : recipient.userId;

        console.log(`   → To: ${recipientName}`);

        const messages = [
          `Hi ${recipientName}! 👋 How are you?`,
          `I wanted to follow up on our conversation.`,
          `Let me know if you're interested!`,
        ];

        for (const msg of messages) {
          const result = await sendMessageNotification(
            recipient.userId,
            senderName,
            sender.userId,
            msg
          );
          totalSent += result.sent;
          totalFailed += result.failed;
        }
      }
      console.log();
    }

    console.log(`\n========== RESULTS ==========`);
    console.log(`✅ Sent: ${totalSent}`);
    console.log(`❌ Failed: ${totalFailed}`);
    console.log(`📊 Success rate: ${totalSent > 0 ? ((totalSent / (totalSent + totalFailed)) * 100).toFixed(2) : 0}%\n`);

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
