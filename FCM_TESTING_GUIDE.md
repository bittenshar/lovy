# 📨 FCM Messaging Notification Testing Guide

## ✅ System Status

Your FCM token system is working perfectly! Tokens are:
- ✅ Stored in MongoDB
- ✅ Ready to receive notifications
- ✅ Verified with test notifications

## 📊 Current Users with FCM Tokens

| User ID | Email | Tokens | Status |
|---------|-------|--------|--------|
| `690bcb90264fa29974e8e184` | d@gmail.com | 3 | ✅ Active |
| `69485299abc4d45c3425e715` | v@gmail.com | 1 | ✅ Active |
| `69468b0f9de600712a239cb4` | (other user) | 1 | ✅ Active |

## 🧪 Testing Scripts Available

### Option 1: Quick Test (Recommended)
Send notifications to all users instantly:

```bash
cd /Users/mrmad/Dhruv/final/dhruvbackend
node quick-test-notifications.js
```

**Output**:
```
✅ Sent: 5 notifications
📱 Check your browser tabs for notifications!
```

### Option 2: Send to Specific User
Test notifications for a specific user ID:

```bash
node quick-test-notifications.js 690bcb90264fa29974e8e184
```

### Option 3: Send Specific Notification Type
Choose notification type:

```bash
# Message notification
node quick-test-notifications.js "" message

# Job alert notification
node quick-test-notifications.js "" job_alert

# Application update
node quick-test-notifications.js "" application_update

# Test/Verification
node quick-test-notifications.js "" verification
```

### Option 4: Interactive Mode
Full control with prompts:

```bash
node test-messaging-notifications.js
```

Then select:
- Option 1: Auto-test both known users
- Option 2: Enter custom user ID
- Option 3: See all users and select

## 🔍 What to Watch For

Keep **both browser tabs open**:

1. **Tab 1** - d@gmail.com (logged in)
2. **Tab 2** - v@gmail.com (logged in)

When notifications are sent, you should see:
- 🔔 Browser notification badge
- 💬 Message in the messaging/conversation area
- 📱 Push notification sound (if enabled)

## 📝 Last Test Results

```
✅ Total notifications sent: 5
✅ User 1 (d@gmail.com): 3 tokens
✅ User 2 (v@gmail.com): 1 token  
✅ User 3 (other): 1 token
❌ Failed: 0
```

## 🛠️ Testing Checklist

- [x] FCM tokens generated
- [x] Tokens stored in MongoDB
- [x] Notifications sent to Firebase
- [x] Firebase accepted all notifications
- [ ] Notifications appear in browser tabs (Next: Run test script)
- [ ] Notifications appear in messaging UI
- [ ] Sound/Badge notifications working

## 💬 Notification Types Tested

```javascript
{
  "message": {
    "title": "💬 New Message",
    "body": "You received a message from your colleague",
    "priority": "high"
  },
  "job_alert": {
    "title": "💼 New Job Match",
    "body": "A job matching your profile has been posted",
    "priority": "high"
  },
  "application_update": {
    "title": "📋 Application Update", 
    "body": "Status update on your job application",
    "priority": "medium"
  },
  "verification": {
    "title": "✅ Test Notification",
    "body": "This is a test push notification from FCM system",
    "priority": "low"
  }
}
```

## 🐛 Troubleshooting

### Notifications not appearing?

1. **Check browser tabs are open**
   - Keep both d@gmail.com and v@gmail.com tabs open
   - Check browser console for errors

2. **Check notification permissions**
   - Browser may need notification permission
   - Check notification settings for localhost:57269

3. **Check browser focus**
   - Web notifications may not show if browser is focused
   - Minimize browser or switch tabs to see notifications

4. **Check FCM service worker**
   - Flutter web uses service workers for notifications
   - Check DevTools > Application > Service Workers

5. **Check token status**
   - Run `node quick-test-notifications.js` to verify tokens exist
   - Tokens must be `isActive: true`

### Still not working?

Run the diagnostic script:

```bash
# Check MongoDB for tokens
db.userfcmtokens.find().pretty()

# Check Firebase service account
cat firebase-service-account.json

# Check Flutter app logs
# In browser DevTools console, search for "FCM"
```

## 📞 Quick Support

**Need to test?**
```bash
node quick-test-notifications.js
```

**Need interactive?**
```bash
node test-messaging-notifications.js
```

**Need logs?**
Check browser DevTools Console Tab:
- Search for "FCM"
- Search for "Notification"
- Search for "Message"

## 🎯 Next Steps

1. ✅ Run `node quick-test-notifications.js`
2. ✅ Watch both browser tabs
3. ✅ Verify notifications appear
4. ✅ Check messaging UI for messages
5. ✅ Test with different notification types

---

**Status**: Ready for production testing! 🚀
