# 🚀 Firebase Push Notifications - Quick Start

## What Was Built

Your entire notification system now automatically sends Firebase Cloud Messaging (FCM) push notifications to mobile devices for every event in the app.

## 📋 Current Status

✅ **Backend**: Production Ready
- Firebase Admin SDK initialized
- All notification triggers integrated
- Database schema updated
- Error handling implemented
- Tests passing

⏳ **Next Step**: Mobile App Integration

## 📱 Mobile App Integration (5 Steps)

### Step 1: Install Firebase SDK
```bash
flutter pub add firebase_messaging
```

### Step 2: Initialize Firebase
```dart
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  runApp(MyApp());
}
```

### Step 3: Get FCM Token
```dart
void setupFirebaseMessaging() {
  FirebaseMessaging messaging = FirebaseMessaging.instance;
  
  // Get token
  messaging.getToken().then((token) {
    print('FCM Token: $token');
    // Send to backend
    registerToken(token);
  });
}

Future<void> registerToken(String token) async {
  // Call: POST /api/notifications/register-token
  await http.post(
    Uri.parse('http://your-api.com/api/notifications/register-token'),
    headers: {
      'Authorization': 'Bearer $authToken',
      'Content-Type': 'application/json',
    },
    body: jsonEncode({
      'fcmToken': token,
      'platform': Platform.isIOS ? 'ios' : 'android',
    }),
  );
}
```

### Step 4: Handle Foreground Notifications
```dart
void listenToNotifications() {
  // Handle notifications when app is open
  FirebaseMessaging.onMessage.listen((RemoteMessage message) {
    print('Got a message while in the foreground!');
    print('Message data: ${message.data}');
    
    if (message.notification != null) {
      // Show local notification
      _showNotification(
        message.notification!.title ?? 'Notification',
        message.notification!.body ?? '',
        message.data,
      );
    }
  });
  
  // Handle notification tap
  FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
    _handleNotificationTap(message);
  });
}
```

### Step 5: Handle Deep Links
```dart
void _handleNotificationTap(RemoteMessage message) {
  final actionUrl = message.data['actionUrl'];
  
  if (actionUrl != null) {
    // Navigate based on URL
    if (actionUrl.startsWith('/jobs/')) {
      final jobId = actionUrl.split('/').last;
      Navigator.push(context, 
        MaterialPageRoute(builder: (_) => JobDetailsPage(jobId: jobId))
      );
    }
    // Add more routes as needed
  }
}
```

## 🧪 Testing

### 1. Backend Test (Already Done)
```bash
node test-firebase-notifications.js
```

### 2. Manual API Test
```bash
# Register token
curl -X POST http://localhost:3000/api/notifications/register-token \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fcmToken": "YOUR_FCM_TOKEN",
    "platform": "ios"
  }'

# Send test notification
curl -X POST http://localhost:3000/api/notifications/test \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Notification",
    "message": "This is a test",
    "type": "system"
  }'
```

### 3. Device Testing
1. Install app on test device
2. App registers FCM token on launch
3. From backend, create a job/application/message
4. Verify notification appears on device

## 📊 Notification Flows

### Job Posted
```
POST /jobs  
↓
Job saved to database
↓
notifyNewJobPosted() triggered
↓
For each worker:
├─ In-app notification saved
└─ Firebase push sent → Mobile device
```

### Application Submitted
```
POST /jobs/{id}/apply
↓
Application saved
↓
notifyApplicationReceived() triggered
↓
Employer gets:
├─ In-app notification
└─ Firebase push → Mobile device
```

### Application Status Changed
```
PATCH /applications/{id}
↓
Status updated
↓
notifyApplicationStatusChanged() triggered
↓
Worker gets:
├─ In-app notification  
└─ Firebase push → Mobile device
```

## 🔔 All Notification Types

| Event | Recipients | Data |
|-------|-----------|------|
| Job Posted | All workers | jobId, title, rate |
| Application Received | Employer | appId, workerId |
| Application Approved | Worker | appId, jobId |
| Application Rejected | Worker | appId, jobId |
| Message Sent | Recipient | senderId, preview |
| Shift Reminder | Worker | shiftId, time |
| Payment Received | User | amount, paymentId |
| Bulk Announcement | Multiple | custom data |

## 📲 Notification Structure

Each push notification contains:
```json
{
  "notification": {
    "title": "New Job Available",
    "body": "Dishwasher - $18/hr"
  },
  "data": {
    "type": "job_posted",
    "priority": "high",
    "jobId": "507f1f77bcf86cd799439011",
    "actionUrl": "/jobs/507f1f77bcf86cd799439011",
    "metadata": "{...}"
  }
}
```

## 🔗 API Endpoints

### Register FCM Token
```
POST /api/notifications/register-token
Authorization: Bearer {token}

{
  "fcmToken": "string",
  "platform": "ios|android"
}

Response:
{
  "status": "success",
  "data": {
    "userId": "...",
    "fcmToken": "...",
    "platform": "ios"
  }
}
```

### Unregister Token
```
DELETE /api/notifications/register-token
Authorization: Bearer {token}
```

### Send Test Notification
```
POST /api/notifications/test
Authorization: Bearer {token}

{
  "title": "Test",
  "message": "Test message",
  "type": "system",
  "priority": "high"
}
```

### Get All Notifications
```
GET /api/notifications
Authorization: Bearer {token}

Response: Array of notifications
```

### Mark Notification as Read
```
PATCH /api/notifications/{id}/read
Authorization: Bearer {token}
```

## 🐛 Troubleshooting

### Notifications not received?

**1. Check FCM Token Registration**
```bash
# In MongoDB, verify user has fcmToken
db.users.findOne({email: "user@example.com"}, {fcmToken: 1})
```

**2. Check Server Logs**
```bash
npm run dev
# Look for "✅ Firebase push notification sent" messages
# or "❌ Failed to send notification" errors
```

**3. Verify Firebase Configuration**
```bash
# Check service account file exists
ls -la firebase-service-account.json
```

**4. Check Mobile App**
- Is Firebase messaging initialized?
- Does app have notification permissions?
- Is device connected to internet?
- Check Firebase Console for errors

### Invalid FCM Token Error?
- Token expired or invalid
- Request new token from app
- Re-register via `/api/notifications/register-token`

## 📚 Additional Resources

- [Firebase Console](https://console.firebase.google.com)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Firebase Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Flutter Firebase](https://firebase.flutter.dev/)

## ✅ Verification Checklist

- [x] Firebase Admin SDK initialized
- [x] Service account configured  
- [x] All notification types integrated
- [x] Database schema updated
- [x] Controllers updated
- [x] Tests passing
- [ ] Mobile app has Firebase SDK
- [ ] Mobile app registers FCM token
- [ ] Mobile app listens to messages
- [ ] Mobile app handles deep links
- [ ] Tested on real device

## 🎊 Summary

Your backend is now **production-ready** for push notifications! 

The only remaining work is in the mobile app:
1. Install Firebase SDK
2. Initialize Firebase
3. Get and register FCM token
4. Listen to notifications
5. Handle deep links

All push notification logic is complete and tested on the backend.

---

**Questions?** Check `FIREBASE_INTEGRATION.md` for detailed documentation.
