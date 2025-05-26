import { Router } from "https://deno.land/x/oak@v17.1.3/mod.ts";
import { oakCors } from "https://deno.land/x/cors@v1.2.2/mod.ts";
import { config } from "../config/config.ts";

const apiRouter = new Router();

// Add CORS middleware with more permissive settings for development
apiRouter.use(oakCors({
  origin: (origin) => {
    // Allow any localhost origin for development
    if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return origin || "*";
    }
    return config.corsOrigins.includes(origin) ? origin : false;
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept"],
}));

// Add debug middleware to log all requests
apiRouter.use(async (ctx, next) => {
  console.log(`🚀 ${ctx.request.method} ${ctx.request.url.pathname}`);
  console.log("Origin:", ctx.request.headers.get("origin"));
  console.log("Content-Type:", ctx.request.headers.get("content-type"));
  await next();
});

// Health check endpoint
apiRouter.get("/api/health", (ctx) => {
  ctx.response.body = { status: "ok", timestamp: new Date().toISOString() };
});

// Game-related endpoints can be added here in the future
apiRouter.get("/api/game/status", (ctx) => {
  ctx.response.body = { status: "Game server running", players: 0 };
});

export default apiRouter;
