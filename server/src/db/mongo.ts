// MongoDB connection will be implemented later
// For now using in-memory storage in authRouter.ts

// User interface
export interface User {
  id: string;
  email: string;
  passwordHash: string;
  gameUsername: string;
  createdAt: Date;
  googleId?: string;
}

// Session interface
export interface Session {
  userId: string;
  createdAt: Date;
  expiresAt: Date;
}

// Placeholder for future MongoDB implementation
export class MongoDatabase {
  connect(): void {
    console.log("📦 MongoDB connection not implemented yet, using in-memory storage");
  }

  disconnect(): void {
    console.log("📦 MongoDB disconnection not implemented yet");
  }
}

export const mongodb = new MongoDatabase();