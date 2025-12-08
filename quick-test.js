require('dotenv').config({ path: './src/config/config.env' });

console.log('🧪 Quick OneSignal Configuration Test\n');

const appId = process.env.ONESIGNAL_APP_ID;
const apiKey = process.env.ONESIGNAL_REST_API_KEY;

console.log('Configuration Status:');
console.log('─────────────────────');
console.log('App ID:', appId ? '✅ Set' : '❌ Missing');
console.log('API Key:', apiKey ? '✅ Set' : '❌ Missing');
console.log('');

if (appId && apiKey) {
  console.log('Details:');
  console.log('─────────────────────');
  console.log('App ID:', appId);
  console.log('API Key Type:', apiKey.substring(0, 10) + '...');
  console.log('');
  
  // Check API key type
  if (apiKey.startsWith('os_v2_app')) {
    console.log('✅ API Key Type: App-level (CORRECT for sending notifications)');
  } else if (apiKey.startsWith('os_v2_org')) {
    console.log('⚠️  API Key Type: Organization-level (read-only, cannot send)');
    console.log('   → Need to get app-level key from Settings → Keys & IDs');
  } else {
    console.log('❓ API Key Type: Unknown format');
  }
  
  console.log('');
  console.log('Status:');
  console.log('─────────────────────');
  if (apiKey.startsWith('os_v2_app')) {
    console.log('✅ Ready to test sending notifications!');
    console.log('   Run: node test-onesignal-fix.js');
  } else {
    console.log('❌ Not ready - need correct API key');
    console.log('   Instructions: extract-onesignal-app-info.js');
  }
} else {
  console.log('❌ Configuration incomplete');
}
