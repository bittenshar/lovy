#!/usr/bin/env node

/**
 * Comprehensive test showing how the new attendance range logic works
 */

const testComprehensiveRangeLogic = () => {
  console.log('🔍 Comprehensive Attendance Range Logic Test...\n');

  // Multiple test cases
  const testCases = [
    {
      name: 'Single Day Job',
      scheduledStart: new Date('2025-11-07T09:00:00.000Z'),
      scheduledEnd: new Date('2025-11-07T17:00:00.000Z'),
      expectedDates: ['2025-11-07']
    },
    {
      name: 'Cross-Timezone Spanning Job (Your Case)',
      scheduledStart: new Date('2025-11-07T18:30:00.000Z'),
      scheduledEnd: new Date('2025-11-08T18:29:59.999Z'),
      expectedDates: ['2025-11-07', '2025-11-08'] // Should appear on both dates
    },
    {
      name: 'Multi-Day Job',
      scheduledStart: new Date('2025-11-07T10:00:00.000Z'),
      scheduledEnd: new Date('2025-11-09T10:00:00.000Z'),
      expectedDates: ['2025-11-07', '2025-11-08', '2025-11-09']
    }
  ];

  const testDates = ['2025-11-06', '2025-11-07', '2025-11-08', '2025-11-09', '2025-11-10'];

  testCases.forEach((testCase, index) => {
    console.log(`📋 Test Case ${index + 1}: ${testCase.name}`);
    console.log(`   Scheduled: ${testCase.scheduledStart.toISOString()} to ${testCase.scheduledEnd.toISOString()}`);
    console.log(`   Expected on dates: ${testCase.expectedDates.join(', ')}`);
    
    testDates.forEach(testDate => {
      // Simulate buildDayRange function
      const base = new Date(testDate);
      const start = new Date(base);
      start.setHours(0, 0, 0, 0);
      const end = new Date(base);
      end.setHours(23, 59, 59, 999);
      
      // Test both conditions of our $or query
      const startsOnDate = testCase.scheduledStart >= start && testCase.scheduledStart <= end;
      const spansIntoDate = testCase.scheduledStart < start && testCase.scheduledEnd >= start;
      const shouldMatch = startsOnDate || spansIntoDate;
      const expected = testCase.expectedDates.includes(testDate);
      
      const result = shouldMatch === expected ? '✅' : '❌';
      console.log(`   ${testDate}: ${result} ${shouldMatch ? 'YES' : 'NO'} (expected: ${expected ? 'YES' : 'NO'})`);
    });
    console.log('');
  });

  console.log('🎯 Key Benefits of the New Logic:');
  console.log('1. Jobs that span multiple days appear on all relevant dates');
  console.log('2. Night shifts that cross midnight show up on both days');
  console.log('3. Long-running jobs appear consistently across their duration');
  console.log('4. Workers and employers see attendance records on the dates they expect');
  
  console.log('\n💡 Before vs After:');
  console.log('BEFORE: Only showed records where scheduledStart was on the queried date');
  console.log('AFTER:  Shows records where the queried date overlaps with the scheduled time range');
};

testComprehensiveRangeLogic();