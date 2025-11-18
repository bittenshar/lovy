const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, 'src/config/config.env') });

const AttendanceRecord = require('./src/modules/attendance/attendance.model');

async function checkRecordRange() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB\n');

    const allRecords = await AttendanceRecord.find({});
    
    console.log(`Total records: ${allRecords.length}\n`);
    
    allRecords.forEach((record, index) => {
      console.log(`Record ${index + 1}:`);
      console.log('  ID:', record._id);
      console.log('  Worker:', record.workerNameSnapshot);
      console.log('  Job:', record.jobTitleSnapshot);
      console.log('  Status:', record.status);
      console.log('  Scheduled Start:', record.scheduledStart.toISOString());
      console.log('  Scheduled End:', record.scheduledEnd.toISOString());
      
      // Check which dates this record spans
      const start = new Date(record.scheduledStart);
      const end = new Date(record.scheduledEnd);
      const startDate = start.toISOString().split('T')[0];
      const endDate = end.toISOString().split('T')[0];
      
      console.log('  Date Range:', startDate, 'to', endDate);
      console.log('');
    });

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkRecordRange();
