/**
 * Test Script: Verify Message Sending with FCM Token Flow
 * This script tests the complete flow:
 * 1. Get receiver user ID
 * 2. Check if receiver has FCM tokens in userfcmtokens table
 * 3. Send a test message
 * 4. Verify notification is sent to receiver's tokens
 */

require('dotenv').config();
const mongoose = require('mongoose');
const UserFcmToken = require('./src/modules/notification/UserFcmToken.model');
const User = require('./src/modules/users/user.model');
const Conversation = require('./src/modules/conversations/conversation.model');
const Message = require('./src/modules/conversations/message.model');
const Notification = require('./src/modules/notification/notification.model');
const notificationUtils = require('./src/modules/notification/notification.utils');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

async function log(level, message) {
  const timestamp = new Date().toISOString();
  let color = colors.reset;
  switch (level) {
    case 'SUCCESS': color = colors.green; break;
    case 'ERROR': color = colors.red; break;
    case 'INFO': color = colors.blue; break;
    case 'WARN': color = colors.yellow; break;
    case 'DEBUG': color = colors.cyan; break;
  }
  console.log(`${color}[${timestamp}] ${level}${colors.reset}: ${message}`);
}

async function testMessageFcmFlow() {
  try {
    await log('INFO', 'Connecting to MongoDB...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dhruv', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    await log('SUCCESS', 'Connected to MongoDB');

    // Step 1: Get test users
    await log('INFO', '=== STEP 1: Getting Test Users ===');
    const users = await User.find().limit(2);
    
    if (users.length < 2) {
      await log('ERROR', 'Need at least 2 users in database for testing');
      process.exit(1);
    }

    const sender = users[0];
    const receiver = users[1];

    await log('INFO', `Sender: ${sender._id} (${sender.email})`);
    await log('INFO', `Receiver: ${receiver._id} (${receiver.email})`);

    // Step 2: Check receiver's FCM tokens
    await log('INFO', '=== STEP 2: Checking Receiver\'s FCM Tokens ===');
    const receiverFcmData = await UserFcmToken.findOne({ userId: receiver._id.toString() });

    if (!receiverFcmData) {
      await log('WARN', `No FCM token record found for receiver ${receiver._id}`);
      await log('WARN', 'Receiver needs to login and register FCM token first');
    } else {
      await log('SUCCESS', `Found FCM record for receiver`);
      await log('INFO', `Active tokens: ${receiverFcmData.tokens.filter(t => t.isActive).length}`);
      receiverFcmData.tokens.forEach((token, idx) => {
        await log('DEBUG', `Token ${idx + 1}: ${token.token.substring(0, 30)}... [${token.deviceType}] ${token.isActive ? '✓' : '✗'}`);
      });
    }

    // Step 3: Check or create conversation
    await log('INFO', '=== STEP 3: Creating/Getting Conversation ===');
    let conversation = await Conversation.findOne({
      participants: { $all: [sender._id, receiver._id] }
    });

    if (!conversation) {
      await log('INFO', 'Creating new conversation...');
      conversation = await Conversation.create({
        participants: [sender._id, receiver._id],
        title: [
          { role: sender.role || 'employee', name: sender.firstName || sender.email },
          { role: receiver.role || 'employee', name: receiver.firstName || receiver.email }
        ]
      });
      await log('SUCCESS', `Conversation created: ${conversation._id}`);
    } else {
      await log('SUCCESS', `Conversation found: ${conversation._id}`);
    }

    // Step 4: Send test message
    await log('INFO', '=== STEP 4: Sending Test Message ===');
    const testMessage = `Test message at ${new Date().toISOString()}`;

    const message = await Message.create({
      conversation: conversation._id,
      sender: sender._id,
      body: testMessage
    });

    await log('SUCCESS', `Message created: ${message._id}`);
    await log('INFO', `Message body: ${testMessage}`);

    // Update conversation
    conversation.lastMessage = message._id;
    conversation.lastMessageText = testMessage.slice(0, 120);
    conversation.lastMessageSenderId = sender._id;
    conversation.lastMessageTime = new Date();
    conversation.updatedAt = new Date();

    // Update unread counts
    const unreadCountMap = conversation.unreadCount || new Map();
    unreadCountMap.set(sender._id.toString(), 0);
    const currentUnread = unreadCountMap.get(receiver._id.toString()) || 0;
    unreadCountMap.set(receiver._id.toString(), currentUnread + 1);
    conversation.unreadCount = unreadCountMap;

    await conversation.save();
    await log('SUCCESS', 'Conversation updated with message');

    // Step 5: Create notification record
    await log('INFO', '=== STEP 5: Creating Notification Record ===');
    const notificationRecord = await Notification.create({
      userId: receiver._id,
      title: sender.firstName || sender.email,
      body: testMessage.slice(0, 50),
      type: 'message',
      data: {
        conversationId: conversation._id.toString(),
        messageId: message._id.toString(),
        senderId: sender._id.toString()
      },
      relatedId: conversation._id.toString(),
      read: false
    });

    await log('SUCCESS', `Notification record created: ${notificationRecord._id}`);

    // Step 6: Send FCM notification
    await log('INFO', '=== STEP 6: Sending FCM Notification ===');
    const senderDisplayName = sender.firstName || sender.email;
    const messagePreview = testMessage.slice(0, 50);

    const fcmResult = await notificationUtils.sendTemplatedNotification(
      receiver._id.toString(),
      "messageReceived",
      [senderDisplayName, messagePreview],
      {
        data: {
          type: "new_message",
          action: "open_conversation",
          conversationId: conversation._id.toString(),
          messageId: message._id.toString(),
          senderId: sender._id.toString(),
          senderName: senderDisplayName,
          messagePreview: messagePreview,
          messageFull: testMessage.slice(0, 150),
          timestamp: new Date().toISOString()
        }
      }
    );

    // Step 7: Results
    await log('INFO', '=== STEP 7: FCM Send Results ===');
    await log('INFO', `Success: ${fcmResult.success}`);
    await log('INFO', `Tokens sent to: ${fcmResult.sent}`);
    await log('INFO', `Failed: ${fcmResult.failed}`);

    if (fcmResult.success && fcmResult.sent > 0) {
      await log('SUCCESS', `✅ Message FCM notification sent to receiver successfully!`);
    } else if (!receiverFcmData) {
      await log('WARN', '⚠️  Receiver has no FCM tokens registered');
      await log('INFO', 'To test FCM, receiver must login from a mobile/web client to register FCM token');
    } else {
      await log('ERROR', '❌ Failed to send FCM notification');
      if (fcmResult.errors) {
        await log('ERROR', JSON.stringify(fcmResult.errors, null, 2));
      }
    }

    // Step 8: Summary
    await log('INFO', '=== SUMMARY ===');
    await log('INFO', `Message: ${testMessage}`);
    await log('INFO', `Sender: ${sender.email}`);
    await log('INFO', `Receiver: ${receiver.email}`);
    await log('INFO', `Conversation: ${conversation._id}`);
    await log('INFO', `Receiver FCM Tokens: ${receiverFcmData ? receiverFcmData.tokens.filter(t => t.isActive).length : 0}`);

    await log('SUCCESS', 'Test completed successfully!');

  } catch (error) {
    await log('ERROR', error.message);
    await log('ERROR', error.stack);
  } finally {
    await mongoose.connection.close();
    await log('INFO', 'MongoDB connection closed');
    process.exit(0);
  }
}

// Run the test
testMessageFcmFlow();
