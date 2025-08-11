import { Router, Context } from "oak";
import { ObjectId } from "mongodb";
import { mongodb } from "../db/mongo.ts";
import { createToken, verifyToken } from "../auth/jwt.ts";
import type { UserDocument } from "../db/schemas.ts";
import { EmailService } from "../services/EmailService.ts";
import { OTPService } from "../services/OTPService.ts";

const authRouter = new Router();

// Initialize services
const emailService = new EmailService();
const otpService = new OTPService(mongodb);

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

// Helper function to hash passwords (basic implementation)
async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
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

// Register endpoint
authRouter.post("/auth/register", async (ctx: Context) => {
    try {
        // Check database connection first
        if (!mongodb.isHealthy()) {
            ctx.response.status = 503;
            ctx.response.body = { error: "Database service unavailable" };
            return;
        }

        const body = await ctx.request.body.json();
        const { email, password, gameUsername } = body;

        // Validation
        if (!email || !password || !gameUsername) {
            ctx.response.status = 400;
            ctx.response.body = {
                error: "Email, password, and game username are required",
            };
            return;
        }

        if (password.length < 6) {
            ctx.response.status = 400;
            ctx.response.body = {
                error: "Password must be at least 6 characters",
            };
            return;
        }

        if (gameUsername.length < 3) {
            ctx.response.status = 400;
            ctx.response.body = {
                error: "Game username must be at least 3 characters",
            };
            return;
        }

        // Check if user already exists
        const existingEmailUser = await mongodb.findUserByEmail(email);
        if (existingEmailUser) {
            ctx.response.status = 400;
            ctx.response.body = {
                error: "User with this email already exists",
            };
            return;
        }

        const existingUsernameUser = await mongodb.findUserByGameUsername(
            gameUsername
        );
        if (existingUsernameUser) {
            ctx.response.status = 400;
            ctx.response.body = { error: "Game username is already taken" };
            return;
        }

        // Create user
        const passwordHash = await hashPassword(password);
        const user = await mongodb.createUser({
            email,
            passwordHash,
            gameUsername,
            createdAt: new Date(),
        });

        // Create session token
        const token = await createToken(user.id);

        ctx.response.body = {
            token,
            user: {
                id: user.id,
                email: user.email,
                gameUsername: user.gameUsername,
                selectedCharacter: "C2", // Default for new users
            },
        };
    } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { error: "Internal server error" };
        console.error("Registration error:", error);
    }
});

// Login endpoint with auto-registration for new users
authRouter.post("/auth/login", async (ctx: Context) => {
    try {
        // Check database connection first
        if (!mongodb.isHealthy()) {
            ctx.response.status = 503;
            ctx.response.body = { error: "Database service unavailable" };
            return;
        }

        const body = await ctx.request.body.json();
        const { email, password, autoRegister } = body;

        if (!email || !password) {
            ctx.response.status = 400;
            ctx.response.body = { error: "Email and password are required" };
            return;
        }

        // Find user
        let user = await mongodb.findUserByEmail(email);

        if (!user) {
            // If autoRegister is enabled, create a new user
            if (autoRegister) {
                // Validate password for new user
                if (password.length < 6) {
                    ctx.response.status = 400;
                    ctx.response.body = {
                        error: "Password must be at least 6 characters for new account",
                    };
                    return;
                }

                // Generate a default game username from email
                const defaultGameUsername =
                    email.split("@")[0] +
                    "_" +
                    Math.floor(Math.random() * 1000);

                // Ensure the generated username is unique
                let gameUsername = defaultGameUsername;
                let counter = 1;
                while (await mongodb.findUserByGameUsername(gameUsername)) {
                    gameUsername = defaultGameUsername + "_" + counter;
                    counter++;
                }

                // Create new user
                const passwordHash = await hashPassword(password);
                user = await mongodb.createUser({
                    email,
                    passwordHash,
                    gameUsername,
                    createdAt: new Date(),
                });

                // Create session token
                const token = await createToken(user.id);

                ctx.response.status = 201;
                ctx.response.body = {
                    token,
                    user: {
                        id: user.id,
                        email: user.email,
                        gameUsername: user.gameUsername,
                    },
                    isNewUser: true,
                    message:
                        "Account created successfully! You can change your username in your profile.",
                };
                return;
            } else {
                ctx.response.status = 401;
                ctx.response.body = { error: "Invalid email or password" };
                return;
            }
        }

        // Verify password for existing user
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
                gameUsername: user.gameUsername,
                selectedCharacter: user.selectedCharacter || "C2",
            },
            isNewUser: false,
        };
    } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { error: "Internal server error" };
        console.error("Login error:", error);
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
                selectedCharacter: userDoc.selectedCharacter || "C2", // Default to C2
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
                selectedCharacter: updatedUser?.selectedCharacter || "C2", // Default to C2
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
                    selectedCharacter: user.selectedCharacter || "C2",
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
                selectedCharacter: "C2", // Default for new users
            },
            isNewUser: true,
        };
    } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = { error: "Internal server error" };
        console.error("Google auth error:", error);
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
// OTP ROUTES FOR EMAIL VERIFICATION
// ==========================================

// Send OTP for email verification
authRouter.post("/auth/send-otp", async (ctx: Context) => {
    try {
        const body = await ctx.request.body.json();
        const { email, purpose = 'email_verification' } = body;

        if (!email) {
            ctx.response.status = 400;
            ctx.response.body = {
                success: false,
                message: "Email is required"
            };
            return;
        }

        // Rate limiting
        if (!checkRateLimit(`otp:${email}`, 3, 5 * 60 * 1000)) {
            ctx.response.status = 429;
            ctx.response.body = {
                success: false,
                message: "Too many OTP requests. Please wait 5 minutes."
            };
            return;
        }

        // Check if user has a valid OTP already
        const hasValidOTP = await otpService.hasValidOTP(email, purpose);
        if (hasValidOTP) {
            const expiryTime = await otpService.getOTPExpiryTime(email, purpose);
            ctx.response.status = 400;
            ctx.response.body = {
                success: false,
                message: "A valid OTP already exists. Please check your email or wait for it to expire.",
                expiresAt: expiryTime?.toISOString()
            };
            return;
        }

        // Generate and send OTP
        const { otp, expiresAt } = await otpService.generateOTP(email, {
            purpose: purpose as 'email_verification' | 'password_reset',
            expiresInMinutes: 10
        });

        const emailSent = await emailService.sendOTPEmail({
            to: email,
            otp,
            expiresIn: 10
        });

        if (!emailSent) {
            ctx.response.status = 500;
            ctx.response.body = {
                success: false,
                message: "Failed to send verification email. Please try again."
            };
            return;
        }

        ctx.response.status = 200;
        ctx.response.body = {
            success: true,
            message: "Verification code sent to your email.",
            expiresAt: expiresAt.toISOString()
        };

    } catch (error) {
        console.error("Send OTP error:", error);
        ctx.response.status = 500;
        ctx.response.body = {
            success: false,
            message: "Internal server error"
        };
    }
});

// Verify OTP
authRouter.post("/auth/verify-otp", async (ctx: Context) => {
    try {
        const body = await ctx.request.body.json();
        const { email, otp, purpose = 'email_verification' } = body;

        if (!email || !otp) {
            ctx.response.status = 400;
            ctx.response.body = {
                success: false,
                message: "Email and OTP are required"
            };
            return;
        }

        // Rate limiting
        if (!checkRateLimit(`verify:${email}`, 5, 15 * 60 * 1000)) {
            ctx.response.status = 429;
            ctx.response.body = {
                success: false,
                message: "Too many verification attempts. Please try again in 15 minutes."
            };
            return;
        }

        // Verify OTP
        const verification = await otpService.verifyOTP(email, otp, purpose);
        
        if (!verification.valid) {
            ctx.response.status = 400;
            ctx.response.body = {
                success: false,
                message: verification.message
            };
            return;
        }

        ctx.response.status = 200;
        ctx.response.body = {
            success: true,
            message: "OTP verified successfully"
        };

    } catch (error) {
        console.error("Verify OTP error:", error);
        ctx.response.status = 500;
        ctx.response.body = {
            success: false,
            message: "Internal server error"
        };
    }
});

// Enhanced registration with email verification
authRouter.post("/auth/register-with-otp", async (ctx: Context) => {
    try {
        const body = await ctx.request.body.json();
        const { email, password, gameUsername, otp, selectedCharacter } = body;

        // Validation
        if (!email || !password || !gameUsername || !otp) {
            ctx.response.status = 400;
            ctx.response.body = {
                success: false,
                message: "Email, password, game username, and OTP are required"
            };
            return;
        }

        // Rate limiting
        if (!checkRateLimit(`register:${email}`, 3, 15 * 60 * 1000)) {
            ctx.response.status = 429;
            ctx.response.body = {
                success: false,
                message: "Too many registration attempts. Please try again in 15 minutes."
            };
            return;
        }

        // Verify OTP first
        const verification = await otpService.verifyOTP(email, otp, 'email_verification');
        if (!verification.valid) {
            ctx.response.status = 400;
            ctx.response.body = {
                success: false,
                message: verification.message
            };
            return;
        }

        // Check if user already exists
        const existingUser = await mongodb.findUserByEmail(email);
        if (existingUser) {
            ctx.response.status = 409;
            ctx.response.body = {
                success: false,
                message: "User with this email already exists"
            };
            return;
        }

        // Check if username is taken
        const existingUsername = await mongodb.findUserByGameUsername(gameUsername);
        if (existingUsername) {
            ctx.response.status = 409;
            ctx.response.body = {
                success: false,
                message: "Username is already taken"
            };
            return;
        }

        // Create user
        const passwordHash = await hashPassword(password);
        const user = await mongodb.createUser({
            email,
            passwordHash,
            gameUsername,
            selectedCharacter: selectedCharacter || 'C1',
            createdAt: new Date()
        });

        // Create initial player state
        await mongodb.createInitialPlayerState(user.id);

        // Send welcome email
        await emailService.sendWelcomeEmail(email, gameUsername);

        // Generate JWT token
        const token = await createToken(user.id, gameUsername);

        ctx.response.status = 201;
        ctx.response.body = {
            success: true,
            message: "Registration completed successfully!",
            user: {
                id: user.id,
                email: user.email,
                gameUsername: user.gameUsername,
                selectedCharacter: user.selectedCharacter
            },
            token
        };

    } catch (error) {
        console.error("Registration with OTP error:", error);
        ctx.response.status = 500;
        ctx.response.body = {
            success: false,
            message: "Internal server error"
        };
    }
});

// Password reset request
authRouter.post("/auth/forgot-password", async (ctx: Context) => {
    try {
        const body = await ctx.request.body.json();
        const { email } = body;

        if (!email) {
            ctx.response.status = 400;
            ctx.response.body = {
                success: false,
                message: "Email is required"
            };
            return;
        }

        // Rate limiting
        if (!checkRateLimit(`forgot:${email}`, 3, 15 * 60 * 1000)) {
            ctx.response.status = 429;
            ctx.response.body = {
                success: false,
                message: "Too many password reset attempts. Please try again in 15 minutes."
            };
            return;
        }

        // Check if user exists (but don't reveal if they don't)
        const user = await mongodb.findUserByEmail(email);
        
        if (user) {
            // Generate and send OTP
            const { otp, expiresAt } = await otpService.generateOTP(email, {
                purpose: 'password_reset',
                expiresInMinutes: 15
            });

            await emailService.sendOTPEmail({
                to: email,
                otp,
                username: user.gameUsername,
                expiresIn: 15
            });
        }

        // Always return success to prevent email enumeration
        ctx.response.status = 200;
        ctx.response.body = {
            success: true,
            message: "If an account with this email exists, you will receive a password reset code."
        };

    } catch (error) {
        console.error("Forgot password error:", error);
        ctx.response.status = 500;
        ctx.response.body = {
            success: false,
            message: "Internal server error"
        };
    }
});

// Reset password with OTP
authRouter.post("/auth/reset-password", async (ctx: Context) => {
    try {
        const body = await ctx.request.body.json();
        const { email, otp, newPassword } = body;

        if (!email || !otp || !newPassword) {
            ctx.response.status = 400;
            ctx.response.body = {
                success: false,
                message: "Email, OTP, and new password are required"
            };
            return;
        }

        // Rate limiting
        if (!checkRateLimit(`reset:${email}`, 5, 15 * 60 * 1000)) {
            ctx.response.status = 429;
            ctx.response.body = {
                success: false,
                message: "Too many reset attempts. Please try again in 15 minutes."
            };
            return;
        }

        // Verify OTP
        const verification = await otpService.verifyOTP(email, otp, 'password_reset');
        
        if (!verification.valid) {
            ctx.response.status = 400;
            ctx.response.body = {
                success: false,
                message: verification.message
            };
            return;
        }

        // Find user
        const user = await mongodb.findUserByEmail(email);
        if (!user) {
            ctx.response.status = 404;
            ctx.response.body = {
                success: false,
                message: "User not found"
            };
            return;
        }

        // Update password
        const hashedPassword = await hashPassword(newPassword);
        const collection = mongodb.getCollection('users');
        await collection.updateOne(
            { _id: user._id },
            { 
                $set: { 
                    passwordHash: hashedPassword,
                    updatedAt: new Date()
                } 
            }
        );

        ctx.response.status = 200;
        ctx.response.body = {
            success: true,
            message: "Password reset successfully. You can now login with your new password."
        };

    } catch (error) {
        console.error("Reset password error:", error);
        ctx.response.status = 500;
        ctx.response.body = {
            success: false,
            message: "Internal server error"
        };
    }
});

// Health check for email service
authRouter.get("/auth/email-health", async (ctx: Context) => {
    try {
        const isHealthy = await emailService.testConnection();
        const otpStats = await otpService.getOTPStats();

        ctx.response.status = 200;
        ctx.response.body = {
            success: true,
            emailService: isHealthy ? 'healthy' : 'unhealthy',
            otpStats
        };
    } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = {
            success: false,
            message: "Health check failed"
        };
    }
});

// Cleanup expired OTPs (call this periodically)
authRouter.post("/auth/cleanup-otps", async (ctx: Context) => {
    try {
        const cleaned = await otpService.cleanupExpiredOTPs();
        ctx.response.status = 200;
        ctx.response.body = {
            success: true,
            message: `Cleaned up ${cleaned} expired OTPs`
        };
    } catch (error) {
        ctx.response.status = 500;
        ctx.response.body = {
            success: false,
            message: "Cleanup failed"
        };
    }
});

export default authRouter;
