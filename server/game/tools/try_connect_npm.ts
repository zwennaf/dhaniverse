import { MongoClient } from 'npm:mongodb@5.6.0';

const uri = Deno.env.get('MONGODB_URI') || (() => {
  const user = Deno.env.get('MONGODB_USER');
  const pass = Deno.env.get('MONGODB_PASS');
  const host = Deno.env.get('MONGODB_HOST');
  if (user && pass && host) return `mongodb+srv://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}`;
  return '';
})();

if (!uri) {
  console.error('No MONGODB_URI or MONGODB_USER/MONGODB_PASS/MONGODB_HOST found in env');
  Deno.exit(1);
}

async function run() {
  console.log('Attempting connection with npm mongodb driver (masked):', (() => {
    try { const u = new URL(uri.replace(/^mongodb(\+srv)?:/, 'http:')); return `${u.username}:<redacted>@${u.host}` } catch { return '<unparseable>' }
  })());

  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log('✅ npm driver: connected successfully');
    const adminDb = client.db('admin');
    try {
      const dbs = await adminDb.admin().listDatabases();
      console.log('Databases:', dbs.databases.map((d: { name: string }) => d.name).slice(0,10));
    } catch (e: unknown) {
      console.log('Could not list databases (maybe permission-limited):', e instanceof Error ? e.message : String(e));
    }
  } catch (err) {
    console.error('❌ npm driver connection error:', err);
  } finally {
    try { await client.close(); } catch (_e) { /* ignore */ }
  }
}

run();
