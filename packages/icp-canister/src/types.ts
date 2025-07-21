// Type definitions for the Dhaniverse ICP Canister

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