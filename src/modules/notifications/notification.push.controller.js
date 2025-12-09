const catchAsync = require('../../shared/utils/catchAsync');
const AppError = require('../../shared/utils/appError');
const User = require('../users/user.model');

exports.registerFCMToken = catchAsync(async (req, res, next) => {
  const { fcmToken, platform } = req.body;

  if (!fcmToken) {
    return next(new AppError('FCM token is required', 400));
  }

  const trimmedToken = fcmToken.trim();
  
  // Validate FCM token format
  if (trimmedToken.length < 100) {
    console.warn(`⚠️ WARNING: Received unusually short FCM token (${trimmedToken.length} chars)`);
    console.warn(`   Token: ${trimmedToken.substring(0, 50)}...`);
    return next(new AppError('Invalid FCM token format - token too short', 400));
  }

  if (!trimmedToken.includes(':') && !trimmedToken.includes('_')) {
    console.warn(`⚠️ WARNING: FCM token missing expected separators (: or _)`);
    return next(new AppError('Invalid FCM token format', 400));
  }

  // Update user's FCM token
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        fcmToken: trimmedToken,
        platform: platform || 'unknown',
        fcmTokenUpdatedAt: new Date()
      }
    },
    { new: true }
  );

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  console.log(`📱 FCM token registered for user ${user.email}`);
  console.log(`   Token length: ${trimmedToken.length}`);
  console.log(`   Token preview: ${trimmedToken.substring(0, 50)}...${trimmedToken.substring(trimmedToken.length - 20)}`);
  console.log(`   Platform: ${platform || 'unknown'}`);

  res.status(200).json({
    status: 'success',
    message: 'FCM token registered successfully',
    data: {
      userId: user._id,
      fcmToken: user.fcmToken,
      platform: user.platform,
      tokenLength: trimmedToken.length,
      tokenPreview: `${trimmedToken.substring(0, 20)}...${trimmedToken.substring(trimmedToken.length - 20)}`
    }
  });
});

exports.unregisterFCMToken = catchAsync(async (req, res, next) => {
  // Remove user's FCM token
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        fcmToken: 1,
        platform: 1,
        fcmTokenUpdatedAt: 1
      }
    },
    { new: true }
  );

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  console.log(`📱 FCM token unregistered for user ${user.email}`);

  res.status(200).json({
    status: 'success',
    message: 'FCM token unregistered successfully'
  });
});

exports.sendTestNotification = catchAsync(async (req, res, next) => {
  const notificationService = require('./notification.service');
  
  const { title, message, type = 'system', priority = 'low' } = req.body;

  if (!title || !message) {
    return next(new AppError('Title and message are required', 400));
  }

  try {
    // Send notification to the current user
    const notification = await notificationService.sendSafeNotification({
      recipientId: req.user._id,
      type,
      priority,
      title,
      message,
      metadata: {
        isTest: true,
        sentAt: new Date().toISOString()
      }
    });

    res.status(200).json({
      status: 'success',
      message: 'Test notification sent successfully',
      data: notification
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
    return next(new AppError('Failed to send test notification: ' + error.message, 500));
  }
});