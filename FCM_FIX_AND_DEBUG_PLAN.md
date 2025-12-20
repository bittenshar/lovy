# 🚨 FCM Not Working - Action Plan

## Current Issue
- Flutter sends message successfully (201 status)
- Backend is on **Vercel** (production)
- **NO debug logs visible** = Backend code execution not showing in Vercel logs

## Why You're Not Seeing Logs
❌ `console.log()` - Does NOT appear in Vercel serverless functions
✅ `console.error()` - **DOES appear** in Vercel logs

**Just Fixed**: Changed all backend logs to `console.error()` so you'll see FCM debug info in Vercel!

---

## 🔧 Immediate Steps to Debug

### Step 1: Deploy Backend Changes to Vercel
```bash
cd dhruvbackend
git add -A
git commit -m "🔴 Add console.error FCM logs for Vercel visibility"
git push
# Wait 2-3 minutes for Vercel to redeploy
```

### Step 2: Check Vercel Logs While Sending Message
1. Go to **Vercel Dashboard** → Your Project
2. Click **"Functions"** tab
3. Look for your API endpoint logs
4. Keep this open while testing

### Step 3: Send Test Message from Flutter
```
Send a message from the app
```

### Step 4: Check Vercel Logs for These Patterns
**Look for lines starting with:**
- `🔴 [FCM-START]` - Message entering FCM code
- `🔴 [FCM-RESULT]` - FCM send result
- `✅ [FCM-SUCCESS]` - FCM sent successfully
- `❌ [FCM-EXCEPTION]` - FCM error occurred
- `🔴 [FCM-WARN]` - Warning about no tokens

---

## 📋 What Should Happen When You Send a Message

### In Flutter Logs (Working ✅)
```
💬 [MESSAGING] Calling sendMessage API...
📤 [MSG] Response status: 201
✅ [MSG] Message sent successfully
```

### In Vercel Logs (Should see after fix)
```
🔴 [FCM-START] Sending notification to: <recipient_id>
🔴 [FCM-RESULT] Success: true | Sent: 1 | Failed: 0
✅ [FCM-SUCCESS] FCM notification sent to: <recipient_id>
```

---

## 🔍 If FCM Still Not Working After Deployment

### Check 1: Do FCM Tokens Exist?

**Option A: Use MongoDB directly**
```bash
db.UserFcmToken.find({ userId: ObjectId("<your_user_id>") }).pretty()
```

Should show:
```json
{
  "_id": ObjectId(...),
  "userId": ObjectId(...),
  "token": "eZUttMITQ1aqQGCR9fYgrT:APA91...",
  "deviceType": "android",
  "isActive": true,
  "createdAt": ISODate(...)
}
```

**If empty**: User hasn't registered FCM token on device
- Make sure Flutter app initialized Firebase correctly
- Check device has FCM permission granted

### Check 2: Is Firebase Initialized?

Look in Vercel logs for:
```
Firebase Initialized: true ← MUST BE TRUE
```

If `false`:
- Firebase credentials file missing on Vercel
- Check `.env` has `FIREBASE_PROJECT_ID`
- Verify `firebase-service-account.json` is in correct folder

### Check 3: Token Send Attempt

Look for:
```
🔴 [FCM-RESULT] Success: true | Sent: 1 | Failed: 0
```

**If Success is false or Sent is 0:**
- Tokens exist but Firebase can't send
- Might be invalid/expired tokens
- Check error details in logs

---

## 🆘 Common Scenarios

### Scenario 1: "Firebase not initialized"
```
Firebase Initialized: false
```
**Solution:**
1. Check Vercel environment variables
2. Upload `firebase-service-account.json` to Vercel
3. Set `FIREBASE_PROJECT_ID` in `.env`
4. Redeploy

### Scenario 2: "No tokens found for user"
```
Found 0 FCM tokens
```
**Solution:**
1. Device hasn't registered token
2. Run Flutter app
3. Check MongoDB has tokens
4. Resend message

### Scenario 3: "Token invalid or expired"
```
FCM error code: messaging/invalid-registration-token
```
**Solution:**
1. Delete old tokens from MongoDB
2. Have user re-register (restart app)
3. Send message again

### Scenario 4: "Message sent BUT no notification on device"
```
FCM notification sent to: <recipient_id>
// But device doesn't receive it
```
**This is a Flutter/Device issue, not backend:**
1. Check Firebase message handler in Flutter
2. Check notification permissions on device
3. Check app is not in Background/Killed state
4. Restart app and try again

---

## 📊 Quick Check Endpoint

**Added** `FCM_HEALTH_CHECK.js` endpoint:

```bash
# To add to routes, insert this in conversation.routes.js:
router.get('/fcm-check', controller.fcmHealthCheck);

# Then test:
curl "http://localhost:5000/api/conversations/fcm-check?userId=<user_id>"
```

Response shows:
- Firebase status
- Token count
- Token details
- Recommendations

---

## 🚀 Next Steps

1. **Deploy changes** → `git push` to Vercel
2. **Wait 2-3 min** → Vercel redeploys
3. **Send message** → From Flutter app
4. **Check logs** → Vercel dashboard, search for `🔴 [FCM`
5. **Report what you see** → Show me the log lines

---

## 📝 Summary

| Issue | Before Fix | After Fix |
|-------|-----------|-----------|
| Backend logs visible on Vercel | ❌ No | ✅ Yes |
| Can debug FCM flow | ❌ No | ✅ Yes |
| Know if Firebase initialized | ❌ No | ✅ Yes |
| Know token count | ❌ No | ✅ Yes |
| See FCM send result | ❌ No | ✅ Yes |

Once deployed, you'll have **full visibility** into the FCM flow on production!

