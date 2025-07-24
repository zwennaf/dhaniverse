import React, { useState, useEffect } from "react";
import { ICPActorService } from "../../../services/ICPActorService";
import { WalletManager, WalletStatus } from "../../../services/WalletManager";
import Web3Achievements from "./Web3Achievements";
import CurrencyExchange from "./CurrencyExchange";
import DeFiSimulation from "./DeFiSimulation";

interface Web3BankingFeaturesProps {
    icpService: ICPActorService;
    walletManager?: WalletManager; // Made optional since not used
    walletStatus: WalletStatus;
}

interface DualBalance {
    rupeesBalance: number;
    icpTokenBalance: number;
    lastUpdated: number;
}

interface StakingInfo {
    stakingId: string;
    stakedAmount: number;
    apy: number;
    startDate: number;
    maturityDate: number;
    currentRewards: number;
    status: string;
}

const Web3BankingFeatures: React.FC<Web3BankingFeaturesProps> = ({
    icpService,
    walletStatus,
}) => {
    const [activeTab, setActiveTab] = useState("overview");
    const [dualBalance, setDualBalance] = useState<DualBalance>({
        rupeesBalance: 0,
        icpTokenBalance: 0,
        lastUpdated: Date.now(),
    });
    const [stakingInfo, setStakingInfo] = useState<StakingInfo[]>([]);
    const [exchangeRate] = useState(0.1); // 1 Rupee = 0.1 Token
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Staking form state
    const [stakingAmount, setStakingAmount] = useState("");
    const [stakingDuration, setStakingDuration] = useState(30);

    useEffect(() => {
        if (walletStatus.connected && icpService.isActorConnected()) {
            loadWeb3Data();
        }
    }, [walletStatus.connected, icpService]);

    const loadWeb3Data = async () => {
        try {
            setLoading(true);
            setError(null);

            // Load dual balance
            const balance = await icpService.getDualBalance();
            setDualBalance({
                rupeesBalance: balance.rupeesBalance,
                icpTokenBalance: balance.tokenBalance,
                lastUpdated: balance.lastUpdated,
            });

            // Load staking information
            const staking = await icpService.getStakingInfo();
            setStakingInfo(
                staking.map((pool) => ({
                    stakingId: pool.id,
                    stakedAmount: pool.stakedAmount,
                    apy: pool.apy,
                    startDate: pool.startDate,
                    maturityDate: pool.maturityDate,
                    currentRewards: pool.currentRewards,
                    status: pool.status,
                }))
            );
        } catch (error) {
            console.error("Failed to load Web3 data:", error);
            setError(`Failed to load Web3 data: ${error}`);
        } finally {
            setLoading(false);
        }
    };

    // Removed handleCurrencyExchange - using CurrencyExchange component instead

    const handleStakeTokens = async () => {
        if (!stakingAmount || parseFloat(stakingAmount) <= 0) {
            setError("Please enter a valid staking amount");
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const amount = parseFloat(stakingAmount);
            const result = await icpService.stakeTokens(
                amount,
                stakingDuration
            );

            if (result.success) {
                // Refresh data
                await loadWeb3Data();
                setStakingAmount("");

                // Show success message
                alert(
                    `Successfully staked ${amount} Tokens for ${stakingDuration} days at ${result.apy}% APY`
                );
            } else {
                setError("Staking failed. Please try again.");
            }
        } catch (error) {
            console.error("Staking failed:", error);
            setError(`Staking failed: ${error}`);
        } finally {
            setLoading(false);
        }
    };

    // Removed unused exchange preview - using CurrencyExchange component instead

    const getStakingAPY = (duration: number) => {
        switch (duration) {
            case 30:
                return 5;
            case 90:
                return 7;
            case 180:
                return 10;
            default:
                return 5;
        }
    };

    if (!walletStatus.connected) {
        return (
            <div className="bg-gray-700 rounded-lg p-6 text-center">
                <div className="text-6xl mb-4">🔗</div>
                <h3 className="text-xl font-bold text-white mb-2">
                    Connect Your Web3 Wallet
                </h3>
                <p className="text-gray-300 mb-4">
                    Connect your wallet to access exclusive Web3 banking
                    features including dual-currency support, token staking, and
                    blockchain-verified transactions.
                </p>
                <div className="bg-blue-900/30 rounded-lg p-4 mb-4">
                    <h4 className="text-blue-300 font-medium mb-2">
                        🌟 Exclusive Web3 Features:
                    </h4>
                    <ul className="text-blue-200 text-sm space-y-1">
                        <li>• Dual-currency system (Rupees + Tokens)</li>
                        <li>• Token staking with rewards</li>
                        <li>• Currency exchange and conversion</li>
                        <li>• Blockchain-verified transactions</li>
                        <li>• NFT-like achievement badges</li>
                        <li>• DeFi educational simulations</li>
                    </ul>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Dual Balance Display */}
            <div className="bg-gradient-to-r from-blue-900 to-purple-900 rounded-lg p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                    <span className="mr-2">💰</span>
                    Dual-Currency Portfolio
                </h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-black/20 rounded-lg p-4">
                        <div className="text-yellow-400 text-sm font-medium">
                            Traditional Currency
                        </div>
                        <div className="text-2xl font-bold text-yellow-400">
                            ₹{dualBalance.rupeesBalance.toLocaleString()}
                        </div>
                        <div className="text-yellow-300 text-xs">Rupees</div>
                    </div>
                    <div className="bg-black/20 rounded-lg p-4">
                        <div className="text-blue-400 text-sm font-medium">
                            Blockchain Currency
                        </div>
                        <div className="text-2xl font-bold text-blue-400">
                            {dualBalance.icpTokenBalance.toFixed(4)}
                        </div>
                        <div className="text-blue-300 text-xs">Web3 Tokens</div>
                    </div>
                </div>
                <div className="mt-4 text-center">
                    <div className="text-gray-300 text-sm">
                        Exchange Rate: 1 ₹ = {exchangeRate} Token • Last
                        Updated:{" "}
                        {new Date(dualBalance.lastUpdated).toLocaleTimeString()}
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex space-x-1 bg-gray-800 rounded-lg p-1">
                {[
                    { id: "overview", name: "Overview", icon: "📊" },
                    { id: "exchange", name: "Exchange", icon: "🔄" },
                    { id: "staking", name: "Staking", icon: "🏦" },
                    { id: "defi", name: "DeFi Lab", icon: "🧪" },
                    { id: "achievements", name: "Achievements", icon: "🏆" },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 flex items-center justify-center py-2 px-4 rounded-md transition-colors ${
                            activeTab === tab.id
                                ? "bg-blue-600 text-white"
                                : "text-gray-400 hover:text-white hover:bg-gray-700"
                        }`}
                    >
                        <span className="mr-2">{tab.icon}</span>
                        {tab.name}
                    </button>
                ))}
            </div>

            {/* Error Display */}
            {error && (
                <div className="bg-red-900/50 border border-red-700 rounded-lg p-4">
                    <div className="text-red-400 font-medium">Error</div>
                    <div className="text-red-300 text-sm">{error}</div>
                    <button
                        onClick={() => setError(null)}
                        className="mt-2 text-red-400 hover:text-red-300 text-sm underline"
                    >
                        Dismiss
                    </button>
                </div>
            )}

            {/* Tab Content */}
            {activeTab === "overview" && (
                <div className="space-y-4">
                    <div className="bg-gray-700 rounded-lg p-6">
                        <h4 className="text-lg font-bold text-white mb-4">
                            🌟 Web3 Banking Overview
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-gray-800 rounded-lg p-4">
                                <h5 className="text-blue-300 font-medium mb-2">
                                    Total Portfolio Value
                                </h5>
                                <div className="text-2xl font-bold text-white">
                                    ₹
                                    {(
                                        dualBalance.rupeesBalance +
                                        dualBalance.icpTokenBalance /
                                            exchangeRate
                                    ).toLocaleString()}
                                </div>
                                <div className="text-gray-400 text-sm">
                                    Combined value in Rupees
                                </div>
                            </div>
                            <div className="bg-gray-800 rounded-lg p-4">
                                <h5 className="text-green-300 font-medium mb-2">
                                    Active Stakes
                                </h5>
                                <div className="text-2xl font-bold text-white">
                                    {stakingInfo.length}
                                </div>
                                <div className="text-gray-400 text-sm">
                                    Earning rewards
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === "exchange" && (
                <CurrencyExchange
                    rupeesBalance={dualBalance.rupeesBalance}
                    icpTokenBalance={dualBalance.icpTokenBalance}
                    onExchange={async (fromCurrency, toCurrency, amount) => {
                        try {
                            const mappedFromCurrency =
                                fromCurrency === "icp"
                                    ? "tokens"
                                    : fromCurrency;
                            const mappedToCurrency =
                                toCurrency === "icp" ? "tokens" : toCurrency;

                            const result = await icpService.exchangeCurrency(
                                mappedFromCurrency as "rupees" | "tokens",
                                mappedToCurrency as "rupees" | "tokens",
                                amount
                            );
                            if (result.success) {
                                await loadWeb3Data(); // Refresh balances
                                return true;
                            }
                            return false;
                        } catch (error) {
                            console.error("Exchange failed:", error);
                            return false;
                        }
                    }}
                />
            )}

            {activeTab === "staking" && (
                <div className="bg-gray-700 rounded-lg p-6">
                    <h4 className="text-lg font-bold text-white mb-4 flex items-center">
                        <span className="mr-2">🏦</span>
                        Token Staking
                    </h4>

                    {/* Staking Form */}
                    <div className="space-y-4 mb-6">
                        <div>
                            <label className="block text-gray-300 text-sm font-medium mb-2">
                                Staking Amount (Tokens)
                            </label>
                            <input
                                type="number"
                                value={stakingAmount}
                                onChange={(e) =>
                                    setStakingAmount(e.target.value)
                                }
                                placeholder="Enter amount to stake"
                                className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white"
                            />
                        </div>

                        <div>
                            <label className="block text-gray-300 text-sm font-medium mb-2">
                                Staking Duration
                            </label>
                            <select
                                value={stakingDuration}
                                onChange={(e) =>
                                    setStakingDuration(parseInt(e.target.value))
                                }
                                className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white"
                            >
                                <option value={30}>30 Days (5% APY)</option>
                                <option value={90}>90 Days (7% APY)</option>
                                <option value={180}>180 Days (10% APY)</option>
                            </select>
                        </div>

                        {stakingAmount && (
                            <div className="bg-green-900/30 rounded-lg p-4">
                                <div className="text-green-300 text-sm font-medium">
                                    Staking Preview
                                </div>
                                <div className="text-white">
                                    Stake: {stakingAmount} Tokens • Duration:{" "}
                                    {stakingDuration} days • APY:{" "}
                                    {getStakingAPY(stakingDuration)}%
                                </div>
                                <div className="text-green-200 text-sm">
                                    Estimated rewards:{" "}
                                    {(
                                        (((parseFloat(stakingAmount || "0") *
                                            getStakingAPY(stakingDuration)) /
                                            100) *
                                            stakingDuration) /
                                        365
                                    ).toFixed(4)}{" "}
                                    Tokens
                                </div>
                            </div>
                        )}

                        <button
                            onClick={handleStakeTokens}
                            disabled={
                                loading ||
                                !stakingAmount ||
                                parseFloat(stakingAmount) >
                                    dualBalance.icpTokenBalance
                            }
                            className="w-full py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {loading ? "Processing Stake..." : "Stake Tokens"}
                        </button>
                    </div>

                    {/* Active Stakes */}
                    {stakingInfo.length > 0 && (
                        <div>
                            <h5 className="text-white font-medium mb-3">
                                Active Stakes
                            </h5>
                            <div className="space-y-3">
                                {stakingInfo.map((stake) => (
                                    <div
                                        key={stake.stakingId}
                                        className="bg-gray-800 rounded-lg p-4"
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="text-white font-medium">
                                                    {stake.stakedAmount} Tokens
                                                </div>
                                                <div className="text-gray-400 text-sm">
                                                    {stake.apy}% APY • Matures:{" "}
                                                    {new Date(
                                                        stake.maturityDate
                                                    ).toLocaleDateString()}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-green-400 font-medium">
                                                    +
                                                    {stake.currentRewards.toFixed(
                                                        4
                                                    )}{" "}
                                                    Tokens
                                                </div>
                                                <div className="text-gray-400 text-sm">
                                                    Current Rewards
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === "defi" && (
                <DeFiSimulation
                    icpTokenBalance={dualBalance.icpTokenBalance}
                    rupeesBalance={dualBalance.rupeesBalance}
                    onBalanceUpdate={(icpChange, rupeesChange) => {
                        setDualBalance((prev) => ({
                            ...prev,
                            icpTokenBalance: prev.icpTokenBalance + icpChange,
                            rupeesBalance: prev.rupeesBalance + rupeesChange,
                            lastUpdated: Date.now(),
                        }));
                    }}
                />
            )}

            {activeTab === "achievements" && (
                <Web3Achievements
                    rupeesBalance={dualBalance.rupeesBalance}
                    icpTokenBalance={dualBalance.icpTokenBalance}
                    onRewardClaim={(rewardType, amount) => {
                        if (rewardType === "rupees") {
                            setDualBalance((prev) => ({
                                ...prev,
                                rupeesBalance: prev.rupeesBalance + amount,
                                lastUpdated: Date.now(),
                            }));
                        } else if (rewardType === "icp") {
                            setDualBalance((prev) => ({
                                ...prev,
                                icpTokenBalance: prev.icpTokenBalance + amount,
                                lastUpdated: Date.now(),
                            }));
                        }
                    }}
                />
            )}
        </div>
    );
};

export default Web3BankingFeatures;
