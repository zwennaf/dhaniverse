// Environment variables are loaded via --env-file flag
console.log("🔍 Environment Variables Check:");
console.log("📍 MongoDB URI:", Deno.env.get("MONGODB_URI") ? "✅ Found" : "❌ Missing");
console.log("📍 JWT Secret:", Deno.env.get("JWT_SECRET") ? "✅ Found" : "❌ Missing");
console.log("📍 Node ENV:", Deno.env.get("NODE_ENV") || "development");

import { Application, Context } from "oak";
import { oakCors } from "cors";
import { config } from "./src/config/config.ts";
import { mongodb } from "./src/db/mongo.ts";
import authRouter from "./src/routes/authRouter.ts";
import apiRouter from "./src/routes/apiRouter.ts";
import wsRouter from "./src/routes/wsRouter.ts";
import gameRouter from "./src/routes/gameRouter.ts";
import { startWebSocketServer } from "./src/websocket-server.ts";

// Initialize database connection
async function initializeDatabase() {
    try {
        await mongodb.connect();
        console.log("✅ Database initialized successfully");
        return true;
    } catch (error) {
        console.error("❌ Failed to initialize database:", error);
        
        console.log("\n💡 MongoDB Atlas Setup Required:");
        console.log("   1. Create MongoDB Atlas account at https://cloud.mongodb.com/");
        console.log("   2. Create a cluster and database user");
        console.log("   3. Get connection string and set MONGODB_URI environment variable");
        console.log("   4. Ensure your IP is whitelisted in Network Access");
        
        // Continue without database to allow server to start
        console.warn("⚠️  Starting server without database (limited functionality)");
        console.warn("⚠️  Authentication and game features will not work properly");
        return false;
    }
}

// Graceful shutdown
async function gracefulShutdown() {
    await mongodb.disconnect();
    Deno.exit(0);
}

// Handle shutdown signals
Deno.addSignalListener("SIGINT", gracefulShutdown);

// SIGTERM is not supported on Windows, only add if not on Windows
if (Deno.build.os !== "windows") {
    Deno.addSignalListener("SIGTERM", gracefulShutdown);
}

// Create an Oak application
const app = new Application();

// Global error handling
app.use(async (ctx: Context, next) => {
    try {
        await next();
    } catch (err) {
        console.error("Server error:", err);
        ctx.response.status = 500;
        ctx.response.body = { error: "Internal server error" };
    }
});

// Global CORS - allow all origins for localhost development
app.use(oakCors({
    origin: "*",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept", "Origin"],
}));

// CSP header middleware to allow framing of specific domains
app.use(async (ctx: Context, next) => {
    await next();
    ctx.response.headers.set(
        "Content-Security-Policy",
        "frame-src 'self' https://accounts.google.com https://*.googleusercontent.com https://vercel.live https://www.youtube.com"
    );
});

// Debug logging middleware (removed for production)
app.use(async (_ctx: Context, next) => {
    await next();
});

// Health check endpoint with database status
app.use(async (ctx: Context, next) => {
    if (ctx.request.url.pathname === "/health") {
        ctx.response.body = { 
            status: "ok", 
            timestamp: new Date().toISOString(),
            database: mongodb.isHealthy() ? "connected" : "disconnected",
            websocket: "separate_server_port_8001"
        };
        return;
    }
    await next();
});

// Use API router for all /api routes
app.use(apiRouter.routes());
app.use(apiRouter.allowedMethods());

// Auth routes - direct mounting without /api prefix for backward compatibility
app.use(authRouter.routes());
app.use(authRouter.allowedMethods());

// Game routes - mounted directly for game API endpoints
app.use(gameRouter.routes());
app.use(gameRouter.allowedMethods());

// WebSocket info routes (no actual WebSocket handling in main server for local dev)
app.use(wsRouter.routes());
app.use(wsRouter.allowedMethods());

// Start the server with database initialization
async function startServer() {
    console.log("🔄 Initializing server...");
    
    try {
        await initializeDatabase();
        console.log("✅ Database initialization completed");
    } catch (error) {
        console.error("❌ Database initialization failed, but continuing...", error);
        // Don't exit, continue without database for now
    }
    
    // Start separate WebSocket server for local development
    if (config.isDev) {
        console.log("🔄 Starting WebSocket server...");
        startWebSocketServer().catch(error => {
            console.error("❌ Failed to start WebSocket server:", error);
            console.warn("⚠️  Continuing without WebSocket server");
        });
    }
    
    const port = config.port;
    console.log(`🚀 HTTP Server starting on port ${port}...`);
    
    try {
        console.log("🔄 Binding to port...");
        await app.listen({ port });
        console.log(`✅ HTTP Server running on http://localhost:${port}`);
        console.log(`🔌 WebSocket server running on ws://localhost:${config.socketPort}/ws`);
        console.log(`🏥 Health check: http://localhost:${port}/health`);
        console.log(`🌐 Auth endpoint: http://localhost:${port}/auth/google`);
    } catch (error) {
        console.error("❌ Failed to start HTTP server:", error);
        console.error("Error details:", error);
        
        if (error.message?.includes('EADDRINUSE')) {
            console.log("💡 Port 8000 is already in use. Try:");
            console.log("   - Close other applications using port 8000");
            console.log("   - Or change PORT in .env file");
        }
        
        Deno.exit(1);
    }
}

startServer().catch((error) => {
    console.error("❌ Failed to start server:", error);
    Deno.exit(1);
});