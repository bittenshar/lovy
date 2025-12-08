# OneSignal Configuration Instructions

## Step 1: Create OneSignal Account

1. Visit **https://onesignal.com**
2. Click "Get Started Free"
3. Sign up with your email
4. Create new app/project

## Step 2: Get Your Credentials

### From OneSignal Dashboard:

1. Go to https://dashboard.onesignal.com
2. Select your app/project
3. Go to **Settings** (⚙️ icon)
4. Click **Keys & IDs**

You will see:
- **App ID** - Copy this value
- **REST API Key** - Click "Show" and copy this value

### Example:
```
App ID: 12345678-1234-1234-1234-123456789012
REST API Key: NTk0ZjAxZWUtMjI2NS00ZmM3LWExOTktNGRkYzA1ZWIzNzMx
```

## Step 3: Add to `.env` File

Open `.env` in your project root and add:

```env
# OneSignal Push Notifications
ONESIGNAL_APP_ID=your-app-id-here
ONESIGNAL_REST_API_KEY=your-rest-api-key-here
```

**Example with real values:**
```env
ONESIGNAL_APP_ID=12345678-1234-1234-1234-123456789012
ONESIGNAL_REST_API_KEY=NTk0ZjAxZWUtMjI2NS00ZmM3LWExOTktNGRkYzA1ZWIzNzMx
```

## Step 4: Restart Server

```bash
npm run dev
```

You should see:
```
✅ OneSignal service initialized
```

## Step 5: Configure Mobile Apps

### iOS (Swift)

1. Go to OneSignal Dashboard → Settings → Platforms
2. Click on iOS
3. Follow Apple APNs setup
4. Add to your Podfile:
   ```
   pod 'OneSignal'
   ```
5. Initialize in AppDelegate:
   ```swift
   import OneSignalFramework
   
   OneSignal.initialize("your-app-id-here", withLaunchOptions: launchOptions)
   OneSignal.Notifications.requestPermission({ accepted in
     print("Notifications: \(accepted)")
   }, fallback: true)
   ```

### Android (Kotlin)

1. Go to OneSignal Dashboard → Settings → Platforms
2. Click on Android
3. Follow FCM setup
4. Add to build.gradle:
   ```
   implementation 'com.onesignal:OneSignal:[5, 6)'
   ```
5. Initialize in MainActivity:
   ```kotlin
   import com.onesignal.OneSignal
   
   OneSignal.initWithContext(this)
   OneSignal.setAppId("your-app-id-here")
   OneSignal.Notifications.requestPermission(true)
   ```

### Flutter

1. Add to pubspec.yaml:
   ```yaml
   dependencies:
     onesignal_flutter: ^5.0.0
   ```

2. Initialize:
   ```dart
   import 'package:onesignal_flutter/onesignal_flutter.dart';
   
   OneSignal.initialize("your-app-id-here");
   OneSignal.Notifications.requestPermission(true);
   ```

## Step 6: Test Integration

### Using Postman:

1. Import: `postman/OneSignal.postman_collection.json`
2. Login to get auth token
3. Run "Register OneSignal ID" request
4. Run "Send Test Notification" request

### Or use cURL:

```bash
# Register OneSignal ID
curl -X POST http://localhost:3000/api/notifications/onesignal/register \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "onesignalId": "device-id-from-onesignal-sdk",
    "platform": "iOS"
  }'

# Send test notification
curl -X POST http://localhost:3000/api/notifications/onesignal/test \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## API Endpoints (After Configuration)

All these endpoints will now work:

```
POST   /api/notifications/onesignal/register              - Register device
GET    /api/notifications/onesignal/status                - Get status
DELETE /api/notifications/onesignal/unregister            - Unregister device
POST   /api/notifications/onesignal/send                  - Send to users
POST   /api/notifications/onesignal/send-to-workers       - Send to all workers
POST   /api/notifications/onesignal/send-to-employers     - Send to all employers
POST   /api/notifications/onesignal/test                  - Send test
POST   /api/notifications/onesignal/schedule              - Schedule notification
GET    /api/notifications/onesignal/:id/status            - Get notification status
```

## Verify Setup

```bash
node verify-onesignal-setup.js
```

## Troubleshooting

### Issue: "OneSignal not configured"

**Solution**: Check your `.env` file has:
```bash
echo $ONESIGNAL_APP_ID
echo $ONESIGNAL_REST_API_KEY
```

Both should show values, not empty.

### Issue: "Failed to send notification"

1. Verify App ID and API Key are correct
2. Check OneSignal dashboard for API errors
3. Ensure user has OneSignal ID registered
4. Check server logs for details

### Issue: "App not receiving notifications"

1. Verify app is installed from correct bundle
2. Check notification permissions on device
3. Ensure OneSignal is initialized in app
4. Check OneSignal dashboard for delivery report

## Documentation

- Full Guide: `ONESIGNAL_INTEGRATION.md`
- Postman Collection: `postman/OneSignal.postman_collection.json`
- Setup Verification: `verify-onesignal-setup.js`

## Next Steps

After configuration:
1. ✅ Credentials added to `.env`
2. ✅ Server restarted
3. ✅ Mobile app configured
4. ✅ OneSignal ID registered
5. ✅ Test notification sent
6. ✅ Users receiving notifications

Happy pushing! 🚀
