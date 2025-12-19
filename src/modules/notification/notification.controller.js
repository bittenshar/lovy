const admin = require("./config/firebase");
const UserFcmToken = require("./UserFcmToken.model");

/**
 * Register FCM Token
 */
exports.registerToken = async (req, res) => {
  const { token, userId, deviceId, deviceType } = req.body;

  if (!token) {
    return res.status(400).json({ message: "Token is required" });
  }

  if (!userId) {
    return res.status(400).json({ message: "UserId is required" });
  }

  await UserFcmToken.findOneAndUpdate(
    { token },
    {
      token,
      deviceId,
      deviceType,
      userId,
      isActive: true,
    },
    { upsert: true, new: true }
  );

  res.json({ success: true, message: "FCM token registered" });
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
