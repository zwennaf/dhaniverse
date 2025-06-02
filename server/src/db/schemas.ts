// Database schemas and interfaces for MongoDB collections
import { ObjectId } from "npm:mongodb@5.6.0";

export interface UserDocument {
  _id?: ObjectId;
  email: string;
  passwordHash: string;
  gameUsername: string;
  createdAt: Date;
  googleId?: string;
  // Game-specific data
  gameData: {
    level: number;
    experience: number;
    achievements: string[];
    preferences: {
      soundEnabled: boolean;
      musicEnabled: boolean;
      language: string;
    };
  };
  lastLoginAt: Date;
  isActive: boolean;
}

export interface PlayerStateDocument {
  _id?: ObjectId;
  userId: string;
  // Position data
  position: {
    x: number;
    y: number;
    scene: string; // current map/scene
  };
  // Financial data
  financial: {
    rupees: number;
    totalWealth: number;
    bankBalance: number;
    stockPortfolioValue: number;
  };
  // Inventory and items
  inventory: {
    items: Array<{
      id: string;
      type: string;
      quantity: number;
      acquiredAt: Date;
    }>;
    capacity: number;
  };
  // Progress tracking
  progress: {
    level: number;
    experience: number;
    unlockedBuildings: string[];
    completedTutorials: string[];
  };
  settings: {
    soundEnabled: boolean;
    musicEnabled: boolean;
    autoSave: boolean;
  };
  lastUpdated: Date;
}

export interface BankAccountDocument {
  _id?: ObjectId;
  userId: string;
  balance: number;
  transactions: Array<{
    id: string;
    type: 'deposit' | 'withdrawal';
    amount: number;
    timestamp: Date;
    description: string;
  }>;
  createdAt: Date;
  lastUpdated: Date;
}

export interface FixedDepositDocument {
  _id?: ObjectId;
  userId: string;
  accountId: string; // Reference to bank account
  amount: number;
  interestRate: number;
  startDate: Date;
  duration: number; // in days
  maturityDate: Date;
  matured: boolean;
  claimedAt?: Date;
  status: 'active' | 'matured' | 'claimed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

export interface StockPortfolioDocument {
  _id?: ObjectId;
  userId: string;
  holdings: Array<{
    symbol: string;
    name: string;
    quantity: number;
    averagePrice: number;
    currentPrice: number;
    totalValue: number;
    gainLoss: number;
    gainLossPercentage: number;
    purchaseDate: Date;
  }>;
  totalValue: number;
  totalInvested: number;
  totalGainLoss: number;
  createdAt: Date;
  lastUpdated: Date;
}

export interface StockTransactionDocument {
  _id?: ObjectId;
  userId: string;
  stockId: string;
  stockName: string;
  type: 'buy' | 'sell';
  price: number;
  quantity: number;
  total: number;
  timestamp: Date;
  portfolioId: string; // Reference to portfolio
}

export interface GameSessionDocument {
  _id?: ObjectId;
  userId: string;
  sessionId: string;
  startTime: Date;  endTime?: Date;
  duration?: number; // in milliseconds
  activitiesPerformed: Array<{
    activity: string;
    timestamp: Date;
    data?: Record<string, unknown>;
  }>;
  rupeesEarnedInSession: number;
  rupeesSpentInSession: number;
}

export interface ChatMessageDocument {
  _id?: ObjectId;
  userId: string;
  username: string;
  message: string;
  timestamp: Date;
  roomCode?: string;
  messageType: 'chat' | 'system' | 'announcement';
}

// Real-time multiplayer session data
export interface MultiplayerSessionDocument {
  _id?: ObjectId;
  roomCode: string;
  hostUserId: string;
  participants: Array<{
    userId: string;
    username: string;
    joinedAt: Date;
    lastSeen: Date;
    position: { x: number; y: number };
    status: 'active' | 'idle' | 'disconnected';
  }>;
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'ended';
}

// Individual user connection session
export interface UserSessionDocument {
  _id?: ObjectId;
  userId: string;
  connectionId: string;
  username: string;
  joinedAt: Date;
  lastActiveAt: Date;
  position: { x: number; y: number };
  isActive: boolean;
}

// Leaderboards and achievements
export interface LeaderboardDocument {
  _id?: ObjectId;
  category: 'wealth' | 'trading_profit' | 'banking_returns' | 'playtime';
  period: 'daily' | 'weekly' | 'monthly' | 'all_time';
  entries: Array<{
    userId: string;
    username: string;
    score: number;
    rank: number;
    achievedAt: Date;
  }>;
  lastUpdated: Date;
}

export interface AchievementDocument {
  _id?: ObjectId;
  userId: string;
  achievementId: string;
  title: string;
  description: string;
  category: string;
  points: number;
  unlockedAt: Date;
  criteria: Record<string, unknown>; // Achievement-specific criteria data
}

// Collection names as constants
export const COLLECTIONS = {
  USERS: 'users',
  PLAYER_STATES: 'playerStates',
  BANK_ACCOUNTS: 'bankAccounts',
  FIXED_DEPOSITS: 'fixedDeposits',
  STOCK_PORTFOLIOS: 'stockPortfolios',
  STOCK_TRANSACTIONS: 'stockTransactions',
  GAME_SESSIONS: 'gameSessions',
  CHAT_MESSAGES: 'chatMessages',
  MULTIPLAYER_SESSIONS: 'multiplayerSessions',
  USER_SESSIONS: 'userSessions',
  LEADERBOARDS: 'leaderboards',
  ACHIEVEMENTS: 'achievements',
} as const;
