if (!Deno.env.get("NODE_ENV")) {
    Deno.env.set("NODE_ENV", "production");
}

import { Application, Router } from "oak";
import { mongodb } from "./src/db/mongo.ts";
import authRouter from "./src/routes/authRouter.ts";
import apiRouter from "./src/routes/apiRouter.ts";
import gameRouter from "./src/routes/gameRouter.ts";
import adminRouter from "./src/routes/adminRouter.ts";
import docsRouter from "./src/routes/docsRouter.ts";

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

// Custom CORS middleware: echo allowed Origin and enable credentials for dev
app.use(async (ctx, next) => {
    const envAllowed = Deno.env.get('ALLOWED_ORIGINS');
    const defaultOrigins = [
        'http://localhost:5173',
        'http://localhost:3000',
        'http://127.0.0.1:5173',
        'https://dhaniverse.in',
        'https://www.dhaniverse.in',
        'https://game.dhaniverse.in'
    ];

    // Parse env-provided origins and merge with defaults, removing duplicates
    const envList = envAllowed
        ? envAllowed.split(',').map(s => s.trim()).filter(Boolean)
        : [];

    const allowedOrigins = Array.from(
        new Set([
            ...defaultOrigins,
            ...envList,
        ])
    );

    const origin = ctx.request.headers.get('origin');
    if (origin && allowedOrigins.includes(origin)) {
        ctx.response.headers.set('Access-Control-Allow-Origin', origin);
        ctx.response.headers.set('Access-Control-Allow-Credentials', 'true');
        ctx.response.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
        ctx.response.headers.set('Access-Control-Allow-Headers', 'Content-Type,Authorization,Accept,Origin');
    }

    // Handle preflight
    if (ctx.request.method === 'OPTIONS') {
        ctx.response.status = 204;
        return;
    }

    await next();
});

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

// Root route redirect to documentation
app.use(async (ctx, next) => {
    if (ctx.request.url.pathname === "/") {
        ctx.response.redirect("/docs");
        return;
    }
    await next();
});

// Documentation routes - mount first to catch /docs requests
app.use(docsRouter.routes());
app.use(docsRouter.allowedMethods());

// Use API router for all /api routes
app.use(apiRouter.routes());
app.use(apiRouter.allowedMethods());

// Auth routes - direct mounting without /api prefix for backward compatibility
app.use(authRouter.routes());
app.use(authRouter.allowedMethods());

// Admin routes
app.use(adminRouter.routes());
app.use(adminRouter.allowedMethods());

// Game routes - mounted directly AND under /api prefix for backward compatibility
app.use(gameRouter.routes());
app.use(gameRouter.allowedMethods());

// Backward compatibility: some clients still call /api/game/... so mount prefixed
const prefixedGameRouter = new Router();
prefixedGameRouter.use("/api", gameRouter.routes(), gameRouter.allowedMethods());
app.use(prefixedGameRouter.routes());
app.use(prefixedGameRouter.allowedMethods());

// Start the server with database initialization
async function startServer() {
    await initializeDatabase();

    try {
        console.log(
            "🚀 Starting server using Deno.serve (Deno Deploy compatible)"
        );

        // Use Deno.serve with Oak app integration
        Deno.serve(async (req) => {
            const response = await app.handle(req);
            return response || new Response("Not Found", { status: 404 });
        });

        console.log("✅ Server started successfully");
    } catch (error) {
        console.error("❌ Failed to start server:", error);
        Deno.exit(1);
    }
}

startServer().catch((error) => {
    console.error("❌ Failed to start server:", error);
    Deno.exit(1);
});