/**
 * 🔥 Notification Controller with Complete Debug Logging
 * 
 * Handles all FCM notification-related HTTP endpoints
 * Includes comprehensive logging at every step
 */

const catchAsync = require('../../utils/catchAsync');
const AppError = require('../../utils/appError');
const User = require('../../models/User');
const firebaseService = require('../../services/firebase-notification-debug.service');

/**
 * POST /api/notifications/register-token
 * 
 * Receives FCM token from Flutter app and stores in database
 * Debug: Logs token validation, database update, and success
 */
exports.registerFCMToken = catchAsync(async (req, res, next) => {
  console.log('\n' + '='.repeat(70));
  console.log('📝 [REGISTER TOKEN ENDPOINT] Incoming request');
  console.log('='.repeat(70));

  const { fcmToken, userId, platform } = req.body;

  // ===== REQUEST VALIDATION =====
  console.log('\n📋 [REQUEST] Request Details:');
  console.log('   - Method: POST');
  console.log('   - Endpoint: /api/notifications/register-token');
  console.log('   - Auth: ' + (req.headers.authorization ? '✅ Present' : '❌ Missing'));
  console.log('   - Content-Type: ' + req.headers['content-type']);

  console.log('\n📊 [BODY] Request Body:');
  console.log('   - fcmToken: ' + (fcmToken ? '✅ Present (' + fcmToken.length + ' chars)' : '❌ Missing'));
  console.log('   - userId: ' + (userId ? '✅ Present' : '❌ Missing'));
  console.log('   - platform: ' + (platform ? '✅ ' + platform : '⚠️  Missing (defaulting to "android")'));

  // ===== INPUT VALIDATION =====
  console.log('\n🔍 [VALIDATE] Validating inputs');

  if (!fcmToken) {
    console.error('❌ [VALIDATE] fcmToken is required');
    return next(new AppError('fcmToken is required', 400));
  }

  if (!userId) {
    console.error('❌ [VALIDATE] userId is required');
    return next(new AppError('userId is required', 400));
  }

  // ===== TOKEN FORMAT VALIDATION =====
  console.log('\n🎟️  [TOKEN] Token Format Validation:');
  console.log('   - Length: ' + fcmToken.length + ' chars');
  console.log('   - Has colon (:): ' + (fcmToken.includes(':') ? '✅ Yes' : '❌ No'));
  console.log('   - Has underscore (_): ' + (fcmToken.includes('_') ? '✅ Yes' : '❌ No'));
  console.log('   - Has hyphen (-): ' + (fcmToken.includes('-') ? '✅ Yes' : '❌ No'));
  console.log('   - Preview: ' + fcmToken.substring(0, 50) + '...');

  if (fcmToken.length < 100) {
    console.warn('⚠️  [TOKEN] Token is short (' + fcmToken.length + ' chars)');
    console.warn('   Real FCM tokens are usually 150+ characters');
    console.warn('   This might be a test token or malformed token');
  }

  const hasValidFormat = fcmToken.includes(':') || fcmToken.includes('_');
  if (!hasValidFormat) {
    console.error('❌ [TOKEN] Token missing separators (: or _)');
    return next(new AppError('Invalid FCM token format', 400));
  }

  console.log('✅ [TOKEN] Token format validation passed');

  // ===== DATABASE LOOKUP =====
  console.log('\n🔍 [DATABASE] Looking up user');
  console.log('   Query: User.findById("' + userId + '")');

  try {
    const user = await User.findById(userId);

    if (!user) {
      console.error('❌ [DATABASE] User not found');
      console.error('   User ID: ' + userId);
      return next(new AppError('User not found', 404));
    }

    console.log('✅ [DATABASE] User found');
    console.log('   - ID: ' + user._id);
    console.log('   - Email: ' + user.email);
    console.log('   - Name: ' + (user.name || 'N/A'));
    console.log('   - Current FCM Token: ' + (user.fcmToken ? user.fcmToken.substring(0, 30) + '...' : 'None'));

  } catch (error) {
    console.error('❌ [DATABASE] Query error');
    console.error('   Error: ' + error.message);
    return next(error);
  }

  // ===== TOKEN UPDATE =====
  console.log('\n💾 [UPDATE] Updating user FCM token');
  console.log('   - Setting fcmToken to: ' + fcmToken.substring(0, 30) + '...');
  console.log('   - Setting platform to: ' + (platform || 'android'));
  console.log('   - Updating timestamp');

  try {
    user.fcmToken = fcmToken;
    user.platform = platform || 'android';
    user.fcmTokenUpdatedAt = new Date();

    console.log('   Calling user.save()...');
    await user.save();

    console.log('✅ [UPDATE] User saved successfully');
    console.log('   - Token saved: ✅ Yes');
    console.log('   - Platform saved: ✅ ' + user.platform);
    console.log('   - Timestamp: ' + user.fcmTokenUpdatedAt.toISOString());

  } catch (error) {
    console.error('❌ [UPDATE] Save failed');
    console.error('   Error: ' + error.message);
    return next(error);
  }

  // ===== SUCCESS RESPONSE =====
  console.log('\n' + '='.repeat(70));
  console.log('✅ [SUCCESS] Token registered successfully');
  console.log('='.repeat(70) + '\n');

  res.status(200).json({
    status: 'success',
    message: 'FCM token registered successfully',
    data: {
      userId: user._id,
      email: user.email,
      fcmToken: fcmToken.substring(0, 50) + '...',
      tokenLength: fcmToken.length,
      platform: user.platform,
      registeredAt: user.fcmTokenUpdatedAt,
    },
  });
});

/**
 * DELETE /api/notifications/token
 * 
 * Removes FCM token when user logs out
 */
exports.deleteFCMToken = catchAsync(async (req, res, next) => {
  console.log('\n' + '='.repeat(70));
  console.log('🗑️  [DELETE TOKEN] User logging out, removing FCM token');
  console.log('='.repeat(70));

  const { userId } = req.body;

  console.log('📊 [REQUEST] User ID: ' + userId);

  try {
    console.log('🔍 [DATABASE] Looking up user');
    const user = await User.findById(userId);

    if (!user) {
      console.error('❌ [DATABASE] User not found: ' + userId);
      return next(new AppError('User not found', 404));
    }

    console.log('✅ [DATABASE] User found: ' + user.email);

    if (!user.fcmToken) {
      console.log('ℹ️  [TOKEN] User already has no token stored');
    } else {
      console.log('🧹 [TOKEN] Clearing token: ' + user.fcmToken.substring(0, 30) + '...');
    }

    user.fcmToken = null;
    user.platform = null;
    await user.save();

    console.log('✅ [DELETE] Token deleted successfully');

    res.status(200).json({
      status: 'success',
      message: 'FCM token deleted successfully',
    });

  } catch (error) {
    console.error('❌ [DELETE] Error: ' + error.message);
    return next(error);
  }
});

/**
 * POST /api/notifications/test
 * 
 * Send a test notification to the current user
 * Useful for verifying that everything is working end-to-end
 */
exports.sendTestNotification = catchAsync(async (req, res, next) => {
  console.log('\n' + '='.repeat(70));
  console.log('🧪 [TEST NOTIFICATION] Manual test endpoint called');
  console.log('='.repeat(70));

  const { userId } = req.body;

  console.log('📊 [REQUEST] User ID: ' + userId);

  try {
    // ===== LOOKUP USER =====
    console.log('\n🔍 [DATABASE] Looking up user for test notification');
    const user = await User.findById(userId);

    if (!user) {
      console.error('❌ [DATABASE] User not found: ' + userId);
      return next(new AppError('User not found', 404));
    }

    console.log('✅ [DATABASE] User found: ' + user.email);

    // ===== CHECK TOKEN EXISTS =====
    console.log('\n🎟️  [TOKEN] Checking if user has FCM token');

    if (!user.fcmToken) {
      console.error('❌ [TOKEN] No FCM token for user');
      console.error('   User must register FCM token before we can send notifications');
      console.error('   Steps: 1. User logs in');
      console.error('          2. App initializes FCM');
      console.error('          3. App registers token with backend');
      return next(new AppError(
        'User has no FCM token registered. Please log in on the app first.',
        400
      ));
    }

    console.log('✅ [TOKEN] User has FCM token');
    console.log('   Token: ' + user.fcmToken.substring(0, 50) + '...');
    console.log('   Length: ' + user.fcmToken.length + ' chars');
    console.log('   Platform: ' + (user.platform || 'unknown'));
    console.log('   Last updated: ' + user.fcmTokenUpdatedAt);

    // ===== SEND TEST NOTIFICATION =====
    console.log('\n📤 [SEND] Sending test notification via Firebase');

    const success = await firebaseService.sendNotification(
      user.fcmToken,
      '🧪 Test Notification',
      'This is a test notification from your Work Connect backend!',
      {
        type: 'test',
        timestamp: new Date().toISOString(),
        userId: user._id.toString(),
        testId: Math.random().toString(36).substring(7),
      }
    );

    if (success) {
      console.log('✅ [SEND] Test notification sent successfully');
      
      console.log('\n' + '='.repeat(70));
      console.log('✅ [TEST COMPLETE] SUCCESS');
      console.log('='.repeat(70));
      console.log('\n📱 Expected behavior on device:');
      console.log('   • If app is OPEN: Notification should appear in foreground');
      console.log('   • If app is CLOSED: System notification should appear');
      console.log('   • If you don\'t see it: Check device notification settings\n');

      res.status(200).json({
        status: 'success',
        message: 'Test notification sent successfully',
        data: {
          userId: user._id,
          email: user.email,
          tokenPreview: user.fcmToken.substring(0, 50) + '...',
          platform: user.platform,
          notificationType: 'test',
          expectedBehavior: 'Check your device - notification should appear',
        },
      });
    } else {
      console.error('❌ [SEND] Failed to send test notification');
      console.error('   Check backend logs for detailed error info');
      
      return next(new AppError(
        'Failed to send notification. Check backend logs for details.',
        500
      ));
    }

  } catch (error) {
    console.error('❌ [ERROR] Unexpected error: ' + error.message);
    return next(error);
  }
});

/**
 * GET /api/notifications/token/:userId
 * 
 * Get the FCM token stored for a user (for debugging)
 */
exports.getUserToken = catchAsync(async (req, res, next) => {
  console.log('\n' + '='.repeat(70));
  console.log('🔍 [GET TOKEN] Retrieving user FCM token');
  console.log('='.repeat(70));

  const { userId } = req.params;

  console.log('📊 [REQUEST] User ID: ' + userId);

  try {
    const user = await User.findById(userId).select(
      'email fcmToken platform fcmTokenUpdatedAt'
    );

    if (!user) {
      console.error('❌ User not found: ' + userId);
      return next(new AppError('User not found', 404));
    }

    console.log('✅ [DATABASE] User found: ' + user.email);
    console.log('   Token: ' + (user.fcmToken ? user.fcmToken.substring(0, 50) + '...' : 'None'));
    console.log('   Platform: ' + (user.platform || 'None'));
    console.log('   Updated: ' + (user.fcmTokenUpdatedAt ? user.fcmTokenUpdatedAt.toISOString() : 'Never'));

    res.status(200).json({
      status: 'success',
      data: {
        userId: user._id,
        email: user.email,
        hasToken: !!user.fcmToken,
        tokenLength: user.fcmToken ? user.fcmToken.length : 0,
        tokenPreview: user.fcmToken ? user.fcmToken.substring(0, 50) + '...' : null,
        platform: user.platform || null,
        updatedAt: user.fcmTokenUpdatedAt,
      },
    });

  } catch (error) {
    console.error('❌ Error: ' + error.message);
    return next(error);
  }
});

/**
 * GET /api/notifications/health
 * 
 * Health check endpoint to verify Firebase is initialized and ready
 */
exports.healthCheck = catchAsync(async (req, res, next) => {
  console.log('\n🏥 [HEALTH CHECK] Firebase health status');

  const health = await firebaseService.healthCheck();

  res.status(health.status === 'ok' ? 200 : 503).json({
    status: health.status,
    message: health.message,
    initialized: health.initialized,
    timestamp: new Date().toISOString(),
  });
});
