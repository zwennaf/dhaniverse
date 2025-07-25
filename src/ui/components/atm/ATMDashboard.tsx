import React, { useState, useEffect } from "react";
import { bankingApi, playerStateApi } from "../../../utils/api";
import { BankingPolish } from "../polish/FinalPolish";

interface ATMDashboardProps {
    onClose: () => void;
    playerRupees: number;
    atmName: string;
    bankAccount: any;
    onDeposit: (amount: number) => Promise<boolean>;
    onWithdraw: (amount: number) => Promise<boolean>;
    onCreateFixedDeposit: (amount: number, duration: number) => Promise<boolean>;
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
    onCreateFixedDeposit,
    onViewTransactions,
    onCheckBalance,
}) => {
    const [activeTab, setActiveTab] = useState("overview");
    const [bankBalance, setBankBalance] = useState(bankAccount?.balance || 0);
    const [totalRupeesChange, setTotalRupeesChange] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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

    // ATM operations
    const handleATMDeposit = async (amount: number): Promise<boolean> => {
        try {
            const success = await onDeposit(amount);
            if (success) {
                setBankBalance((prev) => prev + amount);
                setTotalRupeesChange((prev) => prev - amount);
                
                window.dispatchEvent(
                    new CustomEvent("rupee-update", {
                        detail: { rupees: playerRupees - amount },
                    })
                );
                
                showSuccessNotification("💰 Deposit Successful", `₹${amount.toLocaleString()} deposited to your account`);
                return true;
            }
            return false;
        } catch (error) {
            console.error("ATM Deposit error:", error);
            setError(`Deposit failed: ${error}`);
            return false;
        }
    };

    const handleATMWithdraw = async (amount: number): Promise<boolean> => {
        try {
            if (amount > bankBalance) {
                setError("Insufficient balance in your account");
                return false;
            }
            
            const success = await onWithdraw(amount);
            if (success) {
                setBankBalance((prev) => prev - amount);
                setTotalRupeesChange((prev) => prev + amount);
                
                window.dispatchEvent(
                    new CustomEvent("rupee-update", {
                        detail: { rupees: playerRupees + amount },
                    })
                );
                
                showSuccessNotification("💸 Withdrawal Successful", `₹${amount.toLocaleString()} withdrawn from your account`);
                return true;
            }
            return false;
        } catch (error) {
            console.error("ATM Withdrawal error:", error);
            setError(`Withdrawal failed: ${error}`);
            return false;
        }
    };

    const handleATMFixedDeposit = async (amount: number, duration: number): Promise<boolean> => {
        try {
            if (amount > bankBalance) {
                setError("Insufficient balance for fixed deposit");
                return false;
            }
            
            const success = await onCreateFixedDeposit(amount, duration);
            if (success) {
                setBankBalance((prev) => prev - amount);
                showSuccessNotification("🏦 Fixed Deposit Created", `₹${amount.toLocaleString()} locked for ${duration} months`);
                return true;
            }
            return false;
        } catch (error) {
            console.error("ATM Fixed Deposit error:", error);
            setError(`Fixed deposit creation failed: ${error}`);
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
                notification.style.transform = 'translateX(0)';
            });

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

    const tabs = [
        { id: "overview", name: "Overview", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 3v18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> },
        { id: "deposit", name: "Deposit", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> },
        { id: "withdraw", name: "Withdraw", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> },
        { id: "services", name: "Services", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg> },
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
                        {/* ATM Icon */}
                        <div className="w-10 h-10 bg-gradient-to-br from-dhani-gold to-dhani-gold/80 rounded-lg flex items-center justify-center">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-black"/>
                                <path d="M7 15h.01M11 15h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-black"/>
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
                            <span className="text-xs text-gray-300">ATM Online</span>
                        </div>

                        {/* Close Button */}
                        <button
                            onClick={handleClose}
                            className="w-8 h-8 flex items-center justify-center text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all duration-200 border border-red-600 hover:border-red-400"
                        >
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
                                    <span className="text-sm text-gray-300">Cash</span>
                                </div>
                            </div>
                            <div className="text-2xl font-bold text-dhani-gold mb-1">
                                ₹{(playerRupees + totalRupeesChange).toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-400">Available cash</div>
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
                                    <span className="text-sm text-gray-300">Account</span>
                                </div>
                            </div>
                            <div className="text-2xl font-bold text-white mb-1">
                                ₹{bankBalance.toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-400">Bank balance</div>
                        </div>

                        {/* Transactions */}
                        <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 rounded-xl p-4 border border-green-500/20 hover:border-green-500/40 transition-all duration-300">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-2">
                                    <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                            <path d="M3 3v18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400"/>
                                            <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400"/>
                                        </svg>
                                    </div>
                                    <span className="text-sm text-gray-300">Activity</span>
                                </div>
                            </div>
                            <div className="text-2xl font-bold text-green-400 mb-1">
                                {bankAccount?.transactions?.length || 0}
                            </div>
                            <div className="text-xs text-gray-400">Recent transactions</div>
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
                                <span className="hidden sm:inline">{tab.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6 min-h-0">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-dhani-gold mb-4" />
                            <div className="text-gray-400 text-sm">Processing transaction...</div>
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
                                    <h3 className="text-red-400 font-semibold mb-1">Transaction Error</h3>
                                    <p className="text-red-300 text-sm mb-4">{error}</p>
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
                                    playerRupees={playerRupees + totalRupeesChange}
                                    bankBalance={bankBalance}
                                    bankAccount={bankAccount}
                                    setActiveTab={setActiveTab}
                                />
                            )}

                            {activeTab === "deposit" && (
                                <DepositTab 
                                    playerRupees={playerRupees + totalRupeesChange}
                                    onDeposit={handleATMDeposit}
                                />
                            )}

                            {activeTab === "withdraw" && (
                                <WithdrawTab 
                                    bankBalance={bankBalance}
                                    onWithdraw={handleATMWithdraw}
                                />
                            )}

                            {activeTab === "services" && (
                                <ServicesTab 
                                    bankBalance={bankBalance}
                                    onCreateFixedDeposit={handleATMFixedDeposit}
                                    onViewTransactions={onViewTransactions}
                                    onCheckBalance={onCheckBalance}
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
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="mr-3">
                        <path d="M3 3v18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-dhani-gold"/>
                        <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-dhani-gold"/>
                    </svg>
                    Account Summary
                </h3>
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-sm">Available Cash</span>
                        <span className="text-white font-semibold">₹{playerRupees.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-sm">Bank Balance</span>
                        <span className="text-white font-semibold">₹{bankBalance.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-sm">Recent Transactions</span>
                        <span className="text-white font-semibold">{bankAccount?.transactions?.length || 0}</span>
                    </div>
                    <div className="border-t border-white/10 pt-4">
                        <div className="flex justify-between items-center">
                            <span className="text-dhani-gold font-semibold">Total Available</span>
                            <span className="text-dhani-gold font-bold text-lg">₹{(playerRupees + bankBalance).toLocaleString()}</span>
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
                        onClick={() => setActiveTab("deposit")}
                        className="flex items-center justify-center space-x-2 p-3 bg-dhani-gold text-black font-medium rounded-lg hover:bg-dhani-gold/90 transition-colors duration-200"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span>Deposit</span>
                    </button>
                    <button
                        onClick={() => setActiveTab("withdraw")}
                        className="flex items-center justify-center space-x-2 p-3 bg-white/10 text-white font-medium rounded-lg hover:bg-white/20 transition-colors duration-200"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span>Withdraw</span>
                    </button>
                    <button
                        onClick={() => setActiveTab("services")}
                        className="sm:col-span-2 flex items-center justify-center space-x-2 p-3 bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-white font-medium rounded-lg hover:from-purple-500/30 hover:to-blue-500/30 transition-all duration-200"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span>More Services</span>
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
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="mr-3">
                        <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-dhani-gold"/>
                        <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-dhani-gold"/>
                        <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-dhani-gold"/>
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
                                    onClick={() => setAmount(quickAmount.toString())}
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
                        disabled={!amount || parseFloat(amount) <= 0 || parseFloat(amount) > playerRupees || loading}
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

    const quickAmounts = [100, 500, 1000, 2000].filter(amt => amt <= bankBalance);

    return (
        <div className="max-w-2xl mx-auto">
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <h3 className="text-white font-semibold text-lg mb-6 flex items-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="mr-3">
                        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-dhani-gold"/>
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
                                        onClick={() => setAmount(quickAmount.toString())}
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
                        disabled={!amount || parseFloat(amount) <= 0 || parseFloat(amount) > bankBalance || loading}
                        className="w-full bg-dhani-gold text-black font-semibold py-3 px-6 rounded-lg hover:bg-dhani-gold/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                        {loading ? "Processing..." : "Withdraw Money"}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Services Tab Component
const ServicesTab: React.FC<{
    bankBalance: number;
    onCreateFixedDeposit: (amount: number, duration: number) => Promise<boolean>;
    onViewTransactions: () => void;
    onCheckBalance: () => void;
}> = ({ bankBalance, onCreateFixedDeposit, onViewTransactions, onCheckBalance }) => {
    const [showFDForm, setShowFDForm] = useState(false);
    const [fdAmount, setFdAmount] = useState("");
    const [fdDuration, setFdDuration] = useState("6");
    const [loading, setLoading] = useState(false);

    const handleCreateFD = async () => {
        const amount = parseFloat(fdAmount);
        const duration = parseInt(fdDuration);
        if (amount >= 100 && amount <= bankBalance) {
            setLoading(true);
            const success = await onCreateFixedDeposit(amount, duration);
            setLoading(false);
            if (success) {
                setFdAmount("");
                setShowFDForm(false);
            }
        }
    };

    const services = [
        {
            id: "balance",
            title: "Check Balance",
            description: "View your current account balance",
            icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 3v18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
            action: onCheckBalance,
            color: "from-blue-500/20 to-blue-500/5 border-blue-500/20"
        },
        {
            id: "transactions",
            title: "Transaction History",
            description: "View your recent transactions",
            icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
            action: onViewTransactions,
            color: "from-purple-500/20 to-purple-500/5 border-purple-500/20"
        },
        {
            id: "fd",
            title: "Fixed Deposit",
            description: "Create a new fixed deposit",
            icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
            action: () => setShowFDForm(true),
            color: "from-dhani-gold/20 to-dhani-gold/5 border-dhani-gold/20"
        }
    ];

    return (
        <div className="space-y-6">
            {!showFDForm ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {services.map((service) => (
                        <button
                            key={service.id}
                            onClick={service.action}
                            className={`bg-gradient-to-br ${service.color} rounded-xl p-6 border hover:scale-105 transition-all duration-300 text-left`}
                        >
                            <div className="flex items-center space-x-3 mb-4">
                                <div className="text-dhani-gold">{service.icon}</div>
                                <h3 className="text-white font-semibold">{service.title}</h3>
                            </div>
                            <p className="text-gray-400 text-sm">{service.description}</p>
                        </button>
                    ))}
                </div>
            ) : (
                <div className="max-w-2xl mx-auto">
                    <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-white font-semibold text-lg flex items-center">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="mr-3">
                                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-dhani-gold"/>
                                </svg>
                                Create Fixed Deposit
                            </h3>
                            <button
                                onClick={() => setShowFDForm(false)}
                                className="text-gray-400 hover:text-white"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M18 6L6 18M6 6l12 12"/>
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-gray-300 text-sm font-medium mb-2">
                                    Amount (Minimum ₹100)
                                </label>
                                <input
                                    type="number"
                                    value={fdAmount}
                                    onChange={(e) => setFdAmount(e.target.value)}
                                    min="100"
                                    max={bankBalance}
                                    className="w-full px-4 py-3 bg-black/30 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-dhani-gold focus:border-transparent"
                                    placeholder="Enter amount"
                                />
                                <p className="text-xs text-gray-400 mt-1">
                                    Available balance: ₹{bankBalance.toLocaleString()}
                                </p>
                            </div>

                            <div>
                                <label className="block text-gray-300 text-sm font-medium mb-2">
                                    Duration
                                </label>
                                <select
                                    value={fdDuration}
                                    onChange={(e) => setFdDuration(e.target.value)}
                                    className="w-full px-4 py-3 bg-black/30 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-dhani-gold focus:border-transparent"
                                >
                                    <option value="6">6 months (5% APR)</option>
                                    <option value="12">12 months (6% APR)</option>
                                    <option value="24">24 months (7% APR)</option>
                                </select>
                            </div>

                            <button
                                onClick={handleCreateFD}
                                disabled={!fdAmount || parseFloat(fdAmount) < 100 || parseFloat(fdAmount) > bankBalance || loading}
                                className="w-full bg-dhani-gold text-black font-semibold py-3 px-6 rounded-lg hover:bg-dhani-gold/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                            >
                                {loading ? "Creating..." : "Create Fixed Deposit"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ATMDashboard;