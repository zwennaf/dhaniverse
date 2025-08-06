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
  mongodb: {
    url: Deno.env.get("MONGODB_URI") || "mongodb://localhost:27017",
    dbName: (() => {
      const mongoUri = Deno.env.get("MONGODB_URI");
      if (mongoUri) {
        // Extract database name from MongoDB URI
        const match = mongoUri.match(/\/([^/?]+)(\?|$)/);
        return match ? match[1] : "dhaniverse";
      }
      return "dhaniverse";
    })()
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
console.log(`   Database: ${config.mongodb.dbName}`);
console.log(`   MongoDB URL: ${config.mongodb.url ? '✅ Configured' : '⚠️  Using local default'}`);
console.log(`   JWT Secret: ${config.jwtSecret !== 'your-jwt-secret-key-change-this-in-production' ? '✅ Configured' : '⚠️  Using generated secret'}`);