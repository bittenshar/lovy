const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, 'src', 'config', 'config.env') });

const app = express();
app.use(express.json());

// Minimal auth middleware for testing
app.use((req, res, next) => {
  req.user = { _id: '690bcb90264fa29974e8e184' }; // test user ID
  next();
});

const notificationRoutes = require('./src/modules/notification/notification.routes');
app.use('/api/notifications', notificationRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ status: 'error', message: err.message });
});

const mongoUrl = process.env.MONGO_URI || process.env.DATABASE_URL;
mongoose.connect(mongoUrl).then(() => {
  console.log('✅ MongoDB connected');
  
  const PORT = 3001;
  app.listen(PORT, () => {
    console.log(`\n✅ Test server running on http://localhost:${PORT}`);
    console.log(`\n📍 Test: curl -H "Authorization: Bearer test" http://localhost:${PORT}/api/notifications\n`);
  });
}).catch(err => {
  console.error('❌ MongoDB connection error:', err.message);
  process.exit(1);
});
