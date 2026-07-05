const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const MasterData = require('./models/MasterData');

(async () => {
  try {
    const uri = process.env.MONGO_URI || process.env.MONGO_FALLBACK_URI;
    console.log('uri', uri ? uri.split('?')[0] : '<none>');
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    const docs = await MasterData.find({ type: 'gender' }).lean();
    console.log('count', docs.length);
    console.log(JSON.stringify(docs.map(d => ({ id: d._id.toString(), name: d.name, code: d.code, isActive: d.isActive })), null, 2));
    await mongoose.connection.close();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
