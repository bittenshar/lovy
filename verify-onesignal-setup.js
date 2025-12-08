#!/usr/bin/env node

/**
 * OneSignal Integration Quick Setup Verification
 * Checks if OneSignal integration is properly configured
 */

const path = require('path');
const fs = require('fs');
require('dotenv').config();

console.log('\n🚀 OneSignal Integration Setup Checklist\n');
console.log('='.repeat(60));

const checks = [
  {
    name: 'OneSignal service module created',
    file: 'src/shared/services/onesignal.service.js',
    required: true
  },
  {
    name: 'OneSignal controller created',
    file: 'src/modules/notifications/notification.onesignal.controller.js',
    required: true
  },
  {
    name: 'Notification routes updated',
    file: 'src/modules/notifications/notification.routes.js',
    required: true
  },
  {
    name: 'User model updated with OneSignal fields',
    file: 'src/modules/users/user.model.js',
    required: true
  },
  {
    name: 'OneSignal documentation created',
    file: 'ONESIGNAL_INTEGRATION.md',
    required: true
  },
  {
    name: 'Postman collection created',
    file: 'postman/OneSignal.postman_collection.json',
    required: true
  }
];

let allChecks = true;

checks.forEach((check, index) => {
  const filePath = path.join(__dirname, check.file);
  const exists = fs.existsSync(filePath);
  const status = exists ? '✅' : '❌';
  
  console.log(`${index + 1}. ${status} ${check.name}`);
  if (!exists) {
    console.log(`   📁 Expected at: ${check.file}`);
    if (check.required) allChecks = false;
  }
});

console.log('\n' + '='.repeat(60));
console.log('\n📋 Environment Configuration\n');

const requiredEnvVars = [
  'ONESIGNAL_APP_ID',
  'ONESIGNAL_REST_API_KEY'
];

let envConfigured = true;

requiredEnvVars.forEach((envVar) => {
  const value = process.env[envVar];
  const status = value ? '✅' : '⚠️';
  const displayValue = value ? `${value.substring(0, 10)}...` : 'NOT SET';
  
  console.log(`${status} ${envVar}: ${displayValue}`);
  if (!value) {
    envConfigured = false;
  }
});

console.log('\n' + '='.repeat(60));
console.log('\n🎯 Quick Start Guide\n');

if (!envConfigured) {
  console.log('1️⃣  Set OneSignal Credentials in .env:');
  console.log('   \n   a) Get from OneSignal Dashboard:');
  console.log('      - Go to https://dashboard.onesignal.com');
  console.log('      - Click on your app');
  console.log('      - Settings → Keys & IDs');
  console.log('   \n   b) Add to .env:');
  console.log('      ONESIGNAL_APP_ID=your-app-id');
  console.log('      ONESIGNAL_REST_API_KEY=your-rest-api-key\n');
} else {
  console.log('✅ OneSignal credentials configured\n');
}

console.log('2️⃣  Restart the server:');
console.log('   npm run dev\n');

console.log('3️⃣  Test OneSignal integration:');
console.log('   \n   a) Import Postman collection:');
console.log('      postman/OneSignal.postman_collection.json\n');
console.log('   b) Get auth token from login endpoint');
console.log('   c) Set variable "auth_token"');
console.log('   d) Run "Register OneSignal ID" request\n');

console.log('4️⃣  Test notification:');
console.log('   POST /api/notifications/onesignal/test\n');

console.log('5️⃣  Send to users:');
console.log('   POST /api/notifications/onesignal/send\n');

console.log('='.repeat(60));

if (allChecks && envConfigured) {
  console.log('\n✅ OneSignal Integration Complete!\n');
  console.log('📚 Documentation: ONESIGNAL_INTEGRATION.md');
  console.log('🧪 Postman Collection: postman/OneSignal.postman_collection.json\n');
  process.exit(0);
} else if (allChecks) {
  console.log('\n⚠️  OneSignal Integration Ready - Configure .env\n');
  process.exit(0);
} else {
  console.log('\n❌ OneSignal Integration Incomplete\n');
  process.exit(1);
}
