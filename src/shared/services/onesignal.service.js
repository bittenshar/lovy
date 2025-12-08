/**
 * OneSignal Integration Service
 * Handles push notifications via OneSignal using REST API
 */

const axios = require('axios');

class OneSignalService {
  constructor() {
    this.appAuthKey = process.env.ONESIGNAL_REST_API_KEY;
    this.appId = process.env.ONESIGNAL_APP_ID;
    this.isConfigured = !!(this.appAuthKey && this.appId);
    this.baseUrl = 'https://onesignal.com/api/v1';
    
    if (this.isConfigured) {
      this.axiosInstance = axios.create({
        baseURL: this.baseUrl,
        headers: {
          'Authorization': `Basic ${this.appAuthKey}`,  // OneSignal v2 API uses the key directly as Basic auth
          'Content-Type': 'application/json; charset=utf-8'
        }
      });
      console.log('✅ OneSignal service initialized');
    } else {
      console.warn('⚠️ OneSignal credentials not configured. Push notifications via OneSignal will be disabled.');
    }
  }

  /**
   * Create a new notification and send to users
   * @param {Object} options - Notification options
   * @returns {Promise<Object>} - OneSignal notification response
   */
  async sendNotification({
    title,
    message,
    body,
    headings,
    contents,
    users = [],
    segments = [],
    data = {},
    largeIcon = null,
    bigPicture = null,
    iosSound = 'default',
    androidSound = 'notification',
    priority = 10,
    ttl = 2419200,
    customData = {}
  }) {
    if (!this.isConfigured) {
      console.log('OneSignal not configured, skipping notification');
      return { success: false, message: 'OneSignal not configured' };
    }

    try {
      // Prepare OneSignal notification body
      const notificationBody = {
        app_id: this.appId,  // Required by OneSignal API
        headings: headings || { en: title || 'Notification' },
        contents: contents || { en: message || body || 'New update' },
        data: { ...data, ...customData }
      };

      // Add targeting information
      if (users && users.length > 0) {
        notificationBody.include_external_user_ids = users;
      } else if (segments && segments.length > 0) {
        notificationBody.included_segments = segments;
      } else {
        // Default to sending to all users if no targeting specified
        notificationBody.included_segments = ['All'];
      }

      // Add media
      if (largeIcon) {
        notificationBody.large_icon = largeIcon;
      }
      if (bigPicture) {
        notificationBody.big_picture = bigPicture;
      }

      // Platform-specific settings
      notificationBody.ios_badgeType = 'Increase';
      notificationBody.ios_badgeCount = 1;
      notificationBody.ios_sound = iosSound;
      notificationBody.android_sound = androidSound;
      // Note: Only set android_channel_id if it exists in OneSignal
      // Otherwise OneSignal will use default or throw error
      notificationBody.priority = priority;
      notificationBody.ttl = ttl;

      // Send notification via REST API
      const response = await this.axiosInstance.post('/notifications', notificationBody);
      
      // OneSignal returns the notification with id or body.id depending on endpoint
      const notificationId = response.data.id || (response.data.body && response.data.body.id);
      console.log(`✅ OneSignal notification sent: ${notificationId}`);
      return {
        success: true,
        notificationId: notificationId,
        body: notificationBody
      };
    } catch (error) {
      const errorMsg = error.response?.data?.errors?.join(', ') || error.message;
      console.error('❌ OneSignal notification error:', errorMsg);
      return {
        success: false,
        error: errorMsg
      };
    }
  }

  /**
   * Send notification to specific user
   * @param {string|Array} userId - User ID(s)
   * @param {Object} options - Notification options
   */
  async sendToUser(userId, options) {
    const users = Array.isArray(userId) ? userId : [userId];
    return this.sendNotification({
      ...options,
      users
    });
  }

  /**
   * Send notification to segment
   * @param {string|Array} segment - Segment name(s)
   * @param {Object} options - Notification options
   */
  async sendToSegment(segment, options) {
    const segments = Array.isArray(segment) ? segment : [segment];
    return this.sendNotification({
      ...options,
      segments
    });
  }

  /**
   * Send to all users
   * @param {Object} options - Notification options
   */
  async sendToAll(options) {
    return this.sendNotification({
      ...options,
      segments: ['All']
    });
  }

  /**
   * Register a user/device in OneSignal
   * @param {string} externalUserId - External user ID (from your system)
   * @param {Object} properties - User properties
   */
  async registerUser(externalUserId, properties = {}) {
    if (!this.isConfigured) {
      console.log('OneSignal not configured, skipping user registration');
      return { success: false };
    }

    try {
      // Create user in OneSignal via REST API
      const userData = {
        properties: {
          firstName: properties.firstName || '',
          lastName: properties.lastName || '',
          email: properties.email || '',
          phone: properties.phone || '',
          userType: properties.userType || '',
          ...properties
        }
      };

      await this.axiosInstance.post(`/apps/${this.appId}/users`, {
        external_user_id: externalUserId,
        ...userData
      });

      console.log(`✅ User registered in OneSignal: ${externalUserId}`);
      return {
        success: true,
        userId: externalUserId
      };
    } catch (error) {
      if (error.response?.status === 409) {
        console.log(`User ${externalUserId} already exists in OneSignal`);
        return { success: true, userId: externalUserId, existing: true };
      }
      const errorMsg = error.response?.data?.errors?.join(', ') || error.message;
      console.error('OneSignal user registration error:', errorMsg);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Update user properties in OneSignal
   * @param {string} externalUserId - External user ID
   * @param {Object} properties - Properties to update
   */
  async updateUser(externalUserId, properties = {}) {
    if (!this.isConfigured) {
      return { success: false };
    }

    try {
      const userData = {
        properties: {
          firstName: properties.firstName,
          lastName: properties.lastName,
          email: properties.email,
          phone: properties.phone,
          userType: properties.userType,
          ...properties
        }
      };

      // Remove undefined properties
      Object.keys(userData.properties).forEach(key => {
        if (userData.properties[key] === undefined) {
          delete userData.properties[key];
        }
      });

      await this.axiosInstance.patch(`/apps/${this.appId}/users/${externalUserId}`, userData);
      console.log(`✅ User updated in OneSignal: ${externalUserId}`);
      return {
        success: true,
        userId: externalUserId
      };
    } catch (error) {
      const errorMsg = error.response?.data?.errors?.join(', ') || error.message;
      console.error('OneSignal user update error:', errorMsg);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Add user to segment
   * @param {string} externalUserId - External user ID
   * @param {string} segment - Segment name
   */
  async addToSegment(externalUserId, segment) {
    if (!this.isConfigured) {
      return { success: false };
    }

    try {
      const userData = {
        properties: {
          tags: {
            [segment]: true
          }
        }
      };

      await this.axiosInstance.patch(`/apps/${this.appId}/users/${externalUserId}`, userData);
      console.log(`✅ User added to segment "${segment}": ${externalUserId}`);
      return { success: true };
    } catch (error) {
      const errorMsg = error.response?.data?.errors?.join(', ') || error.message;
      console.error('OneSignal segment error:', errorMsg);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Delete user from OneSignal
   * @param {string} externalUserId - External user ID
   */
  async deleteUser(externalUserId) {
    if (!this.isConfigured) {
      return { success: false };
    }

    try {
      await this.axiosInstance.delete(`/apps/${this.appId}/users/${externalUserId}`);
      console.log(`✅ User deleted from OneSignal: ${externalUserId}`);
      return { success: true };
    } catch (error) {
      const errorMsg = error.response?.data?.errors?.join(', ') || error.message;
      console.error('OneSignal user deletion error:', errorMsg);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Get notification status/details
   * @param {string} notificationId - OneSignal notification ID
   */
  async getNotificationStatus(notificationId) {
    if (!this.isConfigured) {
      return { success: false };
    }

    try {
      const response = await this.axiosInstance.get(`/apps/${this.appId}/notifications/${notificationId}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      const errorMsg = error.response?.data?.errors?.join(', ') || error.message;
      console.error('OneSignal get notification error:', errorMsg);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Cancel scheduled notification
   * @param {string} notificationId - OneSignal notification ID
   */
  async cancelNotification(notificationId) {
    if (!this.isConfigured) {
      return { success: false };
    }

    try {
      await this.axiosInstance.delete(`/apps/${this.appId}/notifications/${notificationId}`);
      console.log(`✅ Notification cancelled: ${notificationId}`);
      return {
        success: true
      };
    } catch (error) {
      const errorMsg = error.response?.data?.errors?.join(', ') || error.message;
      console.error('OneSignal cancel notification error:', errorMsg);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Schedule notification for specific time
   * @param {Object} options - Notification options + scheduledTime
   */
  async scheduleNotification(options) {
    if (!this.isConfigured) {
      return { success: false };
    }

    try {
      const { scheduledTime, ...notificationOptions } = options;
      
      if (!scheduledTime) {
        throw new Error('scheduledTime is required for scheduled notifications');
      }

      return this.sendNotification({
        ...notificationOptions,
        send_after: scheduledTime.toISOString()
      });
    } catch (error) {
      console.error('OneSignal schedule notification error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if OneSignal is properly configured
   */
  isReady() {
    return this.isConfigured;
  }
}

module.exports = new OneSignalService();
