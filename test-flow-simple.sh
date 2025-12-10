#!/bin/bash

echo "🚀 COMPLETE MESSAGING FLOW TEST"
echo "============================================================"

# Step 1: Create second user
echo -e "\n📝 STEP 1: Create Second User"
echo "------------------------------------------------------------"

SIGNUP=$(curl -s -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d "{
    \"firstname\": \"Test\",
    \"lastname\": \"User2\",
    \"email\": \"testuser2+$(date +%s)@example.com\",
    \"password\": \"password123\",
    \"userType\": \"employer\"
  }")

RECEIVER_ID=$(echo $SIGNUP | jq -r '.data.user.id')
echo "✅ User created: $RECEIVER_ID"

# Step 2: Login
echo -e "\n🔐 STEP 2: Login as Original User"
echo "------------------------------------------------------------"

LOGIN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "w@gmail.com",
    "password": "password"
  }')

AUTH_TOKEN=$(echo $LOGIN | jq -r '.token')
USER_ID=$(echo $LOGIN | jq -r '.data.user.id')
echo "✅ Login successful"
echo "   User ID: $USER_ID"
echo "   Token: ${AUTH_TOKEN:0:30}..."

# Step 3: Start conversation
echo -e "\n�� STEP 3: Start Conversation"
echo "------------------------------------------------------------"

CONV=$(curl -s -X POST http://localhost:3000/api/messages/start-conversation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d "{
    \"recipientId\": \"$RECEIVER_ID\"
  }")

CONV_ID=$(echo $CONV | jq -r '.data.conversationId')
echo "✅ Conversation created: $CONV_ID"

# Step 4: Send message
echo -e "\n📨 STEP 4: Send Message (THE ENDPOINT YOU WANT!) ⭐"
echo "------------------------------------------------------------"

MESSAGE=$(curl -s -X POST http://localhost:3000/api/messages/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d "{
    \"conversationId\": \"$CONV_ID\",
    \"receiverId\": \"$RECEIVER_ID\",
    \"text\": \"✅ Testing the send endpoint - this should return 201!\",
    \"image\": null,
    \"file\": null
  }")

MSG_STATUS=$(echo $MESSAGE | jq -r '.success')
MSG_ID=$(echo $MESSAGE | jq -r '.data._id')
MSG_TEXT=$(echo $MESSAGE | jq -r '.data.text')

if [ "$MSG_STATUS" = "true" ]; then
  echo "✅✅✅ MESSAGE SENT SUCCESSFULLY! ✅✅✅"
  echo ""
  echo "   Message ID: $MSG_ID"
  echo "   Text: \"$MSG_TEXT\""
  echo "   Sent by: $(echo $MESSAGE | jq -r '.data.sender.name')"
  echo ""
  echo "🎉 ALL TESTS PASSED! The /api/messages/send endpoint is working!"
else
  echo "❌ Send failed:"
  echo $MESSAGE | jq .
fi

echo ""
echo "============================================================"
