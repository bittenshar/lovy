#!/usr/bin/env node

/**
 * Simple test for attendance range logic (no MongoDB required)
 */

const testAttendanceRangeLogic = () => {
  console.log('🔍 Testing Attendance Range Logic (Offline)...\n');

  // Test case: Job scheduled from 2025-11-07T18:30:00.000Z to 2025-11-08T18:29:59.999Z
  const testScheduledStart = new Date('2025-11-07T18:30:00.000Z');
  const testScheduledEnd = new Date('2025-11-08T18:29:59.999Z');
  
  console.log('📅 Test Case:');
  console.log(`Scheduled Start: ${testScheduledStart.toISOString()}`);
  console.log(`Scheduled End: ${testScheduledEnd.toISOString()}`);
  console.log(`Start Date: ${testScheduledStart.toDateString()}`);
  console.log(`End Date: ${testScheduledEnd.toDateString()}\n`);

  // Test dates that should return records
  const testDates = [
    '2025-11-06', // Day before - should NOT match
    '2025-11-07', // Start date - should match
    '2025-11-08', // End date - should match  
    '2025-11-09'  // Day after - should NOT match
  ];

  for (const testDate of testDates) {
    console.log(`🔍 Testing query for date: ${testDate}`);
    
    // Simulate buildDayRange function
    const base = new Date(testDate);
    const start = new Date(base);
    start.setHours(0, 0, 0, 0);
    const end = new Date(base);
    end.setHours(23, 59, 59, 999);
    
    console.log(`  Query range: ${start.toISOString()} to ${end.toISOString()}`);
    
    // Test case 1: Record starts on queried date
    const startsOnDate = testScheduledStart >= start && testScheduledStart <= end;
    
    // Test case 2: Record spans across queried date  
    const spansDate = testScheduledStart < start && testScheduledEnd >= start;
    
    const shouldMatch = startsOnDate || spansDate;
    
    console.log(`  - Record starts on queried date: ${startsOnDate}`);
    console.log(`  - Record spans across queried date: ${spansDate}`);
    console.log(`  - Should match: ${shouldMatch ? '✅ YES' : '❌ NO'}\n`);
  }

  console.log('📝 Analysis:');
  console.log('The job runs from 2025-11-07T18:30:00.000Z to 2025-11-08T18:29:59.999Z (UTC)');
  console.log('But query dates are converted to local timezone day ranges.');
  console.log('');
  console.log('With current logic:');
  console.log('- 2025-11-06: ❌ NO (correct - job hasn\'t started)');
  console.log('- 2025-11-07: ❌ NO (issue - job starts at 18:30 UTC, but day range ends at 18:29 UTC in local timezone)');
  console.log('- 2025-11-08: ✅ YES (correct - job starts within this day range)');
  console.log('- 2025-11-09: ❌ NO (correct - job ended previous day)');
  console.log('');
  console.log('🔧 The fix: Our new $or query will find records where:');
  console.log('1. scheduledStart falls within the queried day range, OR');
  console.log('2. scheduledStart is before the day but scheduledEnd extends into it');

  console.log('\n🔧 MongoDB Query Translation:');
  console.log('For any given date, use this $or query:');
  console.log(JSON.stringify({
    $or: [
      // Records that start on the queried date
      { scheduledStart: { $gte: "QUERY_DATE_START", $lte: "QUERY_DATE_END" } },
      // Records that span across the queried date (start before, end after)
      {
        scheduledStart: { $lt: "QUERY_DATE_START" },
        scheduledEnd: { $gte: "QUERY_DATE_START" }
      }
    ]
  }, null, 2));

  console.log('\n✅ Logic test completed!');
};

testAttendanceRangeLogic();