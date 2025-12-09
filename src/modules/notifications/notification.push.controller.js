/**
 * Notification Push Controller
 * Handles FCM token registration and push notification endpoints
 */

const User = require('../users/user.model');
const AppError = require('../../shared/utils/appError');
const { sendNotificationToUser } = require('../../services/fcm-helper.service');

/**
 * Register or update FCM token for a user
 * POST /api/notifications/register-fcm-token
 * Body: { fcmToken, platform }
 */
exports.registerFcmToken = async (req, res, next) => {
  try {
    const { fcmToken, platform } = req.body;
    const userId = req.user._id;

    // Validation
    if (!fcmToken || typeof fcmToken !== 'string') {
      return next(new AppError('FCM token is required', 400));
    }

    if (!platform || !['android', 'ios', 'web'].includes(platform)) {
      return next(new AppError('Platform must be android, ios, or web', 400));
    }

    // Update user FCM token
    const user = await User.findByIdAndUpdate(
      userId,
      {
        fcmToken: fcmToken.trim(),
        platform,
        fcmTokenUpdatedAt: new Date(),
      },
      { new: true }
    ).select('_id email fcmToken platform');

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    console.log(`✅ FCM token registered for user ${userId} (${platform})`);

    res.status(200).json({
      success: true,
      message: 'FCM token registered successfully',
      data: {
        userId: user._id,
        email: user.email,
        platform: user.platform,
        tokenRegisteredAt: user.fcmTokenUpdatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Test endpoint - send test notification to authenticated user
 * POST /api/notifications/test-send
 */
exports.testSendNotification = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { title, body, data } = req.body;

    // Validation
    if (!title || !body) {
      return next(new AppError('Title and body are required', 400));
    }

    // Send test notification
    const result = await sendNotificationToUser(
      userId,
      title || 'Test Notification',
      body || 'This is a test push notification from your backend',
      data || { screen: 'home', test: 'true' }
    );

    if (result.skipped) {
      return res.status(503).json({
        success: false,
        message: 'Firebase not initialized - push notifications disabled',
      });
    }

    if (result.noToken) {
      return res.status(400).json({
        success: false,
        message: 'No FCM token registered for this user',
        hint: 'Call /api/notifications/register-fcm-token first',
      });
    }

    res.status(200).json({
      success: result.successCount > 0,
      message: `Notification sent: ${result.successCount} success, ${result.failureCount} failed`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user's FCM token info
 * GET /api/notifications/fcm-token
 */
exports.getFcmTokenInfo = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select('fcmToken platform fcmTokenUpdatedAt');

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    res.status(200).json({
      success: true,
      data: {
        userId: user._id,
        hasToken: !!user.fcmToken,
        platform: user.platform || 'unknown',
        tokenRegisteredAt: user.fcmTokenUpdatedAt || null,
        tokenLength: user.fcmToken ? user.fcmToken.length : 0,
      },
    });
  } catch (error) {
    next(error);
  }
};
