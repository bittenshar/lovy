# Firebase Deployment Setup for Vercel

## Problem
Firebase Admin SDK requires service account credentials to initialize. The file-based approach doesn't work in Vercel's serverless environment.

## Solution
Use environment variables to provide Firebase credentials to Vercel.

## Steps

### 1. Get Your Firebase Service Account JSON

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click Settings (gear icon) → Project Settings
4. Go to "Service Accounts" tab
5. Click "Generate New Private Key"
6. A JSON file will download - keep this safe!

### 2. Convert JSON to Single-Line String

Open the downloaded JSON file and convert it to a single-line string (remove newlines):

**Option A: Using Terminal**
```bash
cat firebase-service-account.json | jq -c . | tr '\n' ' '
```

**Option B: Using Python**
```bash
python3 -c "import json; print(json.dumps(json.load(open('firebase-service-account.json'))))"
```

This will output a single-line JSON string like:
```
{"type":"service_account","project_id":"your-project","private_key":"-----BEGIN PRIVATE KEY-----\n...","client_email":"firebase-adminsdk@...","client_id":"..."}
```

### 3. Set Environment Variable on Vercel

**Using Vercel Dashboard:**
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project (lovy-dusky)
3. Click "Settings"
4. Go to "Environment Variables"
5. Add new variable:
   - **Name:** `FIREBASE_SERVICE_ACCOUNT`
   - **Value:** Paste the single-line JSON string from Step 2
   - **Select:** Production, Preview, Development (select all)
6. Click "Save"

**Using Vercel CLI:**
```bash
vercel env add FIREBASE_SERVICE_ACCOUNT
# Paste the single-line JSON string when prompted
```

### 4. Redeploy Your Application

After setting the environment variable, redeploy:

```bash
# Option 1: Push to GitHub (if connected)
git add .
git commit -m "Update Firebase configuration for Vercel"
git push

# Option 2: Using Vercel CLI
vercel --prod
```

### 5. Verify Firebase is Initialized

After deployment, check the logs:
```bash
vercel logs https://lovy-dusky.vercel.app
```

You should see:
```
✅ Firebase Admin SDK initialized successfully
📱 Project ID: your-project-id
```

## Troubleshooting

### "Cannot find module 'firebase-service-account.json'"
- ✅ **Fixed** - Code now checks environment variable first
- Make sure `FIREBASE_SERVICE_ACCOUNT` is set in Vercel dashboard
- Redeploy after setting the variable

### "The default Firebase app does not exist"
- Firebase initialization failed
- Check the environment variable is set correctly
- Verify the JSON string is valid (no line breaks)
- Check Vercel logs for parsing errors

### "FirebaseMessagingError: Invalid credential"
- The service account JSON is invalid or from wrong Firebase project
- Get a new service account from Firebase Console
- Verify project ID matches your Firebase project

## Security Notes

⚠️ **Important:**
- Never commit `firebase-service-account.json` to version control
- The JSON string contains sensitive credentials
- Keep it in Vercel environment variables only
- Rotate the key periodically in Firebase Console

## Code Changes Made

The backend now supports both approaches:

**Local Development (Development):**
- Uses `firebase-service-account.json` file in project root

**Production (Vercel):**
- Uses `FIREBASE_SERVICE_ACCOUNT` environment variable
- Falls back to file if variable not set (for compatibility)

```javascript
// firebase-admin.js
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  // Production: Load from environment variable
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
  // Development: Load from file
  serviceAccount = require(serviceAccountPath);
}
```

## Next Steps

After Firebase is initialized:
1. Messages will be sent with FCM notifications
2. Users will receive push notifications on their devices
3. Check app logs to verify notifications are being received

## Additional Resources

- [Firebase Admin SDK Documentation](https://firebase.google.com/docs/admin/setup)
- [Vercel Environment Variables](https://vercel.com/docs/environment-variables)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
