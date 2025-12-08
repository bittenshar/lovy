📱 Firebase Setup Guide for Your Node.js Backend

═══════════════════════════════════════════════════════════════════════

🔧 STEP 1: Get Firebase Service Account Key

1. Go to: https://console.firebase.google.com/
2. Select your project
3. Click ⚙️ (Settings) → Project Settings
4. Click "Service Accounts" tab
5. Click "Generate New Private Key"
6. A JSON file will download (firebase-service-account.json)

═══════════════════════════════════════════════════════════════════════

📁 STEP 2: Place the Service Account File

Copy the downloaded JSON file to your project root:

/Users/mrmad/Dhruv/dhruvbackend/
├── firebase-service-account.json ← Put it here
├── src/
├── package.json
└── ...

⚠️ IMPORTANT: Add to .gitignore so it doesn't get committed:

cat >> .gitignore << 'EOF'
# Firebase
firebase-service-account.json
.env
EOF

═══════════════════════════════════════════════════════════════════════

⚙️ STEP 3: Update Environment Variables

Add to your .env file (optional - can use default path):

FIREBASE_SERVICE_ACCOUNT_PATH=/Users/mrmad/Dhruv/dhruvbackend/firebase-service-account.json

═══════════════════════════════════════════════════════════════════════

✅ STEP 4: Verify Setup

Run your server to check if Firebase initializes:

npm run dev

Look for these messages:
✅ Firebase Admin SDK initialized successfully
✅ OneSignal service initialized

═══════════════════════════════════════════════════════════════════════

🔑 Your Service Account JSON Structure

The file looks like this (DON'T SHARE THIS):

{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "key-id",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com",
  "client_id": "1234567890",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "..."
}

═══════════════════════════════════════════════════════════════════════

📝 Current Firebase Setup in Your Code

Your backend already has:

1. Firebase Service: src/services/firebase-notification.service.js
   - Initializes Firebase Admin SDK
   - Sends FCM notifications
   - Handles device registration

2. Firebase Integration Points:
   - User model stores fcmToken
   - Notification system supports FCM
   - Fallback error handling

═══════════════════════════════════════════════════════════════════════

🚀 Firebase Features Available

✅ Send notifications to specific devices
✅ Send notifications to multiple devices
✅ Topic-based subscriptions
✅ Data-only messages
✅ Android, iOS, and Web support
✅ Scheduled messages
✅ Analytics tracking

═══════════════════════════════════════════════════════════════════════

🧪 Test Firebase Connection

After placing the service account file:

node -e "
const admin = require('firebase-admin');
const path = require('path');
const serviceAccount = require('./firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

console.log('✅ Firebase connected successfully!');
console.log('Project:', serviceAccount.project_id);
"

═══════════════════════════════════════════════════════════════════════

❓ FAQ

Q: Where do I get the service account key?
A: Firebase Console → ⚙️ Settings → Service Accounts → Generate Key

Q: Is it safe to commit this file?
A: NO! Add to .gitignore - it contains your private key

Q: What if I don't have it yet?
A: Firebase notifications won't work until you add it

Q: Can I use multiple Firebase projects?
A: Yes, but you need to manage multiple service accounts

═══════════════════════════════════════════════════════════════════════

✨ What You Get After Setup

✅ Firebase Admin SDK initialized
✅ Can send FCM push notifications
✅ Can register user devices
✅ Can track notification delivery
✅ Can send rich media notifications
✅ Full Firebase integration ready

═══════════════════════════════════════════════════════════════════════

📊 Push Notification Stack (After Setup)

Frontend (Mobile App)
        ↓
   Firebase SDK (gets FCM token)
        ↓
   Your Backend API (stores token)
        ↓
   Firebase Admin SDK (sends notification)
        ↓
   Firebase Cloud Messaging
        ↓
   User Device (receives push)

═══════════════════════════════════════════════════════════════════════

Created: December 9, 2025
