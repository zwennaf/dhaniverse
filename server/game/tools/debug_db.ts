// Debug script to check MongoDB connection details
import { MongoClient } from "npm:mongodb@5.6.0";

async function debugMongoDB() {
    const url = "mongodb://localhost:27017";
    const dbName = "dhaniverse";

    console.log("🔍 Debugging MongoDB Connection");
    console.log("📍 Connection URL:", url);
    console.log("🗄️  Database Name:", dbName);

    try {
        const client = new MongoClient(url);
        await client.connect();
        console.log("✅ Connected successfully");

        const db = client.db(dbName);

        // List all databases
        const adminDb = client.db("admin");
        const databases = await adminDb.admin().listDatabases();
        console.log("\n📋 All databases on this MongoDB instance:");
        databases.databases.forEach((database: any) => {
            console.log(
                `   - ${database.name} (${(
                    database.sizeOnDisk /
                    1024 /
                    1024
                ).toFixed(2)} MB)`
            );
        });

        // Check our specific database
        const collections = await db.listCollections().toArray();
        console.log(`\n  Collections in '${dbName}' database:`);

        for (const collection of collections) {
            console.log(`   - ${collection.name}`);
            const coll = db.collection(collection.name);
            const count = await coll.countDocuments();
            console.log(`     Documents: ${count}`);

            if (count > 0) {
                const sample = await coll.findOne();
                console.log(
                    `     Sample document keys:`,
                    Object.keys(sample || {})
                );
            }
        }

        await client.close();
        console.log("\n✅ Debug complete");
    } catch (error) {
        console.error("❌ Error:", error);
    }
}

debugMongoDB();
