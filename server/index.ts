// Load environment variables first
import { load } from "https://deno.land/std@0.224.0/dotenv/mod.ts";

// Load the .env file
await load({ export: true });

import { Application } from "https://deno.land/x/oak@v17.1.3/mod.ts";
import { oakCors } from "https://deno.land/x/cors@v1.2.2/mod.ts";
import { config } from "./src/config/config.ts";
import { mongodb } from "./src/db/mongo.ts";
import authRouter from "./src/routes/authRouter.ts";
import apiRouter from "./src/routes/apiRouter.ts";
import gameRouter from "./src/routes/gameRouter.ts";
import wsRouter from "./src/routes/wsRouter.ts";

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
app.use(oakCors({
  origin: "*",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept", "Origin"],
}));

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
      database: mongodb.isHealthy() ? "connected" : "disconnected"
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

// WebSocket routes
app.use(wsRouter.routes());
app.use(wsRouter.allowedMethods());

// Start the server with database initialization
async function startServer() {
  await initializeDatabase();
  
  const port = config.port;
  console.log(`🚀 Server starting on port ${port}`);
  app.listen({ port });
  console.log(`✅ Server running on http://localhost:${port}`);
}

startServer().catch((error) => {
  console.error("❌ Failed to start server:", error);
  Deno.exit(1);
});