// Core data types for Dhaniverse ICP integration

export interface BankAccount {
  principal: string;
  balance: number;
  lastUpdated: number;
  transactionCount: number;
}

export interface Transaction {
  id: string;
  principal: string;
  type: 'deposit' | 'withdraw';
  amount: number;
  timestamp: number;
  blockHeight?: number;
}

export interface TradeRecord {
  principal: string;
  stockSymbol: string;
  profit: number;
  timestamp: number;
  verified: boolean;
}

export interface LeaderboardEntry {
  principal: string;
  displayName?: string;
  totalProfit: number;
  tradeCount: number;
  rank: number;
  badges: string[];
}

export interface TransactionResult {
  success: boolean;
  transactionId?: string;
  newBalance?: number;
  error?: string;
}

export interface SyncResult {
  success: boolean;
  syncedTransactions: number;
  conflicts: number;
  error?: string;
}

// Canister method return types
export interface BalanceResponse {
  balance: number;
  lastUpdated: number;
}

export interface DepositResponse {
  success: boolean;
  newBalance: number;
  transactionId: string;
}

export interface WithdrawResponse {
  success: boolean;
  newBalance: number;
  transactionId: string;
  error?: string;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  totalEntries: number;
}