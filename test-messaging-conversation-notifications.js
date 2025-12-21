const admin = require('firebase-admin');
const mongoose = require('mongoose');
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

// User Model for getting user details
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
    console.log(`⚠️ Could not fetch user details for ${userId}`);
    return null;
  }
}

async function sendMessagingNotification(recipientId, senderName, message, senderUserId) {
  try {
    // Get recipient tokens
    const recipientTokenData = await UserFcmToken.findOne({ userId: recipientId });
    
    if (!recipientTokenData || !recipientTokenData.tokens || recipientTokenData.tokens.length === 0) {
      console.log(`   ⚠️ No tokens found for recipient ${recipientId}`);
      return { sent: 0, failed: 0 };
    }

    const activeTokens = recipientTokenData.tokens.filter(t => t.isActive);
    if (activeTokens.length === 0) {
      console.log(`   ⚠️ No active tokens for recipient ${recipientId}`);
      return { sent: 0, failed: 0 };
    }

    console.log(`   📤 Sending to ${activeTokens.length} token(s)...`);

    let successCount = 0;
    let failureCount = 0;

    // Send to each token
    for (const tokenObj of activeTokens) {
      try {
        const notificationMessage = {
          notification: {
            title: `💬 Message from ${senderName}`,
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

        const response = await messaging.send(notificationMessage);
        console.log(`      ✅ Token sent: ${tokenObj.token.substring(0, 30)}... (${response})`);
        successCount++;
      } catch (error) {
        console.log(`      ❌ Token failed: ${tokenObj.token.substring(0, 30)}... (${error.message})`);
        failureCount++;
      }
    }

    return { sent: successCount, failed: failureCount };
  } catch (error) {
    console.log(`   ❌ Error sending to recipient: ${error.message}`);
    return { sent: 0, failed: 0 };
  }
}

async function main() {
  try {
    console.log('\n========== MESSAGING CONVERSATION NOTIFICATION TEST ==========\n');
    
    // Connect to MongoDB
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected\n');

    // Get all users with tokens
    console.log('👥 Fetching users with active tokens...');
    const usersWithTokens = await UserFcmToken.find({
      'tokens.isActive': true,
    });

    if (usersWithTokens.length === 0) {
      console.log('❌ No users with active tokens found!');
      await mongoose.connection.close();
      return;
    }

    console.log(`✅ Found ${usersWithTokens.length} user(s) with tokens\n`);

    let totalSent = 0;
    let totalFailed = 0;

    // Create conversation between all users
    for (let i = 0; i < usersWithTokens.length; i++) {
      const sender = usersWithTokens[i];
      const senderDetails = await getUserDetails(sender.userId);
      const senderName = senderDetails 
        ? `${senderDetails.firstName || ''} ${senderDetails.lastName || ''}`.trim() || senderDetails.email 
        : sender.userId;

      console.log(`\n📤 Sender: ${senderName} (${sender.userId})`);
      console.log(`   Active tokens: ${sender.tokens.filter(t => t.isActive).length}`);

      // Send message to all other users
      for (let j = 0; j < usersWithTokens.length; j++) {
        if (i === j) continue; // Don't send to self

        const recipient = usersWithTokens[j];
        const recipientDetails = await getUserDetails(recipient.userId);
        const recipientName = recipientDetails 
          ? `${recipientDetails.firstName || ''} ${recipientDetails.lastName || ''}`.trim() || recipientDetails.email 
          : recipient.userId;

        console.log(`\n   💬 → Recipient: ${recipientName} (${recipient.userId})`);

        const messages = [
          `Hey ${recipientName}! How are you doing?`,
          `I wanted to check in about the job we discussed.`,
          `Can we schedule a time to chat more about this?`,
        ];

        for (const message of messages) {
          const result = await sendMessagingNotification(
            recipient.userId,
            senderName,
            message,
            sender.userId
          );
          totalSent += result.sent;
          totalFailed += result.failed;
        }
      }
    }

    console.log(`\n\n========== RESULTS ==========`);
    console.log(`✅ Total notifications sent: ${totalSent}`);
    console.log(`❌ Total notifications failed: ${totalFailed}`);
    console.log(`📊 Success rate: ${totalSent > 0 ? ((totalSent / (totalSent + totalFailed)) * 100).toFixed(2) : 0}%\n`);

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

main();
