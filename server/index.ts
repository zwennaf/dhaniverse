import { Application } from "https://deno.land/x/oak@v17.1.3/mod.ts";
import { oakCors } from "https://deno.land/x/cors@v1.2.2/mod.ts";
import { config } from "./src/config/config.ts";
import authRouter from "./src/routes/authRouter.ts";
import apiRouter from "./src/routes/apiRouter.ts";
import wsRouter from "./src/routes/wsRouter.ts";

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

// Debug logging middleware
app.use(async (ctx, next) => {
  console.log(`${new Date().toISOString()} - ${ctx.request.method} ${ctx.request.url.pathname}`);
  console.log("Origin:", ctx.request.headers.get("origin"));
  await next();
});

// Health check endpoint
app.use(async (ctx, next) => {
  if (ctx.request.url.pathname === "/health") {
    ctx.response.body = { status: "ok", timestamp: new Date().toISOString() };
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

// WebSocket routes
app.use(wsRouter.routes());
app.use(wsRouter.allowedMethods());

// Start the server
const port = config.port;
console.log(`🚀 Server starting on port ${port}`);
console.log(`🔌 WebSocket available on /ws route`);

app.listen({ port });

// Note: Socket.IO server on separate port is no longer needed
// All WebSocket connections now go through /ws route on main server