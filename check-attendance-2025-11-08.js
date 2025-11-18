const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, 'src/config/config.env') });

const AttendanceRecord = require('./src/modules/attendance/attendance.model');

async function checkAttendance() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB\n');

    const targetDate = '2025-11-08';
    
    // Build date range like the API does
    const base = new Date(targetDate);
    const start = new Date(base);
    start.setHours(0, 0, 0, 0);
    const end = new Date(base);
    end.setHours(23, 59, 59, 999);
    
    console.log('🔍 Searching for attendance records on:', targetDate);
    console.log('Date range:');
    console.log('  Start:', start.toISOString());
    console.log('  End:  ', end.toISOString());
    console.log('');

    // Query like the API does
    const filter = {
      scheduledStart: { $gte: start, $lte: end }
    };

    console.log('Filter:', JSON.stringify(filter, null, 2));
    console.log('');

    const records = await AttendanceRecord.find(filter).sort({ scheduledStart: -1 });
    
    console.log(`✅ Found ${records.length} records\n`);
    
    if (records.length > 0) {
      records.forEach((record, index) => {
        console.log(`Record ${index + 1}:`);
        console.log('  ID:', record._id);
        console.log('  Worker:', record.workerNameSnapshot);
        console.log('  Job:', record.jobTitleSnapshot);
        console.log('  Status:', record.status);
        console.log('  Scheduled Start:', record.scheduledStart);
        console.log('  Scheduled End:', record.scheduledEnd);
        console.log('');
      });
    } else {
      console.log('⚠️  No records found for this date\n');
      
      // Let's check what dates DO have records
      console.log('📊 Checking all attendance records...\n');
      const allRecords = await AttendanceRecord.find({}).sort({ scheduledStart: -1 }).limit(10);
      
      console.log(`Total records in database: ${await AttendanceRecord.countDocuments({})}`);
      console.log(`\nShowing first 10 records by date:\n`);
      
      allRecords.forEach((record, index) => {
        console.log(`${index + 1}. ${record.scheduledStart.toISOString().split('T')[0]} - ${record.workerNameSnapshot} - ${record.status}`);
      });
    }

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkAttendance();
