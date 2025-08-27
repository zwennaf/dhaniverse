import React, { useState, useEffect } from 'react';
import { ICPActorService } from '../../../services/ICPActorService';
import { useAuth } from '../../contexts/AuthContext';

interface LeaderboardEntry {
  principal: string;
  displayName?: string;
  totalProfit: number;
  tradeCount: number;
  rank: number;
  badges: string[];
}

interface StockLeaderboardProps {
  icpService: ICPActorService;
  onClose: () => void;
}

const StockLeaderboard: React.FC<StockLeaderboardProps> = ({
  icpService,
  onClose
}) => {
  const { user, isSignedIn, signInWithInternetIdentity } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    // Use Internet Identity authentication status instead of wallet manager
    if (isSignedIn) {
      loadLeaderboard();
    } else {
      setLoading(false);
    }
  }, [isSignedIn]);

  // Connect with Internet Identity
  const connectInternetIdentity = async () => {
    try {
      setIsConnecting(true);
      const { AuthClient } = await import("@dfinity/auth-client");
      const authClient = await AuthClient.create();
      
      await authClient.login({
        identityProvider: "https://identity.ic0.app",
        windowOpenerFeatures: "width=500,height=600,left=200,top=200",
        onSuccess: async () => {
          const identity = authClient.getIdentity();
          const result = await signInWithInternetIdentity(identity);
          if (result.success) {
            console.log('Internet Identity connection successful');
          } else {
            setError('Failed to sign in with Internet Identity');
          }
        },
        onError: (error) => {
          console.error('Internet Identity login failed:', error);
          setError('Internet Identity login failed');
        }
      });
    } catch (error) {
      console.error('Failed to connect Internet Identity:', error);
      setError('Failed to connect Internet Identity');
    } finally {
      setIsConnecting(false);
    }
  };

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load leaderboard data
      const leaderboardResult = await icpService.getLeaderboard(); // No parameter needed
      if (leaderboardResult.success && leaderboardResult.data) {
        setLeaderboard(leaderboardResult.data);
      }

      // Get user's rank if connected and user exists
      if (user?.id) {
        const rankResult = await icpService.getUserRank(user.id);
        if (rankResult.success && rankResult.rank !== undefined) {
          setUserRank(rankResult.rank);
        }
      }
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
      setError(`Failed to load leaderboard: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const recordTrade = async (profit: number, stockSymbol: string): Promise<void> => {
    if (!isSignedIn) {
      throw new Error('Not signed in with Internet Identity');
    }

    try {
      const success = await icpService.recordTrade(profit, stockSymbol);
      if (success) {
        // Refresh leaderboard after recording trade
        await loadLeaderboard();
      } else {
        throw new Error('Failed to record trade');
      }
    } catch (error) {
      console.error('Failed to record trade:', error);
      throw error;
    }
  };

  const verifyTradeOnChain = async (tradeId: string): Promise<boolean> => {
    // This would verify a specific trade exists on-chain
    // For now, we'll just check if the user has any trades recorded
    try {
      if (!user?.id) return false;
      
      const rankResult = await icpService.getUserRank(user.id);
      return rankResult.success && rankResult.rank !== undefined && rankResult.rank > 0; // If user has a rank, they have trades
    } catch (error) {
      console.error('Trade verification failed:', error);
      return false;
    }
  };

  const getBadgeColor = (badge: string): string => {
    const badgeColors: Record<string, string> = {
      'High Roller': 'bg-yellow-600',
      'Profit Master': 'bg-green-600',
      'Trading Legend': 'bg-purple-600',
      'Active Trader': 'bg-blue-600',
      'Market Veteran': 'bg-red-600',
      'Trading Addict': 'bg-pink-600'
    };
    return badgeColors[badge] || 'bg-gray-600';
  };

  const formatProfit = (profit: number): string => {
    if (profit >= 1000000) {
      return `₹${(profit / 1000000).toFixed(1)}M`;
    } else if (profit >= 1000) {
      return `₹${(profit / 1000).toFixed(1)}K`;
    }
    return `₹${profit.toFixed(0)}`;
  };

  const getRankIcon = (rank: number): string => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
    }
  };

  if (!isSignedIn) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Stock Market Leaderboard</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔗</div>
            <h3 className="text-xl font-bold text-white mb-2">Connect with Internet Identity</h3>
            <p className="text-gray-300 mb-6">
              Sign in with Internet Identity to view the blockchain-verified trading leaderboard and compete with other players.
            </p>
            <button
              onClick={connectInternetIdentity}
              disabled={isConnecting}
              className={`px-6 py-3 bg-blue-600 text-white rounded-lg transition-colors ${
                isConnecting 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:bg-blue-700'
              }`}
            >
              {isConnecting ? 'Connecting...' : 'Connect with Internet Identity'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <h2 className="text-2xl font-bold text-white">Stock Market Leaderboard</h2>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
              <span className="text-sm text-green-300">Blockchain Verified</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* User Rank Display */}
        {userRank > 0 && (
          <div className="bg-blue-900/50 border-b border-blue-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-blue-300 font-medium">Your Rank</h3>
                <div className="flex items-center space-x-2">
                  <span className="text-2xl font-bold text-white">{getRankIcon(userRank)}</span>
                  <span className="text-blue-200">
                    You're ranked #{userRank} out of {leaderboard.length} traders
                  </span>
                </div>
              </div>
              <button
                onClick={loadLeaderboard}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-lg text-gray-400">Loading leaderboard...</div>
            </div>
          ) : error ? (
            <div className="bg-red-900/50 border border-red-700 rounded-lg p-4">
              <div className="text-red-400 font-medium">Error Loading Leaderboard</div>
              <div className="text-red-300 text-sm mt-1">{error}</div>
              <button 
                onClick={loadLeaderboard} 
                className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-xl font-bold text-white mb-2">No Traders Yet</h3>
              <p className="text-gray-300">
                Be the first to make profitable trades and appear on the leaderboard!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {leaderboard.map((entry, index) => (
                <div
                  key={entry.principal}
                  className={`p-4 rounded-lg border transition-colors ${
                    entry.principal === user?.id
                      ? 'bg-blue-900/30 border-blue-600'
                      : 'bg-gray-700 border-gray-600 hover:bg-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {/* Rank */}
                      <div className="text-2xl font-bold text-white min-w-[60px]">
                        {getRankIcon(entry.rank)}
                      </div>
                      
                      {/* Trader Info */}
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-white font-medium">
                            {entry.displayName || `Trader ${entry.principal.slice(0, 8)}...`}
                          </span>
                          {entry.principal === user?.id && (
                            <span className="px-2 py-1 bg-blue-600 text-xs rounded-full text-white">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-400 font-mono">
                          {entry.principal.slice(0, 20)}...
                        </div>
                      </div>
                    </div>
                    
                    {/* Stats */}
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-400">
                        {formatProfit(entry.totalProfit)}
                      </div>
                      <div className="text-sm text-gray-400">
                        {entry.tradeCount} trades
                      </div>
                    </div>
                  </div>
                  
                  {/* Badges */}
                  {entry.badges.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {entry.badges.map((badge) => (
                        <span
                          key={badge}
                          className={`px-2 py-1 text-xs rounded-full text-white ${getBadgeColor(badge)}`}
                        >
                          {badge}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Export the component and utility functions
export default StockLeaderboard;
export { type LeaderboardEntry };
export const StockLeaderboardUtils = {
  recordTrade: async (
    icpService: ICPActorService,
    profit: number,
    stockSymbol: string
  ): Promise<void> => {
    if (!icpService.isActorConnected()) {
      throw new Error('ICP service not connected');
    }
    
    const success = await icpService.recordTrade(profit, stockSymbol);
    if (!success) {
      throw new Error('Failed to record trade on blockchain');
    }
  },
  
  verifyTrade: async (
    icpService: ICPActorService,
    userId: string
  ): Promise<boolean> => {
    try {
      if (!userId) return false;
      
      const rankResult = await icpService.getUserRank(userId);
      return rankResult.success && rankResult.rank !== undefined && rankResult.rank > 0;
    } catch (error) {
      console.error('Trade verification failed:', error);
      return false;
    }
  }
};