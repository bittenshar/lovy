const Conversation = require('../../../models/conversation');
const Message = require('./message.model');
const catchAsync = require('../../shared/utils/catchAsync');
const AppError = require('../../shared/utils/appError');
const notificationService = require('../notifications/notification.service');

exports.listConversations = catchAsync(async (req, res) => {
  console.log('📥 [CONV] Listing conversations for user:', req.user._id);
  const filter = { participants: req.user._id };
  const conversations = await Conversation.find(filter)
    .sort({ updatedAt: -1 });
  console.log('📥 [CONV] Found', conversations.length, 'conversations');
  
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
    return obj;
  });
  
  console.log('📥 [CONV] Conversations:', JSON.stringify(conversationsObj, null, 2));
  res.status(200).json({ status: 'success', data: conversationsObj });
});

exports.createConversation = catchAsync(async (req, res, next) => {
  console.log('📝 [CONV] Creating conversation for user:', req.user._id);
  console.log('📝 [CONV] Request body:', JSON.stringify(req.body, null, 2));
  
  const participants = Array.from(new Set([...req.body.participants, req.user._id.toString()]));
  console.log('📝 [CONV] Participants after dedup:', participants);
  
  if (participants.length < 2) {
    console.log('❌ [CONV] Invalid participant count:', participants.length);
    return next(new AppError('Conversation requires at least two participants', 400));
  }

  // Check for existing conversation with same participants
  console.log('📝 [CONV] Checking for existing conversation...');
  const existingConversation = await Conversation.findOne({
    participants: { $all: participants, $size: participants.length }
  });

  if (existingConversation) {
    console.log('📝 [CONV] Existing conversation found:', existingConversation._id);
    
    // Convert to plain object for JSON serialization
    const conversationObj = existingConversation.toObject();
    
    // Handle Mongoose Map type - convert to plain object
    if (conversationObj.unreadCount) {
      const unreadMap = {};
      if (conversationObj.unreadCount instanceof Map) {
        for (const [key, value] of conversationObj.unreadCount) {
          unreadMap[key] = value;
        }
      } else if (typeof conversationObj.unreadCount === 'object') {
        Object.assign(unreadMap, conversationObj.unreadCount);
      }
      conversationObj.unreadCount = unreadMap;
    }
    
    return res.status(200).json({ 
      status: 'success', 
      data: conversationObj,
      message: 'Existing conversation found'
    });
  }

  console.log('📝 [CONV] Creating new conversation with participants:', participants);
  const conversation = await Conversation.create({
    participants
  });
  console.log('📝 [CONV] Conversation created successfully:', conversation._id);
  
  // Convert to plain object for JSON serialization
  const conversationObj = conversation.toObject();
  
  // Handle Mongoose Map type - convert to plain object
  if (conversationObj.unreadCount) {
    const unreadMap = {};
    if (conversationObj.unreadCount instanceof Map) {
      for (const [key, value] of conversationObj.unreadCount) {
        unreadMap[key] = value;
      }
    } else if (typeof conversationObj.unreadCount === 'object') {
      Object.assign(unreadMap, conversationObj.unreadCount);
    }
    conversationObj.unreadCount = unreadMap;
    console.log('📝 [CONV] Converted unreadCount:', conversationObj.unreadCount);
  }
  
  console.log('📝 [CONV] Full conversation object:', JSON.stringify(conversationObj, null, 2));
  res.status(201).json({ status: 'success', data: conversationObj });
});

exports.listMessages = catchAsync(async (req, res, next) => {
  const conversationId = req.params.conversationId;
  console.log('═══════════════════════════════════════════════════════');
  console.log('📬 [MSG] GET /conversations/:id/messages');
  console.log('📬 [MSG] Conversation ID:', conversationId);
  console.log('📬 [MSG] User ID:', req.user._id);
  
  const conversation = await Conversation.findById(conversationId);
  console.log('📬 [MSG] Conversation found:', !!conversation);
  console.log('📬 [MSG] Conversation data:', JSON.stringify(conversation, null, 2));
  
  if (!conversation) {
    console.log('❌ [MSG] Conversation not found:', conversationId);
    return next(new AppError('Conversation not found', 404));
  }
  
  if (!conversation.participants.includes(req.user._id)) {
    console.log('❌ [MSG] User not participant of conversation');
    console.log('📬 [MSG] Participants:', conversation.participants);
    console.log('📬 [MSG] User ID:', req.user._id);
    return next(new AppError('Conversation not found', 404));
  }
  
  console.log('📬 [MSG] Querying messages with: { conversation:', conversationId, '}');
  const messages = await Message.find({ conversation: conversation._id }).sort({ createdAt: 1 });
  console.log('📬 [MSG] Found', messages.length, 'messages');
  console.log('📬 [MSG] First message:', messages[0]);
  console.log('═══════════════════════════════════════════════════════');
  res.status(200).json({ status: 'success', data: messages });
});

exports.sendMessage = catchAsync(async (req, res, next) => {
  console.log('📨 [MSG] Sending message');
  console.log('📨 [MSG] Conversation ID:', req.params.conversationId);
  console.log('📨 [MSG] User ID:', req.user._id);
  console.log('📨 [MSG] Request body:', req.body);

  const conversation = await Conversation.findById(req.params.conversationId);
  if (!conversation || !conversation.participants.includes(req.user._id)) {
    console.log('❌ [MSG] Conversation not found or user not participant');
    return next(new AppError('Conversation not found', 404));
  }

  // Get receiver ID (the other participant)
  const receiverId = conversation.participants.find(p => p.toString() !== req.user._id.toString());
  console.log('📨 [MSG] Receiver ID:', receiverId);
  console.log('📨 [MSG] Message text:', req.body.body);

  // Create the message using the correct field names from schema
  const message = await Message.create({
    conversation: conversation._id,
    sender: req.user._id,
    body: req.body.body
  });
  console.log('✅ [MSG] Message created successfully:', message._id);
  console.log('📨 [MSG] Message content:', message);

  // Update conversation
  conversation.lastMessage = message._id;
  conversation.lastMessageText = req.body.body.slice(0, 120);
  conversation.lastMessageSenderId = req.user._id;
  conversation.lastMessageTime = new Date();
  conversation.updatedAt = new Date();

  // Update unread counts - reset for sender, increment for receiver
  const unreadCountMap = conversation.unreadCount || new Map();
  
  // Reset sender's unread count
  unreadCountMap.set(req.user._id.toString(), 0);
  
  // Increment receiver's unread count
  const receiverKey = receiverId.toString();
  const currentUnread = unreadCountMap.get(receiverKey) || 0;
  unreadCountMap.set(receiverKey, currentUnread + 1);
  
  conversation.unreadCount = unreadCountMap;
  console.log('📨 [MSG] Updated unread counts:', Object.fromEntries(unreadCountMap));

  await conversation.save();
  console.log('✅ [MSG] Conversation updated successfully');

  // Populate sender details for notification
  await message.populate('sender', 'firstName lastName email');
  const senderName = message.sender?.firstName ? 
    `${message.sender.firstName} ${message.sender.lastName || ''}`.trim() : 
    message.sender?.email || 'Unknown';

  // Send notification to other participants
  const recipients = conversation.participants.filter(p => p.toString() !== req.user._id.toString());
  console.log('📨 [MSG] Sending notification to recipients:', recipients);

  // Send notification to each recipient
  for (const recipientId of recipients) {
    try {
      await notificationService.sendSafeNotification({
        recipient: recipientId,
        type: 'chat',
        priority: 'medium',
        title: `New message from ${senderName}`,
        message: req.body.body.slice(0, 100) + (req.body.body.length > 100 ? '...' : ''),
        metadata: {
          type: 'chat',
          conversationId: conversation._id.toString(),
          messageId: message._id.toString(),
          senderId: req.user._id.toString(),
          senderName: senderName,
          messagePreview: req.body.body.slice(0, 50)
        },
        senderUserId: req.user._id
      });
      console.log('✅ [MSG] Notification sent to:', recipientId);
    } catch (notificationError) {
      console.log('⚠️  [MSG] Failed to send notification:', notificationError.message);
    }
  }

  res.status(201).json({ status: 'success', data: message });
});

exports.markConversationRead = catchAsync(async (req, res, next) => {
  console.log('👁️  [CONV] Marking conversation as read:', req.params.conversationId);
  const conversation = await Conversation.findById(req.params.conversationId);
  
  if (!conversation) {
    console.log('❌ [CONV] Conversation not found:', req.params.conversationId);
    return next(new AppError('Conversation not found', 404));
  }
  
  if (!conversation.participants.includes(req.user._id)) {
    console.log('❌ [CONV] User not participant of conversation');
    return next(new AppError('Conversation not found', 404));
  }
  
  conversation.unreadCount.set(req.user._id.toString(), 0);
  await conversation.save();
  console.log('👁️  [CONV] Conversation marked as read');
  res.status(200).json({ status: 'success', data: conversation });
});
