📸 OneSignal Dashboard - Where to Find Your Credentials

═══════════════════════════════════════════════════════════════════════

🔐 STEP-BY-STEP GUIDE
─────────────────────────────────────────────────────────────────────

STEP 1: Open OneSignal Dashboard
────────────────────────────────
→ Go to: https://dashboard.onesignal.com
→ Login with your OneSignal account

STEP 2: Select Your Application  
────────────────────────────────
→ Look for "daksh's Org App"
→ Click on it to open the app

STEP 3: Navigate to Settings
────────────────────────────────
→ In the left sidebar, find "Settings"
→ Click "Settings"

STEP 4: Go to Keys & IDs
────────────────────────────────
→ Look for "Keys & IDs" section
→ Click on "Keys & IDs" tab

STEP 5: Copy Your Credentials
────────────────────────────────

You will see something like this:

┌─────────────────────────────────────────────────────────┐
│ Keys & IDs                                              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ App ID (Application ID)                                 │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 7903f839-afc3-4db6-a49d-78f4a3540ce1 [COPY]        │ │ ← COPY THIS
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ REST API Key                                            │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ os_v2_app_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX │ │ ← COPY THIS
│ │ (This starts with os_v2_app, not os_v2_org)        │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Note: Hide key button                                   │
│ The REST API Key shows "Reveal" if it's hidden          │
│                                                         │
└─────────────────────────────────────────────────────────┘

STEP 6: Update Your .env File
────────────────────────────────

File Location: /Users/mrmad/Dhruv/dhruvbackend/src/config/config.env

Edit and update these lines:

ONESIGNAL_APP_ID=7903f839-afc3-4db6-a49d-78f4a3540ce1
ONESIGNAL_REST_API_KEY=os_v2_app_[PASTE_THE_REST_API_KEY_HERE]
ONESIGNAL_ORGANIZATION_ID=0c297a12-4a79-40e4-ac53-c8891fd284ce

⚠️ IMPORTANT NOTES:
───────────────────

1. The REST API Key should start with "os_v2_app", NOT "os_v2_org"
   - os_v2_app = App-level key (for sending notifications) ✅
   - os_v2_org = Organization-level key (read-only) ❌

2. Keep these values PRIVATE (don't commit to GitHub)
   - .env file should be in .gitignore
   - Never share these keys publicly

3. The App ID format
   - Should be a UUID: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
   - Example: 7903f839-afc3-4db6-a49d-78f4a3540ce1

STEP 7: Verify the Update
─────────────────────────

After updating .env:

$ cat /Users/mrmad/Dhruv/dhruvbackend/src/config/config.env | grep ONESIGNAL

# Output should show:
# ONESIGNAL_APP_ID=7903f839-afc3-4db6-a49d-78f4a3540ce1
# ONESIGNAL_REST_API_KEY=os_v2_app_XXXXXXXXXXXXXXX...
# ONESIGNAL_ORGANIZATION_ID=0c297a12-4a79-40e4-ac53-c8891fd284ce

STEP 8: Test the Configuration
───────────────────────────────

Run: node test-onesignal-fix.js

Expected Output:
✅ OneSignal service initialized
✅ Test 1: Service Configuration
  ✓ App ID: ✅ Set
  ✓ API Key: ✅ Set (hidden)
  ✓ Is Configured: ✅ Yes

✅ Test 2: Send to Segment Method
  Sending test notification to "All" segment...
✅ SUCCESS: Notification sent!
📨 Notification ID: [notification-id]

═══════════════════════════════════════════════════════════════════════

❓ TROUBLESHOOTING
─────────────────────────────────────────────────────────────────────

Q: Where exactly is the REST API Key?
A: In OneSignal Dashboard → Your App → Settings → Keys & IDs
   It's labeled "REST API Key" and starts with "os_v2_app"

Q: What if I see "os_v2_org" instead of "os_v2_app"?
A: That's the ORGANIZATION key (read-only).
   You need the APP-level key which shows "os_v2_app"

Q: Where do I find "Settings" in OneSignal?
A: Left sidebar → Click your app name → Settings tab at the top

Q: How do I know if I copied the right key?
A: Check that:
   - It starts with "os_v2_app" (not "os_v2_org")
   - It's at least 100 characters long
   - It contains only alphanumeric characters

═══════════════════════════════════════════════════════════════════════

✅ Once Updated, Your System Will:
──────────────────────────────────

✅ Send notifications to specific users
✅ Send broadcasts to all workers/employers
✅ Schedule notifications
✅ Track delivery status
✅ Register devices
✅ Update user properties

═══════════════════════════════════════════════════════════════════════

Created: December 8, 2025
Last Updated: December 8, 2025
Status: Ready for OneSignal Dashboard Configuration
