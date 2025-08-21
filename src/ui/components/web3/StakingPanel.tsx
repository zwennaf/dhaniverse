import React, { useState, useEffect } from 'react';
import { 
    Coins, 
    TrendingUp, 
    Lock, 
    Unlock, 
    Clock, 
    DollarSign, 
    Info, 
    Plus, 
    Minus,
    Target,
    AlertTriangle,
    CheckCircle,
    XCircle,
    RefreshCw,
    Settings,
    PieChart,
    BarChart3
} from 'lucide-react';
import { stakingService, StakingPool, UserStake, StakingStats } from '../../../services/StakingService';
import { icpIntegration } from '../../../services/ICPIntegrationService';
import { ICPToken } from '../../../services/TestnetBalanceManager';

interface StakingPanelProps {
    isOpen?: boolean;
    onClose?: () => void;
}

const StakingPanel: React.FC<StakingPanelProps> = ({ isOpen = false, onClose }) => {
    const [activeTab, setActiveTab] = useState<'pools' | 'stakes' | 'rewards' | 'stats'>('pools');
    const [stakingPools, setStakingPools] = useState<StakingPool[]>([]);
    const [userStakes, setUserStakes] = useState<UserStake[]>([]);
    const [userTokens, setUserTokens] = useState<ICPToken[]>([]);
    const [stakingStats, setStakingStats] = useState<StakingStats>({
        totalValueStaked: 0,
        totalRewardsEarned: 0,
        activeStakes: 0,
        averageAPY: 0,
        portfolioValue: 0
    });
    const [selectedPool, setSelectedPool] = useState<StakingPool | null>(null);
    const [stakeAmount, setStakeAmount] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [notification, setNotification] = useState<{
        type: 'success' | 'error' | 'info';
        message: string;
    } | null>(null);

    // Initialize services and load data
    useEffect(() => {
        const initializeData = async () => {
            await stakingService.initialize();
            await icpIntegration.initialize();
            
            loadStakingData();
        };

        initializeData();
    }, []);

    // Subscribe to updates
    useEffect(() => {
        const unsubscribeStaking = stakingService.onStakingUpdate(setUserStakes);
        const unsubscribePools = stakingService.onPoolUpdate(setStakingPools);
        const unsubscribeBalances = icpIntegration.onBalanceUpdate(setUserTokens);
        const unsubscribeRewards = stakingService.onRewardUpdate((reward) => {
            showNotification('success', `Claimed ${reward.amount} ${reward.tokenSymbol} rewards!`);
            loadStakingData();
        });

        return () => {
            unsubscribeStaking();
            unsubscribePools();
            unsubscribeBalances();
            unsubscribeRewards();
        };
    }, []);

    const loadStakingData = () => {
        setStakingPools(stakingService.getStakingPools());
        setUserStakes(stakingService.getAllUserStakes());
        setUserTokens(icpIntegration.getTokens());
        setStakingStats(stakingService.getStakingStats());
    };

    const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 5000);
    };

    const handleStake = async () => {
        if (!selectedPool || !stakeAmount) return;

        setIsLoading(true);
        try {
            await stakingService.stakeTokens(selectedPool.id, stakeAmount);
            showNotification('success', `Successfully staked ${stakeAmount} ${selectedPool.tokenSymbol}!`);
            setStakeAmount('');
            setSelectedPool(null);
        } catch (error) {
            showNotification('error', error instanceof Error ? error.message : 'Staking failed');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUnstake = async (stakeId: string) => {
        setIsLoading(true);
        try {
            await stakingService.unstakeTokens(stakeId);
            showNotification('success', 'Successfully unstaked tokens!');
        } catch (error) {
            showNotification('error', error instanceof Error ? error.message : 'Unstaking failed');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClaimRewards = async (stakeId: string) => {
        setIsLoading(true);
        try {
            await stakingService.claimRewards(stakeId);
        } catch (error) {
            showNotification('error', error instanceof Error ? error.message : 'Claiming rewards failed');
        } finally {
            setIsLoading(false);
        }
    };

    const getRiskColor = (riskLevel: string) => {
        switch (riskLevel) {
            case 'low': return 'text-green-400';
            case 'medium': return 'text-yellow-400';
            case 'high': return 'text-red-400';
            default: return 'text-gray-400';
        }
    };

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    const calculatePendingRewards = (stake: UserStake) => {
        return stakingService.calculateRewards(stake);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-lg shadow-2xl w-full max-w-6xl h-5/6 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <Coins className="h-8 w-8" />
                            <div>
                                <h2 className="text-2xl font-bold">Dhaniverse Staking</h2>
                                <p className="text-purple-200">Earn rewards by staking your tokens</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg p-2 transition-colors"
                        >
                            <XCircle className="h-6 w-6" />
                        </button>
                    </div>

                    {/* Portfolio Overview */}
                    <div className="grid grid-cols-4 gap-4 mt-6">
                        <div className="bg-white bg-opacity-10 rounded-lg p-4">
                            <div className="flex items-center space-x-2">
                                <DollarSign className="h-5 w-5" />
                                <span className="text-sm opacity-75">Total Staked</span>
                            </div>
                            <p className="text-xl font-bold">${stakingStats.totalValueStaked.toFixed(2)}</p>
                        </div>
                        <div className="bg-white bg-opacity-10 rounded-lg p-4">
                            <div className="flex items-center space-x-2">
                                <TrendingUp className="h-5 w-5" />
                                <span className="text-sm opacity-75">Total Rewards</span>
                            </div>
                            <p className="text-xl font-bold">${stakingStats.totalRewardsEarned.toFixed(2)}</p>
                        </div>
                        <div className="bg-white bg-opacity-10 rounded-lg p-4">
                            <div className="flex items-center space-x-2">
                                <Target className="h-5 w-5" />
                                <span className="text-sm opacity-75">Active Stakes</span>
                            </div>
                            <p className="text-xl font-bold">{stakingStats.activeStakes}</p>
                        </div>
                        <div className="bg-white bg-opacity-10 rounded-lg p-4">
                            <div className="flex items-center space-x-2">
                                <BarChart3 className="h-5 w-5" />
                                <span className="text-sm opacity-75">Avg APY</span>
                            </div>
                            <p className="text-xl font-bold">{stakingStats.averageAPY.toFixed(1)}%</p>
                        </div>
                    </div>
                </div>

                {/* Notification */}
                {notification && (
                    <div className={`mx-6 mt-4 p-4 rounded-lg flex items-center space-x-2 ${
                        notification.type === 'success' ? 'bg-green-900 text-green-100' :
                        notification.type === 'error' ? 'bg-red-900 text-red-100' :
                        'bg-blue-900 text-blue-100'
                    }`}>
                        {notification.type === 'success' && <CheckCircle className="h-5 w-5" />}
                        {notification.type === 'error' && <AlertTriangle className="h-5 w-5" />}
                        {notification.type === 'info' && <Info className="h-5 w-5" />}
                        <span>{notification.message}</span>
                    </div>
                )}

                {/* Tabs */}
                <div className="border-b border-gray-700">
                    <nav className="flex space-x-8 px-6">
                        {[
                            { id: 'pools', label: 'Staking Pools', icon: PieChart },
                            { id: 'stakes', label: 'My Stakes', icon: Lock },
                            { id: 'rewards', label: 'Rewards', icon: TrendingUp },
                            { id: 'stats', label: 'Statistics', icon: BarChart3 }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`py-4 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                                    activeTab === tab.id
                                        ? 'border-blue-500 text-blue-400'
                                        : 'border-transparent text-gray-400 hover:text-gray-300'
                                }`}
                            >
                                <tab.icon className="h-4 w-4" />
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'pools' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {stakingPools.map(pool => (
                                    <div
                                        key={pool.id}
                                        className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-colors"
                                    >
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-lg font-semibold text-white">{pool.name}</h3>
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${getRiskColor(pool.riskLevel)}`}>
                                                {pool.riskLevel.toUpperCase()}
                                            </span>
                                        </div>
                                        
                                        <div className="space-y-3">
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">APY</span>
                                                <span className="text-green-400 font-bold">{pool.apy}%</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Token</span>
                                                <span className="text-white">{pool.tokenSymbol}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Min Stake</span>
                                                <span className="text-white">{pool.minimumStake}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Lock Period</span>
                                                <span className="text-white">{pool.lockPeriod} days</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Total Staked</span>
                                                <span className="text-white">{parseFloat(pool.totalStaked).toLocaleString()}</span>
                                            </div>
                                        </div>

                                        <p className="text-gray-400 text-sm mt-4 mb-4">{pool.description}</p>

                                        <button
                                            onClick={() => setSelectedPool(pool)}
                                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
                                        >
                                            Stake Now
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'stakes' && (
                        <div className="space-y-4">
                            {userStakes.length === 0 ? (
                                <div className="text-center py-12">
                                    <Lock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                    <h3 className="text-lg font-medium text-gray-300 mb-2">No Stakes Yet</h3>
                                    <p className="text-gray-400">Start staking to see your positions here</p>
                                </div>
                            ) : (
                                userStakes.map(stake => {
                                    const pool = stakingPools.find(p => p.id === stake.poolId);
                                    const pendingRewards = calculatePendingRewards(stake);
                                    const isLocked = new Date() < stake.lockExpiresAt;
                                    
                                    return (
                                        <div key={stake.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                                <div>
                                                    <h4 className="text-lg font-semibold text-white mb-2">{pool?.name}</h4>
                                                    <div className="space-y-1">
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-400">Staked</span>
                                                            <span className="text-white">{stake.amount} {stake.tokenSymbol}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-400">Status</span>
                                                            <span className={`capitalize ${
                                                                stake.status === 'active' ? 'text-green-400' : 'text-gray-400'
                                                            }`}>
                                                                {stake.status}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div>
                                                    <h5 className="text-gray-300 font-medium mb-2">Rewards</h5>
                                                    <div className="space-y-1">
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-400">Pending</span>
                                                            <span className="text-green-400">{pendingRewards}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-400">Total Claimed</span>
                                                            <span className="text-white">{stake.accumulatedRewards}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div>
                                                    <h5 className="text-gray-300 font-medium mb-2">Timeline</h5>
                                                    <div className="space-y-1">
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-400">Staked At</span>
                                                            <span className="text-white">{formatDate(stake.stakedAt)}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="text-gray-400">Unlocks At</span>
                                                            <span className={isLocked ? 'text-red-400' : 'text-green-400'}>
                                                                {formatDate(stake.lockExpiresAt)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col space-y-2">
                                                    <button
                                                        onClick={() => handleClaimRewards(stake.id)}
                                                        disabled={parseFloat(pendingRewards) <= 0 || isLoading}
                                                        className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg transition-colors"
                                                    >
                                                        <div className="flex items-center justify-center space-x-2">
                                                            <TrendingUp className="h-4 w-4" />
                                                            <span>Claim Rewards</span>
                                                        </div>
                                                    </button>

                                                    <button
                                                        onClick={() => handleUnstake(stake.id)}
                                                        disabled={isLocked || stake.status !== 'active' || isLoading}
                                                        className="bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg transition-colors"
                                                    >
                                                        <div className="flex items-center justify-center space-x-2">
                                                            {isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                                                            <span>{isLocked ? 'Locked' : 'Unstake'}</span>
                                                        </div>
                                                    </button>

                                                    <div className="flex items-center space-x-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={stake.autoClaim}
                                                            onChange={() => stakingService.toggleAutoClaim(stake.id)}
                                                            className="rounded"
                                                        />
                                                        <span className="text-gray-400 text-sm">Auto-claim</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}

                    {activeTab === 'rewards' && (
                        <div className="space-y-4">
                            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                                <h3 className="text-lg font-semibold text-white mb-4">Reward History</h3>
                                <div className="space-y-3">
                                    {stakingService.getRewardHistory(10).map(reward => (
                                        <div key={reward.id} className="flex items-center justify-between py-2 border-b border-gray-700 last:border-b-0">
                                            <div>
                                                <span className="text-white">{reward.amount} {reward.tokenSymbol}</span>
                                                <span className="text-gray-400 text-sm ml-2">
                                                    {formatDate(reward.claimedAt)}
                                                </span>
                                            </div>
                                            <CheckCircle className="h-5 w-5 text-green-400" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'stats' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                                <h3 className="text-lg font-semibold text-white mb-4">Portfolio Overview</h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Total Value Staked</span>
                                        <span className="text-white">${stakingStats.totalValueStaked.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Total Rewards Earned</span>
                                        <span className="text-green-400">${stakingStats.totalRewardsEarned.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Portfolio Value</span>
                                        <span className="text-white font-bold">${stakingStats.portfolioValue.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                                <h3 className="text-lg font-semibold text-white mb-4">Token Balances</h3>
                                <div className="space-y-3">
                                    {userTokens.map(token => (
                                        <div key={token.symbol} className="flex justify-between">
                                            <span className="text-gray-400">{token.name}</span>
                                            <span className="text-white">{parseFloat(token.balance).toFixed(4)} {token.symbol}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Staking Modal */}
                {selectedPool && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
                        <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
                            <h3 className="text-xl font-semibold text-white mb-4">Stake {selectedPool.tokenSymbol}</h3>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-gray-400 text-sm mb-2">Amount to Stake</label>
                                    <input
                                        type="number"
                                        value={stakeAmount}
                                        onChange={(e) => setStakeAmount(e.target.value)}
                                        placeholder={`Min: ${selectedPool.minimumStake}`}
                                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                                    />
                                </div>

                                <div className="bg-gray-700 rounded-lg p-4">
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">APY</span>
                                            <span className="text-green-400">{selectedPool.apy}%</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Lock Period</span>
                                            <span className="text-white">{selectedPool.lockPeriod} days</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Risk Level</span>
                                            <span className={getRiskColor(selectedPool.riskLevel)}>
                                                {selectedPool.riskLevel.toUpperCase()}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex space-x-3">
                                    <button
                                        onClick={() => setSelectedPool(null)}
                                        className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleStake}
                                        disabled={!stakeAmount || isLoading}
                                        className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-2 px-4 rounded-lg transition-colors"
                                    >
                                        {isLoading ? <RefreshCw className="h-4 w-4 animate-spin mx-auto" /> : 'Stake'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StakingPanel;
