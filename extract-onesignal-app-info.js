#!/usr/bin/env node

/**
 * OneSignal App REST API Key Extractor
 * This helps identify what REST API key you need
 */

require('dotenv').config({ path: './src/config/config.env' });
const axios = require('axios');

async function extractAppInfo() {
  const orgKey = process.env.ONESIGNAL_REST_API_KEY;
  const appId = process.env.ONESIGNAL_APP_ID;

  console.log('📋 OneSignal App Information\n');
  console.log('Organization Key Type:', orgKey.startsWith('os_v2_org') ? '🔴 Organization-level (read-only)' : 'Unknown');
  console.log('App ID:', appId);
  console.log('');

  try {
    // Get app details
    const response = await axios.get(`https://onesignal.com/api/v1/apps/${appId}`, {
      headers: {
        'Authorization': `Basic ${orgKey}`,
        'Content-Type': 'application/json'
      }
    });

    const app = response.data;
    console.log('✅ App Found: ' + app.name);
    console.log('   ID:', app.id);
    console.log('   Created:', app.created_at);
    console.log('');
    
    console.log('🔑 NEXT STEPS - Get the App-Level REST API Key:\n');
    console.log('⚠️  The organization key you have only allows READ operations.');
    console.log('⚠️  To SEND notifications, you need the APP-LEVEL REST API Key.\n');
    console.log('📍 How to get it:\n');
    console.log('1. Go to: https://dashboard.onesignal.com');
    console.log('2. Click on the app: "' + app.name + '"');
    console.log('3. Go to: Settings → Keys & IDs');
    console.log('4. Find: REST API Key (should start with "os_v2_app")');
    console.log('5. Copy the entire REST API Key value');
    console.log('6. Update your .env file with this value:\n');
    console.log('   ONESIGNAL_REST_API_KEY=[paste-rest-api-key-here]\n');
    console.log('⚠️  Make sure it starts with "os_v2_app" (not "os_v2_org")\n');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data?.errors?.join(', ') || error.message);
  }
}

extractAppInfo();
