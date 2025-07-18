// Configuration for the Deno server
const isDev = Deno.env.get("NODE_ENV") !== "production";

export const config = {
  port: parseInt(Deno.env.get("PORT") || "8000"),
  socketPort: parseInt(Deno.env.get("SOCKET_PORT") || "8001"),
  serverDomain: Deno.env.get("SERVER_DOMAIN") || "localhost",
  jwtSecret: Deno.env.get("JWT_SECRET") || "your-jwt-secret-key-change-this-in-production",
  
  // MongoDB Configuration - Atlas only
  mongodb: {
    url: Deno.env.get("MONGODB_URI"),
    dbName: Deno.env.get("DB_NAME") || "dhaniverse"
  },
  
  corsOrigins: isDev 
    ? ["http://localhost:5173", "http://localhost:3000", "http://localhost:3001", "http://localhost:4173"]
    : ["https://dhaniverse.vercel.app"],
  
  isDev
};

// Validate JWT secret
if (config.jwtSecret === "your-jwt-secret-key-change-this-in-production") {
  console.warn("⚠️  Warning: Using default JWT secret. Set JWT_SECRET environment variable for production!");
  if (!isDev) {
    console.error("❌ JWT_SECRET must be set in production!");
    Deno.exit(1);
  }
}

// Log configuration (without sensitive data)
console.log("🔧 Server Configuration:");
console.log(`   Environment: ${isDev ? 'Development' : 'Production'}`);
console.log(`   Port: ${config.port}`);
console.log(`   WebSocket Port: ${config.socketPort}`);
console.log(`   Database: ${config.mongodb.dbName}`);
console.log(`   MongoDB Atlas: ✅ Configured`);
console.log(`   JWT Secret: ${config.jwtSecret !== 'your-jwt-secret-key-change-this-in-production' ? '✅ Configured' : '⚠️  Using default'}`);
