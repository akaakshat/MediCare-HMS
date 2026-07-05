require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/his_db';

(async () => {
  try {
    await mongoose.connect(uri);
    console.log('✓ Connected to MongoDB');

    // Create admin document
    const adminData = {
      name: 'System Administrator',
      email: 'admin@hospital.local',
      password: 'Admin@123456', // Will be hashed by the User schema
      role: 'admin',
      phone: '+1-800-ADMIN-1'
    };

    // Check if admin already exists
    let admin = await User.findOne({ email: adminData.email });

    if (admin) {
      // Update existing admin
      admin.name = adminData.name;
      admin.password = adminData.password;
      admin.role = adminData.role;
      admin.phone = adminData.phone;
      await admin.save();
      console.log('✓ Admin user updated successfully');
    } else {
      // Create new admin
      admin = new User(adminData);
      await admin.save();
      console.log('✓ Admin user created successfully');
    }

    // Display admin document info
    console.log('\n📋 Admin Document Created:');
    console.log('─────────────────────────');
    console.log(`ID: ${admin._id}`);
    console.log(`Name: ${admin.name}`);
    console.log(`Email: ${admin.email}`);
    console.log(`Role: ${admin.role}`);
    console.log(`Phone: ${admin.phone}`);
    console.log(`Created: ${admin.createdAt}`);
    console.log('\n✅ Document saved to database successfully!');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
