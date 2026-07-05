require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/his_db';

(async () => {
  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');
    const email = 'admin@hospital.local';
    let user = await User.findOne({ email });
    if (!user) {
      user = new User({ name: 'System Admin', email, password: 'Admin@123456', role: 'admin' });
      await user.save();
      console.log('Admin user created with password Admin@123456');
    } else {
      user.password = 'Admin@123456';
      await user.save();
      console.log('Admin password reset to Admin@123456');
    }
    process.exit(0);
  } catch (err) {
    console.error('Error resetting admin:', err);
    process.exit(1);
  }
})();
