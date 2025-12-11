const FCMToken = require('../models/fcmToken');
const firebaseNotificationService = require('./firebaseNotificationService');

class MessagingService {
  /**
   * Send message and notify receiver via FCM
   */
  async sendMessage(conversationId, senderId, receiverId, messageData) {
    try {
      // messageData should contain: text, image, file, etc.

      // Get receiver's active FCM tokens
      const receiverTokens = await FCMToken.find({
        userId: receiverId,
        isActive: true,
      }).select('fcmToken');

      if (receiverTokens && receiverTokens.length > 0) {
        const tokens = receiverTokens.map((t) => t.fcmToken);

        // Prepare notification payload
        const title = messageData.senderName || 'New Message';
        const body = messageData.text || 'You received a new message';
        const notificationData = {
          conversationId: conversationId.toString(),
          senderId: senderId.toString(),
          receiverId: receiverId.toString(),
          messageType: 'text_message',
          action: 'open_chat',
        };

        // If there's an image, include image preview info
        if (messageData.image) {
          notificationData.hasImage = 'true';
          notificationData.imageUrl = messageData.image;
        }

        // Send notification to all receiver devices
        if (tokens.length > 1) {
          await firebaseNotificationService.sendToMultipleDevices(
            tokens,
            title,
            body,
            notificationData
          );
        } else {
          await firebaseNotificationService.sendToDevice(
            tokens[0],
            title,
            body,
            notificationData
          );
        }

        console.log(`✅ [MSG] Notification sent to ${tokens.length} device(s)`);
        return { success: true, notificationSent: true, devicesNotified: tokens.length };
      } else {
        console.log('⚠️ [MSG] Receiver has no active FCM tokens');
        return { success: true, notificationSent: false, devicesNotified: 0 };
      }
    } catch (error) {
      console.error('❌ [MSG] Error sending message notification:', error);
      throw error;
    }
  }

  /**
   * Mark message as read and notify sender
   */
  async markMessageAsRead(messageId, readById) {
    try {
      // Get message details
      const Message = require('../src/modules/conversations/message.model');
      const message = await Message.findById(messageId);

      if (!message) {
        throw new Error('Message not found');
      }

      // Update message status
      message.isRead = true;
      message.readAt = new Date();
      await message.save();

      // Notify sender about read receipt (optional)
      const senderTokens = await FCMToken.find({
        userId: message.senderId,
        isActive: true,
      }).select('fcmToken');

      if (senderTokens && senderTokens.length > 0) {
        const tokens = senderTokens.map((t) => t.fcmToken);
        const notificationData = {
          conversationId: message.conversationId.toString(),
          messageId: messageId.toString(),
          messageType: 'read_receipt',
          action: 'message_read',
        };

        await firebaseNotificationService.sendToMultipleDevices(
          tokens,
          'Message Read',
          'Your message has been read',
          notificationData
        );
      }

      return { success: true, message: 'Message marked as read' };
    } catch (error) {
      console.error('❌ [MSG] Error marking message as read:', error);
      throw error;
    }
  }

  /**
   * Send typing indicator via FCM (optional)
   */
  async sendTypingIndicator(conversationId, receiverId, senderId, isTyping) {
    try {
      const receiverTokens = await FCMToken.find({
        userId: receiverId,
        isActive: true,
      }).select('fcmToken');

      if (receiverTokens && receiverTokens.length > 0) {
        const tokens = receiverTokens.map((t) => t.fcmToken);
        const notificationData = {
          conversationId: conversationId.toString(),
          senderId: senderId.toString(),
          messageType: 'typing_indicator',
          isTyping: isTyping ? 'true' : 'false',
        };

        // Silent notification (no alert)
        await firebaseNotificationService.sendToMultipleDevices(
          tokens,
          '',
          '',
          notificationData
        );
      }

      return { success: true };
    } catch (error) {
      console.error('❌ [MSG] Error sending typing indicator:', error);
      // Non-blocking error
      return { success: false };
    }
  }
}

module.exports = new MessagingService();
