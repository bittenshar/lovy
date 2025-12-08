/**
 * FCM Token Management Controller
 * Handles saving and managing FCM tokens for push notifications
 */

const User = require('../users/user.model');

/**
 * Save or update FCM token for user
 * POST /api/auth/save-fcm-token
 * Body: {
 *   fcmToken: string,
 *   platform: string (android|ios|web)
 * }
 */
exports.saveFcmToken = async (req, res) => {
  try {
    const { fcmToken, platform } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User must be authenticated'
      });
    }

    if (!fcmToken) {
      return res.status(400).json({
        success: false,
        message: 'FCM token is required'
      });
    }

    // Update user with FCM token
    const user = await User.findByIdAndUpdate(
      userId,
      {
        fcmToken,
        platform: platform || 'unknown',
        fcmTokenUpdatedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log(`✅ FCM token saved for user ${userId} on platform ${platform}`);

    return res.json({
      success: true,
      message: 'FCM token saved successfully',
      user: {
        id: user._id,
        email: user.email,
        fcmToken: fcmToken.substring(0, 20) + '...' // Return partial token for security
      }
    });
  } catch (error) {
    console.error('Error saving FCM token:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to save FCM token'
    });
  }
};

/**
 * Get current FCM token for user
 * GET /api/auth/fcm-token
 */
exports.getFcmToken = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User must be authenticated'
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    return res.json({
      success: true,
      fcmToken: user.fcmToken || null,
      platform: user.platform || null,
      updatedAt: user.fcmTokenUpdatedAt || null
    });
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get FCM token'
    });
  }
};

/**
 * Delete FCM token (logout/unsubscribe)
 * POST /api/auth/delete-fcm-token
 */
exports.deleteFcmToken = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User must be authenticated'
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      {
        fcmToken: null,
        platform: null
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log(`✅ FCM token deleted for user ${userId}`);

    return res.json({
      success: true,
      message: 'FCM token deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting FCM token:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete FCM token'
    });
  }
};
