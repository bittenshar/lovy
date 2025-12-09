const path = require('path');
const admin = require('firebase-admin');

async function checkFirebaseSetup() {
  console.log('🔍 Firebase Setup Diagnostic\n');
  console.log('1. Checking service account file...');
  
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    path.join(__dirname, 'firebase-service-account.json');
  
  console.log(`   Path: ${serviceAccountPath}`);
  
  const fs = require('fs');
  if (!fs.existsSync(serviceAccountPath)) {
    console.log('   ❌ Service account file NOT found');
    process.exit(1);
  }
  console.log('   ✅ Service account file found');
  
  // Try to load it
  try {
    const serviceAccount = require(serviceAccountPath);
    console.log(`   ✅ Valid JSON format`);
    console.log(`   Project ID: ${serviceAccount.project_id}`);
    console.log(`   Email: ${serviceAccount.client_email}`);
  } catch (e) {
    console.log(`   ❌ Invalid JSON: ${e.message}`);
    process.exit(1);
  }
  
  console.log('\n2. Initializing Firebase Admin SDK...');
  try {
    if (admin.apps.length > 0) {
      console.log('   ✅ Already initialized');
    } else {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccountPath),
      });
      console.log('   ✅ Successfully initialized');
    }
  } catch (e) {
    console.log(`   ❌ Initialization failed: ${e.message}`);
    process.exit(1);
  }
  
  console.log('\n3. Firebase Messaging Service...');
  try {
    const messaging = admin.messaging();
    console.log('   ✅ Messaging service available');
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    process.exit(1);
  }
  
  console.log('\n✅ All Firebase checks passed!');
  console.log('\nFirebase is ready to send notifications.');
  process.exit(0);
}

checkFirebaseSetup().catch(e => {
  console.error('❌ Fatal error:', e.message);
  process.exit(1);
});
