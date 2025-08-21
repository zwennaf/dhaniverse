import { Web3WalletService, Web3Transaction } from './Web3WalletService';

export interface DualBalance {
    rupeesBalance: number;
    tokenBalance: number;
    lastUpdated: number;
}

export interface StakingPool {
    id: string;
    stakedAmount: number;
    apy: number;
    startDate: number;
    maturityDate: number;
    currentRewards: number;
    status: 'active' | 'matured' | 'claimed';
}

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
    category: 'trading' | 'saving' | 'staking' | 'learning';
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
    private stakingPools: StakingPool[] = [];
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

    // Token staking
    async stakeTokens(amount: number, duration: number): Promise<{ success: boolean; stakingPool?: StakingPool; error?: string }> {
        try {
            if (amount <= 0) {
                throw new Error('Staking amount must be positive');
            }

            if (this.dualBalance.tokenBalance < amount) {
                throw new Error('Insufficient token balance');
            }

            const apy = this.getStakingAPY(duration);
            const startDate = Date.now();
            const maturityDate = startDate + (duration * 24 * 60 * 60 * 1000);

            const stakingPool: StakingPool = {
                id: this.generateStakingId(),
                stakedAmount: amount,
                apy,
                startDate,
                maturityDate,
                currentRewards: 0,
                status: 'active'
            };

            this.dualBalance.tokenBalance -= amount;
            this.stakingPools.push(stakingPool);
            this.dualBalance.lastUpdated = Date.now();
            this.saveData();

            // Create transaction record
            await this.walletService.stakeTokens(amount, duration);

            // Check for achievements
            this.checkStakingAchievements();

            return { success: true, stakingPool };
        } catch (error) {
            return { success: false, error: String(error) };
        }
    }

    // Get staking information
    getStakingInfo(): StakingPool[] {
        // Update rewards for active pools
        this.updateStakingRewards();
        return [...this.stakingPools];
    }

    // Claim staking rewards
    async claimStakingRewards(stakingId: string): Promise<{ success: boolean; rewards?: number; error?: string }> {
        try {
            const pool = this.stakingPools.find(p => p.id === stakingId);
            if (!pool) {
                throw new Error('Staking pool not found');
            }

            if (pool.status !== 'active') {
                throw new Error('Staking pool is not active');
            }

            if (Date.now() < pool.maturityDate) {
                throw new Error('Staking period not completed');
            }

            const totalRewards = pool.stakedAmount + pool.currentRewards;
            this.dualBalance.tokenBalance += totalRewards;
            pool.status = 'claimed';
            this.dualBalance.lastUpdated = Date.now();
            this.saveData();

            return { success: true, rewards: totalRewards };
        } catch (error) {
            return { success: false, error: String(error) };
        }
    }

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
    private getStakingAPY(duration: number): number {
        switch (duration) {
            case 30: return 5;
            case 90: return 7;
            case 180: return 10;
            default: return 5;
        }
    }

    private updateStakingRewards(): void {
        const now = Date.now();
        
        this.stakingPools.forEach(pool => {
            if (pool.status === 'active') {
                const elapsed = now - pool.startDate;
                const totalDuration = pool.maturityDate - pool.startDate;
                const progress = Math.min(elapsed / totalDuration, 1);
                
                const totalRewards = (pool.stakedAmount * pool.apy / 100);
                pool.currentRewards = totalRewards * progress;
                
                if (now >= pool.maturityDate) {
                    pool.status = 'matured';
                }
            }
        });
    }

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
                id: 'first_stake',
                title: 'Staking Pioneer',
                description: 'Stake tokens for the first time',
                category: 'staking',
                rarity: 'common',
                unlocked: false,
                reward: { type: 'tokens', amount: 10 }
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
            {
                id: 'long_stake',
                title: 'Patient Investor',
                description: 'Stake tokens for 180 days',
                category: 'staking',
                rarity: 'epic',
                unlocked: false,
                reward: { type: 'rupees', amount: 5000 }
            },
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

    private checkStakingAchievements(): void {
        // First stake achievement
        const firstStake = this.achievements.find(a => a.id === 'first_stake');
        if (firstStake && !firstStake.unlocked) {
            firstStake.unlocked = true;
            firstStake.unlockedAt = Date.now();
        }
    }

    private generateStakingId(): string {
        return `stake_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private saveData(): void {
        const data = {
            dualBalance: this.dualBalance,
            stakingPools: this.stakingPools,
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
                if (data.stakingPools) this.stakingPools = data.stakingPools;
                if (data.achievements) this.achievements = data.achievements;
            }
        } catch (error) {
            console.warn('Failed to load stored Web3 banking data:', error);
        }
    }
}