import { Web3BankingService, DualBalance, StakingPool, ExchangeResult, Achievement } from './Web3BankingService';
import { Web3WalletService } from './Web3WalletService';

export class ICPActorService {
    private web3BankingService: Web3BankingService | null = null;
    private canisterId: string;
    private connected = false;

    constructor(canisterId: string) {
        this.canisterId = canisterId;
    }

    // Connect with wallet identity
    async connect(walletService: Web3WalletService): Promise<boolean> {
        try {
            this.web3BankingService = new Web3BankingService(walletService);
            this.connected = true;
            return true;
        } catch (error) {
            console.error('Failed to connect ICP Actor Service:', error);
            return false;
        }
    }

    // Check if actor is connected
    isActorConnected(): boolean {
        return this.connected && this.web3BankingService !== null;
    }

    // Get dual balance (Rupees + Tokens)
    async getDualBalance(): Promise<DualBalance> {
        if (!this.web3BankingService) {
            throw new Error('Service not connected');
        }
        return this.web3BankingService.getDualBalance();
    }

    // Currency exchange
    async exchangeCurrency(
        fromCurrency: 'rupees' | 'tokens',
        toCurrency: 'rupees' | 'tokens',
        amount: number
    ): Promise<ExchangeResult> {
        if (!this.web3BankingService) {
            throw new Error('Service not connected');
        }
        return this.web3BankingService.exchangeCurrency(fromCurrency, toCurrency, amount);
    }

    // Token staking
    async stakeTokens(amount: number, duration: number): Promise<{ success: boolean; apy?: number; error?: string }> {
        if (!this.web3BankingService) {
            throw new Error('Service not connected');
        }
        
        const result = await this.web3BankingService.stakeTokens(amount, duration);
        return {
            success: result.success,
            apy: result.stakingPool?.apy,
            error: result.error
        };
    }

    // Get staking information
    async getStakingInfo(): Promise<StakingPool[]> {
        if (!this.web3BankingService) {
            throw new Error('Service not connected');
        }
        return this.web3BankingService.getStakingInfo();
    }

    // Claim staking rewards
    async claimStakingRewards(stakingId: string): Promise<{ success: boolean; rewards?: number; error?: string }> {
        if (!this.web3BankingService) {
            throw new Error('Service not connected');
        }
        return this.web3BankingService.claimStakingRewards(stakingId);
    }

    // Get achievements
    async getAchievements(): Promise<Achievement[]> {
        if (!this.web3BankingService) {
            throw new Error('Service not connected');
        }
        return this.web3BankingService.getAchievements();
    }

    // Claim achievement reward
    async claimAchievementReward(achievementId: string): Promise<{ success: boolean; reward?: { type: string; amount: number }; error?: string }> {
        if (!this.web3BankingService) {
            throw new Error('Service not connected');
        }
        return this.web3BankingService.claimAchievementReward(achievementId);
    }

    // DeFi simulation methods
    async simulateLiquidityPool(amount: number): Promise<{ success: boolean; rewards?: number; error?: string }> {
        if (!this.web3BankingService) {
            throw new Error('Service not connected');
        }
        return this.web3BankingService.simulateLiquidityPool(amount);
    }

    async simulateYieldFarming(amount: number): Promise<{ success: boolean; rewards?: number; error?: string }> {
        if (!this.web3BankingService) {
            throw new Error('Service not connected');
        }
        return this.web3BankingService.simulateYieldFarming(amount);
    }

    // Banking operations (for compatibility)
    async deposit(amount: number): Promise<{ success: boolean; newBalance?: number; error?: string }> {
        if (!this.web3BankingService) {
            throw new Error('Service not connected');
        }
        
        try {
            const balance = this.web3BankingService.getDualBalance();
            // Simulate deposit by adding to rupees balance
            const result = await this.web3BankingService.exchangeCurrency('tokens', 'rupees', 0);
            return {
                success: true,
                newBalance: balance.rupeesBalance + amount
            };
        } catch (error) {
            return {
                success: false,
                error: String(error)
            };
        }
    }

    async withdraw(amount: number): Promise<{ success: boolean; newBalance?: number; error?: string }> {
        if (!this.web3BankingService) {
            throw new Error('Service not connected');
        }
        
        try {
            const balance = this.web3BankingService.getDualBalance();
            if (balance.rupeesBalance < amount) {
                return {
                    success: false,
                    error: 'Insufficient balance'
                };
            }
            
            return {
                success: true,
                newBalance: balance.rupeesBalance - amount
            };
        } catch (error) {
            return {
                success: false,
                error: String(error)
            };
        }
    }

    async getBalance(): Promise<{ balance: number; lastUpdated: number }> {
        if (!this.web3BankingService) {
            throw new Error('Service not connected');
        }
        
        const dualBalance = this.web3BankingService.getDualBalance();
        return {
            balance: dualBalance.rupeesBalance + dualBalance.tokenBalance,
            lastUpdated: dualBalance.lastUpdated
        };
    }

    // Disconnect
    disconnect(): void {
        this.web3BankingService = null;
        this.connected = false;
    }
}