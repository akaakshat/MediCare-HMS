const mongoose = require('mongoose');

require('dotenv').config();

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGO_FALLBACK_URI;
    if (!mongoUri) {
      throw new Error('Mongo URI not set in environment variables (MONGO_URI or MONGO_FALLBACK_URI)');
    }

    console.log('Connecting to MongoDB (uri):', mongoUri);
    mongoose.set('strictQuery', false);
    const conn = await mongoose.connect(mongoUri, {
      connectTimeoutMS: 10000,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.log('\n⚠️ TROUBLESHOOTING:');
    console.log('1. Check MongoDB Atlas IP Whitelist (allow 0.0.0.0/0 or your IP)');
    console.log('2. Verify MONGO_URI in .env file');
    console.log('3. Check your internet connection');
    process.exit(1);
  }
};

module.exports = { connectDB };

