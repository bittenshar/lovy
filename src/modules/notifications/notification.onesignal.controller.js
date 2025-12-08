/**
 * OneSignal Push Notification Controller
 * Handles OneSignal-specific push notification endpoints
 */

const catchAsync = require('../../shared/utils/catchAsync');
const AppError = require('../../shared/utils/appError');
const User = require('../users/user.model');
const onesignalService = require('../../shared/services/onesignal.service');
const notificationService = require('./notification.service');

/**
 * Register user device with OneSignal
 */
exports.registerOneSignalId = catchAsync(async (req, res, next) => {
  const { onesignalId, platform = 'unknown', deviceInfo = {} } = req.body;

  if (!onesignalId) {
    return next(new AppError('OneSignal ID is required', 400));
  }

  // Update user with OneSignal ID
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        onesignalId,
        onesignalPlatform: platform,
        onesignalDeviceInfo: deviceInfo,
        onesignalRegisteredAt: new Date()
      }
    },
    { new: true }
  );

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Register user in OneSignal if configured
  if (onesignalService.isReady()) {
    await onesignalService.registerUser(user._id.toString(), {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      userType: user.userType,
      onesignalId,
      platform,
      registeredAt: new Date().toISOString()
    });
  }

  console.log(`📱 OneSignal ID registered for user ${user.email}: ${onesignalId}`);

  res.status(200).json({
    status: 'success',
    message: 'OneSignal ID registered successfully',
    data: {
      userId: user._id,
      onesignalId: user.onesignalId,
      platform: user.onesignalPlatform,
      registeredAt: user.onesignalRegisteredAt
    }
  });
});

/**
 * Unregister OneSignal ID
 */
exports.unregisterOneSignalId = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        onesignalId: 1,
        onesignalPlatform: 1,
        onesignalDeviceInfo: 1,
        onesignalRegisteredAt: 1
      }
    },
    { new: true }
  );

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Delete user from OneSignal if configured
  if (onesignalService.isReady()) {
    await onesignalService.deleteUser(user._id.toString());
  }

  console.log(`📱 OneSignal ID unregistered for user ${user.email}`);

  res.status(200).json({
    status: 'success',
    message: 'OneSignal ID unregistered successfully'
  });
});

/**
 * Send push notification via OneSignal
 * Can target specific users or segments
 */
exports.sendPushNotification = catchAsync(async (req, res, next) => {
  const {
    title,
    message,
    users = [],
    segments = [],
    data = {},
    imageUrl = null,
    priority = 'high',
    ttl = 2419200
  } = req.body;

  if (!title || !message) {
    return next(new AppError('Title and message are required', 400));
  }

  if (users.length === 0 && segments.length === 0) {
    return next(new AppError('Either users or segments must be provided', 400));
  }

  try {
    // Send via OneSignal
    let onesignalResult = { success: false };
    if (onesignalService.isReady()) {
      onesignalResult = await onesignalService.sendNotification({
        title,
        message,
        users,
        segments,
        data,
        largeIcon: imageUrl,
        bigPicture: imageUrl,
        priority: priority === 'high' ? 10 : priority === 'medium' ? 5 : 1
      });
    }

    // Also create notification in DB for all targeted users
    const targetedUsers = users.length > 0 ? users : [];
    if (segments.includes('All') || segments.includes('All')) {
      // If targeting all users, get all user IDs (optional - could be expensive)
      const allUsers = await User.find().select('_id');
      targetedUsers.push(...allUsers.map(u => u._id.toString()));
    }

    // Create DB notifications for each user
    for (const userId of targetedUsers) {
      await notificationService.sendSafeNotification({
        recipient: userId,
        type: 'system',
        priority: priority || 'high',
        title,
        message,
        metadata: data,
        senderUserId: req.user._id
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Push notification sent successfully',
      data: {
        onesignalResult: onesignalResult.success ? onesignalResult.notificationId : null,
        targetedUsers: targetedUsers.length,
        segments
      }
    });
  } catch (error) {
    console.error('Error sending push notification:', error);
    return next(new AppError('Failed to send push notification', 500));
  }
});

/**
 * Send OneSignal notification to all workers
 */
exports.sendToAllWorkers = catchAsync(async (req, res, next) => {
  const { title, message, data = {} } = req.body;

  if (!title || !message) {
    return next(new AppError('Title and message are required', 400));
  }

  try {
    let result = { success: false };
    if (onesignalService.isReady()) {
      result = await onesignalService.sendToSegment('workers', {
        title,
        message,
        data
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Notification sent to all workers',
      data: result
    });
  } catch (error) {
    console.error('Error sending notification to workers:', error);
    return next(new AppError('Failed to send notification', 500));
  }
});

/**
 * Send OneSignal notification to all employers
 */
exports.sendToAllEmployers = catchAsync(async (req, res, next) => {
  const { title, message, data = {} } = req.body;

  if (!title || !message) {
    return next(new AppError('Title and message are required', 400));
  }

  try {
    let result = { success: false };
    if (onesignalService.isReady()) {
      result = await onesignalService.sendToSegment('employers', {
        title,
        message,
        data
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Notification sent to all employers',
      data: result
    });
  } catch (error) {
    console.error('Error sending notification to employers:', error);
    return next(new AppError('Failed to send notification', 500));
  }
});

/**
 * Test OneSignal notification for current user
 */
exports.sendTestPushNotification = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  if (!user || !user.onesignalId) {
    return next(new AppError('User has no OneSignal ID registered', 400));
  }

  try {
    let result = { success: false };
    if (onesignalService.isReady()) {
      result = await onesignalService.sendToUser(user._id.toString(), {
        title: '🧪 Test Notification',
        message: 'This is a test push notification from WorkConnect',
        data: {
          isTest: true,
          sentAt: new Date().toISOString()
        }
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Test notification sent successfully',
      data: result
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
    return next(new AppError('Failed to send test notification', 500));
  }
});

/**
 * Get OneSignal notification status
 */
exports.getNotificationStatus = catchAsync(async (req, res, next) => {
  const { notificationId } = req.params;

  if (!notificationId) {
    return next(new AppError('Notification ID is required', 400));
  }

  try {
    const result = await onesignalService.getNotificationStatus(notificationId);

    if (!result.success) {
      return next(new AppError('Failed to get notification status', 500));
    }

    res.status(200).json({
      status: 'success',
      data: result.data
    });
  } catch (error) {
    console.error('Error getting notification status:', error);
    return next(new AppError('Failed to get notification status', 500));
  }
});

/**
 * Schedule a notification for future delivery
 */
exports.scheduleNotification = catchAsync(async (req, res, next) => {
  const {
    title,
    message,
    scheduledTime,
    users = [],
    segments = [],
    data = {}
  } = req.body;

  if (!title || !message) {
    return next(new AppError('Title and message are required', 400));
  }

  if (!scheduledTime) {
    return next(new AppError('scheduledTime is required', 400));
  }

  if (users.length === 0 && segments.length === 0) {
    return next(new AppError('Either users or segments must be provided', 400));
  }

  try {
    const scheduledDate = new Date(scheduledTime);
    if (scheduledDate < new Date()) {
      return next(new AppError('Scheduled time must be in the future', 400));
    }

    let result = { success: false };
    if (onesignalService.isReady()) {
      result = await onesignalService.scheduleNotification({
        title,
        message,
        users,
        segments,
        data,
        scheduledTime: scheduledDate
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Notification scheduled successfully',
      data: result
    });
  } catch (error) {
    console.error('Error scheduling notification:', error);
    return next(new AppError('Failed to schedule notification', 500));
  }
});

/**
 * Get user's OneSignal status
 */
exports.getUserOneSignalStatus = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      userId: user._id,
      onesignalId: user.onesignalId || null,
      platform: user.onesignalPlatform || null,
      registered: !!user.onesignalId,
      registeredAt: user.onesignalRegisteredAt || null,
      deviceInfo: user.onesignalDeviceInfo || {}
    }
  });
});
