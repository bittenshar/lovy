#!/usr/bin/env node

/**
 * Test startDate/endDate range filtering logic
 */

const testDateRangeLogic = () => {
  console.log('🔍 Testing startDate/endDate Range Logic...\n');
  
  // Your job details
  const scheduledStart = new Date('2025-11-07T15:00:00.000Z');
  const scheduledEnd = new Date('2025-11-09T21:00:00.000Z');
  
  console.log('📋 Job Details:');
  console.log(`   Scheduled Start: ${scheduledStart.toISOString()}`);
  console.log(`   Scheduled End: ${scheduledEnd.toISOString()}`);
  console.log(`   Duration: Nov 7 15:00 UTC to Nov 9 21:00 UTC\n`);
  
  // Test different date ranges
  const testRanges = [
    {
      name: 'Your Query Range',
      startDate: '2025-11-08',
      endDate: '2025-11-11',
      expected: true, // Should find the record because job overlaps with Nov 8-9
      reason: 'Job runs Nov 7-9, overlaps with query range Nov 8-11'
    },
    {
      name: 'Before Job',
      startDate: '2025-11-05',
      endDate: '2025-11-06',
      expected: false,
      reason: 'Job starts Nov 7, no overlap with Nov 5-6'
    },
    {
      name: 'After Job',
      startDate: '2025-11-10',
      endDate: '2025-11-12',
      expected: false,
      reason: 'Job ends Nov 9, no overlap with Nov 10-12'
    },
    {
      name: 'Partial Overlap (Start)',
      startDate: '2025-11-06',
      endDate: '2025-11-08',
      expected: true,
      reason: 'Job overlaps from Nov 7-8'
    },
    {
      name: 'Partial Overlap (End)',
      startDate: '2025-11-09',
      endDate: '2025-11-11',
      expected: true,
      reason: 'Job overlaps on Nov 9'
    },
    {
      name: 'Full Overlap',
      startDate: '2025-11-06',
      endDate: '2025-11-11',
      expected: true,
      reason: 'Query range contains entire job duration'
    }
  ];
  
  testRanges.forEach((testRange, index) => {
    console.log(`📅 Test ${index + 1}: ${testRange.name}`);
    console.log(`   Query: ${testRange.startDate} to ${testRange.endDate}`);
    
    // Simulate buildDayRange for start and end dates (UTC)
    const queryStart = new Date(testRange.startDate);
    queryStart.setUTCHours(0, 0, 0, 0);
    
    const queryEnd = new Date(testRange.endDate);
    queryEnd.setUTCHours(23, 59, 59, 999);
    
    console.log(`   Query Range: ${queryStart.toISOString()} to ${queryEnd.toISOString()}`);
    
    // NEW LOGIC: Range intersection
    // filter.scheduledStart = { $lte: endBoundary };
    // filter.scheduledEnd = { $gt: startBoundary };
    const condition1 = scheduledStart <= queryEnd;   // Job starts before query ends
    const condition2 = scheduledEnd > queryStart;    // Job ends after query starts
    const shouldMatch = condition1 && condition2;
    
    console.log(`   scheduledStart <= queryEnd: ${condition1}`);
    console.log(`   scheduledEnd > queryStart: ${condition2}`);
    console.log(`   Should match: ${shouldMatch ? 'YES' : 'NO'}`);
    console.log(`   Expected: ${testRange.expected ? 'YES' : 'NO'}`);
    console.log(`   Reason: ${testRange.reason}`);
    
    const result = shouldMatch === testRange.expected ? '✅ CORRECT' : '❌ WRONG';
    console.log(`   Result: ${result}\n`);
  });
  
  console.log('🎯 New Logic Summary:');
  console.log('For startDate/endDate queries, find records where:');
  console.log('- scheduledStart <= queryEndDate (job starts before query period ends)');
  console.log('- scheduledEnd > queryStartDate (job ends after query period starts)');
  console.log('');
  console.log('📊 Your Query ?startDate=2025-11-08&endDate=2025-11-11:');
  console.log('✅ Should now return the record because job overlaps with the range!');
};

testDateRangeLogic();