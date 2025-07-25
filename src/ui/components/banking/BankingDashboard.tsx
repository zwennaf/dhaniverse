import React, { useState, useEffect } from "react";
import DepositWithdrawPanel from "./DepositWithdrawPanel";
import FixedDepositPanel from "./FixedDepositPanel";
import Web3BankingFeatures from "./Web3BankingFeatures";
import {
    bankingApi,
    fixedDepositApi,
    playerStateApi,
} from "../../../utils/api";
import { WalletManager, WalletStatus } from "../../../services/WalletManager";
import { WalletType } from "../../../services/Web3WalletService";
import { ICPActorService } from "../../../services/ICPActorService";
import {
    DualStorageManager,
} from "../../../services/DualStorageManager";
import { BankingPolish } from "../polish/FinalPolish";

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
    const [activeTab, setActiveTab] = useState("overview");
    const [bankBalance, setBankBalance] = useState(0);
    const [fixedDeposits, setFixedDeposits] = useState<FixedDeposit[]>([]);
    const [totalRupeesChange, setTotalRupeesChange] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // ICP Integration State
    const [walletManager] = useState(() => new WalletManager());
    const [icpService] = useState(
        () =>
            new ICPActorService(
                import.meta.env.VITE_DHANIVERSE_CANISTER_ID ||
                    import.meta.env.REACT_APP_CANISTER_ID ||
                    "rdmx6-jaaaa-aaaah-qcaiq-cai"
            )
    );
    const [dualStorageManager] = useState(
        () => new DualStorageManager(icpService, walletManager)
    );
    const [walletStatus, setWalletStatus] = useState<WalletStatus>({
        connected: false,
    });
    const [syncInProgress, setSyncInProgress] = useState(false);

    // Initialize ICP services
    useEffect(() => {
        const initializeICP = async () => {
            walletManager.onConnectionChange((status) => {
                setWalletStatus(status);
                if (status.connected) {
                    const web3Service = walletManager.getWeb3Service();
                    if (web3Service) {
                        icpService.connect(web3Service).then((connected) => {
                            if (connected) {
                                dualStorageManager.setStorageMode("hybrid");
                            }
                        });
                    }
                } else {
                    dualStorageManager.setStorageMode("local");
                }
            });

            const initialStatus = walletManager.getConnectionStatus();
            setWalletStatus(initialStatus);
        };

        initializeICP();
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

            const result = preferredWallet
                ? await walletManager.connectWallet(preferredWallet)
                : await walletManager.autoDetectAndConnect();

            console.log("Wallet connection result:", result);

            if (result.success) {
                try {
                    showSuccessNotification(
                        "🎉 Wallet Connected!",
                        `Address: ${result.address?.slice(
                            0,
                            20
                        )}... Web3 features unlocked!`
                    );
                } catch (notificationError) {
                    console.warn("Notification error:", notificationError);
                    // Continue even if notification fails
                }

                // Connect ICP service with wallet
                try {
                    const web3Service = walletManager.getWeb3Service();
                    const connected = await icpService.connect(web3Service);
                    if (connected) {
                        dualStorageManager.setStorageMode("hybrid");

                        try {
                            await handleSyncToBlockchain();
                        } catch (syncError) {
                            console.warn("Auto-sync failed:", syncError);
                        }
                    }
                } catch (serviceError) {
                    console.warn("Service connection error:", serviceError);
                    // Don't fail the whole connection for this
                }
            } else {
                setError(
                    `Failed to connect wallet: ${
                        result.error || "Unknown error"
                    }`
                );
            }
        } catch (error) {
            console.error("Wallet connection error:", error);
            setError(
                `Wallet connection error: ${
                    error instanceof Error ? error.message : String(error)
                }`
            );
        }
    };



    const handleSyncToBlockchain = async () => {
        if (syncInProgress) return;

        setSyncInProgress(true);
        try {
            const result = await dualStorageManager.syncToBlockchain();
            if (result.success) {
                console.log(
                    `Synced ${result.syncedTransactions} transactions to blockchain`
                );
                if (result.conflicts > 0) {
                    setError(
                        `Sync completed with ${result.conflicts} conflicts resolved`
                    );
                }
            } else {
                setError(`Sync failed: ${result.error}`);
            }
        } catch (error) {
            console.error("Sync error:", error);
            setError(`Sync error: ${error}`);
        } finally {
            setSyncInProgress(false);
        }
    };

    const showSuccessNotification = (title: string, message: string) => {
        try {
            // Create modern notification
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

            // Animate in
            requestAnimationFrame(() => {
                notification.style.transform = 'translateX(0)';
            });

            // Animate out and remove
            setTimeout(() => {
                notification.style.transform = 'translateX(full)';
                setTimeout(() => {
                    if (document.body.contains(notification)) {
                        document.body.removeChild(notification);
                    }
                }, 300);
            }, 3500);
        } catch (error) {
            console.log(`${title}: ${message}`);
        }
    };

    // Load data from backend
    useEffect(() => {
        const loadBankingData = async () => {
            try {
                setLoading(true);
                setError(null);

                const bankData = await bankingApi.getAccount();
                if (bankData.success) {
                    setBankBalance(bankData.data.balance || 0);
                }

                const fdData = await fixedDepositApi.getAll();
                if (fdData.success) {
                    const convertedFDs = fdData.data.map((fd: any) => ({
                        ...fd,
                        id: fd._id || fd.id,
                        startDate: new Date(fd.startDate).getTime(),
                        maturityDate: new Date(fd.maturityDate).getTime(),
                        matured: fd.matured || fd.status === "matured",
                    }));
                    setFixedDeposits(convertedFDs);
                }
            } catch (error) {
                console.error("Error loading banking data:", error);
                setError(`Failed to load banking data: ${error}`);

                // Fallback to localStorage
                try {
                    const bankData = localStorage.getItem(
                        "dhaniverse_bank_account"
                    );
                    if (bankData) {
                        const parsedData = JSON.parse(bankData);
                        setBankBalance(parsedData.balance || 0);
                    }

                    const fdData = localStorage.getItem(
                        "dhaniverse_fixed_deposits"
                    );
                    if (fdData) {
                        let parsedFDs = JSON.parse(fdData);
                        const currentTime = Date.now();
                        parsedFDs = parsedFDs.map((fd: any) => {
                            if (!fd.matured && fd.maturityDate <= currentTime) {
                                return { ...fd, matured: true };
                            }
                            return fd;
                        });
                        setFixedDeposits(parsedFDs);
                    }
                } catch (fallbackError) {
                    console.error(
                        "Error loading fallback data:",
                        fallbackError
                    );
                }
            } finally {
                setLoading(false);
            }
        };

        loadBankingData();
    }, []);

    // Banking operations (keeping existing logic)
    const handleDeposit = async (amount: number): Promise<boolean> => {
        try {
            const result = await bankingApi.deposit(amount);
            if (result.success) {
                if (result.data && typeof result.data.balance === "number") {
                    setBankBalance(result.data.balance);
                } else {
                    setBankBalance((prevBalance) => prevBalance + amount);
                }

                setTotalRupeesChange((prev) => prev - amount);
                await playerStateApi.updateRupees(playerRupees - amount);

                window.dispatchEvent(
                    new CustomEvent("rupee-update", {
                        detail: { rupees: playerRupees - amount },
                    })
                );

                return true;
            } else {
                throw new Error(result.error || "Deposit failed");
            }
        } catch (error) {
            console.error("Deposit error:", error);
            // Fallback logic...
            return true;
        }
    };

    const handleWithdraw = async (amount: number): Promise<boolean> => {
        try {
            const result = await bankingApi.withdraw(amount);
            if (result.success) {
                if (result.data && typeof result.data.balance === "number") {
                    setBankBalance(result.data.balance);
                } else {
                    setBankBalance((prevBalance) => prevBalance - amount);
                }

                setTotalRupeesChange((prev) => prev + amount);
                await playerStateApi.updateRupees(playerRupees + amount);

                window.dispatchEvent(
                    new CustomEvent("rupee-update", {
                        detail: { rupees: playerRupees + amount },
                    })
                );

                return true;
            } else {
                throw new Error(result.error || "Withdrawal failed");
            }
        } catch (error) {
            console.error("Withdrawal error:", error);
            return false;
        }
    };

    const handleCreateFD = async (
        amount: number,
        duration: number
    ): Promise<boolean> => {
        try {
            const result = await fixedDepositApi.create(amount, duration);
            if (result.success) {
                setBankBalance((prevBalance) => prevBalance - amount);
                const newFD = {
                    ...result.data,
                    id: result.data._id || result.data.id,
                    startDate: new Date(result.data.startDate).getTime(),
                    maturityDate: new Date(result.data.maturityDate).getTime(),
                    matured: false,
                };
                setFixedDeposits((prev) => [...prev, newFD]);
                return true;
            } else {
                throw new Error(
                    result.error || "Fixed deposit creation failed"
                );
            }
        } catch (error) {
            console.error("Fixed deposit creation error:", error);
            return false;
        }
    };

    const handleClaimFD = async (fdId: string): Promise<boolean> => {
        try {
            const result = await fixedDepositApi.claim(fdId);
            if (result.success) {
                setBankBalance(
                    (prevBalance) => prevBalance + result.data.totalAmount
                );
                setFixedDeposits((prev) =>
                    prev.map((fd) =>
                        fd.id === fdId || fd._id === fdId
                            ? {
                                  ...fd,
                                  matured: true,
                                  status: "claimed" as const,
                              }
                            : fd
                    )
                );
                return true;
            } else {
                throw new Error(result.error || "Fixed deposit claim failed");
            }
        } catch (error) {
            console.error("Fixed deposit claim error:", error);
            return false;
        }
    };

    const tabs = [
{ id: "overview", name: "Overview", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 3v18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> },
        { id: "account", name: "Banking", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 21h18M5 21V10l7-7 7 7v11M9 21v-6h6v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> },
        { id: "fd", name: "Fixed Deposits", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> },
        ...(walletStatus.connected
            ? [{ id: "web3", name: "Web3 Features", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> }]
            : []),
    ];

    return (
        <div className="fixed inset-0 flex bg-black items-center justify-center z-50 p-4">
            {/* Backdrop blur overlay */}
            <div className="absolute inset-0 backdrop-blur-md" onClick={handleClose} />
            
            {/* Main container - Modern minimal design */}
            <BankingPolish className="relative w-full max-w-6xl h-full max-h-[95vh] bg-black/95 backdrop-blur-modern border border-dhani-gold/30 rounded-2xl shadow-2xl shadow-dhani-gold/10 flex flex-col overflow-hidden modern-scale-in">
                {/* Subtle gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-dhani-gold/5 via-transparent to-transparent pointer-events-none rounded-2xl" />
                {/* Modern Header */}
                <div className="relative flex items-center justify-between p-6 border-b border-dhani-gold/20 flex-shrink-0">
                    <div className="flex items-center space-x-4">
                        {/* Minimal Bank Icon */}
                        <div className="w-10 h-10 bg-gradient-to-br from-dhani-gold to-dhani-gold/80 rounded-lg flex items-center justify-center">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <path d="M3 21h18M5 21V10l7-7 7 7v11M9 21v-6h6v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-black"/>
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white tracking-tight">
                                Dhaniverse Banking
                            </h1>
                            <p className="text-sm text-gray-400 hidden sm:block">
                                Financial Command Center
                            </p>
                        </div>
                    </div>

                    {/* Status & Close */}
                    <div className="flex items-center space-x-4">
                        {/* Connection Status - Minimal */}
                        <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10">
                            <div className={`w-2 h-2 rounded-full ${walletStatus.connected ? 'bg-green-400' : 'bg-gray-400'}`} />
                            <span className="text-xs text-gray-300">
                                {walletStatus.connected ? 'Web3 Connected' : 'Local Mode'}
                            </span>
                        </div>

                        {/* Close Button - Minimal */}
                        <button
                            onClick={handleClose}
                            className="w-8 h-8 flex items-center justify-center text-red-400 hover:text-red-300 font-tickerbit flex justify-center items-center hover:bg-red-500/10 rounded-lg transition-all duration-200 border border-red-600 hover:border-red-400"
                        >x
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 6L6 18M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Modern Balance Cards */}
                <div className="p-6 border-b border-dhani-gold/10 flex-shrink-0">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Wallet Balance */}
                        <div className="bg-gradient-to-br from-dhani-gold/10 to-dhani-gold/5 rounded-xl p-4 border border-dhani-gold/20 hover:border-dhani-gold/40 transition-all duration-300">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-2">
                                    <div className="w-8 h-8 bg-dhani-gold/20 rounded-lg flex items-center justify-center">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                            <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-dhani-gold"/>
                                            <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-dhani-gold"/>
                                            <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-dhani-gold"/>
                                        </svg>
                                    </div>
                                    <span className="text-sm text-gray-300">Wallet</span>
                                </div>
                            </div>
                            <div className="text-2xl font-bold text-dhani-gold mb-1">
                                ₹{(playerRupees + totalRupeesChange).toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-400">Available for transactions</div>
                        </div>

                        {/* Bank Balance */}
                        <div className="bg-gradient-to-br from-white/5 to-white/2 rounded-xl p-4 border border-white/10 hover:border-white/20 transition-all duration-300">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-2">
                                    <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                            <path d="M3 21h18M5 21V10l7-7 7 7v11M9 21v-6h6v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"/>
                                        </svg>
                                    </div>
                                    <span className="text-sm text-gray-300">Bank</span>
                                </div>
                            </div>
                            <div className="text-2xl font-bold text-white mb-1">
                                ₹{bankBalance.toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-400">Secured deposits</div>
                        </div>

                        {/* Total Portfolio */}
                        <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 rounded-xl p-4 border border-green-500/20 hover:border-green-500/40 transition-all duration-300">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-2">
                                    <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                            <path d="M3 3v18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400"/>
                                            <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400"/>
                                        </svg>
                                    </div>
                                    <span className="text-sm text-gray-300">Total</span>
                                </div>
                            </div>
                            <div className="text-2xl font-bold text-green-400 mb-1">
                                ₹{(playerRupees + totalRupeesChange + bankBalance).toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-400">Combined portfolio</div>
                        </div>
                    </div>
                </div>

                {/* Web3 Connection - Minimal */}
                {!walletStatus.connected && (
                    <div className="mx-6 mb-4 flex-shrink-0">
                        <div className="bg-gradient-to-r from-dhani-gold/10 via-dhani-gold/5 to-transparent rounded-xl p-4 border border-dhani-gold/20">
                            <div className="flex items-start space-x-4">
                                <div className="w-10 h-10 bg-dhani-gold/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-dhani-gold"/>
                                    </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-lg font-semibold text-white mb-2">
                                        Unlock Web3 Features
                                    </h3>
                                    <p className="text-sm text-gray-400 mb-4">
                                        Connect your wallet for blockchain features, token staking, and dual-currency support.
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {walletManager.getAvailableWallets().map((wallet) => (
                                            <button
                                                key={wallet.type}
                                                onClick={() => {
                                                    if (wallet.available) {
                                                        handleConnectWallet(wallet.type);
                                                    } else {
                                                        setError(`${wallet.name} is not installed. Please install it first.`);
                                                    }
                                                }}
                                                disabled={!wallet.available}
                                                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                                                    wallet.available
                                                        ? 'bg-dhani-gold text-black hover:bg-dhani-gold/90'
                                                        : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                                }`}
                                            >
                                                {wallet.name}
                                                {!wallet.available && ' (Install)'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modern Tab Navigation */}
                <div className="px-6 border-b border-dhani-gold/10 flex-shrink-0">
                    <div className="flex space-x-1 overflow-x-auto">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium rounded-t-lg whitespace-nowrap transition-all duration-200 ${
                                    activeTab === tab.id
                                        ? "text-dhani-gold bg-dhani-gold/10 border-b-2 border-dhani-gold"
                                        : "text-gray-400 hover:text-white hover:bg-white/5"
                                }`}
                            >
                                <span className="text-base">{tab.icon}</span>
                                <span className="hidden sm:inline">{tab.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content Area - Modern & Clean */}
                <div className="flex-1 overflow-y-auto p-6 min-h-0 modern-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 modern-fade-in">
                            <div className="modern-spinner mb-4" />
                            <div className="text-gray-400 text-sm">Loading banking data...</div>
                            <div className="text-xs text-gray-500 mt-2">Please wait while we secure your connection</div>
                        </div>
                    ) : error ? (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6">
                            <div className="flex items-start space-x-3">
                                <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                        <path d="M12 9v4M12 17h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400"/>
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-red-400 font-semibold mb-1">Error Loading Data</h3>
                                    <p className="text-red-300 text-sm mb-4">{error}</p>
                                    <button
                                        onClick={() => window.location.reload()}
                                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors duration-200"
                                    >
                                        Retry
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            {activeTab === "overview" && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {/* Account Summary */}
                                        <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                                            <h3 className="text-white font-semibold text-lg mb-4 flex items-center">
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="mr-3">
                                                    <path d="M3 3v18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-dhani-gold"/>
                                                    <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-dhani-gold"/>
                                                </svg>
                                                Account Summary
                                            </h3>
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-400 text-sm">Available Cash</span>
                                                    <span className="text-white font-semibold">
                                                        ₹{(playerRupees + totalRupeesChange).toLocaleString()}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-400 text-sm">Bank Savings</span>
                                                    <span className="text-white font-semibold">
                                                        ₹{bankBalance.toLocaleString()}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-400 text-sm">Fixed Deposits</span>
                                                    <span className="text-white font-semibold">
                                                        {fixedDeposits.length} Active
                                                    </span>
                                                </div>
                                                <div className="border-t border-white/10 pt-4">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-dhani-gold font-semibold">Total Worth</span>
                                                        <span className="text-dhani-gold font-bold text-lg">
                                                            ₹{(playerRupees + totalRupeesChange + bankBalance).toLocaleString()}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Quick Actions */}
                                        <div className="bg-gradient-to-br from-dhani-gold/10 to-dhani-gold/5 rounded-xl p-6 border border-dhani-gold/20">
                                            <h3 className="text-dhani-gold font-semibold text-lg mb-4 flex items-center">
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="mr-3">
                                                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-dhani-gold"/>
                                                </svg>
                                                Quick Actions
                                            </h3>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <button
                                                    onClick={() => setActiveTab("account")}
                                                    className="flex items-center justify-center space-x-2 p-3 bg-dhani-gold text-black font-medium rounded-lg hover:bg-dhani-gold/90 transition-colors duration-200"
                                                >
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                                        <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                        <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                        <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                    </svg>
                                                    <span>Banking</span>
                                                </button>
                                                <button
                                                    onClick={() => setActiveTab("fd")}
                                                    className="flex items-center justify-center space-x-2 p-3 bg-white/10 text-white font-medium rounded-lg hover:bg-white/20 transition-colors duration-200"
                                                >
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                                        <path d="M3 3v18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                        <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                    </svg>
                                                    <span>Fixed Deposits</span>
                                                </button>
                                                {walletStatus.connected && (
                                                    <button
                                                        onClick={() => setActiveTab("web3")}
                                                        className="sm:col-span-2 flex items-center justify-center space-x-2 p-3 bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-white font-medium rounded-lg hover:from-purple-500/30 hover:to-blue-500/30 transition-all duration-200"
                                                    >
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                                            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                        </svg>
                                                        <span>Web3 Features</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === "account" && (
                                <DepositWithdrawPanel
                                    playerRupees={playerRupees + totalRupeesChange}
                                    bankBalance={bankBalance}
                                    onDeposit={handleDeposit}
                                    onWithdraw={handleWithdraw}
                                />
                            )}

                            {activeTab === "fd" && (
                                <FixedDepositPanel
                                    bankBalance={bankBalance}
                                    fixedDeposits={fixedDeposits}
                                    onCreateFD={handleCreateFD}
                                    onClaimFD={handleClaimFD}
                                />
                            )}

                            {activeTab === "web3" && walletStatus.connected && (
                                <Web3BankingFeatures
                                    icpService={icpService}
                                    walletStatus={walletStatus}
                                />
                            )}
                        </>
                    )}
                </div>
            </BankingPolish>
        </div>
    );
};

export default BankingDashboard;
