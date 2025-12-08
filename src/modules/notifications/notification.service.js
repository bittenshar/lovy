const mongoose = require('mongoose');
const Notification = require('./notification.model');
const AppError = require('../../shared/utils/appError');
const User = require('../users/user.model');
const firebaseService = require('../../services/firebase-notification.service');

const PRIORITIES = new Set(['low', 'medium', 'high']);

const normalizeObjectId = (value) => {
  if (!value) {
    return undefined;
  }
  if (value instanceof mongoose.Types.ObjectId) {
    return value;
  }
  if (typeof value === 'string' && mongoose.Types.ObjectId.isValid(value)) {
    return new mongoose.Types.ObjectId(value);
  }
  return undefined;
};

const ensurePriority = (priority) => {
  if (!priority || typeof priority !== 'string') {
    return 'low';
  }
  const normalized = priority.toLowerCase();
  return PRIORITIES.has(normalized) ? normalized : 'low';
};

const ensureMessage = (message, body) => {
  if (typeof message === 'string' && message.trim()) {
    return message.trim();
  }
  if (typeof body === 'string' && body.trim()) {
    return body.trim();
  }
  return null;
};

const ensureMetadata = (metadata) => {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return {};
  }
  return metadata;
};

const createNotification = async ({
  recipient,
  recipientId,
  user,
  userId,
  type,
  priority,
  title,
  message,
  body,
  actionUrl,
  metadata,
  sender,
  senderId,
  senderUserId
} = {}) => {
  const targetId =
    normalizeObjectId(recipient) ||
    normalizeObjectId(recipientId) ||
    normalizeObjectId(user) ||
    normalizeObjectId(userId);

  if (!targetId) {
    throw new AppError('Recipient user is required to create a notification', 400);
  }

  const resolvedMessage = ensureMessage(message, body);
  if (!resolvedMessage) {
    throw new AppError('Notification message is required', 400);
  }

  if (!title || !String(title).trim()) {
    throw new AppError('Notification title is required', 400);
  }

  const payload = {
    user: targetId,
    sender:
      normalizeObjectId(sender) ||
      normalizeObjectId(senderId) ||
      normalizeObjectId(senderUserId) ||
      null,
    type: type || 'system',
    priority: ensurePriority(priority),
    title: String(title).trim(),
    message: resolvedMessage,
    metadata: ensureMetadata(metadata)
  };

  if (actionUrl) {
    payload.actionUrl = actionUrl;
  }

  // Create notification in database
  const notification = await Notification.create(payload);

  // Send Firebase Cloud Messaging push notification asynchronously (non-blocking)
  setImmediate(async () => {
    try {
      // Get user and their FCM token
      const recipientUser = await User.findById(targetId);
      
      if (recipientUser && recipientUser.fcmToken) {
        // Send FCM push notification to the specific user
        await firebaseService.sendToDevice(recipientUser.fcmToken, {
          title: payload.title,
          body: payload.message,
          data: {
            type: payload.type,
            priority: payload.priority,
            notificationId: notification._id.toString(),
            actionUrl: actionUrl?.toString() || '',
            metadata: JSON.stringify(metadata || {})
          }
        });
        
        console.log(`✅ Firebase push notification sent to user ${targetId}: ${payload.title}`);
      } else {
        console.log(`ℹ️ User ${targetId} has no FCM token registered, skipping push notification`);
      }
    } catch (error) {
      console.error(`❌ Failed to send Firebase push notification for user ${targetId}:`, error.message);
      // Don't throw error - notification in DB is created successfully
    }
  });

  return notification;
};

const sendSafeNotification = async (payload = {}) => {
  try {
    return await createNotification(payload);
  } catch (error) {
    console.error('Failed to create notification', {
      message: error.message,
      type: payload.type,
      recipient: payload.recipient || payload.user || payload.userId || payload.recipientId
    });
    return null;
  }
};

/**
 * Send push notification to multiple users with Firebase
 * @param {Array} userIds - Array of user IDs
 * @param {Object} options - Notification options {title, message, data, etc}
 */
const sendBulkPushNotification = async (userIds = [], options = {}) => {
  if (!Array.isArray(userIds) || userIds.length === 0) {
    console.warn('No user IDs provided for bulk push notification');
    return;
  }

  try {
    // Get all users with FCM tokens
    const users = await User.find({ _id: { $in: userIds }, fcmToken: { $exists: true, $ne: null } });
    
    if (users.length === 0) {
      console.log('No users with FCM tokens found');
      return;
    }

    // Extract FCM tokens
    const fcmTokens = users.map(user => user.fcmToken).filter(token => token);

    // Send push notifications via Firebase
    if (fcmTokens.length > 0) {
      // Convert all data values to strings for Firebase
      const firebaseData = {
        type: (options.type || 'system').toString(),
        priority: (options.priority || 'medium').toString(),
        notificationId: options.notificationId?.toString() || '',
        actionUrl: (options.actionUrl || '').toString()
      };
      
      // Add additional data fields as strings
      if (options.data) {
        Object.keys(options.data).forEach(key => {
          const value = options.data[key];
          if (value !== null && value !== undefined) {
            firebaseData[key] = typeof value === 'object' ? JSON.stringify(value) : value.toString();
          }
        });
      }

      await firebaseService.sendToDevices(fcmTokens, {
        title: options.title || 'Notification',
        body: options.message || 'You have a new notification',
        data: firebaseData
      });
      
      console.log(`✅ Firebase push notifications sent to ${fcmTokens.length} devices`);
    }
  } catch (error) {
    console.error('Failed to send bulk Firebase push notifications:', error.message);
  }
};

module.exports = {
  createNotification,
  sendSafeNotification,
  sendBulkPushNotification
};
