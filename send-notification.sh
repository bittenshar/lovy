#!/bin/bash

# Firebase FCM Notification Sender
# Usage: ./send-notification.sh <fcm_token> <jwt_token> [title] [body]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_BASE="http://localhost:3000/api/notifications"
ENDPOINT="send"

# Function to show usage
usage() {
  echo -e "${YELLOW}Usage:${NC}"
  echo "  $0 <fcm_token> <jwt_token> [title] [body] [screen]"
  echo ""
  echo -e "${YELLOW}Example:${NC}"
  echo "  $0 'cZmNlYH_Qw...' 'eyJhbGc...' 'New Job!' 'Check out this opportunity' 'jobs'"
  echo ""
  echo -e "${YELLOW}Required:${NC}"
  echo "  fcm_token   - FCM token from device"
  echo "  jwt_token   - JWT authentication token"
  echo ""
  echo -e "${YELLOW}Optional:${NC}"
  echo "  title       - Notification title (default: 'Hello from Backend')"
  echo "  body        - Notification body (default: 'Test message')"
  echo "  screen      - Target screen (default: 'jobs')"
  exit 1
}

# Parse arguments
if [ $# -lt 2 ]; then
  usage
fi

FCM_TOKEN="$1"
JWT_TOKEN="$2"
TITLE="${3:-Hello from Backend 👋}"
BODY="${4:-This is a test notification from your Firebase backend!}"
SCREEN="${5:-jobs}"

# Validate tokens
if [ -z "$FCM_TOKEN" ]; then
  echo -e "${RED}❌ FCM token is required${NC}"
  exit 1
fi

if [ -z "$JWT_TOKEN" ]; then
  echo -e "${RED}❌ JWT token is required${NC}"
  exit 1
fi

# Show request details
echo -e "${BLUE}📤 Sending FCM Notification${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  ${YELLOW}Endpoint:${NC} $ENDPOINT"
echo -e "  ${YELLOW}Title:${NC} $TITLE"
echo -e "  ${YELLOW}Body:${NC} $BODY"
echo -e "  ${YELLOW}Screen:${NC} $SCREEN"
echo -e "  ${YELLOW}Token:${NC} ${FCM_TOKEN:0:30}...${FCM_TOKEN: -10}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Prepare the JSON payload
PAYLOAD=$(cat <<EOF
{
  "fcmToken": "$FCM_TOKEN",
  "title": "$TITLE",
  "body": "$BODY",
  "data": {
    "screen": "$SCREEN",
    "action": "open_notification",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  }
}
EOF
)

# Send the notification
echo -e "${YELLOW}Sending notification...${NC}"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/$ENDPOINT" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d "$PAYLOAD")

# Parse response
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

# Display response
echo -e "${BLUE}📥 Response:${NC}"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""

# Check HTTP status
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
  echo -e "${GREEN}✅ Notification sent successfully! (HTTP $HTTP_CODE)${NC}"
  echo ""
  echo -e "${YELLOW}💡 Tip:${NC} Check your device for the notification"
  exit 0
else
  echo -e "${RED}❌ Failed to send notification (HTTP $HTTP_CODE)${NC}"
  echo ""
  if [ "$HTTP_CODE" = "400" ]; then
    echo -e "${YELLOW}Possible reasons:${NC}"
    echo "  • Invalid FCM token format"
    echo "  • Missing required fields in payload"
  elif [ "$HTTP_CODE" = "401" ]; then
    echo -e "${YELLOW}Possible reasons:${NC}"
    echo "  • Invalid JWT token"
    echo "  • Expired authentication token"
    echo "  • Missing Authorization header"
  elif [ "$HTTP_CODE" = "500" ]; then
    echo -e "${YELLOW}Possible reasons:${NC}"
    echo "  • Firebase not initialized properly"
    echo "  • Token mismatch with Firebase project"
    echo "  • Backend server error"
  fi
  exit 1
fi
