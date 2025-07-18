/**
 * Deno Deploy entry point
 * This file is used specifically for Deno Deploy deployment
 * 
 * For local development, use: npm run server
 * For local testing of deploy version: npm run server:local
 * For Deno Deploy: deployctl deploy deploy.ts
 */

// Environment variables loaded via Deno Deploy or --env-file flag
console.log("🔍 Environment check - MongoDB URI:", Deno.env.get("MONGODB_URI") ? "✅ Found" : "❌ Missing");

import { Application, Context } from "oak";
import { oakCors } from "cors";
import { mongodb } from "./src/db/mongo.ts";
import authRouter from "./src/routes/authRouter.ts";
import apiRouter from "./src/routes/apiRouter.ts";
import wsRouter from "./src/routes/wsRouter.ts";
import gameRouter from "./src/routes/gameRouter.ts";
import { WebSocketService } from "./src/services/WebSocketService.ts";

// Initialize WebSocket service for Deno Deploy
const webSocketService = new WebSocketService();

// Initialize database connection
async function initializeDatabase() {
    try {
        await mongodb.connect();
        console.log("✅ Database connected successfully");
    } catch (error) {
        console.error("❌ Failed to initialize database:", error);
        console.log("💡 Ensure MONGODB_URI is set in Deno Deploy environment variables");
        // Database is required
        throw error;
    }
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

// Global CORS
app.use(
    oakCors({
        origin: "*",
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "Accept", "Origin"],
    })
);

// CSP header middleware
app.use(async (ctx: Context, next) => {
    await next();
    ctx.response.headers.set(
        "Content-Security-Policy",
        "frame-src 'self' https://accounts.google.com https://*.googleusercontent.com https://vercel.live https://www.youtube.com"
    );
});

// WebSocket upgrade handler for Deno Deploy
app.use(async (ctx: Context, next) => {
    if (ctx.request.url.pathname === "/ws") {
        const upgrade = ctx.request.headers.get("upgrade");
        const connection = ctx.request.headers.get("connection");

        if (
            upgrade?.toLowerCase() === "websocket" &&
            connection?.toLowerCase().includes("upgrade")
        ) {
            try {
                // Check if Oak supports WebSocket upgrade
                if (ctx.isUpgradable) {
                    const socket = await ctx.upgrade();
                    webSocketService.handleConnection(socket);
                    return;
                } else {
                    // Fallback response for unsupported environments
                    ctx.response.status = 426;
                    ctx.response.headers.set("Upgrade", "websocket");
                    ctx.response.body = {
                        error: "WebSocket upgrade not supported",
                        message: "This environment does not support WebSocket upgrades"
                    };
                    return;
                }
            } catch (error) {
                console.error("❌ WebSocket upgrade failed:", error);
                ctx.response.status = 500;
                ctx.response.body = {
                    error: "WebSocket upgrade failed",
                    details: error instanceof Error ? error.message : "Unknown error",
                };
                return;
            }
        }
    }
    await next();
});

// Health check endpoint
app.use(async (ctx: Context, next) => {
    if (ctx.request.url.pathname === "/health") {
        ctx.response.body = {
            status: "ok",
            timestamp: new Date().toISOString(),
            database: mongodb.isHealthy() ? "connected" : "disconnected",
            websocket: "integrated",
        };
        return;
    }
    await next();
});

// Use API router for all /api routes
app.use(apiRouter.routes());
app.use(apiRouter.allowedMethods());

// Auth routes
app.use(authRouter.routes());
app.use(authRouter.allowedMethods());

// Game routes
app.use(gameRouter.routes());
app.use(gameRouter.allowedMethods());

// WebSocket info routes
app.use(wsRouter.routes());
app.use(wsRouter.allowedMethods());

// Initialize and start server
async function startServer() {
    await initializeDatabase();

    console.log("🚀 Deno Deploy server starting...");
    console.log("🔌 WebSocket endpoint: /ws");
    console.log("🏥 Health check: /health");

    return app;
}

// Initialize the server once
let appInstance: Application | null = null;

async function getApp(): Promise<Application> {
    if (!appInstance) {
        appInstance = await startServer();
    }
    return appInstance;
}

// Export handler for Deno Deploy
export default {
    async fetch(request: Request): Promise<Response> {
        // Handle WebSocket upgrades directly for Deno Deploy
        const url = new URL(request.url);
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

        // Handle regular HTTP requests through Oak
        const app = await getApp();
        try {
            const response = await app.handle(request);
            return response || new Response("Not Found", { status: 404 });
        } catch (error) {
            console.error("❌ Request handling error:", error);
            return new Response(JSON.stringify({
                error: "Internal server error",
                details: error instanceof Error ? error.message : "Unknown error"
            }), {
                status: 500,
                headers: { "Content-Type": "application/json" }
            });
        }
    },
};
