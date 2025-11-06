const mongoose = require('mongoose');

const simpleLocationSchema = new mongoose.Schema(
  {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    formattedAddress: { type: String, required: true },
    allowedRadius: { type: Number, default: 150 }
  },
  { _id: false }
);

module.exports = simpleLocationSchema;