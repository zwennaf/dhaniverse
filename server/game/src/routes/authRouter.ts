import { Router, Context } from "oak";
import { ObjectId } from "mongodb";
import { mongodb } from "../db/mongo.ts";
import { createToken, verifyToken } from "../auth/jwt.ts";
import type { UserDocument } from "../db/schemas.ts";

const authRouter = new Router();

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

export default authRouter;
