const Conversation = require('../../../models/conversation');
const Message = require('../../../models/message');
const catchAsync = require('../../shared/utils/catchAsync');
const AppError = require('../../shared/utils/appError');
const notificationService = require('../notifications/notification.service');

exports.listConversations = catchAsync(async (req, res) => {
  console.log('📥 [CONV] Listing conversations for user:', req.user._id);
  const filter = { participants: req.user._id };
  const conversations = await Conversation.find(filter)
    .sort({ updatedAt: -1 });
  console.log('📥 [CONV] Found', conversations.length, 'conversations');
  console.log('📥 [CONV] Conversations:', JSON.stringify(conversations, null, 2));
  res.status(200).json({ status: 'success', data: conversations });
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
    return res.status(200).json({ 
      status: 'success', 
      data: existingConversation,
      message: 'Existing conversation found'
    });
  }

  console.log('📝 [CONV] Creating new conversation with participants:', participants);
  const conversation = await Conversation.create({
    participants
  });
  console.log('📝 [CONV] Conversation created successfully:', conversation._id);
  console.log('📝 [CONV] Full conversation object:', JSON.stringify(conversation, null, 2));
  res.status(201).json({ status: 'success', data: conversation });
});

exports.listMessages = catchAsync(async (req, res, next) => {
  console.log('📬 [MSG] Getting messages for conversation:', req.params.conversationId);
  const conversation = await Conversation.findById(req.params.conversationId);
  
  if (!conversation) {
    console.log('❌ [MSG] Conversation not found:', req.params.conversationId);
    return next(new AppError('Conversation not found', 404));
  }
  
  if (!conversation.participants.includes(req.user._id)) {
    console.log('❌ [MSG] User not participant of conversation');
    return next(new AppError('Conversation not found', 404));
  }
  
  const messages = await Message.find({ conversation: conversation._id }).sort({ createdAt: 1 });
  console.log('📬 [MSG] Found', messages.length, 'messages');
  console.log('📬 [MSG] Messages:', JSON.stringify(messages, null, 2));
  res.status(200).json({ status: 'success', data: messages });
});

exports.sendMessage = catchAsync(async (req, res, next) => {
  const conversation = await Conversation.findById(req.params.conversationId);
  if (!conversation || !conversation.participants.includes(req.user._id)) {
    return next(new AppError('Conversation not found', 404));
  }
  const message = await Message.create({
    conversation: conversation._id,
    sender: req.user._id,
    body: req.body.body
  });
  conversation.lastMessageSnippet = req.body.body.slice(0, 120);
  conversation.lastMessageAt = new Date();
  conversation.updatedAt = new Date();
  conversation.participants.forEach((participant) => {
    const key = participant.toString();
    const unread = conversation.unreadCounts.get(key) || 0;
    conversation.unreadCounts.set(key, key === req.user._id.toString() ? 0 : unread + 1);
  });
  await conversation.save();

  // Send notification to other participants
  const recipients = conversation.participants.filter(p => p.toString() !== req.user._id.toString());
  
  // Get sender name for notification
  await message.populate('sender', 'firstName lastName email');
  const senderName = message.sender.firstName ? 
    `${message.sender.firstName} ${message.sender.lastName || ''}`.trim() : 
    message.sender.email;

  // Send notification to each recipient
  for (const recipientId of recipients) {
    await notificationService.sendSafeNotification({
      recipient: recipientId,
      type: 'message',
      priority: 'medium',
      title: `New message from ${senderName}`,
      message: req.body.body.slice(0, 100) + (req.body.body.length > 100 ? '...' : ''),
      metadata: {
        conversationId: conversation._id.toString(),
        messageId: message._id.toString(),
        senderId: req.user._id.toString(),
        senderName: senderName,
        messagePreview: req.body.body.slice(0, 50)
      },
      senderUserId: req.user._id
    });
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
  
  conversation.unreadCounts.set(req.user._id.toString(), 0);
  await conversation.save();
  console.log('👁️  [CONV] Conversation marked as read');
  res.status(200).json({ status: 'success', data: conversation });
});
