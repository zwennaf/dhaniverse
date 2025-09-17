import { Router, Context } from "oak";
import { config } from "../config/config.ts";
import { ObjectId } from "mongodb";
import { mongodb } from "../db/mongo.ts";
import { 
  createToken, 
  verifyToken, 
  setCrossDomainAuthCookie,
  clearCrossDomainAuthCookie,
  getCrossDomainAuthToken
} from "../auth/jwt.ts";
import type { UserDocument, IpLogDocument } from "../db/schemas.ts";
import { EmailService } from "../services/EmailService.ts";
import { OTPService } from "../services/OTPService.ts";
import { MagicLinkService } from "../services/MagicLinkService.ts";
import { COLLECTIONS, BanRuleDocument } from "../db/schemas.ts";

const authRouter = new Router();

// Initialize services
const emailService = new EmailService();
const _otpService = new OTPService(mongodb);
const magicLinkService = new MagicLinkService();

async function getBanDetails(email?: string): Promise<BanRuleDocument | null> {
    if (!email) return null;
    const bans = mongodb.getCollection<BanRuleDocument>(COLLECTIONS.BANS);
    const now = new Date();
    // expire old bans first
    await bans.updateMany({ active: true, expiresAt: { $lte: now } }, { $set: { active: false } });
    const match = await bans.findOne({ active: true, type: 'email', value: email.toLowerCase() });
    return match;
}

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
    // Read allowed origins from environment (comma-separated)
    const raw = Deno.env.get("ALLOWED_ORIGINS") || "";
    const envAllowed = raw.split(",").map((s: string) => (s || "").trim()).filter(Boolean);

    // Default allowed origins (include production game domain)
    const defaultOrigins = [
        'http://localhost:5173',
        'http://localhost:3000',
        'http://127.0.0.1:5173',
        'https://dhaniverse.in',
        'https://www.dhaniverse.in',
        'https://game.dhaniverse.in'
    ];

    const allowed = Array.from(new Set([...defaultOrigins, ...envAllowed]));

    // Get request origin
    const origin = ctx.request.headers.get("origin") || ctx.request.headers.get("Origin");

    // If origin is allowed, echo it back. Otherwise, do not set Access-Control-Allow-Origin.
    if (origin && allowed.includes(origin)) {
        ctx.response.headers.set("Access-Control-Allow-Origin", origin);
    } else if (origin && !allowed.includes(origin)) {
        // Origin not allowed - for preflight, return 403; for other requests, proceed without CORS header
        if (ctx.request.method === "OPTIONS") {
            ctx.response.status = 403;
            ctx.response.body = { error: "CORS origin not allowed" };
            return;
        }
    } else if (!origin) {
        // No Origin header (e.g., server-to-server) -> allow
        ctx.response.headers.set("Access-Control-Allow-Origin", "*");
    }

    ctx.response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    ctx.response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept");
    ctx.response.headers.set("Access-Control-Allow-Credentials", "true");

    // Handle preflight
    if (ctx.request.method === "OPTIONS") {
        ctx.response.status = ctx.response.status || 200;
        return;
    }

    await next();
});

// IP logging middleware
authRouter.use(async (ctx: Context, next: () => Promise<unknown>) => {
    try {
        // Get client IP address using proper priority (based on PHP pattern)
        let clientIp = "unknown";
        
        // Check for client IP from shared internet (highest priority)
        const clientIpHeader = ctx.request.headers.get("http-client-ip");
        if (clientIpHeader && clientIpHeader.trim() !== "") {
            clientIp = clientIpHeader.trim();
        }
        // Check for IP from proxy (second priority)
        else {
            const forwardedFor = ctx.request.headers.get("x-forwarded-for");
            if (forwardedFor && forwardedFor.trim() !== "") {
                // Take the first IP in the chain (original client)
                clientIp = forwardedFor.split(',')[0].trim();
            }
            // Check other common proxy headers
            else {
                const realIp = ctx.request.headers.get("x-real-ip");
                const cfConnectingIp = ctx.request.headers.get("cf-connecting-ip"); // Cloudflare
                const azureClientIp = ctx.request.headers.get("x-azure-clientip"); // Azure
                
                if (cfConnectingIp && cfConnectingIp.trim() !== "") {
                    clientIp = cfConnectingIp.trim();
                } else if (azureClientIp && azureClientIp.trim() !== "") {
                    clientIp = azureClientIp.trim();
                } else if (realIp && realIp.trim() !== "") {
                    clientIp = realIp.trim();
                } else {
                    // Fallback to remote address (lowest priority)
                    const fallbackIp = ctx.request.ip;
                    if (fallbackIp && fallbackIp !== "unknown") {
                        clientIp = fallbackIp;
                    } else {
                        // For localhost development, set a recognizable IP
                        clientIp = "127.0.0.1";
                    }
                }
            }
        }
        
        // Clean up IP address (remove port if present)
        if (clientIp !== "unknown" && clientIp.includes(':')) {
            // Handle IPv6 format and port removal
            if (clientIp.startsWith('[') && clientIp.includes(']:')) {
                clientIp = clientIp.substring(1, clientIp.indexOf(']:'));
            } else if (!clientIp.includes('::')) {
                // IPv4 with port
                clientIp = clientIp.split(':')[0];
            }
        }
        
        console.log(`[IP Detection] All headers:`, Object.fromEntries(ctx.request.headers.entries()));
        console.log(`[IP Detection] Client IP: ${clientIp} (from headers: x-forwarded-for: ${ctx.request.headers.get("x-forwarded-for")}, x-real-ip: ${ctx.request.headers.get("x-real-ip")}, cf-connecting-ip: ${ctx.request.headers.get("cf-connecting-ip")})`);
        
        // Store IP in state for later use
        (ctx.state as { clientIp?: string }).clientIp = clientIp;
        
        await next();
        
        // Log IP after successful authentication if user info is available
        if (ctx.response.status >= 200 && ctx.response.status < 300) {
            // We'll log IP in individual route handlers where we have user context
        }
    } catch (error) {
        console.error("IP logging middleware error:", error);
        await next();
    }
});

// Helper function to log IP access
async function logIpAccess({ userId, email, ip }: { userId?: string; email?: string; ip?: string }) {
    console.log(`[IP Logging] Attempting to log: userId=${userId}, email=${email}, ip=${ip}`);
    
    if (!ip || ip === "unknown") {
        console.log(`[IP Logging] Skipping - invalid IP: ${ip}`);
        return;
    }
    
    try {
        const ipLogs = mongodb.getCollection<IpLogDocument>("ipLogs");
        const existing = await ipLogs.findOne({ ip, userId });
        
        if (existing) {
            console.log(`[IP Logging] Updating existing record for IP: ${ip}`);
            await ipLogs.updateOne(
                { _id: existing._id },
                { 
                    $set: { lastSeen: new Date() },
                    $inc: { count: 1 }
                }
            );
        } else {
            console.log(`[IP Logging] Creating new record for IP: ${ip}`);
            await ipLogs.insertOne({
                userId,
                email,
                ip,
                firstSeen: new Date(),
                lastSeen: new Date(),
                count: 1
            } as IpLogDocument);
        }
        console.log(`[IP Logging] Successfully logged IP: ${ip}`);
    } catch (error) {
        console.error("Failed to log IP access:", error);
    }
}

// Test endpoint for IP detection (remove in production)
authRouter.get("/auth/test-ip", (ctx: Context) => {
    const clientIp = (ctx.state as { clientIp?: string }).clientIp;
    
    ctx.response.status = 200;
    ctx.response.body = {
        detectedIp: clientIp,
        headers: {
            "x-forwarded-for": ctx.request.headers.get("x-forwarded-for"),
            "x-real-ip": ctx.request.headers.get("x-real-ip"),
            "cf-connecting-ip": ctx.request.headers.get("cf-connecting-ip"),
            "x-azure-clientip": ctx.request.headers.get("x-azure-clientip"),
            "http-client-ip": ctx.request.headers.get("http-client-ip"),
        },
        oakRequestIp: ctx.request.ip,
        allHeaders: Object.fromEntries(ctx.request.headers.entries())
    };
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
            // Ban check before returning token
            const banDetails = await getBanDetails(result.user?.email);
            if (banDetails) {
                ctx.response.status = 403;
                ctx.response.body = { 
                    error: "Account banned",
                    banned: true,
                    banInfo: {
                        reason: banDetails.reason || "Account banned",
                        banType: banDetails.type,
                        expiresAt: banDetails.expiresAt?.toISOString()
                    }
                };
                return;
            }
            
            // Log IP access for successful magic link verification
            const clientIp = (ctx.state as { clientIp?: string }).clientIp;
            await logIpAccess({
                userId: result.user?.id,
                email: result.user?.email,
                ip: clientIp
            });
            
            ctx.response.status = 200;
            // Try to set cross-domain auth cookie
            try {
                if (result.authToken) {
                    setCrossDomainAuthCookie(ctx, result.authToken);
                    
                    // Also set legacy session cookie for backward compatibility
                    const domain = Deno.env.get('SERVER_DOMAIN') || (config.isDev ? 'localhost' : '.dhaniverse.in');
                    const secureFlag = config.isDev ? '' : '; Secure; SameSite=None';
                    const cookie = `session=${encodeURIComponent(result.authToken)}; Path=/; HttpOnly; Domain=${String(domain)}; Max-Age=${7 * 24 * 60 * 60}${secureFlag}`;
                    ctx.response.headers.append('Set-Cookie', cookie);
                }
            } catch (err) {
                console.warn('Failed to set session cookie on magic-link verify:', err);
            }

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

        // Check if user is banned before returning user data
        const banDetails = await getBanDetails(userDoc.email);
        if (banDetails) {
            ctx.response.status = 403;
            ctx.response.body = { 
                error: "Account banned",
                banned: true,
                banInfo: {
                    reason: banDetails.reason || "Account banned",
                    banType: banDetails.type,
                    expiresAt: banDetails.expiresAt?.toISOString()
                }
            };
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

// Session endpoint for cross-subdomain check (returns user if session cookie present)
authRouter.get("/session", async (ctx: Context) => {
    try {
        const token = getCrossDomainAuthToken(ctx);
        
        if (token) {
            const verified = await verifyToken(token);
            if (verified && verified.userId) {
                const users = mongodb.getCollection<UserDocument>("users");
                const userDoc = await users.findOne({ _id: new ObjectId(verified.userId) });
                if (userDoc) {
                    ctx.response.body = { 
                        success: true,
                        user: { 
                            id: userDoc._id?.toString() || "", 
                            email: userDoc.email, 
                            gameUsername: userDoc.gameUsername, 
                            selectedCharacter: userDoc.selectedCharacter || "C4",
                            provider: verified.provider || 'magic-link',
                            createdAt: userDoc.createdAt?.toISOString() || new Date().toISOString(),
                            lastLoginAt: userDoc.lastLoginAt?.toISOString() || new Date().toISOString()
                        } 
                    };
                    return;
                }
            }
        }

        // No valid session
        ctx.response.status = 401;
        ctx.response.body = { success: false, error: "Not authenticated" };
    } catch (err) {
        ctx.response.status = 500;
        ctx.response.body = { success: false, error: "Internal server error" };
        console.error("Session endpoint error:", err);
    }
});

// Updated auth/session endpoint (standardized path)
authRouter.get("/auth/session", async (ctx: Context) => {
    try {
        const token = getCrossDomainAuthToken(ctx);
        
        if (token) {
            const verified = await verifyToken(token);
            if (verified && verified.userId) {
                const users = mongodb.getCollection<UserDocument>("users");
                const userDoc = await users.findOne({ _id: new ObjectId(verified.userId) });
                if (userDoc) {
                    ctx.response.body = { 
                        success: true,
                        user: { 
                            id: userDoc._id?.toString() || "", 
                            email: userDoc.email, 
                            gameUsername: userDoc.gameUsername, 
                            selectedCharacter: userDoc.selectedCharacter || "C4",
                            provider: verified.provider || 'magic-link',
                            createdAt: userDoc.createdAt?.toISOString() || new Date().toISOString(),
                            lastLoginAt: userDoc.lastLoginAt?.toISOString() || new Date().toISOString()
                        } 
                    };
                    return;
                }
            }
        }

        // No valid session
        ctx.response.status = 401;
        ctx.response.body = { success: false, error: "Not authenticated" };
    } catch (err) {
        ctx.response.status = 500;
        ctx.response.body = { success: false, error: "Internal server error" };
        console.error("Auth session endpoint error:", err);
    }
});

// Signout endpoint to clear session cookie across subdomains
authRouter.post("/signout", (ctx: Context) => {
    try {
        clearCrossDomainAuthCookie(ctx);
        
        // Also clear legacy session cookie for backward compatibility
        const domain = config.isDev ? 'localhost' : '.dhaniverse.in';
        const secure = config.isDev ? '' : '; Secure';
        const sameSite = config.isDev ? '; SameSite=Lax' : '; SameSite=Lax';
        const legacyCookie = `session=; Domain=${domain}; Path=/; HttpOnly; Max-Age=0${secure}${sameSite}`;
        ctx.response.headers.append("Set-Cookie", legacyCookie);
        
        ctx.response.status = 200;
        ctx.response.body = { success: true, message: "Signed out successfully" };
    } catch (err) {
        ctx.response.status = 500;
        ctx.response.body = { success: false, error: "Failed to sign out" };
        console.error("Signout error:", err);
    }
});

// Updated auth/signout endpoint (standardized path)
authRouter.post("/auth/signout", (ctx: Context) => {
    try {
        clearCrossDomainAuthCookie(ctx);
        
        // Also clear legacy session cookie for backward compatibility
        const domain = config.isDev ? 'localhost' : '.dhaniverse.in';
        const secure = config.isDev ? '' : '; Secure';
        const sameSite = config.isDev ? '; SameSite=Lax' : '; SameSite=Lax';
        const legacyCookie = `session=; Domain=${domain}; Path=/; HttpOnly; Max-Age=0${secure}${sameSite}`;
        ctx.response.headers.append("Set-Cookie", legacyCookie);
        
        ctx.response.status = 200;
        ctx.response.body = { success: true, message: "Signed out successfully" };
    } catch (err) {
        ctx.response.status = 500;
        ctx.response.body = { success: false, error: "Failed to sign out" };
        console.error("Auth signout error:", err);
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

        // Check if user is banned before returning user data
        const banDetails = await getBanDetails(userDoc.email);
        if (banDetails) {
            ctx.response.status = 403;
            ctx.response.body = {
                valid: false,
                error: "Account banned",
                banned: true,
                banInfo: {
                    reason: banDetails.reason || "Account banned",
                    banType: banDetails.type,
                    expiresAt: banDetails.expiresAt?.toISOString()
                }
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

// Standardized verify-token endpoint for Next.js middleware
authRouter.post("/auth/verify-token", async (ctx: Context) => {
    try {
        const body = await ctx.request.body.json();
        const { token } = body;

        if (!token) {
            ctx.response.body = { valid: false, error: "Token is required" };
            return;
        }

        const payload = await verifyToken(token);
        
        if (payload && payload.userId) {
            ctx.response.body = {
                valid: true,
                payload,
            };
        } else {
            ctx.response.body = { valid: false, error: "Invalid token" };
        }
    } catch (error) {
        console.error("Token verification error:", error);
        ctx.response.body = { valid: false, error: "Token verification failed" };
    }
});

// Update user profile endpoint
authRouter.put("/auth/profile", async (ctx: Context) => {
    try {
        // Prefer Authorization header, fallback to cross-domain session cookie
        let token: string | null = null;
        const authHeader = ctx.request.headers.get("Authorization");
        if (authHeader && authHeader.startsWith("Bearer ")) {
            token = authHeader.substring(7);
        } else {
            token = getCrossDomainAuthToken(ctx) || null;
        }

        if (!token) {
            ctx.response.status = 401;
            ctx.response.body = { error: "No valid token provided" };
            return;
        }

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
            const banDetails = await getBanDetails(user.email);
            if (banDetails) {
                ctx.response.status = 403; 
                ctx.response.body = { 
                    error: 'Account banned',
                    banned: true,
                    banInfo: {
                        reason: banDetails.reason || "Account banned",
                        banType: banDetails.type,
                        expiresAt: banDetails.expiresAt?.toISOString()
                    }
                }; 
                return;
            }
            // User exists, sign them in (preserves balances and profile)
            const token = await createToken(user.id, user.email, user.gameUsername, 'google');
            
            // Log IP access
            const clientIp = (ctx.state as { clientIp?: string }).clientIp;
            await logIpAccess({
                userId: user.id,
                email: user.email,
                ip: clientIp
            });
            
            // Set cross-domain auth cookie
            try {
                if (token) {
                    setCrossDomainAuthCookie(ctx, token);
                    
                    // Also set legacy session cookie for backward compatibility
                    const domain = Deno.env.get('SERVER_DOMAIN') || (config.isDev ? 'localhost' : '.dhaniverse.in');
                    const secureFlag = config.isDev ? '' : '; Secure; SameSite=None';
                    const cookie = `session=${encodeURIComponent(token)}; Path=/; HttpOnly; Domain=${String(domain)}; Max-Age=${7 * 24 * 60 * 60}${secureFlag}`;
                    ctx.response.headers.append('Set-Cookie', cookie);
                }
            } catch (err) {
                console.warn('Failed to set session cookie on google-auth existing user:', err);
            }

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

    const banDetails = await getBanDetails(newUser.email);
    if (banDetails) { 
        ctx.response.status = 403; 
        ctx.response.body = { 
            error: 'Account banned',
            banned: true,
            banInfo: {
                reason: banDetails.reason || "Account banned",
                banType: banDetails.type,
                expiresAt: banDetails.expiresAt?.toISOString()
            }
        }; 
        return; 
    }
    const token = await createToken(newUser.id, newUser.email, newUser.gameUsername, 'google');
    
    // Log IP access for new user
    const clientIp = (ctx.state as { clientIp?: string }).clientIp;
    await logIpAccess({
        userId: newUser.id,
        email: newUser.email,
        ip: clientIp
    });
    
        // Set cross-domain auth cookie for new user
        try {
            if (token) {
                setCrossDomainAuthCookie(ctx, token);
                
                // Also set legacy session cookie for backward compatibility
                const domain = Deno.env.get('SERVER_DOMAIN') || (config.isDev ? 'localhost' : '.dhaniverse.in');
                const secureFlag = config.isDev ? '' : '; Secure; SameSite=None';
                const cookie = `session=${encodeURIComponent(token)}; Path=/; HttpOnly; Domain=${String(domain)}; Max-Age=${7 * 24 * 60 * 60}${secureFlag}`;
                ctx.response.headers.append('Set-Cookie', cookie);
            }
        } catch (err) {
            console.warn('Failed to set session cookie on google-auth new user:', err);
        }

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
            // Existing user - check if banned before signing them in
            console.log('Internet Identity: Existing user found, checking ban status');
            
            // Check for ban (Internet Identity users might not have email, use userId if no email)
            const banDetails = await getBanDetails(user.email || user._id!.toString());
            if (banDetails) {
                ctx.response.status = 403;
                ctx.response.body = { 
                    error: "Account banned",
                    banned: true,
                    banInfo: {
                        reason: banDetails.reason || "Account banned",
                        banType: banDetails.type,
                        expiresAt: banDetails.expiresAt?.toISOString()
                    }
                };
                return;
            }
            
            console.log('Internet Identity: User not banned, signing in');
            await usersCol.updateOne(
                { _id: user._id },
                { $set: { lastLoginAt: new Date() } }
            );

            const token = await createToken(user._id!.toString(), user.email || `${user._id!.toString()}@ic`, user.gameUsername, 'internet-identity');
            
            // Log IP access
            const clientIp = (ctx.state as { clientIp?: string }).clientIp;
            await logIpAccess({
                userId: user._id!.toString(),
                email: user.email || "",
                ip: clientIp
            });
            
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

        const token = await createToken(newUser.id, `${newUser.id}@ic`, newUser.gameUsername, 'internet-identity');
        
        // Log IP access for new user
        const clientIp = (ctx.state as { clientIp?: string }).clientIp;
        await logIpAccess({
            userId: newUser.id,
            email: "",
            ip: clientIp
        });
        
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
