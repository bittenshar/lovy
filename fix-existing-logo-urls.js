/**
 * Fix existing business logo URLs in database
 * Converts relative paths to absolute URLs
 * 
 * Run this AFTER deploying the backend fix:
 * node fix-existing-logo-urls.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Business = require('./src/modules/businesses/business.model');

const BASE_URL = process.env.BASE_URL || 'https://lovy-dusky.vercel.app';

async function fixLogoUrls() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/talent');
    
    console.log('📊 Finding businesses with relative logo URLs...');
    
    // Find businesses with relative logo URLs (starting with /)
    const businesses = await Business.find({
      $or: [
        { logoUrl: { $regex: '^/', $options: 'i' } },
        { logoSmall: { $regex: '^/', $options: 'i' } },
        { logoMedium: { $regex: '^/', $options: 'i' } }
      ]
    });
    
    console.log(`\n📝 Found ${businesses.length} businesses with relative logo URLs\n`);
    
    if (businesses.length === 0) {
      console.log('✅ No businesses need fixing!');
      await mongoose.connection.close();
      return;
    }
    
    let updated = 0;
    let skipped = 0;
    
    for (const business of businesses) {
      console.log(`\n🔧 Processing: ${business.name} (ID: ${business._id})`);
      
      const updates = {};
      let hasChanges = false;
      
      // Fix logoUrl
      if (business.logoUrl && business.logoUrl.startsWith('/')) {
        const newUrl = `${BASE_URL}${business.logoUrl}`;
        console.log(`  📸 logoUrl: ${business.logoUrl} → ${newUrl}`);
        updates.logoUrl = newUrl;
        hasChanges = true;
      }
      
      // Fix logoSmall
      if (business.logoSmall && business.logoSmall.startsWith('/')) {
        const newUrl = `${BASE_URL}${business.logoSmall.split('?')[0]}?w=50&h=50&q=70`;
        console.log(`  🎯 logoSmall: ${business.logoSmall} → ${newUrl}`);
        updates.logoSmall = newUrl;
        hasChanges = true;
      }
      
      // Fix logoMedium
      if (business.logoMedium && business.logoMedium.startsWith('/')) {
        const newUrl = `${BASE_URL}${business.logoMedium.split('?')[0]}?w=150&h=150&q=80`;
        console.log(`  🎯 logoMedium: ${business.logoMedium} → ${newUrl}`);
        updates.logoMedium = newUrl;
        hasChanges = true;
      }
      
      if (hasChanges) {
        await Business.updateOne({ _id: business._id }, { $set: updates });
        console.log(`  ✅ Updated!`);
        updated++;
      } else {
        console.log(`  ⏭️  Already has absolute URLs`);
        skipped++;
      }
    }
    
    console.log(`\n\n📊 Summary:`);
    console.log(`  ✅ Updated: ${updated}`);
    console.log(`  ⏭️  Skipped: ${skipped}`);
    console.log(`\n🎉 Done! All business logo URLs have been fixed.`);
    
    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the fix
fixLogoUrls();
