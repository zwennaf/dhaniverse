// Configuration for the Deno server
// Simple environment detection - assume production if no NODE_ENV set
const isDev = Deno.env.get("NODE_ENV") !== "production";

// Parse allowed origins from environment variable
const parseAllowedOrigins = (): string[] => {
  const originsStr = Deno.env.get("ALLOWED_ORIGINS");
  if (originsStr) {
    return originsStr.split(",").map(origin => origin.trim());
  }
  return isDev 
    ? ["http://localhost:5173", "http://localhost:3000", "http://localhost:4173"]
    : ["*"]; // Allow all origins in production - configure ALLOWED_ORIGINS env var for restrictions
};

export const config = {
  jwtSecret: Deno.env.get("JWT_SECRET") || "your-jwt-secret-key-change-this-in-production",
  
  // MongoDB Configuration
  mongodb: (() => {
    // Prefer explicit env vars to avoid percent-encoding mistakes
    const host = Deno.env.get('MONGODB_HOST'); // e.g. cluster0.p0s5b.mongodb.net/dhaniverse?retryWrites=true&w=majority
    const user = Deno.env.get('MONGODB_USER');
    const pass = Deno.env.get('MONGODB_PASS');
    const rawUri = Deno.env.get('MONGODB_URI');

    let url = rawUri || 'mongodb://localhost:27017';
    if (host && user && pass) {
      // Build a safe, encoded URI using provided parts. If host already contains DB path/query, accept it.
      const encodedUser = encodeURIComponent(user);
      const encodedPass = encodeURIComponent(pass);
  // If host already includes scheme, strip it
      const cleanedHost = host.replace(/^mongodb(\+srv)?:\/\//, '');
      url = `mongodb+srv://${encodedUser}:${encodedPass}@${cleanedHost}`;
    }

    const dbName = (() => {
      const mongoUri = url;
      if (mongoUri) {
        const match = mongoUri.match(/\/([^/?]+)(\?|$)/);
        return match ? match[1] : 'dhaniverse';
      }
      return 'dhaniverse';
    })();

    return { url, dbName };
  })(),
  
  corsOrigins: parseAllowedOrigins(),
  
  isDev
};

// Validate JWT secret with better security
if (config.jwtSecret === "your-jwt-secret-key-change-this-in-production") {
  if (isDev) {
    console.warn("⚠️  Using default JWT secret in development mode");
  } else {
    console.error("❌ FATAL: JWT_SECRET must be set in production!");
    Deno.exit(1);
  }
}

// Generate a secure secret if not set
if (!config.jwtSecret || config.jwtSecret === "your-jwt-secret-key-change-this-in-production") {
  console.warn("⚠️  Generating temporary JWT secret for this session");
  const secretArray = new Uint8Array(64);
  crypto.getRandomValues(secretArray);
  config.jwtSecret = Array.from(secretArray, byte => 
    byte.toString(16).padStart(2, '0')).join('');
}

// Log configuration (without sensitive data)
console.log("🔧 Server Configuration:");
console.log(`   Environment: ${isDev ? 'Development' : 'Production'}`);
console.log(`   Database: ${config.mongodb.dbName}`);

// Utility to show masked MongoDB URL for logs and warn if password may need encoding
function maskMongoUri(uri: string | undefined): string {
  if (!uri) return 'Not configured';
  try {
    // Replace mongodb scheme with http so URL() can parse, only for logging
    const parsed = new URL(uri.replace(/^mongodb(\+srv)?:/, 'http:'));
    const user = parsed.username ? parsed.username : '<no-user>';
    const pass = parsed.password ? '<redacted>' : '<no-password>';
    const host = parsed.host || parsed.hostname;
    const needsEncoding = parsed.password && parsed.password.includes('%') === false;
    return `${user}:${pass}@${host}${needsEncoding ? ' (password may need percent-encoding)' : ''}`;
  } catch (_err) {
    return 'Invalid or complex URI (hidden)';
  }
}

console.log(`   MongoDB URL: ${config.mongodb.url ? maskMongoUri(config.mongodb.url) : '⚠️  Using local default'}`);
console.log(`   JWT Secret: ${config.jwtSecret !== 'your-jwt-secret-key-change-this-in-production' ? '✅ Configured' : '⚠️  Using generated secret'}`);