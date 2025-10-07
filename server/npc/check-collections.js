import { MongoClient, ObjectId } from 'mongodb';

const uri = 'mongodb+srv://Gursimrxn:d3Sqtz9veY6ksbNI@cluster0.p0s5b.mongodb.net/dhaniverse?retryWrites=true&w=majority&ssl=true&authSource=admin';
const userId = '68af42c4c4375cbf230ebfa9';

async function checkCollections() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('dhaniverse');
    
    console.log('\n=== Checking collections for user:', userId, '===\n');
    
    const collections = ['playerStates', 'bankAccounts', 'stockPortfolios', 'stockTransactions', 'fixedDeposits', 'gameSessions', 'achievements'];
    
    for (const collName of collections) {
      const coll = db.collection(collName);
      
      // Try both string userId and ObjectId
      const count1 = await coll.countDocuments({ userId: userId });
      const count2 = await coll.countDocuments({ userId: new ObjectId(userId) });
      
      console.log(`${collName}: ${count1} docs (string userId), ${count2} docs (ObjectId userId)`);
      
      if (count1 > 0 || count2 > 0) {
        const docs = await coll.find({ $or: [{ userId: userId }, { userId: new ObjectId(userId) }] }).limit(1).toArray();
        console.log('  Sample doc keys:', Object.keys(docs[0]).join(', '));
        console.log('  Sample data:', JSON.stringify(docs[0], null, 2).substring(0, 300), '...\n');
      }
    }
    
    // Also check the user document
    console.log('\n=== User Document ===');
    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    if (user) {
      console.log('User found:', user.gameUsername);
      console.log('User _id type:', typeof user._id, user._id.toString());
    }
    
  } finally {
    await client.close();
  }
}

checkCollections().catch(console.error);
