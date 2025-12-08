# 🚀 OneSignal Integration Guide

## Overview

OneSignal is integrated into WorkConnect backend to provide reliable, cross-platform push notifications. This guide covers setup, configuration, and usage.

## Features

✅ **Cross-Platform Support**
- iOS push notifications
- Android push notifications  
- Web push notifications
- Email notifications

✅ **Targeting Options**
- Send to specific users
- Send to user segments
- Send to all users
- Send to all workers/employers

✅ **Advanced Features**
- Scheduled notifications
- Rich notifications with images
- Custom data payloads
- Notification tracking and analytics

✅ **User Management**
- Register users with OneSignal
- Update user properties
- Add users to segments
- Delete users

## Setup Instructions

### 1. Create OneSignal Account

1. Visit https://onesignal.com
2. Sign up for free account
3. Create new app/project

### 2. Get OneSignal Credentials

After creating an app in OneSignal dashboard:

- **App ID**: Found in Settings → App ID (or under Apps list)
- **REST API Key**: Found in Settings → Keys & IDs → REST API Key

### 3. Configure Environment Variables

Add to `.env` file:

```env
ONESIGNAL_APP_ID=your-app-id-here
ONESIGNAL_REST_API_KEY=your-rest-api-key-here
```

Example:
```env
ONESIGNAL_APP_ID=12345678-1234-1234-1234-123456789012
ONESIGNAL_REST_API_KEY=NTk0ZjAxZWUtMjI2NS00ZmM3LWExOTktNGRkYzA1ZWIzNzMx
```

### 4. Restart Server

```bash
npm run dev
```

You should see:
```
✅ OneSignal service initialized
```

## API Endpoints

### Register OneSignal ID

Register a user's device with OneSignal.

**Endpoint**: `POST /api/notifications/onesignal/register`

**Headers**:
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "onesignalId": "user-device-id-from-onesignal",
  "platform": "iOS",
  "deviceInfo": {
    "deviceModel": "iPhone 14",
    "osVersion": "16.5",
    "appVersion": "1.0.0"
  }
}
```

**Response**:
```json
{
  "status": "success",
  "message": "OneSignal ID registered successfully",
  "data": {
    "userId": "user-id",
    "onesignalId": "device-id",
    "platform": "iOS",
    "registeredAt": "2024-12-08T10:30:00Z"
  }
}
```

### Get OneSignal Status

Get current user's OneSignal registration status.

**Endpoint**: `GET /api/notifications/onesignal/status`

**Headers**:
```
Authorization: Bearer <jwt-token>
```

**Response**:
```json
{
  "status": "success",
  "data": {
    "userId": "user-id",
    "onesignalId": "device-id",
    "platform": "iOS",
    "registered": true,
    "registeredAt": "2024-12-08T10:30:00Z",
    "deviceInfo": {
      "deviceModel": "iPhone 14"
    }
  }
}
```

### Send Push Notification

Send notification to specific users or segments.

**Endpoint**: `POST /api/notifications/onesignal/send`

**Headers**:
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "title": "New Job Alert",
  "message": "A job matching your profile is available",
  "users": ["user-id-1", "user-id-2"],
  "segments": [],
  "data": {
    "jobId": "job-123",
    "jobTitle": "Software Developer"
  },
  "imageUrl": "https://example.com/image.png",
  "priority": "high"
}
```

**Parameters**:
- `title` (string, required): Notification title
- `message` (string, required): Notification message body
- `users` (array, optional): Array of user IDs to target
- `segments` (array, optional): Array of segment names to target
- `data` (object, optional): Custom data to send with notification
- `imageUrl` (string, optional): URL to large image
- `priority` (string, optional): 'high', 'medium', or 'low' (default: 'high')

**Response**:
```json
{
  "status": "success",
  "message": "Push notification sent successfully",
  "data": {
    "onesignalResult": "notification-id",
    "targetedUsers": 2,
    "segments": []
  }
}
```

### Send to All Workers

Send notification to all registered workers.

**Endpoint**: `POST /api/notifications/onesignal/send-to-workers`

**Headers**:
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "title": "System Update",
  "message": "WorkConnect app has been updated",
  "data": {
    "updateRequired": true
  }
}
```

### Send to All Employers

Send notification to all registered employers.

**Endpoint**: `POST /api/notifications/onesignal/send-to-employers`

**Headers**:
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "title": "New Feature Available",
  "message": "Check out our new team management features",
  "data": {
    "featureId": "team-mgmt-v2"
  }
}
```

### Test Notification

Send test notification to current user.

**Endpoint**: `POST /api/notifications/onesignal/test`

**Headers**:
```
Authorization: Bearer <jwt-token>
```

**Response**:
```json
{
  "status": "success",
  "message": "Test notification sent successfully",
  "data": {
    "success": true,
    "notificationId": "notification-123"
  }
}
```

### Schedule Notification

Schedule notification for future delivery.

**Endpoint**: `POST /api/notifications/onesignal/schedule`

**Headers**:
```
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "title": "Reminder",
  "message": "Your scheduled notification",
  "scheduledTime": "2024-12-10T15:30:00Z",
  "users": ["user-id"],
  "data": {}
}
```

### Get Notification Status

Get details about a sent notification.

**Endpoint**: `GET /api/notifications/onesignal/:notificationId/status`

**Headers**:
```
Authorization: Bearer <jwt-token>
```

**Response**:
```json
{
  "status": "success",
  "data": {
    "id": "notification-id",
    "recipients": 150,
    "failed": 2,
    "converted": 45
  }
}
```

### Unregister OneSignal ID

Unregister device from OneSignal.

**Endpoint**: `DELETE /api/notifications/onesignal/unregister`

**Headers**:
```
Authorization: Bearer <jwt-token>
```

**Response**:
```json
{
  "status": "success",
  "message": "OneSignal ID unregistered successfully"
}
```

## Implementation Examples

### JavaScript/Node.js (Backend)

```javascript
const onesignalService = require('./src/shared/services/onesignal.service');

// Send to specific user
await onesignalService.sendToUser('user-123', {
  title: 'New Message',
  message: 'You have a new message',
  data: { conversationId: 'conv-456' }
});

// Send to segment
await onesignalService.sendToSegment('workers', {
  title: 'Job Available',
  message: 'New job posted in your area',
  data: { jobId: 'job-789' }
});

// Send to all
await onesignalService.sendToAll({
  title: 'System Maintenance',
  message: 'Scheduled maintenance tonight'
});

// Register user
await onesignalService.registerUser('user-123', {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  userType: 'worker'
});

// Schedule notification
await onesignalService.scheduleNotification({
  title: 'Reminder',
  message: 'Check your applications',
  users: ['user-123'],
  scheduledTime: new Date('2024-12-15T10:00:00Z')
});
```

### Flutter Integration

```dart
// Register OneSignal ID
Future<void> registerOneSignal(String onesignalId) async {
  try {
    final response = await http.post(
      Uri.parse('$_baseUrl/notifications/onesignal/register'),
      headers: {
        'Authorization': 'Bearer $authToken',
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'onesignalId': onesignalId,
        'platform': Platform.isIOS ? 'iOS' : 'Android',
        'deviceInfo': {
          'deviceModel': 'iPhone 14',
          'osVersion': '16.5'
        }
      }),
    );

    if (response.statusCode == 200) {
      print('✅ OneSignal registered successfully');
    }
  } catch (e) {
    print('❌ Error registering OneSignal: $e');
  }
}

// Get OneSignal status
Future<Map<String, dynamic>> getOneSignalStatus() async {
  try {
    final response = await http.get(
      Uri.parse('$_baseUrl/notifications/onesignal/status'),
      headers: {
        'Authorization': 'Bearer $authToken',
      },
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body)['data'];
    }
  } catch (e) {
    print('❌ Error getting OneSignal status: $e');
  }
  return {};
}
```

### iOS Setup (Swift)

```swift
import OneSignalFramework

// Initialize OneSignal
class AppDelegate: UIResponder, UIApplicationDelegate {
  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    // OneSignal initialization
    OneSignal.initialize("your-app-id-here", withLaunchOptions: launchOptions)
    
    // Request user permission for notifications
    OneSignal.Notifications.requestPermission({ accepted in
      print("User accepted notifications: \(accepted)")
    }, fallback: true)
    
    return true
  }
}

// Get OneSignal player ID
let playerId = OneSignal.User.pushSubscription.id
print("OneSignal Player ID: \(playerId ?? "")")
```

### Android Setup (Kotlin)

```kotlin
import com.onesignal.OneSignal

class MainActivity : AppCompatActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    
    // Initialize OneSignal
    OneSignal.initWithContext(this)
    OneSignal.setAppId("your-app-id-here")
    
    // Request notification permission
    OneSignal.Notifications.requestPermission(true)
  }
}

// Get OneSignal player ID
val playerId = OneSignal.User.pushSubscription.id
Log.d("OneSignal", "Player ID: $playerId")
```

## Using with Existing Notifications

OneSignal integrates with the existing FCM notification system:

1. **FCM**: Light-weight, good for high-volume notifications
2. **OneSignal**: Rich features, better analytics, scheduled sends

Both can work together:

```javascript
// User registers FCM token
POST /api/notifications/register-token
{ "fcmToken": "..." }

// User also registers OneSignal ID
POST /api/notifications/onesignal/register
{ "onesignalId": "..." }

// Both systems now active for user
// Can choose which to use per notification
```

## Segmentation

Create segments in OneSignal dashboard to target users:

- **workers**: All registered workers
- **employers**: All registered employers
- **active**: Users active in last 7 days
- **premium**: Premium plan subscribers
- **custom_tag_name**: Custom segments

## Troubleshooting

### OneSignal not sending notifications

1. **Check credentials** in `.env`:
   ```bash
   echo $ONESIGNAL_APP_ID
   echo $ONESIGNAL_REST_API_KEY
   ```

2. **Verify user registration**:
   - POST to `/api/notifications/onesignal/register`
   - Check response for success

3. **Check OneSignal dashboard**:
   - Verify app settings
   - Check Delivery report
   - Review error logs

4. **Test with Postman**:
   ```
   POST /api/notifications/onesignal/test
   Authorization: Bearer <token>
   ```

### User not receiving notifications

1. **Device offline**: OneSignal queues notifications
2. **App not installed**: Ensure app is from OneSignal-configured bundle
3. **Permissions denied**: Request notification permission on device
4. **Invalid OneSignal ID**: Verify correct format

### Check Server Logs

```bash
# Watch logs for OneSignal events
tail -f your-server.log | grep OneSignal
```

## Best Practices

✅ **DO**:
- Validate inputs before sending notifications
- Use meaningful titles and messages
- Include useful data in payloads
- Test with test notification first
- Monitor delivery rates

❌ **DON'T**:
- Send too many notifications (avoid spam)
- Use all caps in messages
- Send notifications at odd hours
- Forget to handle unregistered users
- Ignore failed delivery warnings

## Monitoring & Analytics

View in OneSignal Dashboard:
- **Delivery**: Number of successful deliveries
- **Opens**: Number of notification opens
- **Clicks**: Number of action clicks
- **Unsubscribes**: Number of users who disabled
- **Conversion tracking**: Revenue/goals generated

## Rate Limits

OneSignal free tier:
- Up to 30,000 subscribers
- Unlimited notifications
- Full API access

Paid tiers support millions of subscribers.

## Support & Resources

- **OneSignal Docs**: https://documentation.onesignal.com
- **API Reference**: https://documentation.onesignal.com/reference
- **Status Page**: https://status.onesignal.com
- **Support**: https://onesignal.com/contact

## Migration from FCM

To migrate all users from FCM to OneSignal:

1. Deploy OneSignal integration
2. Users register OneSignal IDs alongside FCM tokens
3. Gradually transition notifications to OneSignal
4. Remove FCM implementation when fully migrated

```javascript
// Gradual migration strategy
const shouldUseOneSignal = Math.random() < 0.5; // 50% OneSignal

if (shouldUseOneSignal && onesignalService.isReady()) {
  await onesignalService.sendToUser(userId, options);
} else if (user.fcmToken) {
  // Use existing FCM implementation
}
```

## Summary

OneSignal provides enterprise-grade push notifications with:
- ✅ Cross-platform support (iOS, Android, Web)
- ✅ Advanced targeting and segmentation
- ✅ Scheduled delivery
- ✅ Rich notification support
- ✅ Detailed analytics
- ✅ Easy integration

Get started by setting credentials in `.env` and registering OneSignal IDs from your mobile app!
