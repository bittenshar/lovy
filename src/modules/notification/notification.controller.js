const admin = require("./config/firebase");
const UserFcmToken = require("./UserFcmToken.model");
const Notification = require("./notification.model");

// Verify model is loaded
if (!UserFcmToken) {
  console.error('❌ CRITICAL: UserFcmToken model not loaded!');
}

/**
 * Register FCM Token
 */
exports.registerToken = async (req, res) => {
  const startTime = Date.now();
  console.log('\n========== FCM TOKEN REGISTRATION REQUEST ==========');
  console.log('⏰ [FCM] Time:', new Date().toISOString());
  
  const { token, deviceType } = req.body;
  const userId = req.user?._id?.toString();

  console.log('📍 [FCM] Input:');
  console.log('   - token:', token ? `${token.substring(0, 30)}...` : 'MISSING');
  console.log('   - userId:', userId || 'MISSING');
  console.log('   - deviceType:', deviceType || 'web');

  if (!token || !userId) {
    console.error('❌ [FCM] Missing required fields');
    return res.status(400).json({ 
      status: 'fail',
      message: token ? "User authentication required" : "Token is required"
    });
  }

  try {
    console.log('🔍 [FCM] Querying database...');
    const queryStart = Date.now();
    
    const fcmRecord = await UserFcmToken.findOne({ userId }).maxTimeMS(5000);
    
    const queryTime = Date.now() - queryStart;
    console.log(`✅ [FCM] Query completed in ${queryTime}ms - Record: ${fcmRecord ? 'FOUND' : 'NOT FOUND'}`);
    
    if (!fcmRecord) {
      console.log('🔨 [FCM] Creating new record...');
      const newRecord = new UserFcmToken({
        userId,
        tokens: [{ token, deviceType: deviceType || 'web', isActive: true }]
      });
      
      const saveStart = Date.now();
      await newRecord.save();
      const saveTime = Date.now() - saveStart;
      
      console.log(`✅ [FCM] Saved in ${saveTime}ms - Tokens: ${newRecord.tokens.length}`);
      
      return res.status(200).json({
        status: 'success',
        message: "FCM token registered",
        data: { 
          token: token.substring(0, 30) + '...',
          totalTokens: newRecord.tokens.length
        }
      });
    } else {
      console.log(`📝 [FCM] Updating existing record - Current tokens: ${fcmRecord.tokens.length}`);
      
      const tokenExists = fcmRecord.tokens.findIndex(t => t.token === token) >= 0;
      if (!tokenExists) {
        fcmRecord.tokens.push({ token, deviceType: deviceType || 'web', isActive: true });
      }
      
      const saveStart = Date.now();
      await fcmRecord.save();
      const saveTime = Date.now() - saveStart;
      
      console.log(`✅ [FCM] Updated in ${saveTime}ms - Tokens: ${fcmRecord.tokens.length}`);
      
      return res.status(200).json({
        status: 'success',
        message: "FCM token registered",
        data: { 
          token: token.substring(0, 30) + '...',
          totalTokens: fcmRecord.tokens.length
        }
      });
    }
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`\n❌ [FCM] ERROR after ${totalTime}ms:`);
    console.error('   - Message:', error.message);
    console.error('   - Name:', error.name);
    
    res.status(500).json({ 
      status: 'error',
      message: "Failed to register FCM token",
      error: error.message
    });
  }
};


/**
 * Send Notification to One User
 */
exports.sendNotification = async (req, res) => {
  const { userId, title, body, data, imageUrl } = req.body;

  const tokens = await UserFcmToken.find({ userId });

  if (!tokens.length) {
    return res.status(404).json({ message: "No tokens found" });
  }

  const responses = [];

  for (const t of tokens) {
    try {
      const notification = { title, body };
      if (imageUrl) {
        notification.imageUrl = imageUrl;
      }

      const message = {
        token: t.token,
        notification,
        data: data || {},
      };

      // Add webpush config for web platform
      if (t.deviceType === "web" && imageUrl) {
        message.webpush = {
          notification: {
            title,
            body,
            icon: imageUrl,
            image: imageUrl,
          },
          data: data || {},
        };
      }

      // Add android config for Android platform
      if (t.deviceType === "android" && imageUrl) {
        message.android = {
          notification: {
            title,
            body,
            imageUrl,
          },
          data: data || {},
        };
      }

      // Add apns config for iOS platform
      if (t.deviceType === "ios" && imageUrl) {
        message.apns = {
          payload: {
            aps: {
              alert: {
                title,
                body,
              },
            },
          },
          fcmOptions: {
            image: imageUrl,
          },
        };
      }

      const response = await admin.messaging().send(message);



      responses.push({ token: t.token, response });
    } catch (error) {
      console.error("FCM error:", error.code);

      // 🔥 Remove invalid tokens
      if (
        error.code === "messaging/registration-token-not-registered" ||
        error.code === "messaging/invalid-registration-token"
      ) {
        await UserFcmToken.deleteOne({ token: t.token });
      }
    }
  }

  res.json({ success: true, responses });
};

/**
 * Batch Notification (Event updates)
 */
exports.sendBatch = async (req, res) => {
  const { title, body, data, imageUrl } = req.body;

  const tokens = await UserFcmToken.find().select("token deviceType");

  const responses = [];

  for (const t of tokens) {
    try {
      const notification = { title, body };
      if (imageUrl) {
        notification.imageUrl = imageUrl;
      }

      const message = {
        token: t.token,
        notification,
        data: data || {},
      };

      // Add platform-specific configs for image support
      if (imageUrl) {
        if (t.deviceType === "web") {
          message.webpush = {
            notification: {
              title,
              body,
              icon: imageUrl,
              image: imageUrl,
            },
            data: data || {},
          };
        } else if (t.deviceType === "android") {
          message.android = {
            notification: {
              title,
              body,
              imageUrl,
            },
            data: data || {},
          };
        } else if (t.deviceType === "ios") {
          message.apns = {
            payload: {
              aps: {
                alert: {
                  title,
                  body,
                },
              },
            },
            fcmOptions: {
              image: imageUrl,
            },
          };
        }
      }

      const response = await admin.messaging().send(message);
      responses.push({ token: t.token, response });
    } catch (error) {
      console.error("FCM error:", error.code);

      // 🔥 APP UNINSTALLED → DELETE TOKEN
      if (
        error.code === "messaging/registration-token-not-registered" ||
        error.code === "messaging/invalid-registration-token"
      ) {
        await UserFcmToken.deleteOne({ token: t.token });
      }
    }
  }

  res.json({
    success: true,
    sent: responses.length,
    failed: tokens.length - responses.length,
  });
};

/**
 * Send Message to User by UserId
 */
exports.deleteToken = async (req, res) => {
  const { userId, title, body, data, imageUrl } = req.body;

  if (!userId) {
    return res.status(400).json({ message: "UserId is required" });
  }

  const tokens = await UserFcmToken.find({ userId });

  if (!tokens.length) {
    
    return res.status(404).json({ message: "No tokens found for user" });
  }

  const responses = [];

  for (const t of tokens) {
    try {
      const notification = { title, body };
      if (imageUrl) {
        notification.imageUrl = imageUrl;
      }

      const message = {
        token: t.token,
        notification,
        data: data || {},
      };

      if (t.deviceType === "web" && imageUrl) {
        message.webpush = {
          notification: {
            title,
            body,
            icon: imageUrl,
            image: imageUrl,
          },
          data: data || {},
        };
      }

      if (t.deviceType === "android" && imageUrl) {
        message.android = {
          notification: {
            title,
            body,
            imageUrl,
          },
          data: data || {},
        };
      }

      if (t.deviceType === "ios" && imageUrl) {
        message.apns = {
          payload: {
            aps: {
              alert: {
                title,
                body,
              },
            },
          },
          fcmOptions: {
            image: imageUrl,
          },
        };
      }

      const response = await admin.messaging().send(message);
      responses.push({ token: t.token, response });
    } catch (error) {
      console.error("FCM error:", error.code);

      if (
        error.code === "messaging/registration-token-not-registered" ||
        error.code === "messaging/invalid-registration-token"
      ) {
        await UserFcmToken.deleteOne({ token: t.token });
      }
    }
  }

  res.json({ success: true, sent: responses.length, responses });
};



exports.softLogout = async (req, res) => {
  const { userId, title, body, data } = req.body;

  if (!userId) {
    return res.status(400).json({ message: "UserId is required" });
  }

  const tokens = await UserFcmToken.find({ userId });

  if (!tokens.length) {
    return res.status(404).json({ message: "No tokens found for user" });
  }

  const responses = [];

  for (const t of tokens) {
    try {
      const message = {
        token: t.token,
        notification: {
          title: title || "Logout Notification",
          body: body || "You have been logged out"
        },
        data: data || {},
      };

      const response = await admin.messaging().send(message);
      responses.push({ token: t.token, response });
    } catch (error) {
      console.error("FCM error:", error.code);
    }
  }

  res.json({ success: true, sent: responses.length });
};



exports.hardDeleteToken = async (req, res) => {
  const { userId, title, body, data } = req.body;

  if (!userId) {
    return res.status(400).json({ message: "UserId is required" });
  }

  const tokens = await UserFcmToken.find({ userId });

  if (!tokens.length) {
    return res.status(404).json({ message: "No tokens found for user" });
  }

  const responses = [];

  for (const t of tokens) {
    try {
      const message = {
        token: t.token,
        notification: {
          title: title || "Forced Logout",
          body: body || "Your session has been terminated"
        },
        data: data || {},
      };

      const response = await admin.messaging().send(message);
      responses.push({ token: t.token, response });

      // Delete token after sending message
      await UserFcmToken.deleteOne({ token: t.token });
    } catch (error) {
      console.error("FCM error:", error.code);
    }
  }

  res.json({ success: true, sent: responses.length });
};

/**
 * GET /notifications - Fetch notifications for current user
 */
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const { limit = 50, skip = 0, read } = req.query;

    console.log('📬 [NOTIF] Fetching notifications for user:', userId);
    console.log('📬 [NOTIF] Query params - limit:', limit, 'skip:', skip, 'read:', read);

    // Build filter
    const filter = { userId };
    if (read !== undefined) {
      filter.read = read === 'true';
    }

    // Get notifications
    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .lean();

    // Get total count
    const total = await Notification.countDocuments(filter);

    console.log(`✅ [NOTIF] Found ${notifications.length} notifications (total: ${total})`);

    res.status(200).json({
      status: 'success',
      data: notifications,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: parseInt(skip) + parseInt(limit) < total
      }
    });
  } catch (error) {
    console.error('❌ [NOTIF] Error fetching notifications:', error.message);
    res.status(500).json({
      status: 'fail',
      message: 'Failed to fetch notifications',
      error: error.message
    });
  }
};

/**
 * PATCH /notifications/:notificationId/read - Mark notification as read
 */
exports.markNotificationAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user._id;

    console.log('📖 [NOTIF] Marking notification as read:', notificationId);

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId },
      { read: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      console.error('❌ [NOTIF] Notification not found:', notificationId);
      return res.status(404).json({
        status: 'fail',
        message: 'Notification not found'
      });
    }

    console.log('✅ [NOTIF] Marked as read:', notificationId);

    res.status(200).json({
      status: 'success',
      data: notification
    });
  } catch (error) {
    console.error('❌ [NOTIF] Error marking notification as read:', error.message);
    res.status(500).json({
      status: 'fail',
      message: 'Failed to mark notification as read',
      error: error.message
    });
  }
};

/**
 * PATCH /notifications/read-all - Mark all notifications as read
 */
exports.markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user._id;

    console.log('📖 [NOTIF] Marking all notifications as read for user:', userId);

    const result = await Notification.updateMany(
      { userId, read: false },
      { read: true, readAt: new Date() }
    );

    console.log(`✅ [NOTIF] Updated ${result.modifiedCount} notifications`);

    res.status(200).json({
      status: 'success',
      message: `Marked ${result.modifiedCount} notifications as read`
    });
  } catch (error) {
    console.error('❌ [NOTIF] Error marking all notifications as read:', error.message);
    res.status(500).json({
      status: 'fail',
      message: 'Failed to mark notifications as read',
      error: error.message
    });
  }
};

/**
 * DELETE /notifications/:notificationId - Delete a notification
 */
exports.deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user._id;

    console.log('🗑️  [NOTIF] Deleting notification:', notificationId);

    const result = await Notification.findOneAndDelete({
      _id: notificationId,
      userId
    });

    if (!result) {
      return res.status(404).json({
        status: 'fail',
        message: 'Notification not found'
      });
    }

    console.log('✅ [NOTIF] Deleted notification:', notificationId);

    res.status(200).json({
      status: 'success',
      message: 'Notification deleted'
    });
  } catch (error) {
    console.error('❌ [NOTIF] Error deleting notification:', error.message);
    res.status(500).json({
      status: 'fail',
      message: 'Failed to delete notification',
      error: error.message
    });
  }
};
