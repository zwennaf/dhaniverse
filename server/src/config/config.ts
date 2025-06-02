// Configuration for the Deno server
const isDev = Deno.env.get("NODE_ENV") !== "production";

export const config = {
  port: parseInt(Deno.env.get("PORT") || "8000"),
  socketPort: parseInt(Deno.env.get("SOCKET_PORT") || "8001"),
  serverDomain: Deno.env.get("SERVER_DOMAIN") || "localhost",
  jwtSecret: Deno.env.get("JWT_SECRET") || "your-jwt-secret-key-change-this-in-production",
  
  // MongoDB Configuration
  mongodb: {
    url: Deno.env.get("MONGODB_URI") || "mongodb://localhost:27017",
    dbName: "dhaniverse"
  },
  
  corsOrigins: isDev 
    ? ["http://localhost:5173", "http://localhost:3000", "http://localhost:3001", "http://localhost:4173"]
    : ["https://dhaniverse.vercel.app", "https://dhaniverse-git-main-gursimrans-projects-bb3ba6b6.vercel.app"],
  
  isDev
};

// Validate required environment variables
if (!config.mongodb.url) {
  console.error("❌ MONGODB_URI environment variable is required!");
  Deno.exit(1);
}

if (config.jwtSecret === "your-jwt-secret-key-change-this-in-production") {
  console.warn("⚠️  Warning: Using default JWT secret. Set JWT_SECRET environment variable for production!");
}
