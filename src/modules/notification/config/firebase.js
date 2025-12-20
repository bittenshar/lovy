const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

// Load service account from root directory or environment variable
let serviceAccount;
let firebaseInitialized = false;

// Try multiple path strategies
const possiblePaths = [
  // Strategy 1: Relative to current file (src/modules/notification/config/firebase.js)
  path.resolve(__dirname, "../../../../firebase-service-account.json"),
  // Strategy 2: Relative to process.cwd() (project root)
  path.resolve(process.cwd(), "firebase-service-account.json"),
  // Strategy 3: Absolute path if provided
  "/app/firebase-service-account.json"
];

console.error('[FIREBASE-INIT] Starting Firebase initialization...');
console.error('[FIREBASE-INIT] Current working directory:', process.cwd());
console.error('[FIREBASE-INIT] __dirname:', __dirname);

try {
  let foundPath = null;
  
  // Try loading from file first
  for (const filePath of possiblePaths) {
    console.error(`[FIREBASE-INIT] Trying path: ${filePath}`);
    if (fs.existsSync(filePath)) {
      console.error(`[FIREBASE-INIT] ✅ Found firebase config at: ${filePath}`);
      foundPath = filePath;
      break;
    }
  }

  if (foundPath) {
    try {
      serviceAccount = JSON.parse(fs.readFileSync(foundPath, 'utf8'));
      console.error('[FIREBASE-INIT] ✅ Firebase service account loaded from file');
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      firebaseInitialized = true;
      console.error('[FIREBASE-INIT] ✅ Firebase Admin initialized successfully');
    } catch (fileError) {
      console.warn(`[FIREBASE-INIT] ⚠️  Failed to parse firebase config file: ${fileError.message}`);
      throw fileError;
    }
  } else if (process.env.FIREBASE_PROJECT_ID) {
    // Fallback: construct from environment variables (for deployment)
    console.error('[FIREBASE-INIT] No file found, using environment variables...');
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
    console.error('[FIREBASE-INIT] ✅ Firebase Admin initialized from environment variables');
  } else {
    console.warn("⚠️  Firebase service account not configured. Push notifications will be disabled.");
    firebaseInitialized = false;
  }
} catch (error) {
  console.warn(`⚠️  Firebase initialization failed: ${error.message}. Push notifications will be disabled.`);
  console.error('[FIREBASE-INIT] Error stack:', error.stack);
  firebaseInitialized = false;
}

module.exports = {
  admin,
  isInitialized: firebaseInitialized
};


