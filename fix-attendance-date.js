const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, 'src/config/config.env') });

const AttendanceRecord = require('./src/modules/attendance/attendance.model');

async function fixAttendanceDates() {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('MONGO_URI not found in .env file');
      process.exit(1);
    }
    
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Fix the specific record with wrong year
    const recordId = '690e1328332325b86dcc3dee';
    const record = await AttendanceRecord.findById(recordId);

    if (!record) {
      console.log('Record not found');
      return;
    }

    console.log('\n--- BEFORE ---');
    console.log('ID:', record._id);
    console.log('scheduledStart:', record.scheduledStart);
    console.log('scheduledEnd:', record.scheduledEnd);
    console.log('status:', record.status);

    // Fix: Change 2024 to 2025 in scheduledEnd
    const correctEnd = new Date('2025-11-09T21:00:00.000Z');
    record.scheduledEnd = correctEnd;

    await record.save();

    console.log('\n--- AFTER ---');
    console.log('scheduledStart:', record.scheduledStart);
    console.log('scheduledEnd:', record.scheduledEnd);
    console.log('\n✅ Record fixed successfully!');

    // Find all records with scheduledEnd before scheduledStart
    console.log('\n--- Checking for other invalid records ---');
    const invalidRecords = await AttendanceRecord.find({
      $expr: { $lt: ['$scheduledEnd', '$scheduledStart'] }
    }).select('_id scheduledStart scheduledEnd workerNameSnapshot jobTitleSnapshot');

    if (invalidRecords.length > 0) {
      console.log(`\n⚠️  Found ${invalidRecords.length} records with scheduledEnd before scheduledStart:`);
      invalidRecords.forEach(rec => {
        console.log(`\nID: ${rec._id}`);
        console.log(`Worker: ${rec.workerNameSnapshot}`);
        console.log(`Job: ${rec.jobTitleSnapshot}`);
        console.log(`Start: ${rec.scheduledStart}`);
        console.log(`End: ${rec.scheduledEnd}`);
      });
    } else {
      console.log('✅ No other invalid records found');
    }

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixAttendanceDates();
