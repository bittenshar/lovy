/**
 * Conversation FCM Notification Utility
 * Handles all FCM notifications for conversation features
 */

const notificationUtils = require('../notification/notification.utils');

/**
 * Send new message notification to conversation participant
 * @param {string} recipientId - User ID of recipient
 * @param {string} senderName - Display name of sender
 * @param {string} messagePreview - First 50 chars of message
 * @param {string} conversationId - Conversation ID
 * @param {string} messageId - Message ID
 * @param {string} messageFull - Full message text (up to 150 chars)
 * @returns {Promise<object>} - Result with sent count
 */
exports.notifyNewMessage = async (recipientId, senderName, messagePreview, conversationId, messageId, messageFull) => {
  try {
    console.error('\n📱 [CONV-FCM] ===== NOTIFY NEW MESSAGE =====');
    console.error(`📱 [CONV-FCM] Recipient: ${recipientId}`);
    console.error(`📱 [CONV-FCM] Sender: ${senderName}`);
    console.error(`📱 [CONV-FCM] Preview: ${messagePreview}`);
    
    const result = await notificationUtils.sendTemplatedNotification(
      recipientId.toString(),
      "messageReceived",
      [senderName, messagePreview],
      {
        data: {
          type: "new_message",
          action: "open_conversation",
          conversationId: conversationId.toString(),
          messageId: messageId.toString(),
          senderId: recipientId.toString(),
          senderName: senderName,
          messagePreview: messagePreview,
          messageFull: messageFull,
          timestamp: new Date().toISOString()
        }
      }
    );
    
    console.error(`📱 [CONV-FCM] Result - Success: ${result.success}, Sent: ${result.sent}, Failed: ${result.failed}`);
    console.error('📱 [CONV-FCM] ===== NOTIFY NEW MESSAGE END =====\n');
    
    return result;
  } catch (error) {
    console.error('❌ [CONV-FCM] Error notifying new message:', error.message);
    console.error('❌ [CONV-FCM] Stack:', error.stack);
    return {
      success: false,
      error: error.message,
      sent: 0,
      failed: 1
    };
  }
};

/**
 * Send conversation started notification to other participants
 * @param {string} recipientId - User ID of recipient
 * @param {string} initiatorName - Display name of conversation initiator
 * @param {string} conversationId - Conversation ID
 * @returns {Promise<object>} - Result with sent count
 */
exports.notifyConversationStarted = async (recipientId, initiatorName, conversationId) => {
  try {
    console.error('\n📱 [CONV-FCM] ===== CONVERSATION STARTED =====');
    console.error(`📱 [CONV-FCM] Recipient: ${recipientId}`);
    console.error(`📱 [CONV-FCM] Initiator: ${initiatorName}`);
    console.error(`📱 [CONV-FCM] Conversation: ${conversationId}`);
    
    const result = await notificationUtils.sendTemplatedNotification(
      recipientId.toString(),
      "conversationStarted",
      [initiatorName],
      {
        data: {
          type: "conversation_started",
          action: "open_conversation",
          conversationId: conversationId.toString(),
          initiatorName: initiatorName
        }
      }
    );
    
    console.error(`📱 [CONV-FCM] Result - Sent: ${result.sent}, Failed: ${result.failed}`);
    console.error('📱 [CONV-FCM] ===== CONVERSATION STARTED END =====\n');
    
    return result;
  } catch (error) {
    console.error('❌ [CONV-FCM] Error notifying conversation started:', error.message);
    return {
      success: false,
      error: error.message,
      sent: 0,
      failed: 1
    };
  }
};

/**
 * Notify multiple recipients of new message
 * @param {array} recipientIds - Array of recipient User IDs
 * @param {string} senderName - Display name of sender
 * @param {string} messagePreview - First 50 chars of message
 * @param {string} conversationId - Conversation ID
 * @param {string} messageId - Message ID
 * @param {string} messageFull - Full message text
 * @returns {Promise<array>} - Array of results
 */
exports.notifyMultipleNewMessages = async (recipientIds, senderName, messagePreview, conversationId, messageId, messageFull) => {
  console.error('\n📱 [CONV-FCM] ===== BATCH NOTIFY MESSAGES =====');
  console.error(`📱 [CONV-FCM] Recipients: ${recipientIds.length}`);
  
  const results = [];
  
  for (const recipientId of recipientIds) {
    try {
      const result = await exports.notifyNewMessage(
        recipientId,
        senderName,
        messagePreview,
        conversationId,
        messageId,
        messageFull
      );
      results.push({ recipientId: recipientId.toString(), ...result });
    } catch (error) {
      console.error(`❌ [CONV-FCM] Failed to notify ${recipientId}:`, error.message);
      results.push({
        recipientId: recipientId.toString(),
        success: false,
        error: error.message,
        sent: 0,
        failed: 1
      });
    }
  }
  
  console.error(`📱 [CONV-FCM] Batch complete. Total sent: ${results.reduce((sum, r) => sum + (r.sent || 0), 0)}`);
  console.error('📱 [CONV-FCM] ===== BATCH NOTIFY MESSAGES END =====\n');
  
  return results;
};

module.exports = exports;
