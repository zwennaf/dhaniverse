import { ICPActorService } from './ICPActorService';
import { WalletManager } from './WalletManager';

export type StorageMode = 'local' | 'blockchain' | 'hybrid';

export interface SyncResult {
    success: boolean;
    syncedTransactions: number;
    conflicts: number;
    error?: string;
}

export class DualStorageManager {
    private icpService: ICPActorService;
    private walletManager: WalletManager;
    private storageMode: StorageMode = 'local';

    constructor(icpService: ICPActorService, walletManager: WalletManager) {
        this.icpService = icpService;
        this.walletManager = walletManager;
    }

    // Set storage mode
    setStorageMode(mode: StorageMode): void {
        this.storageMode = mode;
        localStorage.setItem('dhaniverse_storage_mode', mode);
    }

    // Get current storage mode
    getStorageMode(): StorageMode {
        const stored = localStorage.getItem('dhaniverse_storage_mode');
        return (stored as StorageMode) || 'local';
    }

    // Sync data to blockchain
    async syncToBlockchain(): Promise<SyncResult> {
        try {
            if (!this.walletManager.getConnectionStatus().connected) {
                return {
                    success: false,
                    syncedTransactions: 0,
                    conflicts: 0,
                    error: 'Wallet not connected'
                };
            }

            if (!this.icpService.isActorConnected()) {
                return {
                    success: false,
                    syncedTransactions: 0,
                    conflicts: 0,
                    error: 'ICP service not connected'
                };
            }

            // Simulate sync process
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Get local data
            const localData = this.getLocalBankingData();
            
            // Simulate syncing transactions
            const syncedTransactions = localData.transactions?.length || 0;
            
            // Mark as synced
            localStorage.setItem('dhaniverse_last_sync', Date.now().toString());

            return {
                success: true,
                syncedTransactions,
                conflicts: 0
            };
        } catch (error) {
            return {
                success: false,
                syncedTransactions: 0,
                conflicts: 0,
                error: String(error)
            };
        }
    }

    // Get local banking data
    private getLocalBankingData(): any {
        try {
            const bankData = localStorage.getItem('dhaniverse_bank_account');
            const fdData = localStorage.getItem('dhaniverse_fixed_deposits');
            const web3Data = localStorage.getItem('dhaniverse_web3_banking');
            
            return {
                bankAccount: bankData ? JSON.parse(bankData) : null,
                fixedDeposits: fdData ? JSON.parse(fdData) : [],
                web3Banking: web3Data ? JSON.parse(web3Data) : null,
                transactions: []
            };
        } catch (error) {
            console.warn('Failed to load local banking data:', error);
            return { transactions: [] };
        }
    }

    // Check if data needs sync
    needsSync(): boolean {
        const lastSync = localStorage.getItem('dhaniverse_last_sync');
        if (!lastSync) return true;
        
        const lastSyncTime = parseInt(lastSync);
        const now = Date.now();
        const hoursSinceSync = (now - lastSyncTime) / (1000 * 60 * 60);
        
        return hoursSinceSync > 1; // Sync if more than 1 hour
    }

    // Get sync status
    getSyncStatus(): { lastSync: number | null; needsSync: boolean } {
        const lastSync = localStorage.getItem('dhaniverse_last_sync');
        return {
            lastSync: lastSync ? parseInt(lastSync) : null,
            needsSync: this.needsSync()
        };
    }

    // Get balance - combining local and blockchain data based on mode
    async getBalance(): Promise<number> {
        try {
            if (this.storageMode === 'blockchain' && this.icpService.isActorConnected()) {
                const balanceData = await this.icpService.getBalance();
                return balanceData.balance;
            }
            
            // Default to local storage for 'local', 'hybrid', or when blockchain unavailable
            const localData = this.getLocalBankingData();
            return localData.bankAccount?.balance || 10000; // Updated default starting balance to match new minimum deposit
        } catch (error) {
            console.error('Failed to get balance:', error);
            return 0;
        }
    }

    // Deposit money
    async deposit(amount: number): Promise<boolean> {
        try {
            if (amount <= 0) {
                throw new Error('Invalid deposit amount');
            }

            if (this.storageMode === 'blockchain' && this.icpService.isActorConnected()) {
                const result = await this.icpService.deposit(amount);
                return result.success;
            }
            
            // Default to local storage for 'local', 'hybrid', or when blockchain unavailable
            const localData = this.getLocalBankingData();
            const currentBalance = localData.bankAccount?.balance || 10000;
            const newBalance = currentBalance + amount;
            
            const updatedAccount = {
                ...localData.bankAccount,
                balance: newBalance,
                lastUpdated: Date.now()
            };
            
            localStorage.setItem('dhaniverse_bank_account', JSON.stringify(updatedAccount));
            return true;
        } catch (error) {
            console.error('Failed to deposit:', error);
            return false;
        }
    }

    // Withdraw money
    async withdraw(amount: number): Promise<boolean> {
        try {
            if (amount <= 0) {
                throw new Error('Invalid withdrawal amount');
            }

            const currentBalance = await this.getBalance();
            if (currentBalance < amount) {
                throw new Error('Insufficient balance');
            }

            if (this.storageMode === 'blockchain' && this.icpService.isActorConnected()) {
                const result = await this.icpService.withdraw(amount);
                return result.success;
            }
            
            // Default to local storage for 'local', 'hybrid', or when blockchain unavailable
            const localData = this.getLocalBankingData();
            const newBalance = currentBalance - amount;
            
            const updatedAccount = {
                ...localData.bankAccount,
                balance: newBalance,
                lastUpdated: Date.now()
            };
            
            localStorage.setItem('dhaniverse_bank_account', JSON.stringify(updatedAccount));
            return true;
        } catch (error) {
            console.error('Failed to withdraw:', error);
            return false;
        }
    }
}