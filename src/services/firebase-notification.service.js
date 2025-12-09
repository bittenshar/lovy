/**
 * Firebase Cloud Messaging Service
 * Handles sending push notifications to users via FCM
 */

const admin = require('firebase-admin');
const path = require('path');

class FirebaseNotificationService {
  constructor() {
    this.initialized = false;
    this.init();
  }

  /**
   * Initialize Firebase Admin SDK
   */
  init() {
    try {
      console.log('🔄 Starting Firebase initialization...');
      
      // Try to load service account FIRST
      let serviceAccount;
      
      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        console.log('📋 Loading Firebase credentials from FIREBASE_SERVICE_ACCOUNT env var');
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      } else {
        const serviceAccountPath = path.join(__dirname, '../../firebase-service-account.json');
        console.log('📋 Checking for Firebase credentials file:', serviceAccountPath);
        try {
          serviceAccount = require(serviceAccountPath);
          console.log('✅ Service account file found');
        } catch (fileError) {
          console.error('❌ Could not load firebase-service-account.json:', fileError.message);
          throw new Error('Firebase service account file not found and FIREBASE_SERVICE_ACCOUNT env var not set');
        }
      }

      // Validate service account
      console.log('🔍 Validating service account...');
      if (!serviceAccount || !serviceAccount.project_id) {
        throw new Error('Invalid Firebase service account: missing project_id');
      }
      if (!serviceAccount.private_key) {
        throw new Error('Invalid Firebase service account: missing private_key');
      }
      if (!serviceAccount.client_email) {
        throw new Error('Invalid Firebase service account: missing client_email');
      }
      console.log('✅ Service account is valid');
      console.log('   Project ID:', serviceAccount.project_id);
      console.log('   Email:', serviceAccount.client_email);
      
      // Now check if Firebase is already initialized
      if (admin.apps && admin.apps.length > 0) {
        console.log('ℹ️  Firebase Admin SDK already has', admin.apps.length, 'app(s)');
        
        // Try to get the first app and check if it's the right one
        try {
          const existingApp = admin.app();
          const existingProjectId = existingApp?.options?.credential?.projectId || 
                                   serviceAccount.project_id; // fallback to what we loaded
          
          if (existingProjectId === serviceAccount.project_id) {
            this.initialized = true;
            console.log('✅ Firebase already initialized with correct project:', existingProjectId);
            return;
          } else {
            console.warn('⚠️  Existing app has different project:', existingProjectId);
            console.warn('⚠️  Deleting it to reinitialize with:', serviceAccount.project_id);
            try {
              existingApp.delete();
              console.log('✅ Deleted old Firebase app');
            } catch (delErr) {
              console.warn('⚠️ Could not delete old app:', delErr.message);
            }
          }
        } catch (checkErr) {
          console.log('ℹ️  Could not check existing app:', checkErr.message);
        }
      }
      
      console.log('🚀 Initializing Firebase Admin SDK...');
      const initResult = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });

      this.initialized = true;
      console.log('✅ Firebase Admin SDK initialized successfully');
      console.log('   App name:', initResult.name);
      console.log('   Apps count:', admin.apps.length);
      
      // Verify messaging is available
      const messaging = admin.messaging();
      console.log('✅ Firebase Messaging API available');
      
    } catch (error) {
      console.error('❌ Firebase initialization failed:', error.message);
      console.log('⚠️  Stack:', error.stack);
      this.initialized = false;
    }
  }

  /**
   * Send notification to a single device
   * @param {string} fcmToken - Device FCM token
   * @param {Object} payload - Notification payload
   * @returns {Promise<string>} Message ID on success
   */
  async sendToDevice(fcmToken, payload) {
    if (!this.initialized) {
      throw new Error('Firebase not initialized. Check your service account configuration.');
    }

    try {
      // Validate FCM token format
      if (!fcmToken || typeof fcmToken !== 'string' || fcmToken.trim().length === 0) {
        console.warn('⚠️ Invalid or empty FCM token provided');
        throw new Error('Invalid FCM token');
      }

      // Ensure all data values are strings (Firebase requirement)
      const cleanData = {};
      if (payload.data && typeof payload.data === 'object') {
        Object.keys(payload.data).forEach(key => {
          const value = payload.data[key];
          if (value === null || value === undefined) {
            cleanData[key] = '';
          } else {
            cleanData[key] = String(value);
          }
        });
      }

      const message = {
        notification: {
          title: String(payload.title || 'Notification'),
          body: String(payload.body || ''),
        },
        data: cleanData,
        token: fcmToken.trim(),
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
          },
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: String(payload.title || 'Notification'),
                body: String(payload.body || ''),
              },
              sound: 'default',
              'mutable-content': true,
            },
          },
        },
      };

      // Log the message structure for debugging
      console.log('📤 Sending Firebase message with data keys:', Object.keys(cleanData));

      // Verify Firebase app is available
      if (!admin.app()) {
        throw new Error('Firebase app not initialized. Check your service account configuration.');
      }

      const response = await admin.messaging().send(message);
      console.log('✅ Notification sent successfully:', response);
      return response;
    } catch (error) {
      // Suppress "SenderId mismatch" errors (happens with mismatched Firebase projects)
      if (error.code === 'messaging/mismatched-credential') {
        console.warn('⚠️ Firebase token mismatch (likely from different Firebase project) - use real mobile app tokens');
        throw error; // Re-throw for caller to handle
      }
      console.error('❌ Error sending notification:', error.message);
      throw error;
    }
  }

  /**
   * Send notification to multiple devices
   * @param {string[]} fcmTokens - Array of device FCM tokens
   * @param {Object} payload - Notification payload
   * @returns {Promise<Object>} Batch response
   */
  async sendToDevices(fcmTokens, payload) {
    if (!this.initialized) {
      throw new Error('Firebase not initialized. Check your service account configuration.');
    }

    try {
      // Ensure all data values are strings (Firebase requirement)
      const cleanData = {};
      if (payload.data && typeof payload.data === 'object') {
        Object.keys(payload.data).forEach(key => {
          const value = payload.data[key];
          if (value === null || value === undefined) {
            cleanData[key] = '';
          } else {
            cleanData[key] = String(value);
          }
        });
      }

      const messages = fcmTokens.map(token => ({
        notification: {
          title: String(payload.title || 'Notification'),
          body: String(payload.body || ''),
        },
        data: cleanData,
        token,
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
          },
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: String(payload.title || 'Notification'),
                body: String(payload.body || ''),
              },
              sound: 'default',
              'mutable-content': true,
            },
          },
        },
      }));

      // Verify Firebase app is available
      if (!admin.app()) {
        throw new Error('Firebase app not initialized. Check your service account configuration.');
      }

      console.log('🚀 Calling admin.messaging().sendAll() with', messages.length, 'messages');
      console.log('📋 First message structure:', JSON.stringify(messages[0], null, 2).substring(0, 200));
      
      const response = await admin.messaging().sendAll(messages);
      console.log(`✅ Sent ${response.successCount} notifications, ${response.failureCount} failed`);
      return response;
    } catch (error) {
      console.error('❌ Error sending batch notifications:', error.message);
      throw error;
    }
  }

  /**
   * Send notification to a topic (not used in current implementation)
   * @param {string} topic - Topic name
   * @param {Object} payload - Notification payload
   * @returns {Promise<string>} Message ID
   */
  async sendToTopic(topic, payload) {
    if (!this.initialized) {
      throw new Error('Firebase not initialized. Check your service account configuration.');
    }

    try {
      const message = {
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data,
        topic,
      };

      const response = await admin.messaging().send(message);
      console.log('✅ Topic notification sent:', response);
      return response;
    } catch (error) {
      console.error('❌ Error sending topic notification:', error.message);
      throw error;
    }
  }

  /**
   * Subscribe device to topic
   * @param {string} fcmToken - Device FCM token
   * @param {string} topic - Topic name
   */
  async subscribeToTopic(fcmToken, topic) {
    if (!this.initialized) {
      throw new Error('Firebase not initialized.');
    }

    try {
      await admin.messaging().subscribeToTopic(fcmToken, topic);
      console.log(`✅ Subscribed device to topic: ${topic}`);
    } catch (error) {
      console.error(`❌ Error subscribing to topic: ${error.message}`);
      throw error;
    }
  }

  /**
   * Unsubscribe device from topic
   * @param {string} fcmToken - Device FCM token
   * @param {string} topic - Topic name
   */
  async unsubscribeFromTopic(fcmToken, topic) {
    if (!this.initialized) {
      throw new Error('Firebase not initialized.');
    }

    try {
      await admin.messaging().unsubscribeFromTopic(fcmToken, topic);
      console.log(`✅ Unsubscribed device from topic: ${topic}`);
    } catch (error) {
      console.error(`❌ Error unsubscribing from topic: ${error.message}`);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new FirebaseNotificationService();
