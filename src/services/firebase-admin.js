/**
 * Firebase Admin SDK Initialization
 * Initializes Firebase Admin SDK with service account credentials
 * Supports both file-based (local dev) and environment variable (production) approaches
 */

const admin = require('firebase-admin');
const path = require('path');

let isInitialized = false;
let initError = null;

/**
 * Initialize Firebase Admin SDK
 */
function initializeFirebase() {
  if (isInitialized) {
    return admin;
  }

  try {
    let serviceAccount;

    // Try environment variable first (for Vercel/production)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      console.log('📝 Loading Firebase credentials from environment variable...');
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } else {
      // Fall back to file-based approach (for local development)
      console.log('📝 Loading Firebase credentials from file...');
      const serviceAccountPath = path.join(__dirname, '../../firebase-service-account.json');
      serviceAccount = require(serviceAccountPath);
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });

    isInitialized = true;
    console.log('✅ Firebase Admin SDK initialized successfully');
    console.log(`📱 Project ID: ${serviceAccount.project_id}`);
    return admin;
  } catch (error) {
    initError = error;
    console.error('❌ Failed to initialize Firebase Admin SDK:', error.message);
    console.error('⚠️  Make sure FIREBASE_SERVICE_ACCOUNT environment variable is set in production');
    return null;
  }
}

/**
 * Check if Firebase is ready
 * @returns {boolean}
 */
function isFirebaseReady() {
  return isInitialized && !initError;
}

/**
 * Get Firebase Admin instance
 * @returns {object} - Firebase admin instance or null if not initialized
 */
function getFirebaseAdmin() {
  if (!isInitialized) {
    initializeFirebase();
  }
  return admin;
}

// Initialize on module load
initializeFirebase();

module.exports = {
  admin,
  isFirebaseReady,
  getFirebaseAdmin,
  isInitialized: () => isInitialized,
};
