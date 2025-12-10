const express = require('express');
const router = express.Router();
const { protect: protectAuth } = require('../../shared/middlewares/auth.middleware');
const Message = require('../../../models/message');
const Conversation = require('../../../models/conversation');
const FCMToken = require('../../../models/fcmToken');
const firebaseNotificationService = require('../../../services/firebaseNotificationService');
const User = require('../users/user.model');

/**
 * Send a new message
 */
router.post('/send', protectAuth, async (req, res) => {
  try {
    const { conversationId, receiverId, text, image, file } = req.body;
    const senderId = req.user._id || req.user.id;

    // Validation with helpful error messages
    if (!conversationId) {
      return res.status(400).json({
        success: false,
        message: 'conversationId is required',
      });
    }
    
    if (!receiverId || receiverId.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'receiverId is required and cannot be empty',
      });
    }
    
    if (!text || text.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Message text is required',
      });
    }

    console.log('📨 [MSG] Sending message:', {
      conversationId,
      senderId,
      receiverId,
      textLength: text.length,
    });

    // Get sender details
    const sender = await User.findById(senderId).select('firstName lastName image');
    if (!sender) {
      return res.status(404).json({
        success: false,
        message: 'Sender not found',
      });
    }

    // Create message
    const message = new Message({
      conversationId,
      senderId,
      senderName: `${sender.firstName} ${sender.lastName}`,
      senderImage: sender.image,
      receiverId,
      text,
      image,
      file,
    });

    await message.save();

    // Update conversation
    await Conversation.findByIdAndUpdate(
      conversationId,
      {
        lastMessage: message._id,
        lastMessageText: text,
        lastMessageSenderId: senderId,
        lastMessageTime: new Date(),
      },
      { new: true }
    );

    // Send FCM notification to receiver
    try {
      console.log('📱 [MSG] Sending FCM notification to receiver:', receiverId);

      // Get receiver's active FCM tokens (from both User model and FCMToken collection)
      let receiverTokens = await FCMToken.find({
        userId: receiverId,
        isActive: true,
      }).select('fcmToken');

      // Also check User model for fcmToken field
      const receiverUser = await User.findById(receiverId).select('fcmToken');
      if (receiverUser?.fcmToken && !receiverTokens.find(t => t.fcmToken === receiverUser.fcmToken)) {
        receiverTokens.push({ fcmToken: receiverUser.fcmToken });
      }

      if (receiverTokens.length > 0) {
        const fcmTokens = receiverTokens.map((t) => t.fcmToken);
        const notificationTitle = `${sender.firstName} sent a message`;
        const notificationBody = text.substring(0, 100); // First 100 chars

        const notificationData = {
          screen: 'messages',
          conversationId: conversationId.toString(),
          messageId: message._id.toString(),
          senderId: senderId.toString(),
          type: 'new_message',
          senderName: sender.firstName,
        };

        try {
          const result = await firebaseNotificationService.sendToMultipleDevices(
            fcmTokens,
            notificationTitle,
            notificationBody,
            notificationData
          );

          // Mark notification as sent
          await Message.findByIdAndUpdate(message._id, {
            notificationSent: true,
            notificationSentAt: new Date(),
          });

          console.log('✅ [MSG] FCM notification sent to', result.successCount, 'device(s)');
        } catch (sendError) {
          console.warn('⚠️ [MSG] FCM notification send failed (non-blocking):', sendError.message);
          // Mark as attempted even if some failed
          await Message.findByIdAndUpdate(message._id, {
            notificationSent: false,
            notificationError: sendError.message,
            notificationSentAt: new Date(),
          }).catch(err => console.warn('⚠️ Could not update message:', err.message));
        }
      } else {
        console.log('⚠️ [MSG] No active FCM tokens found for receiver');
      }
    } catch (fcmError) {
      console.warn('⚠️ [MSG] FCM notification failed (non-blocking):', fcmError.message);
      // Don't fail the request if FCM fails
    }

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: {
        _id: message._id,
        text: message.text,
        createdAt: message.createdAt,
        sender: {
          _id: senderId,
          name: sender.firstName,
          image: sender.image,
        },
      },
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending message',
      error: error.message,
    });
  }
});

/**
 * Get conversation messages
 */
router.get('/conversation/:conversationId', protectAuth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id || req.user.id;
    const { page = 1, limit = 20 } = req.query;

    const skip = (page - 1) * limit;

    // Get messages (excluding deleted for this user)
    const messages = await Message.find({
      conversationId,
      deletedFor: { $ne: userId },
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('_id senderId senderName senderImage text image file isRead createdAt');

    // Mark all messages as read
    await Message.updateMany(
      {
        conversationId,
        receiverId: userId,
        isRead: false,
      },
      {
        isRead: true,
        readAt: new Date(),
      }
    );

    res.status(200).json({
      success: true,
      data: messages.reverse(),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: await Message.countDocuments({ conversationId }),
      },
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching messages',
      error: error.message,
    });
  }
});

/**
 * Get all conversations for user
 */
router.get('/conversations', protectAuth, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { page = 1, limit = 20 } = req.query;

    const skip = (page - 1) * limit;

    const conversations = await Conversation.find({
      participants: userId,
      isActive: true,
    })
      .populate('participants', 'firstName lastName image email')
      .populate('lastMessage')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Format conversation data
    const formattedConversations = conversations.map((conv) => {
      const otherUser = conv.participants.find((p) => p._id.toString() !== userId);
      return {
        _id: conv._id,
        otherUser,
        lastMessage: conv.lastMessage,
        lastMessageText: conv.lastMessageText,
        unreadCount: conv.unreadCount?.get(userId) || 0,
        updatedAt: conv.updatedAt,
      };
    });

    res.status(200).json({
      success: true,
      data: formattedConversations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: await Conversation.countDocuments({
          participants: userId,
          isActive: true,
        }),
      },
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching conversations',
      error: error.message,
    });
  }
});

/**
 * Start or get conversation with user
 */
router.post('/start-conversation', protectAuth, async (req, res) => {
  try {
    const { recipientId } = req.body;
    const userId = req.user._id || req.user.id;

    if (!recipientId) {
      return res.status(400).json({
        success: false,
        message: 'recipientId is required',
      });
    }

    if (userId.toString() === recipientId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot start conversation with yourself',
      });
    }

    // Check if conversation exists
    let conversation = await Conversation.findOne({
      participants: { $all: [userId, recipientId] },
    }).populate('participants', 'firstName lastName image email');

    if (!conversation) {
      // Create new conversation
      conversation = new Conversation({
        participants: [userId, recipientId],
      });
      await conversation.save();
      await conversation.populate('participants', 'firstName lastName image email');
    }

    const otherUser = conversation.participants.find((p) => p._id.toString() !== userId.toString());

    res.status(200).json({
      success: true,
      message: conversation._id ? 'Conversation retrieved' : 'Conversation created',
      data: {
        conversationId: conversation._id,
        otherUser,
      },
    });
  } catch (error) {
    console.error('Error starting conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Error starting conversation',
      error: error.message,
    });
  }
});

/**
 * Delete message (soft delete)
 */
router.delete('/:messageId', protectAuth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id || req.user.id;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
      });
    }

    // Add user to deletedFor array
    if (!message.deletedFor.includes(userId)) {
      message.deletedFor.push(userId);
      await message.save();
    }

    res.status(200).json({
      success: true,
      message: 'Message deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting message',
      error: error.message,
    });
  }
});

/**
 * Mark message as read
 */
router.put('/:messageId/read', protectAuth, async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findByIdAndUpdate(
      messageId,
      {
        isRead: true,
        readAt: new Date(),
      },
      { new: true }
    );

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Message marked as read',
      data: message,
    });
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking message as read',
      error: error.message,
    });
  }
});

/**
 * Search messages
 */
router.get('/search', protectAuth, async (req, res) => {
  try {
    const { query, conversationId } = req.query;
    const userId = req.user._id || req.user.id;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required',
      });
    }

    let searchFilter = {
      $text: { $search: query },
      deletedFor: { $ne: userId },
    };

    if (conversationId) {
      searchFilter.conversationId = conversationId;
    }

    const messages = await Message.find(searchFilter)
      .limit(20)
      .select('_id senderId senderName text conversationId createdAt');

    res.status(200).json({
      success: true,
      data: messages,
    });
  } catch (error) {
    console.error('Error searching messages:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching messages',
      error: error.message,
    });
  }
});

module.exports = router;
