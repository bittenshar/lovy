#!/usr/bin/env node

/**
 * Test UTC-based date range logic
 */

const testUTCLogic = () => {
  console.log('🔍 Testing UTC-Based Date Range Logic...\n');
  
  // Your job details
  const scheduledStart = new Date('2025-11-07T15:00:00.000Z');
  const scheduledEnd = new Date('2025-11-09T21:00:00.000Z');
  
  console.log('📋 Job Details:');
  console.log(`   Scheduled Start: ${scheduledStart.toISOString()}`);
  console.log(`   Scheduled End: ${scheduledEnd.toISOString()}\n`);
  
  const testDates = ['2025-11-06', '2025-11-07', '2025-11-08', '2025-11-09', '2025-11-10', '2025-11-11'];
  const expectedDates = ['2025-11-07', '2025-11-08', '2025-11-09']; // Only these should match in UTC
  
  testDates.forEach(testDate => {
    console.log(`📅 Testing ${testDate} (UTC):`);
    
    // Simulate UTC-based buildDayRange function
    const base = new Date(testDate);
    const start = new Date(base);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(base);
    end.setUTCHours(23, 59, 59, 999);
    
    console.log(`   UTC Day Range: ${start.toISOString()} to ${end.toISOString()}`);
    
    // Range intersection test (UTC-based)
    const condition1 = scheduledStart <= end;
    const condition2 = scheduledEnd > start;
    const shouldMatch = condition1 && condition2;
    const expected = expectedDates.includes(testDate);
    
    console.log(`   scheduledStart <= dayEnd: ${condition1}`);
    console.log(`   scheduledEnd > dayStart: ${condition2}`);
    console.log(`   Should match: ${shouldMatch ? 'YES' : 'NO'}`);
    console.log(`   Expected: ${expected ? 'YES' : 'NO'}`);
    
    const result = shouldMatch === expected ? '✅ CORRECT' : '❌ WRONG';
    console.log(`   Result: ${result}\n`);
  });
  
  console.log('🎯 UTC Logic Benefits:');
  console.log('✅ Consistent behavior regardless of server timezone');
  console.log('✅ Predictable results for all users globally');
  console.log('✅ Job from Nov 7 15:00 UTC to Nov 9 21:00 UTC appears only on Nov 7, 8, 9');
  console.log('✅ No timezone-dependent overlaps');
  
  console.log('\n📊 Expected API Results:');
  console.log('- Query ?date=2025-11-09: ✅ Returns record (job ends on Nov 9)');
  console.log('- Query ?date=2025-11-10: ❌ No record (job ended on Nov 9)');
  console.log('- Query ?date=2025-11-11: ❌ No record (job ended on Nov 9)');
  
  console.log('\n🔧 Technical Change:');
  console.log('- Changed setHours() to setUTCHours() in buildDayRange()');
  console.log('- Changed setHours() to setUTCHours() in parseBoundary()');
  console.log('- All date ranges now calculated in UTC, not local timezone');
};

testUTCLogic();