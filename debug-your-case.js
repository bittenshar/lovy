#!/usr/bin/env node

/**
 * Debug the exact date range calculation for your case
 */

const debugYourCase = () => {
  console.log('🔍 Debugging Your Specific Case...\n');
  
  // Your job details from the API response
  const scheduledStart = new Date('2025-11-07T15:00:00.000Z');
  const scheduledEnd = new Date('2025-11-09T21:00:00.000Z');
  const queryDate = '2025-11-10';
  
  console.log('📋 Job Details:');
  console.log(`   Scheduled Start: ${scheduledStart.toISOString()}`);
  console.log(`   Scheduled End: ${scheduledEnd.toISOString()}`);
  console.log(`   Query Date: ${queryDate}\n`);
  
  // Simulate the buildDayRange function for Nov 10
  const base = new Date(queryDate);
  const dayStart = new Date(base);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(base);
  dayEnd.setHours(23, 59, 59, 999);
  
  console.log('📅 Nov 10 Day Range (Local Timezone):');
  console.log(`   Start: ${dayStart.toISOString()}`);
  console.log(`   End: ${dayEnd.toISOString()}\n`);
  
  // Test the current filtering logic
  console.log('🔍 Range Intersection Test:');
  console.log('   Current Logic: scheduledStart <= dayEnd AND scheduledEnd > dayStart');
  
  const condition1 = scheduledStart <= dayEnd;
  const condition2 = scheduledEnd > dayStart;
  const shouldMatch = condition1 && condition2;
  
  console.log(`   scheduledStart <= dayEnd: ${condition1}`);
  console.log(`   (${scheduledStart.toISOString()} <= ${dayEnd.toISOString()})`);
  console.log(`   scheduledEnd > dayStart: ${condition2}`);
  console.log(`   (${scheduledEnd.toISOString()} > ${dayStart.toISOString()})`);
  console.log(`   Result: ${shouldMatch ? 'MATCH' : 'NO MATCH'}\n`);
  
  if (shouldMatch) {
    console.log('✅ The record SHOULD appear - this is correct behavior!');
    console.log('📝 Explanation:');
    console.log('   Your system timezone causes Nov 10 to start before the job ends.');
    console.log('   This creates a legitimate overlap in the time ranges.');
  } else {
    console.log('❌ The record should NOT appear.');
  }
  
  console.log('\n🌍 Timezone Information:');
  console.log(`   Your local timezone offset: ${new Date().getTimezoneOffset()} minutes`);
  console.log(`   Nov 10 starts at: ${dayStart.toLocaleString()} local time`);
  console.log(`   Job ends at: ${scheduledEnd.toLocaleString()} local time`);
  
  const jobEndTime = scheduledEnd.getTime();
  const nov10StartTime = dayStart.getTime();
  const overlapHours = (jobEndTime - nov10StartTime) / (1000 * 60 * 60);
  
  if (overlapHours > 0) {
    console.log(`   Overlap: ${overlapHours.toFixed(2)} hours`);
  } else {
    console.log('   No overlap');
  }
  
  console.log('\n🎯 Summary:');
  if (shouldMatch && overlapHours > 0) {
    console.log('   The API is working correctly! The job overlaps with Nov 10 in your timezone.');
  } else if (shouldMatch) {
    console.log('   The logic matches but check timezone handling.');
  } else {
    console.log('   The job should not appear on Nov 10.');
  }
};

debugYourCase();