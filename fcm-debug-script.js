#!/usr/bin/env node

/**
 * 🔬 FCM System Diagnostic & Debug Script
 * 
 * Shows detailed information about FCM token storage and delivery
 * 
 * Usage:
 *   node fcm-debug-script.js
 */

const admin = require('firebase-admin');
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  title: (msg) => console.log(`\n${colors.bright}${colors.blue}${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.cyan}ℹ️  ${msg}${colors.reset}`),
  error: (msg) => console.log(`❌ ${msg}`),
  divider: () => console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}`)
};

// Load env
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, 'src', 'config', 'config.env') });

// Init Firebase
let firebaseReady = false;
try {
  const serviceAccount = require('./firebase-service-account.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  firebaseReady = true;
  log.success('Firebase Admin SDK initialized');
} catch (error) {
  log.error(`Firebase init failed: ${error.message}`);
}

// Init MongoDB
let mongoReady = false;
const mongoUrl = process.env.MONGO_URI || process.env.DATABASE_URL;

mongoose.connect(mongoUrl)
  .then(() => {
    mongoReady = true;
    log.success('MongoDB connected');
  })
  .catch(err => {
    log.error(`MongoDB connection failed: ${err.message}`);
  });

const userFcmTokenSchema = new mongoose.Schema({
  userId: String,
  tokens: [{
    token: String,
    deviceType: String,
    isActive: Boolean,
    _id: mongoose.Schema.Types.ObjectId
  }],
  createdAt: Date,
  updatedAt: Date
});

const UserFcmToken = mongoose.model('userfcmtoken', userFcmTokenSchema, 'userfcmtokens');

// Main diagnostic function
async function runDiagnostics() {
  log.title('🔬 FCM SYSTEM DIAGNOSTIC REPORT');
  log.divider();

  // 1. System Status
  log.title('1️⃣  System Status');
  console.log(`   Firebase: ${firebaseReady ? colors.green + '✅' + colors.reset : colors.yellow + '⚠️' + colors.reset}`);
  console.log(`   MongoDB: ${mongoReady ? colors.green + '✅' + colors.reset : colors.yellow + '⚠️' + colors.reset}`);

  if (!mongoReady || !firebaseReady) {
    log.error('System not fully initialized');
    process.exit(1);
  }

  // 2. MongoDB Data
  log.title('2️⃣  MongoDB Token Storage');
  
  try {
    const users = await UserFcmToken.find({});
    log.success(`Found ${users.length} user(s) with tokens`);
    log.divider();

    let totalTokens = 0;
    let activeTokens = 0;

    users.forEach((user, idx) => {
      console.log(`\n   User ${idx + 1}:`);
      console.log(`   └─ ID: ${colors.cyan}${user.userId}${colors.reset}`);
      console.log(`   └─ Tokens: ${user.tokens.length}`);
      
      user.tokens.forEach((token, tidx) => {
        totalTokens++;
        if (token.isActive) activeTokens++;
        
        const status = token.isActive ? `${colors.green}Active${colors.reset}` : `${colors.yellow}Inactive${colors.reset}`;
        const preview = token.token.substring(0, 30) + '...';
        
        console.log(`      └─ ${tidx + 1}) ${token.deviceType.toUpperCase()} - ${status}`);
        console.log(`         Token: ${colors.cyan}${preview}${colors.reset}`);
      });

      console.log(`      └─ Created: ${new Date(user.createdAt).toLocaleString()}`);
    });

    log.divider();
    console.log(`\n   📊 Statistics:`);
    console.log(`      Total tokens: ${totalTokens}`);
    console.log(`      Active tokens: ${activeTokens}`);
    console.log(`      Inactive tokens: ${totalTokens - activeTokens}`);

  } catch (error) {
    log.error(`Failed to fetch tokens: ${error.message}`);
  }

  // 3. Test Notification Send
  log.title('3️⃣  Test Notification Send');

  try {
    const users = await UserFcmToken.find({}).limit(1);
    
    if (users.length === 0) {
      log.warn('No users to test');
    } else {
      const testUser = users[0];
      const testToken = testUser.tokens.find(t => t.isActive);

      if (!testToken) {
        log.warn('No active tokens to test');
      } else {
        console.log(`\n   Testing with User: ${colors.cyan}${testUser.userId}${colors.reset}`);
        console.log(`   Token: ${colors.cyan}${testToken.token.substring(0, 40)}...${colors.reset}`);

        try {
          process.stdout.write(`\n   Sending test notification... `);

          const response = await admin.messaging().send({
            notification: {
              title: '🔬 Diagnostic Test',
              body: 'FCM system diagnostic notification'
            },
            data: {
              type: 'diagnostic',
              timestamp: new Date().toISOString(),
              userId: testUser.userId
            },
            token: testToken.token
          });

          log.success(`Sent! Response ID: ${colors.cyan}${response}${colors.reset}`);

        } catch (error) {
          log.error(`Send failed: ${error.message}`);
          if (error.code === 'messaging/invalid-registration-token') {
            log.warn('Token is invalid or expired - may need re-registration');
          }
        }
      }
    }

  } catch (error) {
    log.error(`Test failed: ${error.message}`);
  }

  // 4. Configuration Check
  log.title('4️⃣  Configuration Check');

  console.log(`\n   Firebase Service Account:`);
  try {
    const config = require('./firebase-service-account.json');
    console.log(`      Project ID: ${colors.green}${config.project_id}${colors.reset}`);
    console.log(`      Client Email: ${config.client_email}`);
  } catch (error) {
    log.error(`Firebase config not found`);
  }

  console.log(`\n   MongoDB Connection:`);
  console.log(`      URL: ${mongoUrl.substring(0, 50)}...`);

  console.log(`\n   Environment Variables:`);
  console.log(`      NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
  console.log(`      JWT_SECRET: ${process.env.JWT_SECRET ? '✓ set' : '✗ not set'}`);
  console.log(`      FIREBASE_SERVICE_ACCOUNT_PATH: ${process.env.FIREBASE_SERVICE_ACCOUNT_PATH || 'default'}`);

  // 5. Recommendations
  log.title('5️⃣  Recommendations');

  const recommendations = [
    { check: 'Firebase initialized', status: firebaseReady },
    { check: 'MongoDB connected', status: mongoReady },
    { check: 'Users have tokens', status: (await UserFcmToken.countDocuments()) > 0 },
    { check: 'Active tokens exist', status: (await UserFcmToken.countDocuments({ 'tokens.isActive': true })) > 0 }
  ];

  recommendations.forEach(rec => {
    const icon = rec.status ? `${colors.green}✅${colors.reset}` : `${colors.yellow}⚠️${colors.reset}`;
    console.log(`   ${icon} ${rec.check}`);
  });

  // 6. Next Steps
  log.title('6️⃣  Next Steps');

  console.log(`\n   To send notifications to users:`);
  console.log(`   ${colors.bright}node quick-test-notifications.js${colors.reset}\n`);

  console.log(`   To test specific user:`);
  console.log(`   ${colors.bright}node quick-test-notifications.js USER_ID${colors.reset}\n`);

  console.log(`   To use interactive mode:`);
  console.log(`   ${colors.bright}node test-messaging-notifications.js${colors.reset}\n`);

  log.divider();
  log.success('Diagnostic complete!');
  console.log();

  process.exit(0);
}

// Run diagnostics
setTimeout(runDiagnostics, 1000);
