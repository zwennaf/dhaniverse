import React, { useState, useEffect } from "react";
import { ICPActorService } from "../../../services/ICPActorService";
import { WalletStatus } from "../../../services/WalletManager";
import Web3Achievements from "./Web3Achievements";
import CurrencyExchange from "./CurrencyExchange";
import DeFiSimulation from "./DeFiSimulation";
import { AccessibleTabs } from "../accessibility/AccessibleComponents";
import { StatusIndicator, LoadingState } from "../feedback/StatusIndicators";

interface Web3BankingFeaturesProps {
    icpService: ICPActorService;
    walletStatus: WalletStatus;
}

interface DualBalance {
    rupeesBalance: number;
    icpTokenBalance: number;
    lastUpdated: number;
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
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (walletStatus.connected && icpService.isActorConnected()) {
            loadWeb3Data();
        }
    }, [walletStatus.connected, icpService]);

    const loadWeb3Data = async () => {
        try {
            setLoading(true);
            setError(null);

            const balance = await icpService.getDualBalance();
            setDualBalance({
                rupeesBalance: balance.rupeesBalance,
                icpTokenBalance: balance.tokenBalance,
                lastUpdated: balance.lastUpdated,
            });
        } catch (e) {
            console.error("Failed to load Web3 data:", e);
            setError(`Failed to load Web3 data: ${e}`);
        } finally {
            setLoading(false);
        }
    };

    const tabsData = [
        {
            id: "overview",
            label: "Overview",
            content: (
                <div className="space-y-6 animate-fade-in-up">
                    <div className="text-center text-white">
                        <h4 className="text-xl font-bold mb-4">Web3 Banking Dashboard</h4>
                        <p className="text-gray-300">Welcome to the future of banking with blockchain technology</p>
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
                            const mappedFromCurrency = fromCurrency === "icp" ? "tokens" : fromCurrency;
                            const mappedToCurrency = toCurrency === "icp" ? "tokens" : toCurrency;

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
            {loading && <LoadingState message="Loading Web3 data..." />}

            {/* Dual Balance Display */}
            <div className="bg-gradient-to-r from-blue-900 to-purple-900 rounded-lg p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                    <span className="mr-2">💰</span>
                    Dual-Currency Portfolio
                </h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-yellow-500/20 border-2 border-yellow-400 p-4">
                        <div className="text-3xl font-bold text-dhani-gold">₹{dualBalance.rupeesBalance.toLocaleString()}</div>
                        <div className="text-dhani-gold text-xs">RUPEES BALANCE</div>
                    </div>
                    <div className="bg-blue-500/20 border-2 border-blue-400 p-4">
                        <div className="text-3xl font-bold text-blue-400">{dualBalance.icpTokenBalance.toFixed(4)}</div>
                        <div className="text-blue-400 text-xs">WEB3 TOKENS</div>
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-red-500/20 border-2 border-red-500 p-4">
                    <div className="text-red-300">{error}</div>
                </div>
            )}

            <AccessibleTabs tabs={tabsData} activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
    );
};

export default Web3BankingFeatures;
