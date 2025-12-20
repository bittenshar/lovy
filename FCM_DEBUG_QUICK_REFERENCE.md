# 🚀 FCM Messaging Debug - Quick Reference

## Start Here

### 1️⃣ Terminal 1: Backend with Debug Logs
```bash
cd dhruvbackend
npm start 2>&1 | grep -E "🔴|✅|❌"
```

### 2️⃣ Terminal 2: Send Test Message
```bash
# Option A: Use Postman (Recommended)
# Import: FCM-Messaging-Debug.postman_collection.json
# Run: "4️⃣ Send Message (FCM TEST)"

# Option B: Use curl
curl -X POST http://localhost:5000/api/conversations/{CONV_ID}/messages \
  -H "Authorization: Bearer {TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"body":"Test message"}'
```

### 3️⃣ Watch Terminal 1
Look for this pattern:
```
📨 [MSG] ===== SEND MESSAGE START =====
✅ [MSG] Message created successfully
🔴 [DEBUG-FCM] ===== FCM NOTIFICATION START =====
🔴 [DEBUG-UTIL] Firebase Initialized: true ← Must be TRUE
🔴 [DEBUG-UTIL] Found N FCM tokens ← Must be > 0
✅ [DEBUG-UTIL] FCM send successful ← Success indicator
```

---

## 🎯 Common Issues (Quick Fixes)

| Issue | Log Shows | Fix |
|-------|-----------|-----|
| **No tokens found** | `Found 0 FCM tokens` | Run Flutter app to register token |
| **Firebase not init** | `Firebase Initialized: false` | Check `firebase-service-account.json` exists |
| **Invalid token** | `messaging/invalid-registration-token` | Delete & re-register token on device |
| **No notification** | `✅ FCM send successful` but no notification | Check Flutter notification handler + device settings |
| **Template not found** | `Template 'messageReceived' not found` | Check templates in `notification/constant/` |

---

## 📂 Files Modified for Debug

| File | Purpose | Debug Prefix |
|------|---------|--------------|
| `src/modules/conversations/conversation.controller.js` | Message send flow | `🔴 [DEBUG-FCM]` |
| `src/modules/notification/notification.utils.js` | FCM utilities | `🔴 [DEBUG-UTIL]` + `🔴 [DEBUG-TEMPLATE]` |
| `lib/features/messaging/services/api_messaging_service.dart` | Flutter API calls | `🔴 [DEBUG-FLUTTER]` |

---

## 🔗 Complete Message Flow Map

```
🔴 [DEBUG-FLUTTER] ===== sendMessage START =====
    ↓
    POST /api/conversations/{id}/messages
    ↓
📨 [MSG] ===== SEND MESSAGE START =====
    ✅ Message created
    ↓
    🔴 [DEBUG-FCM] ===== FCM NOTIFICATION START =====
    For each recipient:
    ↓
    🔴 [DEBUG-TEMPLATE] ===== sendTemplatedNotification START =====
        Get template: "messageReceived"
        ↓
        🔴 [DEBUG-UTIL] ===== sendToUser START =====
            Check Firebase: Initialized ✅
            Find tokens: Found N ✅
            ↓
            For each token:
            🔴 [DEBUG-UTIL] Calling admin.messaging().send()...
            ✅ FCM send successful ← KEY SUCCESS POINT
            ↓
        🔴 [DEBUG-UTIL] FCM Batch Summary ✅
    🔴 [DEBUG-TEMPLATE] sendTemplatedNotification END ✅
    ✅ Notification sent
    ↓
📨 [MSG] ===== SEND MESSAGE END =====
    ↓
🔴 [DEBUG-FLUTTER] ===== sendMessage END =====
    Response: 201 with message data ✅
    ↓
🟢 [DEVICE] Firebase receives notification (if app handling)
```

---

## ✅ Success Checklist

When sending a message, you should see:

- [ ] `🔴 [DEBUG-FLUTTER]` appears (Flutter side working)
- [ ] `📨 [MSG]` logs (Backend received message)
- [ ] `🔴 [DEBUG-FCM]` logs (FCM notification triggered)
- [ ] `🔴 [DEBUG-TEMPLATE]` logs (Template found)
- [ ] `🔴 [DEBUG-UTIL] Firebase Initialized: true` (Firebase ready)
- [ ] `🔴 [DEBUG-UTIL] Found N FCM tokens` where N > 0 (Tokens exist)
- [ ] `✅ [DEBUG-UTIL] FCM send successful` (Message sent to Firebase)
- [ ] `✅` count = `Found` count (All tokens processed)

If any step is missing or shows ❌ → See "Common Issues" table

---

## 🛠️ Debug Commands

```bash
# Filter backend logs for FCM only
npm start 2>&1 | grep "DEBUG-FCM"

# Filter for all debug logs
npm start 2>&1 | grep "🔴"

# Filter for errors
npm start 2>&1 | grep "❌"

# Filter for success
npm start 2>&1 | grep "✅"

# Check Firebase initialized
npm start 2>&1 | grep "Firebase Initialized"

# Check tokens found
npm start 2>&1 | grep "Found.*FCM tokens"

# Real-time database query
watch 'mongosh --eval "db.UserFcmToken.countDocuments()"'

# Count by device type
mongosh --eval "
  db.UserFcmToken.aggregate([
    { \$group: { _id: \"\\\$deviceType\", count: { \$sum: 1 } } }
  ])
"
```

---

## 🚨 Critical Error Codes

| Code | Means | Action |
|------|-------|--------|
| `invalid-registration-token` | Token expired/invalid | Re-register on device |
| `registration-token-not-registered` | Token doesn't exist in FCM | Delete from DB |
| `mismatched-credential` | Wrong Firebase project | Update `google-services.json` in Flutter |
| `message-rate-exceeded` | Too many messages | Add delays between sends |
| `third-party-auth-error` | Firebase auth issue | Check credentials file |

---

## 📊 Database Quick Checks

```bash
# 1. Do tokens exist?
db.UserFcmToken.countDocuments()
# Should be > 0

# 2. Are they active?
db.UserFcmToken.countDocuments({ isActive: true })
# Should match count from #1

# 3. Find tokens for specific user
db.UserFcmToken.find({ userId: ObjectId("<id>") }).count()
# Should be > 0 for receiver

# 4. Check conversation exists
db.conversations.findOne({ _id: ObjectId("<conv_id>") })
# Should show both participants
```

---

## 🎓 Understanding Debug Output

### Good Output (Copy/Paste to Compare)
```
🔴 [DEBUG-UTIL] ===== sendToUser START =====
🔴 [DEBUG-UTIL] User ID: 507f1f77bcf86cd799439011
🔴 [DEBUG-UTIL] Firebase Initialized: true
🔴 [DEBUG-UTIL] Found 1 FCM tokens
🔴 [DEBUG-UTIL] Token Details:
  [0] Token: f2bxRW8...
  [0] Device Type: android
  [0] Active: true
🔴 [DEBUG-UTIL] Calling admin.messaging().send()...
✅ [DEBUG-UTIL] FCM send successful. Response ID: 1234567890
🔴 [DEBUG-UTIL] FCM Batch Summary:
  - Total tokens: 1
  - Successfully sent: 1
  - Failed: 0
✅ [DEBUG-FCM] FCM notification sent successfully
```

### Bad Output (What to Look For)
```
🔴 [DEBUG-UTIL] Firebase Initialized: false ← ❌ PROBLEM
// OR
🔴 [DEBUG-UTIL] ⚠️  No tokens found for user ← ❌ PROBLEM  
// OR
❌ [DEBUG-UTIL] FCM error code: invalid-registration-token ← ❌ PROBLEM
// OR
🔴 [DEBUG-TEMPLATE] ❌ Template not found ← ❌ PROBLEM
```

---

## 📞 Get Help

1. **Collect all logs** with emoji filtered:
   ```bash
   npm start 2>&1 | grep -E "🔴|✅|❌" > logs.txt
   ```

2. **Check this checklist**: [FCM_MESSAGING_DEBUG_CHECKLIST.md](./FCM_MESSAGING_DEBUG_CHECKLIST.md)

3. **Read full guide**: [FCM_MESSAGING_DEBUG_GUIDE.md](./FCM_MESSAGING_DEBUG_GUIDE.md)

4. **Use Postman**: [FCM-Messaging-Debug.postman_collection.json](./FCM-Messaging-Debug.postman_collection.json)

---

## 🎬 One-Minute Test

```bash
# 1. Start backend (Terminal 1)
npm start 2>&1 | grep -E "🔴|✅|❌"

# 2. Send message via Postman (Terminal 2)
# Import: FCM-Messaging-Debug.postman_collection.json
# Click: "4️⃣ Send Message (FCM TEST)"

# 3. Check output (Terminal 1)
# Should see 10+ 🔴 logs and multiple ✅ success markers

# ✅ = Success | ❌ = Problem found | 🔴 = Debug output
```

---

**Last Updated**: 2024-12-20  
**Version**: 1.0 - Debug Edition  
**Status**: Complete backend & Flutter debug logging installed

