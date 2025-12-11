const mongoose = require('mongoose');
const User = require('./src/modules/users/user.model');

mongoose.connect('mongodb://127.0.0.1:27017/lovy')
  .then(async () => {
    console.log('✅ Connected to MongoDB\n');
    
    const userIds = [
      '69307854e324845ecb080759',
      '6936c8951372bc292e6db0fb'
    ];
    
    for (const userId of userIds) {
      const user = await User.findById(userId).select('email fcmTokens');
      
      console.log(`👤 User: ${user?.email} (${userId})`);
      console.log(`   fcmTokens count: ${user?.fcmTokens?.length || 0}`);
      
      if (user?.fcmTokens && user.fcmTokens.length > 0) {
        user.fcmTokens.forEach((t, idx) => {
          console.log(`   [${idx + 1}] Platform: ${t.platform}, Active: ${t.active !== false}`);
          console.log(`       Token: ${t.token?.substring(0, 40)}...`);
        });
      } else {
        console.log('   ❌ No FCM tokens registered!');
      }
      console.log('');
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });
