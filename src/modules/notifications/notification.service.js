const mongoose = require('mongoose');
const Notification = require('./notification.model');
const AppError = require('../../shared/utils/appError');
const firebaseService = require('../../services/firebase-notification.service');
const User = require('../users/user.model');

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

  // Send Firebase push notification asynchronously (non-blocking)
  setImmediate(async () => {
    try {
      // Get user and check if they have FCM token
      const recipientUser = await User.findById(targetId);
      
      if (!recipientUser) {
        console.log(`❌ User ${targetId} not found in database`);
        return;
      }
      
      if (!recipientUser.fcmToken) {
        console.log(`ℹ️ User ${targetId} has no FCM token, notification saved to database only`);
        return;
      }
      
      const fcmToken = recipientUser.fcmToken.trim();
      console.log(`📱 Found FCM token for user ${targetId}:`);
      console.log(`   Token length: ${fcmToken.length}`);
      console.log(`   Has colon: ${fcmToken.includes(':')}`);
      console.log(`   Has underscore: ${fcmToken.includes('_')}`);
      console.log(`   Token start: ${fcmToken.substring(0, 50)}...`);
      
      // Validate FCM token format (should be long string with : or _ separators)
      const isValidFCMToken = fcmToken.length > 100 && 
                              (fcmToken.includes(':') || fcmToken.includes('_'));
      
      // Skip Firebase push for test/mock tokens
      if (fcmToken.startsWith('mock_') || 
          fcmToken.startsWith('test_') ||
          !isValidFCMToken) {
        console.log(`ℹ️ Skipping invalid/test token for user ${targetId}`);
        console.log(`   Reason: ${!isValidFCMToken ? 'Invalid format' : 'Test token'}`);
        console.log(`   Token format: ${fcmToken.substring(0, 50)}...`);
        console.log(`   Token length: ${fcmToken.length}`);
        return;
      }

      // Serialize metadata safely - convert all values to strings
      const safeMetadata = {};
      if (metadata && typeof metadata === 'object') {
        Object.keys(metadata).forEach(key => {
          const value = metadata[key];
          if (value === null || value === undefined) {
            safeMetadata[key] = '';
          } else if (typeof value === 'object') {
            safeMetadata[key] = JSON.stringify(value);
          } else {
            safeMetadata[key] = String(value);
          }
        });
      }

      // Log token details for debugging
      console.log(`📤 Attempting to send FCM notification to user ${targetId}`);
      console.log(`   Token preview: ${fcmToken.substring(0, 50)}...${fcmToken.substring(fcmToken.length - 20)}`);

      // Send push notification via Firebase
      try {
        await firebaseService.sendToDevice(fcmToken, {
          title: payload.title,
          body: payload.message,
          data: {
            type: String(payload.type),
            priority: String(payload.priority),
            notificationId: notification._id.toString(),
            actionUrl: String(actionUrl || ''),
            metadata: JSON.stringify(safeMetadata)
          }
        });
        
        console.log(`✅ FCM push notification sent to user ${targetId}: ${payload.title}`);
      } catch (firebaseError) {
        console.error(`❌ Firebase error for user ${targetId}:`);
        console.error(`   Error: ${firebaseError.message}`);
        console.error(`   Code: ${firebaseError.code}`);
        
        // If token is invalid, clear it from user so we don't keep trying
        if (firebaseError.message.includes('Requested entity was not found') ||
            firebaseError.message.includes('Invalid registration token') ||
            firebaseError.code === 'messaging/invalid-registration-token') {
          console.warn(`⚠️ Clearing invalid FCM token for user ${targetId}`);
          await User.findByIdAndUpdate(targetId, {
            $unset: { fcmToken: 1, platform: 1, fcmTokenUpdatedAt: 1 }
          });
        }
        // Don't re-throw - notification is already successfully stored in DB
      }
    } catch (error) {
      console.error(`❌ Unexpected error in notification async handler:`, error.message);
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
 * Send push notification to multiple users via Firebase
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

    const fcmTokens = users.map(user => user.fcmToken);

    // Serialize data safely - all Firebase data fields must be strings
    const safeData = {
      type: String(options.data?.type || 'notification'),
      priority: String(options.data?.priority || 'medium'),
      notificationId: String(options.notificationId || ''),
      actionUrl: String(options.data?.actionUrl || '')
    };

    // Safely serialize metadata
    if (options.data?.metadata) {
      try {
        safeData.metadata = typeof options.data.metadata === 'string' 
          ? options.data.metadata 
          : JSON.stringify(options.data.metadata);
      } catch (err) {
        safeData.metadata = '{}';
      }
    } else {
      safeData.metadata = '{}';
    }

    // Send push notifications to all users via Firebase
    await firebaseService.sendToDevices(fcmTokens, {
      title: options.title || 'Notification',
      body: options.message || 'You have a new notification',
      data: safeData
    });
    
    console.log(`✅ FCM push notifications sent to ${users.length} users`);
  } catch (error) {
    console.error('Failed to send bulk FCM push notifications:', error.message);
  }
};

module.exports = {
  createNotification,
  sendSafeNotification,
  sendBulkPushNotification
};
