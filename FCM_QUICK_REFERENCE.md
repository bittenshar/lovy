# FCM Fix - Quick Reference

## Problem
❌ `messaging/registration-token-not-registered` error when sending notifications

## Root Cause
- Tokens saved to `User.fcmToken` ❌
- But message service looks in `FCMToken` collection ❌
- Token mismatch = notifications fail

## Solution
- ✅ Save tokens to BOTH collections
- ✅ Handle batch failures gracefully  
- ✅ Auto-cleanup invalid tokens
- ✅ Message always succeeds, FCM is bonus

## Quick Start

### 1. Verify Tokens in Database
```bash
node check-fcm-tokens.js
```

### 2. Migrate Old Tokens (if needed)
```bash
node migrate-fcm-tokens.js
```

### 3. Test Message + FCM Flow
```bash
node test-message-fcm.js
```

## Key Endpoints

### Register Token
```
POST /api/notifications/register-token
Headers: Authorization: Bearer <token>
Body: {
  "fcmToken": "...",
  "platform": "android",
  "deviceId": "flutter-device",
  "deviceName": "Flutter Device"
}
```

### Debug User Tokens
```
GET /api/notifications/debug/user-tokens/:userId
Headers: Authorization: Bearer <token>
```

### Cleanup Invalid Tokens
```
POST /api/notifications/cleanup-tokens
Headers: Authorization: Bearer <admin-token>
```

### Send Message (Triggers FCM)
```
POST /api/messages/send
Headers: Authorization: Bearer <token>
Body: {
  "conversationId": "...",
  "receiverId": "...",
  "text": "Hello!"
}
```

## Expected Server Logs

### Success
```
✅ [FCM] Token registered for user xyz
📱 [MSG] Sending FCM notification to receiver
✅ [FCM] Batch notifications sent: 1 success
```

### Warning (No Tokens)
```
⚠️ [MSG] No active FCM tokens found for receiver
```

### Error (Invalid Token - Auto-cleaned)
```
❌ [FCM] Token marked as inactive
```

## Architecture

```
User A (Sender)           User B (Receiver)
    |                          |
    +-- Login -> Get auth token
    |
    +-- Send message via /api/messages/send
         |
         +-- Message saved ✅
         |
         +-- Look up receiver's tokens
         |     |
         |     +-- User.fcmToken ✅
         |     +-- FCMToken collection ✅
         |
         +-- Send Firebase batch
              |
              +-- Success: notification sent ✅
              +-- Failure: token marked inactive ❌ (doesn't block message)
```

## Data Locations

### Tokens Stored In:

1. **User Collection** (User.fcmToken)
   - Updated by: `registerFCMToken` endpoint
   - Used by: User profile, auth system
   - Indexed: Yes

2. **FCMToken Collection**
   - Updated by: `registerFCMToken` endpoint (new)
   - Used by: Message notification service
   - Indexed: Yes (userId, isActive)

## Environment Variables

```env
MONGO_URI=mongodb+srv://...  # MongoDB connection
FIREBASE_SERVICE_ACCOUNT=... # Firebase credentials
PORT=3000                     # Server port
```

## Files Modified

```
Backend:
- src/controllers/notification.controller.js (registerFCMToken enhanced)
- services/firebaseNotificationService.js (batch error handling)
- src/modules/messages/message.routes.js (non-blocking FCM)
- src/modules/notifications/notification.routes.js (new endpoints)

Flutter:
- lib/firebase_msg.dart (token refresh listener)
- lib/core/state/auth_provider.dart (auto registration on login)

Utils:
- check-fcm-tokens.js (database verification)
- migrate-fcm-tokens.js (data migration)
- test-message-fcm.js (integration test)
```

## Troubleshooting

| Issue | Check | Fix |
|-------|-------|-----|
| No tokens in FCMToken | `node check-fcm-tokens.js` | `node migrate-fcm-tokens.js` |
| Message sent, no notify | User has no token | User must login with Flutter app |
| Notification fails | FCM service | Check Firebase credentials |
| Old tokens fail | Invalid in Firebase | Run cleanup endpoint |

## Success Criteria

- [x] Tokens in both collections
- [x] Messages send successfully
- [x] Notifications sent when token available
- [x] No error on missing tokens
- [x] Invalid tokens auto-cleanup
- [x] Detailed logging
- [x] Migration script ready
- [x] Test scripts provided

## Next Actions

1. Deploy code changes
2. Run migration script on production
3. Test end-to-end flow
4. Monitor logs
5. Users login with new Flutter app for fresh tokens
6. Done ✅

## Support

**Detailed docs**: See `FCM_FIX_COMPLETE_SUMMARY.md`
**Testing guide**: See `FCM_TESTING_GUIDE.md`
**Server logs**: Watch for `[FCM]` prefix messages
