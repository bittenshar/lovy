const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

// Load service account from root directory or environment variable
let serviceAccount;
let firebaseInitialized = false;
const serviceAccountPath = path.join(__dirname, "../../../../firebase-service-account.json");

try {
  // Try loading from root directory (local development)
  if (fs.existsSync(serviceAccountPath)) {
    serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    firebaseInitialized = true;
  } else if (process.env.FIREBASE_PROJECT_ID) {
    // Fallback: construct from environment variables (for deployment)
    serviceAccount = {
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL || ""
    };
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    firebaseInitialized = true;
  } else {
    console.warn("⚠️  Firebase service account not configured. Push notifications will be disabled.");
    firebaseInitialized = false;
  }
} catch (error) {
  console.warn(`⚠️  Firebase initialization failed: ${error.message}. Push notifications will be disabled.`);
  firebaseInitialized = false;
}

module.exports = {
  admin,
  isInitialized: firebaseInitialized
};


