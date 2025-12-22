const Conversation = require('./conversation');
const Message = require('./message.model');
const catchAsync = require('../../shared/utils/catchAsync');
const AppError = require('../../shared/utils/appError');
const notificationUtils = require('../notification/notification.utils');
const conversationFcmUtils = require('./fcm.conversation.utils');
const Notification = require('../notification/notification.model');

exports.listConversations = catchAsync(async (req, res) => {
  console.error('📥 [CONV] Listing conversations for user:', req.user._id);
  const filter = { participants: req.user._id };
  const conversations = await Conversation.find(filter)
    .sort({ updatedAt: -1 });
  console.error('📥 [CONV] Found', conversations.length, 'conversations');
  
  // Convert Mongoose documents to plain objects
  const conversationsObj = conversations.map(conv => {
    const obj = conv.toObject();
    
    // Handle Mongoose Map type - convert to plain object
    if (obj.unreadCount) {
      const unreadMap = {};
      if (obj.unreadCount instanceof Map) {
        for (const [key, value] of obj.unreadCount) {
          unreadMap[key] = value;
        }
      } else if (typeof obj.unreadCount === 'object') {
        Object.assign(unreadMap, obj.unreadCount);
      }
      obj.unreadCount = unreadMap;
    }
    
    console.error('📥 [CONV] Conversation title:', obj.title);
    return obj;
  });
  
  console.error('📥 [CONV] Conversations:', JSON.stringify(conversationsObj, null, 2));
  res.status(200).json({ status: 'success', data: conversationsObj });
});

exports.createConversation = catchAsync(async (req, res, next) => {
  console.error('📝 [CONV] Creating conversation for user:', req.user._id);
  console.error('📝 [CONV] Request body:', JSON.stringify(req.body, null, 2));
  
  // Validate and filter participants - remove empty strings and null values
  const rawParticipants = req.body.participants || [];
  const validatedParticipants = rawParticipants.filter(p => p && typeof p === 'string' && p.trim().length > 0);
  
  // Add current user and deduplicate
  const participants = Array.from(new Set([...validatedParticipants, req.user._id.toString()]));
  console.error('📝 [CONV] Participants after validation and dedup:', participants);
  
  // Check if any participant is empty
  if (participants.some(p => !p || p.trim().length === 0)) {
    console.error('❌ [CONV] Invalid participant detected (empty string)');
    return next(new AppError('All participants must have valid IDs', 400));
  }
  
  if (participants.length < 2) {
    console.error('❌ [CONV] Invalid participant count:', participants.length);
    return next(new AppError('Conversation requires at least two participants', 400));
  }

  // Check for existing conversation with same participants
  console.error('📝 [CONV] Checking for existing conversation...');
  const existingConversation = await Conversation.findOne({
    participants: { $all: participants, $size: participants.length }
  });

  if (existingConversation) {
    console.error('📝 [CONV] Existing conversation found:', existingConversation._id);
    
    // Convert to plain object and explicitly convert Map field
    let conversationObj = existingConversation.toObject();
    conversationObj.unreadCount = convertMapToObject(conversationObj.unreadCount);
    
    return res.status(200).json({ 
      status: 'success', 
      data: conversationObj,
      message: 'Existing conversation found'
    });
  }

  console.error('📝 [CONV] Creating new conversation with participants:', participants);
  
  let title = '';
  
  if (req.body.title && typeof req.body.title === 'string') {
    title = req.body.title;
  } else if (req.body.jobId) {
    // For job-related conversations: use job title
    try {
      const Job = require('../jobs/job.model');
      const job = await Job.findById(req.body.jobId);
      title = job?.title || `Job ID: ${req.body.jobId}`;
      console.error('📝 [CONV] Generated title from job:', title);
    } catch (err) {
      console.error('❌ [CONV] Error generating title from job:', err.message);
      title = `Job ID: ${req.body.jobId}`;
    }
  } else if (participants.length === 2) {
    // For one-on-one: get both participants' names and assign roles
    try {
      const User = require('../users/user.model');
      
      const participant1Id = participants[0];
      const participant2Id = participants[1];
      
      const user1 = await User.findById(participant1Id);
      const user2 = await User.findById(participant2Id);
      
      const name1 = user1?.firstName || user1?.email || 'User';
      const name2 = user2?.firstName || user2?.email || 'User';
      
      const role1 = user1?.role || 'employee';
      const role2 = user2?.role || 'employee';
      
      title = [
        { role: role1, name: name1 },
        { role: role2, name: name2 }
      ];
      
      console.error('📝 [CONV] Generated title array:', JSON.stringify(title));
    } catch (err) {
      console.error('❌ [CONV] Error generating title:', err.message);
      title = [
        { role: 'employee', name: 'User1' },
        { role: 'worker', name: 'User2' }
      ];
    }
  }
  console.error('📝 [CONV] Conversation title array:', JSON.stringify(title));
  
  const conversation = await Conversation.create({
    participants,
    title
  });
  console.error('📝 [CONV] Conversation created successfully:', conversation._id);
  
  // Convert to plain object and explicitly convert Map field
  let conversationObj = conversation.toObject();
  conversationObj.unreadCount = convertMapToObject(conversationObj.unreadCount);
  
  // SEND NOTIFICATION - Conversation Started (to other participants)
  const otherParticipants = participants.filter(p => p !== req.user._id.toString());
  for (const recipientId of otherParticipants) {
    try {
      const initiatorName = req.user.firstName || req.user.email || 'Unknown';
      await conversationFcmUtils.notifyConversationStarted(
        recipientId.toString(),
        initiatorName,
        conversation._id.toString()
      );
      console.error('✅ [CONV] Conversation started notification sent to:', recipientId);
    } catch (error) {
      console.error("❌ [CONV] Conversation notification error:", error.message);
    }
  }
  
  console.error('📝 [CONV] Final object to send:', conversationObj);
  res.status(201).json({ status: 'success', data: conversationObj });
});

// Helper function to convert Map or Map-like objects to plain objects
function convertMapToObject(value) {
  if (!value) return {};
  
  const obj = {};
  try {
    if (value instanceof Map) {
      for (const [key, val] of value) {
        obj[key] = val;
      }
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(obj, value);
    }
  } catch (e) {
    console.error('⚠️  Error converting map:', e.message);
  }
  return obj;
}

exports.listMessages = catchAsync(async (req, res, next) => {
  const conversationId = req.params.conversationId;
  console.error('═══════════════════════════════════════════════════════');
  console.error('📬 [MSG] GET /conversations/:id/messages');
  console.error('📬 [MSG] Conversation ID:', conversationId);
  console.error('📬 [MSG] User ID:', req.user._id);
  
  const conversation = await Conversation.findById(conversationId);
  console.error('📬 [MSG] Conversation found:', !!conversation);
  console.error('📬 [MSG] Conversation data:', JSON.stringify(conversation, null, 2));
  
  if (!conversation) {
    console.error('❌ [MSG] Conversation not found:', conversationId);
    return next(new AppError('Conversation not found', 404));
  }
  
  if (!conversation.participants.includes(req.user._id)) {
    console.error('❌ [MSG] User not participant of conversation');
    console.error('📬 [MSG] Participants:', conversation.participants);
    console.error('📬 [MSG] User ID:', req.user._id);
    return next(new AppError('Conversation not found', 404));
  }
  
  console.error('📬 [MSG] Querying messages with: { conversation:', conversationId, '}');
  const messages = await Message.find({ conversation: conversation._id }).sort({ createdAt: 1 });
  console.error('📬 [MSG] Found', messages.length, 'messages');
  console.error('📬 [MSG] First message:', messages[0]);
  console.error('═══════════════════════════════════════════════════════');
  res.status(200).json({ status: 'success', data: messages });
});

exports.sendMessage = catchAsync(async (req, res, next) => {
  console.error('\n═══════════════════════════════════════════════════════');
  console.error('📨 [MSG] ===== SEND MESSAGE START =====');
  console.error('📨 [MSG] Sending message');
  console.error('📨 [MSG] Conversation ID:', req.params.conversationId);
  console.error('📨 [MSG] Sender User ID:', req.user._id);
  console.error('📨 [MSG] Sender Email:', req.user?.email);
  console.error('📨 [MSG] Request body:', req.body);

  const conversation = await Conversation.findById(req.params.conversationId);
  console.error('📨 [MSG] Conversation found:', !!conversation);
  if (conversation) {
    console.error('📨 [MSG] Conversation participants:', conversation.participants);
    console.error('📨 [MSG] Sender is participant:', conversation.participants.includes(req.user._id));
  }
  
  if (!conversation || !conversation.participants.includes(req.user._id)) {
    console.error('❌ [MSG] Conversation not found or user not participant');
    return next(new AppError('Conversation not found', 404));
  }

  // Get receiver ID (the other participant)
  const receiverId = conversation.participants.find(p => p.toString() !== req.user._id.toString());
  console.error('📨 [MSG] Receiver ID:', receiverId);
  console.error('📨 [MSG] Message text:', req.body.body);
  console.error('📨 [MSG] Message length:', req.body.body?.length);

  // Create the message using the correct field names from schema
  const message = await Message.create({
    conversation: conversation._id,
    sender: req.user._id,
    body: req.body.body
  });
  console.error('✅ [MSG] Message created successfully:', message._id);
  console.error('📨 [MSG] Message object:', {
    id: message._id,
    conversation: message.conversation,
    sender: message.sender,
    body: message.body.substring(0, 50) + (message.body.length > 50 ? '...' : ''),
    createdAt: message.createdAt
  });

  // Update conversation
  conversation.lastMessage = message._id;
  conversation.lastMessageText = req.body.body.slice(0, 120);
  conversation.lastMessageSenderId = req.user._id;
  conversation.lastMessageTime = new Date();
  conversation.updatedAt = new Date();
  console.error('📨 [MSG] Updated conversation metadata');

  // Update unread counts - reset for sender, increment for receiver
  const unreadCountMap = conversation.unreadCount || new Map();
  console.error('📨 [MSG] Current unreadCount:', Object.fromEntries(unreadCountMap));
  
  // Reset sender's unread count
  unreadCountMap.set(req.user._id.toString(), 0);
  
  // Increment receiver's unread count
  const receiverKey = receiverId.toString();
  const currentUnread = unreadCountMap.get(receiverKey) || 0;
  unreadCountMap.set(receiverKey, currentUnread + 1);
  
  conversation.unreadCount = unreadCountMap;
  console.error('📨 [MSG] Updated unread counts:', Object.fromEntries(unreadCountMap));

  await conversation.save();
  console.error('✅ [MSG] Conversation saved successfully');

  // Populate sender details for notification
  await message.populate('sender', 'firstName lastName email');
  const senderName = message.sender?.firstName ? 
    `${message.sender.firstName} ${message.sender.lastName || ''}`.trim() : 
    message.sender?.email || 'Unknown';
  console.error('📨 [MSG] Sender name for notification:', senderName);

  // Send notification to other participants
  const recipients = conversation.participants.filter(p => p.toString() !== req.user._id.toString());
  console.error('📨 [MSG] Recipients count:', recipients.length);
  console.error('📨 [MSG] Recipient IDs:', recipients.map(r => r.toString()));

  // Create notification records for each recipient
  const senderDisplayName = message.sender?.firstName || message.sender?.email || 'Unknown';
  const messagePreview = req.body.body.slice(0, 50);
  
  for (const recipientId of recipients) {
    try {
      await Notification.create({
        userId: recipientId,
        title: senderDisplayName,
        body: messagePreview,
        type: 'message',
        data: {
          conversationId: conversation._id.toString(),
          messageId: message._id.toString(),
          senderId: req.user._id.toString()
        },
        relatedId: conversation._id.toString(),
        read: false
      });
      console.error('✅ [NOTIF] Created notification for recipient:', recipientId);
    } catch (notifErr) {
      console.error('⚠️  [NOTIF] Failed to create notification:', notifErr.message);
    }
  }

  // Send notification asynchronously - don't wait for it
  console.error('📱 [CONV-FCM] ===== STARTING ASYNC FCM NOTIFICATIONS =====');
  (async () => {
    try {
      console.error('📱 [CONV-FCM] Inside async notification block, recipients:', recipients.length);
      for (const recipientId of recipients) {
        try {
          console.error('📱 [CONV-FCM] Notifying recipient:', recipientId.toString());
          const senderDisplayName = message.sender?.firstName || message.sender?.email || 'Unknown';
          const messagePreview = req.body.body.slice(0, 50);
          const messageFull = req.body.body.slice(0, 150);

          console.error('📱 [CONV-FCM] About to call notifyNewMessage');
          const fcmResult = await conversationFcmUtils.notifyNewMessage(
            recipientId.toString(),
            senderDisplayName,
            messagePreview,
            conversation._id.toString(),
            message._id.toString(),
            messageFull
          );
          
          console.error('📱 [CONV-FCM] notifyNewMessage returned:', JSON.stringify(fcmResult));
          if (fcmResult.success && fcmResult.sent > 0) {
            console.error('✅ [CONV-FCM] FCM notification sent to:', recipientId);
          } else {
            console.error('⚠️  [CONV-FCM] FCM notification may have failed');
            console.error('⚠️  [CONV-FCM] Success:', fcmResult.success, 'Sent:', fcmResult.sent);
          }
          
        } catch (notificationError) {
          console.error('❌ [CONV-FCM] Exception for recipient:', recipientId.toString());
          console.error('❌ [CONV-FCM] Error:', notificationError.message);
        }
      }
      console.error('📱 [CONV-FCM] ===== ASYNC FCM NOTIFICATIONS COMPLETE =====');
    } catch (outerError) {
      console.error('❌ [CONV-FCM] Outer error in async block:', outerError.message);
    }
  })().catch(err => {
    console.error('❌ [CONV-FCM] Unhandled error in async IIFE:', err.message);
  });

  console.error('📨 [MSG] ===== SEND MESSAGE END =====');
  console.error('═══════════════════════════════════════════════════════\n');
  
  res.status(201).json({ status: 'success', data: message });
});

exports.markConversationRead = catchAsync(async (req, res, next) => {
  console.error('👁️  [CONV] Marking conversation as read:', req.params.conversationId);
  const conversation = await Conversation.findById(req.params.conversationId);
  
  if (!conversation) {
    console.error('❌ [CONV] Conversation not found:', req.params.conversationId);
    return next(new AppError('Conversation not found', 404));
  }
  
  if (!conversation.participants.includes(req.user._id)) {
    console.error('❌ [CONV] User not participant of conversation');
    return next(new AppError('Conversation not found', 404));
  }
  
  conversation.unreadCount.set(req.user._id.toString(), 0);
  await conversation.save();
  console.error('👁️  [CONV] Conversation marked as read');
  res.status(200).json({ status: 'success', data: conversation });
});

// FCM Health Check - Quick debugging endpoint
exports.fcmHealthCheck = catchAsync(async (req, res, next) => {
  try {
    const userId = req.params.userId;

    if (!userId) {
      return res.status(400).json({
        status: 'fail',
        message: 'userId parameter required'
      });
    }

    // Get FCM tokens - use UserFcmToken model
    const UserFcmToken = require('../notification/UserFcmToken.model');
    const tokens = await UserFcmToken.find({ userId: userId });

    // Check Firebase
    const firebaseConfig = require('../notification/config/firebase');
    const firebaseInitialized = firebaseConfig.isInitialized;

    console.error('🔴 [FCM-CHECK] User:', userId);
    console.error('🔴 [FCM-CHECK] Firebase Initialized:', firebaseInitialized);
    console.error('🔴 [FCM-CHECK] Tokens Found:', tokens.length);
    
    res.status(200).json({
      status: 'success',
      data: {
        userId: userId,
        firebaseInitialized: firebaseInitialized,
        tokensFound: tokens.length,
        tokens: tokens.map(t => ({
          token: t.token.substring(0, 30) + '...',
          deviceType: t.deviceType,
          isActive: t.isActive,
          createdAt: t.createdAt
        })),
        recommendation: !firebaseInitialized 
          ? '❌ Firebase not initialized - check credentials'
          : tokens.length === 0
          ? '⚠️  No tokens found - user needs to register FCM token'
          : `✅ ${tokens.length} active token(s) - FCM should work`
      }
    });
  } catch (error) {
    console.error('🔴 [FCM-CHECK-ERROR]', error.message);
    res.status(500).json({
      status: 'fail',
      error: error.message
    });
  }
});

