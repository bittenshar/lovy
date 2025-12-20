/**
 * Quick FCM Health Check Endpoint
 * Add this to src/modules/conversations/conversation.routes.js
 * 
 * Test with: GET /api/conversations/fcm-check?userId=<user_id>
 */

exports.fcmHealthCheck = catchAsync(async (req, res, next) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        status: 'fail',
        message: 'userId query parameter required'
      });
    }

    // Get FCM tokens
    const FCMToken = require('../../../models/fcmToken');
    const tokens = await FCMToken.find({ userId: userId });

    // Check Firebase
    const firebaseConfig = require('../notification/config/firebase');
    const firebaseInitialized = firebaseConfig.isInitialized;

    res.status(200).json({
      status: 'success',
      data: {
        userId: userId,
        firebaseInitialized: firebaseInitialized,
        tokensFound: tokens.length,
        tokens: tokens.map(t => ({
          token: t.token.substring(0, 30) + '...',
          deviceType: t.deviceType,
          isActive: t.isActive,
          createdAt: t.createdAt
        })),
        message: firebaseInitialized ? 'Firebase is initialized' : 'Firebase NOT initialized - check credentials'
      }
    });
  } catch (error) {
    console.error('FCM Health Check Error:', error);
    res.status(500).json({
      status: 'fail',
      error: error.message
    });
  }
});
