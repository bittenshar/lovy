# 🎯 QUICK START - FCM Testing

## ⚡ 3-Step Quick Test

### Step 1: Start Backend (Terminal 1)
```bash
cd /Users/mrmad/Dhruv/dhruvbackend
npm start
```

✅ Look for: `Firebase Admin SDK initialized successfully`

### Step 2: Run App (Terminal 2)
```bash
cd /Users/mrmad/Dhruv/dhruvflutter
flutter run --debug
```

✅ Look for: `✅ FCM token registered with backend successfully`

### Step 3: Test Notification
```bash
# Get a valid auth token first, then:
curl -X POST http://localhost:3000/api/notifications/test \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","message":"Works!"}'
```

✅ Check phone for notification 📲

---

## 🔍 Debug Checklist

- [ ] Backend running on `http://localhost:3000`
- [ ] Firebase credentials loaded (`firebase-service-account.json` exists)
- [ ] App uses local URL: `http://10.0.2.2:3000/api`
- [ ] Flutter logs show token registration
- [ ] Backend logs show `📱 FCM token registered...`
- [ ] Test notification endpoint returns success
- [ ] Notification appears on device

---

## 📝 One-Line Commands

```bash
# Check backend health
curl http://localhost:3000/api/fcm/health

# Check registered tokens
cd /Users/mrmad/Dhruv/dhruvbackend && node check-fcm-tokens.js

# Restart backend
pkill -f "npm start" && npm start

# Clean and rebuild app
cd /Users/mrmad/Dhruv/dhruvflutter && flutter clean && flutter run --debug
```

---

**Fixed:** App now sends FCM tokens to local backend ✅
