import { MongoClient, Db, Collection, Document, ObjectId } from "mongodb";
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
}

class MongoDatabase {
    private client: MongoClient | null = null;
    private db: Db | null = null;
    private isConnected = false;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    
    async connect(): Promise<void> {
        while (this.reconnectAttempts < this.maxReconnectAttempts) {
            try {
                this.reconnectAttempts++;
                console.log(`🔌 Connecting to MongoDB Atlas... (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
                console.log(
                    "📍 Connection URL format check:",
                    config.mongodb.url.startsWith("mongodb+srv://")
                        ? "✅ Atlas format"
                        : "❌ Invalid format"
                );

                // Close existing connection if any
                if (this.client) {
                    await this.client.close();
                }

                // Create client with better connection options
                this.client = new MongoClient(config.mongodb.url, {
                    serverSelectionTimeoutMS: 15000, // 15 seconds
                    connectTimeoutMS: 15000, // 15 seconds
                    socketTimeoutMS: 45000, // 45 seconds
                    maxPoolSize: 10,
                    minPoolSize: 1,
                    maxIdleTimeMS: 30000,
                    retryWrites: true,
                    retryReads: true,
                    compressors: ['zlib'],
                });

                // Connect to MongoDB with timeout
                console.log("⏳ Attempting connection...");
                await Promise.race([
                    this.client.connect(),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Connection timeout after 20 seconds')), 20000)
                    )
                ]);

                // Set database instance
                this.db = this.client.db(config.mongodb.dbName);

                // Test the connection by performing a simple operation
                await this.db.admin().ping();

                this.isConnected = true;
                this.reconnectAttempts = 0; // Reset on successful connection
                console.log(
                    `✅ MongoDB Atlas connected - Database: ${config.mongodb.dbName}`
                );

                // List collections (optional)
                try {
                    const collections = await this.db.listCollections().toArray();
                    console.log(
                        `📊 Collections: ${
                            collections.length > 0
                                ? collections.map((c) => c.name).join(", ")
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
                console.error(`❌ MongoDB Atlas connection failed (Attempt ${this.reconnectAttempts}):`, error);
                this.isConnected = false;

                // Provide more specific error messages
                const errorMessage = error instanceof Error ? error.message : String(error);
                if (errorMessage.includes("authentication")) {
                    console.log(
                        "💡 Authentication failed - check username/password in connection string"
                    );
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
                    const waitTime = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 10000); // Exponential backoff, max 10s
                    console.log(`⏳ Waiting ${waitTime}ms before retry...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                } else {
                    // All attempts failed
                    console.error(`❌ All ${this.maxReconnectAttempts} connection attempts failed`);
                    throw error;
                }
            }
        }
    }
    async disconnect(): Promise<void> {
        if (this.client) {
            console.log("🔌 Disconnecting from MongoDB Atlas...");
            await this.client.close();
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
            const result = await users.insertOne(userDoc);
            userDoc._id = result.insertedId;

            // Create initial player state
            await this.createInitialPlayerState(userDoc._id.toString());

            return {
                id: userDoc._id.toString(),
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
            id: userDoc._id?.toString() || "",
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
            id: userDoc._id?.toString() || "",
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
            id: userDoc._id?.toString() || "",
            email: userDoc.email,
            passwordHash: userDoc.passwordHash,
            gameUsername: userDoc.gameUsername,
            selectedCharacter: userDoc.selectedCharacter,
            createdAt: userDoc.createdAt,
            googleId: userDoc.googleId,
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
    private async createInitialPlayerState(userId: string): Promise<void> {
        // Create initial player state
        const playerState: PlayerStateDocument = {
            userId,
            position: { x: 400, y: 300, scene: "main" },
            financial: {
                rupees: 1000,
                totalWealth: 1000,
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

        // Create initial bank account
        const bankAccount: BankAccountDocument = {
            userId,
            balance: 1000,
            transactions: [],
            createdAt: new Date(),
            lastUpdated: new Date(),
        };
        const bankAccounts = this.getCollection<BankAccountDocument>(
            COLLECTIONS.BANK_ACCOUNTS
        );
        await bankAccounts.insertOne(bankAccount);
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