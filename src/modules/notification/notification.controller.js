const admin = require("./config/firebase");
const UserFcmToken = require("./UserFcmToken.model");

// Verify model is loaded
if (!UserFcmToken) {
  console.error('❌ CRITICAL: UserFcmToken model not loaded!');
}

/**
 * Register FCM Token
 */
exports.registerToken = async (req, res) => {
  console.log('\n========== FCM TOKEN REGISTRATION REQUEST ==========');
  console.log('📍 [FCM] Endpoint called at:', new Date().toISOString());
  console.log('📍 [FCM] Request method:', req.method);
  console.log('📍 [FCM] Request path:', req.path);
  console.log('📍 [FCM] Request URL:', req.originalUrl);
  console.log('📍 [FCM] Request headers:', JSON.stringify(req.headers, null, 2));
  console.log('📍 [FCM] Request body:', JSON.stringify(req.body, null, 2));
  console.log('📍 [FCM] Request user:', req.user ? { _id: req.user._id, email: req.user.email } : 'NO AUTH');
  
  const { token, deviceType } = req.body;
  const userId = req.user?._id?.toString(); // Get user ID from authenticated request

  console.log('📍 [FCM] Extracted values:');
  console.log('   - token:', token ? `${token.substring(0, 30)}...` : 'MISSING');
  console.log('   - deviceType:', deviceType || 'web (default)');
  console.log('   - userId:', userId || 'MISSING');

  if (!token) {
    console.error('❌ [FCM] FAIL: Token is missing from request body');
    return res.status(400).json({ 
      status: 'fail',
      message: "Token is required" 
    });
  }

  if (!userId) {
    console.error('❌ [FCM] FAIL: User ID is missing - authentication required');
    return res.status(401).json({ 
      status: 'fail',
      message: "User authentication required" 
    });
  }

  try {
    console.log('🔍 [FCM] Starting token registration process...');
    
    if (!UserFcmToken) {
      throw new Error('UserFcmToken model is not loaded');
    }

    // Check if token already exists for this user
    let fcmRecord = await UserFcmToken.findOne({ userId });
    console.log('🔍 [FCM] Database query result:', fcmRecord ? 'RECORD FOUND' : 'NO RECORD FOUND');
    
    if (!fcmRecord) {
      console.log('🔨 [FCM] Creating NEW record for userId:', userId);
      // Create new record if user doesn't have one yet
      fcmRecord = new UserFcmToken({
        userId,
        tokens: [{
          token,
          deviceType: deviceType || 'web',
          isActive: true
        }]
      });
      console.log('🔨 [FCM] New record created in memory');
      console.log('   - Record _id:', fcmRecord._id);
      console.log('   - Record userId:', fcmRecord.userId);
      console.log('   - Tokens array length:', fcmRecord.tokens.length);
      console.log('   - First token:', JSON.stringify(fcmRecord.tokens[0], null, 2));
    } else {
      console.log('📝 [FCM] Updating existing record');
      console.log('   - Current tokens count:', fcmRecord.tokens.length);
      // Check if this token already exists
      const tokenIndex = fcmRecord.tokens.findIndex(t => t.token === token);
      
      if (tokenIndex >= 0) {
        console.log('🔄 [FCM] Token already exists at index', tokenIndex, '- updating...');
        // Update existing token
        fcmRecord.tokens[tokenIndex].deviceType = deviceType || 'web';
        fcmRecord.tokens[tokenIndex].isActive = true;
      } else {
        console.log('➕ [FCM] New token - adding to array...');
        // Add new token to array
        fcmRecord.tokens.push({
          token,
          deviceType: deviceType || 'web',
          isActive: true
        });
        console.log('➕ [FCM] Token pushed. New count:', fcmRecord.tokens.length);
      }
    }

    console.log('💾 [FCM] About to save record to MongoDB...');
    console.log('   - Record before save:', {
      _id: fcmRecord._id,
      userId: fcmRecord.userId,
      tokensCount: fcmRecord.tokens.length,
      tokens: fcmRecord.tokens.map(t => ({ token: t.token.substring(0, 20) + '...', deviceType: t.deviceType, isActive: t.isActive }))
    });
    
    const savedRecord = await fcmRecord.save();
    
    console.log('✅ [FCM] Record saved successfully!');
    console.log('   - Saved record _id:', savedRecord._id);
    console.log('   - Saved record userId:', savedRecord.userId);
    console.log('   - Saved tokens count:', savedRecord.tokens.length);
    console.log('   - Full tokens array:', JSON.stringify(savedRecord.tokens.map(t => ({ token: t.token.substring(0, 20) + '...', deviceType: t.deviceType, isActive: t.isActive })), null, 2));

    res.status(200).json({ 
      status: 'success',
      message: "FCM token registered successfully",
      data: {
        token: token.substring(0, 30) + '...',
        userId: userId,
        isActive: true,
        totalTokens: savedRecord.tokens.length,
        timestamp: new Date().toISOString()
      }
    });
    console.log('✅ [FCM] Response sent successfully\n');
  } catch (error) {
    console.error('\n❌ ERROR REGISTERING FCM TOKEN:');
    console.error('   - Error message:', error.message);
    console.error('   - Error name:', error.name);
    console.error('   - Error code:', error.code);
    console.error('   - Stack trace:', error.stack);
    console.log('========== END ERROR ==========\n');
    
    res.status(500).json({ 
      status: 'error',
      message: "Failed to register FCM token",
      error: error.message,
      details: error.name,
      timestamp: new Date().toISOString()
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
