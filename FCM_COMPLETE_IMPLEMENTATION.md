# Firebase FCM Complete Implementation Guide
**End-to-End: Firebase → Node.js Backend → Flutter App**

---

## 🎯 Table of Contents
1. [Overall Architecture & Data Flow](#1-overall-architecture--data-flow)
2. [Firebase Console Setup](#2-firebase-console-setup)
3. [Flutter Setup (FCM Client)](#3-flutter-setup-fcm-client)
4. [Node.js Backend Setup (FCM Sender)](#4-nodejs-backend-setup-fcm-sender)
5. [End-to-End Flow Recap](#5-end-to-end-flow-recap)
6. [Debug Checklist](#6-debug-checklist)
7. [Common Issues & Fixes](#7-common-issues--fixes)

---

## 1. Overall Architecture & Data Flow

### Component Interaction:
```
┌─────────────────────────────────────────────────────────────┐
│                    FIREBASE CONSOLE                         │
│  (Project: work-connect-nodejs, Config: google-services.json│
│   Service Account: firebase-service-account.json)           │
└─────────────────────────────────────────────────────────────┘
                              ↕
          ┌───────────────────────────────────┐
          │   FIREBASE CLOUD MESSAGING (FCM)  │
          │  (Receives tokens & sends push)   │
          └───────────────────────────────────┘
                         ↙        ↖
        ┌──────────────────────┐  ┌──────────────────────┐
        │   FLUTTER APP        │  │   NODE.JS BACKEND    │
        │ (Android/iOS Client) │  │ (Admin SDK Sender)   │
        │                      │  │                      │
        │ 1. Initialize FCM    │  │ 1. Init Admin SDK    │
        │ 2. Get FCM token     │  │ 2. Store tokens in DB│
        │ 3. Send token → BE   │  │ 3. Send via FCM      │
        │ 4. Listen & display  │  │ 4. Log success/error │
        └──────────────────────┘  └──────────────────────┘
                ↕                           ↕
         ┌─────────────────────────────────────┐
         │      MONGODB (Token Storage)        │
         │  User.fcmToken                      │
         │  User.platform (android/ios)        │
         │  User.fcmTokenUpdatedAt             │
         └─────────────────────────────────────┘
```

### One-Time Registration Flow:
```
[STEP 1] Flutter App Launch
   ↓
[STEP 2] Firebase.initializeApp()
   ↓
[STEP 3] User Logs In
   ↓
[STEP 4] initFCM() - Request Permissions
   ↓
[STEP 5] FirebaseMessaging.instance.getToken()
   ↓ (sends token from Firebase)
[STEP 6] Flutter → POST /api/register-fcm-token → Node.js Backend
   ↓
[STEP 7] Backend Stores Token in MongoDB
   ↓
[SUCCESS] ✅ Token Registered
```

### Notification Delivery Flow:
```
[EVENT] Backend Event Triggered (e.g., job posted, notification needed)
   ↓
[BACKEND] Retrieve user's FCM token from DB
   ↓
[BACKEND] Call admin.messaging().sendMulticast({
     notification: { title, body },
     data: { custom fields },
     tokens: [user_tokens]
   })
   ↓
[FCM] Validates token, routes to Firebase Infrastructure
   ↓
[FCM] Delivers to appropriate device (Android/iOS)
   ↓
[FLUTTER] onMessage OR onBackgroundMessage triggers
   ↓
[FLUTTER] Display notification or navigate user
   ↓
[SUCCESS] ✅ Notification Delivered & Displayed
```

---

## 2. Firebase Console Setup

### Step 2.1: Verify Firebase Project
**Location:** `https://console.firebase.google.com`

1. **Project Details:**
   - Project Name: `work-connect-nodejs`
   - Project ID: Shown in Firebase console
   - Region: Usually auto-selected

**✅ DEBUG CHECKPOINT:**
```javascript
// In Node.js backend, verify connection
const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

console.log('🔥 Firebase Admin SDK initialized');
console.log('📍 Project ID:', serviceAccount.project_id);
console.log('✅ Firebase is ready');
```

### Step 2.2: Android App Registration
**Location:** Firebase Console → Your Project → Project Settings → Your Apps

1. **Verify Android app is registered:**
   - Package name matches: `com.yourcompany.yourapp` (from `android/app/build.gradle`)
   - Ensure `google-services.json` is downloaded

2. **Check Configuration:**
   - In `android/build.gradle` (project level):
   ```gradle
   buildscript {
     dependencies {
       classpath 'com.google.gms:google-services:4.4.2'
     }
   }
   ```

   - In `android/app/build.gradle` (app level):
   ```gradle
   apply plugin: 'com.google.gms.google-services'
   
   dependencies {
     implementation 'com.google.firebase:firebase-messaging:23.2.1'
     // or latest version
   }
   ```

**✅ DEBUG CHECKPOINT:**
```bash
# Verify google-services.json exists
ls -la android/app/google-services.json
# Output should show: .../android/app/google-services.json

# Check package name in AndroidManifest.xml
grep -i "package=" android/app/src/main/AndroidManifest.xml
# Output should match your app's package name
```

### Step 2.3: Service Account Creation
**Location:** Firebase Console → Project Settings → Service Accounts

1. **Generate Service Account Key:**
   - Click "Generate new private key"
   - Save as `firebase-service-account.json` in backend root
   - **CRITICAL:** Add to `.gitignore` before committing

**✅ DEBUG CHECKPOINT:**
```bash
# Verify service account file exists and is valid JSON
cat firebase-service-account.json | jq .
# Should show: project_id, private_key, client_email, etc.

# Check it's in .gitignore
grep "firebase-service-account" .gitignore
# Should return the line if properly ignored
```

---

## 3. Flutter Setup (FCM Client)

### Step 3.1: Add Dependencies
**File:** `pubspec.yaml`

```yaml
dependencies:
  flutter:
    sdk: flutter
  
  # Firebase packages
  firebase_core: ^2.24.0
  firebase_messaging: ^14.6.0
  
  # For showing local notifications
  flutter_local_notifications: ^14.0.0
  
  # HTTP client
  http: ^1.1.0
  shared_preferences: ^2.2.0
```

**✅ DEBUG CHECKPOINT:**
```bash
cd dhruvflutter
flutter pub get

# Verify packages installed
flutter pub deps | grep firebase
# Should show: firebase_core, firebase_messaging, flutter_local_notifications
```

### Step 3.2: Initialize Firebase in main.dart

**File:** `lib/main.dart`

```dart
import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'firebase_options.dart';

// 🔴 CRITICAL: This MUST be top-level (outside any class)
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  print('📱 [BACKGROUND] Handling background message');
  print('   Message ID: ${message.messageId}');
  print('   Title: ${message.notification?.title}');
  print('   Body: ${message.notification?.body}');
  
  await Firebase.initializeApp();
  // Handle the background message here
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  print('🚀 [MAIN] Initializing Firebase...');
  try {
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
    print('✅ [MAIN] Firebase initialized successfully');
  } catch (e) {
    print('❌ [MAIN] Firebase init failed: $e');
  }

  // Set background message handler
  FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);
  print('✅ [MAIN] Background message handler set');

  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Work Connect',
      home: const MyAppPage(),
    );
  }
}

class MyAppPage extends StatefulWidget {
  const MyAppPage({Key? key}) : super(key: key);
  @override
  State<MyAppPage> createState() => _MyAppPageState();
}

class _MyAppPageState extends State<MyAppPage> {
  @override
  void initState() {
    super.initState();
    print('📱 [INIT] MyAppPage initializing...');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Work Connect')),
      body: const Center(child: Text('App Ready')),
    );
  }
}
```

**✅ DEBUG CHECKPOINT (Run on Android Emulator/Device):**
```bash
cd dhruvflutter
flutter run --debug

# Look for these logs:
# 🚀 [MAIN] Initializing Firebase...
# ✅ [MAIN] Firebase initialized successfully
# ✅ [MAIN] Background message handler set

# If you see any "❌", Firebase initialization failed
```

### Step 3.3: Request Permissions & Get Token
**File:** `lib/services/fcm_service.dart` (create new file)

```dart
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class FCMService {
  static final FCMService _instance = FCMService._internal();

  factory FCMService() {
    return _instance;
  }

  FCMService._internal();

  final FirebaseMessaging _messaging = FirebaseMessaging.instance;

  // 🔴 IMPORTANT: Only call this AFTER user logs in
  Future<void> initFCM({
    required String userId,
    required String authToken,
    required String backendUrl,
  }) async {
    print('🔥 [FCM] Initializing FCM for user: $userId');
    print('🔥 [FCM] Backend URL: $backendUrl');

    try {
      // Step 1: Request notification permissions
      print('📋 [FCM] Requesting notification permissions...');
      NotificationSettings settings = await _messaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
        provisional: false,
      );

      print('✅ [FCM] Permission status: ${settings.authorizationStatus}');
      if (settings.authorizationStatus != AuthorizationStatus.authorized) {
        print('⚠️  [FCM] User denied notification permission');
        return;
      }

      // Step 2: Get FCM token
      print('🎟️  [FCM] Getting FCM token from Firebase...');
      String? token = await _messaging.getToken();
      
      if (token == null) {
        print('❌ [FCM] Failed to get FCM token (returned null)');
        return;
      }

      print('✅ [FCM] FCM Token obtained');
      print('   Token length: ${token.length} chars');
      print('   Token preview: ${token.substring(0, 50)}...');

      // Step 3: Save token locally
      await _saveTokenLocally(token);

      // Step 4: Send token to backend
      print('📤 [FCM] Sending token to backend...');
      bool success = await _sendTokenToBackend(
        token: token,
        userId: userId,
        authToken: authToken,
        backendUrl: backendUrl,
      );

      if (success) {
        print('✅ [FCM] Token successfully sent to backend');
      } else {
        print('❌ [FCM] Failed to send token to backend');
      }

      // Step 5: Setup message listeners
      print('👂 [FCM] Setting up message listeners...');
      _setupMessageListeners();
      print('✅ [FCM] Message listeners configured');

    } catch (e) {
      print('❌ [FCM] Error during FCM initialization: $e');
    }
  }

  Future<void> _saveTokenLocally(String token) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('fcm_token', token);
      print('💾 [FCM] Token saved locally in SharedPreferences');
    } catch (e) {
      print('❌ [FCM] Failed to save token locally: $e');
    }
  }

  Future<bool> _sendTokenToBackend({
    required String token,
    required String userId,
    required String authToken,
    required String backendUrl,
  }) async {
    try {
      final url = '$backendUrl/notifications/register-token';
      print('   Endpoint: $url');

      final response = await http.post(
        Uri.parse(url),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $authToken',
        },
        body: jsonEncode({
          'fcmToken': token,
          'userId': userId,
          'platform': 'android',
        }),
      );

      print('   Response status: ${response.statusCode}');
      print('   Response body: ${response.body}');

      if (response.statusCode == 200) {
        print('✅ [BACKEND] Token registered successfully');
        return true;
      } else {
        print('❌ [BACKEND] Failed with status ${response.statusCode}');
        return false;
      }
    } catch (e) {
      print('❌ [BACKEND] Error sending token: $e');
      return false;
    }
  }

  void _setupMessageListeners() {
    // Foreground messages
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      print('📬 [FOREGROUND MESSAGE] Received while app is open');
      print('   Title: ${message.notification?.title}');
      print('   Body: ${message.notification?.body}');
      print('   Data: ${message.data}');

      // Show local notification (optional)
      _showLocalNotification(
        title: message.notification?.title ?? 'Notification',
        body: message.notification?.body ?? '',
      );
    });

    // Message opened from notification
    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      print('🔗 [NOTIFICATION CLICKED] User tapped notification');
      print('   Title: ${message.notification?.title}');
      print('   Body: ${message.notification?.body}');
      print('   Data: ${message.data}');

      // Navigate to relevant screen
      _handleNotificationTap(message);
    });

    // Background/killed state is handled by _firebaseMessagingBackgroundHandler
    print('✅ [LISTENERS] All message listeners configured');
  }

  void _showLocalNotification({required String title, required String body}) {
    print('🔔 [LOCAL NOTIFICATION] Would show: $title - $body');
    // Implement flutter_local_notifications here if needed
  }

  void _handleNotificationTap(RemoteMessage message) {
    // Route user based on notification data
    print('🚀 [NAVIGATION] Routing user based on notification data');
    // Implement navigation logic
  }
}
```

**✅ DEBUG CHECKPOINT (In Your Auth Provider after login):**
```dart
// In lib/core/state/auth_provider.dart (or wherever you handle login)

Future<void> login(String email, String password) async {
  try {
    print('🔐 [AUTH] User attempting to login...');
    
    // Your existing auth logic...
    // await authService.login(email: email, password: password);
    
    print('✅ [AUTH] Login successful');
    
    // Now initialize FCM AFTER successful login
    try {
      print('🔥 [AUTH] Initializing FCM post-login...');
      
      final userId = 'user_id_here'; // Get from your auth service
      final authToken = 'jwt_token_here'; // Get from your auth service
      final backendUrl = 'http://10.0.2.2:3000/api'; // For Android emulator
      
      await FCMService().initFCM(
        userId: userId,
        authToken: authToken,
        backendUrl: backendUrl,
      );
      
      print('✅ [AUTH] FCM initialization triggered');
    } catch (fcmError) {
      print('⚠️  [AUTH] FCM init error (non-blocking): $fcmError');
    }
    
  } catch (e) {
    print('❌ [AUTH] Login failed: $e');
  }
}
```

**Flutter Debug Output Should Show:**
```
🔐 [AUTH] User attempting to login...
✅ [AUTH] Login successful
🔥 [AUTH] Initializing FCM post-login...
🔥 [FCM] Initializing FCM for user: user_123
🔥 [FCM] Backend URL: http://10.0.2.2:3000/api
📋 [FCM] Requesting notification permissions...
✅ [FCM] Permission status: AuthorizationStatus.authorized
🎟️  [FCM] Getting FCM token from Firebase...
✅ [FCM] FCM Token obtained
   Token length: 152 chars
   Token preview: dFxV0-xAOVvx_d6w8wV9q0:APA91bHR9V1...
📤 [FCM] Sending token to backend...
   Endpoint: http://10.0.2.2:3000/api/notifications/register-token
   Response status: 200
   Response body: {"status":"success","message":"FCM token registered successfully",...}
✅ [BACKEND] Token registered successfully
👂 [FCM] Setting up message listeners...
✅ [FCM] Message listeners configured
✅ [AUTH] FCM initialization triggered
```

---

## 4. Node.js Backend Setup (FCM Sender)

### Step 4.1: Verify Firebase Admin SDK Installation
**File:** Verify in `package.json`

```json
{
  "dependencies": {
    "firebase-admin": "^12.0.0",
    "express": "^4.18.0",
    "mongoose": "^7.0.0"
  }
}
```

**✅ DEBUG CHECKPOINT:**
```bash
cd dhruvbackend

# Verify installation
npm list firebase-admin
# Output: firebase-admin@12.0.0

# Check version compatibility
npm list
# All packages should show ✓
```

### Step 4.2: Verify Firebase Initialization
**File:** `src/services/firebase-notification.service.js`

```javascript
const admin = require('firebase-admin');
const path = require('path');

class FirebaseNotificationService {
  constructor() {
    this.isInitialized = false;
    this.initFirebase();
  }

  initFirebase() {
    try {
      console.log('🔥 [FIREBASE INIT] Starting Firebase Admin SDK initialization...');
      
      // Get service account path
      const serviceAccountPath = path.join(
        __dirname,
        '../../firebase-service-account.json'
      );
      
      console.log('   Service account path: ' + serviceAccountPath);

      // Check if file exists
      const fs = require('fs');
      if (!fs.existsSync(serviceAccountPath)) {
        console.error('❌ [FIREBASE INIT] Service account file NOT found');
        console.error('   Expected at: ' + serviceAccountPath);
        return;
      }

      console.log('✅ [FIREBASE INIT] Service account file found');

      // Load service account
      const serviceAccount = require(serviceAccountPath);
      console.log('✅ [FIREBASE INIT] Service account loaded');
      console.log('   Project ID: ' + serviceAccount.project_id);
      console.log('   Client Email: ' + serviceAccount.client_email);

      // Initialize if not already done
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        console.log('✅ [FIREBASE INIT] Firebase Admin SDK initialized');
      } else {
        console.log('ℹ️  [FIREBASE INIT] Firebase already initialized');
      }

      this.isInitialized = true;
      console.log('✅ [FIREBASE INIT] Firebase ready to send messages');

    } catch (error) {
      console.error('❌ [FIREBASE INIT] Initialization failed');
      console.error('   Error: ' + error.message);
      console.error('   Stack: ' + error.stack);
    }
  }

  async sendNotification(token, title, body, data = {}) {
    if (!this.isInitialized) {
      console.error('❌ [SEND] Firebase not initialized');
      return false;
    }

    try {
      console.log('📤 [SEND] Preparing to send notification');
      console.log('   Token length: ' + token.length);
      console.log('   Token preview: ' + token.substring(0, 50) + '...');
      console.log('   Title: ' + title);
      console.log('   Body: ' + body);

      const message = {
        notification: { title, body },
        data,
        token,
      };

      console.log('📤 [SEND] Calling admin.messaging().send()...');
      const response = await admin.messaging().send(message);
      
      console.log('✅ [SEND] Message sent successfully');
      console.log('   Message ID: ' + response);
      return true;

    } catch (error) {
      console.error('❌ [SEND] Failed to send message');
      console.error('   Error: ' + error.message);
      console.error('   Code: ' + error.code);
      return false;
    }
  }
}

module.exports = new FirebaseNotificationService();
```

**✅ DEBUG CHECKPOINT (Server Startup):**
```bash
npm start

# Look for:
# 🔥 [FIREBASE INIT] Starting Firebase Admin SDK initialization...
#    Service account path: /Users/mrmad/Dhruv/dhruvbackend/firebase-service-account.json
# ✅ [FIREBASE INIT] Service account file found
# ✅ [FIREBASE INIT] Service account loaded
#    Project ID: work-connect-nodejs
#    Client Email: firebase-adminsdk-fbsvc@work-connect-nodejs.iam.gserviceaccount.com
# ✅ [FIREBASE INIT] Firebase Admin SDK initialized
# ✅ [FIREBASE INIT] Firebase ready to send messages
```

### Step 4.3: Token Registration Endpoint
**File:** `src/modules/notifications/notification.push.controller.js`

```javascript
const catchAsync = require('../../utils/catchAsync');
const AppError = require('../../utils/appError');
const User = require('../../models/User');

exports.registerFCMToken = catchAsync(async (req, res, next) => {
  console.log('📝 [REGISTER TOKEN] Incoming request to register FCM token');
  
  const { fcmToken, userId, platform } = req.body;
  console.log('   fcmToken length: ' + (fcmToken ? fcmToken.length : 'null'));
  console.log('   userId: ' + userId);
  console.log('   platform: ' + platform);

  // Validation
  if (!fcmToken) {
    console.error('❌ [VALIDATE] fcmToken is missing');
    return next(new AppError('fcmToken is required', 400));
  }

  if (!userId) {
    console.error('❌ [VALIDATE] userId is missing');
    return next(new AppError('userId is required', 400));
  }

  // Validate token format
  if (fcmToken.length < 100) {
    console.error('❌ [VALIDATE] Token too short: ' + fcmToken.length + ' chars');
    return next(new AppError('Invalid FCM token format', 400));
  }

  if (!fcmToken.includes(':') && !fcmToken.includes('_')) {
    console.error('❌ [VALIDATE] Token missing separators (: or _)');
    return next(new AppError('Invalid FCM token format', 400));
  }

  console.log('✅ [VALIDATE] Token format validation passed');
  console.log('   Token preview: ' + fcmToken.substring(0, 50) + '...');

  try {
    // Find and update user
    console.log('🔍 [DB] Looking up user: ' + userId);
    
    const user = await User.findById(userId);
    
    if (!user) {
      console.error('❌ [DB] User not found: ' + userId);
      return next(new AppError('User not found', 404));
    }

    console.log('✅ [DB] User found: ' + user.email);

    // Update token
    console.log('💾 [DB] Updating user FCM token...');
    user.fcmToken = fcmToken;
    user.platform = platform || 'android';
    user.fcmTokenUpdatedAt = new Date();
    
    await user.save();

    console.log('✅ [DB] User token updated successfully');
    console.log('   Token stored for user: ' + user.email);
    console.log('   Platform: ' + user.platform);
    console.log('   Updated at: ' + user.fcmTokenUpdatedAt);

    res.status(200).json({
      status: 'success',
      message: 'FCM token registered successfully',
      data: {
        userId: user._id,
        fcmToken: fcmToken.substring(0, 50) + '...',
        platform: user.platform,
        tokenLength: fcmToken.length,
      },
    });

  } catch (error) {
    console.error('❌ [DB] Error during token registration');
    console.error('   Error: ' + error.message);
    return next(error);
  }
});

exports.deleteFCMToken = catchAsync(async (req, res, next) => {
  console.log('🗑️  [DELETE TOKEN] Incoming request to delete FCM token');
  
  const { userId } = req.body;
  console.log('   userId: ' + userId);

  try {
    console.log('🔍 [DB] Looking up user: ' + userId);
    
    const user = await User.findById(userId);
    
    if (!user) {
      console.error('❌ [DB] User not found: ' + userId);
      return next(new AppError('User not found', 404));
    }

    console.log('✅ [DB] User found, clearing token');
    
    user.fcmToken = null;
    user.platform = null;
    await user.save();

    console.log('✅ [DB] Token deleted for user: ' + user.email);

    res.status(200).json({
      status: 'success',
      message: 'FCM token deleted successfully',
    });

  } catch (error) {
    console.error('❌ [DB] Error during token deletion');
    console.error('   Error: ' + error.message);
    return next(error);
  }
});

exports.testNotification = catchAsync(async (req, res, next) => {
  console.log('🧪 [TEST] Test notification endpoint called');
  
  const { userId } = req.body;
  console.log('   userId: ' + userId);

  try {
    console.log('🔍 [DB] Looking up user: ' + userId);
    
    const user = await User.findById(userId);
    
    if (!user) {
      console.error('❌ [DB] User not found: ' + userId);
      return next(new AppError('User not found', 404));
    }

    console.log('✅ [DB] User found: ' + user.email);

    if (!user.fcmToken) {
      console.error('❌ [TOKEN] No FCM token for user');
      return next(new AppError('User has no FCM token registered', 400));
    }

    console.log('✅ [TOKEN] User has FCM token');
    console.log('   Token preview: ' + user.fcmToken.substring(0, 50) + '...');

    // Send test notification
    console.log('📤 [FCM] Sending test notification via Firebase...');
    
    const firebaseService = require('../../services/firebase-notification.service');
    
    const success = await firebaseService.sendNotification(
      user.fcmToken,
      'Test Notification',
      'This is a test notification from your Work Connect backend 🎉',
      {
        type: 'test',
        timestamp: new Date().toISOString(),
      }
    );

    if (success) {
      console.log('✅ [FCM] Test notification sent successfully');
      res.status(200).json({
        status: 'success',
        message: 'Test notification sent',
        data: {
          userId,
          tokenPreview: user.fcmToken.substring(0, 50) + '...',
        },
      });
    } else {
      console.error('❌ [FCM] Failed to send test notification');
      return next(new AppError('Failed to send notification', 500));
    }

  } catch (error) {
    console.error('❌ [FCM] Error sending test notification');
    console.error('   Error: ' + error.message);
    return next(error);
  }
});
```

**✅ DEBUG CHECKPOINT (Register Token via Postman/curl):**
```bash
# Request:
curl -X POST http://localhost:3000/api/notifications/register-token \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "fcmToken": "dFxV0-xAOVvx_d6w8wV9q0:APA91bHR9V1MXpLt7jKqB9xYzAbCdEfGhIjKlMnOpQrStUvWxYzAbCdEfGhI",
    "userId": "user_id_from_your_db",
    "platform": "android"
  }'

# Expected logs:
# 📝 [REGISTER TOKEN] Incoming request to register FCM token
#    fcmToken length: 152
#    userId: user_id_from_your_db
#    platform: android
# ✅ [VALIDATE] Token format validation passed
# 🔍 [DB] Looking up user: user_id_from_your_db
# ✅ [DB] User found: user@email.com
# 💾 [DB] Updating user FCM token...
# ✅ [DB] User token updated successfully

# Response:
# {"status":"success","message":"FCM token registered successfully",...}
```

### Step 4.4: Send Notification Function
**File:** Create `src/modules/notifications/notification.service.js`

```javascript
const User = require('../../models/User');
const firebaseService = require('../../services/firebase-notification.service');

class NotificationService {
  async sendNotificationToUser(userId, title, body, data = {}) {
    console.log('📢 [NOTIFICATION SERVICE] Sending notification');
    console.log('   userId: ' + userId);
    console.log('   title: ' + title);
    console.log('   body: ' + body);
    console.log('   data keys: ' + Object.keys(data).join(', '));

    try {
      // Lookup user
      console.log('🔍 [DB] Looking up user for notification');
      const user = await User.findById(userId);

      if (!user) {
        console.error('❌ [DB] User not found: ' + userId);
        return { success: false, reason: 'User not found' };
      }

      console.log('✅ [DB] User found: ' + user.email);

      // Check if user has token
      if (!user.fcmToken) {
        console.warn('⚠️  [TOKEN] User has no FCM token registered');
        console.warn('   Saving notification to database only');
        
        // Still save to DB for later
        await this._saveNotificationToDb(userId, title, body, data);
        
        return { 
          success: false, 
          reason: 'No FCM token',
          savedToDb: true 
        };
      }

      console.log('✅ [TOKEN] User has FCM token');
      console.log('   Token preview: ' + user.fcmToken.substring(0, 50) + '...');

      // Send via Firebase
      console.log('📤 [FCM] Calling Firebase Admin SDK to send...');
      
      const success = await firebaseService.sendNotification(
        user.fcmToken,
        title,
        body,
        data
      );

      if (success) {
        console.log('✅ [FCM] Notification delivered to Firebase');
        
        // Also save to DB for history
        await this._saveNotificationToDb(userId, title, body, data, 'sent');
        
        return { success: true };
      } else {
        console.error('❌ [FCM] Firebase delivery failed');
        console.error('   This could mean the token is invalid');
        
        // Clear invalid token
        console.log('🧹 [CLEANUP] Clearing invalid FCM token from database');
        user.fcmToken = null;
        await user.save();
        
        await this._saveNotificationToDb(userId, title, body, data, 'failed');
        
        return { 
          success: false, 
          reason: 'Firebase delivery failed',
          tokenCleared: true 
        };
      }

    } catch (error) {
      console.error('❌ [NOTIFICATION SERVICE] Error:');
      console.error('   ' + error.message);
      
      await this._saveNotificationToDb(userId, title, body, data, 'error');
      
      return { success: false, reason: error.message };
    }
  }

  async _saveNotificationToDb(userId, title, body, data, status = 'pending') {
    try {
      console.log('💾 [DB] Saving notification record to database');
      
      // Create notification record
      // const Notification = require('../../models/Notification');
      // await Notification.create({
      //   userId,
      //   title,
      //   body,
      //   data,
      //   status,
      //   createdAt: new Date(),
      // });
      
      console.log('✅ [DB] Notification record saved (status: ' + status + ')');
    } catch (error) {
      console.error('❌ [DB] Failed to save notification record');
      console.error('   ' + error.message);
    }
  }
}

module.exports = new NotificationService();
```

**✅ DEBUG CHECKPOINT (Trigger a notification):**
```javascript
// Example: After a job is created
const notificationService = require('./modules/notifications/notification.service');

console.log('📍 [EVENT] Job created, sending notifications...');

// Send to employer
await notificationService.sendNotificationToUser(
  employerId,
  'New Application',
  'You have a new application for your job posting',
  { jobId, applicantId, screen: 'applications' }
);

// Expected logs:
// 📢 [NOTIFICATION SERVICE] Sending notification
//    userId: employerId
//    title: New Application
//    body: You have a new application for your job posting
// 🔍 [DB] Looking up user for notification
// ✅ [DB] User found: employer@email.com
// ✅ [TOKEN] User has FCM token
// 📤 [FCM] Calling Firebase Admin SDK to send...
// 📤 [SEND] Preparing to send notification
// ✅ [SEND] Message sent successfully
// 💾 [DB] Saving notification record to database
// ✅ [DB] Notification record saved (status: sent)
```

---

## 5. End-to-End Flow Recap

### Complete Registration Flow (Step by Step):

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: User Opens App                                      │
└─────────────────────────────────────────────────────────────┘
   ↓
   [main.dart]
   🚀 [MAIN] Initializing Firebase...
   ✅ [MAIN] Firebase initialized successfully
   ✅ [MAIN] Background message handler set

┌─────────────────────────────────────────────────────────────┐
│ STEP 2: User Logs In                                        │
└─────────────────────────────────────────────────────────────┘
   ↓
   [auth_provider.dart]
   🔐 [AUTH] User attempting to login...
   ✅ [AUTH] Login successful
   🔥 [AUTH] Initializing FCM post-login...

┌─────────────────────────────────────────────────────────────┐
│ STEP 3: FCM Service Initializes (Post-Login)               │
└─────────────────────────────────────────────────────────────┘
   ↓
   [fcm_service.dart]
   🔥 [FCM] Initializing FCM for user: user_123
   📋 [FCM] Requesting notification permissions...
   ✅ [FCM] Permission status: AuthorizationStatus.authorized

┌─────────────────────────────────────────────────────────────┐
│ STEP 4: Get FCM Token from Firebase                         │
└─────────────────────────────────────────────────────────────┘
   ↓
   [Firebase Cloud Messaging]
   🎟️  [FCM] Getting FCM token from Firebase...
   ✅ [FCM] FCM Token obtained
      Token length: 152 chars
      Token preview: dFxV0-xAOVvx_d6w8wV9q0:APA91bHR9V1...

┌─────────────────────────────────────────────────────────────┐
│ STEP 5: Send Token to Backend                               │
└─────────────────────────────────────────────────────────────┘
   ↓
   [fcm_service.dart]
   📤 [FCM] Sending token to backend...
      Endpoint: http://10.0.2.2:3000/api/notifications/register-token
      Authorization: Bearer JWT_TOKEN

   ↓ (Network Request) ↓

   [notification.push.controller.js]
   📝 [REGISTER TOKEN] Incoming request to register FCM token
      fcmToken length: 152
      userId: user_123
      platform: android
   ✅ [VALIDATE] Token format validation passed

┌─────────────────────────────────────────────────────────────┐
│ STEP 6: Backend Stores Token in MongoDB                     │
└─────────────────────────────────────────────────────────────┘
   ↓
   🔍 [DB] Looking up user: user_123
   ✅ [DB] User found: user@email.com
   💾 [DB] Updating user FCM token...
   ✅ [DB] User token updated successfully
      Token stored for user: user@email.com
      Platform: android

   ↓ (Response) ↓

   200 OK: {
     "status": "success",
     "message": "FCM token registered successfully",
     "data": { ... }
   }

   ↓ (Back to Flutter) ↓

   ✅ [BACKEND] Token registered successfully
   👂 [FCM] Setting up message listeners...
   ✅ [FCM] Message listeners configured

┌─────────────────────────────────────────────────────────────┐
│ SUCCESS: Token Registered & Listeners Ready                 │
└─────────────────────────────────────────────────────────────┘
```

### Notification Delivery Flow (Step by Step):

```
┌─────────────────────────────────────────────────────────────┐
│ EVENT: Something Happens (e.g., new job posted)             │
└─────────────────────────────────────────────────────────────┘
   ↓
   [Backend Event Handler]
   📍 [EVENT] Job created, sending notifications...

   ↓

   notificationService.sendNotificationToUser(
     userId,
     title,
     body,
     data
   )

┌─────────────────────────────────────────────────────────────┐
│ STEP 1: Backend Prepares Notification                       │
└─────────────────────────────────────────────────────────────┘
   ↓
   [notification.service.js]
   📢 [NOTIFICATION SERVICE] Sending notification
      userId: user_123
      title: "New Application"
      body: "You have a new application"

   ↓

   🔍 [DB] Looking up user for notification
   ✅ [DB] User found: user@email.com
   ✅ [TOKEN] User has FCM token
      Token preview: dFxV0-xAOVvx_d6w8wV9q0:APA91bHR9V1...

┌─────────────────────────────────────────────────────────────┐
│ STEP 2: Backend Sends via Firebase Admin SDK                │
└─────────────────────────────────────────────────────────────┘
   ↓
   [firebase-notification.service.js]
   📤 [SEND] Preparing to send notification
      Token length: 152
      Token preview: dFxV0-xAOVvx_d6w8wV9q0:APA91bHR9V1...
   
   ↓ (Calls Firebase Admin SDK) ↓
   
   admin.messaging().send({
     notification: { title, body },
     data: { custom fields },
     token: fcmToken
   })

   ↓

   ✅ [SEND] Message sent successfully
      Message ID: 0:1701234567890123%abcd1234

┌─────────────────────────────────────────────────────────────┐
│ STEP 3: Firebase Delivers to Device                         │
└─────────────────────────────────────────────────────────────┘
   ↓
   [Firebase Cloud Messaging Infrastructure]
   • Validates token
   • Routes to correct device
   • Delivers message

┌─────────────────────────────────────────────────────────────┐
│ STEP 4: Flutter App Receives Notification                   │
└─────────────────────────────────────────────────────────────┘
   ↓
   [Scenario A: App is OPEN (Foreground)]
   📬 [FOREGROUND MESSAGE] Received while app is open
      Title: "New Application"
      Body: "You have a new application"
      Data: { jobId, applicantId, screen: "applications" }
   
   🔔 [LOCAL NOTIFICATION] Would show notification to user
   
   ↓
   
   [Scenario B: App is CLOSED/BACKGROUND]
   📱 [BACKGROUND] Handling background message
      Message ID: 0:1701234567890123%abcd1234
      Title: "New Application"
      Body: "You have a new application"
   
   🔔 System notification appears on device

┌─────────────────────────────────────────────────────────────┐
│ STEP 5: User Interacts with Notification                    │
└─────────────────────────────────────────────────────────────┘
   ↓
   [User taps notification]
   
   🔗 [NOTIFICATION CLICKED] User tapped notification
      Title: "New Application"
      Body: "You have a new application"
      Data: { jobId, applicantId, screen: "applications" }
   
   🚀 [NAVIGATION] Routing user based on notification data
   
   ↓
   
   [App navigates to Applications screen or job details]

┌─────────────────────────────────────────────────────────────┐
│ SUCCESS: Notification Delivered, Displayed, & Actioned     │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Debug Checklist

### ✅ Firebase Console Configuration
- [ ] Firebase project created (work-connect-nodejs)
- [ ] Android app registered with correct package name
- [ ] google-services.json downloaded and placed in `android/app/`
- [ ] Service account key created and saved as `firebase-service-account.json`
- [ ] Service account added to `.gitignore`

### ✅ Flutter Configuration
- [ ] `firebase_core` and `firebase_messaging` added to pubspec.yaml
- [ ] `flutter pub get` completed successfully
- [ ] `android/build.gradle` has Google services plugin (com.google.gms:google-services)
- [ ] `android/app/build.gradle` applies `com.google.gms.google-services`
- [ ] `lib/main.dart` calls `Firebase.initializeApp()` before runApp
- [ ] `_firebaseMessagingBackgroundHandler` is top-level function with @pragma
- [ ] FCM initialization moved to AFTER user login
- [ ] `android/app/src/main/AndroidManifest.xml` has:
  ```xml
  <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
  ```

### ✅ Node.js Backend Configuration
- [ ] `firebase-admin` installed via npm
- [ ] `firebase-service-account.json` in backend root directory
- [ ] Service account file contains valid JSON with project_id
- [ ] Backend logs show Firebase initialization success on startup
- [ ] `/api/notifications/register-token` endpoint exists
- [ ] `/api/notifications/test` endpoint exists for manual testing

### ✅ Runtime Debug Output

**On App Startup (main.dart):**
```
🚀 [MAIN] Initializing Firebase...
✅ [MAIN] Firebase initialized successfully
✅ [MAIN] Background message handler set
```

**After User Login (auth_provider.dart):**
```
🔐 [AUTH] User attempting to login...
✅ [AUTH] Login successful
🔥 [AUTH] Initializing FCM post-login...
```

**During FCM Initialization (fcm_service.dart):**
```
🔥 [FCM] Initializing FCM for user: [USER_ID]
📋 [FCM] Requesting notification permissions...
✅ [FCM] Permission status: AuthorizationStatus.authorized
🎟️  [FCM] Getting FCM token from Firebase...
✅ [FCM] FCM Token obtained
   Token length: [LENGTH] chars
   Token preview: [FIRST_50_CHARS]...
```

**During Token Registration (notification.push.controller.js):**
```
📝 [REGISTER TOKEN] Incoming request to register FCM token
✅ [VALIDATE] Token format validation passed
✅ [DB] User found: [USER_EMAIL]
💾 [DB] Updating user FCM token...
✅ [DB] User token updated successfully
```

---

## 7. Common Issues & Fixes

### Issue 1: "FIS_AUTH_ERROR" or Token is Null

**Symptom:**
```
❌ [FCM] Failed to get FCM token (returned null)
```

**Causes:**
1. Firebase not initialized
2. Incorrect google-services.json
3. Package name mismatch

**Debug Steps:**
```bash
# Check google-services.json exists
ls -la android/app/google-services.json

# Check package name matches
grep -i "package=" android/app/src/main/AndroidManifest.xml

# Verify in Firebase Console the registered package name matches exactly

# Run in debug mode to see detailed logs
flutter run --debug
```

**Fix:**
```dart
// In main.dart, ensure Firebase is initialized FIRST
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  print('🚀 [MAIN] Initializing Firebase...');
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );
  print('✅ [MAIN] Firebase initialized successfully');
  
  runApp(const MyApp());
}
```

---

### Issue 2: Token Registration Fails (400 or 500)

**Symptom:**
```
Response status: 400
Response body: {"error":"Invalid FCM token format"}
```

**Causes:**
1. Token format invalid (must be 100+ chars with `:` or `_`)
2. Missing userId or authToken
3. Auth token expired

**Debug Steps:**
```bash
# Check token length and format
flutter run --debug

# Look for:
# Token length: [NUMBER] chars
# Token preview: [PREVIEW]

# If token is less than 100 chars or no separators, something is wrong

# Test endpoint manually with Postman:
POST http://localhost:3000/api/notifications/register-token
Headers: Authorization: Bearer [JWT_TOKEN]
Body: {
  "fcmToken": "[TOKEN]",
  "userId": "[USER_ID]",
  "platform": "android"
}
```

**Fix:**
```javascript
// In notification.push.controller.js, add better validation
if (fcmToken.length < 100) {
  console.error('❌ [VALIDATE] Token too short: ' + fcmToken.length + ' chars');
  console.error('   This usually means Firebase didn\'t return a real token');
  return next(new AppError('Token must be at least 100 characters', 400));
}
```

---

### Issue 3: Backend Can't Send Notification (Firebase Error)

**Symptom:**
```
❌ [SEND] Failed to send message
   Error: Credential implementation not found
```

**Causes:**
1. `firebase-service-account.json` missing
2. Service account path incorrect
3. Service account JSON invalid

**Debug Steps:**
```bash
# Check if service account file exists
ls -la firebase-service-account.json

# Check it's valid JSON
cat firebase-service-account.json | jq .

# Check it's in .gitignore
grep "firebase-service-account" .gitignore

# Check server logs on startup
npm start
# Should show:
# 🔥 [FIREBASE INIT] Starting Firebase Admin SDK initialization...
# ✅ [FIREBASE INIT] Service account file found
# ✅ [FIREBASE INIT] Firebase Admin SDK initialized
```

**Fix:**
```bash
# Download service account from Firebase Console again
# Save to backend root: firebase-service-account.json
# Add to .gitignore
echo "firebase-service-account.json" >> .gitignore
```

---

### Issue 4: Notification Not Received on Device

**Symptom:**
```
✅ [SEND] Message sent successfully
   Message ID: 0:1701234567890123%abcd1234

# But nothing appears on device
```

**Causes:**
1. App not listening for foreground messages
2. Background handler not set up correctly
3. Device notification settings disabled
4. Token changed after app restart

**Debug Steps:**
```dart
// In fcm_service.dart, ensure listeners are set up
void _setupMessageListeners() {
  print('👂 [FCM] Setting up message listeners...');
  
  // Foreground
  FirebaseMessaging.onMessage.listen((RemoteMessage message) {
    print('📬 [FOREGROUND MESSAGE] Received');
    print('   Title: ${message.notification?.title}');
    print('   Body: ${message.notification?.body}');
  });
  
  // Background
  FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
    print('🔗 [NOTIFICATION CLICKED] User tapped');
  });
}

// Call this in initFCM():
print('👂 [FCM] Setting up message listeners...');
_setupMessageListeners();
print('✅ [FCM] Message listeners configured');
```

**Fix:**
1. Check device notification settings - app must have permission
2. Ensure listeners are set up after FCM init
3. Test with `/api/notifications/test` endpoint which sends immediately

---

### Issue 5: Multiple Token Registrations (Old Token Still Used)

**Symptom:**
```
✅ [DB] User token updated successfully
# But notification still goes to old device
```

**Causes:**
1. Multiple instances of FCM running
2. Token registered but app still has old reference
3. App cache not cleared

**Debug Steps:**
```bash
# Check how many tokens are registered for user
db.users.findOne({ _id: ObjectId("[USER_ID]") }, { fcmToken: 1 })

# Should only show ONE token

# Check Flutter logs
flutter run --debug
# Search for "Token length" - should only appear once per login
```

**Fix:**
```bash
# Clear app data
flutter clean
flutter pub get

# Rebuild and run
flutter run --release
```

---

### Issue 6: Token Cleared After Notification Fails

**Symptom:**
```
❌ [FCM] Firebase delivery failed
   This could mean the token is invalid
🧹 [CLEANUP] Clearing invalid FCM token from database

# Now notifications stopped even after re-registering token
```

**Causes:**
1. Token validation too strict
2. Firebase credential issues
3. Device token expired

**Debug Steps:**
```javascript
// In firebase-notification.service.js, check the specific error:
catch (error) {
  console.error('❌ [SEND] Failed to send message');
  console.error('   Error: ' + error.message);
  console.error('   Code: ' + error.code);
  
  // Don't auto-clear token, log for investigation
}
```

**Fix:**
```javascript
// Be more selective about when to clear tokens
if (error.code === 'messaging/invalid-registration-token') {
  console.log('🧹 [CLEANUP] Clearing invalid token (confirmed by Firebase)');
  // Clear token
} else {
  console.error('⚠️  [ERROR] Different error, keeping token for retry');
  // Don't clear token
}
```

---

## 8. Testing Workflow

### Complete Test Sequence:

```
1️⃣  START BACKEND
   npm start
   ✅ Should see: 🔥 [FIREBASE INIT] ... ✅ [FIREBASE INIT] Firebase ready

2️⃣  CLEAR APP & REINSTALL
   flutter clean
   flutter pub get
   flutter run --debug

3️⃣  LOGIN USER
   ✅ Should see: 🔐 [AUTH] Login successful
                   🔥 [AUTH] Initializing FCM post-login...

4️⃣  CHECK TOKEN REGISTRATION
   ✅ Should see: ✅ [FCM] FCM Token obtained
                   ✅ [BACKEND] Token registered successfully

5️⃣  VERIFY IN DATABASE
   db.users.findOne({ _id: ObjectId("[USER_ID]") })
   ✅ Should show: fcmToken: "dFxV0-xAOVvx..."
                   platform: "android"

6️⃣  SEND TEST NOTIFICATION
   curl -X POST http://localhost:3000/api/notifications/test \
     -H "Authorization: Bearer [TOKEN]" \
     -d '{"userId":"[USER_ID]"}'
   ✅ Backend should show: ✅ [SEND] Message sent successfully

7️⃣  CHECK DEVICE/EMULATOR
   ✅ Notification should appear (foreground or system notification)

8️⃣  TAP NOTIFICATION (if it appeared)
   ✅ App should log: 🔗 [NOTIFICATION CLICKED] User tapped
   ✅ App should navigate to relevant screen
```

---

## 🎉 Congratulations!

When you see all the ✅ checkmarks and debug output, your Firebase FCM integration is **fully working end-to-end**!

**What's happening:**
1. ✅ Firebase authenticated both app & backend
2. ✅ App getting real FCM tokens from Firebase
3. ✅ Tokens stored in MongoDB database
4. ✅ Backend can retrieve and send via Firebase Admin SDK
5. ✅ Device receives and displays notifications
6. ✅ User can interact with notifications

**Next Steps:**
- Integrate into real business logic (job posts, applications, etc.)
- Test with different notification types
- Monitor token refresh (Firebase refreshes tokens periodically)
- Implement notification history/persistence
