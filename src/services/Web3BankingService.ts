import { Web3WalletService, Web3Transaction } from './Web3WalletService';

export interface DualBalance {
    rupeesBalance: number;
    tokenBalance: number;
    lastUpdated: number;
}

// staking removed

export interface ExchangeResult {
    success: boolean;
    fromAmount: number;
    toAmount: number;
    rate: number;
    transaction?: Web3Transaction;
    error?: string;
}

export interface Achievement {
    id: string;
    title: string;
    description: string;
    category: 'trading' | 'saving' | 'learning';
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    unlocked: boolean;
    unlockedAt?: number;
    reward?: {
        type: 'rupees' | 'tokens';
        amount: number;
    };
}

export class Web3BankingService {
    private walletService: Web3WalletService;
    private dualBalance: DualBalance;
    // staking removed
    private achievements: Achievement[] = [];
    private exchangeRate = 0.1; // 1 Rupee = 0.1 Token

    constructor(walletService: Web3WalletService) {
        this.walletService = walletService;
        this.dualBalance = {
            rupeesBalance: 0, // Starting balance
            tokenBalance: 0,
            lastUpdated: Date.now()
        };
        this.initializeAchievements();
        this.loadStoredData();
    }

    // Get dual currency balance
    getDualBalance(): DualBalance {
        return { ...this.dualBalance };
    }

    // Currency exchange
    async exchangeCurrency(
        fromCurrency: 'rupees' | 'tokens',
        toCurrency: 'rupees' | 'tokens',
        amount: number
    ): Promise<ExchangeResult> {
        try {
            if (fromCurrency === toCurrency) {
                throw new Error('Cannot exchange same currency');
            }

            if (amount <= 0) {
                throw new Error('Amount must be positive');
            }

            let fromAmount = amount;
            let toAmount: number;
            let rate: number;

            if (fromCurrency === 'rupees' && toCurrency === 'tokens') {
                if (this.dualBalance.rupeesBalance < amount) {
                    throw new Error('Insufficient rupees balance');
                }
                rate = this.exchangeRate;
                toAmount = amount * rate;
                
                this.dualBalance.rupeesBalance -= amount;
                this.dualBalance.tokenBalance += toAmount;
            } else {
                if (this.dualBalance.tokenBalance < amount) {
                    throw new Error('Insufficient token balance');
                }
                rate = 1 / this.exchangeRate;
                toAmount = amount * rate;
                
                this.dualBalance.tokenBalance -= amount;
                this.dualBalance.rupeesBalance += toAmount;
            }

            this.dualBalance.lastUpdated = Date.now();
            this.saveData();

            // Create transaction record
            const transaction = await this.walletService.exchangeCurrency(
                fromCurrency,
                toCurrency,
                amount
            );

            // Check for achievements
            this.checkExchangeAchievements();

            return {
                success: true,
                fromAmount,
                toAmount,
                rate,
                transaction
            };
        } catch (error) {
            return {
                success: false,
                fromAmount: 0,
                toAmount: 0,
                rate: 0,
                error: String(error)
            };
        }
    }

    // Token staking removed

    // Get achievements
    getAchievements(): Achievement[] {
        return [...this.achievements];
    }

    // Claim achievement reward
    async claimAchievementReward(achievementId: string): Promise<{ success: boolean; reward?: { type: string; amount: number }; error?: string }> {
        try {
            const achievement = this.achievements.find(a => a.id === achievementId);
            if (!achievement) {
                throw new Error('Achievement not found');
            }

            if (!achievement.unlocked) {
                throw new Error('Achievement not unlocked');
            }

            if (!achievement.reward) {
                throw new Error('No reward available');
            }

            // Apply reward
            if (achievement.reward.type === 'rupees') {
                this.dualBalance.rupeesBalance += achievement.reward.amount;
            } else {
                this.dualBalance.tokenBalance += achievement.reward.amount;
            }

            // Remove reward to prevent double claiming
            const reward = achievement.reward;
            achievement.reward = undefined;
            
            this.dualBalance.lastUpdated = Date.now();
            this.saveData();

            return { success: true, reward };
        } catch (error) {
            return { success: false, error: String(error) };
        }
    }

    // DeFi simulation operations
    async simulateLiquidityPool(amount: number): Promise<{ success: boolean; rewards?: number; error?: string }> {
        try {
            if (amount <= 0 || this.dualBalance.tokenBalance < amount) {
                throw new Error('Invalid amount or insufficient balance');
            }

            // Simulate liquidity pool rewards (5-15% APY)
            const apy = 0.05 + Math.random() * 0.1;
            const rewards = amount * apy * (30 / 365); // 30-day simulation
            
            this.dualBalance.tokenBalance += rewards;
            this.dualBalance.lastUpdated = Date.now();
            this.saveData();

            return { success: true, rewards };
        } catch (error) {
            return { success: false, error: String(error) };
        }
    }

    async simulateYieldFarming(amount: number): Promise<{ success: boolean; rewards?: number; error?: string }> {
        try {
            if (amount <= 0 || this.dualBalance.tokenBalance < amount) {
                throw new Error('Invalid amount or insufficient balance');
            }

            // Simulate yield farming rewards (10-25% APY)
            const apy = 0.1 + Math.random() * 0.15;
            const rewards = amount * apy * (7 / 365); // 7-day simulation
            
            this.dualBalance.tokenBalance += rewards;
            this.dualBalance.lastUpdated = Date.now();
            this.saveData();

            return { success: true, rewards };
        } catch (error) {
            return { success: false, error: String(error) };
        }
    }

    // Private helper methods
    // staking helper methods removed

    private initializeAchievements(): void {
        this.achievements = [
            {
                id: 'first_exchange',
                title: 'Currency Explorer',
                description: 'Complete your first currency exchange',
                category: 'trading',
                rarity: 'common',
                unlocked: false,
                reward: { type: 'rupees', amount: 1000 }
            },
            {
                id: 'big_exchange',
                title: 'High Roller',
                description: 'Exchange over 10,000 rupees in a single transaction',
                category: 'trading',
                rarity: 'rare',
                unlocked: false,
                reward: { type: 'tokens', amount: 50 }
            },
            // staking achievements removed
            {
                id: 'defi_master',
                title: 'DeFi Master',
                description: 'Complete all DeFi simulations',
                category: 'learning',
                rarity: 'legendary',
                unlocked: false,
                reward: { type: 'tokens', amount: 100 }
            }
        ];
    }

    private checkExchangeAchievements(): void {
        // First exchange achievement
        const firstExchange = this.achievements.find(a => a.id === 'first_exchange');
        if (firstExchange && !firstExchange.unlocked) {
            firstExchange.unlocked = true;
            firstExchange.unlockedAt = Date.now();
        }
    }

    // staking achievements removed

    private saveData(): void {
        const data = {
            dualBalance: this.dualBalance,
            achievements: this.achievements
        };
        localStorage.setItem('dhaniverse_web3_banking', JSON.stringify(data));
    }

    private loadStoredData(): void {
        try {
            const stored = localStorage.getItem('dhaniverse_web3_banking');
            if (stored) {
                const data = JSON.parse(stored);
                if (data.dualBalance) this.dualBalance = data.dualBalance;
                if (data.achievements) this.achievements = data.achievements;
            }
        } catch (error) {
            console.warn('Failed to load stored Web3 banking data:', error);
        }
    }
}