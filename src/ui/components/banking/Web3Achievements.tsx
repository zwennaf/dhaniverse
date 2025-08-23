import React, { useState, useEffect } from 'react';

interface Achievement {
    id: string;
    title: string;
    description: string;
    category: 'trading' | 'saving' | 'learning';
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    unlocked: boolean;
    unlockedAt?: number;
    reward?: {
        type: 'rupees' | 'icp';
        amount: number;
    };
    progress?: number;
    maxProgress?: number;
}

interface Web3AchievementsProps {
    rupeesBalance: number;
    icpTokenBalance: number;
    onRewardClaim: (rewardType: 'rupees' | 'icp', amount: number) => void;
}

const Web3Achievements: React.FC<Web3AchievementsProps> = ({
    rupeesBalance,
    icpTokenBalance,
    onRewardClaim
}) => {
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    useEffect(() => {
        initializeAchievements();
    }, [rupeesBalance, icpTokenBalance]);

    const initializeAchievements = () => {
        const baseAchievements: Achievement[] = [
            {
                id: 'first_connection',
                title: 'Web3 Pioneer',
                description: 'Connect your first Web3 wallet',
                category: 'learning',
                rarity: 'common',
                unlocked: true,
                unlockedAt: Date.now(),
                reward: { type: 'rupees', amount: 1000 }
            },
            {
                id: 'first_exchange',
                title: 'Currency Explorer',
                description: 'Complete your first currency exchange',
                category: 'trading',
                rarity: 'common',
                unlocked: rupeesBalance > 0 || icpTokenBalance > 0,
                reward: { type: 'icp', amount: 10 }
            },
            {
                id: 'balance_milestone_10k',
                title: 'Growing Wealth',
                description: 'Reach 10,000 rupees in combined balance',
                category: 'saving',
                rarity: 'common',
                unlocked: (rupeesBalance + icpTokenBalance * 10) >= 10000,
                reward: { type: 'rupees', amount: 500 },
                progress: Math.min(rupeesBalance + icpTokenBalance * 10, 10000),
                maxProgress: 10000
            },
            {
                id: 'token_holder',
                title: 'Token Collector',
                description: 'Hold at least 100 ICP tokens',
                category: 'saving',
                rarity: 'rare',
                unlocked: icpTokenBalance >= 100,
                reward: { type: 'icp', amount: 25 },
                progress: Math.min(icpTokenBalance, 100),
                maxProgress: 100
            },
            {
                id: 'big_exchange',
                title: 'High Roller',
                description: 'Exchange over 5,000 rupees in a single transaction',
                category: 'trading',
                rarity: 'rare',
                unlocked: false,
                reward: { type: 'icp', amount: 50 }
            },
            {
                id: 'defi_explorer',
                title: 'DeFi Enthusiast',
                description: 'Try all DeFi simulations',
                category: 'learning',
                rarity: 'epic',
                unlocked: false,
                reward: { type: 'rupees', amount: 2500 }
            },
            // staking achievement removed
            {
                id: 'whale_status',
                title: 'Crypto Whale',
                description: 'Accumulate over 100,000 rupees worth of assets',
                category: 'saving',
                rarity: 'legendary',
                unlocked: (rupeesBalance + icpTokenBalance * 10) >= 100000,
                reward: { type: 'icp', amount: 500 },
                progress: Math.min(rupeesBalance + icpTokenBalance * 10, 100000),
                maxProgress: 100000
            },
            {
                id: 'web3_master',
                title: 'Web3 Master',
                description: 'Unlock all other achievements',
                category: 'learning',
                rarity: 'legendary',
                unlocked: false,
                reward: { type: 'rupees', amount: 10000 }
            }
        ];

        setAchievements(baseAchievements);
    };

    const getRarityColor = (rarity: string) => {
        switch (rarity) {
            case 'common': return 'text-gray-400 border-gray-400';
            case 'rare': return 'text-blue-400 border-blue-400';
            case 'epic': return 'text-purple-400 border-purple-400';
            case 'legendary': return 'text-yellow-400 border-yellow-400';
            default: return 'text-gray-400 border-gray-400';
        }
    };

    const getRarityIcon = (rarity: string) => {
        switch (rarity) {
            case 'common': return '🥉';
            case 'rare': return '🥈';
            case 'epic': return '🥇';
            case 'legendary': return '👑';
            default: return '🏅';
        }
    };

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'trading': return '📈';
            case 'saving': return '💰';
            case 'learning': return '📚';
            default: return '🏆';
        }
    };

    const handleClaimReward = (achievement: Achievement) => {
        if (!achievement.unlocked || !achievement.reward) return;

        onRewardClaim(achievement.reward.type, achievement.reward.amount);
        
        // Remove reward to prevent double claiming
        setAchievements(prev => 
            prev.map(a => 
                a.id === achievement.id 
                    ? { ...a, reward: undefined }
                    : a
            )
        );

        alert(`Claimed ${achievement.reward.amount} ${achievement.reward.type.toUpperCase()}!`);
    };

    const filteredAchievements = achievements.filter(achievement => 
        selectedCategory === 'all' || achievement.category === selectedCategory
    );

    const unlockedCount = achievements.filter(a => a.unlocked).length;
    const totalCount = achievements.length;

    return (
        <div className="space-y-6">
            <div className="bg-white/5 border-2 border-white/20 p-6 rounded-lg">
                <h3 className="text-dhani-gold font-bold text-lg mb-6 tracking-wider flex items-center">
                    <span className="mr-2">🏆</span>
                    WEB3 ACHIEVEMENTS
                </h3>

                {/* Progress Overview */}
                <div className="bg-dhani-gold/10 border border-dhani-gold p-4 rounded mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-dhani-gold font-bold tracking-wider">PROGRESS</span>
                        <span className="text-white font-bold">{unlockedCount}/{totalCount}</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-3">
                        <div 
                            className="bg-dhani-gold h-3 rounded-full transition-all duration-500"
                            style={{ width: `${(unlockedCount / totalCount) * 100}%` }}
                        ></div>
                    </div>
                    <div className="text-dhani-gold text-xs mt-2 text-center">
                        {((unlockedCount / totalCount) * 100).toFixed(1)}% Complete
                    </div>
                </div>

                {/* Category Filter */}
                <div className="flex flex-wrap gap-2 mb-6">
                    {['all', 'trading', 'saving', 'learning'].map(category => (
                        <button
                            key={category}
                            onClick={() => setSelectedCategory(category)}
                            className={`px-4 py-2 rounded font-bold text-sm tracking-wider border-2 transition-colors ${
                                selectedCategory === category
                                    ? 'bg-dhani-gold text-black border-dhani-gold'
                                    : 'text-white border-white/20 hover:border-dhani-gold hover:text-dhani-gold'
                            }`}
                        >
                            {category === 'all' ? '🌟 ALL' : `${getCategoryIcon(category)} ${category.toUpperCase()}`}
                        </button>
                    ))}
                </div>

                {/* Achievements Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredAchievements.map(achievement => (
                        <div
                            key={achievement.id}
                            className={`p-4 rounded border-2 transition-all ${
                                achievement.unlocked
                                    ? `${getRarityColor(achievement.rarity)} bg-white/5`
                                    : 'border-gray-600 bg-gray-800/50 opacity-75'
                            }`}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center space-x-2">
                                    <span className="text-2xl">{getRarityIcon(achievement.rarity)}</span>
                                    <div>
                                        <h4 className={`font-bold text-sm tracking-wider ${
                                            achievement.unlocked ? 'text-white' : 'text-gray-400'
                                        }`}>
                                            {achievement.title}
                                        </h4>
                                        <div className="flex items-center space-x-2 text-xs">
                                            <span className={getRarityColor(achievement.rarity).split(' ')[0]}>
                                                {achievement.rarity.toUpperCase()}
                                            </span>
                                            <span className="text-gray-400">•</span>
                                            <span className="text-gray-400 flex items-center">
                                                {getCategoryIcon(achievement.category)} {achievement.category.toUpperCase()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                {achievement.unlocked && (
                                    <div className="text-green-400 text-xl">✓</div>
                                )}
                            </div>

                            <p className={`text-sm mb-3 ${
                                achievement.unlocked ? 'text-gray-300' : 'text-gray-500'
                            }`}>
                                {achievement.description}
                            </p>

                            {/* Progress Bar */}
                            {achievement.progress !== undefined && achievement.maxProgress && (
                                <div className="mb-3">
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="text-gray-400">Progress</span>
                                        <span className="text-gray-400">
                                            {achievement.progress.toLocaleString()}/{achievement.maxProgress.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-700 rounded-full h-2">
                                        <div 
                                            className={`h-2 rounded-full transition-all duration-500 ${
                                                achievement.unlocked ? 'bg-green-500' : 'bg-blue-500'
                                            }`}
                                            style={{ width: `${(achievement.progress / achievement.maxProgress) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                            )}

                            {/* Reward */}
                            {achievement.reward && (
                                <div className="flex items-center justify-between">
                                    <div className="text-xs">
                                        <span className="text-gray-400">Reward: </span>
                                        <span className={`font-bold ${
                                            achievement.reward.type === 'rupees' ? 'text-yellow-400' : 'text-blue-400'
                                        }`}>
                                            {achievement.reward.amount} {achievement.reward.type.toUpperCase()}
                                        </span>
                                    </div>
                                    {achievement.unlocked && (
                                        <button
                                            onClick={() => handleClaimReward(achievement)}
                                            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded tracking-wider"
                                        >
                                            CLAIM
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Unlock Date */}
                            {achievement.unlocked && achievement.unlockedAt && (
                                <div className="text-xs text-gray-500 mt-2">
                                    Unlocked: {new Date(achievement.unlockedAt).toLocaleDateString()}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Achievement Stats */}
                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                    {['common', 'rare', 'epic', 'legendary'].map(rarity => {
                        const count = achievements.filter(a => a.rarity === rarity && a.unlocked).length;
                        const total = achievements.filter(a => a.rarity === rarity).length;
                        return (
                            <div key={rarity} className={`p-3 rounded border ${getRarityColor(rarity)} bg-white/5`}>
                                <div className="text-center">
                                    <div className="text-2xl mb-1">{getRarityIcon(rarity)}</div>
                                    <div className="font-bold text-sm tracking-wider">
                                        {count}/{total}
                                    </div>
                                    <div className="text-xs opacity-80">
                                        {rarity.toUpperCase()}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Tips */}
                <div className="mt-6 bg-blue-900/30 border border-blue-600 p-4 rounded">
                    <div className="text-blue-400 font-bold text-sm mb-2">💡 ACHIEVEMENT TIPS</div>
                    <ul className="text-blue-200 text-xs space-y-1">
                        <li>• Complete currency exchanges to unlock trading achievements</li>
                        <li>• Build up your balance to reach saving milestones</li>
                        <li>• Try DeFi simulations to earn learning achievements</li>
                        {/* staking tips removed */}
                        <li>• Legendary achievements require significant dedication</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default Web3Achievements;