import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import Web3Integration from "../Web3Integration";
import DeFiBankingVault from "./DeFiBankingVault";
import {
    bankingApi,
    fixedDepositApi,
} from "../../../utils/api";
import { WalletStatus } from "../../../services/WalletManager";
import { WalletType } from "../../../services/Web3WalletService";
import { icpIntegration } from "../../../services/ICPIntegrationManager";
import { balanceManager } from "../../../services/BalanceManager";
import { icpBalanceManager, ICPToken } from "../../../services/TestnetBalanceManager";
import { canisterService } from "../../../services/CanisterService";

// ==================== ICON COMPONENTS ====================
const OverviewIcon: React.FC<{ isActive?: boolean }> = ({ isActive = false }) => {
    const gradientId = `paint0_linear_470_109${isActive ? '_active' : ''}`;
    return (
        <svg width="58" height="58" viewBox="0 0 58 58" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12.0833 7.25V45.9167H50.75V50.75H7.25V7.25H12.0833ZM49.0412 15.2078L52.4588 18.6255L38.6667 32.4177L31.4167 25.1696L21.0422 35.5422L17.6245 32.1245L31.4167 18.3323L38.6667 25.5804L49.0412 15.2078Z" fill={`url(#${gradientId})`} />
            <defs>
                <linearGradient id={gradientId} x1="29.8544" y1="7.25" x2="29.8544" y2="50.75" gradientUnits="userSpaceOnUse">
                    {isActive ? (<><stop stopColor="#F0C33A" /><stop offset="1" stopColor="#D4A028" /></>) : (<><stop stopColor="white" /><stop offset="1" stopColor="#999999" /></>)}
                </linearGradient>
            </defs>
        </svg>
    );
};

const BankIcon: React.FC<{ isActive?: boolean }> = ({ isActive = false }) => {
    const gradientId = `paint0_linear_470_112${isActive ? '_active' : ''}`;
    return (
        <svg width="58" height="58" viewBox="0 0 58 58" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 48.499H53.3333V53.3324H5V48.499ZM9.83333 29.1657H14.6667V46.0824H9.83333V29.1657ZM21.9167 29.1657H26.75V46.0824H21.9167V29.1657ZM31.5833 29.1657H36.4167V46.0824H31.5833V29.1657ZM43.6667 29.1657H48.5V46.0824H43.6667V29.1657ZM5 17.0824L29.1667 4.99902L53.3333 17.0824V26.749H5V17.0824ZM29.1667 19.499C30.5014 19.499 31.5833 18.417 31.5833 17.0824C31.5833 15.7477 30.5014 14.6657 29.1667 14.6657C27.8319 14.6657 26.75 15.7477 26.75 17.0824C26.75 18.417 27.8319 19.499 29.1667 19.499Z" fill={`url(#${gradientId})`} />
            <defs>
                <linearGradient id={gradientId} x1="29.1667" y1="4.99902" x2="29.1667" y2="53.3324" gradientUnits="userSpaceOnUse">
                    {isActive ? (<><stop stopColor="#F0C33A" /><stop offset="1" stopColor="#D4A028" /></>) : (<><stop stopColor="white" /><stop offset="1" stopColor="#999999" /></>)}
                </linearGradient>
            </defs>
        </svg>
    );
};

const FixedDepositIcon: React.FC<{ isActive?: boolean }> = ({ isActive = false }) => {
    const gradientId = `paint0_linear_470_115${isActive ? '_active' : ''}`;
    return (
        <svg width="58" height="58" viewBox="0 0 58 58" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4.8335 28.9997H9.66683V50.7497H4.8335V28.9997ZM12.0835 33.833H16.9168V50.7497H12.0835V33.833ZM38.6668 19.333H43.5002V50.7497H38.6668V19.333ZM45.9168 24.1663H50.7502V50.7497H45.9168V24.1663ZM21.7502 4.83301H26.5835V50.7497H21.7502V4.83301ZM29.0002 9.66634H33.8335V50.7497H29.0002V9.66634Z" fill={`url(#${gradientId})`} />
            <defs>
                <linearGradient id={gradientId} x1="27.7918" y1="4.83301" x2="27.7918" y2="50.7497" gradientUnits="userSpaceOnUse">
                    {isActive ? (<><stop stopColor="#F0C33A" /><stop offset="1" stopColor="#D4A028" /></>) : (<><stop stopColor="white" /><stop offset="1" stopColor="#999999" /></>)}
                </linearGradient>
            </defs>
        </svg>
    );
};

const NFTIcon: React.FC<{ isActive?: boolean }> = ({ isActive = false }) => {
    const gradientId = `paint0_linear_470_91${isActive ? '_active' : ''}`;
    return (
        <svg width="58" height="58" viewBox="0 0 58 58" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21.7498 29.0003C24.4193 29.0003 26.5832 26.8364 26.5832 24.167C26.5832 21.4976 24.4193 19.3337 21.7498 19.3337C19.0805 19.3337 16.9165 21.4976 16.9165 24.167C16.9165 26.8364 19.0805 29.0003 21.7498 29.0003ZM51.9582 15.7087L28.9998 2.41699L6.0415 15.7087V42.292L28.9998 55.5837L51.9582 42.292V15.7087ZM28.9998 8.00191L47.1248 18.4953V35.1237L36.0998 28.5088L16.836 42.9566L10.8748 39.5053V18.4953L28.9998 8.00191ZM28.9998 49.9987L21.3822 45.5886L36.3999 34.3252L46.0603 40.1216L28.9998 49.9987Z" fill={`url(#${gradientId})`} />
            <defs>
                <linearGradient id={gradientId} x1="28.9998" y1="2.41699" x2="28.9998" y2="55.5837" gradientUnits="userSpaceOnUse">
                    {isActive ? (<><stop stopColor="#F0C33A" /><stop offset="1" stopColor="#D4A028" /></>) : (<><stop stopColor="white" /><stop offset="1" stopColor="#999999" /></>)}
                </linearGradient>
            </defs>
        </svg>
    );
};

// ==================== NUMBER PAD COMPONENT ====================
interface NumberPadProps {
    amount: string;
    onNumberClick: (num: string) => void;
    onDelete: () => void;
    onDeposit?: () => void;
    placeholder?: string;
    buttonLabel?: string;
}

const NumberPad: React.FC<NumberPadProps> = ({ amount, onNumberClick, onDelete, onDeposit, placeholder = "Enter Amount", buttonLabel = "Deposit" }) => (
    <>
        <div className="flex gap-2 mb-2">
            <input type="text" value={amount} readOnly placeholder={placeholder} className="flex-1 bg-neutral-900 text-white font-pixeloid text-lg px-2 py-3 rounded-xl text-center placeholder-gray-500" />
            <button onClick={onDeposit} className="bg-cyan-500 hover:bg-cyan-600 text-white font-pixeloid px-4 py-3 rounded-xl transition-all outline-none focus:outline-none hover:border-none border-none hover:scale-[1.02] flex items-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L12 22M12 2L8 6M12 2L16 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {buttonLabel}
            </button>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-2">
            {[9, 8, 7, 6, 5, 4, 3, 2, 1].map((num) => (
                <button key={num} onClick={() => onNumberClick(num.toString())} className="bg-neutral-900 hover:bg-neutral-800 outline-none focus:outline-none hover:border-none border-none text-white font-pixeloid text-xl py-3 rounded-xl transition-all hover:scale-[1.02]">{num}</button>
            ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
            <div></div>
            <button onClick={() => onNumberClick("0")} className="bg-neutral-900 hover:bg-neutral-800 outline-none focus:outline-none hover:border-none border-none text-white font-pixeloid text-xl py-3 rounded-xl transition-all hover:scale-[1.02]">0</button>
            <button onClick={onDelete} className="bg-red-700/50 text-xl hover:bg-red-700/80 text-white font-pixeloid outline-none focus:outline-none hover:border-none border-none hover:scale-[1.02] py-3 rounded-xl transition-all flex items-center justify-center gap-2">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6.53451 3H20.9993C21.5516 3 21.9993 3.44772 21.9993 4V20C21.9993 20.5523 21.5516 21 20.9993 21H6.53451C6.20015 21 5.88792 20.8329 5.70246 20.5547L0.369122 12.5547C0.145189 12.2188 0.145189 11.7812 0.369122 11.4453L5.70246 3.4453C5.88792 3.1671 6.20015 3 6.53451 3ZM7.06969 5L2.40302 12L7.06969 19H19.9993V5H7.06969ZM12.9993 10.5858L15.8277 7.75736L17.242 9.17157L14.4135 12L17.242 14.8284L15.8277 16.2426L12.9993 13.4142L10.1709 16.2426L8.75668 14.8284L11.5851 12L8.75668 9.17157L10.1709 7.75736L12.9993 10.5858Z" fill="white"/>
                </svg>
                Delete
            </button>
        </div>
    </>
);

// ==================== TAB COMPONENTS ====================
const TabBackgroundSVG: React.FC<{ isActive: boolean }> = ({ isActive }) => {
    const gradientId = `outline_${isActive ? 'active' : 'inactive'}_${Math.random()}`;
    return (
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 150 150" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                    {isActive ? (<><stop offset="0%" stopColor="#F0C33A" /><stop offset="100%" stopColor="#D4A028" /></>) : (<><stop offset="0%" stopColor="#FFFFFF" /><stop offset="100%" stopColor="#999999" /></>)}
                </linearGradient>
            </defs>
            <rect x="2" y="2" width="146" height="146" fill="none" stroke={`url(#${gradientId})`} strokeWidth="3" rx="12" />
        </svg>
    );
};

interface TabButtonProps {
    isActive: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
}

const TabButton: React.FC<TabButtonProps> = ({ isActive, onClick, icon, label }) => (
    <button onClick={onClick} className="relative w-32 h-32 flex flex-col items-center justify-center transition-transform hover:scale-105 focus:outline-none">
        <TabBackgroundSVG isActive={isActive} />
        <div className="relative z-10 flex flex-col items-center justify-center">
            {React.cloneElement(icon as React.ReactElement<{ isActive?: boolean }>, { isActive })}
            <span className={`mt-2 text-xs font-pixeloid ${isActive ? 'text-[#F0C33A]' : 'text-white'}`}>{label}</span>
        </div>
    </button>
);

// ==================== INTERFACES ====================
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

interface Transaction {
    id: number | string;
    type: string;
    from?: string;
    to?: string;
    date: string;
    amount: number;
    isPositive: boolean;
    description?: string;
}

// ==================== MAIN COMPONENT ====================
const NewBankingDashboard: React.FC<BankingDashboardProps> = ({ onClose, playerRupees }) => {
    const { user, isSignedIn, refreshAuth } = useAuth();
    const [activeTab, setActiveTab] = useState("overview");
    const [bankBalance, setBankBalance] = useState(0);
    const [currentCash, setCurrentCash] = useState(playerRupees);
    const [fixedDeposits, setFixedDeposits] = useState<FixedDeposit[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Banking tab state
    const [amount, setAmount] = useState("");
    const [transactionType, setTransactionType] = useState<"deposit" | "withdraw">("deposit");
    
    // Fixed Deposit state
    const [fdAmount, setFdAmount] = useState("");
    const [selectedTerm, setSelectedTerm] = useState("6M");
    
    // Web3 state
    const [walletStatus, setWalletStatus] = useState<WalletStatus>({ connected: false });
    const [icpTokens, setIcpTokens] = useState<ICPToken[]>([]);
    const [syncInProgress, setSyncInProgress] = useState(false);

    // ==================== INITIALIZATION ====================
    useEffect(() => {
        const initializeServices = async () => {
            try {
                await canisterService.initialize();
                await icpIntegration.initialize();
                setWalletStatus(icpIntegration.walletManager.getConnectionStatus());
                await icpBalanceManager.initialize();
                setIcpTokens(icpBalanceManager.getAllTokens());
                
                icpIntegration.walletManager.onConnectionChange((status) => {
                    setWalletStatus(status);
                });
                
                icpBalanceManager.onBalanceUpdate((tokens) => {
                    setIcpTokens(tokens);
                });
            } catch (e) {
                console.warn("Web3 services initialization failed:", e);
            }
        };

        initializeServices();
    }, []);

    // Load banking data
    useEffect(() => {
        const loadBankingData = async () => {
            try {
                setError(null);
                const bankData = await bankingApi.getAccount();
                if (bankData.success && bankData.data) {
                    setBankBalance(bankData.data.balance || 0);
                    
                    // Load transactions if available
                    if (bankData.data.transactions) {
                        setTransactions(bankData.data.transactions);
                    }
                } else {
                    setBankBalance(0);
                }

                const fdData = await fixedDepositApi.getAll();
                if (fdData.success) {
                    setFixedDeposits(fdData.data || []);
                }
            } catch (error) {
                console.error("Error loading banking data:", error);
                setError(`Failed to load banking data`);
            }
        };

        loadBankingData();
    }, []);

    // Subscribe to balance manager
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

    // ==================== HANDLERS ====================
    const handleNumberClick = (num: string) => {
        if (activeTab === "fixed-deposit") {
            setFdAmount(prev => prev + num);
        } else {
            setAmount(prev => prev + num);
        }
    };

    const handleDelete = () => {
        if (activeTab === "fixed-deposit") {
            setFdAmount(prev => prev.slice(0, -1));
        } else {
            setAmount(prev => prev.slice(0, -1));
        }
    };

    const handleDeposit = async () => {
        if (!amount) return;
        
        const depositAmount = parseFloat(amount);
        if (isNaN(depositAmount) || depositAmount <= 0) {
            setError("Invalid amount");
            return;
        }
        
        if (depositAmount > currentCash) {
            setError("Insufficient cash");
            return;
        }

        try {
            setLoading(true);
            const transaction = balanceManager.processDeposit(depositAmount, "Banking System");
            
            try {
                const result = await bankingApi.deposit(depositAmount);
                if (!result.success) {
                    console.warn("Backend deposit failed:", result.error);
                }
            } catch (apiError) {
                console.warn("Backend API error during deposit:", apiError);
            }

            showSuccessNotification("💰 Deposit Successful", `₹${depositAmount.toLocaleString()} deposited to your bank account`);
            setAmount("");
        } catch (error) {
            console.error("Deposit error:", error);
            setError(`Deposit failed: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setLoading(false);
        }
    };

    const handleWithdraw = async () => {
        if (!amount) return;
        
        const withdrawAmount = parseFloat(amount);
        if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
            setError("Invalid amount");
            return;
        }
        
        if (withdrawAmount > bankBalance) {
            setError("Insufficient bank balance");
            return;
        }

        try {
            setLoading(true);
            const transaction = balanceManager.processWithdrawal(withdrawAmount, "Banking System");
            
            try {
                const result = await bankingApi.withdraw(withdrawAmount);
                if (!result.success) {
                    console.warn("Backend withdrawal failed:", result.error);
                }
            } catch (apiError) {
                console.warn("Backend API error during withdrawal:", apiError);
            }

            showSuccessNotification("💸 Withdrawal Successful", `₹${withdrawAmount.toLocaleString()} withdrawn from your bank account`);
            setAmount("");
        } catch (error) {
            console.error("Withdrawal error:", error);
            setError(`Withdrawal failed: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setLoading(false);
        }
    };

    const handleFdDeposit = async () => {
        if (!fdAmount) return;
        
        const depositAmount = parseFloat(fdAmount);
        if (isNaN(depositAmount) || depositAmount <= 0) {
            setError("Invalid amount");
            return;
        }
        
        if (depositAmount > bankBalance) {
            setError("Insufficient bank balance");
            return;
        }

        // Convert term to days
        const termToDays: Record<string, number> = {
            "6M": 180,
            "1Y": 365,
            "3Y": 1095,
            "5Y": 1825
        };
        
        const duration = termToDays[selectedTerm] || 180;

        try {
            setLoading(true);
            const result = await fixedDepositApi.create(depositAmount, duration);
            if (result.success) {
                setBankBalance(prev => prev - depositAmount);
                setFixedDeposits(prev => [...prev, result.data]);
                showSuccessNotification("📈 Fixed Deposit Created", `₹${depositAmount.toLocaleString()} invested for ${selectedTerm}`);
                setFdAmount("");
            } else {
                setError(result.error || "Failed to create fixed deposit");
            }
        } catch (error) {
            console.error("Fixed deposit creation error:", error);
            setError(`Fixed deposit creation failed: ${error}`);
        } finally {
            setLoading(false);
        }
    };

    const handleClaimFD = async (fdId: string) => {
        try {
            setLoading(true);
            const result = await fixedDepositApi.claim(fdId);
            if (result.success) {
                setBankBalance(prev => prev + result.data.totalAmount);
                setFixedDeposits(prev => prev.map(fd => 
                    fd.id === fdId ? { ...fd, status: "claimed" } : fd
                ));
                showSuccessNotification("💰 Fixed Deposit Claimed", `₹${result.data.totalAmount.toLocaleString()} credited to your account`);
            } else {
                setError(result.error || "Failed to claim fixed deposit");
            }
        } catch (error) {
            console.error("Fixed deposit claim error:", error);
            setError(`Fixed deposit claim failed: ${error}`);
        } finally {
            setLoading(false);
        }
    };

    const showSuccessNotification = (title: string, message: string) => {
        try {
            const notification = document.createElement("div");
            notification.className = "fixed top-4 right-4 bg-gradient-to-r from-dhani-gold to-dhani-gold/90 text-black p-4 rounded-xl shadow-lg z-[60] max-w-sm transform translate-x-full transition-transform duration-300";
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
            requestAnimationFrame(() => { notification.style.transform = "translateX(0)"; });
            setTimeout(() => {
                notification.style.transform = "translateX(full)";
                setTimeout(() => { if (notification.parentNode) notification.parentNode.removeChild(notification); }, 300);
            }, 3500);
        } catch (error) {
            console.log(`${title}: ${message}`);
        }
    };

    const calculateFDReturns = (amount: number, term: string): { returnAmount: number; formula: string } => {
        const rates: Record<string, number> = {
            "6M": 3.5,
            "1Y": 4.5,
            "3Y": 5.5,
            "5Y": 6.5
        };
        
        const termMonths: Record<string, number> = {
            "6M": 6,
            "1Y": 12,
            "3Y": 36,
            "5Y": 60
        };
        
        const rate = rates[term] || 3.5;
        const months = termMonths[term] || 6;
        const years = months / 12;
        
        const returnAmount = amount * (rate / 100) * years;
        const formula = `${amount.toFixed(0)}*${years}*${rate}%`;
        
        return { returnAmount, formula };
    };

    // Calculate projected returns for FD
    const fdReturns = fdAmount ? calculateFDReturns(parseFloat(fdAmount) || 0, selectedTerm) : { returnAmount: 700, formula: "10,000*0.5*3.5%" };

    // ==================== RENDER FUNCTIONS ====================
    const renderOverviewTab = () => (
        <div className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

            <div className="bg-white/5 border border-white/10 p-6 rounded-xl">
                <h3 className="text-white font-bold text-lg mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <button onClick={() => setActiveTab("bank")} className="bg-dhani-gold/20 hover:bg-dhani-gold/30 border border-dhani-gold/50 text-white p-4 rounded-lg transition-colors text-center">
                        <div className="text-2xl mb-2">💰</div>
                        <div className="text-sm font-medium">Deposit/Withdraw</div>
                    </button>
                    <button onClick={() => setActiveTab("fixed-deposit")} className="bg-black border border-yellow-600/30 text-white p-6 rounded transition-colors duration-200 text-center hover:border-yellow-500">
                        <div className="text-lg font-light text-yellow-500 mb-2">FIXED DEPOSITS</div>
                        <div className="text-sm text-gray-400">Secure investments</div>
                    </button>
                    <button onClick={() => setActiveTab("icp")} className="bg-black border border-yellow-600/30 text-white p-6 rounded transition-colors duration-200 text-center hover:border-yellow-500">
                        <div className="text-lg font-light text-yellow-500 mb-2">ICP TOKENS</div>
                        <div className="text-sm text-gray-400">Internet Computer</div>
                    </button>
                </div>
            </div>
        </div>
    );

    const renderBankingTab = () => (
        <div className="p-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-center gap-2 max-w-sm mx-auto mb-6 bg-yellow-600/50 p-1 rounded-lg">
                    <button onClick={() => setTransactionType("deposit")} className={`flex-1 font-pixeloid text-2xl py-1 px-3 rounded-lg transition-all ${transactionType === "deposit" ? "bg-[#F0C33A] text-white" : "bg-transparent text-gray-400"}`}>Deposit</button>
                    <button onClick={() => setTransactionType("withdraw")} className={`flex-1 font-pixeloid text-2xl py-1 px-3 rounded-lg transition-all ${transactionType === "withdraw" ? "bg-white text-black" : "bg-transparent text-gray-400"}`}>Withdraw</button>
                </div>

                <div className="flex gap-2">
                    <div className="flex-1">
                        <NumberPad amount={amount} onNumberClick={handleNumberClick} onDelete={handleDelete} onDeposit={transactionType === 'deposit' ? handleDeposit : handleWithdraw} buttonLabel={transactionType === 'deposit' ? "Deposit" : "Withdraw"} />
                    </div>

                    <div className="flex flex-col justify-center w-72">
                        <div className="bg-neutral-900 rounded-xl p-4 flex-1 flex flex-col justify-center mb-2">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-gray-400 font-pixeloid text-xs">Bank Balance</span>
                            </div>
                            <h2 className="text-white font-pixeloid text-3xl mb-1">₹{bankBalance.toLocaleString()}</h2>
                            <p className="text-gray-500 font-pixeloid text-[10px]">Secured savings</p>
                        </div>

                        <div className="bg-neutral-900 rounded-xl p-4 flex-1 flex flex-col justify-center">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-gray-400 font-pixeloid text-xs">Cash Balance</span>
                            </div>
                            <h2 className="text-white font-pixeloid text-3xl mb-1">₹{currentCash.toLocaleString()}</h2>
                            <p className="text-gray-500 font-pixeloid text-[10px]">Available cash</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderFixedDepositTab = () => (
        <div className="p-8">
            <h2 className="text-white font-pixeloid text-4xl mb-6 text-center">Fixed Deposits</h2>
            
            <div className="flex gap-6 max-w-6xl mx-auto mb-8">
                <div className="flex-1 flex flex-col gap-3">
                    <NumberPad amount={fdAmount} onNumberClick={handleNumberClick} onDelete={handleDelete} onDeposit={handleFdDeposit} buttonLabel="Create FD" />
                </div>

                <div className="flex-1 flex flex-col gap-3">
                    <div className="flex gap-2">
                        {["6M", "1Y", "3Y", "5Y"].map((term) => (
                            <button key={term} onClick={() => setSelectedTerm(term)} className={`flex-1 px-4 py-3 font-pixeloid text-lg rounded-xl transition-all ${selectedTerm === term ? "bg-neutral-700 text-white" : "bg-neutral-900 text-gray-400 hover:bg-neutral-800"}`}>{term.replace("M", " M").replace("Y", " Y")}</button>
                        ))}
                    </div>
                    
                    <div className="flex gap-4 flex-1">
                        <div className="flex-1 bg-neutral-900 rounded-xl p-4 flex flex-col">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-white font-pixeloid text-sm">Projected Return</span>
                            </div>
                            <div className="flex-1 flex items-center justify-center text-neutral-600 font-pixeloid text-xs">Graph SVG Here</div>
                        </div>
                        
                        <div className="flex-1 bg-neutral-900 rounded-xl p-6 flex flex-col justify-center items-center">
                            <span className="text-neutral-400 font-pixeloid text-xs mb-2">Return in {selectedTerm === "6M" ? "6 months" : selectedTerm === "1Y" ? "1 year" : selectedTerm === "3Y" ? "3 years" : "5 years"}</span>
                            <span className="text-white font-pixeloid text-5xl mb-2">₹{fdReturns.returnAmount.toFixed(0)}</span>
                            <span className="text-neutral-500 font-pixeloid text-xs">{fdReturns.formula}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-8 text-white font-pixeloid text-sm text-center">The land of Dverse works 10x faster 1 day is 20 mins long in game</div>

            {/* Existing FDs */}
            {fixedDeposits.length > 0 && (
                <div className="mt-8 max-w-6xl mx-auto">
                    <h3 className="text-white font-pixeloid text-2xl mb-4">Your Fixed Deposits</h3>
                    <div className="space-y-4">
                        {fixedDeposits.map((fd) => (
                            <div key={fd.id || fd._id} className="bg-neutral-900 rounded-xl p-6 flex items-center justify-between">
                                <div>
                                    <h4 className="text-white font-pixeloid text-xl">₹{fd.amount.toLocaleString()}</h4>
                                    <p className="text-gray-400 text-sm">{fd.interestRate}% for {fd.duration} days</p>
                                    <p className="text-gray-500 text-xs">Maturity: {new Date(fd.maturityDate).toLocaleDateString()}</p>
                                </div>
                                {fd.matured && fd.status !== "claimed" && (
                                    <button onClick={() => handleClaimFD(fd.id || fd._id || '')} className="bg-dhani-gold hover:bg-dhani-gold/80 text-black px-6 py-2 rounded-lg font-bold transition-colors">Claim</button>
                                )}
                                {fd.status === "claimed" && <span className="text-green-400">Claimed</span>}
                                {!fd.matured && <span className="text-yellow-400">Active</span>}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    const renderNFTTab = () => (
        <div className="p-8 text-center">
            <h2 className="text-white font-pixeloid text-3xl mb-4">NFT Gallery</h2>
            <p className="text-gray-400 font-pixeloid text-lg">Coming Soon!</p>
        </div>
    );

    const renderICPTab = () => (
        <div className="p-8">
            <div className="bg-white/5 border border-white/10 p-6 rounded-xl">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-bold text-lg">ICP Token Balances</h3>
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

                            <div className="text-right">
                                <p className="text-white font-bold">{parseFloat(token.balance).toLocaleString()}</p>
                                {token.usdValue && <p className="text-gray-300 text-sm">${(parseFloat(token.balance) * token.usdValue).toFixed(2)}</p>}
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

    // ==================== MAIN RENDER ====================
    return (
        <div className="fixed inset-0 bg-black">
            <div className="fixed inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/UI/game/bankbg.png')" }} />
            
            <div className="relative w-full h-full flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-dhani-gold/20">
                    <div className="flex items-center space-x-4">
                        <div className="text-white font-pixeloid text-2xl">Jashanjot Singh</div>
                        <div className="text-gray-400 font-pixeloid text-sm">A/c no DIN-006909</div>
                    </div>
                    <button onClick={onClose} className="bg-[#c45a28] hover:bg-[#d46a38] text-white font-pixeloid px-6 py-2 rounded-full border-2 border-[#a04818] transition-colors">Exit</button>
                </div>

                {/* Error display */}
                {error && (
                    <div className="mx-6 mt-4 bg-red-900/30 border border-red-600 p-4 rounded-lg">
                        <div className="flex items-center space-x-2">
                            <span className="text-red-400">⚠️</span>
                            <span className="text-red-200">{error}</span>
                            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">✕</button>
                        </div>
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {activeTab === "overview" && renderOverviewTab()}
                    {activeTab === "bank" && renderBankingTab()}
                    {activeTab === "fixed-deposit" && renderFixedDepositTab()}
                    {activeTab === "nft" && renderNFTTab()}
                    {activeTab === "icp" && renderICPTab()}
                </div>

                {/* Bottom Navigation */}
                <div className="flex justify-center items-center gap-8 p-6 bg-black/50 backdrop-blur-sm">
                    <TabButton isActive={activeTab === "overview"} onClick={() => setActiveTab("overview")} icon={<OverviewIcon />} label="Overview" />
                    <TabButton isActive={activeTab === "bank"} onClick={() => setActiveTab("bank")} icon={<BankIcon />} label="Bank" />
                    <TabButton isActive={activeTab === "fixed-deposit"} onClick={() => setActiveTab("fixed-deposit")} icon={<FixedDepositIcon />} label="Fixed Deposit" />
                    <TabButton isActive={activeTab === "nft"} onClick={() => setActiveTab("nft")} icon={<NFTIcon />} label="NFT" />
                </div>
            </div>
        </div>
    );
};

export default NewBankingDashboard;
