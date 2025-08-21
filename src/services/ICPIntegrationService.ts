/**
 * ICP Integration Service
 * Comprehensive service that manages all ICP integrations for the frontend
 */

import { icpBalanceManager, ICPToken } from './TestnetBalanceManager';
import { stakingService, StakingPool, UserStake, StakingStats } from './StakingService';

// Import canister declarations
import { 
    dhaniverse_backend, 
    canisterId as backendCanisterId,
    createActor
} from '../../packages/icp-canister/src/declarations/dhaniverse_backend';

export interface ICPIntegrationConfig {
    canisterId?: string;
    identityProvider?: string;
    enableStaking?: boolean;
    enableWeb3Wallets?: boolean;
    network?: 'local' | 'ic' | 'testnet';
}

export interface ICPConnectionStatus {
    isConnected: boolean;
    isAuthenticated: boolean;
    walletAddress: string;
    connectionType: 'internet-identity' | 'web3-wallet' | 'none';
    network: string;
}

export class ICPIntegrationService {
    private isInitialized = false;
    private connectionListeners: Set<(status: ICPConnectionStatus) => void> = new Set();
    private config: ICPIntegrationConfig = {
        enableStaking: true,
        enableWeb3Wallets: true,
        network: process.env.NODE_ENV === 'development' ? 'local' : 'ic'
    };
    private actor: any = null;

    constructor(config?: ICPIntegrationConfig) {
        if (config) {
            this.config = { ...this.config, ...config };
        }
        
        // Use the canister ID from declarations or config
        this.config.canisterId = this.config.canisterId || backendCanisterId || 'dzbzg-eqaaa-aaaap-an3rq-cai';
        
        console.log('ICPIntegrationService initialized with config:', this.config);
    }

    // Initialize the entire ICP integration
    async initialize(): Promise<boolean> {
        if (this.isInitialized) return true;

        try {
            console.log('Initializing ICP Integration Service...');

            // Initialize balance manager
            await icpBalanceManager.initialize();

            // Initialize staking service if enabled
            if (this.config.enableStaking) {
                await stakingService.initialize();
            }

            // Set up connection status monitoring
            this.setupConnectionMonitoring();

            this.isInitialized = true;
            console.log('ICP Integration Service initialized successfully');

            // Notify listeners of initial state
            this.notifyConnectionListeners();

            return true;
        } catch (error) {
            console.error('Failed to initialize ICP Integration Service:', error);
            return false;
        }
    }

    // Authenticate with Internet Identity
    async authenticateWithInternetIdentity(): Promise<boolean> {
        try {
            const success = await icpBalanceManager.authenticateWithII();
            if (success) {
                this.notifyConnectionListeners();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Internet Identity authentication failed:', error);
            return false;
        }
    }

    // Connect with Web3 wallet (MetaMask, etc.)
    async connectWeb3Wallet(walletType: string, address: string, chainId: string): Promise<boolean> {
        if (!this.config.enableWeb3Wallets) {
            console.warn('Web3 wallet connections are disabled');
            return false;
        }

        try {
            const success = await icpBalanceManager.connectWeb3Wallet(walletType, address, chainId);
            if (success) {
                this.notifyConnectionListeners();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Web3 wallet connection failed:', error);
            return false;
        }
    }

    // Get current connection status
    getConnectionStatus(): ICPConnectionStatus {
        const isAuthenticated = icpBalanceManager.isAuthenticated();
        const walletAddress = icpBalanceManager.getWalletAddress();
        
        return {
            isConnected: !!walletAddress,
            isAuthenticated,
            walletAddress,
            connectionType: walletAddress.includes('-') ? 'internet-identity' : 
                           walletAddress.startsWith('0x') ? 'web3-wallet' : 'none',
            network: icpBalanceManager.getCurrentNetwork().name
        };
    }

    // Disconnect from current session
    async disconnect(): Promise<void> {
        try {
            await icpBalanceManager.logout();
            this.notifyConnectionListeners();
        } catch (error) {
            console.error('Disconnect failed:', error);
        }
    }

    // Get all tokens
    getTokens(): ICPToken[] {
        return icpBalanceManager.getAllTokens();
    }

    // Get dual balance (rupees + tokens)
    async getDualBalance() {
        return await icpBalanceManager.getDualBalance();
    }

    // Exchange currency
    async exchangeCurrency(fromCurrency: string, toCurrency: string, amount: number): Promise<boolean> {
        return await icpBalanceManager.exchangeCurrency(fromCurrency, toCurrency, amount);
    }

    // Request faucet tokens (for testing)
    async requestFaucetTokens(tokenSymbol: string, amount: string): Promise<boolean> {
        return await icpBalanceManager.requestFromFaucet(tokenSymbol, amount);
    }

    // Staking Methods (if enabled)
    getStakingPools(): StakingPool[] {
        if (!this.config.enableStaking) return [];
        return stakingService.getStakingPools();
    }

    getUserStakes(): UserStake[] {
        if (!this.config.enableStaking) return [];
        return stakingService.getUserStakes();
    }

    async stakeTokens(poolId: string, amount: string): Promise<boolean> {
        if (!this.config.enableStaking) {
            console.warn('Staking is disabled');
            return false;
        }
        return await stakingService.stakeTokens(poolId, amount);
    }

    async unstakeTokens(stakeId: string): Promise<boolean> {
        if (!this.config.enableStaking) {
            console.warn('Staking is disabled');
            return false;
        }
        return await stakingService.unstakeTokens(stakeId);
    }

    async claimRewards(stakeId: string): Promise<boolean> {
        if (!this.config.enableStaking) {
            console.warn('Staking is disabled');
            return false;
        }
        return await stakingService.claimRewards(stakeId);
    }

    getStakingStats(): StakingStats {
        if (!this.config.enableStaking) {
            return {
                totalValueStaked: 0,
                totalRewardsEarned: 0,
                activeStakes: 0,
                averageAPY: 0,
                portfolioValue: 0
            };
        }
        return stakingService.getStakingStats();
    }

    // Advanced ICP features
    async getCanisterStatus(): Promise<any> {
        try {
            if (dhaniverse_backend) {
                // Call a health check method if available
                return await dhaniverse_backend.health_check?.();
            }
            return null;
        } catch (error) {
            console.error('Canister status check failed:', error);
            return null;
        }
    }

    async syncWithCanister(): Promise<boolean> {
        try {
            if (!icpBalanceManager.isAuthenticated()) {
                console.warn('Not authenticated, cannot sync with canister');
                return false;
            }

            // Refresh balances from canister
            await icpBalanceManager.refreshAllBalances();

            // Sync staking data if enabled
            if (this.config.enableStaking && dhaniverse_backend) {
                try {
                    const canisterStakes = await dhaniverse_backend.get_staking_info(
                        icpBalanceManager.getWalletAddress()
                    );
                    
                    if (canisterStakes && Array.isArray(canisterStakes)) {
                        // Update local stakes with canister data
                        console.log('Synced staking data from canister:', canisterStakes.length, 'stakes');
                    }
                } catch (stakingError) {
                    console.warn('Failed to sync staking data:', stakingError);
                }
            }

            return true;
        } catch (error) {
            console.error('Canister sync failed:', error);
            return false;
        }
    }

    // Event listeners
    onConnectionChange(callback: (status: ICPConnectionStatus) => void) {
        this.connectionListeners.add(callback);
        return () => this.connectionListeners.delete(callback);
    }

    onBalanceUpdate(callback: (tokens: ICPToken[]) => void) {
        return icpBalanceManager.onBalanceUpdate(callback);
    }

    onStakingUpdate(callback: (stakes: UserStake[]) => void) {
        if (!this.config.enableStaking) {
            return () => {};
        }
        return stakingService.onStakingUpdate(callback);
    }

    // Utility methods
    getTotalPortfolioValue(): number {
        const tokenValue = icpBalanceManager.getTotalPortfolioValue();
        const stakingValue = this.config.enableStaking ? stakingService.getStakingStats().portfolioValue : 0;
        return tokenValue + stakingValue;
    }

    exportAllData() {
        return {
            balanceManager: icpBalanceManager.exportData(),
            staking: this.config.enableStaking ? stakingService.getStakingStats() : null,
            config: this.config,
            exportDate: new Date().toISOString()
        };
    }

    async importAllData(data: any) {
        try {
            if (data.balanceManager) {
                icpBalanceManager.importData(data.balanceManager);
            }
            
            if (data.config) {
                this.config = { ...this.config, ...data.config };
            }

            this.notifyConnectionListeners();
            return true;
        } catch (error) {
            console.error('Import failed:', error);
            return false;
        }
    }

    clearAllData() {
        icpBalanceManager.clearAllData();
        if (this.config.enableStaking) {
            stakingService.clearAllData();
        }
        this.notifyConnectionListeners();
    }

    // Private methods
    private setupConnectionMonitoring() {
        // Monitor balance changes to detect connection status changes
        icpBalanceManager.onBalanceUpdate(() => {
            this.notifyConnectionListeners();
        });
    }

    private notifyConnectionListeners() {
        const status = this.getConnectionStatus();
        this.connectionListeners.forEach(callback => callback(status));
    }

    // Static convenience methods
    static async createAndInitialize(config?: ICPIntegrationConfig): Promise<ICPIntegrationService> {
        const service = new ICPIntegrationService(config);
        await service.initialize();
        return service;
    }
}

// Singleton instance for global use
export const icpIntegration = new ICPIntegrationService();

// Auto-initialize when module is imported (can be disabled by setting config)
if (typeof window !== 'undefined') {
    // Only initialize in browser environment
    icpIntegration.initialize().catch(console.error);
}
