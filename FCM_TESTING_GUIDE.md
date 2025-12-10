# FCM Notification Testing Guide

## What We Fixed

We've implemented a complete fix for the `messaging/registration-token-not-registered` error. Here's what was done:

### Backend Changes

1. **Updated `registerFCMToken` endpoint** - Now saves tokens to BOTH:
   - `User.fcmToken` (backward compatibility)
   - `FCMToken` collection (used by message service)

2. **Enhanced Firebase notification service** - Handles batch failures gracefully:
   - Automatically marks invalid tokens as inactive
   - Non-blocking error handling
   - Detailed failure logging

3. **Improved message routes** - Non-blocking FCM notification sending:
   - Message sent even if notification fails
   - Graceful error handling

4. **Added new endpoints**:
   - `POST /api/notifications/cleanup-tokens` - Clean up invalid tokens
   - `POST /api/notifications/refresh-token` - Refresh user's token
   - `GET /api/notifications/debug/user-tokens/:userId` - Debug token storage

### Flutter Changes

1. **Enhanced FCM initialization** - Token refresh listener:
   - Automatically updates backend when token changes
   - Handles token lifecycle

2. **Implemented token registration** - Actually sends tokens to backend:
   - Uses `NotificationApiService.registerFcmToken()`
   - Happens automatically after login

## Testing Instructions

### Test 1: Verify Tokens Are Registered

```bash
# List tokens in database
node check-fcm-tokens.js
```

Expected output: Users with tokens in BOTH User collection AND FCMToken collection

### Test 2: Send a Message (Trigger FCM)

**Option A: Using the test script**
```bash
node test-message-fcm.js
```

This will:
1. Login user 1
2. Login user 2
3. Create a conversation
4. Send a message from user 1 to user 2
5. Display FCM notification status

**Option B: Using Postman/curl**

```bash
# 1. Login
POST /api/auth/login
{
  "email": "user1@example.com",
  "password": "password"
}
# Save the token from response

# 2. Send message
POST /api/messages/send
Authorization: Bearer <token>
{
  "conversationId": "...",
  "receiverId": "...",
  "text": "Test message"
}
```

### Test 3: Check FCM Token For Specific User

```bash
GET /api/notifications/debug/user-tokens/<userId>
Authorization: Bearer <token>
```

Returns:
- Tokens in User collection
- Tokens in FCMToken collection
- Active status
- Last used time

### Test 4: Clean Up Invalid Tokens

```bash
POST /api/notifications/cleanup-tokens
Authorization: Bearer <admin-token>
```

This verifies all tokens and marks invalid ones as inactive.

## How to Test Locally

### Step 1: Ensure Server is Running
```bash
cd /Users/mrmad/Dhruv/dhruvbackend
npm start  # or: node src/server.js
```

### Step 2: Check Health
```bash
curl http://localhost:3000/api/notifications/health
```

Should return: `{"success": true, "firebase": {"initialized": true, "status": "Ready"}}`

### Step 3: Run Migration (if needed)
```bash
node migrate-fcm-tokens.js
```

Migrates existing tokens from User collection to FCMToken collection.

### Step 4: Send Test Message
```bash
node test-message-fcm.js
```

### Step 5: Watch Server Logs
The server logs will show:
```
✅ [FCM] Token registered for user
📱 [MSG] Sending FCM notification to receiver
✅ [FCM] Batch notifications sent: X success
```

## Expected Behavior

### Success Case (Tokens Valid)
1. User sends message
2. Receiver has active FCM token
3. Server logs: "✅ [FCM] Batch notifications sent: 1 success"
4. Notification appears on receiver's device

### Warning Case (No Tokens)
1. User sends message
2. Receiver has no active tokens
3. Server logs: "⚠️ [MSG] No active FCM tokens found for receiver"
4. Message still sent successfully
5. No notification appears (but app doesn't crash)

### Error Case (Invalid Token)
1. User sends message
2. Token is invalid in Firebase
3. Server logs: "❌ [FCM] X notification(s) failed"
4. Token marked as inactive
5. Message still sent successfully

## Troubleshooting

### "No active FCM tokens found for receiver"
**Cause**: Receiver hasn't logged in with Flutter app yet
**Solution**: Recipient must login with the Flutter app to register their token

### "registration-token-not-registered"
**Cause**: Token doesn't exist in Firebase or is from wrong project
**Solution**: 
1. Verify Firebase project ID in service account
2. Run cleanup endpoint to remove bad tokens
3. Users should reinstall app to get new tokens

### Message sent but no notification
**Cause**: Multiple possibilities:
1. Receiver has no active tokens
2. Token is invalid/expired
3. Notification permission not granted
**Solution**: Check server logs and run debug endpoint

## Files Created/Modified

### New Files
- `check-fcm-tokens.js` - Debug script to check token storage
- `migrate-fcm-tokens.js` - Migration script to populate FCMToken collection
- `test-message-fcm.js` - Test script for message + FCM flow
- `test-fcm-flow.js` - Comprehensive FCM registration flow test
- `FCM_TOKEN_FIX_SUMMARY.md` - Detailed fix documentation

### Modified Files
- `src/controllers/notification.controller.js` - Enhanced token registration
- `src/modules/notifications/notification.routes.js` - Added debug endpoints
- `services/firebaseNotificationService.js` - Improved error handling
- `src/modules/messages/message.routes.js` - Better error handling
- `lib/firebase_msg.dart` - Token refresh listener
- `lib/core/state/auth_provider.dart` - Auto token registration on login

## Key Improvements

✅ **Dual Storage**: Tokens now stored in both User and FCMToken collections
✅ **Graceful Failures**: Message sends even if notification fails
✅ **Auto Cleanup**: Invalid tokens marked inactive automatically
✅ **Token Refresh**: Automatic token refresh when Firebase refreshes
✅ **Better Logging**: Detailed logs for debugging
✅ **Debug Endpoints**: Check token storage status
✅ **Migration Scripts**: Easy data migration between collections

## Next Steps

1. Deploy backend changes to production
2. Redeploy Flutter app to have users get new tokens
3. Run migration script on production database
4. Monitor logs for FCM errors
5. Run cleanup endpoint periodically

## Verification Checklist

- [ ] Server is running on port 3000
- [ ] FCM service is initialized
- [ ] Tokens exist in FCMToken collection
- [ ] Users can send messages
- [ ] Server logs show FCM attempts
- [ ] No more "registration-token-not-registered" errors
- [ ] Invalid tokens are cleaned up automatically
