import React, { useState } from 'react';

interface DeFiSimulationProps {
    icpTokenBalance: number;
    rupeesBalance: number;
    onBalanceUpdate: (icpChange: number, rupeesChange: number) => void;
}

const DeFiSimulation: React.FC<DeFiSimulationProps> = ({
    icpTokenBalance,
    rupeesBalance,
    onBalanceUpdate
}) => {
    const [activeSimulation, setActiveSimulation] = useState<string | null>(null);
    const [liquidityAmount, setLiquidityAmount] = useState('');
    const [yieldAmount, setYieldAmount] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLiquidityPool = async () => {
        if (!liquidityAmount || parseFloat(liquidityAmount) <= 0) {
            alert('Please enter a valid amount');
            return;
        }

        const amount = parseFloat(liquidityAmount);
        if (amount > icpTokenBalance) {
            alert('Insufficient ICP token balance');
            return;
        }

        setLoading(true);
        try {
            // Simulate liquidity pool participation
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Calculate rewards (5-15% APY for 30 days)
            const apy = 0.05 + Math.random() * 0.1;
            const rewards = amount * apy * (30 / 365);
            
            onBalanceUpdate(rewards, 0);
            setLiquidityAmount('');
            
            alert(`Liquidity pool simulation complete! Earned ${rewards.toFixed(4)} ICP tokens (${(apy * 100).toFixed(1)}% APY)`);
        } catch (error) {
            alert(`Simulation failed: ${error}`);
        } finally {
            setLoading(false);
        }
    };

    const handleYieldFarming = async () => {
        if (!yieldAmount || parseFloat(yieldAmount) <= 0) {
            alert('Please enter a valid amount');
            return;
        }

        const amount = parseFloat(yieldAmount);
        if (amount > icpTokenBalance) {
            alert('Insufficient ICP token balance');
            return;
        }

        setLoading(true);
        try {
            // Simulate yield farming
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Calculate rewards (10-25% APY for 7 days)
            const apy = 0.1 + Math.random() * 0.15;
            const rewards = amount * apy * (7 / 365);
            
            onBalanceUpdate(rewards, 0);
            setYieldAmount('');
            
            alert(`Yield farming simulation complete! Earned ${rewards.toFixed(4)} ICP tokens (${(apy * 100).toFixed(1)}% APY)`);
        } catch (error) {
            alert(`Simulation failed: ${error}`);
        } finally {
            setLoading(false);
        }
    };

    const simulateImpermanentLoss = () => {
        setActiveSimulation('impermanent-loss');
        setTimeout(() => {
            alert('Impermanent Loss Simulation: In a real liquidity pool, price changes between paired tokens can result in temporary losses. This is educational only!');
            setActiveSimulation(null);
        }, 2000);
    };

    const simulateFlashLoan = () => {
        setActiveSimulation('flash-loan');
        setTimeout(() => {
            // Simulate flash loan arbitrage
            const profit = 50 + Math.random() * 100;
            onBalanceUpdate(0, profit);
            alert(`Flash Loan Arbitrage Simulation: Borrowed, traded, and repaid in one transaction. Profit: ₹${profit.toFixed(2)}`);
            setActiveSimulation(null);
        }, 3000);
    };

    return (
        <div className="space-y-6">
            <div className="bg-white/5 border-2 border-white/20 p-6 rounded-lg">
                <h3 className="text-dhani-gold font-bold text-lg mb-6 tracking-wider flex items-center">
                    <span className="mr-2">🧪</span>
                    DEFI LABORATORY
                </h3>

                {/* Balance Display */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-blue-500/20 border border-blue-400 p-4 rounded">
                        <div className="text-blue-400 text-sm font-bold tracking-wider">ICP TOKENS</div>
                        <div className="text-white text-xl font-bold">{icpTokenBalance.toFixed(4)}</div>
                    </div>
                    <div className="bg-yellow-500/20 border border-yellow-400 p-4 rounded">
                        <div className="text-yellow-400 text-sm font-bold tracking-wider">RUPEES</div>
                        <div className="text-white text-xl font-bold">₹{rupeesBalance.toLocaleString()}</div>
                    </div>
                </div>

                {/* DeFi Simulations */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Liquidity Pool Simulation */}
                    <div className="bg-purple-900/30 border border-purple-600 p-4 rounded">
                        <h4 className="text-purple-400 font-bold mb-3 flex items-center">
                            <span className="mr-2">💧</span>
                            LIQUIDITY POOL
                        </h4>
                        <p className="text-white text-sm mb-4">
                            Provide liquidity to earn trading fees. Simulates 30-day pool participation.
                        </p>
                        <div className="space-y-3">
                            <input
                                type="number"
                                value={liquidityAmount}
                                onChange={(e) => setLiquidityAmount(e.target.value)}
                                placeholder="ICP tokens to provide"
                                max={icpTokenBalance}
                                className="w-full bg-gray-800 border border-gray-600 text-white px-3 py-2 rounded font-vcr text-sm"
                            />
                            <button
                                onClick={handleLiquidityPool}
                                disabled={loading || !liquidityAmount || parseFloat(liquidityAmount) > icpTokenBalance}
                                className="w-full py-2 bg-purple-600 text-white font-bold text-sm tracking-wider rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading && activeSimulation === 'liquidity' ? 'SIMULATING...' : 'PROVIDE LIQUIDITY'}
                            </button>
                        </div>
                        <div className="mt-3 text-purple-300 text-xs">
                            Expected APY: 5-15% • Duration: 30 days
                        </div>
                    </div>

                    {/* Yield Farming Simulation */}
                    <div className="bg-green-900/30 border border-green-600 p-4 rounded">
                        <h4 className="text-green-400 font-bold mb-3 flex items-center">
                            <span className="mr-2">🌾</span>
                            YIELD FARMING
                        </h4>
                        <p className="text-white text-sm mb-4">
                            Stake LP tokens to earn additional rewards. Higher risk, higher rewards.
                        </p>
                        <div className="space-y-3">
                            <input
                                type="number"
                                value={yieldAmount}
                                onChange={(e) => setYieldAmount(e.target.value)}
                                placeholder="ICP tokens to farm"
                                max={icpTokenBalance}
                                className="w-full bg-gray-800 border border-gray-600 text-white px-3 py-2 rounded font-vcr text-sm"
                            />
                            <button
                                onClick={handleYieldFarming}
                                disabled={loading || !yieldAmount || parseFloat(yieldAmount) > icpTokenBalance}
                                className="w-full py-2 bg-green-600 text-white font-bold text-sm tracking-wider rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading && activeSimulation === 'yield' ? 'FARMING...' : 'START FARMING'}
                            </button>
                        </div>
                        <div className="mt-3 text-green-300 text-xs">
                            Expected APY: 10-25% • Duration: 7 days
                        </div>
                    </div>

                    {/* Impermanent Loss Education */}
                    <div className="bg-orange-900/30 border border-orange-600 p-4 rounded">
                        <h4 className="text-orange-400 font-bold mb-3 flex items-center">
                            <span className="mr-2">⚠️</span>
                            IMPERMANENT LOSS
                        </h4>
                        <p className="text-white text-sm mb-4">
                            Learn about impermanent loss in liquidity pools through interactive simulation.
                        </p>
                        <button
                            onClick={simulateImpermanentLoss}
                            disabled={activeSimulation === 'impermanent-loss'}
                            className="w-full py-2 bg-orange-600 text-white font-bold text-sm tracking-wider rounded hover:bg-orange-700 disabled:opacity-50"
                        >
                            {activeSimulation === 'impermanent-loss' ? 'SIMULATING...' : 'LEARN ABOUT IL'}
                        </button>
                        <div className="mt-3 text-orange-300 text-xs">
                            Educational simulation • No real risk
                        </div>
                    </div>

                    {/* Flash Loan Simulation */}
                    <div className="bg-red-900/30 border border-red-600 p-4 rounded">
                        <h4 className="text-red-400 font-bold mb-3 flex items-center">
                            <span className="mr-2">⚡</span>
                            FLASH LOAN
                        </h4>
                        <p className="text-white text-sm mb-4">
                            Simulate flash loan arbitrage. Borrow, trade, and repay in one transaction.
                        </p>
                        <button
                            onClick={simulateFlashLoan}
                            disabled={activeSimulation === 'flash-loan'}
                            className="w-full py-2 bg-red-600 text-white font-bold text-sm tracking-wider rounded hover:bg-red-700 disabled:opacity-50"
                        >
                            {activeSimulation === 'flash-loan' ? 'EXECUTING...' : 'EXECUTE FLASH LOAN'}
                        </button>
                        <div className="mt-3 text-red-300 text-xs">
                            Advanced DeFi • Simulated arbitrage
                        </div>
                    </div>
                </div>

                {/* Educational Content */}
                <div className="mt-6 bg-blue-900/30 border border-blue-600 p-4 rounded">
                    <h4 className="text-blue-400 font-bold mb-3 flex items-center">
                        <span className="mr-2">📚</span>
                        DEFI EDUCATION
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                            <h5 className="text-blue-300 font-bold mb-2">Liquidity Pools</h5>
                            <p className="text-blue-200 text-xs">
                                Provide tokens to enable trading. Earn fees from every trade that uses your liquidity.
                            </p>
                        </div>
                        <div>
                            <h5 className="text-blue-300 font-bold mb-2">Yield Farming</h5>
                            <p className="text-blue-200 text-xs">
                                Stake LP tokens to earn additional rewards. Often includes governance tokens.
                            </p>
                        </div>
                        <div>
                            <h5 className="text-blue-300 font-bold mb-2">Impermanent Loss</h5>
                            <p className="text-blue-200 text-xs">
                                Temporary loss when token prices diverge. Becomes permanent if you withdraw.
                            </p>
                        </div>
                        <div>
                            <h5 className="text-blue-300 font-bold mb-2">Flash Loans</h5>
                            <p className="text-blue-200 text-xs">
                                Borrow without collateral, but must repay in the same transaction block.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Risk Warning */}
                <div className="mt-4 bg-yellow-900/30 border border-yellow-600 p-4 rounded">
                    <div className="text-yellow-400 font-bold text-sm mb-2">⚠️ EDUCATIONAL SIMULATION</div>
                    <p className="text-yellow-200 text-xs">
                        These are educational simulations only. Real DeFi involves significant risks including 
                        impermanent loss, smart contract bugs, and market volatility. Always do your own research.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default DeFiSimulation;