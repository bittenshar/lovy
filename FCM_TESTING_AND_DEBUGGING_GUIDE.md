# FCM Testing & Debugging Guide
**Step-by-Step Testing with Debug Output Verification**

---

## 📋 Complete Testing Workflow

### Phase 1: Backend Setup Verification (5 minutes)

**Step 1.1: Check Firebase Service Account**

```bash
# Terminal: Navigate to backend
cd /Users/mrmad/Dhruv/dhruvbackend

# Verify service account exists
ls -la firebase-service-account.json

# Expected output:
# -rw-r--r--  1 user  group  2500 Dec  9 12:34 firebase-service-account.json

# Verify it's valid JSON
cat firebase-service-account.json | jq .

# Expected output should show:
# {
#   "type": "service_account",
#   "project_id": "work-connect-nodejs",
#   "private_key_id": "...",
#   "private_key": "...",
#   "client_email": "firebase-adminsdk-fbsvc@work-connect-nodejs.iam.gserviceaccount.com",
#   ...
# }
```

✅ **Success Criteria:**
- [ ] File exists in backend root
- [ ] File is valid JSON
- [ ] project_id is "work-connect-nodejs"
- [ ] client_email contains "firebase-adminsdk"

**Step 1.2: Verify .gitignore**

```bash
# Check if service account is in .gitignore
grep "firebase-service-account" .gitignore

# Expected output:
# firebase-service-account.json

# If not present, add it
echo "firebase-service-account.json" >> .gitignore
```

**Step 1.3: Check npm Dependencies**

```bash
# Verify firebase-admin is installed
npm list firebase-admin

# Expected output (shows version):
# firebase-admin@12.0.0
```

✅ **Success Criteria:**
- [ ] firebase-admin version 12.0.0 or higher
- [ ] No peer dependency warnings

---

### Phase 2: Backend Startup (3 minutes)

**Step 2.1: Start the Backend Server**

```bash
# From backend directory
npm start

# Expected output should include:
# 🔥 [FIREBASE] SERVICE INITIALIZATION
# ====================================================================
# 🔄 [FIREBASE] Checking Firebase initialization status...
# 
# 📍 [FIREBASE] STEP 1: Verifying service account file
#    Path: /Users/mrmad/Dhruv/dhruvbackend/firebase-service-account.json
# ✅ [FIREBASE] STEP 1 COMPLETE: File found
# 
# 📍 [FIREBASE] STEP 2: Loading service account JSON
# ✅ [FIREBASE] STEP 2 COMPLETE: Service account loaded
#    📊 Service Account Details:
#       - Type: service_account
#       - Project ID: work-connect-nodejs
#       - Private Key ID: [ID]
#       - Client Email: firebase-adminsdk-fbsvc@work-connect-nodejs.iam.gserviceaccount.com
# 
# 📍 [FIREBASE] STEP 3: Checking if Firebase already initialized
#    Starting fresh initialization...
# 
# 📍 [FIREBASE] STEP 4: Initializing Firebase Admin SDK
# ✅ [FIREBASE] STEP 4 COMPLETE: Firebase Admin SDK initialized
# 
# 📍 [FIREBASE] STEP 5: Verifying Firebase functionality
# ✅ [FIREBASE] STEP 5 COMPLETE: Firebase messaging available
#    Messaging instance: Ready
# 
# ✅ [FIREBASE] INITIALIZATION COMPLETE - READY TO SEND NOTIFICATIONS
# ====================================================================
```

✅ **Success Criteria:**
- [ ] No "❌" error messages
- [ ] All 5 STEPS complete
- [ ] "Firebase messaging available: Ready"
- [ ] "READY TO SEND NOTIFICATIONS"

**If it fails:**
```
❌ [FIREBASE] STEP 1 FAILED: Service account file NOT found
   Expected at: /Users/mrmad/Dhruv/dhruvbackend/firebase-service-account.json

FIX:
1. Download firebase-service-account.json from Firebase Console
2. Place in backend root directory
3. Add to .gitignore
4. Restart server
```

---

### Phase 3: Flutter App Setup (10 minutes)

**Step 3.1: Verify Flutter Dependencies**

```bash
cd /Users/mrmad/Dhruv/dhruvflutter

# Check pubspec.yaml has required packages
grep -A 5 "firebase_core\|firebase_messaging" pubspec.yaml

# Expected output:
# firebase_core: ^2.24.0
# firebase_messaging: ^14.6.0
# flutter_local_notifications: ^14.0.0

# Run pub get
flutter pub get

# Expected output includes:
# ✓ Run `flutter pub get` to update your packages
```

✅ **Success Criteria:**
- [ ] firebase_core: ^2.24.0 (or higher)
- [ ] firebase_messaging: ^14.6.0 (or higher)
- [ ] flutter_local_notifications: ^14.0.0 (or higher)

**Step 3.2: Verify google-services.json**

```bash
# Check file exists
ls -la android/app/google-services.json

# Expected output:
# -rw-r--r--  1 user  group  3000 Dec  9 12:34 google-services.json

# Verify it's valid JSON
cat android/app/google-services.json | jq .

# Check it has correct package name
grep -i "package_name" android/app/google-services.json

# Expected: Should match your app's package name
```

✅ **Success Criteria:**
- [ ] File exists at android/app/google-services.json
- [ ] File is valid JSON
- [ ] package_name matches Android app package

**Step 3.3: Verify Android Configuration**

```bash
# Check Android build.gradle includes Google services plugin
grep "com.google.gms:google-services" android/build.gradle

# Expected output:
# classpath 'com.google.gms:google-services:4.4.2'

# Check android/app/build.gradle applies plugin
grep "com.google.gms.google-services" android/app/build.gradle

# Expected output:
# apply plugin: 'com.google.gms.google-services'
```

✅ **Success Criteria:**
- [ ] Google services classpath in android/build.gradle
- [ ] Plugin applied in android/app/build.gradle

**Step 3.4: Check AndroidManifest Permissions**

```bash
# Verify notification permission
grep "POST_NOTIFICATIONS" android/app/src/main/AndroidManifest.xml

# Expected output:
# <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

✅ **Success Criteria:**
- [ ] POST_NOTIFICATIONS permission present

---

### Phase 4: FCM Service File Verification (5 minutes)

**Step 4.1: Verify FCMService File**

```bash
# Check if FCMService exists
ls -la lib/services/fcm_service.dart

# Expected output:
# -rw-r--r--  1 user  group  8500 Dec  9 12:34 fcm_service.dart

# Verify it has the initialize method
grep -n "Future<void> initFCM" lib/services/fcm_service.dart

# Expected output:
# 45:  Future<void> initFCM({
```

✅ **Success Criteria:**
- [ ] File exists at lib/services/fcm_service.dart
- [ ] Contains initFCM method
- [ ] File size > 5KB (has comprehensive debug code)

---

### Phase 5: End-to-End Test (15 minutes)

**Step 5.1: Start Backend**

```bash
# Terminal 1: Backend
cd /Users/mrmad/Dhruv/dhruvbackend
npm start

# Should show Firebase initialization success
```

**Step 5.2: Build and Run Flutter App**

```bash
# Terminal 2: Flutter
cd /Users/mrmad/Dhruv/dhruvflutter

# Clean and rebuild
flutter clean
flutter pub get
flutter run --debug

# Expected output (first 30 seconds):
# Launching lib/main.dart on Android emulator...
# ✅ [MAIN] Initializing Firebase...
# ✅ [MAIN] Firebase initialized successfully
# ✅ [MAIN] Background message handler set
```

✅ **Success Criteria:**
- [ ] App launches successfully
- [ ] Firebase initialization logs appear (✅ markers)
- [ ] No "❌" error messages during startup

**Step 5.3: User Login**

In the app:
1. Navigate to login screen
2. Enter test credentials
3. Click login

Expected logs:

```
# From Flutter:
🔐 [AUTH] User attempting to login...
✅ [AUTH] Login successful
🔥 [AUTH] Initializing FCM post-login...
🔥 [FCM] INITIALIZATION START
================================
   👤 User ID: user_123
   🔗 Backend URL: http://10.0.2.2:3000/api
   🔐 Auth Token: eyJhbG...

📋 [FCM] STEP 1: Requesting notification permissions...
✅ [FCM] STEP 1 COMPLETE: Permissions granted

🎟️  [FCM] STEP 2: Getting FCM token from Firebase...
✅ [FCM] STEP 2 COMPLETE: FCM Token obtained
   📊 Token Statistics:
      - Length: 152 characters
      - Has colon separator: true
      - Has underscore separator: true
      - Preview: dFxV0-xAOVvx_d6w8wV9q0:APA91bHR9V1MXpLt7jKqB9...

💾 [FCM] STEP 3: Saving token to local storage...
✅ [FCM] STEP 3 COMPLETE: Token saved to SharedPreferences

📤 [FCM] STEP 4: Registering token with backend...
   Endpoint: http://10.0.2.2:3000/api/notifications/register-token
   Method: POST
   Auth: Bearer [JWT]
   📝 Preparing request body:
      - fcmToken: dFxV0-xAOVvx_d6w8wV9q0:APA91bH... (152 chars)
      - userId: user_123
      - platform: android
   📊 Backend Response:
      - Status Code: 200
      - Body: {"status":"success","message":"FCM token registered successfully",...}
✅ [FCM] STEP 4 COMPLETE: Token registered successfully

👂 [FCM] STEP 5: Setting up message listeners...
✅ [FCM] STEP 5 COMPLETE: Message listeners configured

✅ [FCM] INITIALIZATION COMPLETE - READY FOR NOTIFICATIONS

# From Backend (simultaneously):
📝 [REGISTER TOKEN ENDPOINT] Incoming request

📋 [REQUEST] Request Details:
   - Method: POST
   - Endpoint: /api/notifications/register-token
   - Auth: ✅ Present
   - Content-Type: application/json

📊 [BODY] Request Body:
   - fcmToken: ✅ Present (152 chars)
   - userId: ✅ Present
   - platform: ✅ android

🔍 [VALIDATE] Validating inputs
✅ [VALIDATE] All inputs present

🎟️  [TOKEN] Token Format Validation:
   - Length: 152 chars
   - Has colon (:): ✅ Yes
   - Has underscore (_): ✅ Yes
   - Preview: dFxV0-xAOVvx_d6w8wV9q0:APA91bHR9V1...
✅ [TOKEN] Token format validation passed

🔍 [DATABASE] Looking up user
   Query: User.findById("user_123")
✅ [DATABASE] User found
   - ID: user_123
   - Email: user@email.com

💾 [UPDATE] Updating user FCM token
   - Setting fcmToken to: dFxV0-xAOVvx_d6w8wV9q0:APA91bH...
   - Setting platform to: android
   Calling user.save()...
✅ [UPDATE] User saved successfully
   - Token saved: ✅ Yes
   - Platform saved: ✅ android

✅ [SUCCESS] Token registered successfully
```

✅ **Success Criteria:**
- [ ] Firebase login successful (✅ markers in Flutter logs)
- [ ] Both Flutter and Backend show all 5 FCM STEPS as ✅
- [ ] Backend saves token to database
- [ ] No ❌ errors throughout

**If it fails at Step 2 (Token null):**
```
❌ [FCM] STEP 2 FAILED: Token is null
Possible causes:
1. Firebase not initialized in main.dart
2. Incorrect google-services.json
3. Package name mismatch

Fix:
1. Check main.dart has: await Firebase.initializeApp()
2. Verify google-services.json package_name matches
3. Clean and rebuild: flutter clean && flutter pub get && flutter run
```

---

### Phase 6: Send Test Notification (5 minutes)

**Step 6.1: Get User ID**

From the previous step, note the user_123 ID.

**Step 6.2: Send Test Notification via Backend**

```bash
# Terminal 3: Test endpoint
# Get auth token first (log in via Postman or use from your app)

curl -X POST http://localhost:3000/api/notifications/test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "userId": "user_123"
  }'

# Expected response:
# {
#   "status": "success",
#   "message": "Test notification sent successfully",
#   "data": {
#     "userId": "user_123",
#     "email": "user@email.com",
#     "tokenPreview": "dFxV0-xAOVvx_d6w8wV9q0:APA91bHR9V1...",
#     "platform": "android",
#     "notificationType": "test"
#   }
# }

# Backend logs should show:
# 🧪 [TEST NOTIFICATION] Manual test endpoint called
# 
# 🔍 [DATABASE] Looking up user
# ✅ [DATABASE] User found: user@email.com
# 
# 🎟️  [TOKEN] Checking if user has FCM token
# ✅ [TOKEN] User has FCM token
#    Token: dFxV0-xAOVvx_d6w8wV9q0:APA91bHR9V1...
#    Length: 152 chars
#    Platform: android
# 
# 📤 [SEND] Sending test notification via Firebase
# ============================================================
# 📤 [SEND NOTIFICATION] Starting
# ============================================================
# 
# 🔍 [VALIDATE] Validating inputs
# ✅ [VALIDATE] All inputs present
# 
# 🎟️  [TOKEN] Token Details:
#    - Length: 152 characters
#    - Format: ANDROID_REAL (contains both : and _)
#    - Preview: dFxV0-xAOVvx_d6w8wV9q0:APA91bHR9V1...
# 
# 📬 [NOTIFICATION] Notification Details:
#    - Title: "🧪 Test Notification"
#    - Body: "This is a test notification from your Work Connect backend!"
#    - Data keys: type, timestamp, userId, testId
# 
# 🚀 [FIREBASE] Sending via Firebase Admin SDK
# ✅ [SUCCESS] Notification sent successfully
#    📩 Message ID: 0:1701234567890123%abcd1234ef
#    Status: Delivered to Firebase infrastructure
# 
# ============================================================
# ✅ [SEND NOTIFICATION] COMPLETE
```

✅ **Success Criteria:**
- [ ] Backend returns 200 status
- [ ] Message ID received from Firebase
- [ ] Backend logs show ✅ SUCCESS

**Step 6.3: Check Device for Notification**

- If app is OPEN (foreground): Check app console logs
- If app is CLOSED: Check device notification tray

Expected Flutter logs (foreground):
```
📬 [FOREGROUND MESSAGE] App is OPEN, message received
   📩 Message ID: 0:1701234567890123%abcd1234ef
   📌 Notification:
      - Title: 🧪 Test Notification
      - Body: This is a test notification from your Work Connect backend!
   📊 Data Payload: {type: test, timestamp: ..., userId: user_123, testId: ...}
```

✅ **Success Criteria:**
- [ ] Notification appears on device (foreground or system)
- [ ] Flutter logs show message received
- [ ] Notification can be tapped/interacted with

---

## 🔧 Debugging Common Issues

### Issue 1: "Firebase not initialized"

**Symptoms:**
```
❌ [FIREBASE] STEP 1 FAILED: Service account file NOT found
```

**Debug Steps:**
```bash
# Check file exists
ls -la firebase-service-account.json

# Check it's valid JSON
cat firebase-service-account.json | jq . > /dev/null && echo "Valid JSON" || echo "Invalid JSON"

# Check path is correct
pwd  # Should be /Users/mrmad/Dhruv/dhruvbackend
```

**Fix:**
```bash
# Download from Firebase Console → Project Settings → Service Accounts
# Save as firebase-service-account.json in backend root
# Restart backend: npm start
```

---

### Issue 2: "FCM token is null"

**Symptoms:**
```
❌ [FCM] STEP 2 FAILED: Token is null
```

**Debug Steps:**
```bash
# Check main.dart Firebase initialization
grep -A 3 "await Firebase.initializeApp" lib/main.dart

# Check google-services.json exists
ls -la android/app/google-services.json

# Check package name matches
grep "package=" android/app/src/main/AndroidManifest.xml
grep "package_name" android/app/google-services.json
```

**Fix:**
```bash
# Clean and rebuild
flutter clean
flutter pub get
flutter run --debug
```

---

### Issue 3: "Backend request failed with 401"

**Symptoms:**
```
Response status: 401
Response body: {"error":"Unauthorized"}
```

**Debug Steps:**
```bash
# Check auth token is being sent
# Add logging to FCM service:
console.log('Auth header: ' + authToken.substring(0, 20) + '...');

# Verify JWT token is valid
# Token should be obtained after successful login
```

**Fix:**
```dart
// In auth_provider.dart, verify token is saved:
final authToken = await getAuthToken();  // Should not be null
print('Auth token: $authToken');
```

---

### Issue 4: "Token format invalid"

**Symptoms:**
```
❌ [TOKEN] Token missing separators (: or _)
```

**Debug Steps:**
```
Token preview shows: abc123defg456
Expected format: Contains at least : or _
Actual format: Missing both separators
```

**Cause:** Firebase didn't return a real token. Usually happens with test tokens or malformed data.

**Fix:**
```dart
// In FCMService, add validation:
if (!token.contains(':') && !token.contains('_')) {
  print('⚠️  Token format suspicious, might be test/mock token');
  print('   Length: ${token.length}');
  print('   This is OK for testing, but real tokens have separators');
}
```

---

## ✅ Full Success Checklist

- [ ] **Backend Firebase**
  - [ ] firebase-service-account.json exists and is valid
  - [ ] Service account in .gitignore
  - [ ] npm start shows all ✅ Firebase initialization steps
  - [ ] No ❌ errors during startup

- [ ] **Flutter Dependencies**
  - [ ] firebase_core, firebase_messaging, flutter_local_notifications added
  - [ ] flutter pub get completed
  - [ ] google-services.json in android/app/
  - [ ] Android build.gradle configured

- [ ] **FCM Initialization**
  - [ ] main.dart calls Firebase.initializeApp()
  - [ ] FCMService.initFCM() called AFTER login
  - [ ] All 5 steps show ✅ in logs

- [ ] **Token Registration**
  - [ ] Backend receives POST request ✅
  - [ ] Token validated ✅
  - [ ] Stored in MongoDB ✅
  - [ ] Response 200 ✅

- [ ] **Send Test Notification**
  - [ ] Endpoint returns 200 ✅
  - [ ] Firebase Message ID received ✅
  - [ ] Device receives notification ✅
  - [ ] Foreground logs appear ✅

---

## 🎉 You're Done!

When all checkboxes are ✅, your Firebase FCM implementation is **fully working end-to-end**:

✅ Firebase → Node.js Backend → Flutter App → Device Notification

**What's Next:**
1. Integrate notifications into real business logic (job posts, applications)
2. Test different notification types
3. Implement notification history
4. Handle token refresh
5. Set up production environment
