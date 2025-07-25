import React, { useState, useEffect } from "react";
import { ICPActorService } from "../../../services/ICPActorService";
import { WalletManager, WalletStatus } from "../../../services/WalletManager";
import Web3Achievements from "./Web3Achievements";
import CurrencyExchange from "./CurrencyExchange";
import DeFiSimulation from "./DeFiSimulation";
import { AccessibleButton, AccessibleInput, AccessibleTabs } from "../accessibility/AccessibleComponents";
import { StatusIndicator, StatusBadge, LoadingState } from "../feedback/StatusIndicators";

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

    const tabsData = [
        {
            id: "overview",
            label: "Overview",
            content: (
                <div className="space-y-6 animate-fade-in-up">
                    <div className="text-center text-white">
                        <h4 className="text-xl font-bold mb-4">Web3 Banking Dashboard</h4>
                        <p className="text-gray-300">
                            Welcome to the future of banking with blockchain technology
                        </p>
                    </div>
                </div>
            ),
        },
        {
            id: "exchange",
            label: "Exchange",
            content: (
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
                                await loadWeb3Data();
                                return true;
                            }
                            return false;
                        } catch (error) {
                            console.error("Exchange failed:", error);
                            return false;
                        }
                    }}
                />
            ),
        },
        {
            id: "staking",
            label: "Staking",
            content: (
                <div className="space-y-6 animate-fade-in-up">
                    <div
                        className="bg-white/5 border-2 border-white/20 p-6"
                        style={{ imageRendering: "pixelated" }}
                    >
                        <h4 className="text-dhani-gold font-vcr font-bold text-lg tracking-wider mb-4 flex items-center">
                            <span className="mr-3">🏦</span>
                            TOKEN STAKING
                        </h4>

                        {/* Staking Form */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <AccessibleInput
                                label="Staking Amount (Tokens)"
                                type="number"
                                value={stakingAmount}
                                onChange={setStakingAmount}
                                placeholder="Enter amount to stake"
                                helpText={`Available: ${dualBalance.icpTokenBalance.toFixed(
                                    4
                                )} Tokens`}
                            />

                            <div className="space-y-2">
                                <div className="text-white font-vcr font-bold text-sm tracking-wider">
                                    STAKING DURATION
                                </div>
                                <div className="space-y-2">
                                    {[
                                        { value: 30, label: "30 DAYS", apy: 5 },
                                        { value: 90, label: "90 DAYS", apy: 7 },
                                        {
                                            value: 180,
                                            label: "180 DAYS",
                                            apy: 10,
                                        },
                                    ].map((option) => (
                                        <button
                                            key={option.value}
                                            onClick={() =>
                                                setStakingDuration(option.value)
                                            }
                                            className={`
                                                w-full p-3 text-left border-2 font-vcr text-sm transition-all duration-200
                                                ${
                                                    stakingDuration ===
                                                    option.value
                                                        ? "bg-dhani-gold text-black border-dhani-gold animate-pixel-glow"
                                                        : "bg-transparent text-white border-white/20 hover:border-dhani-gold hover:text-dhani-gold"
                                                }
                                            `}
                                            style={{
                                                imageRendering: "pixelated",
                                            }}
                                        >
                                            <div className="flex justify-between items-center">
                                                <span className="font-bold tracking-wider">
                                                    {option.label}
                                                </span>
                                                <span
                                                    className={
                                                        stakingDuration ===
                                                        option.value
                                                            ? "text-black"
                                                            : "text-dhani-gold"
                                                    }
                                                >
                                                    {option.apy}% APY
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Staking Preview */}
                        {stakingAmount && parseFloat(stakingAmount) > 0 && (
                            <div
                                className="bg-dhani-green/20 border-2 border-dhani-green p-4 mb-6 animate-bounce-in"
                                style={{ imageRendering: "pixelated" }}
                            >
                                <div className="text-dhani-green font-vcr font-bold text-sm tracking-wider mb-3">
                                    STAKING PREVIEW
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm font-vcr">
                                    <div>
                                        <div className="text-gray-400 tracking-wider">
                                            STAKE AMOUNT
                                        </div>
                                        <div className="text-white font-bold">
                                            {stakingAmount} TOKENS
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-gray-400 tracking-wider">
                                            DURATION
                                        </div>
                                        <div className="text-white font-bold">
                                            {stakingDuration} DAYS
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-gray-400 tracking-wider">
                                            APY RATE
                                        </div>
                                        <div className="text-dhani-gold font-bold">
                                            {getStakingAPY(stakingDuration)}%
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-gray-400 tracking-wider">
                                            EST. REWARDS
                                        </div>
                                        <div className="text-dhani-green font-bold">
                                            {(
                                                (((parseFloat(stakingAmount) *
                                                    getStakingAPY(
                                                        stakingDuration
                                                    )) /
                                                    100) *
                                                    stakingDuration) /
                                                365
                                            ).toFixed(4)}{" "}
                                            TOKENS
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Stake Button */}
                        <div className="mb-6">
                            {loading ? (
                                <LoadingState
                                    message="Processing Stake..."
                                    className="py-4"
                                />
                            ) : (
                                <AccessibleButton
                                    onClick={handleStakeTokens}
                                    variant="primary"
                                    size="lg"
                                    disabled={
                                        !stakingAmount ||
                                        parseFloat(stakingAmount) <= 0 ||
                                        parseFloat(stakingAmount) >
                                            dualBalance.icpTokenBalance
                                    }
                                    ariaLabel={`Stake ${
                                        stakingAmount || "0"
                                    } tokens for ${stakingDuration} days`}
                                    className="w-full animate-pixel-glow"
                                >
                                    <span className="mr-2">🏦</span>
                                    STAKE TOKENS
                                    {stakingAmount && (
                                        <span className="ml-2 text-black/70">
                                            ({stakingAmount} TOKENS)
                                        </span>
                                    )}
                                </AccessibleButton>
                            )}
                        </div>

                        {/* Active Stakes */}
                        {stakingInfo.length > 0 && (
                            <div>
                                <h5 className="text-dhani-gold font-vcr font-bold text-lg tracking-wider mb-4">
                                    ACTIVE STAKES
                                </h5>
                                <div className="space-y-4">
                                    {stakingInfo.map((stake) => (
                                        <div
                                            key={stake.stakingId}
                                            className="bg-dhani-green/20 border-2 border-dhani-green p-4 hover:scale-105 transition-all duration-300"
                                            style={{
                                                imageRendering: "pixelated",
                                            }}
                                        >
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <div className="text-dhani-gold font-vcr font-bold text-lg">
                                                        {stake.stakedAmount}{" "}
                                                        TOKENS
                                                    </div>
                                                    <div className="text-white font-vcr text-sm">
                                                        {stake.apy}% APY •
                                                        MATURES:{" "}
                                                        {new Date(
                                                            stake.maturityDate
                                                        ).toLocaleDateString()}
                                                    </div>
                                                </div>
                                                <StatusBadge
                                                    type="success"
                                                    text="Active"
                                                    size="sm"
                                                />
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <div className="text-dhani-green font-vcr font-bold">
                                                    CURRENT REWARDS: +
                                                    {stake.currentRewards.toFixed(
                                                        4
                                                    )}{" "}
                                                    TOKENS
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ),
        },
        {
            id: "defi",
            label: "DeFi Lab",
            content: (
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
            ),
        },
        {
            id: "achievements",
            label: "Achievements",
            content: (
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
            ),
        },
    ];

    return (
        <div className="space-y-6">
            {/* Dual Balance Display */}
            <div className="bg-gradient-to-r from-blue-900 to-purple-900 rounded-lg p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                    <span className="mr-2">💰</span>
                    Dual-Currency Portfolio
                </h3>
                <div className="grid grid-cols-2 gap-4">
                    <div
                        className="bg-yellow-500/20 border-2 border-yellow-400 p-4 hover:scale-105 transition-all duration-300 animate-slide-in-left"
                        style={{ imageRendering: "pixelated" }}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-dhani-gold text-sm font-vcr font-bold tracking-wider">
                                TRADITIONAL CURRENCY
                            </div>
                            <StatusIndicator type="success" size="sm" />
                        </div>
                        <div className="text-3xl font-bold text-dhani-gold font-vcr mb-2">
                            ₹{dualBalance.rupeesBalance.toLocaleString()}
                        </div>
                        <div className="text-dhani-gold text-xs font-vcr tracking-wider">
                            RUPEES BALANCE
                        </div>
                    </div>

                    <div
                        className="bg-blue-500/20 border-2 border-blue-400 p-4 hover:scale-105 transition-all duration-300 animate-slide-in-right"
                        style={{ imageRendering: "pixelated" }}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-blue-400 text-sm font-vcr font-bold tracking-wider">
                                BLOCKCHAIN CURRENCY
                            </div>
                            <StatusIndicator type="info" size="sm" />
                        </div>
                        <div className="text-3xl font-bold text-blue-400 font-vcr mb-2">
                            {dualBalance.icpTokenBalance.toFixed(4)}
                        </div>
                        <div className="text-blue-400 text-xs font-vcr tracking-wider">
                            WEB3 TOKENS
                        </div>
                    </div>
                </div>

                <div
                    className="mt-6 text-center bg-black/20 border border-white/20 p-3"
                    style={{ imageRendering: "pixelated" }}
                >
                    <div className="text-white font-vcr text-sm tracking-wider">
                        EXCHANGE RATE: 1 ₹ = {exchangeRate} TOKEN • LAST
                        UPDATED:{" "}
                        {new Date(dualBalance.lastUpdated).toLocaleTimeString()}
                    </div>
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div
                    className="bg-red-500/20 border-2 border-red-500 p-4 animate-bounce-in"
                    style={{ imageRendering: "pixelated" }}
                >
                    <div className="flex items-center space-x-3">
                        <StatusIndicator type="error" size="md" />
                        <div>
                            <div className="text-red-400 font-vcr font-bold tracking-wider text-sm">
                                WEB3 ERROR
                            </div>
                            <div className="text-red-300 font-vcr text-sm">
                                {error}
                            </div>
                        </div>
                    </div>
                    <AccessibleButton
                        onClick={() => setError(null)}
                        variant="secondary"
                        size="sm"
                        className="mt-3"
                    >
                        DISMISS
                    </AccessibleButton>
                </div>
            )}

            {/* Enhanced Tab Navigation */}
            <AccessibleTabs
                tabs={tabsData}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                className="animate-slide-in-up"
            />
        </div>
    );
};

export default Web3BankingFeatures;
