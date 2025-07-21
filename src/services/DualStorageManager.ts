import { ICPActorService, TransactionResult } from './ICPActorService';
import { WalletManager, WalletStatus } from './WalletManager';

export type StorageMode = 'local' | 'hybrid' | 'blockchain';

export interface SyncResult {
  success: boolean;
  syncedTransactions: number;
  conflicts: number;
  error?: string;
}

export interface LocalFinancialData {
  balance: number;
  transactions: LocalTransaction[];
  lastUpdated: number;
}

export interface LocalTransaction {
  id: string;
  type: 'deposit' | 'withdraw';
  amount: number;
  timestamp: number;
  source: 'local' | 'blockchain';
  syncStatus: 'synced' | 'pending' | 'failed';
}

export interface ConflictResolution {
  useLocal: boolean;
  useBlockchain: boolean;
  merge: boolean;
}

export class DualStorageManager {
  private icpService: ICPActorService;
  private walletManager: WalletManager;
  private storageMode: StorageMode = 'local';
  private localStorageKey = 'dhaniverse_financial_data';
  private syncInProgress = false;

  constructor(icpService: ICPActorService, walletManager: WalletManager) {
    this.icpService = icpService;
    this.walletManager = walletManager;
    
    // Listen for wallet connection changes
    this.walletManager.onConnectionChange(this.handleWalletStatusChange.bind(this));
    
    // Initialize storage mode based on wallet status
    this.initializeStorageMode();
  }

  private async initializeStorageMode(): Promise<void> {
    const walletStatus = this.walletManager.getConnectionStatus();
    if (walletStatus.connected && this.icpService.isActorConnected()) {
      this.storageMode = 'hybrid';
    } else {
      this.storageMode = 'local';
    }
  }

  private handleWalletStatusChange(status: WalletStatus): void {
    if (status.connected && this.icpService.isActorConnected()) {
      this.setStorageMode('hybrid');
    } else {
      this.setStorageMode('local');
    }
  }

  // Storage Strategy
  setStorageMode(mode: StorageMode): void {
    const previousMode = this.storageMode;
    this.storageMode = mode;
    
    console.log(`Storage mode changed from ${previousMode} to ${mode}`);
    
    // Auto-sync when switching to hybrid or blockchain mode
    if ((mode === 'hybrid' || mode === 'blockchain') && previousMode === 'local') {
      this.syncToBlockchain().catch(error => {
        console.warn('Auto-sync failed:', error);
      });
    }
  }

  getStorageMode(): StorageMode {
    return this.storageMode;
  }  
// Banking Operations
  async getBalance(): Promise<number> {
    try {
      switch (this.storageMode) {
        case 'blockchain':
          return await this.icpService.getBalance();
        
        case 'hybrid':
          // Try blockchain first, fallback to local
          try {
            return await this.icpService.getBalance();
          } catch (error) {
            console.warn('Blockchain balance fetch failed, using local:', error);
            return this.getLocalBalance();
          }
        
        case 'local':
        default:
          return this.getLocalBalance();
      }
    } catch (error) {
      console.error('Failed to get balance:', error);
      // Always fallback to local storage
      return this.getLocalBalance();
    }
  }

  async deposit(amount: number): Promise<boolean> {
    try {
      switch (this.storageMode) {
        case 'blockchain':
          return await this.depositToBlockchain(amount);
        
        case 'hybrid':
          // Try blockchain first, fallback to local
          try {
            const result = await this.depositToBlockchain(amount);
            if (result) {
              // Also update local storage for consistency
              this.depositToLocal(amount, 'blockchain');
            }
            return result;
          } catch (error) {
            console.warn('Blockchain deposit failed, using local:', error);
            return this.depositToLocal(amount, 'local');
          }
        
        case 'local':
        default:
          return this.depositToLocal(amount, 'local');
      }
    } catch (error) {
      console.error('Failed to deposit:', error);
      return false;
    }
  }

  async withdraw(amount: number): Promise<boolean> {
    try {
      switch (this.storageMode) {
        case 'blockchain':
          return await this.withdrawFromBlockchain(amount);
        
        case 'hybrid':
          // Try blockchain first, fallback to local
          try {
            const result = await this.withdrawFromBlockchain(amount);
            if (result) {
              // Also update local storage for consistency
              this.withdrawFromLocal(amount, 'blockchain');
            }
            return result;
          } catch (error) {
            console.warn('Blockchain withdrawal failed, using local:', error);
            return this.withdrawFromLocal(amount, 'local');
          }
        
        case 'local':
        default:
          return this.withdrawFromLocal(amount, 'local');
      }
    } catch (error) {
      console.error('Failed to withdraw:', error);
      return false;
    }
    }  
  // Local Storage Operations
  private getLocalData(): LocalFinancialData {
    try {
      const data = localStorage.getItem(this.localStorageKey);
      if (data) {
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Failed to parse local financial data:', error);
    }
    
    return {
      balance: 0,
      transactions: [],
      lastUpdated: Date.now()
    };
  }

  private saveLocalData(data: LocalFinancialData): void {
    try {
      data.lastUpdated = Date.now();
      localStorage.setItem(this.localStorageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save local financial data:', error);
    }
  }

  private getLocalBalance(): number {
    return this.getLocalData().balance;
  }

  private depositToLocal(amount: number, source: 'local' | 'blockchain'): boolean {
    try {
      const data = this.getLocalData();
      data.balance += amount;
      
      const transaction: LocalTransaction = {
        id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'deposit',
        amount,
        timestamp: Date.now(),
        source,
        syncStatus: source === 'local' ? 'pending' : 'synced'
      };
      
      data.transactions.push(transaction);
      this.saveLocalData(data);
      return true;
    } catch (error) {
      console.error('Local deposit failed:', error);
      return false;
    }
  }

  private withdrawFromLocal(amount: number, source: 'local' | 'blockchain'): boolean {
    try {
      const data = this.getLocalData();
      
      if (data.balance < amount) {
        return false; // Insufficient funds
      }
      
      data.balance -= amount;
      
      const transaction: LocalTransaction = {
        id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'withdraw',
        amount,
        timestamp: Date.now(),
        source,
        syncStatus: source === 'local' ? 'pending' : 'synced'
      };
      
      data.transactions.push(transaction);
      this.saveLocalData(data);
      return true;
    } catch (error) {
      console.error('Local withdrawal failed:', error);
      return false;
    }
  }  // Blockchain Operations
  private async depositToBlockchain(amount: number): Promise<boolean> {
    const result: TransactionResult = await this.icpService.deposit(amount);
    return result.success;
  }

  private async withdrawFromBlockchain(amount: number): Promise<boolean> {
    const result: TransactionResult = await this.icpService.withdraw(amount);
    return result.success;
  }

  // Data Synchronization
  async syncToBlockchain(): Promise<SyncResult> {
    if (this.syncInProgress) {
      return {
        success: false,
        syncedTransactions: 0,
        conflicts: 0,
        error: 'Sync already in progress'
      };
    }

    this.syncInProgress = true;

    try {
      const localData = this.getLocalData();
      const pendingTransactions = localData.transactions.filter(t => t.syncStatus === 'pending');
      
      let syncedCount = 0;
      let conflicts = 0;

      // Get current blockchain balance for conflict detection
      let blockchainBalance = 0;
      try {
        blockchainBalance = await this.icpService.getBalance();
      } catch (error) {
        console.warn('Could not fetch blockchain balance for sync:', error);
      }

      // Check for conflicts
      if (Math.abs(localData.balance - blockchainBalance) > 0.01) {
        conflicts++;
        console.warn(`Balance conflict detected: Local=${localData.balance}, Blockchain=${blockchainBalance}`);
      }

      // Sync pending transactions
      for (const transaction of pendingTransactions) {
        try {
          let result: TransactionResult;
          
          if (transaction.type === 'deposit') {
            result = await this.icpService.deposit(transaction.amount);
          } else {
            result = await this.icpService.withdraw(transaction.amount);
          }

          if (result.success) {
            // Update transaction status
            transaction.syncStatus = 'synced';
            transaction.source = 'blockchain';
            syncedCount++;
          } else {
            transaction.syncStatus = 'failed';
            console.error(`Failed to sync transaction ${transaction.id}:`, result.error);
          }
        } catch (error) {
          transaction.syncStatus = 'failed';
          console.error(`Error syncing transaction ${transaction.id}:`, error);
        }
      }

      // Save updated local data
      this.saveLocalData(localData);

      return {
        success: true,
        syncedTransactions: syncedCount,
        conflicts
      };
    } catch (error) {
      return {
        success: false,
        syncedTransactions: 0,
        conflicts: 0,
        error: `Sync failed: ${error}`
      };
    } finally {
      this.syncInProgress = false;
    }
  }

  async syncFromBlockchain(): Promise<SyncResult> {
    if (this.syncInProgress) {
      return {
        success: false,
        syncedTransactions: 0,
        conflicts: 0,
        error: 'Sync already in progress'
      };
    }

    this.syncInProgress = true;

    try {
      // Get blockchain data
      const blockchainBalance = await this.icpService.getBalance();
      const blockchainTransactions = await this.icpService.getTransactionHistory();
      
      const localData = this.getLocalData();
      let conflicts = 0;
      let syncedCount = 0;

      // Check for balance conflicts
      if (Math.abs(localData.balance - blockchainBalance) > 0.01) {
        conflicts++;
        console.warn(`Balance conflict: Local=${localData.balance}, Blockchain=${blockchainBalance}`);
        
        // Resolve conflict by using blockchain balance
        localData.balance = blockchainBalance;
      }

      // Sync transactions from blockchain
      for (const blockchainTx of blockchainTransactions) {
        const existingTx = localData.transactions.find(t => 
          t.timestamp === blockchainTx.timestamp && 
          t.amount === blockchainTx.amount && 
          t.type === blockchainTx.type
        );

        if (!existingTx) {
          // Add new transaction from blockchain
          const localTx: LocalTransaction = {
            id: blockchainTx.id,
            type: blockchainTx.type,
            amount: blockchainTx.amount,
            timestamp: blockchainTx.timestamp,
            source: 'blockchain',
            syncStatus: 'synced'
          };
          
          localData.transactions.push(localTx);
          syncedCount++;
        }
      }

      // Sort transactions by timestamp
      localData.transactions.sort((a, b) => b.timestamp - a.timestamp);

      // Save updated local data
      this.saveLocalData(localData);

      return {
        success: true,
        syncedTransactions: syncedCount,
        conflicts
      };
    } catch (error) {
      return {
        success: false,
        syncedTransactions: 0,
        conflicts: 0,
        error: `Sync from blockchain failed: ${error}`
      };
    } finally {
      this.syncInProgress = false;
    }
  }

  // Conflict Resolution
  async resolveConflicts(localData: LocalFinancialData, blockchainData: any): Promise<LocalFinancialData> {
    // Simple conflict resolution: blockchain data takes precedence
    // In a real implementation, you might want to show UI for user to choose
    
    const resolved: LocalFinancialData = {
      balance: blockchainData.balance || localData.balance,
      transactions: [...localData.transactions],
      lastUpdated: Date.now()
    };

    // Mark conflicting local transactions
    resolved.transactions.forEach(tx => {
      if (tx.source === 'local' && tx.syncStatus === 'pending') {
        // These transactions need to be re-synced
        tx.syncStatus = 'failed';
      }
    });

    return resolved;
  }

  // Utility methods
  isSyncInProgress(): boolean {
    return this.syncInProgress;
  }

  getLocalTransactions(): LocalTransaction[] {
    return this.getLocalData().transactions;
  }

  getPendingTransactions(): LocalTransaction[] {
    return this.getLocalData().transactions.filter(t => t.syncStatus === 'pending');
  }

  getFailedTransactions(): LocalTransaction[] {
    return this.getLocalData().transactions.filter(t => t.syncStatus === 'failed');
  }
}