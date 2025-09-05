import React, { useState, useEffect } from "react";
import { BankingPolish } from "../polish/FinalPolish";
import { bankingApi, playerStateApi, stockApi } from "../../../utils/api";
import { balanceManager } from "../../../services/BalanceManager";

interface Transaction {
    id: string;
    type:
        | "deposit"
        | "withdrawal"
        | "stock_buy"
        | "stock_sell"
        | "bank_transfer";
    amount: number;
    timestamp: Date;
    description: string;
    location?: string;
}

interface ATMDashboardProps {
    onClose: () => void;
    playerRupees: number;
    atmName: string;
    bankAccount: any;
    onDeposit: (amount: number) => Promise<boolean>;
    onWithdraw: (amount: number) => Promise<boolean>;
    onViewTransactions: () => void;
    onCheckBalance: () => void;
}

const ATMDashboard: React.FC<ATMDashboardProps> = ({
    onClose,
    playerRupees,
    atmName,
    bankAccount,
    onDeposit,
    onWithdraw,
    onViewTransactions,
    onCheckBalance,
}) => {
    const [activeTab, setActiveTab] = useState("overview");
    const [bankBalance, setBankBalance] = useState(bankAccount?.balance || 0);
    const [currentCash, setCurrentCash] = useState(playerRupees);
    const [totalRupeesChange, setTotalRupeesChange] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showBalanceDropdown, setShowBalanceDropdown] = useState(false);
    const [showTransactionsDropdown, setShowTransactionsDropdown] =
        useState(false);
    const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
    const [portfolioData, setPortfolioData] = useState({
        stockValue: 0,
        totalPortfolioValue: 0,
    });

    // Subscribe to balance manager updates
    useEffect(() => {
        // Get initial balance from balance manager
        const currentBalance = balanceManager.getBalance();
        setCurrentCash(currentBalance.cash);
        setBankBalance(currentBalance.bankBalance);

        // Subscribe to balance changes
        const unsubscribe = balanceManager.onBalanceChange((balance) => {
            setCurrentCash(balance.cash);
            setBankBalance(balance.bankBalance);
        });

        return () => {
            unsubscribe();
        };
    }, []);

    // Close on ESC key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                handleClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [playerRupees, totalRupeesChange]);

    // Real-time event listeners for transaction updates
    useEffect(() => {
        // Load initial transactions
        loadAllTransactions();

        // Listen for real-time transaction updates from different sources
        const handleBankTransaction = (event: CustomEvent) => {
            const { type, amount, description } = event.detail;
            addNewTransaction({
                id: `bank_${Date.now()}_${Math.random()}`,
                type: type === "deposit" ? "deposit" : "withdrawal",
                amount: amount,
                timestamp: new Date(),
                description: description || `Bank ${type}`,
                location: "Bank",
            });
        };

        const handleStockTransaction = (event: CustomEvent) => {
            const { type, amount, symbol, quantity, price } = event.detail;
            addNewTransaction({
                id: `stock_${Date.now()}_${Math.random()}`,
                type: type === "buy" ? "stock_buy" : "stock_sell",
                amount: amount || quantity * price,
                timestamp: new Date(),
                description: `${
                    type === "buy" ? "Bought" : "Sold"
                } ${quantity} ${symbol} shares at ₹${price}`,
                location: "Stock Market",
            });
        };

        const handleATMTransaction = (event: CustomEvent) => {
            const { type, amount, atmName } = event.detail;
            addNewTransaction({
                id: `atm_${Date.now()}_${Math.random()}`,
                type: type,
                amount: amount,
                timestamp: new Date(),
                description: `ATM ${
                    type === "deposit" ? "Deposit" : "Withdrawal"
                } at ${atmName}`,
                location: atmName,
            });
        };

        // Add event listeners
        window.addEventListener(
            "bank-transaction",
            handleBankTransaction as EventListener
        );
        window.addEventListener(
            "stock-transaction",
            handleStockTransaction as EventListener
        );

        window.addEventListener(
            "atm-transaction",
            handleATMTransaction as EventListener
        );

        // Cleanup event listeners
        return () => {
            window.removeEventListener(
                "bank-transaction",
                handleBankTransaction as EventListener
            );
            window.removeEventListener(
                "stock-transaction",
                handleStockTransaction as EventListener
            );

            window.removeEventListener(
                "atm-transaction",
                handleATMTransaction as EventListener
            );
        };
    }, []);

    // Add new transaction to the list and update localStorage
    const addNewTransaction = (transaction: Transaction) => {
        setAllTransactions((prev) => {
            const updated = [transaction, ...prev].sort(
                (a, b) =>
                    new Date(b.timestamp).getTime() -
                    new Date(a.timestamp).getTime()
            );

            // Save to localStorage for persistence
            const atmTransactions = JSON.parse(
                localStorage.getItem("atm_transactions") || "[]"
            );
            atmTransactions.unshift(transaction);
            localStorage.setItem(
                "atm_transactions",
                JSON.stringify(atmTransactions.slice(0, 100))
            ); // Keep last 100

            return updated;
        });
    };

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

    // ATM operations using balance manager
    const handleATMDeposit = async (amount: number): Promise<boolean> => {
        try {
            // Use balance manager for transaction processing
            const transaction = balanceManager.processDeposit(amount, atmName);

            // Try to sync with backend
            try {
                const success = await onDeposit(amount);
                if (!success) {
                    console.warn(
                        "Backend ATM deposit failed, but local transaction completed"
                    );
                }
            } catch (apiError) {
                console.warn("Backend API error during ATM deposit:", apiError);
                // Continue with local transaction
            }

            showSuccessNotification(
                "💰 Deposit Successful",
                `₹${amount.toLocaleString()} deposited to your account`
            );
            return true;
        } catch (error) {
            console.error("ATM Deposit error:", error);
            setError(
                `Deposit failed: ${
                    error instanceof Error ? error.message : String(error)
                }`
            );
            return false;
        }
    };

    const handleATMWithdraw = async (amount: number): Promise<boolean> => {
        try {
            // Use balance manager for transaction processing
            const transaction = balanceManager.processWithdrawal(
                amount,
                atmName
            );

            // Try to sync with backend
            try {
                const success = await onWithdraw(amount);
                if (!success) {
                    console.warn(
                        "Backend ATM withdrawal failed, but local transaction completed"
                    );
                }
            } catch (apiError) {
                console.warn(
                    "Backend API error during ATM withdrawal:",
                    apiError
                );
                // Continue with local transaction
            }

            showSuccessNotification(
                "💸 Withdrawal Successful",
                `₹${amount.toLocaleString()} withdrawn from your account`
            );
            return true;
        } catch (error) {
            console.error("ATM Withdrawal error:", error);
            setError(
                `Withdrawal failed: ${
                    error instanceof Error ? error.message : String(error)
                }`
            );
            return false;
        }
    };

    // Load all user transactions from balance manager and APIs
    const loadAllTransactions = async () => {
        try {
            setLoading(true);
            setError(null); // Clear any previous errors

            // Get transactions from balance manager first (most up-to-date)
            const balanceManagerTransactions = balanceManager.getTransactions();
            const allTransactions: Transaction[] =
                balanceManagerTransactions.map((tx) => ({
                    id: tx.id,
                    type: tx.type as any,
                    amount: tx.amount,
                    timestamp: tx.timestamp,
                    description: tx.description,
                    location: tx.location,
                }));

            // 1. Load Banking Transactions
            try {
                const bankingResponse = await bankingApi.getTransactions();
                if (
                    bankingResponse.success &&
                    bankingResponse.data &&
                    Array.isArray(bankingResponse.data)
                ) {
                    const bankingTransactions = bankingResponse.data.map(
                        (tx: any) => ({
                            id:
                                tx._id ||
                                tx.id ||
                                `bank_${Date.now()}_${Math.random()}`,
                            type: (tx.type === "credit" || tx.type === "deposit") 
                                ? "deposit" as const
                                : "withdrawal" as const,
                            amount: tx.amount || 0,
                            timestamp: new Date(
                                tx.timestamp || tx.createdAt || Date.now()
                            ),
                            description:
                                tx.description ||
                                `Bank ${tx.type || "transaction"}`,
                            location: tx.location || "Bank",
                        })
                    );
                    allTransactions.push(...bankingTransactions);
                    console.log(
                        `Loaded ${bankingTransactions.length} banking transactions`
                    );
                }
            } catch (error) {
                console.warn("Failed to load banking transactions:", error);
                // Don't let banking API errors break the whole function
            }

            // 2. Load Stock Market Transactions
            try {
                const stockResponse = await stockApi.getTransactions();
                if (
                    stockResponse.success &&
                    stockResponse.data &&
                    Array.isArray(stockResponse.data)
                ) {
                    const stockTransactions = stockResponse.data.map(
                        (tx: any) => ({
                            id:
                                tx._id ||
                                tx.id ||
                                `stock_${Date.now()}_${Math.random()}`,
                            type: tx.type === "buy" 
                                ? "stock_buy" as const 
                                : "stock_sell" as const,
                            amount: tx.amount || tx.quantity * tx.price || 0,
                            timestamp: new Date(
                                tx.timestamp || tx.createdAt || Date.now()
                            ),
                            description: `${
                                tx.type === "buy" ? "Bought" : "Sold"
                            } ${tx.quantity || 0} ${
                                tx.symbol || "shares"
                            } shares`,
                            location: "Stock Market",
                        })
                    );
                    allTransactions.push(...stockTransactions);
                    console.log(
                        `Loaded ${stockTransactions.length} stock transactions`
                    );
                }
            } catch (error) {
                console.warn("Failed to load stock transactions:", error);
                // Don't let stock API errors break the whole function
            }

            // 4. Load ATM Transactions (current session)
            try {
                const atmTransactions = JSON.parse(
                    localStorage.getItem("atm_transactions") || "[]"
                );
                if (Array.isArray(atmTransactions)) {
                    // Convert stored transactions to proper format
                    const formattedATMTransactions = atmTransactions.map(
                        (tx: any) => ({
                            ...tx,
                            timestamp: new Date(tx.timestamp),
                        })
                    );
                    allTransactions.push(...formattedATMTransactions);
                    console.log(
                        `Loaded ${formattedATMTransactions.length} ATM transactions from localStorage`
                    );
                }
            } catch (error) {
                console.warn(
                    "Failed to load ATM transactions from localStorage:",
                    error
                );
            }

            // Sort all transactions by timestamp (newest first)
            allTransactions.sort(
                (a, b) =>
                    new Date(b.timestamp).getTime() -
                    new Date(a.timestamp).getTime()
            );

            setAllTransactions(allTransactions);
            console.log(
                `Loaded ${allTransactions.length} transactions from all sources`
            );
        } catch (error) {
            console.error("Critical error loading transactions:", error);
            // Don't set error state that might close the ATM, just log it
            console.warn(
                "Transaction loading failed, but ATM will remain open"
            );

            // Load fallback transactions from localStorage only
            try {
                const fallbackTransactions = JSON.parse(
                    localStorage.getItem("atm_transactions") || "[]"
                );
                if (Array.isArray(fallbackTransactions)) {
                    const formattedTransactions = fallbackTransactions.map(
                        (tx: any) => ({
                            ...tx,
                            timestamp: new Date(tx.timestamp),
                        })
                    );
                    setAllTransactions(formattedTransactions);
                } else {
                    setAllTransactions([]);
                }
            } catch (fallbackError) {
                console.warn(
                    "Fallback transaction loading also failed:",
                    fallbackError
                );
                setAllTransactions([]);
            }
        } finally {
            setLoading(false);
        }
    };

    // Handle balance check dropdown
    const handleBalanceCheck = () => {
        setShowBalanceDropdown(!showBalanceDropdown);
        setShowTransactionsDropdown(false);
    };

    // Handle transactions dropdown
    const handleTransactionsView = () => {
        setShowTransactionsDropdown(!showTransactionsDropdown);
        setShowBalanceDropdown(false);
        if (!showTransactionsDropdown) {
            loadAllTransactions();
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
                    if (document.body.contains(notification)) {
                        document.body.removeChild(notification);
                    }
                }, 300);
            }, 3500);
        } catch (error) {
            console.log(`${title}: ${message}`);
        }
    };

    const tabs = [
        {
            id: "overview",
            name: "Overview",
            icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path
                        d="M3 3v18h18"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <path
                        d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            ),
        },
        {
            id: "deposit",
            name: "Deposit",
            icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path
                        d="M21 12V7H5a2 2 0 0 1 0-4h14v4"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <path
                        d="M3 5v14a2 2 0 0 0 2 2h16v-5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <path
                        d="M18 12a2 2 0 0 0 0 4h4v-4Z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            ),
        },
        {
            id: "withdraw",
            name: "Withdraw",
            icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path
                        d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            ),
        },
        {
            id: "balance",
            name: "Balance",
            icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path
                        d="M3 3v18h18"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <path
                        d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            ),
        },
        {
            id: "transactions",
            name: "Transactions",
            icon: (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path
                        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    <polyline
                        points="14,2 14,8 20,8"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            ),
        },
    ];

    return (
        <div className="fixed inset-0 flex bg-black items-center justify-center z-50 p-4">
            {/* Backdrop blur overlay */}
            <div
                className="absolute inset-0 backdrop-blur-md"
                onClick={handleClose}
            />

            {/* Main container - Modern minimal design */}
            <BankingPolish className="relative w-full max-w-6xl h-full max-h-[95vh] bg-black/95 backdrop-blur-modern border border-dhani-gold/30 rounded-2xl shadow-2xl shadow-dhani-gold/10 flex flex-col overflow-hidden modern-scale-in">
                {/* Subtle gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-dhani-gold/5 via-transparent to-transparent pointer-events-none rounded-2xl" />

                {/* Modern Header */}
                <div className="relative flex items-center justify-between p-6 border-b border-dhani-gold/20 flex-shrink-0">
                    <div className="flex items-center space-x-4">
                        {/* ATM Icon */}
                        <div className="w-10 h-10 bg-gradient-to-br from-dhani-gold to-dhani-gold/80 rounded-lg flex items-center justify-center">
                            <svg
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                            >
                                <rect
                                    x="2"
                                    y="4"
                                    width="20"
                                    height="16"
                                    rx="2"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="text-black"
                                />
                                <path
                                    d="M7 15h.01M11 15h4"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="text-black"
                                />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white tracking-tight">
                                {atmName}
                            </h1>
                            <p className="text-sm text-gray-400 hidden sm:block">
                                Automated Banking Terminal
                            </p>
                        </div>
                    </div>

                    {/* Status & Close */}
                    <div className="flex items-center space-x-4">
                        {/* Connection Status */}
                        <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10">
                            <div className="w-2 h-2 rounded-full bg-green-400" />
                            <span className="text-xs text-gray-300">
                                ATM Online
                            </span>
                        </div>

                        {/* Close Button */}
                        <button
                            onClick={handleClose}
                            className="w-8 h-8 flex items-center justify-center text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all duration-200 border border-red-600 hover:border-red-400"
                        >
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M18 6L6 18M6 6l12 12" />
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
                                        <svg
                                            width="16"
                                            height="16"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                        >
                                            <path
                                                d="M21 12V7H5a2 2 0 0 1 0-4h14v4"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                className="text-dhani-gold"
                                            />
                                            <path
                                                d="M3 5v14a2 2 0 0 0 2 2h16v-5"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                className="text-dhani-gold"
                                            />
                                            <path
                                                d="M18 12a2 2 0 0 0 0 4h4v-4Z"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                className="text-dhani-gold"
                                            />
                                        </svg>
                                    </div>
                                    <span className="text-sm text-gray-300">
                                        Cash
                                    </span>
                                </div>
                            </div>
                            <div className="text-2xl font-bold text-dhani-gold mb-1">
                                ₹{currentCash.toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-400">
                                Available cash
                            </div>
                        </div>

                        {/* Bank Balance */}
                        <div className="bg-gradient-to-br from-white/5 to-white/2 rounded-xl p-4 border border-white/10 hover:border-white/20 transition-all duration-300">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-2">
                                    <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                                        <svg
                                            width="16"
                                            height="16"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                        >
                                            <path
                                                d="M3 21h18M5 21V10l7-7 7 7v11M9 21v-6h6v6"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                className="text-white"
                                            />
                                        </svg>
                                    </div>
                                    <span className="text-sm text-gray-300">
                                        Account
                                    </span>
                                </div>
                            </div>
                            <div className="text-2xl font-bold text-white mb-1">
                                ₹{bankBalance.toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-400">
                                Bank balance
                            </div>
                        </div>

                        {/* Transactions */}
                        <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 rounded-xl p-4 border border-green-500/20 hover:border-green-500/40 transition-all duration-300">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-2">
                                    <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                                        <svg
                                            width="16"
                                            height="16"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                        >
                                            <path
                                                d="M3 3v18h18"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                className="text-green-400"
                                            />
                                            <path
                                                d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                className="text-green-400"
                                            />
                                        </svg>
                                    </div>
                                    <span className="text-sm text-gray-300">
                                        Activity
                                    </span>
                                </div>
                            </div>
                            <div className="text-2xl font-bold text-green-400 mb-1">
                                {bankAccount?.transactions?.length || 0}
                            </div>
                            <div className="text-xs text-gray-400">
                                Recent transactions
                            </div>
                        </div>
                    </div>
                </div>

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
                                <span className="hidden sm:inline">
                                    {tab.name}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6 min-h-0">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-dhani-gold mb-4" />
                            <div className="text-gray-400 text-sm">
                                Processing transaction...
                            </div>
                        </div>
                    ) : error ? (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6">
                            <div className="flex items-start space-x-3">
                                <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <svg
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                    >
                                        <path
                                            d="M12 9v4M12 17h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            className="text-red-400"
                                        />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-red-400 font-semibold mb-1">
                                        Transaction Error
                                    </h3>
                                    <p className="text-red-300 text-sm mb-4">
                                        {error}
                                    </p>
                                    <button
                                        onClick={() => setError(null)}
                                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors duration-200"
                                    >
                                        Dismiss
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            {activeTab === "overview" && (
                                <OverviewTab
                                    playerRupees={currentCash}
                                    bankBalance={bankBalance}
                                    bankAccount={bankAccount}
                                    setActiveTab={setActiveTab}
                                />
                            )}

                            {activeTab === "deposit" && (
                                <DepositTab
                                    playerRupees={currentCash}
                                    onDeposit={handleATMDeposit}
                                />
                            )}

                            {activeTab === "withdraw" && (
                                <WithdrawTab
                                    bankBalance={bankBalance}
                                    onWithdraw={handleATMWithdraw}
                                />
                            )}

                            {activeTab === "balance" && (
                                <BalanceTab
                                    playerRupees={currentCash}
                                    bankBalance={bankBalance}
                                    bankAccount={bankAccount}
                                />
                            )}

                            {activeTab === "transactions" && (
                                <TransactionsTab
                                    allTransactions={allTransactions}
                                    loadAllTransactions={loadAllTransactions}
                                />
                            )}
                        </>
                    )}
                </div>
            </BankingPolish>
        </div>
    );
};

// Overview Tab Component
const OverviewTab: React.FC<{
    playerRupees: number;
    bankBalance: number;
    bankAccount: any;
    setActiveTab: (tab: string) => void;
}> = ({ playerRupees, bankBalance, bankAccount, setActiveTab }) => (
    <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Account Summary */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <h3 className="text-white font-semibold text-lg mb-4 flex items-center">
                    <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        className="mr-3"
                    >
                        <path
                            d="M3 3v18h18"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-dhani-gold"
                        />
                        <path
                            d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-dhani-gold"
                        />
                    </svg>
                    Account Summary
                </h3>
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-sm">
                            Available Cash
                        </span>
                        <span className="text-white font-semibold">
                            ₹{playerRupees.toLocaleString()}
                        </span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-sm">
                            Bank Balance
                        </span>
                        <span className="text-white font-semibold">
                            ₹{bankBalance.toLocaleString()}
                        </span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-sm">
                            Recent Transactions
                        </span>
                        <span className="text-white font-semibold">
                            {bankAccount?.transactions?.length || 0}
                        </span>
                    </div>
                    <div className="border-t border-white/10 pt-4">
                        <div className="flex justify-between items-center">
                            <span className="text-dhani-gold font-semibold">
                                Total Available
                            </span>
                            <span className="text-dhani-gold font-bold text-lg">
                                ₹{(playerRupees + bankBalance).toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-gradient-to-br from-dhani-gold/10 to-dhani-gold/5 rounded-xl p-6 border border-dhani-gold/20">
                <h3 className="text-dhani-gold font-semibold text-lg mb-4 flex items-center">
                    <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        className="mr-3"
                    >
                        <path
                            d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-dhani-gold"
                        />
                    </svg>
                    Quick Actions
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                        onClick={() => setActiveTab("deposit")}
                        className="flex items-center justify-center space-x-2 p-3 bg-dhani-gold text-black font-medium rounded-lg hover:bg-dhani-gold/90 transition-colors duration-200"
                    >
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                        >
                            <path
                                d="M21 12V7H5a2 2 0 0 1 0-4h14v4"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            <path
                                d="M3 5v14a2 2 0 0 0 2 2h16v-5"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            <path
                                d="M18 12a2 2 0 0 0 0 4h4v-4Z"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                        <span>Deposit</span>
                    </button>
                    <button
                        onClick={() => setActiveTab("withdraw")}
                        className="flex items-center justify-center space-x-2 p-3 bg-white/10 text-white font-medium rounded-lg hover:bg-white/20 transition-colors duration-200"
                    >
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                        >
                            <path
                                d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                        <span>Withdraw</span>
                    </button>
                    <button
                        onClick={() => setActiveTab("balance")}
                        className="flex items-center justify-center space-x-2 p-3 bg-gradient-to-r from-blue-500/20 to-blue-500/10 text-white font-medium rounded-lg hover:from-blue-500/30 hover:to-blue-500/20 transition-all duration-200"
                    >
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                        >
                            <path
                                d="M3 3v18h18"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            <path
                                d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                        <span>Check Balance</span>
                    </button>
                    <button
                        onClick={() => setActiveTab("transactions")}
                        className="flex items-center justify-center space-x-2 p-3 bg-gradient-to-r from-purple-500/20 to-purple-500/10 text-white font-medium rounded-lg hover:from-purple-500/30 hover:to-purple-500/20 transition-all duration-200"
                    >
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                        >
                            <path
                                d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            <polyline
                                points="14,2 14,8 20,8"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                        <span>View Transactions</span>
                    </button>
                </div>
            </div>
        </div>
    </div>
);

// Deposit Tab Component
const DepositTab: React.FC<{
    playerRupees: number;
    onDeposit: (amount: number) => Promise<boolean>;
}> = ({ playerRupees, onDeposit }) => {
    const [amount, setAmount] = useState("");
    const [loading, setLoading] = useState(false);

    const handleDeposit = async () => {
        const depositAmount = parseFloat(amount);
        if (depositAmount > 0 && depositAmount <= playerRupees) {
            setLoading(true);
            const success = await onDeposit(depositAmount);
            setLoading(false);
            if (success) {
                setAmount("");
            }
        }
    };

    const quickAmounts = [100, 500, 1000, 2000];

    return (
        <div className="max-w-2xl mx-auto">
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <h3 className="text-white font-semibold text-lg mb-6 flex items-center">
                    <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        className="mr-3"
                    >
                        <path
                            d="M21 12V7H5a2 2 0 0 1 0-4h14v4"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-dhani-gold"
                        />
                        <path
                            d="M3 5v14a2 2 0 0 0 2 2h16v-5"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-dhani-gold"
                        />
                        <path
                            d="M18 12a2 2 0 0 0 0 4h4v-4Z"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-dhani-gold"
                        />
                    </svg>
                    Deposit Money
                </h3>

                <div className="space-y-6">
                    <div>
                        <label className="block text-gray-300 text-sm font-medium mb-2">
                            Amount to Deposit
                        </label>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            max={playerRupees}
                            min="1"
                            className="w-full px-4 py-3 bg-black/30 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-dhani-gold focus:border-transparent"
                            placeholder="Enter amount"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                            Available cash: ₹{playerRupees.toLocaleString()}
                        </p>
                    </div>

                    <div>
                        <label className="block text-gray-300 text-sm font-medium mb-3">
                            Quick Amounts
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {quickAmounts.map((quickAmount) => (
                                <button
                                    key={quickAmount}
                                    onClick={() =>
                                        setAmount(quickAmount.toString())
                                    }
                                    disabled={quickAmount > playerRupees}
                                    className={`p-3 rounded-lg text-sm font-medium transition-colors duration-200 ${
                                        quickAmount <= playerRupees
                                            ? "bg-dhani-gold/20 text-dhani-gold hover:bg-dhani-gold/30 border border-dhani-gold/30"
                                            : "bg-gray-700 text-gray-400 cursor-not-allowed border border-gray-600"
                                    }`}
                                >
                                    ₹{quickAmount}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={handleDeposit}
                        disabled={
                            !amount ||
                            parseFloat(amount) <= 0 ||
                            parseFloat(amount) > playerRupees ||
                            loading
                        }
                        className="w-full bg-dhani-gold text-black font-semibold py-3 px-6 rounded-lg hover:bg-dhani-gold/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                        {loading ? "Processing..." : "Deposit Money"}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Withdraw Tab Component
const WithdrawTab: React.FC<{
    bankBalance: number;
    onWithdraw: (amount: number) => Promise<boolean>;
}> = ({ bankBalance, onWithdraw }) => {
    const [amount, setAmount] = useState("");
    const [loading, setLoading] = useState(false);

    const handleWithdraw = async () => {
        const withdrawAmount = parseFloat(amount);
        if (withdrawAmount > 0 && withdrawAmount <= bankBalance) {
            setLoading(true);
            const success = await onWithdraw(withdrawAmount);
            setLoading(false);
            if (success) {
                setAmount("");
            }
        }
    };

    const quickAmounts = [100, 500, 1000, 2000].filter(
        (amt) => amt <= bankBalance
    );

    return (
        <div className="max-w-2xl mx-auto">
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <h3 className="text-white font-semibold text-lg mb-6 flex items-center">
                    <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        className="mr-3"
                    >
                        <path
                            d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-dhani-gold"
                        />
                    </svg>
                    Withdraw Money
                </h3>

                <div className="space-y-6">
                    <div>
                        <label className="block text-gray-300 text-sm font-medium mb-2">
                            Amount to Withdraw
                        </label>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            max={bankBalance}
                            min="1"
                            className="w-full px-4 py-3 bg-black/30 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-dhani-gold focus:border-transparent"
                            placeholder="Enter amount"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                            Available balance: ₹{bankBalance.toLocaleString()}
                        </p>
                    </div>

                    {quickAmounts.length > 0 && (
                        <div>
                            <label className="block text-gray-300 text-sm font-medium mb-3">
                                Quick Amounts
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {quickAmounts.map((quickAmount) => (
                                    <button
                                        key={quickAmount}
                                        onClick={() =>
                                            setAmount(quickAmount.toString())
                                        }
                                        className="p-3 bg-dhani-gold/20 text-dhani-gold hover:bg-dhani-gold/30 border border-dhani-gold/30 rounded-lg text-sm font-medium transition-colors duration-200"
                                    >
                                        ₹{quickAmount}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <button
                        onClick={handleWithdraw}
                        disabled={
                            !amount ||
                            parseFloat(amount) <= 0 ||
                            parseFloat(amount) > bankBalance ||
                            loading
                        }
                        className="w-full bg-dhani-gold text-black font-semibold py-3 px-6 rounded-lg hover:bg-dhani-gold/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                        {loading ? "Processing..." : "Withdraw Money"}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Balance Tab Component
const BalanceTab: React.FC<{
    playerRupees: number;
    bankBalance: number;
    bankAccount: any;
}> = ({ playerRupees, bankBalance, bankAccount }) => (
    <div className="max-w-4xl mx-auto">
        <div className="bg-white/5 rounded-xl p-6 border border-white/10">
            <h3 className="text-white font-semibold text-lg mb-6 flex items-center">
                <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="mr-3"
                >
                    <path
                        d="M3 3v18h18"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-dhani-gold"
                    />
                    <path
                        d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-dhani-gold"
                    />
                </svg>
                Account Balance Summary
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Cash Balance */}
                <div className="bg-gradient-to-br from-dhani-gold/10 to-dhani-gold/5 rounded-xl p-6 border border-dhani-gold/20">
                    <div className="flex items-center space-x-3 mb-4">
                        <div className="w-12 h-12 bg-dhani-gold/20 rounded-lg flex items-center justify-center">
                            <svg
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                            >
                                <path
                                    d="M21 12V7H5a2 2 0 0 1 0-4h14v4"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="text-dhani-gold"
                                />
                                <path
                                    d="M3 5v14a2 2 0 0 0 2 2h16v-5"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="text-dhani-gold"
                                />
                                <path
                                    d="M18 12a2 2 0 0 0 0 4h4v-4Z"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="text-dhani-gold"
                                />
                            </svg>
                        </div>
                        <div>
                            <h4 className="text-dhani-gold font-semibold text-lg">
                                Cash in Hand
                            </h4>
                            <p className="text-gray-400 text-sm">
                                Available for immediate use
                            </p>
                        </div>
                    </div>
                    <div className="text-3xl font-bold text-dhani-gold mb-2">
                        ₹{playerRupees.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-400">
                        Ready for transactions and purchases
                    </div>
                </div>

                {/* Bank Balance */}
                <div className="bg-gradient-to-br from-white/5 to-white/2 rounded-xl p-6 border border-white/10">
                    <div className="flex items-center space-x-3 mb-4">
                        <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center">
                            <svg
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                            >
                                <path
                                    d="M3 21h18M5 21V10l7-7 7 7v11M9 21v-6h6v6"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="text-white"
                                />
                            </svg>
                        </div>
                        <div>
                            <h4 className="text-white font-semibold text-lg">
                                Bank Account
                            </h4>
                            <p className="text-gray-400 text-sm">
                                Secured savings balance
                            </p>
                        </div>
                    </div>
                    <div className="text-3xl font-bold text-white mb-2">
                        ₹{bankBalance.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-400">
                        Protected and earning interest
                    </div>
                </div>
            </div>

            {/* Total Portfolio */}
            <div className="mt-6 bg-gradient-to-br from-green-500/10 to-green-500/5 rounded-xl p-6 border border-green-500/20">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                            <svg
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                            >
                                <path
                                    d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="text-green-400"
                                />
                            </svg>
                        </div>
                        <div>
                            <h4 className="text-green-400 font-semibold text-lg">
                                Total Portfolio Value
                            </h4>
                            <p className="text-gray-400 text-sm">
                                Combined financial assets
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-bold text-green-400">
                            ₹{(playerRupees + bankBalance).toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-400">
                            Total net worth
                        </div>
                    </div>
                </div>
            </div>

            {/* Account Details */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-black/20 rounded-lg p-4 border border-white/10">
                    <div className="text-gray-400 text-sm mb-1">
                        Account Status
                    </div>
                    <div className="text-green-400 font-semibold flex items-center">
                        <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                        Active
                    </div>
                </div>
                <div className="bg-black/20 rounded-lg p-4 border border-white/10">
                    <div className="text-gray-400 text-sm mb-1">
                        Recent Transactions
                    </div>
                    <div className="text-white font-semibold">
                        {bankAccount?.transactions?.length || 0}
                    </div>
                </div>
                <div className="bg-black/20 rounded-lg p-4 border border-white/10">
                    <div className="text-gray-400 text-sm mb-1">
                        Last Updated
                    </div>
                    <div className="text-white font-semibold">
                        {new Date().toLocaleDateString()}
                    </div>
                </div>
            </div>
        </div>
    </div>
);

// Transactions Tab Component
const TransactionsTab: React.FC<{
    allTransactions: Transaction[];
    loadAllTransactions: () => Promise<void>;
}> = ({ allTransactions, loadAllTransactions }) => {
    const [loading, setLoading] = useState(false);

    const handleRefresh = async () => {
        setLoading(true);
        await loadAllTransactions();
        setLoading(false);
    };

    const getTransactionIcon = (type: Transaction["type"]) => {
        switch (type) {
            case "deposit":
                return (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path
                            d="M12 5v14M5 12l7-7 7 7"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-green-400"
                        />
                    </svg>
                );
            case "withdrawal":
                return (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path
                            d="M12 19V5M5 12l7 7 7-7"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-red-400"
                        />
                    </svg>
                );
            case "stock_buy":
                return (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path
                            d="M3 3v18h18"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-blue-400"
                        />
                        <path
                            d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-blue-400"
                        />
                    </svg>
                );
            case "stock_sell":
                return (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path
                            d="M3 3v18h18"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-orange-400"
                        />
                        <path
                            d="M7 8l5.1 5.2 2.8-2.7L18.7 14.3"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="text-orange-400"
                        />
                    </svg>
                );

            default:
                return (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <circle
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="2"
                            className="text-gray-400"
                        />
                    </svg>
                );
        }
    };

    const getTransactionColor = (type: Transaction["type"]) => {
        switch (type) {
            case "deposit":
                return "text-green-400";
            case "withdrawal":
                return "text-red-400";
            case "stock_buy":
                return "text-blue-400";
            case "stock_sell":
                return "text-orange-400";

            default:
                return "text-gray-400";
        }
    };

    const formatTransactionType = (type: Transaction["type"]) => {
        switch (type) {
            case "deposit":
                return "Deposit";
            case "withdrawal":
                return "Withdrawal";
            case "stock_buy":
                return "Stock Purchase";
            case "stock_sell":
                return "Stock Sale";

            case "bank_transfer":
                return "Bank Transfer";
            default:
                return "Transaction";
        }
    };

    return (
        <div className="max-w-6xl mx-auto">
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-white font-semibold text-lg flex items-center">
                        <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            className="mr-3"
                        >
                            <path
                                d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="text-dhani-gold"
                            />
                            <polyline
                                points="14,2 14,8 20,8"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="text-dhani-gold"
                            />
                        </svg>
                        Complete Transaction History
                    </h3>
                    <button
                        onClick={handleRefresh}
                        disabled={loading}
                        className="flex items-center space-x-2 px-4 py-2 bg-dhani-gold text-black font-medium rounded-lg hover:bg-dhani-gold/90 disabled:opacity-50 transition-colors duration-200"
                    >
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            className={loading ? "animate-spin" : ""}
                        >
                            <path
                                d="M23 4v6h-6"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            <path
                                d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                        <span>Refresh</span>
                    </button>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-dhani-gold mr-3" />
                        <span className="text-gray-400">
                            Loading transactions...
                        </span>
                    </div>
                ) : allTransactions.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                            >
                                <path
                                    d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="text-gray-400"
                                />
                            </svg>
                        </div>
                        <h4 className="text-gray-400 font-semibold mb-2">
                            No Transactions Found
                        </h4>
                        <p className="text-gray-500 text-sm">
                            Your transaction history will appear here
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                        {allTransactions.map((transaction) => (
                            <div
                                key={transaction.id}
                                className="bg-black/20 rounded-lg p-4 border border-white/10 hover:border-white/20 transition-all duration-200"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center">
                                            {getTransactionIcon(
                                                transaction.type
                                            )}
                                        </div>
                                        <div>
                                            <div className="flex items-center space-x-2">
                                                <span className="text-white font-semibold">
                                                    {formatTransactionType(
                                                        transaction.type
                                                    )}
                                                </span>
                                                {transaction.location && (
                                                    <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                                                        {transaction.location}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-gray-400 text-sm">
                                                {transaction.description}
                                            </p>
                                            <p className="text-gray-500 text-xs">
                                                {transaction.timestamp.toLocaleDateString()}{" "}
                                                at{" "}
                                                {transaction.timestamp.toLocaleTimeString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div
                                            className={`font-bold text-lg ${getTransactionColor(
                                                transaction.type
                                            )}`}
                                        >
                                            {transaction.type ===
                                                "withdrawal" ||
                                            transaction.type === "stock_buy"
                                                ? "-"
                                                : "+"}
                                            ₹
                                            {transaction.amount.toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ATMDashboard;
