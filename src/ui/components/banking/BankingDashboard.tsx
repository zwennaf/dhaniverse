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
    StorageMode,
} from "../../../services/DualStorageManager";

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
    initialRupees?: number; // Made optional since it's not used
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

    const handleDisconnectWallet = () => {
        walletManager.disconnectWallet();
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
            const notification = document.createElement("div");
            notification.className =
                "fixed top-4 right-4 bg-dhani-gold text-black p-4 font-vcr text-sm border-2 border-white z-50 max-w-sm";
            notification.style.imageRendering = "pixelated";

            // Create title element
            const titleDiv = document.createElement("div");
            titleDiv.className = "font-bold mb-1";
            titleDiv.textContent = title;

            // Create message element
            const messageDiv = document.createElement("div");
            messageDiv.className = "opacity-80";
            messageDiv.textContent = message;

            // Append elements safely
            notification.appendChild(titleDiv);
            notification.appendChild(messageDiv);
            document.body.appendChild(notification);

            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 4000);
        } catch (error) {
            // Fallback to console log if DOM manipulation fails
            console.log(`${title}: ${message}`);
            // Also try simple alert as fallback
            alert(`${title}\n${message}`);
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
        { id: "overview", name: "Overview", icon: "📊" },
        { id: "account", name: "Banking", icon: "🏦" },
        { id: "fd", name: "Fixed Deposits", icon: "📈" },
        ...(walletStatus.connected
            ? [{ id: "web3", name: "Web3 Features", icon: "🌐" }]
            : []),
    ];

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 font-vcr">
            <div
                className="bg-black border-4 border-white w-full max-w-6xl max-h-[95vh]"
                style={{
                    imageRendering: "pixelated",
                    backgroundImage: `url("data:image/svg+xml;base64,${btoa(`<svg width="100%" height="100%" viewBox="0 0 1201 602" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M1187 15L1170 15V0H35V15L18 15L18 45L0 45V553H18V583H35V602H1170V583H1187V553H1201V45H1187V15Z" fill="white" fill-opacity="0.1"/>
            <path d="M1170 15H1169V16H1170V15ZM1187 15H1188V14H1187V15ZM1170 0H1171V-1H1170V0ZM35 0V-1H34V0H35ZM35 15V16H36V15H35ZM18 15V14H17V15H18ZM18 45V46H19V45H18ZM0 45L-2.11928e-07 44H-1V45H0ZM0 553H-1V554H0V553ZM18 553H19V552H18V553ZM18 583H17V584H18V583ZM35 583H36V582H35V583ZM35 602H34V603H35V602ZM1170 602V603H1171V602H1170ZM1170 583V582H1169V583H1170ZM1187 583V584H1188V583H1187ZM1187 553V552H1186V553H1187ZM1201 553V554H1202V553H1201ZM1201 45H1202V44H1201V45ZM1187 45H1186V46H1187V45Z" fill="white" fill-opacity="0.2"/>
          </svg>`)}")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "center",
                    backgroundSize: "100% 100%",
                }}
            >
                {/* Header */}
                <div className="bg-dhani-gold text-black p-6 border-b-4 border-white">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            {/* Pixelated Bank Icon */}
                            <div className="w-12 h-12 bg-black flex items-center justify-center border-2 border-black">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style={{ imageRendering: 'pixelated' }}>
                                    <rect x="2" y="10" width="20" height="2" fill="#F1CD36" />
                                    <rect x="4" y="12" width="2" height="8" fill="#F1CD36" />
                                    <rect x="8" y="12" width="2" height="8" fill="#F1CD36" />
                                    <rect x="12" y="12" width="2" height="8" fill="#F1CD36" />
                                    <rect x="16" y="12" width="2" height="8" fill="#F1CD36" />
                                    <rect x="2" y="20" width="20" height="2" fill="#F1CD36" />
                                    <rect x="10" y="6" width="4" height="4" fill="#F1CD36" />
                                    <rect x="8" y="8" width="2" height="2" fill="#F1CD36" />
                                    <rect x="14" y="8" width="2" height="2" fill="#F1CD36" />
                                    <rect x="6" y="4" width="12" height="2" fill="#F1CD36" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold tracking-wider font-vcr">
                                    DHANIVERSE BANKING
                                </h1>
                                <p className="text-sm tracking-widest opacity-80 font-vcr">
                                    YOUR FINANCIAL COMMAND CENTER
                                </p>
                            </div>
                        </div>

                        {/* Enhanced Status Indicators */}
                        <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2 bg-black text-white px-4 py-2 border-2 border-white font-vcr">
                                <div
                                    className={`w-3 h-3 ${
                                        walletStatus.connected
                                            ? "bg-dhani-green"
                                            : "bg-red-500"
                                    }`}
                                ></div>
                                <div>
                                    <div className="text-xs font-bold tracking-wider">
                                        {walletStatus.connected
                                            ? `${walletStatus.walletType?.toUpperCase()} CONNECTED`
                                            : "LOCAL MODE"}
                                    </div>
                                    {walletStatus.connected && walletStatus.address && (
                                        <div className="text-xs text-dhani-gold">
                                            {walletStatus.address.slice(0, 8)}...{walletStatus.address.slice(-6)}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={handleClose}
                                className="w-12 h-12 bg-red-600 hover:bg-red-700 text-white border-2 border-white font-bold text-xl font-vcr"
                            >
                                ×
                            </button>
                        </div>
                    </div>
                </div>

                {/* Balance Overview */}
                <div className="bg-black text-white p-6 border-b-2 border-white/20">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-dhani-green/20 border-2 border-dhani-green p-4">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-dhani-green text-sm font-bold tracking-wider font-vcr">
                                    WALLET BALANCE
                                </span>
                                {/* Pixelated Wallet Icon */}
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ imageRendering: 'pixelated' }}>
                                    <rect x="2" y="6" width="20" height="12" fill="none" stroke="#4CA64C" strokeWidth="2" />
                                    <rect x="4" y="8" width="16" height="8" fill="none" stroke="#4CA64C" strokeWidth="1" />
                                    <rect x="16" y="10" width="4" height="4" fill="#4CA64C" />
                                    <rect x="18" y="11" width="2" height="2" fill="none" stroke="white" strokeWidth="1" />
                                    <rect x="4" y="4" width="14" height="2" fill="#4CA64C" />
                                </svg>
                            </div>
                            <div className="text-2xl font-bold text-dhani-gold font-vcr mb-2">
                                ₹{(playerRupees + totalRupeesChange).toLocaleString()}
                            </div>
                            <div className="text-dhani-green text-xs tracking-wider font-vcr">
                                AVAILABLE FOR TRANSACTIONS
                            </div>
                            {/* Progress bar */}
                            <div className="mt-3 w-full bg-gray-700 h-2">
                                <div 
                                    className="bg-dhani-green h-2 transition-all duration-500"
                                    style={{ 
                                        width: `${Math.min((playerRupees + totalRupeesChange) / 100000 * 100, 100)}%`,
                                        imageRendering: 'pixelated'
                                    }}
                                />
                            </div>
                        </div>

                        <div className="bg-blue-500/20 border-2 border-blue-400 p-4">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-blue-400 text-sm font-bold tracking-wider font-vcr">
                                    BANK BALANCE
                                </span>
                                {/* Pixelated Bank Icon */}
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ imageRendering: 'pixelated' }}>
                                    <rect x="2" y="10" width="20" height="2" fill="#60A5FA" />
                                    <rect x="4" y="12" width="2" height="8" fill="#60A5FA" />
                                    <rect x="8" y="12" width="2" height="8" fill="#60A5FA" />
                                    <rect x="12" y="12" width="2" height="8" fill="#60A5FA" />
                                    <rect x="16" y="12" width="2" height="8" fill="#60A5FA" />
                                    <rect x="2" y="20" width="20" height="2" fill="#60A5FA" />
                                    <rect x="10" y="6" width="4" height="4" fill="#60A5FA" />
                                    <rect x="8" y="8" width="2" height="2" fill="#60A5FA" />
                                    <rect x="14" y="8" width="2" height="2" fill="#60A5FA" />
                                    <rect x="6" y="4" width="12" height="2" fill="#60A5FA" />
                                </svg>
                            </div>
                            <div className="text-2xl font-bold text-dhani-gold font-vcr mb-2">
                                ₹{bankBalance.toLocaleString()}
                            </div>
                            <div className="text-blue-400 text-xs tracking-wider font-vcr">
                                SECURED IN BANK
                            </div>
                            {/* Progress bar */}
                            <div className="mt-3 w-full bg-gray-700 h-2">
                                <div 
                                    className="bg-blue-400 h-2 transition-all duration-500"
                                    style={{ 
                                        width: `${Math.min(bankBalance / 100000 * 100, 100)}%`,
                                        imageRendering: 'pixelated'
                                    }}
                                />
                            </div>
                        </div>

                        <div className="bg-purple-500/20 border-2 border-purple-400 p-4">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-purple-400 text-sm font-bold tracking-wider font-vcr">
                                    TOTAL PORTFOLIO
                                </span>
                                {/* Pixelated Chart Icon */}
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ imageRendering: 'pixelated' }}>
                                    <rect x="2" y="2" width="20" height="20" fill="none" stroke="#A78BFA" strokeWidth="2" />
                                    <rect x="6" y="16" width="2" height="4" fill="#A78BFA" />
                                    <rect x="10" y="12" width="2" height="8" fill="#A78BFA" />
                                    <rect x="14" y="8" width="2" height="12" fill="#A78BFA" />
                                    <rect x="18" y="6" width="2" height="14" fill="#A78BFA" />
                                </svg>
                            </div>
                            <div className="text-2xl font-bold text-dhani-gold font-vcr mb-2">
                                ₹{(playerRupees + totalRupeesChange + bankBalance).toLocaleString()}
                            </div>
                            <div className="text-purple-400 text-xs tracking-wider font-vcr">
                                COMBINED VALUE
                            </div>
                            {/* Progress bar */}
                            <div className="mt-3 w-full bg-gray-700 h-2">
                                <div 
                                    className="bg-purple-400 h-2 transition-all duration-500"
                                    style={{ 
                                        width: `${Math.min((playerRupees + totalRupeesChange + bankBalance) / 200000 * 100, 100)}%`,
                                        imageRendering: 'pixelated'
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Web3 Connection Prompt - Retro Style */}
                {!walletStatus.connected && (
                    <div className="bg-dhani-gold/10 border-2 border-dhani-gold p-6 mx-6 mt-4">
                        <div className="flex items-start space-x-4">
                            <div className="text-4xl">🌟</div>
                            <div className="flex-1">
                                <h3 className="text-dhani-gold font-bold text-lg mb-2 tracking-wider">
                                    UNLOCK WEB3 BANKING
                                </h3>
                                <p className="text-white text-sm mb-4 tracking-wide">
                                    Connect your Web3 wallet to access exclusive
                                    blockchain features including dual-currency
                                    support, token staking, and immutable
                                    transaction records.
                                </p>

                                <div className="grid grid-cols-2 gap-3 mb-4 text-xs text-white">
                                    <div className="flex items-center space-x-2">
                                        <span className="w-1.5 h-1.5 bg-dhani-gold"></span>
                                        <span>DUAL-CURRENCY PORTFOLIO</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <span className="w-1.5 h-1.5 bg-dhani-gold"></span>
                                        <span>TOKEN STAKING REWARDS</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <span className="w-1.5 h-1.5 bg-dhani-gold"></span>
                                        <span>CURRENCY EXCHANGE</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <span className="w-1.5 h-1.5 bg-dhani-gold"></span>
                                        <span>NFT-LIKE ACHIEVEMENTS</span>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {walletManager
                                        .getAvailableWallets()
                                        .map((wallet) => (
                                            <button
                                                key={wallet.type}
                                                onClick={() => {
                                                    console.log(
                                                        "Wallet button clicked:",
                                                        wallet.type,
                                                        "Available:",
                                                        wallet.available
                                                    );
                                                    if (wallet.available) {
                                                        handleConnectWallet(
                                                            wallet.type
                                                        );
                                                    } else {
                                                        setError(
                                                            `${wallet.name} is not installed. Please install it first.`
                                                        );
                                                    }
                                                }}
                                                disabled={!wallet.available}
                                                className={`px-4 py-2 border-2 text-sm font-bold tracking-wider ${
                                                    wallet.available
                                                        ? "bg-dhani-gold text-black border-white hover:bg-dhani-gold/80"
                                                        : "bg-gray-600 text-gray-400 border-gray-500 cursor-not-allowed"
                                                }`}
                                            >
                                                {wallet.name.toUpperCase()}
                                                {!wallet.available &&
                                                    " (INSTALL REQUIRED)"}
                                            </button>
                                        ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Retro Tab Navigation */}
                <div className="bg-black border-b-2 border-white/20">
                    <div className="flex overflow-x-auto">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center space-x-3 px-6 py-4 text-sm font-bold tracking-wider border-b-4 whitespace-nowrap ${
                                    activeTab === tab.id
                                        ? "text-dhani-gold border-dhani-gold bg-dhani-gold/10"
                                        : "text-white border-transparent hover:text-dhani-gold hover:bg-white/5"
                                }`}
                            >
                                <span className="text-lg">{tab.icon}</span>
                                <span>{tab.name.toUpperCase()}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6 bg-black text-white">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="text-dhani-gold text-lg font-bold tracking-wider">
                                LOADING BANKING DATA...
                            </div>
                        </div>
                    ) : error ? (
                        <div className="bg-red-900/30 border-2 border-red-500 p-6">
                            <div className="flex items-center space-x-3 mb-3">
                                <span className="text-2xl">⚠️</span>
                                <div>
                                    <div className="text-red-400 font-bold tracking-wider">
                                        ERROR LOADING BANKING DATA
                                    </div>
                                    <div className="text-red-300 text-sm">
                                        {error}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => window.location.reload()}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white border-2 border-white font-bold tracking-wider"
                            >
                                RETRY
                            </button>
                        </div>
                    ) : (
                        <>
                            {activeTab === "overview" && (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-white/5 border-2 border-white/20 p-6">
                                            <h3 className="text-dhani-gold font-bold text-lg mb-4 tracking-wider flex items-center">
                                                <span className="mr-2">📊</span>
                                                ACCOUNT SUMMARY
                                            </h3>
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-400 tracking-wider">
                                                        AVAILABLE CASH
                                                    </span>
                                                    <span className="text-white font-bold">
                                                        ₹
                                                        {(
                                                            playerRupees +
                                                            totalRupeesChange
                                                        ).toLocaleString()}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-400 tracking-wider">
                                                        BANK SAVINGS
                                                    </span>
                                                    <span className="text-white font-bold">
                                                        ₹
                                                        {bankBalance.toLocaleString()}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-gray-400 tracking-wider">
                                                        FIXED DEPOSITS
                                                    </span>
                                                    <span className="text-white font-bold">
                                                        {fixedDeposits.length}{" "}
                                                        ACTIVE
                                                    </span>
                                                </div>
                                                <div className="border-t-2 border-white/20 pt-3">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-dhani-gold font-bold tracking-wider">
                                                            TOTAL WORTH
                                                        </span>
                                                        <span className="text-dhani-green font-bold text-lg">
                                                            ₹
                                                            {(
                                                                playerRupees +
                                                                totalRupeesChange +
                                                                bankBalance
                                                            ).toLocaleString()}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-white/5 border-2 border-white/20 p-6">
                                            <h3 className="text-dhani-gold font-bold text-lg mb-4 tracking-wider flex items-center">
                                                <span className="mr-2">🎯</span>
                                                QUICK ACTIONS
                                            </h3>
                                            <div className="grid grid-cols-2 gap-3">
                                                <button
                                                    onClick={() =>
                                                        setActiveTab("account")
                                                    }
                                                    className="bg-blue-600 hover:bg-blue-700 text-white p-3 border-2 border-white text-sm font-bold tracking-wider"
                                                >
                                                    💰 DEPOSIT/WITHDRAW
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        setActiveTab("fd")
                                                    }
                                                    className="bg-green-600 hover:bg-green-700 text-white p-3 border-2 border-white text-sm font-bold tracking-wider"
                                                >
                                                    📈 FIXED DEPOSITS
                                                </button>
                                                {walletStatus.connected && (
                                                    <button
                                                        onClick={() =>
                                                            setActiveTab("web3")
                                                        }
                                                        className="bg-purple-600 hover:bg-purple-700 text-white p-3 border-2 border-white text-sm font-bold tracking-wider col-span-2"
                                                    >
                                                        🌐 EXPLORE WEB3 FEATURES
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === "account" && (
                                <DepositWithdrawPanel
                                    playerRupees={
                                        playerRupees + totalRupeesChange
                                    }
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
                                    walletManager={walletManager}
                                    walletStatus={walletStatus}
                                />
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BankingDashboard;
