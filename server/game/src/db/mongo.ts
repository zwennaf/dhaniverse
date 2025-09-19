import { MongoClient, Database, Collection, ObjectId, Document } from "mongodb";
import { config } from "../config/config.ts";
import type {
    UserDocument,
    PlayerStateDocument,
    BankAccountDocument,
} from "./schemas.ts";
import { COLLECTIONS } from "./schemas.ts";

export interface User {
    id: string;
    email: string;
    passwordHash: string;
    gameUsername: string;
    selectedCharacter?: string;
    createdAt: Date;
    googleId?: string;
    internetIdentityPrincipal?: string;
}

class MongoDatabase {
    private client: MongoClient | null = null;
    private db: Database | null = null;
    private isConnected = false;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;

    async connect(): Promise<void> {
        // Track if we've already attempted an encoded-password retry
        let attemptedPasswordEncodeRetry = false;

        while (this.reconnectAttempts < this.maxReconnectAttempts) {
            try {
                this.reconnectAttempts++;
                console.log(
                    `🔌 Connecting to MongoDB Atlas... (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
                );
                console.log(
                    "📍 Connection URL format check:",
                    config.mongodb.url.startsWith("mongodb+srv://")
                        ? "✅ Atlas format"
                        : "❌ Invalid format"
                );

                // Close existing connection if any
                if (this.client) {
                    this.client.close();
                }

                // Create client with connection options
                this.client = new MongoClient();

                // Masked logging for username (never print password)
                try {
                    const parsed = new URL(config.mongodb.url.replace(/^mongodb(\+srv)?:/, 'http:'));
                    const maskedUser = parsed.username ? `${parsed.username}` : '<no-user>';
                    console.log(`🔑 MongoDB user: ${maskedUser}`);
                } catch (_e) {
                    // ignore parse errors for logging
                }

                console.log("⏳ Attempting connection...");
                await Promise.race([
                    this.client.connect(config.mongodb.url),
                    new Promise((_, reject) =>
                        setTimeout(
                            () =>
                                reject(
                                    new Error(
                                        "Connection timeout after 20 seconds"
                                    )
                                ),
                            20000
                        )
                    ),
                ]);

                // Set database instance
                this.db = this.client.database(config.mongodb.dbName);

                // Test the connection by performing a simple operation
                await this.db.listCollectionNames();

                this.isConnected = true;
                this.reconnectAttempts = 0; // Reset on successful connection
                console.log(
                    `✅ MongoDB Atlas connected - Database: ${config.mongodb.dbName}`
                );

                // List collections (optional)
                try {
                    const collections = await this.db.listCollectionNames();
                    console.log(
                        `📊 Collections: ${
                            collections.length > 0
                                ? collections.join(", ")
                                : "None (new database)"
                        }`
                    );
                } catch (_listError) {
                    console.log(
                        "📊 Collections: Unable to list (permissions may be limited)"
                    );
                }

                return; // Success, exit the retry loop
            } catch (error) {
                console.error(
                    `❌ MongoDB Atlas connection failed (Attempt ${this.reconnectAttempts}):`,
                    error
                );
                this.isConnected = false;

                // Provide more specific error messages
                const errorMessage =
                    error instanceof Error ? error.message : String(error);
                if (errorMessage.toLowerCase().includes("authentication")) {
                    console.log(
                        "💡 Authentication failed - check username/password in connection string"
                    );

                    // If the URI contains a raw password that may need percent-encoding,
                    // attempt to re-run the connection with an encoded password once.
                    // This helps when passwords include characters like '@', '/', or ':'
                    // which must be percent-encoded in a MongoDB URI.
                    const uri = config.mongodb.url;
                    try {
                        const credMatch = uri.match(/^mongodb(\+srv)?:\/\/([^:@\/]+):([^@\/]+)@(.+)$/);
                        if (credMatch && !attemptedPasswordEncodeRetry) {
                            const scheme = credMatch[1] ? 'mongodb+srv' : 'mongodb';
                            const user = credMatch[2];
                            const pass = credMatch[3];
                            const rest = credMatch[4];

                            // If password already looks encoded (contains %), skip
                            if (!pass.includes('%')) {
                                attemptedPasswordEncodeRetry = true;
                                const encodedPass = encodeURIComponent(pass);
                                const retryUri = `${scheme}://${user}:${encodedPass}@${rest}`;
                                console.log(`🔁 Retrying with percent-encoded password for user '${user}' (masked)`);

                                // Close existing client and create a fresh one
                                try {
                                    this.client?.close();
                                } catch (_closeErr) {
                                    // ignore close errors during retry
                                }
                                this.client = new MongoClient();

                                try {
                                    await Promise.race([
                                        this.client.connect(retryUri),
                                        new Promise((_, reject) =>
                                            setTimeout(
                                                () =>
                                                    reject(
                                                        new Error(
                                                            "Connection timeout after 20 seconds (retry)"
                                                        )
                                                    ),
                                                20000
                                            )
                                        ),
                                    ]);

                                    // If successful, update config.mongodb.url so subsequent code uses working URI
                                    config.mongodb.url = retryUri;
                                    console.log("✅ Reconnected using encoded password retry");
                                    // Reset reconnect attempts and mark connected in next loop iteration
                                    this.reconnectAttempts = 0;
                                    return;
                                } catch (retryErr) {
                                    console.error("❌ Retry with encoded password failed:", retryErr);
                                }
                            }
                        }
                    } catch (_parseErr) {
                        // ignore parsing errors
                    }
                } else if (
                    errorMessage.includes("network") ||
                    errorMessage.includes("timeout")
                ) {
                    console.log(
                        "💡 Network error - check internet connection and IP whitelist"
                    );
                } else if (errorMessage.includes("parse")) {
                    console.log(
                        "💡 Connection string format error - verify the MongoDB URI format"
                    );
                }

                // If this is not the last attempt, wait before retrying
                if (this.reconnectAttempts < this.maxReconnectAttempts) {
                    const waitTime = Math.min(
                        1000 * Math.pow(2, this.reconnectAttempts - 1),
                        10000
                    ); // Exponential backoff, max 10s
                    console.log(`⏳ Waiting ${waitTime}ms before retry...`);
                    await new Promise((resolve) =>
                        setTimeout(resolve, waitTime)
                    );
                } else {
                    // All attempts failed
                    console.error(
                        `❌ All ${this.maxReconnectAttempts} connection attempts failed`
                    );
                    throw error;
                }
            }
        }
    }
    disconnect(): void {
        if (this.client) {
            console.log("🔌 Disconnecting from MongoDB Atlas...");
            this.client.close();
            this.isConnected = false;
            console.log("✅ MongoDB Atlas disconnected");
        }
    }

    getCollection<T extends Document = Document>(name: string): Collection<T> {
        if (!this.db) {
            throw new Error("Database not connected. Call connect() first.");
        }
        return this.db.collection<T>(name);
    } // User management methods
    async createUser(userData: Omit<User, "id">): Promise<User> {
        try {
            const userDoc: UserDocument = {
                _id: new ObjectId(),
                email: userData.email,
                passwordHash: userData.passwordHash,
                gameUsername: userData.gameUsername,
                selectedCharacter: userData.selectedCharacter || "C2",
                createdAt: userData.createdAt,
                googleId: userData.googleId,
                gameData: {
                    level: 1,
                    experience: 0,
                    achievements: [],
                    preferences: {
                        soundEnabled: true,
                        musicEnabled: true,
                        language: "en",
                    },
                },
                lastLoginAt: new Date(),
                isActive: true,
            };
            const users = this.getCollection<UserDocument>(COLLECTIONS.USERS);
            const insertedId = await users.insertOne(userDoc);

            // Create initial player state
            await this.createInitialPlayerState(insertedId.toString());

            return {
                id: insertedId.toString(),
                email: userDoc.email,
                passwordHash: userDoc.passwordHash,
                gameUsername: userDoc.gameUsername,
                selectedCharacter: userDoc.selectedCharacter,
                createdAt: userDoc.createdAt,
                googleId: userDoc.googleId,
            };
        } catch (error) {
            console.error("❌ Error creating user:", error);
            if (error instanceof Error) {
                console.error("❌ Error message:", error.message);
                console.error("❌ Error stack:", error.stack);
            }
            throw error;
        }
    }
    async findUserByEmail(email: string): Promise<User | null> {
        const users = this.getCollection<UserDocument>(COLLECTIONS.USERS);
        const userDoc = await users.findOne({ email });
        if (!userDoc) return null;

        return {
            id: userDoc._id?.toString() ?? "",
            email: userDoc.email,
            passwordHash: userDoc.passwordHash,
            gameUsername: userDoc.gameUsername,
            selectedCharacter: userDoc.selectedCharacter,
            createdAt: userDoc.createdAt,
            googleId: userDoc.googleId,
        };
    }
    async findUserByGameUsername(gameUsername: string): Promise<User | null> {
        const users = this.getCollection<UserDocument>(COLLECTIONS.USERS);
        const userDoc = await users.findOne({ gameUsername });
        if (!userDoc) return null;

        return {
            id: userDoc._id?.toString() ?? "",
            email: userDoc.email,
            passwordHash: userDoc.passwordHash,
            gameUsername: userDoc.gameUsername,
            selectedCharacter: userDoc.selectedCharacter,
            createdAt: userDoc.createdAt,
            googleId: userDoc.googleId,
        };
    }
    async findUserByGoogleId(googleId: string): Promise<User | null> {
        const users = this.getCollection<UserDocument>(COLLECTIONS.USERS);
        const userDoc = await users.findOne({ googleId });
        if (!userDoc) return null;

        return {
            id: userDoc._id?.toString() ?? "",
            email: userDoc.email,
            passwordHash: userDoc.passwordHash,
            gameUsername: userDoc.gameUsername,
            selectedCharacter: userDoc.selectedCharacter,
            createdAt: userDoc.createdAt,
            googleId: userDoc.googleId,
        };
    }

    async findUserByInternetIdentityPrincipal(principal: string): Promise<User | null> {
        const users = this.getCollection<UserDocument>(COLLECTIONS.USERS);
        const userDoc = await users.findOne({ internetIdentityPrincipal: principal });
        if (!userDoc) return null;

        return {
            id: userDoc._id?.toString() ?? "",
            email: userDoc.email,
            passwordHash: userDoc.passwordHash,
            gameUsername: userDoc.gameUsername,
            selectedCharacter: userDoc.selectedCharacter,
            createdAt: userDoc.createdAt,
            googleId: userDoc.googleId,
            internetIdentityPrincipal: userDoc.internetIdentityPrincipal,
        };
    }

    // Game state methods
    async getPlayerState(userId: string): Promise<PlayerStateDocument | null> {
        const playerStates = this.getCollection<PlayerStateDocument>(
            COLLECTIONS.PLAYER_STATES
        );
        const result = await playerStates.findOne({ userId });
        return result || null;
    }
    async updatePlayerPosition(
        userId: string,
        position: { x: number; y: number; scene: string }
    ): Promise<void> {
        const playerStates = this.getCollection<PlayerStateDocument>(
            COLLECTIONS.PLAYER_STATES
        );
        await playerStates.updateOne(
            { userId },
            {
                $set: {
                    position,
                    lastUpdated: new Date(),
                },
            }
        );
    }
    async getBankAccount(userId: string): Promise<BankAccountDocument | null> {
        const bankAccounts = this.getCollection<BankAccountDocument>(
            COLLECTIONS.BANK_ACCOUNTS
        );
        const result = await bankAccounts.findOne({ userId });
        return result || null;
    }
    async createInitialPlayerState(userId: string): Promise<void> {
        // Create initial player state
        const playerState: PlayerStateDocument = {
            userId,
            position: { x: 400, y: 300, scene: "main" },
            financial: {
                rupees: 0,
                totalWealth: 0,
                bankBalance: 0,
                stockPortfolioValue: 0,
            },
            inventory: {
                items: [],
                capacity: 20,
            },
            progress: {
                level: 1,
                experience: 0,
                unlockedBuildings: ["bank", "stockmarket"],
                completedTutorials: [],
            },
            onboarding: {
                hasMetMaya: false,
                hasFollowedMaya: false,
                hasClaimedMoney: false,
                hasCompletedBankOnboarding: false,
                hasReachedStockMarket: false,
                onboardingStep: 'not_started',
                // Only bank becomes true after claim; all start false.
                unlockedBuildings: { bank: false, atm: false, stockmarket: false }
            },
            settings: {
                soundEnabled: true,
                musicEnabled: true,
                autoSave: true,
            },
            lastUpdated: new Date(),
        };
        const playerStates = this.getCollection<PlayerStateDocument>(
            COLLECTIONS.PLAYER_STATES
        );
        await playerStates.insertOne(playerState);

        // DO NOT auto-create bank accounts here - let the frontend handle the bank account creation flow
        // Users will create their bank accounts through the proper onboarding process
        console.log('✅ User created without auto-creating bank account - user will create account through onboarding flow');
    }

    // Health check with automatic reconnection attempt
    isHealthy(): boolean {
        return this.isConnected && this.client !== null && this.db !== null;
    }

    // Attempt to reconnect if connection is lost
    async ensureConnection(): Promise<void> {
        if (!this.isHealthy()) {
            console.log("🔄 Connection lost, attempting to reconnect...");
            this.isConnected = false;
            this.reconnectAttempts = 0; // Reset attempts for reconnection
            await this.connect();
        }
    }
}

const mongodb = new MongoDatabase();
export { MongoDatabase, mongodb }; // Explicit named export
