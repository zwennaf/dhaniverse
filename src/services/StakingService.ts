/**
 * ICP Staking Service (REMOVED)
 *
 * A minimal stub that keeps the module importable. All methods either return
 * empty values or throw a clear error stating the feature was removed.
 */

export type StakingPool = any;
export type StakingReward = any;
export type StakingStats = any;

export class StakingService {
    async initialize(): Promise<void> { return; }
    getStakingPools(): StakingPool[] { return []; }
    getAllUserStakes(): any[] { return []; }
    getStakingStats(): StakingStats { return { totalValueStaked: 0, totalRewardsEarned: 0, activeStakes: 0, averageAPY: 0, portfolioValue: 0 }; }
    async stakeTokens(..._: any[]): Promise<never> { throw new Error('Staking feature has been removed'); }
    async unstakeTokens(..._: any[]): Promise<never> { throw new Error('Staking feature has been removed'); }
    async claimRewards(..._: any[]): Promise<never> { throw new Error('Staking feature has been removed'); }
    calculateRewards(_: any) { return 0; }
    onStakingUpdate(_: any) { return () => {}; }
    onPoolUpdate(_: any) { return () => {}; }
    onRewardUpdate(_: any) { return () => {}; }
    toggleAutoClaim(_: any) { /* noop */ }
}

export const stakingService = new StakingService();
