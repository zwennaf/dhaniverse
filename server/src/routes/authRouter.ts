import { Router } from "https://deno.land/x/oak@v17.1.3/mod.ts";
import { create, verify } from "https://deno.land/x/djwt@v3.0.1/mod.ts";
import { config } from "../config/config.ts";

const authRouter = new Router();

// In-memory storage for now (will replace with database later)
const users: Map<string, {
  id: string;
  email: string;
  passwordHash: string;
  gameUsername: string;
  createdAt: Date;
}> = new Map();

const _sessions: Map<string, {
  userId: string;
  createdAt: Date;
}> = new Map();

// Helper function to hash passwords (basic implementation)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Helper function to create JWT token
async function createToken(userId: string): Promise<string> {
  const payload = {
    userId,
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7), // 7 days
  };
  
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(config.jwtSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
  
  return await create({ alg: "HS256", typ: "JWT" }, payload, key);
}

// Helper function to verify JWT token (exported for WebSocket authentication)
async function verifyToken(token: string): Promise<{ userId: string } | null> {
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(config.jwtSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );
    
    const payload = await verify(token, key);
    return { userId: payload.userId as string };
  } catch {
    return null;
  }
}

export { verifyToken };

// Manual CORS middleware for auth routes
authRouter.use(async (ctx, next) => {
  // Set CORS headers
  ctx.response.headers.set("Access-Control-Allow-Origin", "*");
  ctx.response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  ctx.response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept");
  ctx.response.headers.set("Access-Control-Allow-Credentials", "true");
  
  // Handle preflight requests
  if (ctx.request.method === "OPTIONS") {
    ctx.response.status = 200;
    return;
  }
  
  await next();
});

// Register endpoint
authRouter.post("/auth/register", async (ctx) => {
  console.log("🔥 REGISTER ENDPOINT HIT!");
  console.log("Method:", ctx.request.method);
  console.log("URL:", ctx.request.url.pathname);
  console.log("Headers:", Object.fromEntries(ctx.request.headers.entries()));
  
  try {
    const body = await ctx.request.body.json();
    const { email, password, gameUsername } = body;

    // Validation
    if (!email || !password || !gameUsername) {
      ctx.response.status = 400;
      ctx.response.body = { error: "Email, password, and game username are required" };
      return;
    }

    if (password.length < 6) {
      ctx.response.status = 400;
      ctx.response.body = { error: "Password must be at least 6 characters" };
      return;
    }

    if (gameUsername.length < 3) {
      ctx.response.status = 400;
      ctx.response.body = { error: "Game username must be at least 3 characters" };
      return;
    }

    // Check if user already exists
    for (const user of users.values()) {
      if (user.email === email) {
        ctx.response.status = 400;
        ctx.response.body = { error: "User with this email already exists" };
        return;
      }
      if (user.gameUsername === gameUsername) {
        ctx.response.status = 400;
        ctx.response.body = { error: "Game username is already taken" };
        return;
      }
    }

    // Create user
    const userId = crypto.randomUUID();
    const passwordHash = await hashPassword(password);
    
    users.set(userId, {
      id: userId,
      email,
      passwordHash,
      gameUsername,
      createdAt: new Date()
    });

    // Create session token
    const token = await createToken(userId);

    ctx.response.body = {
      token,
      user: {
        id: userId,
        email,
        gameUsername
      }
    };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { error: "Internal server error" };
    console.error("Registration error:", error);
  }
});

// Login endpoint
authRouter.post("/auth/login", async (ctx) => {
  try {
    const body = await ctx.request.body.json();
    const { email, password } = body;

    if (!email || !password) {
      ctx.response.status = 400;
      ctx.response.body = { error: "Email and password are required" };
      return;
    }

    // Find user
    let user = null;
    for (const u of users.values()) {
      if (u.email === email) {
        user = u;
        break;
      }
    }

    if (!user) {
      ctx.response.status = 401;
      ctx.response.body = { error: "Invalid email or password" };
      return;
    }

    // Verify password
    const passwordHash = await hashPassword(password);
    if (passwordHash !== user.passwordHash) {
      ctx.response.status = 401;
      ctx.response.body = { error: "Invalid email or password" };
      return;
    }

    // Create session token
    const token = await createToken(user.id);

    ctx.response.body = {
      token,
      user: {
        id: user.id,
        email: user.email,
        gameUsername: user.gameUsername
      }
    };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { error: "Internal server error" };
    console.error("Login error:", error);
  }
});

// Get current user endpoint
authRouter.get("/auth/me", async (ctx) => {
  try {
    const authHeader = ctx.request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      ctx.response.status = 401;
      ctx.response.body = { error: "No valid token provided" };
      return;
    }

    const token = authHeader.substring(7);
    const verified = await verifyToken(token);

    if (!verified) {
      ctx.response.status = 401;
      ctx.response.body = { error: "Invalid token" };
      return;
    }

    const user = users.get(verified.userId);
    if (!user) {
      ctx.response.status = 404;
      ctx.response.body = { error: "User not found" };
      return;
    }

    ctx.response.body = {
      user: {
        id: user.id,
        email: user.email,
        gameUsername: user.gameUsername
      }
    };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { error: "Internal server error" };
    console.error("Get user error:", error);
  }
});

// Update user profile endpoint
authRouter.put("/auth/profile", async (ctx) => {
  try {
    const authHeader = ctx.request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      ctx.response.status = 401;
      ctx.response.body = { error: "No valid token provided" };
      return;
    }

    const token = authHeader.substring(7);
    const verified = await verifyToken(token);    if (!verified) {
      ctx.response.status = 401;
      ctx.response.body = { error: "Invalid token" };
      return;
    }

    const user = users.get(verified.userId);
    if (!user) {
      ctx.response.status = 404;
      ctx.response.body = { error: "User not found" };
      return;
    }

    const body = await ctx.request.body.json();
    const { gameUsername } = body;

    if (gameUsername && gameUsername.length < 3) {
      ctx.response.status = 400;
      ctx.response.body = { error: "Game username must be at least 3 characters" };
      return;
    }

    // Check if new username is taken
    if (gameUsername && gameUsername !== user.gameUsername) {
      for (const u of users.values()) {
        if (u.gameUsername === gameUsername && u.id !== user.id) {
          ctx.response.status = 400;
          ctx.response.body = { error: "Game username is already taken" };
          return;
        }
      }
    }    // Update user
    if (gameUsername) {
      user.gameUsername = gameUsername;
    }

    ctx.response.body = {
      user: {
        id: user.id,
        email: user.email,
        gameUsername: user.gameUsername
      }
    };
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { error: "Internal server error" };
    console.error("Update profile error:", error);
  }
});

// Google OAuth endpoints
authRouter.get("/auth/google", async (ctx) => {
  ctx.response.body = {
    message: "Google OAuth endpoint. Use POST with googleToken to authenticate.",
    method: "POST",
    requiredFields: ["googleToken"]
  };
});

authRouter.post("/auth/google", async (ctx) => {
  try {
    const body = await ctx.request.body.json();
    const { googleToken } = body;

    // Verify Google token
    const googleUserInfo = await verifyGoogleToken(googleToken);
    
    if (!googleUserInfo) {
      ctx.response.status = 400;
      ctx.response.body = { error: "Invalid Google token" };
      return;
    }

    const { email, sub: googleId } = googleUserInfo;

    // Check if user exists by email
    let user = Array.from(users.values()).find(u => u.email === email);

    if (user) {
      // User exists, sign them in
      const token = await createToken(user.id);
      ctx.response.body = {
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          gameUsername: user.gameUsername
        },
        isNewUser: false
      };
    } else {
      // Auto-create new user with Google - no username required initially
      const userId = crypto.randomUUID();
      const newUser = {
        id: userId,
        email: email,
        passwordHash: '', // No password for Google users
        gameUsername: '', // Empty initially - user will set it in profile
        createdAt: new Date(),
        googleId: googleId
      };

      users.set(userId, newUser);

      const token = await createToken(userId);
      ctx.response.status = 201;
      ctx.response.body = {
        success: true,
        token,
        user: {
          id: newUser.id,
          email: newUser.email,
          gameUsername: newUser.gameUsername
        },
        isNewUser: true
      };
    }
  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { error: "Internal server error" };
    console.error("Google auth error:", error);
  }
});

// Helper function to verify Google token
async function verifyGoogleToken(token: string): Promise<{ email: string; sub: string } | null> {
  try {
    // For Google ID tokens (JWT), we should use the tokeninfo endpoint for id_token
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
    if (!response.ok) {
      console.log("Google token verification failed:", response.status, response.statusText);
      return null;
    }
    const data = await response.json();
    
    // Validate the token has required fields
    if (data.email && data.sub) {
      return { email: data.email, sub: data.sub };
    }
    
    return null;
  } catch (error) {
    console.error("Google token verification error:", error);
    return null;
  }
}

export default authRouter;
