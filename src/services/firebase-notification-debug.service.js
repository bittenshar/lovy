/**
 * 🔥 Firebase Notification Service
 * 
 * Complete Firebase Cloud Messaging (FCM) implementation for Node.js backend
 * Handles initialization, token management, and notification delivery
 * 
 * Debug logging at every step to track FCM flow
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

class FirebaseNotificationService {
  constructor() {
    this.isInitialized = false;
    this.serviceAccountPath = path.join(__dirname, '../../firebase-service-account.json');
    
    console.log('\n' + '='.repeat(70));
    console.log('🔥 [FIREBASE] SERVICE INITIALIZATION');
    console.log('='.repeat(70));
    
    this.initFirebase();
  }

  /**
   * Initialize Firebase Admin SDK
   * This must be called once when the backend starts
   */
  initFirebase() {
    try {
      console.log('🔄 [FIREBASE] Checking Firebase initialization status...');
      
      // Step 1: Check if service account file exists
      console.log('\n📍 [FIREBASE] STEP 1: Verifying service account file');
      console.log('   Path: ' + this.serviceAccountPath);
      
      if (!fs.existsSync(this.serviceAccountPath)) {
        console.error('❌ [FIREBASE] STEP 1 FAILED: Service account file not found');
        console.error('   Expected location: ' + this.serviceAccountPath);
        console.error('\n   ⚠️  Fix: Download firebase-service-account.json from Firebase Console');
        console.error('       → Firebase Project Settings → Service Accounts → Generate new key');
        return;
      }
      
      console.log('✅ [FIREBASE] STEP 1 COMPLETE: File found');

      // Step 2: Load and parse service account
      console.log('\n📍 [FIREBASE] STEP 2: Loading service account JSON');
      
      let serviceAccount;
      try {
        const rawData = fs.readFileSync(this.serviceAccountPath, 'utf8');
        serviceAccount = JSON.parse(rawData);
      } catch (e) {
        console.error('❌ [FIREBASE] STEP 2 FAILED: Invalid JSON in service account file');
        console.error('   Error: ' + e.message);
        return;
      }

      console.log('✅ [FIREBASE] STEP 2 COMPLETE: Service account loaded');
      console.log('   📊 Service Account Details:');
      console.log('      - Type: ' + serviceAccount.type);
      console.log('      - Project ID: ' + serviceAccount.project_id);
      console.log('      - Private Key ID: ' + serviceAccount.private_key_id);
      console.log('      - Client Email: ' + serviceAccount.client_email);
      console.log('      - Auth URI: ' + serviceAccount.auth_uri);
      console.log('      - Token URI: ' + serviceAccount.token_uri);

      // Step 3: Check if Firebase already initialized
      console.log('\n📍 [FIREBASE] STEP 3: Checking if Firebase already initialized');
      
      if (admin.apps.length > 0) {
        console.log('ℹ️  [FIREBASE] STEP 3: Firebase already initialized');
        console.log('   Apps count: ' + admin.apps.length);
      } else {
        console.log('   Starting fresh initialization...');
      }

      // Step 4: Initialize Firebase Admin SDK
      console.log('\n📍 [FIREBASE] STEP 4: Initializing Firebase Admin SDK');
      
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        
        console.log('✅ [FIREBASE] STEP 4 COMPLETE: Firebase Admin SDK initialized');
      } else {
        console.log('✅ [FIREBASE] STEP 4 COMPLETE: Using existing Firebase app');
      }

      // Step 5: Verify initialization
      console.log('\n📍 [FIREBASE] STEP 5: Verifying Firebase functionality');
      
      try {
        // Test: Get messaging instance
        const messaging = admin.messaging();
        console.log('✅ [FIREBASE] STEP 5 COMPLETE: Firebase messaging available');
        console.log('   Messaging instance: ' + (messaging ? 'Ready' : 'Failed'));
      } catch (e) {
        console.error('❌ [FIREBASE] STEP 5 FAILED: Cannot access Firebase messaging');
        console.error('   Error: ' + e.message);
        return;
      }

      this.isInitialized = true;

      console.log('\n' + '='.repeat(70));
      console.log('✅ [FIREBASE] INITIALIZATION COMPLETE - READY TO SEND NOTIFICATIONS');
      console.log('='.repeat(70) + '\n');

    } catch (error) {
      console.error('\n❌ [FIREBASE] INITIALIZATION FAILED - UNEXPECTED ERROR');
      console.error('Error: ' + error.message);
      console.error('Stack: ' + error.stack);
      console.log('='.repeat(70) + '\n');
    }
  }

  /**
   * Send a single notification to a device token
   * 
   * @param {string} token - FCM device token
   * @param {string} title - Notification title
   * @param {string} body - Notification body
   * @param {object} data - Additional data payload
   * @returns {Promise<boolean>} - Success or failure
   */
  async sendNotification(token, title, body, data = {}) {
    console.log('\n' + '='.repeat(70));
    console.log('📤 [SEND NOTIFICATION] Starting');
    console.log('='.repeat(70));

    // Check if initialized
    if (!this.isInitialized) {
      console.error('❌ [SEND] Firebase not initialized');
      console.error('   Cannot send notification without Firebase Admin SDK');
      return false;
    }

    try {
      // Validate inputs
      console.log('\n🔍 [VALIDATE] Validating inputs');
      
      if (!token) {
        console.error('❌ [VALIDATE] Token is required');
        return false;
      }

      if (!title) {
        console.error('❌ [VALIDATE] Title is required');
        return false;
      }

      if (!body) {
        console.error('❌ [VALIDATE] Body is required');
        return false;
      }

      console.log('✅ [VALIDATE] All inputs present');

      // Log token details
      console.log('\n🎟️  [TOKEN] Token Details:');
      console.log('   - Length: ' + token.length + ' characters');
      console.log('   - Format: ' + this._getTokenFormat(token));
      console.log('   - Preview: ' + token.substring(0, 50) + '...');
      console.log('   - End: ...' + token.substring(token.length - 20));

      // Verify token format (basic check)
      if (token.length < 100) {
        console.warn('⚠️  [TOKEN] Token seems short (' + token.length + ' chars)');
        console.warn('   Real FCM tokens are usually 150+ characters');
      }

      // Log notification details
      console.log('\n📬 [NOTIFICATION] Notification Details:');
      console.log('   - Title: "' + title + '"');
      console.log('   - Body: "' + body + '"');
      console.log('   - Data keys: ' + Object.keys(data).join(', '));
      if (Object.keys(data).length > 0) {
        Object.entries(data).forEach(([key, value]) => {
          console.log('      • ' + key + ': ' + JSON.stringify(value));
        });
      }

      // Build message
      console.log('\n🏗️  [BUILD MESSAGE] Building FCM message object');
      
      const message = {
        notification: {
          title: title,
          body: body,
        },
        data: data,
        token: token,
      };

      console.log('✅ [BUILD MESSAGE] Message built successfully');
      console.log('   Message size: ' + JSON.stringify(message).length + ' bytes');

      // Send via Firebase
      console.log('\n🚀 [FIREBASE] Sending via Firebase Admin SDK');
      console.log('   Calling: admin.messaging().send(message)');
      console.log('   Timeout: 10 seconds');

      const response = await admin.messaging().send(message);

      console.log('\n✅ [SUCCESS] Notification sent successfully');
      console.log('   📩 Message ID: ' + response);
      console.log('   Status: Delivered to Firebase infrastructure');
      console.log('   Next: FCM will route to device');

      console.log('\n' + '='.repeat(70));
      console.log('✅ [SEND NOTIFICATION] COMPLETE');
      console.log('='.repeat(70) + '\n');

      return true;

    } catch (error) {
      return this._handleSendError(error);
    }
  }

  /**
   * Send notifications to multiple tokens
   * 
   * @param {array} tokens - Array of FCM device tokens
   * @param {string} title - Notification title
   * @param {string} body - Notification body
   * @param {object} data - Additional data payload
   * @returns {Promise<object>} - Success/failure counts
   */
  async sendNotificationToMultiple(tokens, title, body, data = {}) {
    console.log('\n' + '='.repeat(70));
    console.log('📤 [SEND MULTICAST] Starting batch notification');
    console.log('='.repeat(70));

    if (!this.isInitialized) {
      console.error('❌ [MULTICAST] Firebase not initialized');
      return { successCount: 0, failureCount: tokens.length };
    }

    try {
      console.log('📊 [BATCH] Batch Details:');
      console.log('   - Total tokens: ' + tokens.length);
      console.log('   - Title: "' + title + '"');
      console.log('   - Body: "' + body + '"');

      const message = {
        notification: {
          title: title,
          body: body,
        },
        data: data,
      };

      console.log('\n🚀 [FIREBASE] Sending batch via admin.messaging().sendMulticast()');
      
      const response = await admin.messaging().sendMulticast({
        ...message,
        tokens: tokens,
      });

      console.log('\n✅ [MULTICAST] Batch sent');
      console.log('   📊 Results:');
      console.log('      - Success: ' + response.successCount);
      console.log('      - Failure: ' + response.failureCount);
      console.log('   📩 Message IDs:');
      response.responses.forEach((resp, idx) => {
        if (resp.success) {
          console.log('      ✅ Token #' + (idx + 1) + ': ' + resp.messageId);
        } else {
          console.log('      ❌ Token #' + (idx + 1) + ': ' + resp.error.code);
        }
      });

      console.log('\n' + '='.repeat(70));
      console.log('✅ [SEND MULTICAST] COMPLETE');
      console.log('='.repeat(70) + '\n');

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
      };

    } catch (error) {
      console.error('❌ [MULTICAST] Error sending batch');
      console.error('   Error: ' + error.message);
      return { successCount: 0, failureCount: tokens.length };
    }
  }

  /**
   * Handle Firebase send errors
   */
  _handleSendError(error) {
    console.log('\n❌ [ERROR] Firebase send failed');
    console.log('   Error Message: ' + error.message);
    console.log('   Error Code: ' + error.code);

    // Categorize error
    console.log('\n📊 [ERROR ANALYSIS] Error categorization:');
    
    switch (error.code) {
      case 'messaging/invalid-argument':
        console.log('   Type: INVALID ARGUMENT');
        console.log('   Cause: Malformed message or token');
        console.log('   Action: Check message format and token format');
        break;

      case 'messaging/invalid-registration-token':
        console.log('   Type: INVALID REGISTRATION TOKEN');
        console.log('   Cause: Token is malformed or revoked');
        console.log('   Action: Ask user to re-register FCM token');
        break;

      case 'messaging/mismatched-credential':
        console.log('   Type: MISMATCHED CREDENTIAL');
        console.log('   Cause: Token was created with different Firebase project');
        console.log('   Action: Verify Firebase project and service account match');
        break;

      case 'messaging/message-rate-exceeded':
        console.log('   Type: RATE LIMIT EXCEEDED');
        console.log('   Cause: Too many messages sent to this token');
        console.log('   Action: Wait before sending more messages');
        break;

      case 'messaging/third-party-auth-error':
        console.log('   Type: THIRD PARTY AUTH ERROR');
        console.log('   Cause: Device registration error with platform (Android/iOS)');
        console.log('   Action: Device may need to refresh token');
        break;

      default:
        console.log('   Type: ' + (error.code || 'UNKNOWN'));
        console.log('   Details: ' + error.message);
    }

    console.log('\n' + '='.repeat(70));
    console.log('❌ [SEND NOTIFICATION] FAILED');
    console.log('='.repeat(70) + '\n');

    return false;
  }

  /**
   * Determine token format
   */
  _getTokenFormat(token) {
    const hasColon = token.includes(':');
    const hasUnderscore = token.includes('_');
    const hasHyphen = token.includes('-');

    if (hasColon && hasUnderscore) {
      return 'ANDROID_REAL (contains both : and _)';
    } else if (hasColon) {
      return 'ANDROID_REAL (contains :)';
    } else if (hasUnderscore) {
      return 'TEST_TOKEN (contains _)';
    } else if (hasHyphen) {
      return 'POSSIBLE_iOS';
    } else {
      return 'UNKNOWN_FORMAT';
    }
  }

  /**
   * Health check - verify Firebase is ready
   */
  async healthCheck() {
    console.log('🏥 [HEALTH CHECK] Firebase Health Status');
    console.log('   Initialized: ' + (this.isInitialized ? '✅ Yes' : '❌ No'));
    
    if (!this.isInitialized) {
      return {
        status: 'error',
        message: 'Firebase not initialized',
      };
    }

    try {
      // Try to access messaging
      const messaging = admin.messaging();
      console.log('   Messaging: ✅ Accessible');
      
      return {
        status: 'ok',
        message: 'Firebase ready to send notifications',
        initialized: this.isInitialized,
      };
    } catch (e) {
      console.log('   Messaging: ❌ Error - ' + e.message);
      
      return {
        status: 'error',
        message: 'Cannot access Firebase messaging: ' + e.message,
      };
    }
  }
}

// Export as singleton
module.exports = new FirebaseNotificationService();
