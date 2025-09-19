import { MongoClient } from "https://deno.land/x/mongo@v0.32.0/mod.ts";
import { config } from "../src/config/config.ts";

async function run() {
  console.log('Using MongoDB URL (masked):', (() => {
    try { const u = new URL(config.mongodb.url.replace(/^mongodb(\+srv)?:/, 'http:')); return `${u.username}:<redacted>@${u.host}` } catch { return '<unparseable>' }
  })());

  const client = new MongoClient();
  try {
    await client.connect(config.mongodb.url);
    console.log('Connected OK');
    const db = client.database(config.mongodb.dbName);
    console.log('DB name:', config.mongodb.dbName);
    // list collections if possible
    try {
      const cols = await db.listCollectionNames();
      console.log('Collections:', cols.slice(0, 10));
    } catch (e) {
      console.error('Failed listing collections:', e);
    }
  } catch (err) {
    console.error('Connection error:', err);
  } finally {
    try { client.close(); } catch (_e) { /* ignore close errors */ }
  }
}

run();
