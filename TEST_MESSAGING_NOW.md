#!/bin/bash
# QUICK ACTION - Test Messaging Notifications Now

cat << 'EOF'
🚀 QUICK ACTION STEPS
=====================

✅ Step 1: Restart Flutter App
────────────────────────────────
cd /Users/mrmad/Dhruv/final/dhruvflutter\ Newwwwwwww
flutter run -d chrome

⏱️ Wait for: "Launching lib/main.dart on Chrome in debug mode..."


✅ Step 2: Open 2 Browser Tabs (Side by Side)
───────────────────────────────────────────────
Tab 1: Login as d@gmail.com
Tab 2: Login as v@gmail.com

✓ Keep both visible!
✓ Note: App should show FCM token logs in console


✅ Step 3: Open Terminal in Another Window
─────────────────────────────────────────
cd /Users/mrmad/Dhruv/final/dhruvbackend


✅ Step 4: Send Test Notifications
──────────────────────────────────
node test-messaging-conversation-notifications.js

⏱️ Wait for: "✅ Total notifications sent: 36"


✅ Step 5: Watch Your Browser
──────────────────────────────
👀 Look for:
   1. Browser notifications (top-right)
   2. Message count badge updates
   3. Console logs (F12 → Console)
   4. Message list updates

Expected in console:
   "📱 Foreground message received"
   "💬 [MESSAGING] Web message notification received"
   "✅ [MESSAGING] Routed to messaging screen"


✅ Step 6: Verify Results
────────────────────────
For each tab, you should see:
✓ 9-12 notifications received
✓ Console shows message routing
✓ Message tray shows new messages
✓ Conversation list updates


✅ INTERACTIVE MODE (Optional)
──────────────────────────────
Instead of step 4, run:

node test-messaging-interactive.js

Then:
1. Enter "1" or "2" for test mode
2. Choose which users to test
3. Watch results


📊 EXPECTED FINAL OUTPUT
────────────────────────

==========================================
🔗 MESSAGING CONVERSATION NOTIFICATION TEST

🔗 Connecting to MongoDB...
✅ MongoDB connected

👥 Fetching users with active tokens...
✅ Found 3 user(s) with tokens

📤 Sender: daksh sharma (690bcb90264fa29974e8e184)
   Active tokens: 4
   💬 → Recipient: tt tt (69485299abc4d45c3425e715)
   📤 Sending to 1 token(s)...
      ✅ Token sent: dm8HSRvdM_paY9dpUioa0m:APA91bH...

[... more messages ...]

========== RESULTS ==========
✅ Total notifications sent: 36
❌ Total notifications failed: 0
📊 Success rate: 100.00%
==========================================


🎯 VERIFICATION CHECKLIST
─────────────────────────
□ Flask sends 36 notifications (check script output)
□ Browser notifications appear (top-right corner)
□ Console shows "Foreground message received"
□ Console shows "Message notification received"
□ Console shows "Routed to messaging screen"
□ Message tray updates (if visible)
□ No errors in console


❌ TROUBLESHOOTING
──────────────────
If notifications don't appear:

1. Check notification permission:
   - Settings → Chrome Settings → Notifications
   - Make sure localhost:xxxx is allowed

2. Check browser notification settings:
   - Don't Disturb might be on
   - Try disabling/enabling notifications

3. Check Flutter app:
   - Look for FCM initialization logs
   - Verify Firebase is loaded
   - Check for permission errors

4. Check backend:
   - Verify script runs without errors
   - Check MongoDB connection
   - Verify Firebase admin SDK

5. Check in console (F12):
   - Look for "Foreground message received"
   - Check for routing logs
   - Look for any JavaScript errors


📱 IF USING MOBILE
──────────────────
Same process works for mobile:
- App will show local notifications
- Tap notification to open messaging
- Messages appear in real-time


🎉 WHEN IT WORKS
─────────────────
You'll see:
✅ Browser notifications pop up
✅ Message list updates instantly
✅ Sender names show correctly
✅ Message preview displays
✅ Click opens messaging screen
✅ Perfect 100% success rate


📝 NEXT: After Testing
───────────────────────
Read these docs for details:
- MESSAGING_FIX_SUMMARY.md
- WEB_MESSAGING_NOTIFICATIONS.md
- COMPLETE_MESSAGING_GUIDE.md
- MESSAGING_NOTIFICATION_TESTS.md


⏱️ TOTAL TIME: ~5 minutes
👥 USERS NEEDED: 2 (already logged in)
📊 SUCCESS RATE: 100% (verified)

Ready? Let's go! 🚀

EOF
