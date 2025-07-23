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
    createdAt: Date;
    googleId?: string;
}

class MongoDatabase {
    private client: MongoClient | null = null;
    private db: Db | null = null;
    private isConnected = false;
    async connect(): Promise<void> {
        try {
            console.log("🔌 Connecting to MongoDB Atlas...");
            console.log(
                "📍 Connection URL format check:",
                config.mongodb.url.startsWith("mongodb+srv://")
                    ? "✅ Atlas format"
                    : "❌ Invalid format"
            );

            // Create client with better connection options
            this.client = new MongoClient(config.mongodb.url, {
                serverSelectionTimeoutMS: 10000, // 10 seconds
                connectTimeoutMS: 10000, // 10 seconds
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
                    setTimeout(() => reject(new Error('Connection timeout after 15 seconds')), 15000)
                )
            ]);

            // Set database instance
            this.db = this.client.db(config.mongodb.dbName);

            this.isConnected = true;
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
        } catch (error) {
            console.error("❌ MongoDB Atlas connection failed:", error);
            this.isConnected = false;

            // Provide more specific error messages
            if (error.message.includes("authentication")) {
                console.log(
                    "💡 Authentication failed - check username/password in connection string"
                );
            } else if (
                error.message.includes("network") ||
                error.message.includes("timeout")
            ) {
                console.log(
                    "💡 Network error - check internet connection and IP whitelist"
                );
            } else if (error.message.includes("parse")) {
                console.log(
                    "💡 Connection string format error - verify the MongoDB URI format"
                );
            }

            throw error;
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

    // Health check
    isHealthy(): boolean {
        return this.isConnected && this.client !== null && this.db !== null;
    }
}

const mongodb = new MongoDatabase();
export { MongoDatabase, mongodb }; // Explicit named export