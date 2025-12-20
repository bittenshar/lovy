#!/bin/bash

# FCM Messaging Debug Test Script
# Usage: ./debug-messaging.sh

echo "🔴 FCM Messaging Debug Test"
echo "=============================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if backend is running
echo "📋 Checking Backend Status..."
BACKEND_URL="http://localhost:5000"
if curl -s "$BACKEND_URL/api/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend is running${NC}"
else
    echo -e "${RED}❌ Backend is not running at $BACKEND_URL${NC}"
    echo "   Start with: npm start"
    exit 1
fi

echo ""
echo "📋 Checking Firebase Configuration..."

# Check Firebase credentials
if [ -f "src/modules/notification/firebase-service-account.json" ]; then
    echo -e "${GREEN}✅ Firebase credentials file found${NC}"
    
    # Try to validate JSON
    if jq . src/modules/notification/firebase-service-account.json > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Firebase JSON is valid${NC}"
        PROJECT_ID=$(jq -r '.project_id' src/modules/notification/firebase-service-account.json)
        echo "   Project ID: $PROJECT_ID"
    else
        echo -e "${RED}❌ Firebase JSON is invalid${NC}"
    fi
else
    echo -e "${RED}❌ Firebase credentials file not found${NC}"
    echo "   Expected at: src/modules/notification/firebase-service-account.json"
fi

echo ""
echo "📋 Checking MongoDB Connection..."

# Query for users with tokens
USERS_WITH_TOKENS=$(mongosh --eval "db.UserFcmToken.countDocuments()" 2>/dev/null || echo "0")
echo "   Total FCM tokens in DB: $USERS_WITH_TOKENS"

echo ""
echo "🟡 Next Steps:"
echo "1. Look for 🔴 [DEBUG-*] logs in your backend output"
echo "2. Send a test message via the API"
echo "3. Watch for FCM flow logs:"
echo "   - 🔴 [DEBUG-FCM] in conversation.controller.js"
echo "   - 🔴 [DEBUG-TEMPLATE] in template function"
echo "   - 🔴 [DEBUG-UTIL] in notification.utils.js"
echo ""
echo "4. Filter backend logs:"
echo "   npm start 2>&1 | grep '🔴'"
echo ""
echo "5. Check Flutter logs for:"
echo "   flutter run 2>&1 | grep '🔴'"
echo ""
echo "📊 Full Message Flow:"
echo "   Flutter sendMessage()"
echo "   └─> Backend POST /api/conversations/:id/messages"
echo "       └─> Create message"
echo "           └─> For each recipient:"
echo "               └─> sendTemplatedNotification()"
echo "                   └─> sendToUser()"
echo "                       └─> admin.messaging().send()"
echo ""
echo "❌ If FCM sends successfully but no notification on device:"
echo "   - Check Flutter Firebase message handlers"
echo "   - Verify notification permissions on device"
echo "   - Check device notification settings"
echo ""

