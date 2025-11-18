#!/usr/bin/env node

/**
 * API Verification Script for Attendance Range Fix
 * Tests the actual API endpoints to verify they return records for dates within scheduled range
 */

const axios = require('axios');

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';

// You'll need to update these with actual valid tokens from your system
const WORKER_TOKEN = process.env.WORKER_TOKEN || 'your-worker-token-here';
const EMPLOYER_TOKEN = process.env.EMPLOYER_TOKEN || 'your-employer-token-here';

const testAttendanceAPIs = async () => {
  console.log('🧪 Testing Attendance API Range Fix...\n');

  const headers = {
    'Content-Type': 'application/json'
  };

  try {
    // Test dates that should return records if job spans from 2025-11-07T18:30 to 2025-11-08T18:29
    const testDates = ['2025-11-07', '2025-11-08'];

    console.log('📊 Testing Worker Attendance API...');
    for (const date of testDates) {
      try {
        console.log(`\n📅 Testing date: ${date}`);
        
        const response = await axios.get(`${BASE_URL}/workers/me/attendance`, {
          headers: { ...headers, Authorization: `Bearer ${WORKER_TOKEN}` },
          params: { date }
        });

        console.log(`✅ Status: ${response.status}`);
        console.log(`📈 Results: ${response.data.results} records found`);
        
        if (response.data.results > 0) {
          response.data.data.forEach((record, index) => {
            console.log(`  ${index + 1}. ${record.scheduledStart} to ${record.scheduledEnd || 'N/A'}`);
          });
        }
      } catch (error) {
        if (error.response?.status === 401) {
          console.log(`⚠️  Unauthorized - please set valid WORKER_TOKEN`);
        } else {
          console.log(`❌ Error: ${error.message}`);
        }
      }
    }

    console.log('\n📊 Testing Worker Attendance Schedule API...');
    try {
      const response = await axios.get(`${BASE_URL}/workers/me/attendance/schedule`, {
        headers: { ...headers, Authorization: `Bearer ${WORKER_TOKEN}` },
        params: { 
          from: '2025-11-07',
          to: '2025-11-08',
          status: 'all'
        }
      });

      console.log(`✅ Status: ${response.status}`);
      console.log(`📈 Schedule entries found: ${response.data.data?.schedule?.length || 0}`);
      
      if (response.data.data?.schedule) {
        response.data.data.schedule.forEach((day) => {
          console.log(`📅 ${day.date} (${day.dayOfWeek}): ${day.entries?.length || 0} entries`);
          day.entries?.forEach((entry, index) => {
            console.log(`  ${index + 1}. ${entry.scheduledStart} to ${entry.scheduledEnd || 'N/A'} (${entry.status})`);
          });
        });
      }
    } catch (error) {
      if (error.response?.status === 401) {
        console.log(`⚠️  Unauthorized - please set valid WORKER_TOKEN`);
      } else {
        console.log(`❌ Error: ${error.message}`);
      }
    }

    console.log('\n📊 Testing Management View API...');
    for (const date of testDates) {
      try {
        console.log(`\n📅 Testing management view for date: ${date}`);
        
        const response = await axios.get(`${BASE_URL}/attendance/management`, {
          headers: { ...headers, Authorization: `Bearer ${EMPLOYER_TOKEN}` },
          params: { date }
        });

        console.log(`✅ Status: ${response.status}`);
        console.log(`📈 Results: ${response.data.results} records found`);
        
        if (response.data.results > 0) {
          response.data.data.forEach((record, index) => {
            console.log(`  ${index + 1}. ${record.scheduledStart} to ${record.scheduledEnd || 'N/A'}`);
          });
        }
      } catch (error) {
        if (error.response?.status === 401) {
          console.log(`⚠️  Unauthorized - please set valid EMPLOYER_TOKEN`);
        } else {
          console.log(`❌ Error: ${error.message}`);
        }
      }
    }

    console.log('\n✅ API tests completed!');
    console.log('\n📝 To run this test properly:');
    console.log('1. Set environment variables:');
    console.log('   export WORKER_TOKEN="your-actual-worker-token"');
    console.log('   export EMPLOYER_TOKEN="your-actual-employer-token"');
    console.log('   export API_BASE_URL="http://localhost:3000/api"');
    console.log('2. Ensure you have test data spanning the date range');
    console.log('3. Run: node verify-attendance-api-fix.js');

  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
  }
};

// Helper function to create test data
const createTestAttendanceRecord = async () => {
  console.log('\n🔧 Helper: Creating test attendance record...');
  console.log('This would require valid job, worker, and employer IDs from your database.');
  console.log('Use your existing test scripts or admin tools to create a test record with:');
  console.log('- scheduledStart: 2025-11-07T18:30:00.000Z');
  console.log('- scheduledEnd: 2025-11-08T18:29:59.999Z');
  console.log('Then run the API tests above to verify the fix.');
};

// Run tests
if (require.main === module) {
  if (process.argv.includes('--create-test-data')) {
    createTestAttendanceRecord();
  } else {
    testAttendanceAPIs();
  }
}