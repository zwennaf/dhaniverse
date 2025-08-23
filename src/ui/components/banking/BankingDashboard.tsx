import React, { useState, useEffect } from "react";
import DepositWithdrawPanel from "./DepositWithdrawPanel";
import FixedDepositPanel from "./FixedDepositPanel";
import Web3BankingFeatures from "./Web3BankingFeatures";
import StakingPanel from "../web3/StakingPanel";
import Web3Integration from "../Web3Integration";
import {
    bankingApi,
    fixedDepositApi,
    playerStateApi,
} from "../../../utils/api";
import { WalletStatus } from "../../../services/WalletManager";
import { WalletType } from "../../../services/Web3WalletService";
import { icpIntegration } from "../../../services/ICPIntegrationManager";
import { ICP_CONFIG } from "../../../services/config";
import { BankingPolish } from "../polish/FinalPolish";
import { balanceManager } from "../../../services/BalanceManager";
import { icpBalanceManager, ICPToken } from "../../../services/TestnetBalanceManager";
import { stakingService } from "../../../services/StakingService";

interface FixedDeposit {
    _id?: string;
    id?: string;
    amount: number;
    interestRate: number;
    startDate: number;
    duration: number;
    maturityDate: number;
    matured: boolean;
    status?: "active" | "matured" | "claimed";
}

interface BankingDashboardProps {
    onClose: () => void;
    playerRupees: number;
}

const BankingDashboard: React.FC<BankingDashboardProps> = ({
    onClose,
    playerRupees,
}) => {
    // Core banking state
    const [activeTab, setActiveTab] = useState("overview");
    const [bankBalance, setBankBalance] = useState(0);
    const [currentCash, setCurrentCash] = useState(playerRupees);
    const [fixedDeposits, setFixedDeposits] = useState<FixedDeposit[]>([]);
    const [totalRupeesChange, setTotalRupeesChange] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Web3 Integration State
    const [walletStatus, setWalletStatus] = useState<WalletStatus>({ connected: false });
    const [icpTokens, setIcpTokens] = useState<ICPToken[]>([]);
    const [syncInProgress, setSyncInProgress] = useState(false);
    const [showStakingPanel, setShowStakingPanel] = useState(false);
    const [showWeb3Integration, setShowWeb3Integration] = useState(false);

    // Initialize all Web3 services
    useEffect(() => {
        let mounted = true;
        
        const initializeServices = async () => {
            try {
                console.log("Initializing Web3 services...");
                
                // Initialize ICP integration first
                await icpIntegration.initialize();
                if (!mounted) return;
                
                setWalletStatus(icpIntegration.walletManager.getConnectionStatus());
                
                // Initialize ICP balance manager
                await icpBalanceManager.initialize();
                setIcpTokens(icpBalanceManager.getAllTokens());
                
                // Initialize staking service
                await stakingService.initialize();
                
                // Set up listeners
                icpIntegration.walletManager.onConnectionChange((status) => {
                    if (mounted) {
                        setWalletStatus(status);
                        console.log("Wallet status changed:", status);
                    }
                });
                
                // Listen for ICP token balance updates
                icpBalanceManager.onBalanceUpdate((tokens) => {
                    if (mounted) {
                        setIcpTokens(tokens);
                        console.log("Token balances updated:", tokens);
                    }
                });
                
                console.log("Web3 services initialized successfully");
                
            } catch (e) {
                console.warn("Web3 services initialization failed:", e);
                if (mounted) {
                    setError("Failed to initialize Web3 services. Some features may be limited.");
                }
            }
        };

        initializeServices();
        return () => { 
            mounted = false; 
        };
    }, []);

    // Load banking data from backend
    useEffect(() => {
        const loadBankingData = async () => {
            try {
                setLoading(true);
                setError(null);

                const bankData = await bankingApi.getAccount();
                if (bankData.success) {
                    setBankBalance(bankData.data.balance || 0);
                } else {
                    console.warn("Failed to load bank data:", bankData.error);
                }

                const fdData = await fixedDepositApi.getAll();
                if (fdData.success) {
                    setFixedDeposits(fdData.data || []);
                } else {
                    console.warn("Failed to load fixed deposits:", fdData.error);
                }
            } catch (error) {
                console.error("Error loading banking data:", error);
                setError(`Failed to load banking data: ${error}`);
                
                // Fallback to localStorage
                try {
                    const savedBalance = localStorage.getItem('bank_balance');
                    const savedDeposits = localStorage.getItem('fixed_deposits');
                    
                    if (savedBalance) setBankBalance(parseFloat(savedBalance));
                    if (savedDeposits) setFixedDeposits(JSON.parse(savedDeposits));
                } catch (fallbackError) {
                    console.error("Fallback data load failed:", fallbackError);
                }
            } finally {
                setLoading(false);
            }
        };

        loadBankingData();
    }, []);

    // Subscribe to balance manager updates
    useEffect(() => {
        const currentBalance = balanceManager.getBalance();
        setCurrentCash(currentBalance.cash);
        setBankBalance(currentBalance.bankBalance);

        const unsubscribe = balanceManager.onBalanceChange((balance) => {
            setCurrentCash(balance.cash);
            setBankBalance(balance.bankBalance);
        });

        return () => {
            unsubscribe();
        };
    }, []);

    // Enhanced close handler
    const handleClose = () => {
        const finalRupees = playerRupees + totalRupeesChange;

        window.dispatchEvent(
            new CustomEvent("rupee-update", {
                detail: { rupees: finalRupees },
            })
        );

        window.dispatchEvent(
            new CustomEvent("updatePlayerRupees", {
                detail: { rupees: finalRupees, closeUI: true },
            })
        );

        onClose();
    };

    // Wallet connection handlers
    const handleConnectWallet = async (preferredWallet?: WalletType) => {
        try {
            setError(null);
            setLoading(true);
            console.log("Attempting to connect wallet:", preferredWallet);

            const result = preferredWallet
                ? await icpIntegration.walletManager.connectWallet(preferredWallet)
                : await icpIntegration.walletManager.connectWallet();

            console.log("Wallet connection result:", result);

            if (result.success) {
                showSuccessNotification(
                    "🎉 Wallet Connected!",
                    `Address: ${result.address?.slice(0, 20)}... Web3 features unlocked!`
                );
                
                // Auto-sync to blockchain
                try {
                    await handleSyncToBlockchain();
                } catch (syncError) {
                    console.warn("Auto-sync failed:", syncError);
                }
            } else {
                setError(`Failed to connect wallet: ${result.error || "Unknown error"}`);
            }
        } catch (error) {
            console.error("Wallet connection error:", error);
            setError(`Wallet connection error: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setLoading(false);
        }
    };

    const handleSyncToBlockchain = async () => {
        if (syncInProgress) return;

        setSyncInProgress(true);
        try {
            const result = await icpIntegration.syncToBlockchain();
            if (!result.success) {
                setError(result.message);
            } else {
                console.log(result.message);
                showSuccessNotification("🔗 Blockchain Sync", "Data synchronized successfully");
            }
        } catch (error) {
            console.error("Sync error:", error);
            setError(`Sync error: ${error}`);
        } finally {
            setSyncInProgress(false);
        }
    };

    // ICP-specific handlers
    const handleIcpAuthentication = async () => {
        try {
            setLoading(true);
            const success = await icpBalanceManager.authenticateWithII();
            if (success) {
                showSuccessNotification(
                    "🔐 ICP Authentication Successful",
                    "Internet Identity connected successfully"
                );
                await icpBalanceManager.refreshAllBalances();
                setIcpTokens(icpBalanceManager.getAllTokens());
            } else {
                setError("Failed to authenticate with Internet Identity");
            }
        } catch (error) {
            console.error("ICP authentication error:", error);
            setError(`Authentication failed: ${error}`);
        } finally {
            setLoading(false);
        }
    };

    const handleRefreshBalances = async () => {
        try {
            setLoading(true);
            await icpBalanceManager.refreshAllBalances();
            setIcpTokens(icpBalanceManager.getAllTokens());
            showSuccessNotification("🔄 Balances Updated", "Token balances refreshed from blockchain");
        } catch (error) {
            console.error("Balance refresh error:", error);
            setError(`Failed to refresh balances: ${error}`);
        } finally {
            setLoading(false);
        }
    };

    // Banking operations using balance manager
    const handleDeposit = async (amount: number): Promise<boolean> => {
        try {
            const transaction = balanceManager.processDeposit(amount, "Banking System");

            // Try to sync with backend
            try {
                const result = await bankingApi.deposit(amount);
                if (!result.success) {
                    console.warn("Backend deposit failed:", result.error);
                }
            } catch (apiError) {
                console.warn("Backend API error during deposit:", apiError);
            }

            showSuccessNotification(
                "💰 Deposit Successful",
                `₹${amount.toLocaleString()} deposited to your bank account`
            );

            return true;
        } catch (error) {
            console.error("Deposit error:", error);
            setError(`Deposit failed: ${error instanceof Error ? error.message : String(error)}`);
            return false;
        }
    };

    const handleWithdraw = async (amount: number): Promise<boolean> => {
        try {
            const transaction = balanceManager.processWithdrawal(amount, "Banking System");

            // Try to sync with backend
            try {
                const result = await bankingApi.withdraw(amount);
                if (!result.success) {
                    console.warn("Backend withdrawal failed:", result.error);
                }
            } catch (apiError) {
                console.warn("Backend API error during withdrawal:", apiError);
            }

            showSuccessNotification(
                "💸 Withdrawal Successful",
                `₹${amount.toLocaleString()} withdrawn from your bank account`
            );

            return true;
        } catch (error) {
            console.error("Withdrawal error:", error);
            setError(`Withdrawal failed: ${error instanceof Error ? error.message : String(error)}`);
            return false;
        }
    };

    const handleCreateFD = async (amount: number, duration: number): Promise<boolean> => {
        try {
            const result = await fixedDepositApi.create(amount, duration);
            if (result.success) {
                setBankBalance((prevBalance) => prevBalance - amount);
                setFixedDeposits(prev => [...prev, result.data]);
                showSuccessNotification(
                    "📈 Fixed Deposit Created",
                    `₹${amount.toLocaleString()} invested for ${duration} days`
                );
                return true;
            } else {
                setError(result.error || "Failed to create fixed deposit");
                return false;
            }
        } catch (error) {
            console.error("Fixed deposit creation error:", error);
            setError(`Fixed deposit creation failed: ${error}`);
            return false;
        }
    };

    const handleClaimFD = async (fdId: string): Promise<boolean> => {
        try {
            const result = await fixedDepositApi.claim(fdId);
            if (result.success) {
                setBankBalance((prevBalance) => prevBalance + result.data.totalAmount);
                setFixedDeposits(prev => prev.map(fd => 
                    fd.id === fdId ? { ...fd, status: "claimed" } : fd
                ));
                showSuccessNotification(
                    "💰 Fixed Deposit Claimed",
                    `₹${result.data.totalAmount.toLocaleString()} credited to your account`
                );
                return true;
            } else {
                setError(result.error || "Failed to claim fixed deposit");
                return false;
            }
        } catch (error) {
            console.error("Fixed deposit claim error:", error);
            setError(`Fixed deposit claim failed: ${error}`);
            return false;
        }
    };

    const showSuccessNotification = (title: string, message: string) => {
        try {
            const notification = document.createElement("div");
            notification.className =
                "fixed top-4 right-4 bg-gradient-to-r from-dhani-gold to-dhani-gold/90 text-black p-4 rounded-xl shadow-lg z-[60] max-w-sm transform translate-x-full transition-transform duration-300";

            notification.innerHTML = `
                <div class="flex items-start space-x-3">
                    <div class="w-6 h-6 bg-black/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="font-semibold text-sm">${title}</div>
                        <div class="text-xs opacity-80 mt-1">${message}</div>
                    </div>
                </div>
            `;

            document.body.appendChild(notification);

            requestAnimationFrame(() => {
                notification.style.transform = "translateX(0)";
            });

            setTimeout(() => {
                notification.style.transform = "translateX(full)";
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }, 3500);
        } catch (error) {
            console.log(`${title}: ${message}`);
        }
    };

    // Define tabs
    const tabs = [
        {
            id: "overview",
            name: "Overview",
            icon: "📊",
        },
        {
            id: "account",
            name: "Banking",
            icon: "🏦",
        },
        {
            id: "fd",
            name: "Fixed Deposits",
            icon: "💰",
        },
        {
            id: "icp",
            name: "ICP Tokens",
            icon: "🪙",
        },
        {
            id: "staking",
            name: "Staking",
            icon: "🔒",
        },
        ...(walletStatus.connected ? [{
            id: "web3",
            name: "Web3 Features",
            icon: "⚡",
        }] : []),
    ];

    // Render tab content
    const renderTabContent = () => {
        switch (activeTab) {
            case "overview":
                return (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Cash Balance */}
                            <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30 p-6 rounded-xl">
                                <div className="flex items-center space-x-3 mb-4">
                                    <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                                        <span className="text-xl">💵</span>
                                    </div>
                                    <div>
                                        <h3 className="text-white font-bold">Cash on Hand</h3>
                                        <p className="text-green-300 text-sm">Available immediately</p>
                                    </div>
                                </div>
                                <p className="text-2xl font-bold text-white">₹{currentCash.toLocaleString()}</p>
                            </div>

                            {/* Bank Balance */}
                            <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 p-6 rounded-xl">
                                <div className="flex items-center space-x-3 mb-4">
                                    <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                                        <span className="text-xl">🏦</span>
                                    </div>
                                    <div>
                                        <h3 className="text-white font-bold">Bank Balance</h3>
                                        <p className="text-blue-300 text-sm">Secured savings</p>
                                    </div>
                                </div>
                                <p className="text-2xl font-bold text-white">₹{bankBalance.toLocaleString()}</p>
                            </div>

                            {/* Total Portfolio */}
                            <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 p-6 rounded-xl">
                                <div className="flex items-center space-x-3 mb-4">
                                    <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                                        <span className="text-xl">📈</span>
                                    </div>
                                    <div>
                                        <h3 className="text-white font-bold">Total Portfolio</h3>
                                        <p className="text-purple-300 text-sm">All assets combined</p>
                                    </div>
                                </div>
                                <p className="text-2xl font-bold text-white">₹{(currentCash + bankBalance).toLocaleString()}</p>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="bg-white/5 border border-white/10 p-6 rounded-xl">
                            <h3 className="text-white font-bold text-lg mb-4">Quick Actions</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <button
                                    onClick={() => setActiveTab("account")}
                                    className="bg-dhani-gold/20 hover:bg-dhani-gold/30 border border-dhani-gold/50 text-white p-4 rounded-lg transition-colors text-center"
                                >
                                    <div className="text-2xl mb-2">💰</div>
                                    <div className="text-sm font-medium">Deposit/Withdraw</div>
                                </button>
                                <button
                                    onClick={() => setActiveTab("fd")}
                                    className="bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 text-white p-4 rounded-lg transition-colors text-center"
                                >
                                    <div className="text-2xl mb-2">📈</div>
                                    <div className="text-sm font-medium">Fixed Deposits</div>
                                </button>
                                <button
                                    onClick={() => setActiveTab("icp")}
                                    className="bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 text-white p-4 rounded-lg transition-colors text-center"
                                >
                                    <div className="text-2xl mb-2">🪙</div>
                                    <div className="text-sm font-medium">ICP Tokens</div>
                                </button>
                                <button
                                    onClick={() => setShowStakingPanel(true)}
                                    className="bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 text-white p-4 rounded-lg transition-colors text-center"
                                >
                                    <div className="text-2xl mb-2">🔒</div>
                                    <div className="text-sm font-medium">Staking</div>
                                </button>
                            </div>
                        </div>

                        {/* Wallet Status */}
                        {!walletStatus.connected && (
                            <div className="bg-yellow-500/20 border border-yellow-500/50 p-6 rounded-xl">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-yellow-300 font-bold">🔗 Connect Your Wallet</h3>
                                        <p className="text-yellow-200 text-sm">Unlock Web3 features, staking, and DeFi operations</p>
                                    </div>
                                    <button
                                        onClick={() => handleConnectWallet()}
                                        className="bg-dhani-gold hover:bg-dhani-gold/80 text-black px-6 py-2 rounded-lg font-bold transition-colors"
                                    >
                                        Connect Wallet
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                );

            case "account":
                return (
                    <DepositWithdrawPanel
                        playerRupees={currentCash}
                        bankBalance={bankBalance}
                        onDeposit={handleDeposit}
                        onWithdraw={handleWithdraw}
                    />
                );

            case "fd":
                return (
                    <FixedDepositPanel
                        bankBalance={bankBalance}
                        fixedDeposits={fixedDeposits}
                        onCreateFD={handleCreateFD}
                        onClaimFD={handleClaimFD}
                    />
                );

            case "icp":
                return (
                    <div className="space-y-6">
                        {/* ICP Authentication */}
                        {!icpBalanceManager.isAuthenticated() && (
                            <div className="bg-blue-500/20 border border-blue-500/50 p-6 rounded-xl">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-blue-300 font-bold">🔐 ICP Authentication Required</h3>
                                        <p className="text-blue-200 text-sm">Connect with Internet Identity to access ICP features</p>
                                    </div>
                                    <button
                                        onClick={handleIcpAuthentication}
                                        disabled={loading}
                                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-bold transition-colors"
                                    >
                                        {loading ? "Connecting..." : "Connect Internet Identity"}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Token Balances */}
                        <div className="bg-white/5 border border-white/10 p-6 rounded-xl">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-white font-bold text-lg">ICP Token Balances</h3>
                                <button
                                    onClick={handleRefreshBalances}
                                    disabled={loading}
                                    className="bg-dhani-gold/20 hover:bg-dhani-gold/30 disabled:opacity-50 text-dhani-gold px-4 py-2 rounded-lg font-medium transition-colors"
                                >
                                    {loading ? "Refreshing..." : "Refresh"}
                                </button>
                            </div>
                            
                            <div className="space-y-4">
                                {icpTokens.map((token) => (
                                    <div key={token.symbol} className="bg-white/5 border border-white/10 p-4 rounded-lg">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="text-white font-bold">{token.name}</h4>
                                                <p className="text-gray-300 text-sm">{token.symbol}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-white font-bold">{parseFloat(token.balance).toFixed(4)}</p>
                                                {token.usdValue && (
                                                    <p className="text-gray-300 text-sm">
                                                        ${(parseFloat(token.balance) * token.usdValue).toFixed(2)}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                
                                {icpTokens.length === 0 && (
                                    <div className="text-center py-8">
                                        <p className="text-gray-400">No tokens found. Authenticate to view your balances.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );

            case "staking":
                return (
                    <div className="space-y-6">
                        <div className="bg-white/5 border border-white/10 p-6 rounded-xl">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-white font-bold text-lg">🔒 Staking Dashboard</h3>
                                <button
                                    onClick={() => setShowStakingPanel(true)}
                                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-bold transition-colors"
                                >
                                    Open Staking Panel
                                </button>
                            </div>
                            <p className="text-gray-300">
                                Stake your tokens to earn rewards. Click the button above to access the full staking interface.
                            </p>
                        </div>
                    </div>
                );

            case "web3":
                return (
                    <Web3BankingFeatures
                        icpService={icpIntegration.icpService}
                        walletStatus={walletStatus}
                    />
                );

            default:
                return <div className="text-white">Select a tab to view content</div>;
        }
    };

    return (
        <div className="fixed inset-0 flex bg-black items-center justify-center z-50 p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 backdrop-blur-md" onClick={handleClose} />

            {/* Main container */}
            <BankingPolish className="relative w-full max-w-6xl h-full max-h-[95vh] bg-black/95 backdrop-blur-modern border border-dhani-gold/30 rounded-2xl shadow-2xl shadow-dhani-gold/10 flex flex-col overflow-hidden modern-scale-in">
                
                {/* Header */}
                <div className="relative flex items-center justify-between p-6 border-b border-dhani-gold/20 flex-shrink-0">
                    <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-dhani-gold rounded-lg flex items-center justify-center">
                            <span className="text-black text-xl font-bold">🏦</span>
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white tracking-wider">DHANIVERSE BANKING</h1>
                            <p className="text-dhani-gold text-sm">Integrated Traditional & Web3 Banking</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                        {walletStatus.connected && (
                            <div className="bg-green-500/20 border border-green-500/50 px-4 py-2 rounded-lg">
                                <span className="text-green-300 text-sm font-medium">🔗 Wallet Connected</span>
                            </div>
                        )}
                        
                        <button
                            onClick={handleClose}
                            className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-white p-3 rounded-lg transition-colors"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Error display */}
                {error && (
                    <div className="mx-6 mt-4 bg-red-900/30 border border-red-600 p-4 rounded-lg">
                        <div className="flex items-center space-x-2">
                            <span className="text-red-400">⚠️</span>
                            <span className="text-red-200">{error}</span>
                            <button
                                onClick={() => setError(null)}
                                className="ml-auto text-red-400 hover:text-red-300"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex overflow-x-auto border-b border-dhani-gold/20 px-6">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-6 py-4 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${
                                activeTab === tab.id
                                    ? "border-dhani-gold text-dhani-gold"
                                    : "border-transparent text-gray-400 hover:text-gray-300"
                            }`}
                        >
                            <span className="mr-2">{tab.icon}</span>
                            {tab.name}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-2 border-dhani-gold border-t-transparent"></div>
                        </div>
                    ) : (
                        renderTabContent()
                    )}
                </div>
            </BankingPolish>

            {/* Modals */}
            {showStakingPanel && (
                <StakingPanel
                    isOpen={showStakingPanel}
                    onClose={() => setShowStakingPanel(false)}
                />
            )}

            {showWeb3Integration && (
                <Web3Integration
                    position="bottom-right"
                    showStakingButton={true}
                />
            )}
        </div>
    );
};

export default BankingDashboard;
