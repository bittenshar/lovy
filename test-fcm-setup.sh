#!/bin/bash

# Firebase FCM Backend Testing Script

echo "🔥 Firebase FCM Backend - Testing Script"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Firebase Credentials
echo "📋 Test 1: Firebase Credentials"
if [ -f "./firebase-service-account.json" ]; then
  PROJECT_ID=$(grep -o '"project_id": "[^"]*"' firebase-service-account.json | cut -d'"' -f4)
  echo -e "${GREEN}✅${NC} Firebase service account file found"
  echo "   Project ID: $PROJECT_ID"
else
  echo -e "${RED}❌${NC} Firebase service account file NOT found"
  echo "   Please create: firebase-service-account.json"
fi
echo ""

# Test 2: Node packages
echo "📦 Test 2: Required Packages"
if node -e "require('firebase-admin')" 2>/dev/null; then
  echo -e "${GREEN}✅${NC} firebase-admin package installed"
else
  echo -e "${RED}❌${NC} firebase-admin package NOT installed"
fi

if node -e "require('express')" 2>/dev/null; then
  echo -e "${GREEN}✅${NC} express package installed"
else
  echo -e "${RED}❌${NC} express package NOT installed"
fi

if node -e "require('mongoose')" 2>/dev/null; then
  echo -e "${GREEN}✅${NC} mongoose package installed"
else
  echo -e "${RED}❌${NC} mongoose package NOT installed"
fi
echo ""

# Test 3: Firebase SDK Initialization
echo "🔧 Test 3: Firebase Admin SDK"
node -e "
const admin = require('firebase-admin');
const sa = require('./firebase-service-account.json');
try {
  admin.initializeApp({
    credential: admin.credential.cert(sa)
  });
  console.log('✅ Firebase initialized for project: ' + sa.project_id);
} catch (e) {
  console.log('❌ Firebase initialization failed:', e.message);
}
" 2>&1 | sed 's/^/   /'
echo ""

# Test 4: Service files
echo "📁 Test 4: Service Files"
files=(
  "src/services/firebase-admin.js"
  "src/services/firebase-notification.service.js"
  "src/services/fcm-helper.service.js"
  "src/controllers/notification.controller.js"
  "src/routes/notification.routes.js"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo -e "   ${GREEN}✅${NC} $file"
  else
    echo -e "   ${RED}❌${NC} $file"
  fi
done
echo ""

# Test 5: Database Model
echo "📊 Test 5: User Model FCM Fields"
if grep -q "fcmToken" src/modules/users/user.model.js; then
  echo -e "${GREEN}✅${NC} fcmToken field present"
else
  echo -e "${RED}❌${NC} fcmToken field missing"
fi

if grep -q "platform" src/modules/users/user.model.js; then
  echo -e "${GREEN}✅${NC} platform field present"
else
  echo -e "${RED}❌${NC} platform field missing"
fi

if grep -q "fcmTokenUpdatedAt" src/modules/users/user.model.js; then
  echo -e "${GREEN}✅${NC} fcmTokenUpdatedAt field present"
else
  echo -e "${RED}❌${NC} fcmTokenUpdatedAt field missing"
fi
echo ""

# Test 6: API Endpoints
echo "🌐 Test 6: Notification Endpoints"
endpoints=(
  "register-token"
  "tokens"
  "send"
  "send-batch"
  "send-topic"
  "subscribe"
  "unsubscribe"
  "health"
  "test"
)

for endpoint in "${endpoints[@]}"; do
  if grep -q "$endpoint" src/routes/notification.routes.js; then
    echo -e "   ${GREEN}✅${NC} /api/notifications/$endpoint"
  else
    echo -e "   ${RED}❌${NC} /api/notifications/$endpoint"
  fi
done
echo ""

echo "========================================"
echo "🎉 Setup Check Complete!"
echo ""
echo "Next steps:"
echo "1. Update Flutter app with google-services.json"
echo "2. Start backend: npm start"
echo "3. Test with Postman collection"
echo "4. Send test notification"
echo ""
