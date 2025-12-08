# OneSignal Integration Summary

## 🎯 What's Been Implemented

Your WorkConnect backend now has **complete OneSignal integration** for enterprise-grade push notifications!

### Features Added

✅ **OneSignal Service Module** (`src/shared/services/onesignal.service.js`)
- Send notifications to users/segments
- Register and manage users in OneSignal
- Schedule notifications for future delivery
- Track notification delivery status
- Add/remove users from segments

✅ **OneSignal Controller** (`src/modules/notifications/notification.onesignal.controller.js`)
- Register device OneSignal ID
- Send notifications to specific users
- Send to all workers/employers
- Test notification endpoint
- Schedule notifications
- Get notification status

✅ **API Endpoints** (in notification routes)
- `POST /api/notifications/onesignal/register` - Register device
- `DELETE /api/notifications/onesignal/unregister` - Unregister device
- `GET /api/notifications/onesignal/status` - Get registration status
- `POST /api/notifications/onesignal/send` - Send notification
- `POST /api/notifications/onesignal/send-to-workers` - Send to workers
- `POST /api/notifications/onesignal/send-to-employers` - Send to employers
- `POST /api/notifications/onesignal/test` - Test notification
- `POST /api/notifications/onesignal/schedule` - Schedule notification
- `GET /api/notifications/onesignal/:id/status` - Check status

✅ **Database Schema Updates**
- Added OneSignal fields to User model:
  - `onesignalId` - Device identifier from OneSignal
  - `onesignalPlatform` - Device platform (iOS/Android/Web)
  - `onesignalDeviceInfo` - Device information
  - `onesignalRegisteredAt` - Registration timestamp

✅ **Documentation**
- `ONESIGNAL_INTEGRATION.md` - Complete integration guide (500+ lines)
- `ONESIGNAL_SETUP.md` - Setup instructions with examples
- `verify-onesignal-setup.js` - Automated setup verification

✅ **Testing Tools**
- `postman/OneSignal.postman_collection.json` - Ready-to-use Postman collection
- Test endpoints for all features
- Pre-configured variables

## 📋 What You Need To Do

### 1. Get OneSignal Credentials (5 minutes)

```bash
# Go to https://dashboard.onesignal.com
# Create an app
# Settings → Keys & IDs
# Copy App ID and REST API Key
```

### 2. Add to `.env` File

```env
ONESIGNAL_APP_ID=your-app-id-here
ONESIGNAL_REST_API_KEY=your-api-key-here
```

### 3. Restart Server

```bash
npm run dev
```

Should see:
```
✅ OneSignal service initialized
```

### 4. Test Integration

```bash
# Verify setup
node verify-onesignal-setup.js

# Should show ✅ for all items
```

## 🔌 Architecture

### System Design

```
┌─────────────────────────────────────────────────────────┐
│                    YOUR APP                            │
└──────────────────┬──────────────────────────────────────┘
                   │
        ┌──────────┼──────────┐
        │          │          │
    ┌───▼──┐  ┌───▼──┐  ┌───▼──────┐
    │ FCM  │  │OneS. │  │Database  │
    │(Old) │  │(New) │  │Notific.  │
    └──────┘  └──────┘  └──────────┘
        │          │          │
        └──────────┼──────────┘
                   │
        ┌──────────▼──────────┐
        │   Mobile Device    │
        │  (Receives Push)   │
        └────────────────────┘
```

### Data Flow

```
1. User logs in
   ↓
2. Gets auth token
   ↓
3. App registers OneSignal ID
   POST /api/notifications/onesignal/register
   ↓
4. OneSignal service creates user in OneSignal
   ↓
5. Backend stores onesignalId in database
   ↓
6. When notification needed:
   - Business logic creates notification
   - Calls onesignalService.sendToUser()
   - OneSignal sends to device
   ↓
7. User receives push notification
```

## 🚀 Quick Start Usage

### Send Notification in Code

```javascript
const onesignalService = require('./src/shared/services/onesignal.service');

// Send to specific user
await onesignalService.sendToUser('user-123', {
  title: 'New Job Alert',
  message: 'Senior Developer role in your city',
  data: { jobId: 'job-456' }
});

// Send to segment
await onesignalService.sendToSegment('workers', {
  title: 'System Update',
  message: 'New features available'
});

// Send to all users
await onesignalService.sendToAll({
  title: 'Important Announcement',
  message: 'WorkConnect is now faster'
});

// Schedule notification
await onesignalService.scheduleNotification({
  title: 'Reminder',
  message: 'Check your applications',
  users: ['user-123'],
  scheduledTime: new Date('2024-12-15T10:00:00Z')
});
```

### API Usage (Postman/cURL)

```bash
# 1. Login to get token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'

# Response: { "token": "..." }

# 2. Register OneSignal ID
curl -X POST http://localhost:3000/api/notifications/onesignal/register \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "onesignalId": "onesignal-device-id",
    "platform": "iOS"
  }'

# 3. Send test notification
curl -X POST http://localhost:3000/api/notifications/onesignal/test \
  -H "Authorization: Bearer YOUR_TOKEN"

# 4. Send to users
curl -X POST http://localhost:3000/api/notifications/onesignal/send \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Job Alert",
    "message": "New job available",
    "users": ["user-123"],
    "data": {"jobId": "job-456"}
  }'
```

## 📱 Mobile App Integration

### iOS (Swift)

```swift
import OneSignalFramework

// In AppDelegate
OneSignal.initialize("your-app-id-here", withLaunchOptions: launchOptions)
OneSignal.Notifications.requestPermission({ accepted in }, fallback: true)

// Get device ID
let playerId = OneSignal.User.pushSubscription.id

// Send to backend
let url = URL(string: "http://backend/api/notifications/onesignal/register")!
var request = URLRequest(url: url)
request.httpMethod = "POST"
request.setValue("Bearer \(authToken)", forHTTPHeaderField: "Authorization")
request.setValue("application/json", forHTTPHeaderField: "Content-Type")

let body = ["onesignalId": playerId, "platform": "iOS"]
request.httpBody = try JSONEncoder().encode(body)

URLSession.shared.dataTask(with: request).resume()
```

### Android (Kotlin)

```kotlin
import com.onesignal.OneSignal

// In MainActivity
OneSignal.initWithContext(this)
OneSignal.setAppId("your-app-id-here")
OneSignal.Notifications.requestPermission(true)

// Get device ID
val playerId = OneSignal.User.pushSubscription.id

// Send to backend (using OkHttp/Retrofit)
val client = OkHttpClient()
val request = Request.Builder()
  .url("http://backend/api/notifications/onesignal/register")
  .post(RequestBody.create(
    """{"onesignalId": "$playerId", "platform": "Android"}""".toMediaType()
  ))
  .addHeader("Authorization", "Bearer $authToken")
  .addHeader("Content-Type", "application/json")
  .build()

client.newCall(request).execute()
```

### Flutter

```dart
import 'package:onesignal_flutter/onesignal_flutter.dart';
import 'package:http/http.dart' as http;

// Initialize
OneSignal.initialize("your-app-id-here");
OneSignal.Notifications.requestPermission(true);

// Get device ID
var deviceId = OneSignal.User.pushSubscription.id;

// Send to backend
final response = await http.post(
  Uri.parse('http://backend/api/notifications/onesignal/register'),
  headers: {
    'Authorization': 'Bearer $authToken',
    'Content-Type': 'application/json',
  },
  body: jsonEncode({
    'onesignalId': deviceId,
    'platform': 'iOS', // or 'Android'
  }),
);
```

## 🧪 Testing with Postman

1. Import: `postman/OneSignal.postman_collection.json`
2. Create variables:
   - `baseUrl`: http://localhost:3000
   - `auth_token`: [from login]
3. Run requests in order:
   - Get Login Token
   - Register OneSignal ID
   - Get OneSignal Status
   - Send Test Notification
   - Send to All Workers
   - etc.

## 🔧 Configuration Options

### OneSignal Dashboard Settings

After credentials are set, configure in OneSignal dashboard:

1. **Notification Settings**
   - Default title/message
   - Sound preferences
   - Image settings

2. **Segmentation**
   - Create segments (workers, premium users, etc.)
   - Add tags to users
   - Create filters

3. **Analytics**
   - Track delivery rates
   - Monitor opens/clicks
   - View conversion data

4. **Integrations**
   - Slack notifications
   - Webhook delivery
   - Email integration

## 📊 Monitoring

### Check Server Logs

```bash
# Watch for OneSignal events
tail -f your-server.log | grep OneSignal
```

### OneSignal Dashboard Analytics

- **Delivery**: How many received the notification
- **Opens**: How many opened the notification
- **Clicks**: How many clicked action buttons
- **Unsubscribes**: How many opted out

## ⚠️ Important Notes

### Security
- Never expose `ONESIGNAL_REST_API_KEY` in client-side code
- Use environment variables only on server
- Validate user permissions before sending notifications
- Rate limit notification endpoints

### Best Practices
- ✅ DO segment notifications by user type
- ✅ DO test notifications before sending
- ✅ DO monitor delivery rates
- ✅ DO provide opt-out mechanism
- ❌ DON'T send too many notifications
- ❌ DON'T use only uppercase text
- ❌ DON'T send at odd hours

### Database
- User model includes OneSignal fields
- Both FCM and OneSignal can coexist
- Choose which to use per notification

## 📚 Files Reference

| File | Purpose |
|------|---------|
| `src/shared/services/onesignal.service.js` | Core OneSignal service |
| `src/modules/notifications/notification.onesignal.controller.js` | API controllers |
| `src/modules/notifications/notification.routes.js` | Updated routes with OneSignal endpoints |
| `src/modules/users/user.model.js` | Updated with OneSignal fields |
| `ONESIGNAL_INTEGRATION.md` | Complete documentation |
| `ONESIGNAL_SETUP.md` | Setup instructions |
| `verify-onesignal-setup.js` | Setup verification script |
| `postman/OneSignal.postman_collection.json` | Postman test collection |

## 🎓 Learning Resources

- **OneSignal Docs**: https://documentation.onesignal.com
- **API Reference**: https://documentation.onesignal.com/reference
- **SDKs**: https://onesignal.com/download
- **Blog**: https://onesignal.com/blog

## ❓ FAQs

**Q: Do I need to uninstall FCM?**
A: No, both can coexist. Users can have both FCM and OneSignal IDs.

**Q: How do I migrate from FCM to OneSignal?**
A: Gradually update your notification code to prefer OneSignal over FCM.

**Q: Can I schedule notifications?**
A: Yes, use `POST /api/notifications/onesignal/schedule` endpoint.

**Q: How do I target specific users?**
A: Send to user IDs array or create segments in OneSignal dashboard.

**Q: Are notifications end-to-end encrypted?**
A: OneSignal uses TLS for transport security. Device-level encryption depends on OS.

## ✅ Next Steps

1. ✅ Get OneSignal credentials
2. ✅ Add to `.env` file
3. ✅ Restart server
4. ✅ Configure mobile apps
5. ✅ Test with Postman
6. ✅ Start sending notifications!

---

**Version**: 1.0.0  
**Last Updated**: December 8, 2024  
**Status**: ✅ Production Ready

Need help? Check `ONESIGNAL_INTEGRATION.md` for detailed documentation!
