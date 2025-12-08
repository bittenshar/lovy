📋 OneSignal Credentials Issue - How to Fix

═══════════════════════════════════════════════════════════════════════

The current API key is organization-level and doesn't have permission to 
send notifications. You need the APP-LEVEL REST API key.

🔑 How to Get the Correct Keys:

1. Go to OneSignal Dashboard: https://dashboard.onesignal.com

2. Click on your app: "daksh's Org App"

3. In the left sidebar, click "Settings"

4. Click "Keys & IDs" tab

5. Look for these values:
   ✓ App ID (also called "Application ID") → Copy this
   ✓ REST API Key (also called "REST API Key") → Copy this

6. Update your .env file (/Users/mrmad/Dhruv/dhruvbackend/src/config/config.env):

   OLD VALUES (Organization-level - for read-only):
   ────────────────────────────────────────────
   ONESIGNAL_APP_ID=7903f839-afc3-4db6-a49d-78f4a3540ce1
   ONESIGNAL_REST_API_KEY=os_v2_org_bquxueskpfaojlctzcer7uuez3...
   

   NEW VALUES (App-level - for sending notifications):
   ───────────────────────────────────────────────────
   ONESIGNAL_APP_ID=[Your App ID from dashboard]
   ONESIGNAL_REST_API_KEY=[Your REST API Key from dashboard]
   

7. Save the file and restart your server

🚀 Quick Test After Update:

Run: npm run dev
Then: node test-onesignal-fix.js

✅ Success Criteria:
- Test notifications send successfully
- No "Access denied" errors
- Status returns 200 with notification ID

═══════════════════════════════════════════════════════════════════════

Current Status:
✓ App ID (correct): 7903f839-afc3-4db6-a49d-78f4a3540ce1
✗ REST API Key: Needs app-level key (not org-level)

Once you update these values, everything will work!
