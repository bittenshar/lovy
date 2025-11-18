#!/usr/bin/env node

/**
 * Final test for the range intersection logic
 */

const testFinalRangeLogic = () => {
  console.log('🔍 Testing Final Range Intersection Logic...\n');

  // Your actual case
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
    const dayStart = new Date(base);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(base);
    dayEnd.setHours(23, 59, 59, 999);
    
    console.log(`📅 Testing ${testDate}:`);
    console.log(`   Day range: ${dayStart.toISOString()} to ${dayEnd.toISOString()}`);
    
    // NEW LOGIC: Proper range intersection
    // A job overlaps with a date if: job_start <= day_end AND job_end > day_start
    const jobStartsBeforeDayEnds = testCase.scheduledStart <= dayEnd;
    const jobEndsAfterDayStarts = testCase.scheduledEnd > dayStart;
    const shouldMatch = jobStartsBeforeDayEnds && jobEndsAfterDayStarts;
    const expected = testCase.expectedDates.includes(testDate);
    
    console.log(`   - Job starts before day ends: ${jobStartsBeforeDayEnds} (${testCase.scheduledStart.toISOString()} <= ${dayEnd.toISOString()})`);
    console.log(`   - Job ends after day starts: ${jobEndsAfterDayStarts} (${testCase.scheduledEnd.toISOString()} > ${dayStart.toISOString()})`);
    console.log(`   - Should match: ${shouldMatch ? 'YES' : 'NO'}`);
    console.log(`   - Expected: ${expected ? 'YES' : 'NO'}`);
    
    const result = shouldMatch === expected ? '✅ CORRECT' : '❌ WRONG';
    console.log(`   - Result: ${result}\n`);
  });

  console.log('🎯 Final Logic (Range Intersection):');
  console.log('scheduledStart <= day_end AND scheduledEnd > day_start');
  console.log('');
  console.log('📊 MongoDB Query:');
  console.log('filter.scheduledStart = { $lte: range.end };');
  console.log('filter.scheduledEnd = { $gt: range.start };');
  console.log('');
  console.log('✅ This is the standard algorithm for checking if two time ranges overlap!');
};

testFinalRangeLogic();