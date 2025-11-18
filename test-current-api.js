#!/usr/bin/env node

/**
 * Test the current API behavior by making actual HTTP requests
 */

const https = require('https');
const http = require('http');

// Determine if using https or http
const isHttps = process.env.API_BASE_URL && process.env.API_BASE_URL.startsWith('https');
const client = isHttps ? https : http;

const testCurrentAPI = async () => {
  console.log('🧪 Testing Current API Behavior...\n');
  
  // You'll need to replace this with your actual base URL and authentication
  const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
  const token = process.env.AUTH_TOKEN || 'your-token-here';
  
  const testDates = ['2025-11-09', '2025-11-10', '2025-11-11'];
  
  for (const date of testDates) {
    try {
      console.log(`📅 Testing date: ${date}`);
      console.log(`🔗 URL: ${baseUrl}/api/attendance?date=${date}`);
      
      if (token === 'your-token-here') {
        console.log('⚠️  Please set AUTH_TOKEN environment variable with a valid token');
        console.log('   Example: export AUTH_TOKEN="your-actual-token"');
        console.log('   Then run: node test-current-api.js\n');
        continue;
      }
      
      // Make HTTP request (simplified - you might need to add proper error handling)
      console.log('   Making request...');
      console.log('   (This is a placeholder - replace with actual HTTP request logic)\n');
      
    } catch (error) {
      console.log(`❌ Error testing ${date}: ${error.message}\n`);
    }
  }
  
  console.log('💡 To test manually, use curl or your API client:');
  console.log(`curl -H "Authorization: Bearer YOUR_TOKEN" "${baseUrl}/api/attendance?date=2025-11-10"`);
  console.log('');
  console.log('🔍 Expected behavior after the fix:');
  console.log('- 2025-11-09: ✅ Should return the record (job is active)');
  console.log('- 2025-11-10: ❌ Should NOT return the record (job ended on Nov 9)');
  console.log('- 2025-11-11: ❌ Should NOT return the record (job ended on Nov 9)');
  console.log('');
  console.log('📊 If the record still appears on Nov 10, it could be due to:');
  console.log('1. Timezone offset causing overlap (as analyzed earlier)');
  console.log('2. Different server instance running (check deployment)');
  console.log('3. Caching (if any)');
};

testCurrentAPI();