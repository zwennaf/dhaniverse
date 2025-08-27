import { Router, Context } from "oak";
import { ObjectId } from "mongodb";
import { mongodb } from "../db/mongo.ts";
import { createToken, verifyToken } from "../auth/jwt.ts";
import type { UserDocument } from "../db/schemas.ts";
import { EmailService } from "../services/EmailService.ts";
import { OTPService } from "../services/OTPService.ts";
import { MagicLinkService } from "../services/MagicLinkService.ts";

const authRouter = new Router();

// Initialize services
const emailService = new EmailService();
const _otpService = new OTPService(mongodb);
const magicLinkService = new MagicLinkService();

// Rate limiting helper
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(identifier: string, maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000): boolean {
    const now = Date.now();
    const record = rateLimitMap.get(identifier);
    
    if (!record || now > record.resetTime) {
        rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
        return true;
    }
    
    if (record.count >= maxAttempts) {
        return false;
    }
    
    record.count++;
    return true;
}

// Database connection middleware
authRouter.use(async (ctx: Context, next: () => Promise<unknown>) => {
    // Check database connection for all requests
    if (!mongodb.isHealthy()) {
        console.error(
            "❌ Database not connected when processing request:",
            ctx.request.url.pathname
        );
        ctx.response.status = 503;
        ctx.response.body = {
            error: "Database service unavailable",
            message:
                "The database connection is not available. Please try again later.",
        };
        return;
    }

    await next();
});

// Manual CORS middleware for auth routes
authRouter.use(async (ctx: Context, next: () => Promise<unknown>) => {
    // Set CORS headers
    ctx.response.headers.set("Access-Control-Allow-Origin", "*");
    ctx.response.headers.set(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS"
    );
    ctx.response.headers.set(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, Accept"
    );
    ctx.response.headers.set("Access-Control-Allow-Credentials", "true");

    // Handle preflight requests
    if (ctx.request.method === "OPTIONS") {
        ctx.response.status = 200;
        return;
    }

    await next();
});

// Send Magic Link for passwordless authentication
authRouter.post("/auth/send-magic-link", async (ctx: Context) => {
    try {
        // Check database connection first
        if (!mongodb.isHealthy()) {
            ctx.response.status = 503;
            ctx.response.body = { error: "Database service unavailable" };
            return;
        }

        const body = await ctx.request.body.json();
        const { email, gameUsername, selectedCharacter } = body;

        // Validation
        if (!email) {
            ctx.response.status = 400;
            ctx.response.body = {
                error: "Email is required",
            };
            return;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            ctx.response.status = 400;
            ctx.response.body = {
                error: "Please enter a valid email address",
            };
            return;
        }

        // Rate limiting
        if (!checkRateLimit(`magic:${email}`, 3, 5 * 60 * 1000)) {
            ctx.response.status = 429;
            ctx.response.body = {
                error: "Too many magic link requests. Please wait 5 minutes.",
            };
            return;
        }

        // Send magic link
        const result = await magicLinkService.sendMagicLink({
            email: email.toLowerCase(),
            gameUsername,
            selectedCharacter
        });

        ctx.response.status = result.success ? 200 : 400;
        ctx.response.body = {
            success: result.success,
            message: result.message,
            ...(result.expiresAt && { expiresAt: result.expiresAt.toISOString() })
        };

    } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { error: "Internal server error" };
        console.error("Send magic link error:", error);
    }
});

// Verify Magic Link
authRouter.get("/auth/verify-magic-link", async (ctx: Context) => {
    try {
        // Check database connection first
        if (!mongodb.isHealthy()) {
            ctx.response.status = 503;
            ctx.response.body = { error: "Database service unavailable" };
            return;
        }

        const url = new URL(ctx.request.url);
        const token = url.searchParams.get("token");

        if (!token) {
            ctx.response.status = 400;
            ctx.response.body = {
                error: "Magic link token is required",
            };
            return;
        }

        // Verify magic link
        const result = await magicLinkService.verifyMagicLink(token);

        if (result.success) {
            ctx.response.status = 200;
            ctx.response.body = {
                success: true,
                message: result.message,
                token: result.authToken,
                user: result.user,
                isNewUser: result.isNewUser
            };
        } else {
            ctx.response.status = 400;
            ctx.response.body = {
                error: result.message
            };
        }

    } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { error: "Internal server error" };
        console.error("Verify magic link error:", error);
    }
});

// Get current user endpoint
authRouter.get("/auth/me", async (ctx: Context) => {
    try {
        const authHeader = ctx.request.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            ctx.response.status = 401;
            ctx.response.body = { error: "No valid token provided" };
            return;
        }

        const token = authHeader.substring(7);
        const verified = await verifyToken(token);

        if (!verified || !verified.userId || typeof verified.userId !== 'string') {
            ctx.response.status = 401;
            ctx.response.body = { error: "Invalid token" };
            return;
        }

        // Find user by ID in MongoDB
        const users = mongodb.getCollection<UserDocument>("users");
        const userDoc = await users.findOne({
            _id: new ObjectId(verified.userId),
        });
        if (!userDoc) {
            ctx.response.status = 404;
            ctx.response.body = { error: "User not found" };
            return;
        }

        ctx.response.body = {
            user: {
                id: userDoc._id?.toString() || "",
                email: userDoc.email,
                gameUsername: userDoc.gameUsername,
                selectedCharacter: userDoc.selectedCharacter || "C4", // Default to C4
            },
        };
    } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { error: "Internal server error" };
        console.error("Get user error:", error);
    }
});

// Token validation endpoint for WebSocket server
authRouter.post("/auth/validate-token", async (ctx: Context) => {
    try {
        const body = await ctx.request.body.json();
        const { token } = body;

        if (!token) {
            ctx.response.status = 400;
            ctx.response.body = { error: "Token is required" };
            return;
        }

        const verified = await verifyToken(token);

        if (!verified || !verified.userId || typeof verified.userId !== 'string') {
            ctx.response.status = 401;
            ctx.response.body = {
                valid: false,
                error: "Invalid token",
            };
            return;
        }

        // Find user by ID in MongoDB
        const users = mongodb.getCollection<UserDocument>("users");
        const userDoc = await users.findOne({
            _id: new ObjectId(verified.userId),
        });

        if (!userDoc) {
            ctx.response.status = 404;
            ctx.response.body = {
                valid: false,
                error: "User not found",
            };
            return;
        }

        ctx.response.body = {
            valid: true,
            userId: userDoc._id?.toString() || "",
            email: userDoc.email,
            gameUsername: userDoc.gameUsername,
        };
    } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = {
            valid: false,
            error: "Internal server error",
        };
        console.error("Token validation error:", error);
    }
});

// Update user profile endpoint
authRouter.put("/auth/profile", async (ctx: Context) => {
    try {
        const authHeader = ctx.request.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            ctx.response.status = 401;
            ctx.response.body = { error: "No valid token provided" };
            return;
        }

        const token = authHeader.substring(7);
        const verified = await verifyToken(token);

        if (!verified || !verified.userId || typeof verified.userId !== 'string') {
            ctx.response.status = 401;
            ctx.response.body = { error: "Invalid token" };
            return;
        }

        const users = mongodb.getCollection<UserDocument>("users");
        const userDoc = await users.findOne({
            _id: new ObjectId(verified.userId),
        });
        if (!userDoc) {
            ctx.response.status = 404;
            ctx.response.body = { error: "User not found" };
            return;
        }

        const body = await ctx.request.body.json();
        const { gameUsername, selectedCharacter } = body;

        if (gameUsername && gameUsername.length < 3) {
            ctx.response.status = 400;
            ctx.response.body = {
                error: "Game username must be at least 3 characters",
            };
            return;
        }

        // Check if new username is taken
        if (gameUsername && gameUsername !== userDoc.gameUsername) {
            const existingUser = await mongodb.findUserByGameUsername(
                gameUsername
            );
            if (existingUser && existingUser.id !== verified.userId) {
                ctx.response.status = 400;
                ctx.response.body = { error: "Game username is already taken" };
                return;
            }
        }

        // Validate selectedCharacter if provided
        if (selectedCharacter && !['C1', 'C2', 'C3', 'C4'].includes(selectedCharacter)) {
            ctx.response.status = 400;
            ctx.response.body = {
                error: "Invalid character selection. Must be C1, C2, C3, or C4",
            };
            return;
        }

        // Update user
    const updateFields: (Partial<Pick<UserDocument, 'gameUsername' | 'selectedCharacter'>> & { lastUpdated: Date }) = { lastUpdated: new Date() };
        if (gameUsername) {
            updateFields.gameUsername = gameUsername;
        }
        if (selectedCharacter) {
            updateFields.selectedCharacter = selectedCharacter;
        }

        if (Object.keys(updateFields).length > 1) { // More than just lastUpdated
            const usersCollection = mongodb.getCollection<UserDocument>("users");
            await usersCollection.updateOne(
                { _id: new ObjectId(verified.userId) },
                { $set: updateFields }
            );
        }

        // Get updated user
        const usersCollection = mongodb.getCollection<UserDocument>("users");
        const updatedUser = await usersCollection.findOne({
            _id: new ObjectId(verified.userId),
        });

        ctx.response.body = {
            user: {
                id: updatedUser?._id?.toString() || "",
                email: updatedUser?.email || "",
                gameUsername: updatedUser?.gameUsername || "",
                selectedCharacter: updatedUser?.selectedCharacter || "C4", // Default to C4
            },
        };
    } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { error: "Internal server error" };
        console.error("Update profile error:", error);
    }
});

// Google OAuth endpoints
authRouter.get("/auth/google", (ctx: Context) => {
    ctx.response.body = {
        message:
            "Google OAuth endpoint. Use POST with googleToken to authenticate.",
        method: "POST",
        requiredFields: ["googleToken"],
    };
});

authRouter.post("/auth/google", async (ctx: Context) => {
    try {
        const body = await ctx.request.body.json();
        const { googleToken, gameUsername } = body;

        // Verify Google token
        const googleUserInfo = await verifyGoogleToken(googleToken);

        if (!googleUserInfo) {
            ctx.response.status = 400;
            ctx.response.body = { error: "Invalid Google token" };
            return;
        }

        const { email, sub: googleId } = googleUserInfo;

        // Collections
        const usersCol = mongodb.getCollection<UserDocument>("users");

        // 1) Prefer existing link by googleId
    let user = await mongodb.findUserByGoogleId(googleId);

        // 2) Otherwise find by email
        if (!user) {
            user = await mongodb.findUserByEmail(email);
            // If found by email but no googleId, link it for future
            if (user && !user.googleId) {
                await usersCol.updateOne(
                    { _id: new ObjectId(user.id) },
                    { $set: { googleId, lastLoginAt: new Date() } }
                );
            }
        }

        // 3) If still not found, but client sent an Authorization token, try to link
        if (!user) {
            const authHeader = ctx.request.headers.get("Authorization");
            if (authHeader?.startsWith("Bearer ")) {
                const existingToken = authHeader.substring(7);
                const verified = await verifyToken(existingToken);
                if (verified && typeof verified.userId === "string") {
                    const existingDoc = await usersCol.findOne({ _id: new ObjectId(verified.userId) });
                    if (existingDoc) {
                        // Link only if emails match to avoid account takeover
                        if (existingDoc.email?.toLowerCase() === email.toLowerCase()) {
                            await usersCol.updateOne(
                                { _id: existingDoc._id! },
                                { $set: { googleId, lastLoginAt: new Date() } }
                            );
                            user = {
                                id: existingDoc._id!.toString(),
                                email: existingDoc.email,
                                passwordHash: existingDoc.passwordHash,
                                gameUsername: existingDoc.gameUsername,
                                selectedCharacter: existingDoc.selectedCharacter,
                                createdAt: existingDoc.createdAt,
                                googleId: googleId,
                            };
                        }
                    }
                }
            }
        }

        if (user) {
            // User exists, sign them in (preserves balances and profile)
            const token = await createToken(user.id);
            ctx.response.body = {
                success: true,
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    gameUsername: user.gameUsername,
                    selectedCharacter: user.selectedCharacter || "C4",
                },
                isNewUser: false,
            };
            return;
        }

        // 4) Create a new user (first Google sign-in on this email)
        // Allow optional initial gameUsername if provided and available
        let initialUsername = "";
        if (typeof gameUsername === "string" && gameUsername.trim().length >= 3) {
            const exists = await mongodb.findUserByGameUsername(gameUsername.trim());
            if (!exists) initialUsername = gameUsername.trim();
        }

        const newUser = await mongodb.createUser({
            email: email,
            passwordHash: "", // No password for Google users
            gameUsername: initialUsername, // Empty or provided if unique
            createdAt: new Date(),
            googleId: googleId,
        });

        const token = await createToken(newUser.id);
        ctx.response.status = 201;
        ctx.response.body = {
            success: true,
            token,
            user: {
                id: newUser.id,
                email: newUser.email,
                gameUsername: newUser.gameUsername,
                selectedCharacter: "C4", // Default for new users
            },
            isNewUser: true,
        };
    } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { error: "Internal server error" };
        console.error("Google auth error:", error);
    }
});

// Internet Identity authentication
authRouter.post("/auth/internet-identity", async (ctx: Context) => {
    try {
        const body = await ctx.request.body.json();
        const { principal } = body;

        console.log('Internet Identity authentication attempt:', { principal: principal ? 'provided' : 'missing' });

        if (!principal || typeof principal !== "string") {
            ctx.response.status = 400;
            ctx.response.body = { error: "Principal is required" };
            return;
        }

        // Collections
        const usersCol = mongodb.getCollection<UserDocument>("users");

        // Check if user exists by Internet Identity principal
        const user = await usersCol.findOne({ internetIdentityPrincipal: principal });

        if (user) {
            // Existing user - sign them in
            console.log('Internet Identity: Existing user found, signing in');
            await usersCol.updateOne(
                { _id: user._id },
                { $set: { lastLoginAt: new Date() } }
            );

            const token = await createToken(user._id!.toString());
            ctx.response.body = {
                success: true,
                token,
                user: {
                    id: user._id!.toString(),
                    email: user.email || "",
                    gameUsername: user.gameUsername,
                    selectedCharacter: user.selectedCharacter || "C4",
                },
                isNewUser: false,
            };
            return;
        }

        // New user - create account with Internet Identity principal
        const newUserDoc: Partial<UserDocument> = {
            email: "", // Internet Identity doesn't provide email
            passwordHash: "", // No password for Internet Identity users
            gameUsername: "", // User will set this in profile
            internetIdentityPrincipal: principal,
            selectedCharacter: "C2", // Default character
            createdAt: new Date(),
            lastLoginAt: new Date(),
            isActive: true,
            gameData: {
                level: 1,
                experience: 0,
                achievements: [],
                preferences: {
                    soundEnabled: true,
                    musicEnabled: true,
                    language: "en"
                }
            }
        };

        const result = await usersCol.insertOne(newUserDoc as UserDocument);
        console.log('Internet Identity: New user created with ID:', result.insertedId.toString());
        
        const newUser = {
            id: result.insertedId.toString(),
            email: "",
            gameUsername: "",
            selectedCharacter: "C2",
        };

        const token = await createToken(newUser.id);
        ctx.response.status = 201;
        ctx.response.body = {
            success: true,
            token,
            user: newUser,
            isNewUser: true,
        };
    } catch (_error) {
        ctx.response.status = 500;
        ctx.response.body = { error: "Internal server error" };
        console.error("Internet Identity auth error:", _error);
    }
});

// Helper function to verify Google token
async function verifyGoogleToken(
    token: string
): Promise<{ email: string; sub: string } | null> {
    try {
        // For Google ID tokens (JWT), we should use the tokeninfo endpoint for id_token
        const response = await fetch(
            `https://oauth2.googleapis.com/tokeninfo?id_token=${token}`
        );
        if (!response.ok) {
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

// ==========================================
// GOOGLE OAUTH ROUTES
// ==========================================

// Health check for authentication services
authRouter.get("/auth/health", async (ctx: Context) => {
    try {
        const isEmailHealthy = await emailService.testConnection();
        const magicLinkStats = await magicLinkService.getMagicLinkStats();

        ctx.response.status = 200;
        ctx.response.body = {
            success: true,
            emailService: isEmailHealthy ? 'healthy' : 'unhealthy',
            magicLinkStats,
            authMethods: ['google', 'magic_link', 'internet_identity']
        };
    } catch (_error) {
        ctx.response.status = 500;
        ctx.response.body = {
            success: false,
            message: "Health check failed"
        };
    }
});

// Cleanup expired magic links (call this periodically)
authRouter.post("/auth/cleanup-magic-links", async (ctx: Context) => {
    try {
        const cleaned = await magicLinkService.cleanupExpiredLinks();
        ctx.response.status = 200;
        ctx.response.body = {
            success: true,
            message: `Cleaned up ${cleaned} expired magic links`
        };
    } catch (_error) {
        ctx.response.status = 500;
        ctx.response.body = {
            success: false,
            message: "Cleanup failed"
        };
    }
});

// Debug endpoint for testing email configuration in production
authRouter.get("/auth/debug-email", async (ctx: Context) => {
    try {
        console.log("🔍 Email Debug Endpoint Called");
        
        // Test SMTP connection
        const connectionTest = await emailService.testConnection();
        
        const debugInfo = {
            timestamp: new Date().toISOString(),
            environment: {
                EMAIL_PROVIDER: Deno.env.get("EMAIL_PROVIDER") || "zoho (default)",
                SMTP_HOST: Deno.env.get("SMTP_HOST") || "smtp.zoho.com (default)",
                SMTP_PORT: Deno.env.get("SMTP_PORT") || "587 (default)",
                SMTP_SECURE: Deno.env.get("SMTP_SECURE") || "false (default)",
                SMTP_USER_SET: Deno.env.get("SMTP_USER") ? true : false,
                SMTP_PASS_SET: Deno.env.get("SMTP_PASS") ? true : false,
                SMTP_FROM_EMAIL: Deno.env.get("SMTP_FROM_EMAIL") || "no-reply@dhaniverse.in (default)"
            },
            connection: {
                success: connectionTest,
                message: connectionTest ? "SMTP connection successful" : "SMTP connection failed"
            }
        };

        ctx.response.status = 200;
        ctx.response.body = {
            success: true,
            debug: debugInfo
        };
    } catch (error) {
        console.error("Debug endpoint error:", error);
        ctx.response.status = 500;
        ctx.response.body = {
            success: false,
            error: (error as Error)?.message || "Unknown error",
            message: "Debug endpoint failed"
        };
    }
});

export default authRouter;
