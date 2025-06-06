import { MongoClient, Db, Collection, ObjectId, Document } from "npm:mongodb@5.6.0";
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
  private isConnected = false;  async connect(): Promise<void> {
    try {
      this.client = new MongoClient(config.mongodb.url);
      await this.client.connect();
      
      // Test connection
      await this.client.db("admin").command({ ping: 1 });
      
      this.db = this.client.db(config.mongodb.dbName);
      this.isConnected = true;
    } catch (error) {
      throw error;
    }
  }
  async disconnect(): Promise<void> {    if (this.client) {
      await this.client.close();
      this.isConnected = false;
    }
  }

  getCollection<T extends Document = Document>(name: string): Collection<T> {
    if (!this.db) {
      throw new Error("Database not connected. Call connect() first.");
    }
    return this.db.collection<T>(name);
  }  // User management methods
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
            language: "en"
          }
        },
        lastLoginAt: new Date(),
        isActive: true
      };      const users = this.getCollection<UserDocument>(COLLECTIONS.USERS);
      const result = await users.insertOne(userDoc);
      
      // Create initial player state
      await this.createInitialPlayerState(result.insertedId.toString());
      
      return {
        id: result.insertedId.toString(),
        email: userDoc.email,
        passwordHash: userDoc.passwordHash,
        gameUsername: userDoc.gameUsername,
        createdAt: userDoc.createdAt,
        googleId: userDoc.googleId
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
      googleId: userDoc.googleId
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
      googleId: userDoc.googleId
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
      googleId: userDoc.googleId
    };
  }
  // Game state methods
  async getPlayerState(userId: string): Promise<PlayerStateDocument | null> {
    const playerStates = this.getCollection<PlayerStateDocument>(COLLECTIONS.PLAYER_STATES);
    return await playerStates.findOne({ userId });
  }
  async updatePlayerPosition(userId: string, position: { x: number; y: number; scene: string }): Promise<void> {
    const playerStates = this.getCollection<PlayerStateDocument>(COLLECTIONS.PLAYER_STATES);
    await playerStates.updateOne(
      { userId },
      { 
        $set: { 
          position,
          lastUpdated: new Date()
        }
      }
    );
  }
  async getBankAccount(userId: string): Promise<BankAccountDocument | null> {
    const bankAccounts = this.getCollection<BankAccountDocument>(COLLECTIONS.BANK_ACCOUNTS);
    return await bankAccounts.findOne({ userId });
  }private async createInitialPlayerState(userId: string): Promise<void> {
    // Create initial player state
    const playerState: PlayerStateDocument = {
      userId,
      position: { x: 400, y: 300, scene: "main" },
      financial: {
        rupees: 1000,
        totalWealth: 1000,
        bankBalance: 0,
        stockPortfolioValue: 0
      },
      inventory: {
        items: [],
        capacity: 20
      },
      progress: {
        level: 1,
        experience: 0,
        unlockedBuildings: ["bank", "stockmarket"],
        completedTutorials: []
      },      settings: {
        soundEnabled: true,
        musicEnabled: true,
        autoSave: true
      },
      lastUpdated: new Date()
    };    const playerStates = this.getCollection<PlayerStateDocument>(COLLECTIONS.PLAYER_STATES);
    await playerStates.insertOne(playerState);
    
    // Create initial bank account
    const bankAccount: BankAccountDocument = {
      userId,
      balance: 1000,
      transactions: [],
      createdAt: new Date(),
      lastUpdated: new Date()
    };
    const bankAccounts = this.getCollection<BankAccountDocument>(COLLECTIONS.BANK_ACCOUNTS);
    await bankAccounts.insertOne(bankAccount);
  }

  // Health check
  isHealthy(): boolean {
    return this.isConnected && this.client !== null && this.db !== null;
  }
}

const mongodb = new MongoDatabase();
export { MongoDatabase, mongodb }; // Explicit named export
