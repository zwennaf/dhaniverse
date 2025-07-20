// Configuration for the Deno server
// Check both NODE_ENV and DENO_ENV for compatibility
const isDev = (Deno.env.get("DENO_ENV") || Deno.env.get("NODE_ENV") || "development") !== "production";

// Parse allowed origins from environment variable
const parseAllowedOrigins = (): string[] => {
  const originsStr = Deno.env.get("ALLOWED_ORIGINS");
  if (originsStr) {
    return originsStr.split(",").map(origin => origin.trim());
  }
  return isDev 
    ? ["http://localhost:5173", "http://localhost:3000", "http://localhost:4173"]
    : ["https://dhaniverse.vercel.app"];
};

export const config = {
  port: parseInt(Deno.env.get("PORT") || "8000"),
  serverDomain: Deno.env.get("SERVER_DOMAIN") || "localhost",
  jwtSecret: Deno.env.get("JWT_SECRET") || "your-jwt-secret-key-change-this-in-production",
  
  // MongoDB Configuration
  mongodb: {
    url: Deno.env.get("MONGODB_URI") || "mongodb://localhost:27017",
    dbName: Deno.env.get("DB_NAME") || "dhaniverse"
  },
  
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
console.log(`   Port: ${config.port} (HTTP + WebSocket)`);
console.log(`   Database: ${config.mongodb.dbName}`);
console.log(`   MongoDB URL: ${config.mongodb.url ? '✅ Configured' : '⚠️  Using local default'}`);
console.log(`   JWT Secret: ${config.jwtSecret !== 'your-jwt-secret-key-change-this-in-production' ? '✅ Configured' : '⚠️  Using generated secret'}`);