import React, { useEffect, useRef, useState } from 'react';
import { animate } from 'motion';
import { canisterService } from '../../../services/CanisterService';
import { balanceManager } from '../../../services/BalanceManager';

interface VaultPosition {
  id: string;
  amount: number;
  yieldRate: number;
  poolType: 'liquidity' | 'yield_farming';
  startDate: number;
  estimatedYield: number;
  status: 'active' | 'pending' | 'completed';
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  category: string;
  rarity: string;
  reward?: {
    reward_type: string;
    amount: number;
  };
}

interface DeFiBankingVaultProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
}

const DeFiBankingVault: React.FC<DeFiBankingVaultProps> = ({
  isOpen,
  onClose,
  walletAddress
}) => {
  const [positions, setPositions] = useState<VaultPosition[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPool, setSelectedPool] = useState<'liquidity' | 'yield_farming'>('liquidity');
  const [depositAmount, setDepositAmount] = useState('');
  const [currentBalance, setCurrentBalance] = useState(0);
  const [totalVaultValue, setTotalVaultValue] = useState(0);
  const [estimatedApy, setEstimatedApy] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load wallet balance
  useEffect(() => {
    const updateBalance = () => {
      const balance = balanceManager.getBalance();
      setCurrentBalance(balance.cash);
    };
    
    updateBalance();
    const unsubscribe = balanceManager.onBalanceChange(updateBalance);
    return () => {
      unsubscribe();
    };
  }, []);

  // Load DeFi data when vault opens
  useEffect(() => {
    if (isOpen && walletAddress) {
      loadVaultData();
      loadAchievements();
      loadTransactionHistory();
    }
  }, [isOpen, walletAddress]);

  // Animate vault entry
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const panel = containerRef.current.querySelector('[data-vault-panel]');
      if (panel) {
        animate(panel as any, {
          y: [20, -5, 5, 0],
          opacity: [0, 0.7, 0.7, 1]
        } as any, { duration: 0.6 });
      }
    }
  }, [isOpen]);

  const loadVaultData = async () => {
    setLoading(true);
    try {
      // Simulate liquidity pool for banking vault
      const liquidityResult = await canisterService.simulateLiquidityPool(walletAddress, 1000);
      const yieldResult = await canisterService.simulateYieldFarming(walletAddress, 1000);
      
      // Create mock positions based on simulation results
      const mockPositions: VaultPosition[] = [
        {
          id: '1',
          amount: 5000,
          yieldRate: liquidityResult || 8.5,
          poolType: 'liquidity',
          startDate: Date.now() - 7 * 24 * 60 * 60 * 1000, // 7 days ago
          estimatedYield: 5000 * ((liquidityResult || 8.5) / 100) * (7 / 365),
          status: 'active'
        },
        {
          id: '2',
          amount: 3000,
          yieldRate: yieldResult || 12.3,
          poolType: 'yield_farming',
          startDate: Date.now() - 3 * 24 * 60 * 60 * 1000, // 3 days ago
          estimatedYield: 3000 * ((yieldResult || 12.3) / 100) * (3 / 365),
          status: 'active'
        }
      ];
      
      setPositions(mockPositions);
      setTotalVaultValue(mockPositions.reduce((sum, pos) => sum + pos.amount + pos.estimatedYield, 0));
      setEstimatedApy((liquidityResult || 8.5 + yieldResult || 12.3) / 2);
    } catch (error) {
      console.error('Failed to load vault data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAchievements = async () => {
    try {
      const achievementData = await canisterService.getAchievements(walletAddress);
      setAchievements(achievementData || []);
    } catch (error) {
      console.error('Failed to load achievements:', error);
    }
  };

  const loadTransactionHistory = async () => {
    try {
      const txHistory = await canisterService.getTransactionHistory(walletAddress);
      setTransactions(txHistory || []);
    } catch (error) {
      console.error('Failed to load transaction history:', error);
    }
  };

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (!amount || amount <= 0 || amount > currentBalance) return;

    setLoading(true);
    try {
      // Create transaction record
      const txResult = await canisterService.createTransaction(
        walletAddress,
        'Deposit',
        amount,
        `DeFi Banking Vault - ${selectedPool}`
      );

      if (txResult.success) {
        // Simulate the selected pool
        const poolResult = selectedPool === 'liquidity' 
          ? await canisterService.simulateLiquidityPool("DHANI", amount)
          : await canisterService.simulateYieldFarming("DHANI", amount);

        if (poolResult) {
          // Update balance
          balanceManager.processWithdrawal(amount, `DeFi Vault ${selectedPool} deposit`);

          // Add new position
          const newPosition: VaultPosition = {
            id: Date.now().toString(),
            amount,
            yieldRate: poolResult || (selectedPool === 'liquidity' ? 8.5 : 12.3),
            poolType: selectedPool,
            startDate: Date.now(),
            estimatedYield: 0,
            status: 'active'
          };

          setPositions(prev => [...prev, newPosition]);
          setDepositAmount('');
          
          // Check for new achievements
          loadAchievements();
          loadTransactionHistory();
        }
      }
    } catch (error) {
      console.error('Deposit failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const claimAchievementReward = async (achievementId: string) => {
    try {
      const result = await canisterService.claimAchievementReward(walletAddress, achievementId);
      if (result) {
        const reward = result;
        balanceManager.updateCash(balanceManager.getBalance().cash + reward.amount);
        loadAchievements(); // Refresh achievements
      }
    } catch (error) {
      console.error('Failed to claim achievement reward:', error);
    }
  };

  const withdrawFromVault = async (positionId: string) => {
    const position = positions.find(p => p.id === positionId);
    if (!position) return;

    setLoading(true);
    try {
      // Create withdrawal transaction
      const txResult = await canisterService.createTransaction(
        walletAddress,
        'Withdraw',
        position.amount + position.estimatedYield,
        `DeFi Vault withdrawal - ${position.poolType}`
      );

      if (txResult) {
        // Return funds with yield
        const totalReturn = position.amount + position.estimatedYield;
        balanceManager.updateCash(balanceManager.getBalance().cash + totalReturn);

        // Remove position
        setPositions(prev => prev.filter(p => p.id !== positionId));
        
        // Refresh data
        loadTransactionHistory();
        loadAchievements();
      }
    } catch (error) {
      console.error('Withdrawal failed:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div ref={containerRef} className="fixed inset-0 z-[1800] flex items-center justify-center px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/95" onClick={onClose} />
      
      {/* Vault Panel */}
      <div 
        data-vault-panel 
        className="relative w-[900px] max-w-full bg-black text-white rounded border border-yellow-600/40 p-8 flex flex-col gap-8 max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        {/* Header */}
        <div className="flex justify-between items-center border-b border-yellow-600/20 pb-6">
          <div>
            <h2 className="text-3xl font-light text-yellow-500 tracking-wide" style={{ fontFamily: 'VCR OSD Mono, monospace' }}>
              DEFI BANKING VAULT
            </h2>
            <p className="text-gray-400 mt-2 font-light">Decentralized banking powered by Internet Computer Protocol</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-yellow-500 text-2xl font-light transition-colors duration-200"
          >
            ×
          </button>
        </div>

        {/* Vault Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-black border border-yellow-600/30 rounded p-6">
            <h3 className="text-sm text-gray-400 uppercase tracking-wide">Total Vault Value</h3>
            <p className="text-2xl font-light text-yellow-500 mt-2">₹{totalVaultValue.toLocaleString()}</p>
          </div>
          <div className="bg-black border border-yellow-600/30 rounded p-6">
            <h3 className="text-sm text-gray-400 uppercase tracking-wide">Estimated APY</h3>
            <p className="text-2xl font-light text-yellow-500 mt-2">{estimatedApy.toFixed(1)}%</p>
          </div>
          <div className="bg-black border border-yellow-600/30 rounded p-6">
            <h3 className="text-sm text-gray-400 uppercase tracking-wide">Active Positions</h3>
            <p className="text-2xl font-light text-yellow-500 mt-2">{positions.length}</p>
          </div>
        </div>

        {/* Deposit Section */}
        <div className="bg-black border border-yellow-600/30 rounded p-6">
          <h3 className="text-xl font-light text-yellow-500 mb-6 uppercase tracking-wide">Deposit to Vault</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-gray-400 mb-3 uppercase tracking-wide">Pool Type</label>
              <select
                value={selectedPool}
                onChange={(e) => setSelectedPool(e.target.value as 'liquidity' | 'yield_farming')}
                className="w-full bg-black border border-gray-600 rounded px-4 py-3 text-white focus:border-yellow-500 transition-colors duration-200"
              >
                <option value="liquidity">Liquidity Pool (~8.5% APY)</option>
                <option value="yield_farming">Yield Farming (~12.3% APY)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-3 uppercase tracking-wide">
                Amount (Available: ₹{currentBalance.toLocaleString()})
              </label>
              <div className="flex gap-3">
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="flex-1 bg-black border border-gray-600 rounded px-4 py-3 text-white focus:border-yellow-500 transition-colors duration-200"
                />
                <button
                  onClick={handleDeposit}
                  disabled={loading || !depositAmount || parseFloat(depositAmount) > currentBalance}
                  className="bg-yellow-600 text-black font-medium px-8 py-3 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-yellow-500 transition-colors duration-200"
                >
                  {loading ? 'Processing...' : 'Deposit'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Active Positions */}
        <div className="bg-black border border-yellow-600/30 rounded p-6">
          <h3 className="text-xl font-light text-yellow-500 mb-6 uppercase tracking-wide">Your Vault Positions</h3>
          {positions.length === 0 ? (
            <p className="text-gray-400 text-center py-8 font-light">No active positions. Make your first deposit to start earning.</p>
          ) : (
            <div className="space-y-4">
              {positions.map((position) => (
                <div key={position.id} className="bg-black border border-gray-700 rounded p-6 flex justify-between items-center">
                  <div>
                    <h4 className="font-medium text-lg text-white">
                      {position.poolType === 'liquidity' ? 'Liquidity Pool' : 'Yield Farming'}
                    </h4>
                    <p className="text-gray-400 mt-1">
                      Deposited: ₹{position.amount.toLocaleString()} • 
                      APY: {position.yieldRate.toFixed(1)}% • 
                      Earned: ₹{position.estimatedYield.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Started: {new Date(position.startDate).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => withdrawFromVault(position.id)}
                    disabled={loading}
                    className="bg-black border border-gray-600 text-white font-medium px-6 py-2 rounded disabled:opacity-50 hover:border-yellow-500 transition-colors duration-200"
                  >
                    Withdraw
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Achievements */}
        {achievements.length > 0 && (
          <div className="bg-black border border-yellow-600/30 rounded p-6">
            <h3 className="text-xl font-light text-yellow-500 mb-6 uppercase tracking-wide">Banking Achievements</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {achievements.slice(0, 4).map((achievement) => (
                <div key={achievement.id} className="bg-black border border-gray-700 rounded p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-yellow-500">{achievement.title}</h4>
                      <p className="text-sm text-gray-400 mt-1">{achievement.description}</p>
                      <p className="text-xs text-gray-500 mt-2 uppercase tracking-wide">
                        {achievement.category} • {achievement.rarity}
                      </p>
                    </div>
                    {achievement.unlocked && achievement.reward && (
                      <button
                        onClick={() => claimAchievementReward(achievement.id)}
                        className="bg-yellow-600 text-black text-xs px-4 py-2 rounded font-medium hover:bg-yellow-500 transition-colors duration-200"
                      >
                        Claim ₹{achievement.reward.amount}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Transactions */}
        {transactions.length > 0 && (
          <div className="bg-black border border-yellow-600/30 rounded p-6">
            <h3 className="text-xl font-light text-yellow-500 mb-6 uppercase tracking-wide">Recent Vault Transactions</h3>
            <div className="space-y-3">
              {transactions.slice(0, 5).map((tx) => (
                <div key={tx.id} className="flex justify-between items-center py-3 border-b border-gray-800">
                  <div>
                    <p className="font-medium text-white">{tx.transaction_type}</p>
                    <p className="text-sm text-gray-400">
                      {new Date(Number(tx.timestamp) / 1000000).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-yellow-500">₹{tx.amount.toLocaleString()}</p>
                    <p className={`text-xs uppercase tracking-wide ${
                      tx.status === 'Confirmed' ? 'text-yellow-500' : 
                      tx.status === 'Pending' ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      {tx.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeFiBankingVault;
