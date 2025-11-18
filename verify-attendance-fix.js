const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, 'src/config/config.env') });

const AttendanceRecord = require('./src/modules/attendance/attendance.model');

async function verifyFix() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB\n');

    const recordId = '690e1328332325b86dcc3dee';
    const record = await AttendanceRecord.findById(recordId);

    if (!record) {
      console.log('❌ Record not found');
      await mongoose.disconnect();
      return;
    }

    console.log('📋 Attendance Record Details:');
    console.log('================================');
    console.log('ID:', record._id);
    console.log('Worker:', record.workerNameSnapshot);
    console.log('Job:', record.jobTitleSnapshot);
    console.log('Status:', record.status);
    console.log('\n📅 Schedule:');
    console.log('Start:', record.scheduledStart);
    console.log('End:', record.scheduledEnd);
    
    // Verify the dates
    const startYear = record.scheduledStart.getFullYear();
    const endYear = record.scheduledEnd.getFullYear();
    
    console.log('\n✅ Validation:');
    console.log('Start Year:', startYear);
    console.log('End Year:', endYear);
    console.log('End after Start:', record.scheduledEnd > record.scheduledStart ? '✅ YES' : '❌ NO');
    
    if (startYear === 2025 && endYear === 2025 && record.scheduledEnd > record.scheduledStart) {
      console.log('\n🎉 All checks passed! Record is valid.');
    } else {
      console.log('\n⚠️  Issues detected with the record.');
    }

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

verifyFix();
