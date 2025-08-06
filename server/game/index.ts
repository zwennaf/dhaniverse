// Load environment variables first
import { load } from "std/dotenv/mod.ts";

// Load the .env file with more flexible options
await load({
    export: true,
    allowEmptyValues: true,
});

// Set default NODE_ENV if not provided
if (!Deno.env.get("NODE_ENV")) {
    Deno.env.set("NODE_ENV", Deno.env.get("DENO_ENV") || "development");
}

import { Application } from "oak";
import { oakCors } from "cors";
import { mongodb } from "./src/db/mongo.ts";
import authRouter from "./src/routes/authRouter.ts";
import apiRouter from "./src/routes/apiRouter.ts";
import gameRouter from "./src/routes/gameRouter.ts";

// Initialize database connection
async function initializeDatabase() {
    try {
        console.log("🔄 Initializing database connection...");
        await mongodb.connect();

        // Verify connection is working
        if (!mongodb.isHealthy()) {
            throw new Error(
                "Database connection is not healthy after connect()"
            );
        }

        console.log("✅ Database connection verified and ready");
    } catch (error) {
        console.error("❌ Failed to initialize database:", error);
        console.error(
            "❌ Error details:",
            error instanceof Error ? error.message : String(error)
        );

        // Always exit if database connection fails - this is critical
        console.error("❌ Database connection is required. Exiting...");
        Deno.exit(1);
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

// Start the server with database initialization
async function startServer() {
    await initializeDatabase();

    try {
        // Try Deno.serve first (works on Deno Deploy), fallback to Oak's listen
        console.log("🚀 Attempting to start server...");

        // Check if we're in a Deno Deploy environment (including DeployEA)
        const isDeployEnvironment =
            Deno.env.get("DENO_DEPLOYMENT_ID") ||
            Deno.env.get("DENO_REGION") ||
            globalThis.Deno?.serve;

        if (isDeployEnvironment) {
            console.log(
                "🚀 Starting server for Deno Deploy/DeployEA environment"
            );

            // Use Deno.serve for Deploy/DeployEA - no port needed, platform handles it
            Deno.serve(async (req) => {
                try {
                    const response = await app.handle(req);
                    return (
                        response || new Response("Not Found", { status: 404 })
                    );
                } catch (handleError) {
                    console.error("Error handling request:", handleError);
                    return new Response("Internal Server Error", {
                        status: 500,
                    });
                }
            });
            console.log("✅ Server started using Deno.serve (Deploy/DeployEA)");
        } else {
            console.log("🚀 Starting server for local development");

            // Local development - use Oak's listen with specified port
            const port = parseInt(Deno.env.get("PORT") || "8000");
            console.log(`🚀 Starting server on port ${port}`);

            await app.listen({ port });
            console.log(`✅ Server running on http://localhost:${port}`);
        }
    } catch (error) {
        console.error("❌ Failed to start server:", error);
        Deno.exit(1);
    }
}

startServer().catch((error) => {
    console.error("❌ Failed to start server:", error);
    Deno.exit(1);
});
