/**
 * Utility: Check MongoDB URI formatting and suggest fixes (no network connection).
 * Run with: deno run --allow-env client/server/game/tools/check_mongo_uri.ts
 */
const uri = Deno.env.get("MONGODB_URI");

if (!uri) {
  console.error("MONGODB_URI is not set in environment");
  Deno.exit(1);
}

console.log("Checking MONGODB_URI formatting (masked):");

function mask(uri: string) {
  try {
    const parsed = new URL(uri.replace(/^mongodb(\+srv)?:/, 'http:'));
    const user = parsed.username || '<no-user>';
    const pass = parsed.password ? '<redacted>' : '<no-password>';
    const host = parsed.host || parsed.hostname;
    const needsEncoding = parsed.password && !parsed.password.includes('%');
    return `${user}:${pass}@${host}${needsEncoding ? ' (password may need percent-encoding)' : ''}`;
  } catch (_e) {
    return 'Unable to parse URI';
  }
}

console.log('  ', mask(uri));

// Show example of encoded password if a raw password present
const match = uri.match(/^mongodb(\+srv)?:\/\/([^:@\/]+):([^@\/]+)@(.+)$/);
if (match) {
  const scheme = match[1] ? 'mongodb+srv' : 'mongodb';
  const user = match[2];
  const pass = match[3];
  if (pass.includes('%')) {
    console.log('  Password appears percent-encoded (OK)');
  } else {
    console.log('  Detected raw password characters that may need encoding.');
    console.log('  Example encoded password:', encodeURIComponent(pass));
    console.log(`  Example URI: ${scheme}://${user}:${encodeURIComponent(pass)}@${match[4]}`);
  }
} else {
  console.log('  No username/password detected in URI (or complex URI).');
}

console.log('Done');
