# 🟢 Quick Start - FCM Debug & Fix

## What Just Changed
✅ All `console.log` → `console.error` (visible in Vercel logs)
✅ Added FCM Health Check endpoint
✅ Enhanced FCM result logging

---

## 🚀 Deploy & Test (5 minutes)

### 1️⃣ Deploy to Vercel
```bash
cd dhruvbackend
git add -A
git commit -m "FCM: Switch to console.error for Vercel visibility"
git push
```
**Wait 2-3 minutes** for Vercel to redeploy.

### 2️⃣ Test FCM Health Check
Before sending message, check if system is ready:

```bash
# Replace <user_id> with actual user ID
# Replace <token> with JWT token

curl -X GET \
  "https://lovy-dusky.vercel.app/api/conversations/fcm-check/<user_id>" \
  -H "Authorization: Bearer <token>"
```

**Expected Response:**
```json
{
  "status": "success",
  "data": {
    "firebaseInitialized": true,
    "tokensFound": 1,
    "tokens": [
      {
        "token": "eZUttMITQ1aqQGCR9fYgrT:APA91...",
        "deviceType": "android",
        "isActive": true
      }
    ],
    "recommendation": "✅ 1 active token(s) - FCM should work"
  }
}
```

### 3️⃣ Send Test Message from Flutter

Open app and send a message from one user to another.

### 4️⃣ Check Vercel Logs

Go to: **Vercel Dashboard** → **Functions** tab

Look for these in the logs:
```
🔴 [FCM-START] Sending notification to: <user_id>
🔴 [FCM-RESULT] Success: true | Sent: 1 | Failed: 0
✅ [FCM-SUCCESS] FCM notification sent to: <user_id>
```

---

## 📊 What Each Log Means

| Log | Status | Action |
|-----|--------|--------|
| `Firebase Initialized: true` | ✅ | Firebase loaded |
| `Firebase Initialized: false` | ❌ | Check credentials |
| `Found X FCM tokens` | ✅ if X > 0 | Tokens exist |
| `Found 0 FCM tokens` | ❌ | User needs to register |
| `Success: true \| Sent: 1` | ✅ | Notification sent |
| `Success: false \| Sent: 0` | ❌ | No notification |

---

## 🔧 Troubleshooting

### No Backend Logs in Vercel?
- Restart Vercel deployment
- Force refresh Vercel logs page
- Wait a few seconds after sending message

### "Firebase Initialized: false"
1. Check Vercel **Environment Variables**
2. Add `FIREBASE_PROJECT_ID`
3. Ensure `firebase-service-account.json` in `/src/modules/notification/`
4. Redeploy

### "Found 0 FCM tokens"
1. Device hasn't registered FCM token
2. Run Flutter app
3. Restart Flutter app
4. Resend message

### "Success: false"
Check Vercel logs for:
```
❌ [FCM-EXCEPTION]
```
Shows the actual error from Firebase.

---

## ✅ Success Indicators

When working correctly, you should see:

**Vercel Logs:**
```
🔴 [FCM-START] Sending notification to: 690bcb90264fa29974e8e184
🔴 [FCM-RESULT] Success: true | Sent: 1 | Failed: 0
✅ [FCM-SUCCESS] FCM notification sent to: 690bcb90264fa29974e8e184
```

**Flutter Logs:**
```
✅ [MSG] Message sent successfully
```

**Device:**
```
Push notification received on device
```

---

## 📝 Commands Reference

### Test Health Check
```bash
curl -X GET "https://lovy-dusky.vercel.app/api/conversations/fcm-check/{USER_ID}" \
  -H "Authorization: Bearer {YOUR_TOKEN}"
```

### Check MongoDB for Tokens
```bash
# In mongosh connected to your DB
db.UserFcmToken.find({ userId: ObjectId("<user_id>") }).pretty()
```

### View Vercel Logs
```bash
vercel logs
```

---

## 🎯 Summary

| Before | After |
|--------|-------|
| ❌ No backend logs visible | ✅ All FCM logs visible |
| ❌ Don't know if Firebase loaded | ✅ See Firebase status |
| ❌ Don't know token count | ✅ See token count |
| ❌ Can't debug FCM failures | ✅ See exact error |

**You now have full visibility into FCM on production!** 🎉

