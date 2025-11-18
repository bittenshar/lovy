#!/usr/bin/env node

/**
 * Test the corrected attendance range logic
 */

const testCorrectedRangeLogic = () => {
  console.log('🔍 Testing Corrected Attendance Range Logic...\n');

  // Your actual case from the API response
  const testCase = {
    name: 'Your Actual Job',
    scheduledStart: new Date('2025-11-07T15:00:00.000Z'),
    scheduledEnd: new Date('2025-11-09T21:00:00.000Z'),
    expectedDates: ['2025-11-07', '2025-11-08', '2025-11-09'] // Should NOT include Nov 10
  };

  const testDates = ['2025-11-06', '2025-11-07', '2025-11-08', '2025-11-09', '2025-11-10', '2025-11-11'];

  console.log(`📋 ${testCase.name}`);
  console.log(`   Scheduled: ${testCase.scheduledStart.toISOString()} to ${testCase.scheduledEnd.toISOString()}`);
  console.log(`   Expected on dates: ${testCase.expectedDates.join(', ')}`);
  console.log('');

  testDates.forEach(testDate => {
    // Simulate buildDayRange function
    const base = new Date(testDate);
    const start = new Date(base);
    start.setHours(0, 0, 0, 0);
    const end = new Date(base);
    end.setHours(23, 59, 59, 999);
    
    console.log(`📅 Testing ${testDate}:`);
    console.log(`   Day range: ${start.toISOString()} to ${end.toISOString()}`);
    
    // Test both conditions of our $or query (CORRECTED VERSION)
    const startsOnDate = testCase.scheduledStart >= start && testCase.scheduledStart <= end;
    const spansIntoDate = testCase.scheduledStart < start && testCase.scheduledEnd > start; // Changed from >= to >
    const shouldMatch = startsOnDate || spansIntoDate;
    const expected = testCase.expectedDates.includes(testDate);
    
    console.log(`   - Job starts on this date: ${startsOnDate}`);
    console.log(`   - Job spans into this date: ${spansIntoDate}`);
    console.log(`   - Should match: ${shouldMatch ? 'YES' : 'NO'}`);
    console.log(`   - Expected: ${expected ? 'YES' : 'NO'}`);
    
    const result = shouldMatch === expected ? '✅ CORRECT' : '❌ WRONG';
    console.log(`   - Result: ${result}\n`);
  });

  console.log('🎯 Key Fix:');
  console.log('Changed from scheduledEnd >= range.start to scheduledEnd > range.start');
  console.log('This prevents jobs that end exactly at midnight from appearing on the next day.');
  console.log('');
  console.log('📊 Your API Response Analysis:');
  console.log('- Job: Nov 7 15:00 UTC to Nov 9 21:00 UTC');
  console.log('- Query: Nov 10 (range: Nov 10 00:00 to Nov 10 23:59)');
  console.log('- Old logic: scheduledEnd (Nov 9 21:00) >= Nov 10 00:00 → FALSE ❌');
  console.log('- The record should NOT appear on Nov 10, which is correct behavior.');
  
  console.log('');
  console.log('🤔 If the record is still appearing on Nov 10, it might be due to:');
  console.log('1. The fix not being deployed yet');
  console.log('2. Server restart needed');
  console.log('3. Different timezone handling than expected');
};

testCorrectedRangeLogic();