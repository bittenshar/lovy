# Firebase Cloud Messaging Integration Guide

## 🎯 Overview

Firebase Cloud Messaging (FCM) has been fully integrated throughout your WorkConnect backend. Every notification event now automatically sends push notifications to registered mobile devices.

## ✅ Implementation Status

### Core Components Integrated

| Component | Status | Details |
|-----------|--------|---------|
| Firebase Admin SDK | ✅ Integrated | Initialized in `src/services/firebase-notification.service.js` |
| Notification Service | ✅ Updated | Auto-sends FCM for every notification |
| Job Notifications | ✅ Active | Fires when jobs are posted |
| Application Notifications | ✅ Active | Fires on application submission & status changes |
| Message Notifications | ✅ Active | Fires on new messages |
| Shift Notifications | ✅ Active | Shift reminders, start, and end alerts |
| Payment Notifications | ✅ Active | Payment received, pending, and completed |
| Bulk Notifications | ✅ Active | System announcements to multiple users |

## 📱 Notification Types

### Job Notifications
- **Type**: `job_posted`
- **Trigger**: When employer publishes a job
- **Recipients**: All workers in the system
- **Data**: Job title, hourly rate, location, job ID

### Application Notifications
- **Types**: 
  - `application_received` (employer receives application)
  - `application_approved` (worker gets hired)
  - `application_rejected` (worker rejected)
  - `application_shortlisted` (worker shortlisted)
  - `application_completed` (job marked complete)
- **Trigger**: Application submitted or status changed
- **Recipients**: Employer (for received), Worker (for status changes)

### Message Notifications
- **Type**: `new_message`
- **Trigger**: User sends a message
- **Recipients**: Message recipient
- **Data**: Sender name, message preview

### Shift Notifications
- **Types**: `shift_reminder`, `shift_start`, `shift_end`
- **Trigger**: Shift events
- **Recipients**: Assigned workers
- **Data**: Shift time, status

### Payment Notifications
- **Types**: `payment_received`, `payment_pending`, `payment_completed`
- **Trigger**: Payment status changes
- **Recipients**: Payment recipient
- **Data**: Amount, payment ID, status

## 🔧 How It Works

### 1. **Automatic Sending**
Every notification creation triggers:
```javascript
// In-app notification (saved to MongoDB)
await Notification.create({...})

// Firebase push notification (sent asynchronously, non-blocking)
await firebaseService.sendToDevice(fcmToken, payload)
```

### 2. **Data Integrity**
- All Firebase data fields are automatically converted to strings (FCM requirement)
- Metadata is JSON-serialized for transmission
- Errors are logged but don't break the application

### 3. **Error Handling**
- Invalid/expired FCM tokens are gracefully skipped
- Failures logged for debugging
- In-app notifications always created (even if push fails)

## 📡 Firebase Service Architecture

### File: `src/services/firebase-notification.service.js`

**Methods:**
- `sendToDevice(fcmToken, payload)` - Send to single device
- `sendToDevices(fcmTokens, payload)` - Send to multiple devices
- `sendToTopic(topic, payload)` - Send to topic subscribers
- `subscribeToTopic(fcmToken, topic)` - Subscribe device to topic

### File: `src/services/notification-triggers.service.js`

**Trigger Functions:**
- `notifyNewJobPosted(job, employer)`
- `notifyApplicationReceived(application, job, worker, employer)`
- `notifyApplicationStatusChanged(application, status, worker, job)`
- `notifyShiftReminder(worker, shift, type)`
- `notifyPaymentUpdate(user, payment, type)`
- `notifyNewMessage(recipient, sender, message)`
- `notifyMultipleUsers(userIds, options)`

## 🚀 Integration Points

### Job Controller
```javascript
// When job is published:
setImmediate(() => {
  notificationTriggers.notifyNewJobPosted(job, employer)
    .catch(err => console.error('Notification failed:', err));
});
```

### Application Controller
```javascript
// When application submitted:
setImmediate(async () => {
  const employer = await User.findById(job.employer);
  await notificationTriggers.notifyApplicationReceived(
    application, job, worker, employer
  );
});

// When application status changed:
setImmediate(async () => {
  const worker = await User.findById(application.worker);
  await notificationTriggers.notifyApplicationStatusChanged(
    application, status, worker, job
  );
});
```

### Conversation Controller
```javascript
// When message sent:
await notificationService.sendSafeNotification({
  recipientId: recipient._id,
  type: 'new_message',
  title: `Message from ${sender.firstName}`,
  message: messagePreview,
  ...
});
// ↓ Automatically triggers Firebase push
```

## 📲 Mobile App Integration

### 1. Register FCM Token
Users must register their FCM token on app launch:

```
POST /api/notifications/register-token
Content-Type: application/json
Authorization: Bearer {token}

{
  "fcmToken": "eF-8XM_Sv...",  // From Firebase SDK
  "platform": "ios"             // or "android"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "FCM token registered successfully",
  "data": {
    "userId": "...",
    "fcmToken": "...",
    "platform": "ios"
  }
}
```

### 2. Handle Notifications
Configure Firebase messaging handlers in your mobile app:

**Flutter Example:**
```dart
FirebaseMessaging.onMessage.listen((RemoteMessage message) {
  print('Got a message whilst in the foreground!');
  print('Message data: ${message.data}');
  if (message.notification != null) {
    print('Also got a notification: ${message.notification}');
    // Show local notification
  }
});
```

### 3. Deep Linking
Use the `actionUrl` in notification data:
```dart
// From notification data: "/jobs/507f1f77bcf86cd799439011"
// Navigate user to job details screen
```

## 🧪 Testing

### Test Integration
```bash
node test-firebase-notifications.js
```

This test:
1. ✅ Verifies Firebase initialization
2. ✅ Tests direct device push
3. ✅ Tests all notification triggers
4. ✅ Tests bulk notifications
5. ✅ Validates database entries

### Manual Testing via API

**1. Register a test token:**
```bash
curl -X POST http://localhost:3000/api/notifications/register-token \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fcmToken":"YOUR_FCM_TOKEN","platform":"ios"}'
```

**2. Send test notification:**
```bash
curl -X POST http://localhost:3000/api/notifications/test \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"Test Notification",
    "message":"This is a test",
    "type":"system",
    "priority":"high"
  }'
```

**3. Verify in-app notification:**
```bash
curl http://localhost:3000/api/notifications \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🔐 Firebase Configuration

### Service Account
- **Location**: `/Users/mrmad/Dhruv/dhruvbackend/firebase-service-account.json`
- **Project**: `work-connect-nodejs`
- **Protected**: Added to `.gitignore`

### Environment Variables
```env
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json
```

## 📊 Database Schema

### Notification Model Updates
Added 16 new notification types:

```javascript
type: {
  enum: [
    'job_posted',
    'job_update',
    'application_received',
    'application_approved',
    'application_rejected',
    'application_shortlisted',
    'application_completed',
    'application_hired',
    'payment_received',
    'payment_pending',
    'payment_completed',
    'shift_reminder',
    'shift_start',
    'shift_end',
    'new_message',
    // ... and existing types
  ]
}
```

## ⚠️ Common Issues & Solutions

### Issue: "The registration token is not a valid FCM registration token"
**Solution**: Token is expired or invalid. User must re-register.
```bash
POST /api/notifications/register-token
```

### Issue: Notifications not received on device
**Checklist**:
- [ ] FCM token registered via API
- [ ] Device has internet connection
- [ ] App has notification permissions granted
- [ ] Firebase Cloud Messaging enabled in Firebase Console
- [ ] Check server logs for delivery failures

### Issue: Bulk notifications slow
**Optimization**: Currently sends sequentially. Can batch with `sendAll()` if needed.

## 🚀 Next Steps (Optional Enhancements)

1. **Topics**: Group workers by skill/location for targeted notifications
2. **Scheduling**: Send shift reminders at specific times
3. **Analytics**: Track notification delivery and engagement
4. **Customization**: User preference for notification types
5. **Rich Notifications**: Add images/actions to push notifications

## 📚 Resources

- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [FCM Send REST API](https://firebase.google.com/docs/cloud-messaging/send-message)
- [Firebase Console](https://console.firebase.google.com)

## ✨ Summary

**Firebase Cloud Messaging is now fully integrated and production-ready!**

- ✅ All notification types trigger FCM pushes
- ✅ Database saves in-app notifications
- ✅ Graceful error handling
- ✅ Non-blocking async execution
- ✅ Mobile app integration ready

**To activate**: Register FCM tokens in your mobile app via the registration endpoint.
