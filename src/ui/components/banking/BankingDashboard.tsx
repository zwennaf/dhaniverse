import React, { useState, useEffect } from "react";
import DepositWithdrawPanel from "./DepositWithdrawPanel";
import FixedDepositPanel from "./FixedDepositPanel";
import Web3BankingFeatures from "./Web3BankingFeatures";
import Web3Integration from "../Web3Integration";
import DeFiBankingVault from "./DeFiBankingVault";
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
import { canisterService } from "../../../services/CanisterService";

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
    const [loading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Web3 Integration State
    const [walletStatus, setWalletStatus] = useState<WalletStatus>({ connected: false });
    const [icpTokens, setIcpTokens] = useState<ICPToken[]>([]);
    const [syncInProgress, setSyncInProgress] = useState(false);
    const [showWeb3Integration, setShowWeb3Integration] = useState(false);
    const [showExchangeModal, setShowExchangeModal] = useState(false);
    const [exchangeFrom, setExchangeFrom] = useState<string | null>(null);
    const [exchangeTo, setExchangeTo] = useState<string>("DHANI");
    const [exchangeAmount, setExchangeAmount] = useState<number | null>(null);
    const [usdPrices, setUsdPrices] = useState<Record<string, number>>({});
    
    // DeFi Vault State
    const [showDeFiVault, setShowDeFiVault] = useState(false);

    // Initialize all Web3 services
    useEffect(() => {
        let mounted = true;
        
        const initializeServices = async () => {
            try {
                console.log("Initializing Web3 services...");
                
                // Initialize canister service first
                await canisterService.initialize();
                if (!mounted) return;
                
                // Initialize ICP integration
                await icpIntegration.initialize();
                if (!mounted) return;
                
                setWalletStatus(icpIntegration.walletManager.getConnectionStatus());
                
                // Initialize ICP balance manager
                await icpBalanceManager.initialize();
                setIcpTokens(icpBalanceManager.getAllTokens());
                
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
                
                // Fetch USD prices from canister instead of client-side
                try {
                    await canisterService.updatePricesFromExternal();
                    const priceFeeds = await canisterService.getAllPriceFeeds();
                    const prices: Record<string, number> = {};
                    
                    priceFeeds.forEach(([symbol, price]) => {
                        prices[symbol] = price;
                    });
                    
                    setUsdPrices(prices);
                    console.log('Loaded prices from canister:', prices);
                } catch (e) {
                    console.warn('Failed to fetch prices from canister, falling back to client-side:', e);
                    
                    // Fallback to client-side pricing
                    try {
                        const mapping: Record<string, string> = { ICP: 'internet-computer' };
                        const ids = Object.values(mapping).join(',');
                        if (ids) {
                            const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`);
                            const data = await res.json();
                            const prices: Record<string, number> = {};
                            Object.entries(mapping).forEach(([symbol, id]) => {
                                prices[symbol] = data[id]?.usd || 0;
                            });
                            setUsdPrices(prices);
                        }
                    } catch (fallbackError) {
                        console.warn('Client-side price fetch also failed:', fallbackError);
                    }
                }
                
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

    // Load banking data from backend and canister
    useEffect(() => {
        const loadBankingData = async () => {
            try {
                setError(null);

                // Try canister-based authentication and balance first
                try {
                    const initialized = await canisterService.initialize();
                    if (initialized) {
                        console.log("Canister service initialized");
                        
                        // Check if already authenticated
                        if (await canisterService.isAuthenticated()) {
                            console.log("User already authenticated with Internet Identity");
                            
                            // Try to get balance with a test wallet address
                            const testAddress = "test-wallet-address";
                            const canisterBalance = await canisterService.getBalanceNoAuth(testAddress);
                            if (canisterBalance && canisterBalance.rupees_balance) {
                                setBankBalance(Number(canisterBalance.rupees_balance));
                                console.log("Loaded bank balance from canister:", canisterBalance.rupees_balance);
                            }
                        } else {
                            console.log("User not authenticated with Internet Identity");
                        }
                    }
                } catch (canisterError) {
                    console.warn("Canister initialization failed, falling back to traditional backend:", canisterError);
                }

                // Fallback to traditional backend
                const bankData = await bankingApi.getAccount();
                if (bankData.success && bankData.data) {
                    setBankBalance(bankData.data.balance || 0);
                } else if (bankData.error === "No bank account found") {
                    // No bank account exists yet - this is normal for new users
                    console.log("No bank account found - user needs to create one first");
                    setBankBalance(0);
                } else {
                    console.warn("Failed to load bank data:", bankData.error);
                    setBankBalance(0);
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
            console.log("Attempting to connect wallet:", preferredWallet);

            // Try canister-based Internet Identity authentication first for ICP
            if (!preferredWallet) {
                try {
                    const initialized = await canisterService.initialize();
                    if (initialized) {
                        const authenticated = await canisterService.authenticateWithII();
                        if (authenticated) {
                            showSuccessNotification(
                                "🔐 Internet Identity Connected!",
                                "Authenticated with Internet Identity. On-chain features unlocked!"
                            );
                            
                            // Refresh balance from canister
                            try {
                                const principal = canisterService.getPrincipal();
                                if (principal) {
                                    const principalStr = principal.toString();
                                    const balance = await canisterService.getBalanceNoAuth(principalStr);
                                    setBankBalance(Number(balance.rupees_balance || 0));
                                }
                            } catch (balanceError) {
                                console.warn("Failed to refresh balance after auth:", balanceError);
                            }
                            
                            return;
                        }
                    }
                } catch (canisterError) {
                    console.warn("Canister authentication failed, falling back to traditional wallet:", canisterError);
                }
            }

            // Fallback to traditional wallet connection for Web3 wallets
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
            console.log('Starting ICP authentication...');
            
            // Initialize and authenticate with canister service
            console.log('Initializing canister service...');
            const initialized = await canisterService.initialize();
            if (!initialized) {
                throw new Error("Failed to initialize canister service - check network connection");
            }
            
            console.log('Canister service initialized, attempting authentication...');
            const success = await canisterService.authenticateWithII();
            if (success) {
                showSuccessNotification(
                    "🔐 ICP Authentication Successful",
                    "Internet Identity connected successfully"
                );
                
                console.log('Authentication successful, refreshing balance...');
                // Refresh balance from canister
                try {
                    const principal = canisterService.getPrincipal();
                    if (principal) {
                        const principalStr = principal.toString();
                        const balance = await canisterService.getBalanceNoAuth(principalStr);
                        setBankBalance(Number(balance.rupees_balance || 0));
                        
                        // Also try to get multiple token balances
                        const tokenBalance = await canisterService.getDualBalance(principalStr);
                        console.log("Token balance from canister:", tokenBalance);
                    }
                } catch (balanceError) {
                    console.warn("Failed to refresh balance:", balanceError);
                }
            } else {
                setError("Failed to authenticate with Internet Identity");
                showErrorNotification(
                    "❌ Authentication Failed",
                    "Could not connect to Internet Identity"
                );
            }
        } catch (error) {
            console.error("ICP authentication error:", error);
            let errorMessage = "Unknown authentication error";
            
            if (error instanceof Error) {
                errorMessage = error.message;
            } else if (typeof error === 'string') {
                errorMessage = error;
            }
            
            console.error("Full error details:", {
                error,
                type: typeof error,
                message: errorMessage
            });
            
            setError(`Authentication failed: ${errorMessage}`);
            showErrorNotification(
                "❌ Connection Failed",
                `Failed to connect to ICP canister: ${errorMessage}`
            );
        }
    };

    const handleRefreshBalances = async () => {
        try {
            await icpBalanceManager.refreshAllBalances();
            setIcpTokens(icpBalanceManager.getAllTokens());
            showSuccessNotification("🔄 Balances Updated", "Token balances refreshed from blockchain");
        } catch (error) {
            console.error("Balance refresh error:", error);
            setError(`Failed to refresh balances: ${error}`);
        }
    };

    // Request tokens from a test faucet (UI helper)
    const handleRequestFaucet = async (tokenSymbol: string, amount = '100') => {
        try {
            const ok = await icpBalanceManager.requestFromFaucet(tokenSymbol, amount);
            if (ok) {
                setIcpTokens(icpBalanceManager.getAllTokens());
                showSuccessNotification('🧪 Faucet', `Added ${amount} ${tokenSymbol} (test)`);
            } else {
                setError('Faucet request failed');
            }
        } catch (e) {
            console.error('Faucet UI error:', e);
            setError(`Faucet request failed: ${e}`);
        }
    };

    // Quick exchange UI helper (very small demo flow)
    const handleQuickExchange = async (fromSymbol: string) => {
        // Open modal with prefilled from token
        setExchangeFrom(fromSymbol);
        setExchangeTo("DHANI");
        setExchangeAmount(null);
        setShowExchangeModal(true);
    };

    const performExchange = async () => {
        try {
            if (!exchangeFrom || !exchangeTo || !exchangeAmount || exchangeAmount <= 0) return;

            const ok = await icpBalanceManager.exchangeCurrency(exchangeFrom, exchangeTo, exchangeAmount);
            if (ok) {
                await icpBalanceManager.refreshAllBalances();
                setIcpTokens(icpBalanceManager.getAllTokens());
                setShowExchangeModal(false);
                showSuccessNotification('🔁 Exchange', `Swapped ${exchangeAmount} ${exchangeFrom} → ${exchangeTo}`);
            } else {
                setError('Exchange failed');
            }
        } catch (e) {
            console.error('Exchange error:', e);
            setError(`Exchange failed: ${e}`);
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

    const showErrorNotification = (title: string, message: string) => {
        try {
            const notification = document.createElement("div");
            notification.className =
                "fixed top-4 right-4 bg-red-600 text-white px-6 py-4 rounded-lg shadow-lg z-50 transform translate-x-full transition-transform duration-300";
            notification.innerHTML = `
                <div class="flex items-center space-x-3">
                    <div class="text-xl">❌</div>
                    <div>
                        <div class="font-bold">${title}</div>
                        <div class="text-sm opacity-90">${message}</div>
                    </div>
                </div>
            `;

            document.body.appendChild(notification);

            setTimeout(() => {
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
            id: "defi",
            name: "DeFi Vault",
            icon: "🚀",
        },
        {
            id: "icp",
            name: "ICP Tokens",
            icon: "🪙",
        },
    // legacy feature tab removed
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
                                    className="bg-black border border-yellow-600/30 text-white p-6 rounded transition-colors duration-200 text-center hover:border-yellow-500"
                                >
                                    <div className="text-lg font-light text-yellow-500 mb-2">FIXED DEPOSITS</div>
                                    <div className="text-sm text-gray-400">Secure investments</div>
                                </button>
                                <button
                                    onClick={() => setActiveTab("defi")}
                                    className="bg-black border border-yellow-600/30 text-white p-6 rounded transition-colors duration-200 text-center hover:border-yellow-500"
                                >
                                    <div className="text-lg font-light text-yellow-500 mb-2">DEFI VAULT</div>
                                    <div className="text-sm text-gray-400">Decentralized finance</div>
                                </button>
                                <button
                                    onClick={() => setActiveTab("icp")}
                                    className="bg-black border border-yellow-600/30 text-white p-6 rounded transition-colors duration-200 text-center hover:border-yellow-500"
                                >
                                    <div className="text-lg font-light text-yellow-500 mb-2">ICP TOKENS</div>
                                    <div className="text-sm text-gray-400">Internet Computer Protocol</div>
                                </button>
                                {/* feature button removed */}
                            </div>
                        </div>

                        {/* Wallet Status */}
                        {!walletStatus.connected && (
                            <div className="bg-yellow-500/20 border border-yellow-500/50 p-6 rounded-xl">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-yellow-300 font-bold">🔗 Connect Your Wallet</h3>
                                        <p className="text-yellow-200 text-sm">Unlock Web3 features and DeFi operations</p>
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

            case "defi":
                return (
                    <DeFiBankingVault
                        isOpen={true}
                        onClose={() => setActiveTab("overview")}
                        walletAddress={walletStatus.address || "demo_user"}
                    />
                );

            case "icp":
                return (
                    <div className="space-y-6">
                        {/* ICP Authentication */}
                        {!canisterService.isAuthenticated() && (
                            <div className="bg-blue-500/20 border border-blue-500/50 p-6 rounded-xl">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-blue-300 font-bold">🔐 ICP Authentication Required</h3>
                                        <p className="text-blue-200 text-sm">Connect with Internet Identity to access on-chain ICP features</p>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <button
                                            onClick={handleIcpAuthentication}
                                            disabled={loading}
                                            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-bold transition-colors"
                                        >
                                            {loading ? "Connecting..." : "Internet Identity"}
                                        </button>
                                        <button
                                            onClick={() => handleConnectWallet()}
                                            disabled={loading}
                                            className="bg-dhani-gold hover:bg-dhani-gold/80 disabled:opacity-50 text-black px-6 py-2 rounded-lg font-bold transition-colors"
                                        >
                                            {loading ? "Connecting..." : "Web3 Wallet"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Token Balances */}
                        <div className="bg-white/5 border border-white/10 p-6 rounded-xl">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-white font-bold text-lg">ICP Token Balances</h3>
                                <div className="flex items-center space-x-3">
                                    <button
                                        onClick={async () => { await handleRefreshBalances(); setIcpTokens(icpBalanceManager.getAllTokens()); }}
                                        disabled={loading}
                                        className="bg-dhani-gold/20 hover:bg-dhani-gold/30 disabled:opacity-50 text-dhani-gold px-4 py-2 rounded-lg font-medium transition-colors"
                                    >
                                        {loading ? "Refreshing..." : "Refresh"}
                                    </button>
                                    <button
                                        onClick={() => window.open('https://ic0.app/?canisterId=dzbzg-eqaaa-aaaap-an3rq-cai', '_blank')}
                                        className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-lg text-sm"
                                    >
                                        Candid UI
                                    </button>
                                    {icpBalanceManager.isAuthenticated() ? (
                                        <button
                                            onClick={async () => { await icpBalanceManager.logout(); setIcpTokens(icpBalanceManager.getAllTokens()); setWalletStatus({ connected: false }); showSuccessNotification('🔓 Logged out', 'Internet Identity disconnected'); }}
                                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium"
                                        >
                                            Logout
                                        </button>
                                    ) : null}
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                {icpTokens.map((token) => (
                                    <div key={token.symbol} className="bg-white/5 border border-white/10 p-4 rounded-lg flex items-center justify-between">
                                        <div className="flex items-center space-x-4">
                                            <div className="w-10 h-10 rounded-md bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center text-white font-bold">{token.symbol[0]}</div>
                                            <div>
                                                <h4 className="text-white font-bold">{token.name}</h4>
                                                <p className="text-gray-300 text-sm">{token.symbol}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center space-x-4">
                                            <div className="text-right mr-4">
                                                <p className="text-white font-bold">{parseFloat(token.balance).toLocaleString()}</p>
                                                {token.usdValue ? (
                                                    <p className="text-gray-300 text-sm">${(parseFloat(token.balance) * token.usdValue).toFixed(2)}</p>
                                                ) : (
                                                    <p className="text-gray-400 text-xs">USD value unavailable</p>
                                                )}
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <button
                                                    onClick={() => handleRequestFaucet(token.symbol)}
                                                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md text-sm"
                                                >
                                                    Faucet
                                                </button>
                                                <button
                                                    onClick={() => handleQuickExchange(token.symbol)}
                                                    className="bg-dhani-gold hover:bg-dhani-gold/80 text-black px-3 py-2 rounded-md text-sm"
                                                >
                                                    Exchange
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                
                                {icpTokens.length === 0 && (
                                    <div className="text-center py-8">
                                        <p className="text-gray-400">No tokens found. Authenticate to view your balances.</p>
                                        <div className="mt-4">
                                            <button onClick={handleIcpAuthentication} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg">Connect Internet Identity</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );

            // feature content removed

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
        <div className="fixed inset-0 bg-black">
            {/* Main container */}
            <BankingPolish className="w-full h-full bg-black/95 backdrop-blur-modern border-0 rounded-none shadow-2xl shadow-dhani-gold/10 flex flex-col overflow-hidden">
                
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
                    {renderTabContent()}
                </div>
            </BankingPolish>

            {/* Modals */}
            {showWeb3Integration && (
                <Web3Integration
                    position="bottom-right"
                />
            )}
            {/* Exchange Modal */}
            {showExchangeModal && (
                <div className="fixed inset-0 z-60 flex items-center justify-center bg-black bg-opacity-60">
                    <div className="bg-black/95 border border-dhani-gold/20 rounded-xl p-6 w-full max-w-md">
                        <h3 className="text-white text-lg font-bold mb-4">Exchange {exchangeFrom}</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="text-sm text-gray-300">From</label>
                                <input value={exchangeFrom || ''} disabled className="w-full mt-1 p-2 bg-white/5 rounded-md text-white" />
                            </div>
                            <div>
                                <label className="text-sm text-gray-300">To</label>
                                <input value={exchangeTo} onChange={(e) => setExchangeTo(e.target.value.toUpperCase())} className="w-full mt-1 p-2 bg-white/5 rounded-md text-white" />
                            </div>
                            <div>
                                <label className="text-sm text-gray-300">Amount</label>
                                <input type="number" value={exchangeAmount ?? ''} onChange={(e) => setExchangeAmount(parseFloat(e.target.value))} className="w-full mt-1 p-2 bg-white/5 rounded-md text-white" />
                            </div>
                            <div className="flex justify-end space-x-2 mt-4">
                                <button onClick={() => setShowExchangeModal(false)} className="px-4 py-2 rounded-md bg-gray-700 text-white">Cancel</button>
                                <button onClick={performExchange} className="px-4 py-2 rounded-md bg-dhani-gold text-black">Exchange</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BankingDashboard;
