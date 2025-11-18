const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, 'src/config/config.env') });

const AttendanceRecord = require('./src/modules/attendance/attendance.model');

async function debugAttendance() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB\n');

    // Check total count
    const totalCount = await AttendanceRecord.countDocuments();
    console.log('📊 Total Attendance Records:', totalCount);

    // Get all records to see what dates exist
    const allRecords = await AttendanceRecord.find({})
      .select('scheduledStart scheduledEnd status workerNameSnapshot jobTitleSnapshot')
      .sort({ scheduledStart: -1 })
      .limit(20);

    console.log('\n📅 Recent Attendance Records:');
    console.log('================================');
    allRecords.forEach((record, idx) => {
      console.log(`\n${idx + 1}. ID: ${record._id}`);
      console.log(`   Worker: ${record.workerNameSnapshot || 'N/A'}`);
      console.log(`   Job: ${record.jobTitleSnapshot || 'N/A'}`);
      console.log(`   Status: ${record.status}`);
      console.log(`   Scheduled Start: ${record.scheduledStart}`);
      console.log(`   Scheduled End: ${record.scheduledEnd}`);
    });

    // Test the specific date query
    const testDate = '2025-11-08';
    console.log(`\n\n🔍 Testing date query for: ${testDate}`);
    console.log('================================');
    
    const base = new Date(testDate);
    const start = new Date(base);
    start.setHours(0, 0, 0, 0);
    const end = new Date(base);
    end.setHours(23, 59, 59, 999);
    
    console.log('Query range:');
    console.log('  Start:', start);
    console.log('  End:', end);

    const filter = {
      scheduledStart: { $gte: start, $lte: end }
    };
    
    console.log('\nFilter:', JSON.stringify(filter, null, 2));

    const matchingRecords = await AttendanceRecord.find(filter);
    console.log(`\n✅ Found ${matchingRecords.length} records matching the date filter`);
    
    if (matchingRecords.length > 0) {
      matchingRecords.forEach((record, idx) => {
        console.log(`\n${idx + 1}. ${record.workerNameSnapshot || 'N/A'} - ${record.jobTitleSnapshot || 'N/A'}`);
        console.log(`   Scheduled: ${record.scheduledStart} to ${record.scheduledEnd}`);
        console.log(`   Status: ${record.status}`);
      });
    }

    // Check if there are records for November 2025
    const novStart = new Date('2025-11-01T00:00:00.000Z');
    const novEnd = new Date('2025-11-30T23:59:59.999Z');
    const novRecords = await AttendanceRecord.find({
      scheduledStart: { $gte: novStart, $lte: novEnd }
    }).countDocuments();
    
    console.log(`\n📅 Records in November 2025: ${novRecords}`);

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

debugAttendance();
