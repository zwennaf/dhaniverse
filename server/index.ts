// Environment variables are loaded via --env-file flag
console.log("🔍 Environment Variables Check:");
console.log("📍 MongoDB URI:", Deno.env.get("MONGODB_URI") ? "✅ Found" : "❌ Missing");
console.log("📍 JWT Secret:", Deno.env.get("JWT_SECRET") ? "✅ Found" : "❌ Missing");
console.log("📍 Node ENV:", Deno.env.get("NODE_ENV") || "development");

import { Application } from "oak";
import { oakCors } from "cors";
import { config } from "./src/config/config.ts";
import { mongodb } from "./src/db/mongo.ts";
import authRouter from "./src/routes/authRouter.ts";
import apiRouter from "./src/routes/apiRouter.ts";
import gameRouter from "./src/routes/gameRouter.ts";
import { WebSocketService } from "./src/services/WebSocketService.ts";

// Initialize WebSocket service
const webSocketService = new WebSocketService();

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
        console.warn("⚠️  Starting server without database (limited functionality)");
        return false;
    }
}

// Create Oak application for API routes
const app = new Application();

// Global CORS
app.use(oakCors({
    origin: "*",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept", "Origin"],
}));

// Global error handling
app.use(async (ctx, next) => {
    try {
        await next();
    } catch (err) {
        console.error("Server error:", err);
        ctx.response.status = 500;
        ctx.response.body = { error: "Internal server error" };
    }
});

// CSP header middleware
app.use(async (ctx, next) => {
    await next();
    ctx.response.headers.set(
        "Content-Security-Policy",
        "frame-src 'self' https://accounts.google.com https://*.googleusercontent.com https://vercel.live https://www.youtube.com"
    );
});

// Use routers
app.use(apiRouter.routes());
app.use(apiRouter.allowedMethods());
app.use(authRouter.routes());
app.use(authRouter.allowedMethods());
app.use(gameRouter.routes());
app.use(gameRouter.allowedMethods());

// Convert Oak app to handler
const oakHandler = async (request: Request): Promise<Response> => {
    const response = await app.handle(request);
    return response || new Response("Not Found", { status: 404 });
};

// Main request handler with WebSocket support
async function handleRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    // Handle WebSocket upgrade on /ws
    if (url.pathname === "/ws") {
        const upgrade = request.headers.get("upgrade");
        if (upgrade?.toLowerCase() === "websocket") {
            try {
                const { socket, response } = Deno.upgradeWebSocket(request);
                webSocketService.handleConnection(socket);
                return response;
            } catch (error) {
                console.error("❌ WebSocket upgrade failed:", error);
                return new Response(JSON.stringify({
                    error: "WebSocket upgrade failed",
                    details: error instanceof Error ? error.message : "Unknown error"
                }), {
                    status: 500,
                    headers: { "Content-Type": "application/json" }
                });
            }
        }
    }
    
    // Handle health check
    if (url.pathname === "/health") {
        return new Response(JSON.stringify({
            status: "ok",
            timestamp: new Date().toISOString(),
            database: mongodb.isHealthy() ? "connected" : "disconnected",
            websocket: "integrated",
            connections: webSocketService.getConnectionCount()
        }), {
            headers: { "Content-Type": "application/json" }
        });
    }
    
    // Handle all other requests through Oak
    return await oakHandler(request);
}

// Graceful shutdown
async function gracefulShutdown() {
    console.log("🛑 Shutting down server...");
    await mongodb.disconnect();
    Deno.exit(0);
}

// Handle shutdown signals
Deno.addSignalListener("SIGINT", gracefulShutdown);
if (Deno.build.os !== "windows") {
    Deno.addSignalListener("SIGTERM", gracefulShutdown);
}

// Start the server
async function startServer() {
    console.log("🔄 Initializing server...");
    
    await initializeDatabase();
    
    const port = config.port;
    console.log(`🚀 Starting server on port ${port}...`);
    
    try {
        await Deno.serve({
            port: port,
            hostname: "0.0.0.0",
        }, handleRequest);
        
        console.log(`✅ Server running on http://localhost:${port}`);
        console.log(`🔌 WebSocket endpoint: ws://localhost:${port}/ws`);
        console.log(`🏥 Health check: http://localhost:${port}/health`);
        console.log(`🌐 Auth endpoint: http://localhost:${port}/auth/google`);
    } catch (error) {
        console.error("❌ Failed to start server:", error);
        
        if (error.message?.includes('EADDRINUSE')) {
            console.log("💡 Port is already in use. Try:");
            console.log("   - Close other applications using the port");
            console.log("   - Or change PORT in .env file");
        }
        
        Deno.exit(1);
    }
}

// Start the server
if (import.meta.main) {
    await startServer();
}