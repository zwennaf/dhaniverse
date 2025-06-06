import { Router } from "https://deno.land/x/oak@v17.1.3/mod.ts";
import { oakCors } from "https://deno.land/x/cors@v1.2.2/mod.ts";
import { config } from "../config/config.ts";
import { mongodb } from "../db/mongo.ts";
import { COLLECTIONS } from "../db/schemas.ts";

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

// Add debug middleware (removed for production)
apiRouter.use(async (_ctx, next) => {
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

// Debug endpoint to check database contents
apiRouter.get("/api/debug/collections", async (ctx) => {
  try {
    const users = mongodb.getCollection(COLLECTIONS.USERS);
    const playerStates = mongodb.getCollection(COLLECTIONS.PLAYER_STATES);
    const bankAccounts = mongodb.getCollection(COLLECTIONS.BANK_ACCOUNTS);
    
    const userCount = await users.countDocuments();
    const playerStateCount = await playerStates.countDocuments();
    const bankAccountCount = await bankAccounts.countDocuments();
    
    // Get actual user documents
    const userDocs = await users.find({}).limit(5).toArray();
    
    ctx.response.body = {
      database: "dhaniverse",
      collections: {
        users: {
          count: userCount,
          samples: userDocs.map(user => ({
            id: user._id?.toString(),
            email: user.email,
            gameUsername: user.gameUsername,
            createdAt: user.createdAt
          }))        },
        playerStates: { count: playerStateCount },
        bankAccounts: { count: bankAccountCount }
      }
    };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { 
      error: "Database query failed", 
      details: error instanceof Error ? error.message : String(error)
    };
  }
});

export default apiRouter;
