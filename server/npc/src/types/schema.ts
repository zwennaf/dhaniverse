// Database schemas and interfaces for MongoDB collections
import { ObjectId, Document } from "mongodb";

export interface UserDocument extends Document {
  _id?: ObjectId;
  email: string;
  passwordHash: string;
  gameUsername: string;
  selectedCharacter?: string; // C1, C2, C3, or C4
  createdAt: Date;
  googleId?: string;
  internetIdentityPrincipal?: string; // For Internet Identity authentication
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

export interface PlayerStateDocument extends Document {
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
  // Onboarding & progression lock flags (Maya sequence)
  onboarding?: {
    hasMetMaya: boolean;
    hasFollowedMaya: boolean;
    hasClaimedMoney: boolean;
  // New extended progression flags (Aug 2025)
  hasCompletedBankOnboarding?: boolean; // set true only after full bank manager flow & account confirmation
  hasReachedStockMarket?: boolean; // set true after Maya guides player to stock market
  onboardingStep: 'not_started' | 'met_maya' | 'at_bank_with_maya' | 'claimed_money' | 'bank_onboarding_completed' | 'reached_stock_market';
    unlockedBuildings: Record<string, boolean>; // granular per-building unlocks
  };
  settings: {
    soundEnabled: boolean;
    musicEnabled: boolean;
    autoSave: boolean;
  };
  lastUpdated: Date;
}

export interface BankAccountDocument extends Document {
  _id?: ObjectId;
  userId: string;
  accountNumber?: string; // DIN-XXXXXX format
  accountHolder?: string; // Account holder name
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

export interface FixedDepositDocument extends Document {
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

export interface StockPortfolioDocument extends Document {
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

export interface StockTransactionDocument extends Document {
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

export interface GameSessionDocument extends Document {
  _id?: ObjectId;
  userId: string;
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number; // in milliseconds
  activitiesPerformed: Array<{
    activity: string;
    timestamp: Date;
    data?: Record<string, unknown>;
  }>;
  rupeesEarnedInSession: number;
  rupeesSpentInSession: number;
}

export interface ChatMessageDocument extends Document {
  _id?: ObjectId;
  userId: string;
  username: string;
  message: string;
  timestamp: Date;
  roomCode?: string;
  messageType: 'chat' | 'system' | 'announcement';
}

// Real-time multiplayer session data
export interface MultiplayerSessionDocument extends Document {
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
export interface UserSessionDocument extends Document {
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
export interface LeaderboardDocument extends Document {
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

export interface AchievementDocument extends Document {
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

// Administrative / moderation support
export interface BanRuleDocument extends Document {
  _id?: ObjectId;
  type: 'email' | 'internet_identity' | 'ip';
  value: string; // email, principal, or ip
  reason?: string;
  createdAt: Date;
  createdBy: string; // admin email
  expiresAt?: Date; // optional expiry
  active: boolean;
}

export interface IpLogDocument extends Document {
  _id?: ObjectId;
  userId: string;
  email: string;
  ip: string;
  firstSeen: Date;
  lastSeen: Date;
  count: number; // number of times observed
}

export interface SessionLogDocument extends Document {
  _id?: ObjectId;
  userId: string;
  username: string;
  email?: string;
  ip?: string;
  event: 'join' | 'leave';
  timestamp: Date;
  position?: { x: number; y: number };
  skin?: string;
}

export interface AnnouncementDocument extends Document {
  _id?: ObjectId;
  message: string;
  createdAt: Date;
  createdBy: string; // admin email
}

export interface ActivePlayerDocument extends Document {
  _id?: ObjectId;
  userId: string;
  username: string;
  email?: string;
  position: { x: number; y: number };
  animation?: string;
  skin?: string;
  updatedAt: Date;
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
  BANS: 'bans',
  IP_LOGS: 'ipLogs',
  SESSION_LOGS: 'sessionLogs',
  ANNOUNCEMENTS: 'announcements',
  ACTIVE_PLAYERS: 'activePlayers',
} as const;
