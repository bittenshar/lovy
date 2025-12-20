# 🎨 FCM Messaging Debug - Visual Guides

## Complete Message Flow with Debug Points

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                         FLUTTER APP (Sender)                       ┃
┃                                                                     ┃
┃  User types: "Hello World"                                         ┃
┃  │                                                                  ┃
┃  ↓                                                                  ┃
┃  messagingService.sendMessage(                                     ┃
┃    conversationId: "conv_123",                                     ┃
┃    content: "Hello World"                                          ┃
┃  )                                                                  ┃
┃  │                                                                  ┃
┃  ↓ 🔴 [DEBUG-FLUTTER] ===== sendMessage START =====               ┃
┃  │ 🔴 [DEBUG-FLUTTER] Conversation ID: conv_123                   ┃
┃  │ 🔴 [DEBUG-FLUTTER] Message Content: Hello World                ┃
┃  │ 🔴 [DEBUG-FLUTTER] Auth Token Present: true                    ┃
┃  │ 🔴 [DEBUG-FLUTTER] Request Body: { body: "Hello World" }       ┃
┃  │                                                                  ┃
┃  ↓                                                                  ┃
┃  HTTP POST /api/conversations/conv_123/messages                    ┃
┃                                                                     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
                                 │
                                 │ (Network)
                                 │
                                 ↓
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                      BACKEND (Node.js)                              ┃
┃                                                                     ┃
┃  Backend receives request                                          ┃
┃  │                                                                  ┃
┃  ↓ 📨 [MSG] ===== SEND MESSAGE START =====                        ┃
┃  │ 📨 [MSG] Conversation ID: conv_123                             ┃
┃  │ 📨 [MSG] Sender User ID: user_456                              ┃
┃  │ 📨 [MSG] Message text: Hello World                             ┃
┃  │                                                                  ┃
┃  ↓ (Create Message in DB)                                          ┃
┃  │ ✅ [MSG] Message created successfully: msg_789                 ┃
┃  │ ✅ [MSG] Message ID: msg_789                                   ┃
┃  │                                                                  ┃
┃  ↓ (Update Conversation)                                           ┃
┃  │ ✅ [MSG] Updated conversation metadata                          ┃
┃  │ ✅ [MSG] Updated unread counts                                  ┃
┃  │ ✅ [MSG] Conversation saved successfully                        ┃
┃  │                                                                  ┃
┃  ↓ (Get Recipients)                                                ┃
┃  │ 📨 [MSG] Recipients count: 1                                    ┃
┃  │ 📨 [MSG] Recipient IDs: [user_101]                             ┃
┃  │                                                                  ┃
┃  ↓ 🔴 [DEBUG-FCM] ===== FCM NOTIFICATION START =====              ┃
┃  │ 🔴 [DEBUG-FCM] Recipient ID: user_101                          ┃
┃  │ 🔴 [DEBUG-FCM] Recipient ID Type: object                       ┃
┃  │ 🔴 [DEBUG-FCM] Notification Template: messageReceived          ┃
┃  │ 🔴 [DEBUG-FCM] Sender Name: John Doe                           ┃
┃  │ 🔴 [DEBUG-FCM] Message Preview: Hello World                    ┃
┃  │ 🔴 [DEBUG-FCM] Conversation ID: conv_123                       ┃
┃  │ 🔴 [DEBUG-FCM] Message ID: msg_789                             ┃
┃  │                                                                  ┃
┃  ↓ (Call sendTemplatedNotification)                                ┃
┃  │ 🔴 [DEBUG-TEMPLATE] ===== sendTemplatedNotification START =====┃
┃  │ 🔴 [DEBUG-TEMPLATE] User ID: user_101                          ┃
┃  │ 🔴 [DEBUG-TEMPLATE] Template Name: messageReceived             ┃
┃  │ 🔴 [DEBUG-TEMPLATE] Template Args: ["John Doe", "Hello World"] ┃
┃  │                                                                  ┃
┃  │ ↓ (Lookup template function)                                    ┃
┃  │ │ 🔴 [DEBUG-TEMPLATE] ✅ Template found                        ┃
┃  │ │                                                               ┃
┃  │ ↓ (Call template with args)                                     ┃
┃  │ │ 🔴 [DEBUG-TEMPLATE] Calling template function...             ┃
┃  │ │ 🔴 [DEBUG-TEMPLATE] Template result: {                       ┃
┃  │ │   title: "New message from John Doe",                        ┃
┃  │ │   body: "Hello World"                                        ┃
┃  │ │ }                                                             ┃
┃  │ │                                                               ┃
┃  │ ↓ (Merge with additional data)                                  ┃
┃  │ │ 🔴 [DEBUG-TEMPLATE] Final notification data: {...}           ┃
┃  │ │ 🔴 [DEBUG-TEMPLATE] Calling sendToUser...                    ┃
┃  │ │                                                               ┃
┃  │ ↓ (Call sendToUser)                                             ┃
┃  │ │ ┌──────────────────────────────────────────────────────┐    ┃
┃  │ │ │ 🔴 [DEBUG-UTIL] ===== sendToUser START =====         │    ┃
┃  │ │ │ 🔴 [DEBUG-UTIL] User ID: user_101                   │    ┃
┃  │ │ │ 🔴 [DEBUG-UTIL] Firebase Initialized: true ← KEY!   │    ┃
┃  │ │ │                                                      │    ┃
┃  │ │ │ ↓ (Query database for tokens)                        │    ┃
┃  │ │ │ │ 🔴 [DEBUG-UTIL] Querying FCM tokens for user...   │    ┃
┃  │ │ │ │ 🔴 [DEBUG-UTIL] Found 1 FCM tokens ← KEY!         │    ┃
┃  │ │ │ │ 🔴 [DEBUG-UTIL] Token Details:                    │    ┃
┃  │ │ │ │   [0] Token: f2bxRW8t4vX9...                      │    ┃
┃  │ │ │ │   [0] Device Type: android                        │    ┃
┃  │ │ │ │   [0] Active: true                                │    ┃
┃  │ │ │ │                                                    │    ┃
┃  │ │ │ ↓ (For each token)                                   │    ┃
┃  │ │ │ │ 🔴 [DEBUG-UTIL] Sending to token: f2bxRW8...      │    ┃
┃  │ │ │ │ 🔴 [DEBUG-UTIL] Message to send: {                │    ┃
┃  │ │ │ │   token: "f2bxRW8...",                            │    ┃
┃  │ │ │ │   notification: { ... },                          │    ┃
┃  │ │ │ │   data: { type, action, conversationId, ... }     │    ┃
┃  │ │ │ │ }                                                  │    ┃
┃  │ │ │ │                                                    │    ┃
┃  │ │ │ ↓ (Call Firebase API)                                │    ┃
┃  │ │ │ │ 🔴 [DEBUG-UTIL] Calling admin.messaging().send().. │   ┃
┃  │ │ │ │                                                    │    ┃
┃  │ │ │ ↓ (Firebase sends to device)                         │    ┃
┃  │ │ │ │ ✅ [DEBUG-UTIL] FCM send successful!              │    ┃
┃  │ │ │ │ ✅ [DEBUG-UTIL] Response ID: 123456789             │    ┃
┃  │ │ │ │                                                    │    ┃
┃  │ │ │ ↓ (Batch summary)                                    │    ┃
┃  │ │ │ │ 🔴 [DEBUG-UTIL] FCM Batch Summary:                │    ┃
┃  │ │ │ │   - Total tokens: 1                               │    ┃
┃  │ │ │ │   - Successfully sent: 1 ← MATCH!                │    ┃
┃  │ │ │ │   - Failed: 0                                     │    ┃
┃  │ │ │ │                                                    │    ┃
┃  │ │ │ └──────────────────────────────────────────────────────┘   ┃
┃  │ │ │ 🔴 [DEBUG-UTIL] ===== sendToUser END =====          │    ┃
┃  │ │ │                                                       │    ┃
┃  │ │ ↓ 🔴 [DEBUG-TEMPLATE] sendTemplatedNotification END    │    ┃
┃  │ │ ✅ [DEBUG-TEMPLATE] Result: { success: true, sent: 1 } │    ┃
┃  │                                                           │    ┃
┃  ↓ 🔴 [DEBUG-FCM] ===== FCM NOTIFICATION END =====          ┃
┃  │ ✅ [DEBUG-FCM] FCM notification sent successfully         ┃
┃  │                                                           ┃
┃  ↓ 📨 [MSG] ===== SEND MESSAGE END =====                    ┃
┃  │ ✅ Response: 201 Created                                  ┃
┃  │ ✅ Response body: { message data }                        ┃
┃  │                                                           ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
                                 │
                                 │ (Network - Response 201)
                                 │
                                 ↓
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃              FLUTTER APP (Sender) - Response Received              ┃
┃                                                                     ┃
┃  🔴 [DEBUG-FLUTTER] Response Status: 201                           ┃
┃  🔴 [DEBUG-FLUTTER] Response Body: { message }                     ┃
┃  ✅ [DEBUG-FLUTTER] Message sent successfully                      ┃
┃  🔴 [DEBUG-FLUTTER] ===== sendMessage END =====                    ┃
┃  │                                                                  ┃
┃  ↓                                                                  ┃
┃  UI Updates: Show message in chat                                  ┃
┃                                                                     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛


                        (Parallel: Firebase to Device)
                                 │
                                 ↓
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                    RECEIVER DEVICE (user_101)                      ┃
┃                                                                     ┃
┃  Firebase Cloud Messaging Service receives message                 ┃
┃  │                                                                  ┃
┃  ↓ Sends notification to device                                    ┃
┃  │ Notification: "New message from John Doe"                       ┃
┃  │ Body: "Hello World"                                             ┃
┃  │ Data: {                                                         ┃
┃  │   type: "new_message",                                          ┃
┃  │   action: "open_conversation",                                  ┃
┃  │   conversationId: "conv_123",                                   ┃
┃  │   messageId: "msg_789",                                         ┃
┃  │   senderName: "John Doe",                                       ┃
┃  │   ...                                                            ┃
┃  │ }                                                                ┃
┃  │                                                                  ┃
┃  ↓                                                                  ┃
┃  Flutter Firebase Messaging Handler Triggered:                     ┃
┃  │ 🟢 [RECEIVED] Foreground notification received                  ┃
┃  │ 🟢 [RECEIVED] Notification type: new_message                    ┃
┃  │ 🟢 [RECEIVED] From: John Doe                                    ┃
┃  │ 🟢 [RECEIVED] Conversation: conv_123                            ┃
┃  │                                                                  ┃
┃  ↓                                                                  ┃
┃  App processes notification:                                       ┃
┃  │ 1. Show push notification                                       ┃
┃  │ 2. Update UI if chat screen open                                ┃
┃  │ 3. Mark as read                                                 ┃
┃  │ 4. Play sound/vibrate                                           ┃
┃  │                                                                  ┃
┃  ↓                                                                  ┃
┃  User sees notification and message                                ┃
┃                                                                     ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

---

## Success Indicators Checklist

### ✅ Good Flow (All Green)
```
╔═══════════════════════════════════════════╗
║  Expected Log Output (GOOD - Copy This)   ║
╚═══════════════════════════════════════════╝

🔴 [DEBUG-FLUTTER] ===== sendMessage START =====
🔴 [DEBUG-FLUTTER] Conversation ID: conv_123
🔴 [DEBUG-FLUTTER] Message Content: Hello World
🔴 [DEBUG-FLUTTER] Auth Token Present: true
🔴 [DEBUG-FLUTTER] Response Status: 201
✅ [DEBUG-FLUTTER] Message sent successfully

📨 [MSG] ===== SEND MESSAGE START =====
✅ [MSG] Message created successfully: msg_789
🔴 [DEBUG-FCM] ===== FCM NOTIFICATION START =====

🔴 [DEBUG-TEMPLATE] ===== sendTemplatedNotification START =====
🔴 [DEBUG-TEMPLATE] Template Name: messageReceived
🔴 [DEBUG-TEMPLATE] ✅ Template found, calling with args...

🔴 [DEBUG-UTIL] ===== sendToUser START =====
🔴 [DEBUG-UTIL] Firebase Initialized: true          ← 🔑 KEY
🔴 [DEBUG-UTIL] Found 1 FCM tokens               ← 🔑 KEY
🔴 [DEBUG-UTIL] Token Details:
  [0] Token: f2bxRW8t4vX9...
  [0] Device Type: android
  [0] Active: true
🔴 [DEBUG-UTIL] Calling admin.messaging().send()...
✅ [DEBUG-UTIL] FCM send successful. Response ID: 123456789

🔴 [DEBUG-UTIL] FCM Batch Summary:
  - Total tokens: 1
  - Successfully sent: 1                         ← ✅ MATCH
  - Failed: 0

✅ [DEBUG-UTIL] ===== sendToUser END =====
✅ [DEBUG-TEMPLATE] sendTemplatedNotification END
✅ [DEBUG-FCM] FCM notification sent successfully

📨 [MSG] ===== SEND MESSAGE END =====
```

### ❌ Bad Flow (Red Flags)

#### Issue 1: Firebase Not Initialized
```
🔴 [DEBUG-UTIL] Firebase Initialized: false    ← ❌ PROBLEM
└─ Fix: Check firebase-service-account.json exists
```

#### Issue 2: No Tokens Found
```
🔴 [DEBUG-UTIL] Found 0 FCM tokens             ← ❌ PROBLEM
└─ Fix: User needs to register FCM token on device
```

#### Issue 3: FCM Send Failed
```
🔴 [DEBUG-UTIL] Calling admin.messaging().send()...
🔴 [DEBUG-UTIL] FCM error code: invalid-registration-token ← ❌ PROBLEM
└─ Fix: Delete and re-register token on device
```

#### Issue 4: Token Count Mismatch
```
🔴 [DEBUG-UTIL] FCM Batch Summary:
  - Total tokens: 1
  - Successfully sent: 0                       ← ❌ MISMATCH!
  - Failed: 1
└─ Fix: Check device logs for why send failed
```

---

## Decision Tree for Debugging

```
                        Message Sent?
                             │
                    ┌────────┴────────┐
                   YES                NO
                    │                 │
                    ↓                 ↓
            Check Firebase     Check Network
            Initialized?        Connection?
                    │                 │
         ┌──────────┴──────────┐     ❌ No
        YES                   NO      │
         │                    │       └─→ Fix network
         │                    │
         ↓                    ↓
    Check Tokens          Fix Firebase
    Found?                Credentials
         │                    │
    ┌────┴────┐               │
   YES       NO              │
    │        │               │
    │        └─→ Register    │
    │            Token on    │
    │            Device      │
    │                        │
    ↓                        ↓
  Check                  Restart
  FCM Send           Backend &
  Success?           Retry
    │
 ┌──┴──┐
YES   NO
 │     │
 │     └─→ Device
 │         Permissions
 │         OK?
 │             │
 │         ┌───┴───┐
 │        YES     NO
 │         │       │
 │         │       └─→ Grant
 │         │           Permissions
 │         │
 │         ↓
 │    Check App
 │    Handler
 │    Set Up?
 │         │
 │     ┌───┴───┐
 │    YES     NO
 │     │       │
 │     │       └─→ Implement
 │     │           onMessage
 │     │           Handler
 │     │
 │     ↓
 └─→ ✅ Working
```

---

## Log Density Map

Shows where most debug output is generated:

```
Backend Flow Intensity:
════════════════════════════════════════════════════════════════

┌────────────────────────┐
│  Flutter sendMessage   │  Low intensity
│  🔴 [DEBUG-FLUTTER]    │  (only 5-10 logs)
└────────────────────────┘
          ↓
┌────────────────────────┐
│ Message Creation       │  Low intensity
│ 📨 [MSG]              │  (only 5-10 logs)
└────────────────────────┘
          ↓
╔════════════════════════════════════════════╗
║ FCM NOTIFICATION BLOCK                    ║
║ 🔴 [DEBUG-FCM] (5-10 logs)                 ║ ← HIGH INTENSITY
║     ↓                                      ║
║ 🔴 [DEBUG-TEMPLATE] (5-10 logs)            ║ ← HIGH INTENSITY
║     ↓                                      ║
║ 🔴 [DEBUG-UTIL] (20-30 logs)               ║ ← HIGHEST INTENSITY
║ ✅ ✅ ✅ (5-10 success logs)                ║ ← SUCCESS INDICATORS
╚════════════════════════════════════════════╝
          ↓
┌────────────────────────┐
│ Response sent          │  Low intensity
└────────────────────────┘


When debugging, focus on the HIGH INTENSITY block
If that block is missing → FCM not triggered
If that block has ❌ → FCM failed
```

---

## Timeline: What Happens When

```
Time   Event                                    Debug Log
────────────────────────────────────────────────────────────────
T+0ms  User sends message                       (No log yet)
       └─→ Flutter prepares request

T+50ms 🔴 [DEBUG-FLUTTER] sendMessage START
       Request sent to backend

T+150ms Backend receives request                📨 [MSG] SEND MESSAGE START
       └─→ Message saved to DB                  ✅ Message created

T+200ms FCM notification triggered              🔴 [DEBUG-FCM] START
       └─→ For each recipient

T+250ms Template processing                     🔴 [DEBUG-TEMPLATE] START
       └─→ Get template data

T+300ms Token lookup                            🔴 [DEBUG-UTIL] START
       └─→ Query database                       🔴 Found N tokens

T+350ms Firebase API call                       🔴 Calling admin.messaging()...
       └─→ Send to Firebase

T+400ms Firebase returns success                ✅ FCM send successful
       └─→ Notification queued

T+450ms Response sent to Flutter                📨 [MSG] END (201)
       └─→ UI updates

T+500ms 🔴 [DEBUG-FLUTTER] sendMessage END

T+500-3000ms Firebase delivers to device        (Firebase ↔ Device)
       └─→ Device receives notification

T+3000ms+ App handles notification              🟢 [RECEIVED] Foreground
       └─→ Show to user
```

---

## Error Code Quick Reference

```
╔═════════════════════════════════════════════════════════════════╗
║              FCM Error Codes & Quick Fixes                      ║
╠═════════════════════════════════════════════════════════════════╣
║ Error Code                      │ Meaning         │ Quick Fix   ║
╠─────────────────────────────────┼─────────────────┼─────────────╣
║ invalid-registration-token      │ Token invalid   │ Re-register ║
║ registration-token-not-registered│ Token gone      │ Re-register ║
║ mismatched-credential          │ Wrong Firebase  │ Update app  ║
║ message-rate-exceeded          │ Too many msgs   │ Add delay   ║
║ third-party-auth-error         │ Auth issue      │ Check creds ║
║ instance-id-error              │ Device ID issue │ Reinstall   ║
║ invalid-argument               │ Bad data        │ Check code  ║
║ internal-error                 │ Firebase error  │ Retry later ║
╚═════════════════════════════════════════════════════════════════╝
```

---

## Success Rate Visualization

```
If you see this:                    Your success rate is:

✅ (only 1 log)                     ~10% - Critical failures
✅ ✅ (only 2 logs)                 ~20% - Major issues
✅ ✅ ✅ (3-5 logs)                  ~40% - Partial success
✅ ✅ ✅ ✅ ✅ (5-10 logs)            ~70% - Good progress
✅ ✅ ✅ ✅ ✅ ✅ ✅ ✅ (8+ logs)       ~95%+ - Almost there
✅ ✅ ✅ ✅ ✅ ✅ ✅ ✅ ✅ ✅ (10+ logs)  🎉 SUCCESS!

Count the ✅ in your flow to estimate success
```

---

## One-Page Reference

```
┌──────────────────────────────────────────────────────────────────┐
│                    FCM DEBUG FLOW AT A GLANCE                     │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Flutter                Backend              Firebase             │
│  ┌─────────────┐       ┌──────────────┐     ┌──────────┐         │
│  │sendMessage()│──────→│Message       │────→│Send to   │         │
│  │🔴 [DEBUG]   │       │creation      │     │FCM       │         │
│  │             │       │              │     │          │         │
│  │             │       │Look for      │────→│Delivers  │         │
│  │             │       │tokens        │     │to device │         │
│  │             │       │              │     │          │         │
│  │             │←──201 Created───────────────────      │         │
│  │             │       │              │     │          │         │
│  └─────────────┘       │🔴 [DEBUG]    │     │🟢 Device │         │
│  ✅ Success            │✅ Success    │     │Receives  │         │
│                        │              │     │          │         │
│  Key Logs:             │Key Check:    │     │          │         │
│  • Response 201        │• Firebase OK │     │          │         │
│  • Auth token present  │• Found N>0   │     │          │         │
│  • Message sent        │  tokens      │     │          │         │
│                        │• FCM send ✅  │     │          │         │
│                        │              │     │          │         │
└──────────────────────────────────────────────────────────────────┘
```

