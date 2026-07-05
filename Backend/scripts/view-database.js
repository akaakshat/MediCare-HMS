const mongoose = require('mongoose');

async function viewDatabase() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect('mongodb://localhost:27017/his_db', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB\n');

    // Get all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(col => col.name);

    console.log('📊 DATABASE CONTENTS: his_db\n');
    console.log('=' .repeat(50));

    for (const collectionName of collectionNames) {
      const collection = mongoose.connection.db.collection(collectionName);
      const count = await collection.countDocuments();

      console.log(`\n📁 Collection: ${collectionName.toUpperCase()} (${count} documents)`);
      console.log('-'.repeat(40));

      if (count === 0) {
        console.log('   No documents found');
        continue;
      }

      // Show sample documents (first 3)
      const documents = await collection.find({}).limit(3).toArray();

      documents.forEach((doc, index) => {
        console.log(`\n   Document ${index + 1}:`);
        Object.keys(doc).forEach(key => {
          if (key !== '_id') { // Skip MongoDB _id
            let value = doc[key];
            if (value instanceof Date) {
              value = value.toISOString().split('T')[0]; // Format date
            } else if (typeof value === 'object' && value !== null) {
              value = JSON.stringify(value, null, 2);
            }
            console.log(`     ${key}: ${value}`);
          }
        });
      });

      if (count > 3) {
        console.log(`\n   ... and ${count - 3} more documents`);
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ Database view completed');

  } catch (error) {
    console.error('❌ Failed to view database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run if called directly
if (require.main === module) {
  viewDatabase();
}

module.exports = { viewDatabase };