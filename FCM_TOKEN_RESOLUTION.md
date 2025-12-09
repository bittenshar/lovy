# 🔧 FCM Token Issue - Resolution Guide

## Problem
Your app is receiving `❌ Error sending notification: Requested entity was not found` when trying to send FCM notifications.

**Root Cause:** The FCM token stored in your database is **invalid or was generated before Firebase credentials were set up**.

## Solution Steps

### Step 1: Check Current FCM Tokens in Database
Run this command to see what tokens are registered:

```bash
cd /Users/mrmad/Dhruv/dhruvbackend
node check-fcm-tokens.js
```

This will show you:
- ✅ If token is valid (has correct format)
- ❌ If token is invalid (too short or wrong format)
- Token length and preview

### Step 2: Clear Invalid Tokens
If you see invalid tokens (❌), clear them from your user account:

```bash
# Option A: Via Database (direct)
# MongoDB: Find your user and delete the fcmToken field

# Option B: Via API (with auth token)
curl -X DELETE http://localhost:5000/api/notifications/register-token \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

### Step 3: Regenerate Valid Token from App
The Flutter app must generate a **new, valid** FCM token:

1. **Clear app data** (to reset Firebase):
   ```bash
   flutter clean
   ```

2. **Rebuild and run the app**:
   ```bash
   flutter run --debug
   ```

3. **Observe the logs** for:
   ```
   📱 FCM Token: <very_long_string>
   ```
   Should be 150+ characters with `:` or `_` separators.

4. **App auto-registers the token** to `/api/notifications/register-token`

### Step 4: Verify Token Registration
Check the backend logs when app registers:
```
📱 FCM token registered for user {email}
   Token length: 152+
   Token preview: xxxxxx...xxxxxx
   Platform: android
```

### Step 5: Test Notification
Send a test notification:

```bash
curl -X POST http://localhost:5000/api/notifications/test \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test",
    "message": "Test notification"
  }'
```

Expected logs on backend:
```
📤 Attempting to send FCM notification to user xxxxx
   Token preview: xxxxxx...xxxxxx
✅ FCM push notification sent to user xxxxx: Test
```

## Understanding FCM Token Format

**Valid FCM Token:**
- Length: 140+ characters
- Contains separators: `:` (Android) or `_` (sometimes)
- Format: `eF-8XM_Sv...:APA91...` (example)

**Invalid Tokens:**
- Too short (< 100 chars)
- No `:` or `_` separators
- Test tokens: starts with `mock_` or `test_`

## Endpoints Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/notifications/register-token` | POST | Register FCM token (auto-called by app) |
| `/api/notifications/register-token` | DELETE | Clear FCM token (called on logout) |
| `/api/notifications/test` | POST | Send test notification |

## Common Issues

### "Requested entity was not found"
- Token is invalid or from wrong Firebase project
- Token has expired
- **Fix:** Clear token and regenerate from app

### "Invalid registration token"
- Token format is wrong
- Token was never valid
- **Fix:** Rebuild app with `flutter clean`

### Token is registered but no notification arrives
- Firebase credentials not loaded (check backend logs)
- Token permissions issue
- Device is offline
- **Fix:** Check backend logs and restart server

## Debugging

### Check Firebase is initialized:
```bash
curl http://localhost:5000/api/fcm/health
```

Should return:
```json
{
  "success": true,
  "firebase": {
    "initialized": true,
    "status": "Ready"
  }
}
```

### View all registered tokens:
```bash
node check-fcm-tokens.js
```

### View backend logs:
Look for these log patterns:
- `📱 FCM token registered` - Token received from app
- `📤 Attempting to send FCM` - Sending notification
- `❌ Firebase error` - Notification failed
- `✅ FCM push notification sent` - Success!

## Next Steps

1. Run `node check-fcm-tokens.js` to see current tokens
2. If invalid, clear them via DELETE API
3. Rebuild Flutter app with `flutter clean && flutter run --debug`
4. Monitor backend logs for token registration
5. Test with `/api/notifications/test` endpoint
6. Verify notification arrives on device

---

**Last Updated:** 2025-12-09
**Status:** Issue identified and logging improved
