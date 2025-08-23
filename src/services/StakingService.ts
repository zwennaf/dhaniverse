/**
 * ICP Staking Service
 * Handles staking operations, rewards calculation, and ICP canister interactions
 */

import { icpBalanceManager, ICPTransaction } from './TestnetBalanceManager';
import { dhaniverse_backend } from '../../packages/icp-canister/src/declarations/dhaniverse_backend';

export interface StakingPool {
    id: string;
    name: string;
    tokenSymbol: string;
    contractAddress: string;
    apy: number; // Annual Percentage Yield
    minimumStake: string;
    maximumStake?: string;
    lockPeriod: number; // in days
    totalStaked: string;
    totalParticipants: number;
    isActive: boolean;
    description: string;
    riskLevel: 'low' | 'medium' | 'high';
    rewardTokenSymbol?: string; // Different token for rewards
}

export interface UserStake {
    id: string;
    poolId: string;
    amount: string;
    tokenSymbol: string;
    stakedAt: Date;
    lastClaimAt: Date;
    lockExpiresAt: Date;
    accumulatedRewards: string;
    status: 'active' | 'unstaking' | 'completed';
    autoClaim: boolean;
}

export interface StakingReward {
    id: string;
    stakeId: string;
    amount: string;
    tokenSymbol: string;
    claimedAt: Date;
    transactionHash?: string;
}

export interface StakingStats {
    totalValueStaked: number;
    totalRewardsEarned: number;
    activeStakes: number;
    averageAPY: number;
    portfolioValue: number;
}

// Default staking pools
const DEFAULT_STAKING_POOLS: StakingPool[] = [
    {
        id: 'usdc_stable',
        name: 'USDC Stable Pool',
        tokenSymbol: 'USDC',
        contractAddress: '0x1234567890123456789012345678901234567890',
        apy: 8.5,
        minimumStake: '100',
        maximumStake: '10000',
        lockPeriod: 30,
        totalStaked: '100',
        totalParticipants: 847,
        isActive: true,
        description: 'Low-risk staking pool for USDC with stable returns',
        riskLevel: 'low',
        rewardTokenSymbol: 'USDC'
    },
    {
        id: 'dai_yield',
        name: 'DAI High Yield',
        tokenSymbol: 'DAI',
        contractAddress: '0x2345678901234567890123456789012345678901',
        apy: 12.3,
        minimumStake: '50',
        maximumStake: '5000',
        lockPeriod: 60,
        totalStaked: '890000',
        totalParticipants: 523,
        isActive: true,
        description: 'Higher yield DAI staking with 60-day lock period',
        riskLevel: 'medium',
        rewardTokenSymbol: 'DAI'
    },
    {
        id: 'eth_rewards',
        name: 'ETH Staking Rewards',
        tokenSymbol: 'ETH',
        contractAddress: '0x3456789012345678901234567890123456789012',
        apy: 15.7,
        minimumStake: '0.1',
        lockPeriod: 90,
        totalStaked: '12450',
        totalParticipants: 1247,
        isActive: true,
        description: 'High-yield ETH staking with premium rewards',
        riskLevel: 'high',
        rewardTokenSymbol: 'ETH'
    }
];

export class StakingService {
    private stakingPools: Map<string, StakingPool> = new Map();
    private userStakes: UserStake[] = [];
    private rewards: StakingReward[] = [];
    private stakingListeners: Set<(stakes: UserStake[]) => void> = new Set();
    private rewardListeners: Set<(reward: StakingReward) => void> = new Set();
    private poolListeners: Set<(pools: StakingPool[]) => void> = new Set();
    private isInitialized = false;

    constructor() {
        this.initializeDefaultPools();
        this.loadFromStorage();
        this.startRewardCalculation();
    }

    private initializeDefaultPools() {
        DEFAULT_STAKING_POOLS.forEach(pool => {
            this.stakingPools.set(pool.id, { ...pool });
        });
    }

    private loadFromStorage() {
        try {
            const savedStakes = localStorage.getItem('user_stakes');
            const savedRewards = localStorage.getItem('staking_rewards');
            const savedPools = localStorage.getItem('staking_pools');

            if (savedStakes) {
                this.userStakes = JSON.parse(savedStakes).map((stake: any) => ({
                    ...stake,
                    stakedAt: new Date(stake.stakedAt),
                    lastClaimAt: new Date(stake.lastClaimAt),
                    lockExpiresAt: new Date(stake.lockExpiresAt)
                }));
            }

            if (savedRewards) {
                this.rewards = JSON.parse(savedRewards).map((reward: any) => ({
                    ...reward,
                    claimedAt: new Date(reward.claimedAt)
                }));
            }

            if (savedPools) {
                const parsedPools = JSON.parse(savedPools);
                parsedPools.forEach((pool: StakingPool) => {
                    this.stakingPools.set(pool.id, pool);
                });
            }
        } catch (error) {
            console.error('Failed to load staking data from storage:', error);
        }
    }

    private saveToStorage() {
        try {
            localStorage.setItem('user_stakes', JSON.stringify(this.userStakes));
            localStorage.setItem('staking_rewards', JSON.stringify(this.rewards));
            localStorage.setItem('staking_pools', JSON.stringify(Array.from(this.stakingPools.values())));
        } catch (error) {
            console.error('Failed to save staking data to storage:', error);
        }
    }

    // Initialize staking service
    async initialize() {
        if (this.isInitialized) return;
        
        try {
            // Initialize ICP balance manager
            await icpBalanceManager.initialize();
            this.isInitialized = true;
            console.log('StakingService initialized successfully');
        } catch (error) {
            console.error('Failed to initialize StakingService:', error);
        }
    }

    // Get all available staking pools
    getStakingPools(): StakingPool[] {
        return Array.from(this.stakingPools.values()).filter(pool => pool.isActive);
    }

    // Get a specific staking pool
    getStakingPool(poolId: string): StakingPool | undefined {
        return this.stakingPools.get(poolId);
    }

    // Get user's active stakes
    getUserStakes(): UserStake[] {
        return this.userStakes.filter(stake => stake.status === 'active');
    }

    // Get all user stakes (including completed)
    getAllUserStakes(): UserStake[] {
        return this.userStakes;
    }

    // Stake tokens in a pool
    async stakeTokens(poolId: string, amount: string): Promise<boolean> {
        try {
            const pool = this.stakingPools.get(poolId);
            if (!pool || !pool.isActive) {
                throw new Error('Invalid or inactive staking pool');
            }

            const stakeAmount = parseFloat(amount);
            const minimumStake = parseFloat(pool.minimumStake);
            const maximumStake = pool.maximumStake ? parseFloat(pool.maximumStake) : Infinity;

            if (stakeAmount < minimumStake) {
                throw new Error(`Minimum stake amount is ${pool.minimumStake} ${pool.tokenSymbol}`);
            }

            if (stakeAmount > maximumStake) {
                throw new Error(`Maximum stake amount is ${pool.maximumStake} ${pool.tokenSymbol}`);
            }

            // Check if user has sufficient balance
            const userTokens = icpBalanceManager.getAllTokens();
            const userToken = userTokens.find((token: any) => token.symbol === pool.tokenSymbol);
            const userBalance = parseFloat(userToken?.balance || '0');

            if (userBalance < stakeAmount) {
                throw new Error('Insufficient token balance');
            }

            // Create new stake
            const now = new Date();
            const lockExpiresAt = new Date(now.getTime() + pool.lockPeriod * 24 * 60 * 60 * 1000);

            const newStake: UserStake = {
                id: `stake_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                poolId,
                amount,
                tokenSymbol: pool.tokenSymbol,
                stakedAt: now,
                lastClaimAt: now,
                lockExpiresAt,
                accumulatedRewards: '0',
                status: 'active',
                autoClaim: false
            };

            // Try to call canister staking method
            try {
                if (dhaniverse_backend && icpBalanceManager.isAuthenticated()) {
                    // Call the canister staking method
                    const canisterResult = await dhaniverse_backend.stake_tokens(
                        icpBalanceManager.getWalletAddress(),
                        stakeAmount,
                        pool.lockPeriod
                    );
                    
                    // Handle the Result type from canister
                    if (canisterResult && 'Ok' in canisterResult) {
                        const stakingPool = canisterResult.Ok;
                        newStake.id = stakingPool.id || newStake.id;
                    }
                }
            } catch (canisterError) {
                console.warn('Canister staking failed, continuing with local state:', canisterError);
            }

            this.userStakes.push(newStake);

            // Update user balance (deduct staked amount)
            if (userToken) {
                userToken.balance = (userBalance - stakeAmount).toString();
            }

            // Add transaction record
            icpBalanceManager.addTransaction({
                type: 'transfer',  // Using 'transfer' instead of 'stake'
                tokenSymbol: pool.tokenSymbol,
                amount,
                to: pool.contractAddress,
                status: 'confirmed',
                network: icpBalanceManager.getCurrentNetwork().name
            });

            // Update pool stats
            pool.totalStaked = (parseFloat(pool.totalStaked) + stakeAmount).toString();
            pool.totalParticipants += 1;

            this.saveToStorage();
            this.notifyStakingListeners();
            this.notifyPoolListeners();

            return true;
        } catch (error) {
            console.error('Failed to stake tokens:', error);
            throw error;
        }
    }

    // Unstake tokens from a pool
    async unstakeTokens(stakeId: string): Promise<boolean> {
        try {
            const stake = this.userStakes.find(s => s.id === stakeId);
            if (!stake || stake.status !== 'active') {
                throw new Error('Invalid or inactive stake');
            }

            const now = new Date();
            if (now < stake.lockExpiresAt) {
                throw new Error('Stake is still locked');
            }

            const pool = this.stakingPools.get(stake.poolId);
            if (!pool) {
                throw new Error('Pool not found');
            }

            // Calculate final rewards
            const finalRewards = this.calculateRewards(stake);
            if (parseFloat(finalRewards) > 0) {
                await this.claimRewards(stakeId);
            }

            // Return staked amount to user balance
            const userTokens = icpBalanceManager.getAllTokens();
            const userToken = userTokens.find((token: any) => token.symbol === stake.tokenSymbol);
            if (userToken) {
                const currentBalance = parseFloat(userToken.balance);
                const stakeAmount = parseFloat(stake.amount);
                userToken.balance = (currentBalance + stakeAmount).toString();
            }

            // Update stake status
            stake.status = 'completed';

            // Add transaction record
            icpBalanceManager.addTransaction({
                type: 'transfer',  // Using 'transfer' instead of 'unstake'
                tokenSymbol: stake.tokenSymbol,
                amount: stake.amount,
                from: pool.contractAddress,
                status: 'confirmed',
                network: icpBalanceManager.getCurrentNetwork().name
            });

            // Update pool stats
            pool.totalStaked = (parseFloat(pool.totalStaked) - parseFloat(stake.amount)).toString();
            pool.totalParticipants = Math.max(0, pool.totalParticipants - 1);

            this.saveToStorage();
            this.notifyStakingListeners();
            this.notifyPoolListeners();

            return true;
        } catch (error) {
            console.error('Failed to unstake tokens:', error);
            throw error;
        }
    }

    // Calculate rewards for a stake
    calculateRewards(stake: UserStake): string {
        const pool = this.stakingPools.get(stake.poolId);
        if (!pool) return '0';

        const now = new Date();
        const stakeAmount = parseFloat(stake.amount);
        const timeDiff = now.getTime() - stake.lastClaimAt.getTime();
        const daysStaked = timeDiff / (1000 * 60 * 60 * 24);
        
        // APY to daily rate
        const dailyRate = pool.apy / 100 / 365;
        const rewards = stakeAmount * dailyRate * daysStaked;

        return Math.max(0, rewards).toFixed(6);
    }

    // Claim rewards for a stake
    async claimRewards(stakeId: string): Promise<boolean> {
        try {
            const stake = this.userStakes.find(s => s.id === stakeId);
            if (!stake || stake.status !== 'active') {
                throw new Error('Invalid or inactive stake');
            }

            const pool = this.stakingPools.get(stake.poolId);
            if (!pool) {
                throw new Error('Pool not found');
            }

            let rewardAmount = this.calculateRewards(stake);
            let rewardValue = parseFloat(rewardAmount);

            if (rewardValue <= 0) {
                throw new Error('No rewards to claim');
            }

            // Try to claim rewards from canister first
            try {
                if (dhaniverse_backend && icpBalanceManager.isAuthenticated()) {
                    const canisterResult = await dhaniverse_backend.claim_staking_rewards(
                        icpBalanceManager.getWalletAddress(),
                        stake.id
                    );
                    
                    if (canisterResult && 'Ok' in canisterResult) {
                        // Use the actual reward amount from canister
                        const actualReward = canisterResult.Ok;
                        if (actualReward > 0) {
                            // Update with canister reward amount
                            rewardAmount = actualReward.toString();
                            rewardValue = actualReward;
                        }
                    }
                }
            } catch (canisterError) {
                console.warn('Canister reward claim failed, using calculated amount:', canisterError);
            }

            // Create reward record
            const reward: StakingReward = {
                id: `reward_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                stakeId,
                amount: rewardAmount,
                tokenSymbol: pool.rewardTokenSymbol || pool.tokenSymbol,
                claimedAt: new Date()
            };

            this.rewards.push(reward);

            // Add rewards to user balance
            const userTokens = icpBalanceManager.getAllTokens();
            const rewardToken = userTokens.find((token: any) => 
                token.symbol === (pool.rewardTokenSymbol || pool.tokenSymbol)
            );
            
            if (rewardToken) {
                const currentBalance = parseFloat(rewardToken.balance);
                rewardToken.balance = (currentBalance + rewardValue).toString();
            }

            // Update stake
            stake.lastClaimAt = new Date();
            stake.accumulatedRewards = (parseFloat(stake.accumulatedRewards) + rewardValue).toString();

            // Add transaction record
            icpBalanceManager.addTransaction({
                type: 'transfer',  // Using 'transfer' instead of 'reward'
                tokenSymbol: pool.rewardTokenSymbol || pool.tokenSymbol,
                amount: rewardAmount,
                from: pool.contractAddress,
                status: 'confirmed',
                network: icpBalanceManager.getCurrentNetwork().name
            });

            this.saveToStorage();
            this.notifyStakingListeners();
            this.notifyRewardListeners(reward);

            return true;
        } catch (error) {
            console.error('Failed to claim rewards:', error);
            throw error;
        }
    }

    // Get user's staking statistics
    getStakingStats(): StakingStats {
        const activeStakes = this.getUserStakes();
        const totalValueStaked = activeStakes.reduce((total, stake) => {
            return total + parseFloat(stake.amount);
        }, 0);

        const totalRewardsEarned = this.rewards.reduce((total, reward) => {
            return total + parseFloat(reward.amount);
        }, 0);

        const averageAPY = activeStakes.length > 0 
            ? activeStakes.reduce((total, stake) => {
                const pool = this.stakingPools.get(stake.poolId);
                return total + (pool?.apy || 0);
            }, 0) / activeStakes.length
            : 0;

        return {
            totalValueStaked,
            totalRewardsEarned,
            activeStakes: activeStakes.length,
            averageAPY,
            portfolioValue: totalValueStaked + totalRewardsEarned
        };
    }

    // Get reward history
    getRewardHistory(limit?: number): StakingReward[] {
        const sortedRewards = this.rewards.sort((a, b) => 
            b.claimedAt.getTime() - a.claimedAt.getTime()
        );
        return limit ? sortedRewards.slice(0, limit) : sortedRewards;
    }

    // Toggle auto-claim for a stake
    toggleAutoClaim(stakeId: string): boolean {
        const stake = this.userStakes.find(s => s.id === stakeId);
        if (!stake) return false;

        stake.autoClaim = !stake.autoClaim;
        this.saveToStorage();
        this.notifyStakingListeners();
        return true;
    }

    // Start automatic reward calculation and claiming
    private startRewardCalculation() {
        setInterval(() => {
            this.userStakes.forEach(async stake => {
                if (stake.status === 'active' && stake.autoClaim) {
                    const rewards = this.calculateRewards(stake);
                    if (parseFloat(rewards) >= 0.001) { // Minimum threshold for auto-claim
                        try {
                            await this.claimRewards(stake.id);
                        } catch (error) {
                            console.error('Auto-claim failed:', error);
                        }
                    }
                }
            });
        }, 60000); // Check every minute
    }

    // Subscribe to staking updates
    onStakingUpdate(callback: (stakes: UserStake[]) => void) {
        this.stakingListeners.add(callback);
        return () => this.stakingListeners.delete(callback);
    }

    // Subscribe to reward updates
    onRewardUpdate(callback: (reward: StakingReward) => void) {
        this.rewardListeners.add(callback);
        return () => this.rewardListeners.delete(callback);
    }

    // Subscribe to pool updates
    onPoolUpdate(callback: (pools: StakingPool[]) => void) {
        this.poolListeners.add(callback);
        return () => this.poolListeners.delete(callback);
    }

    private notifyStakingListeners() {
        this.stakingListeners.forEach(callback => callback(this.userStakes));
    }

    private notifyRewardListeners(reward: StakingReward) {
        this.rewardListeners.forEach(callback => callback(reward));
    }

    private notifyPoolListeners() {
        const pools = this.getStakingPools();
        this.poolListeners.forEach(callback => callback(pools));
    }

    // Emergency unstake (with penalty)
    async emergencyUnstake(stakeId: string): Promise<boolean> {
        try {
            const stake = this.userStakes.find(s => s.id === stakeId);
            if (!stake || stake.status !== 'active') {
                throw new Error('Invalid or inactive stake');
            }

            const pool = this.stakingPools.get(stake.poolId);
            if (!pool) {
                throw new Error('Pool not found');
            }

            // Apply 10% penalty for early unstaking
            const penalty = 0.1;
            const stakeAmount = parseFloat(stake.amount);
            const penaltyAmount = stakeAmount * penalty;
            const returnAmount = stakeAmount - penaltyAmount;

            // Return reduced amount to user balance
            const userTokens = icpBalanceManager.getAllTokens();
            const userToken = userTokens.find((token: any) => token.symbol === stake.tokenSymbol);
            if (userToken) {
                const currentBalance = parseFloat(userToken.balance);
                userToken.balance = (currentBalance + returnAmount).toString();
            }

            // Update stake status
            stake.status = 'completed';

            // Add transaction record
            icpBalanceManager.addTransaction({
                type: 'transfer',  // Using 'transfer' instead of 'unstake'
                tokenSymbol: stake.tokenSymbol,
                amount: returnAmount.toString(),
                from: pool.contractAddress,
                status: 'confirmed',
                network: icpBalanceManager.getCurrentNetwork().name
            });

            this.saveToStorage();
            this.notifyStakingListeners();

            return true;
        } catch (error) {
            console.error('Emergency unstake failed:', error);
            throw error;
        }
    }

    // Clear all data
    clearAllData() {
        this.userStakes = [];
        this.rewards = [];
        this.saveToStorage();
        this.notifyStakingListeners();
    }
}

// Singleton instance
export const stakingService = new StakingService();
