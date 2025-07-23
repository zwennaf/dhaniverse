// Load environment variables first
import { load } from "std/dotenv/mod.ts";

// Load the .env file with more flexible options
await load({ 
  export: true,
  allowEmptyValues: true
});

// Set default NODE_ENV if not provided
if (!Deno.env.get("NODE_ENV")) {
  Deno.env.set("NODE_ENV", Deno.env.get("DENO_ENV") || "development");
}

import { Application } from "oak";
import { oakCors } from "cors";
import { config } from "./src/config/config.ts";
import { mongodb } from "./src/db/mongo.ts";
import authRouter from "./src/routes/authRouter.ts";
import apiRouter from "./src/routes/apiRouter.ts";
import gameRouter from "./src/routes/gameRouter.ts";

// Initialize database connection
async function initializeDatabase() {
    try {
        await mongodb.connect();
    } catch (error) {
        console.error("❌ Failed to initialize database:", error);
        if (!config.isDev) {
            // In production, exit if database connection fails
            Deno.exit(1);
        } else {
            console.warn("⚠️  Continuing without database in development mode");
        }
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
app.use(async (ctx, next) => {
    try {
        await next();
    } catch (err) {
        console.error("Server error:", err);
        ctx.response.status = 500;
        ctx.response.body = { error: "Internal server error" };
    }
});

// Global CORS - allow all origins for localhost development
app.use(
    oakCors({
        origin: "*",
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "Accept", "Origin"],
    })
);

// CSP header middleware to allow framing of specific domains
app.use(async (ctx, next) => {
    await next();
    ctx.response.headers.set(
        "Content-Security-Policy",
        "frame-src 'self' https://accounts.google.com https://*.googleusercontent.com https://vercel.live https://www.youtube.com"
    );
});

// Debug logging middleware (removed for production)
app.use(async (_ctx, next) => {
    await next();
});

// Health check endpoint with database status
app.use(async (ctx, next) => {
    if (ctx.request.url.pathname === "/health") {
        ctx.response.body = {
            status: "ok",
            timestamp: new Date().toISOString(),
            database: mongodb.isHealthy() ? "connected" : "disconnected",
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

// WebSocket functionality has been moved to a dedicated server in server/ws

// Start the server with database initialization
async function startServer() {
    await initializeDatabase();

    const port = config.port;

    try {
        console.log(`🚀 Starting server on port ${port}`);
        await app.listen({ port });
        console.log(`✅ Server running on http://localhost:${port}`);
        console.log(
            `� WebSockent server available at ws://localhost:${port}/ws`
        );
    } catch (error) {
        console.error("❌ Failed to start server:", error);
        Deno.exit(1);
    }
}

startServer().catch((error) => {
    console.error("❌ Failed to start server:", error);
    Deno.exit(1);
});
