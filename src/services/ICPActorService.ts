import { Actor, HttpAgent, Identity } from '@dfinity/agent';

// Types from our canister
interface BalanceResponse {
  balance: number;
  lastUpdated: number;
}

interface DepositResponse {
  success: boolean;
  newBalance: number;
  transactionId: string;
}

interface WithdrawResponse {
  success: boolean;
  newBalance: number;
  transactionId: string;
  error?: string;
}

interface Transaction {
  id: string;
  principal: string;
  type: 'deposit' | 'withdraw';
  amount: number;
  timestamp: number;
}

interface LeaderboardEntry {
  principal: string;
  displayName?: string;
  totalProfit: number;
  tradeCount: number;
  rank: number;
  badges: string[];
}

interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  totalEntries: number;
}

export interface TransactionResult {
  success: boolean;
  transactionId?: string;
  newBalance?: number;
  error?: string;
}

// IDL interface for the canister
const idlFactory = ({ IDL }: any) => {
  return IDL.Service({
    'getBalance': IDL.Func([IDL.Text], [IDL.Record({
      'balance': IDL.Float64,
      'lastUpdated': IDL.Nat64
    })], ['query']),
    'deposit': IDL.Func([IDL.Float64], [IDL.Record({
      'success': IDL.Bool,
      'newBalance': IDL.Float64,
      'transactionId': IDL.Text
    })], []),
    'withdraw': IDL.Func([IDL.Float64], [IDL.Record({
      'success': IDL.Bool,
      'newBalance': IDL.Float64,
      'transactionId': IDL.Text,
      'error': IDL.Opt(IDL.Text)
    })], []),
    'getTransactionHistory': IDL.Func([IDL.Text], [IDL.Vec(IDL.Record({
      'id': IDL.Text,
      'principal': IDL.Text,
      'type': IDL.Text,
      'amount': IDL.Float64,
      'timestamp': IDL.Nat64
    }))], ['query']),
    'recordTrade': IDL.Func([IDL.Float64, IDL.Text], [IDL.Bool], []),
    'getLeaderboard': IDL.Func([IDL.Opt(IDL.Nat32)], [IDL.Record({
      'entries': IDL.Vec(IDL.Record({
        'principal': IDL.Text,
        'displayName': IDL.Opt(IDL.Text),
        'totalProfit': IDL.Float64,
        'tradeCount': IDL.Nat32,
        'rank': IDL.Nat32,
        'badges': IDL.Vec(IDL.Text)
      })),
      'totalEntries': IDL.Nat32
    })], ['query']),
    'getUserRank': IDL.Func([IDL.Text], [IDL.Nat32], ['query']),
    'getHealth': IDL.Func([], [IDL.Text], ['query'])
  });
};

export class ICPActorService {
  private actor: any = null;
  private agent: HttpAgent | null = null;
  private identity: Identity | null = null;
  private canisterId: string;
  private isConnected: boolean = false;
  private retryCount: number = 0;
  private maxRetries: number = 3;
  private baseDelay: number = 1000; // 1 second

  constructor(canisterId: string) {
    this.canisterId = canisterId;
  }

  // Connection Management
  async connect(identity?: Identity): Promise<boolean> {
    try {
      this.identity = identity || null;
      
      // Create agent
      this.agent = await HttpAgent.create({
        host: process.env.NODE_ENV === 'production' 
          ? 'https://ic0.app' 
          : 'http://127.0.0.1:4943',
        identity: this.identity || undefined
      });

      // Fetch root key for local development
      if (process.env.NODE_ENV !== 'production') {
        await this.agent.fetchRootKey();
      }

      // Create actor
      this.actor = Actor.createActor(idlFactory, {
        agent: this.agent,
        canisterId: this.canisterId,
      });

      // Test connection
      await this.getHealth();
      this.isConnected = true;
      this.retryCount = 0;
      
      console.log('ICP Actor Service connected successfully');
      return true;
    } catch (error) {
      console.error('Failed to connect to ICP canister:', error);
      this.isConnected = false;
      return false;
    }
  }

  disconnect(): void {
    this.actor = null;
    this.agent = null;
    this.identity = null;
    this.isConnected = false;
    this.retryCount = 0;
  }

  isActorConnected(): boolean {
    return this.isConnected && this.actor !== null;
  }

  getPrincipal(): string | null {
    if (!this.identity) return null;
    return this.identity.getPrincipal().toString();
  }

  // Retry logic with exponential backoff
  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await operation();
        this.retryCount = 0; // Reset on success
        return result;
      } catch (error) {
        console.warn(`ICP operation attempt ${attempt + 1} failed:`, error);
        
        if (attempt === this.maxRetries) {
          this.retryCount++;
          throw new Error(`ICP operation failed after ${this.maxRetries + 1} attempts: ${error}`);
        }
        
        // Exponential backoff
        const delay = this.baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw new Error('Unexpected retry loop exit');
  }

  // Banking Operations
  async getBalance(principal?: string): Promise<number> {
    if (!this.isActorConnected()) {
      throw new Error('Actor not connected');
    }

    const targetPrincipal = principal || this.getPrincipal();
    if (!targetPrincipal) {
      throw new Error('No principal available');
    }

    return this.withRetry(async () => {
      const response: BalanceResponse = await this.actor.getBalance(targetPrincipal);
      return response.balance;
    });
  }

  async deposit(amount: number): Promise<TransactionResult> {
    if (!this.isActorConnected()) {
      throw new Error('Actor not connected');
    }

    if (amount <= 0) {
      return {
        success: false,
        error: 'Deposit amount must be positive'
      };
    }

    return this.withRetry(async () => {
      const response: DepositResponse = await this.actor.deposit(amount);
      return {
        success: response.success,
        transactionId: response.transactionId,
        newBalance: response.newBalance
      };
    });
  }

  async withdraw(amount: number): Promise<TransactionResult> {
    if (!this.isActorConnected()) {
      throw new Error('Actor not connected');
    }

    if (amount <= 0) {
      return {
        success: false,
        error: 'Withdrawal amount must be positive'
      };
    }

    return this.withRetry(async () => {
      const response: WithdrawResponse = await this.actor.withdraw(amount);
      return {
        success: response.success,
        transactionId: response.transactionId,
        newBalance: response.newBalance,
        error: response.error
      };
    });
  }

  async getTransactionHistory(principal?: string): Promise<Transaction[]> {
    if (!this.isActorConnected()) {
      throw new Error('Actor not connected');
    }

    const targetPrincipal = principal || this.getPrincipal();
    if (!targetPrincipal) {
      throw new Error('No principal available');
    }

    return this.withRetry(async () => {
      const transactions: Transaction[] = await this.actor.getTransactionHistory(targetPrincipal);
      return transactions;
    });
  }

  // Leaderboard Operations
  async recordTrade(profit: number, stockSymbol: string): Promise<boolean> {
    if (!this.isActorConnected()) {
      throw new Error('Actor not connected');
    }

    return this.withRetry(async () => {
      const result: boolean = await this.actor.recordTrade(profit, stockSymbol);
      return result;
    });
  }

  async getLeaderboard(limit?: number): Promise<LeaderboardEntry[]> {
    if (!this.isActorConnected()) {
      throw new Error('Actor not connected');
    }

    return this.withRetry(async () => {
      const response: LeaderboardResponse = await this.actor.getLeaderboard(limit ? [limit] : []);
      return response.entries;
    });
  }

  async getUserRank(principal?: string): Promise<number> {
    if (!this.isActorConnected()) {
      throw new Error('Actor not connected');
    }

    const targetPrincipal = principal || this.getPrincipal();
    if (!targetPrincipal) {
      throw new Error('No principal available');
    }

    return this.withRetry(async () => {
      const rank: number = await this.actor.getUserRank(targetPrincipal);
      return rank;
    });
  }

  // Health check
  async getHealth(): Promise<string> {
    if (!this.actor) {
      throw new Error('Actor not initialized');
    }

    return this.withRetry(async () => {
      const health: string = await this.actor.getHealth();
      return health;
    });
  }

  // Circuit breaker pattern
  isCircuitBreakerOpen(): boolean {
    return this.retryCount >= 5; // Open circuit after 5 consecutive failures
  }

  resetCircuitBreaker(): void {
    this.retryCount = 0;
  }
}