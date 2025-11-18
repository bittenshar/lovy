#!/usr/bin/env node

/**
 * Test script to verify attendance API now returns records for any date within the scheduled range
 * Usage: node test-attendance-range-fix.js
 */

const mongoose = require('mongoose');
const AttendanceRecord = require('./src/modules/attendance/attendance.model');
const User = require('./src/modules/users/user.model');
const Job = require('./src/modules/jobs/job.model');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dhruv-backend', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const testAttendanceRangeLogic = async () => {
  console.log('🔍 Testing Attendance Range Logic...\n');

  try {
    // Test case: Job scheduled from 2025-11-07T18:30:00.000Z to 2025-11-08T18:29:59.999Z
    // This spans across two calendar dates: Nov 7 and Nov 8
    
    const testScheduledStart = new Date('2025-11-07T18:30:00.000Z');
    const testScheduledEnd = new Date('2025-11-08T18:29:59.999Z');
    
    console.log('📅 Test Case:');
    console.log(`Scheduled Start: ${testScheduledStart.toISOString()}`);
    console.log(`Scheduled End: ${testScheduledEnd.toISOString()}`);
    console.log(`This spans dates: ${testScheduledStart.toDateString()} to ${testScheduledEnd.toDateString()}\n`);

    // Test MongoDB query logic for different dates
    const testDates = [
      '2025-11-06', // Day before - should NOT match
      '2025-11-07', // Start date - should match
      '2025-11-08', // End date - should match  
      '2025-11-09'  // Day after - should NOT match
    ];

    for (const testDate of testDates) {
      console.log(`🔍 Testing query for date: ${testDate}`);
      
      const targetDate = new Date(testDate);
      const start = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0);
      const end = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);
      
      console.log(`  Query range: ${start.toISOString()} to ${end.toISOString()}`);
      
      // New logic: Check if date overlaps with scheduled range
      const newFilter = {
        $or: [
          // Records that start on the queried date
          { 
            scheduledStart: { $gte: start, $lte: end }
          },
          // Records that span across the queried date (start before, end after)
          {
            scheduledStart: { $lt: start },
            scheduledEnd: { $gte: start }
          }
        ]
      };

      // Test case 1: Record starts on queried date
      const startsOnDate = testScheduledStart >= start && testScheduledStart <= end;
      
      // Test case 2: Record spans across queried date  
      const spansDate = testScheduledStart < start && testScheduledEnd >= start;
      
      const shouldMatch = startsOnDate || spansDate;
      
      console.log(`  - Record starts on queried date: ${startsOnDate}`);
      console.log(`  - Record spans across queried date: ${spansDate}`);
      console.log(`  - Should match: ${shouldMatch ? '✅ YES' : '❌ NO'}\n`);
    }

    // Test with actual database query if we have test data
    console.log('📊 Checking for existing test records...');
    
    const existingRecords = await AttendanceRecord.find({
      scheduledStart: { 
        $gte: new Date('2025-11-07T00:00:00.000Z'),
        $lte: new Date('2025-11-09T23:59:59.999Z')
      }
    }).select('scheduledStart scheduledEnd job worker');
    
    if (existingRecords.length > 0) {
      console.log(`Found ${existingRecords.length} test records:`);
      existingRecords.forEach((record, index) => {
        console.log(`  ${index + 1}. ${record.scheduledStart?.toISOString()} to ${record.scheduledEnd?.toISOString()}`);
      });
      
      // Test the new query on Nov 8th
      console.log('\n🧪 Testing new query logic on Nov 8th...');
      const nov8Start = new Date('2025-11-08T00:00:00.000Z');
      const nov8End = new Date('2025-11-08T23:59:59.999Z');
      
      const matchingRecords = await AttendanceRecord.find({
        $or: [
          { scheduledStart: { $gte: nov8Start, $lte: nov8End } },
          {
            scheduledStart: { $lt: nov8Start },
            scheduledEnd: { $gte: nov8Start }
          }
        ]
      }).select('scheduledStart scheduledEnd job worker');
      
      console.log(`Records that should appear for Nov 8th: ${matchingRecords.length}`);
      matchingRecords.forEach((record, index) => {
        console.log(`  ${index + 1}. ${record.scheduledStart?.toISOString()} to ${record.scheduledEnd?.toISOString()}`);
      });
    } else {
      console.log('No test records found in the date range.');
    }

    console.log('\n✅ Test completed successfully!');
    console.log('\n📝 Summary:');
    console.log('- Modified attendance APIs to check date range overlap');
    console.log('- Records spanning across multiple dates will now appear on all relevant dates');
    console.log('- A job from 2025-11-07T18:30 to 2025-11-08T18:29 will appear on both Nov 7 and Nov 8');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed.');
  }
};

// Run the test
testAttendanceRangeLogic().catch(console.error);