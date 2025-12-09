# 🚀 FCM Token Debugging - Action Plan

## What I Fixed
✅ **Backend Improvements:**
1. Added detailed FCM token validation (must be 100+ characters with `:` or `_`)
2. Improved logging to show token details when sending notifications
3. Added automatic token clearing when Firebase reports invalid token
4. Better error categorization in Firebase service
5. Created diagnostic scripts to check token validity

✅ **Files Updated:**
- `src/modules/notifications/notification.service.js` - Better validation & logging
- `src/modules/notifications/notification.push.controller.js` - Token validation on registration
- `src/services/firebase-notification.service.js` - Detailed error logging

✅ **New Diagnostic Tools:**
- `check-fcm-tokens.js` - Check all registered tokens
- `check-user-fcm-token.js` - Check specific user's token
- `FCM_TOKEN_RESOLUTION.md` - Comprehensive resolution guide

---

## Current Issue

Your user `69307854e324845ecb080759` has a **VALID FCM TOKEN REGISTERED**, but Firebase still rejects it with:
```
❌ Error sending notification: Requested entity was not found
```

**Possible Causes:**
1. ✅ Firebase credentials ARE loaded (service account file exists)
2. ❌ **Token might be from OLD Firebase project** (before credentials were set up)
3. ❌ **Token might have expired** (very old registration)
4. ❌ **Device might have been uninstalled** (Firebase doesn't know about it)

---

## Next Steps (Follow In Order)

### 1. Check Current Token Status
```bash
cd /Users/mrmad/Dhruv/dhruvbackend
node check-user-fcm-token.js
```

This will show:
- Is token format valid? ✅ or ❌
- Token length
- When it was last updated
- **Action to take** based on findings

### 2. If Token Seems Valid
The token format is OK, but Firebase doesn't recognize it. Options:

**Option A: Regenerate Token (Recommended)**
```bash
cd /Users/mrmad/Dhruv/dhruvflutter
flutter clean
flutter run --debug
```

**Option B: Clear & Re-register Token**
```bash
# Delete the token (with auth token)
curl -X DELETE http://localhost:5000/api/notifications/register-token \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"

# Wait for app to auto-register new token (should happen on app restart)
# Or manually call token registration endpoint
```

### 3. Monitor Token Registration
When app registers token, check backend logs for:
```
📱 FCM token registered for user ...
   Token length: 152+
   Token preview: xxxxx...xxxxx
   Platform: android
```

If token length is < 100, there's a problem with app's Firebase setup.

### 4. Test Notification Again
```bash
curl -X POST http://localhost:5000/api/notifications/test \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test", "message": "Test"}'
```

Expected log:
```
✅ FCM push notification sent to user ...
```

---

## Verification

After changes, you should see in backend logs:

1. **When app registers:**
   ```
   📱 FCM token registered for user email@example.com
      Token length: 152
      Token preview: eF-8XM_Sv:APA91...o_2BVxZp
      Platform: android
   ```

2. **When sending notification:**
   ```
   📤 Attempting to send FCM notification to user 69307854e324845ecb080759
      Token preview: eF-8XM_Sv:APA91...o_2BVxZp
   ✅ FCM push notification sent to user 69307854e324845ecb080759: Test Title
   ```

3. **If token is invalid:**
   ```
   ❌ Firebase error for user 69307854e324845ecb080759:
      Error: Requested entity was not found
   ⚠️ Clearing invalid FCM token for user 69307854e324845ecb080759
   ```

---

## Key Endpoints

| Action | Endpoint | Command |
|--------|----------|---------|
| Check health | `GET /api/fcm/health` | `curl http://localhost:5000/api/fcm/health` |
| Register token | `POST /api/notifications/register-token` | Auto-called by app |
| Clear token | `DELETE /api/notifications/register-token` | Manual or on logout |
| Send test | `POST /api/notifications/test` | `curl -X POST ...` (see above) |

---

## Questions to Answer

Before we proceed, run this diagnostic:

```bash
cd /Users/mrmad/Dhruv/dhruvbackend
node check-user-fcm-token.js
```

And tell me:
1. Is the token showing ✅ **Valid** or ❌ **Invalid**?
2. What's the token length?
3. When was it last updated?
4. What's the platform?

This will help me pinpoint the exact issue.

---

**Created:** 2025-12-09
**Status:** Ready for token diagnostics
