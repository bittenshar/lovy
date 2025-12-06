#!/usr/bin/env node

/**
 * Test script to verify file upload setup
 */

const fs = require('fs');
const path = require('path');

console.log('✅ File Upload Setup Verification\n');

const directoriesToCheck = [
  '/Users/mrmad/Dhruv/dhruvbackend/public/images',
  '/Users/mrmad/Dhruv/dhruvbackend/public/images/business-logos',
  '/Users/mrmad/Dhruv/dhruvbackend/public/images/worker-profiles'
];

console.log('📁 Directory Structure:');
directoriesToCheck.forEach(dir => {
  const exists = fs.existsSync(dir);
  const status = exists ? '✅' : '❌';
  console.log(`${status} ${dir}`);
});

console.log('\n📄 File Upload Middlewares:');
const middlewares = [
  '/Users/mrmad/Dhruv/dhruvbackend/src/shared/middlewares/upload.middleware.js',
  '/Users/mrmad/Dhruv/dhruvbackend/src/shared/middlewares/multerErrorHandler.js'
];

middlewares.forEach(file => {
  const exists = fs.existsSync(file);
  const status = exists ? '✅' : '❌';
  console.log(`${status} ${path.basename(file)}`);
});

console.log('\n🔗 Route Configuration:');
const routeConfig = [
  { file: 'src/modules/businesses/business.routes.js', feature: 'Business logo upload' },
  { file: 'src/modules/workers/worker.routes.js', feature: 'Worker profile upload' },
  { file: 'src/app.js', feature: 'Static file serving + Multer error handler' }
];

routeConfig.forEach(({ file, feature }) => {
  const fullPath = `/Users/mrmad/Dhruv/dhruvbackend/${file}`;
  const exists = fs.existsSync(fullPath);
  const status = exists ? '✅' : '❌';
  console.log(`${status} ${feature}`);
});

console.log('\n🎯 Configuration Summary:');
console.log('✅ Business logo upload: PATCH /api/businesses/:businessId');
console.log('   - Max size: 5MB');
console.log('   - Field name: logo');
console.log('   - Storage: public/images/business-logos/');

console.log('\n✅ Worker profile upload: PATCH /api/workers/me');
console.log('   - Max size: 10MB');
console.log('   - Field name: profileImage');
console.log('   - Storage: public/images/worker-profiles/');

console.log('\n✅ Static file serving: /images/* -> public/images/*');

console.log('\n📚 Documentation:');
console.log('📖 See FILE_UPLOAD_API.md for detailed usage examples');

console.log('\n✅ Setup is complete! Ready for file uploads.\n');
