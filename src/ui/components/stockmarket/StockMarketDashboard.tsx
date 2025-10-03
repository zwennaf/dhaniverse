import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import TradeStockPopup from "./TradeStockPopup.tsx";
import StockDetail from "./StockDetail.tsx";
import StockGraph from "./StockGraph.tsx";
import StockLeaderboard from "./StockLeaderboard.tsx";
// Lazy-loaded panels to avoid eager canister initialization
const WalletsAsync = React.lazy(() => import('./WalletList'));
const AchievementsAsync = React.lazy(() => import('./AchievementsPanel'));
const MarketSummaryAsync = React.lazy(() => import('./MarketSummary'));
const OnChainTxAsync = React.lazy(() => import('./OnChainTransactions'));
import NewsPopup from "./NewsPopup.tsx";
import ProcessingLoader from "../common/ProcessingLoader.tsx";
import { stockApi } from "../../../utils/api.ts";
import { balanceManager } from "../../../services/BalanceManager";
import { portfolioAnalytics } from '../../../services/PortfolioAnalyticsService';
import { stockTransactionService } from '../../../services/StockTransactionService';

// Use Stock from stock.types and extend it with legacy properties for backward compatibility
import type { UIStock } from "../../../services/StockMarketDataService";

// Use UIStock directly - it has everything we need
type Stock = UIStock;

interface StockHolding {
    stockId: string;
    quantity: number;
    averagePurchasePrice: number;
    totalInvestment: number;
}

interface StockTransaction {
    stockId: string;
    stockName: string;
    type: "buy" | "sell";
    price: number;
    quantity: number;
    timestamp: number;
    total: number;
}

interface PlayerPortfolio {
    holdings: StockHolding[];
    transactionHistory: StockTransaction[];
}

interface StockMarketDashboardProps {
    onClose: () => void;
    playerRupees: number;
    stocks: Stock[];
    isLoadingStocks?: boolean;
}

type SortField = "name" | "currentPrice" | "sector" | "marketCap" | "peRatio";
type SortDirection = "asc" | "desc";
type FilterOption = "all" | "technology" | "finance" | "healthcare" | "consumer" | "energy" | "cryptocurrency";
type TabOption = "market" | "portfolio";
type ViewMode = "cards" | "table";

const StockMarketDashboard: React.FC<StockMarketDashboardProps> = ({ onClose, playerRupees, stocks: propsStocks, isLoadingStocks: propsIsLoadingStocks }) => {
    // Auth context for Internet Identity persistence
    const { user, isSignedIn, refreshAuth } = useAuth();

    // Services (lazily created to avoid side-effects during SSR or eager loads)
    // Lazy getters intentionally return null; components should dynamically import
    // `ICPActorService` or `WalletManager` when they actually need active instances.
    const getIcpService = () => null;
    const getWalletManager = () => null;
    
    // Core UI state
    const [activeTab, setActiveTab] = useState<TabOption>("market");
    const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
    const [showTrade, setShowTrade] = useState(false);
    const [showDetail, setShowDetail] = useState(false);
    const [showGraph, setShowGraph] = useState(false);
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [showNews, setShowNews] = useState(false);
    const [showWallets, setShowWallets] = useState(false);
    const [showAchievements, setShowAchievements] = useState(false);
    const [showMarketSummary, setShowMarketSummary] = useState(false);
    const [showOnChainTx, setShowOnChainTx] = useState(false);
    const [sortField, setSortField] = useState<SortField>("name");
    const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
    const [filterOption, setFilterOption] = useState<FilterOption>("all");
    const [filteredStocks, setFilteredStocks] = useState<Stock[]>([]);
    const [currentRupees, setCurrentRupees] = useState(playerRupees);
    const [portfolio, setPortfolio] = useState<PlayerPortfolio>({ holdings: [], transactionHistory: [] });
    const [isLoading, setIsLoading] = useState(true);
    const [loadingStage, setLoadingStage] = useState("Loading Stock Market Data");
    const [viewMode, setViewMode] = useState<ViewMode>("cards");

    // Fetch server transactions (authoritative) and hydrate analytics. Returns true if real history applied.
    const fetchAndHydrateTransactions = async (stockNames?: { [id: string]: string }) => {
        try {
            const txResp = await stockApi.getTransactions();
            if (txResp.success && Array.isArray(txResp.data) && txResp.data.length > 0) {
                // Clear then hydrate with ordered server transactions
                portfolioAnalytics.clearAllData();
                portfolioAnalytics.hydrateServerTransactions(
                    txResp.data.map((t: any) => ({
                        type: t.type,
                        symbol: (t.stockId || t.symbol || t.stockSymbol || '').toLowerCase(),
                        quantity: t.quantity,
                        price: t.price,
                        timestamp: t.timestamp instanceof Date ? t.timestamp.getTime() : (typeof t.timestamp === 'string' ? Date.parse(t.timestamp) : t.timestamp)
                    })),
                    stockNames
                );
                return true;
            }
        } catch (err) {
            console.warn('⚠️ Failed to fetch server stock transactions for hydration:', err);
        }
        return false;
    };

    // Load portfolio data from stockTransactionService
    const loadPortfolioData = async () => {
        try {
            const servicePortfolio = stockTransactionService.getPortfolio();
            const transformedPortfolio: PlayerPortfolio = {
                holdings: servicePortfolio.holdings.map(h => ({
                    stockId: h.symbol.toLowerCase(),
                    quantity: h.quantity,
                    averagePurchasePrice: h.averagePrice,
                    totalInvestment: h.totalCost,
                })),
                transactionHistory: stockTransactionService.getTransactions(50).map(t => ({
                    stockId: t.symbol.toLowerCase(),
                    stockName: t.symbol,
                    type: t.type,
                    price: t.price,
                    quantity: t.quantity,
                    timestamp: t.timestamp,
                    total: t.totalAmount,
                })),
            };
            setPortfolio(transformedPortfolio);
            console.log('📊 Portfolio loaded from stockTransactionService:', transformedPortfolio);
        } catch (error) {
            console.error('Failed to load portfolio from stockTransactionService:', error);
        }
    };

    // Log authentication status for debugging
    useEffect(() => {
        console.log('StockMarketDashboard - Auth status:', { user, isSignedIn });
        
        // Check for Internet Identity authentication persistence
        const checkIIAuth = async () => {
            try {
                const { AuthClient } = await import("@dfinity/auth-client");
                const authClient = await AuthClient.create();
                const isAuthenticated = await authClient.isAuthenticated();
                
                if (isAuthenticated && !isSignedIn) {
                    console.log('Internet Identity session found but user not signed in - refreshing auth');
                    refreshAuth();
                } else if (isAuthenticated && isSignedIn) {
                    console.log('Internet Identity session active and user signed in');
                } else if (!isSignedIn && localStorage.getItem('token')) {
                    console.log('Token found but user not signed in - refreshing auth');
                    refreshAuth();
                }
            } catch (error) {
                console.log('Internet Identity check failed:', error);
            }
        };
        
        checkIIAuth();
    }, [user, isSignedIn, refreshAuth]);

    // Load portfolio + hydrate server transactions (persistent realized P/L & history)
    useEffect(() => {
        const loadPortfolioAndTransactions = async () => {
            try {
                const response = await stockApi.getPortfolio();
                console.log('Initial portfolio load response:', response);
                if (response.success && response.data) {
                    const rawHoldings = response.data.holdings || [];
                    const transformed: PlayerPortfolio = {
                        holdings: rawHoldings.map((h: any) => ({
                            stockId: (h.symbol || h.stockId).toLowerCase(),
                            quantity: h.quantity,
                            averagePurchasePrice: h.averagePrice,
                            totalInvestment: h.quantity * h.averagePrice,
                        })),
                        transactionHistory: [],
                    };
                    setPortfolio(transformed);

                    // Build name map from stocks + holdings fallback
                    const stockNames: { [stockId: string]: string } = {};
                    filteredStocks.forEach(s => { stockNames[s.symbol.toLowerCase()] = s.name; });
                    rawHoldings.forEach((h: any) => {
                        const key = (h.symbol || h.stockId || '').toLowerCase();
                        if (key && !stockNames[key] && h.name) stockNames[key] = h.name;
                    });

                    const hydrated = await fetchAndHydrateTransactions(stockNames);
                    if (!hydrated && transformed.holdings.length > 0) {
                        portfolioAnalytics.clearAllData();
                        portfolioAnalytics.loadExistingPortfolio(transformed.holdings, stockNames);
                    }
                }
            } catch (e) {
                console.error('Portfolio load failed', e);
            }
        };
        loadPortfolioAndTransactions();
        // filteredStocks intentionally excluded to prevent re-run loops
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Use stocks from props (loaded via ONE CALL in StockMarketUI)
    useEffect(() => {
        if (propsStocks && propsStocks.length > 0) {
            setFilteredStocks(propsStocks);
            console.log(`✅ Using ${propsStocks.length} stocks from ONE CALL`);
            setIsLoading(false);
        } else if (!propsIsLoadingStocks) {
            // If not loading and no stocks, show empty state
            setIsLoading(false);
        }
    }, [propsStocks, propsIsLoadingStocks]);

    // Listen for rupee updates
    useEffect(() => {
        const handler = (e: any) => {
            if (e.detail?.rupees !== undefined) setCurrentRupees(e.detail.rupees);
        };
        window.addEventListener("rupeesUpdated", handler);
        return () => window.removeEventListener("rupeesUpdated", handler);
    }, []);

    // Filter and sort stocks
    const getDisplayStocks = () => {
        let result = [...filteredStocks];
        
        // Apply sector filter
        if (filterOption !== "all") {
            result = filteredStocks.filter(s => {
                const sector = s.sector?.toLowerCase() || "";
                switch (filterOption) {
                    case "technology": return sector.includes("tech");
                    case "finance": return sector.includes("finance");
                    case "healthcare": return sector.includes("health");
                    case "consumer": return sector.includes("consumer") || sector.includes("retail");
                    case "energy": return sector.includes("energy");
                    case "cryptocurrency": return sector.includes("crypto");
                    default: return true;
                }
            });
        }
        
        // Apply sorting
        result.sort((a, b) => {
            let aVal: any, bVal: any;
            switch (sortField) {
                case "name": 
                    aVal = a.name; 
                    bVal = b.name; 
                    break;
                case "currentPrice": 
                    aVal = a.currentPrice; 
                    bVal = b.currentPrice; 
                    break;
                case "sector": 
                    aVal = a.sector || ""; 
                    bVal = b.sector || ""; 
                    break;
                case "marketCap": 
                    aVal = a.marketCap; 
                    bVal = b.marketCap; 
                    break;
                case "peRatio": 
                    aVal = a.peRatio; 
                    bVal = b.peRatio; 
                    break;
                default: 
                    aVal = a.name; 
                    bVal = b.name;
            }
            
            if (typeof aVal === "string") {
                return sortDirection === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            } else {
                return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
            }
        });
        
        return result;
    };

    const displayStocks = getDisplayStocks();

    // Create stock price map for portfolio analytics
    const stockPriceMap = filteredStocks.reduce((map, stock) => {
        map[stock.symbol.toLowerCase()] = stock.currentPrice; // Use lowercase for consistency
        return map;
    }, {} as { [stockId: string]: number });

    const calculatePortfolioValue = () => {
        let totalValue = 0;
        let totalInvestment = 0;
        
        portfolio.holdings.forEach(holding => {
            const stock = filteredStocks.find(s => s.id === holding.stockId);
            if (stock) {
                const currentValue = stock.currentPrice * holding.quantity;
                totalValue += currentValue;
                totalInvestment += holding.totalInvestment;
            }
        });
        
        const profitLoss = totalValue - totalInvestment;
        const profitLossPercent = totalInvestment > 0 ? (profitLoss / totalInvestment) * 100 : 0;
        
        return { totalValue, totalInvestment, profitLoss, profitLossPercent };
    };

    const openTrade = (stock: Stock) => {
        setSelectedStock(stock);
        setShowTrade(true);
    };

    const closeTrade = () => {
        setShowTrade(false);
        setSelectedStock(null);
    };

    const openDetail = (stock: Stock) => {
        setSelectedStock(stock);
        setShowDetail(true);
    };

    const closeDetail = () => {
        setShowDetail(false);
        setSelectedStock(null);
    };

    const openGraph = () => {
        setShowGraph(true);
        setShowDetail(false);
    };

    const closeGraph = () => {
        setShowGraph(false);
        setShowDetail(true);
    };

    const openNews = () => {
        setShowNews(true);
        setShowDetail(false);
    };

    const closeNews = () => {
        setShowNews(false);
        setShowDetail(true);
    };

    const openLeaderboard = () => {
        setShowLeaderboard(true);
    };

    const closeLeaderboard = () => {
        setShowLeaderboard(false);
    };

    const handleBuyStock = async (stockId: string, quantity: number) => {
        const stock = filteredStocks.find(s => s.id === stockId);
        if (!stock) return { success: false, message: "Stock not found" };

        const totalCost = stock.currentPrice * quantity;
        if (totalCost > currentRupees) {
            return { success: false, message: "Insufficient funds" };
        }

        try {
            console.log('Attempting to buy stock:', {
                stockSymbol: stock.symbol,
                stockId: stockId,
                quantity,
                price: stock.currentPrice,
                name: stock.name,
                totalCost
            });

            const response = await stockApi.buyStock(
                stock.symbol, // Use original uppercase symbol
                quantity,
                stock.currentPrice,
                stock.name
            );

            console.log('Buy stock API response:', response);

            if (response.success) {
                // Update balance
                const newBalance = currentRupees - totalCost;
                setCurrentRupees(newBalance);
                balanceManager.updateCash(newBalance);
                
                // Record transaction in analytics
                portfolioAnalytics.recordTransaction({
                    stockId: stock.symbol.toLowerCase(), // Ensure consistent lowercase
                    stockName: stock.name,
                    type: 'buy',
                    quantity,
                    price: stock.currentPrice,
                    total: totalCost,
                });

                // Dispatch a unified stock-transaction event so ATM / other UIs can show it in history immediately
                window.dispatchEvent(new CustomEvent('stock-transaction', {
                    detail: {
                        type: 'buy',
                        amount: totalCost,
                        symbol: stock.symbol,
                        quantity,
                        price: stock.currentPrice
                    }
                }));
                
                // Update portfolio
                const portfolioResponse = await stockApi.getPortfolio();
                console.log('Portfolio API Response:', portfolioResponse);
                if (portfolioResponse.success && portfolioResponse.data) {
                    console.log('Portfolio holdings data:', portfolioResponse.data.holdings);
                    const transformedPortfolio: PlayerPortfolio = {
                        holdings: portfolioResponse.data.holdings?.map((holding: any) => {
                            console.log('Transforming holding:', {
                                original: holding,
                                symbol: holding.symbol,
                                stockId: holding.symbol.toLowerCase(), // Convert to lowercase to match stock IDs
                                quantity: holding.quantity,
                                averagePrice: holding.averagePrice
                            });
                            return {
                                stockId: holding.symbol.toLowerCase(), // Convert to lowercase to match stock IDs
                                quantity: holding.quantity,
                                averagePurchasePrice: holding.averagePrice,
                                totalInvestment: holding.quantity * holding.averagePrice,
                            };
                        }) || [],
                        transactionHistory: [],
                    };
                    console.log('Transformed portfolio:', transformedPortfolio);
                    setPortfolio(transformedPortfolio);
                    
                    // Hydrate from server transactions (preferred) else fallback to synthetic holdings
                    const stockNames: { [stockId: string]: string } = {};
                    filteredStocks.forEach(s => { stockNames[s.symbol.toLowerCase()] = s.name; });
                    transformedPortfolio.holdings.forEach((h: any) => { if (!stockNames[h.stockId]) stockNames[h.stockId] = h.stockId.toUpperCase(); });
                    const hydrated = await fetchAndHydrateTransactions(stockNames);
                    if (!hydrated && transformedPortfolio.holdings.length > 0) {
                        portfolioAnalytics.clearAllData();
                        portfolioAnalytics.loadExistingPortfolio(transformedPortfolio.holdings, stockNames);
                    }
                }

                return {
                    success: true,
                    message: `Successfully purchased ${quantity} shares of ${stock.name} for ₹${totalCost.toLocaleString()}`,
                };
            }
            
            return { success: false, message: response.error || response.message || "Purchase failed" };
        } catch (error) {
            console.error("Buy stock error:", error);
            return { success: false, message: "Transaction failed: " + (error instanceof Error ? error.message : "Unknown error occurred") };
        }
    };

    const handleSellStock = async (stockId: string, quantity: number) => {
        const stock = filteredStocks.find(s => s.id === stockId);
        if (!stock) return { success: false, message: "Stock not found" };

        const holding = portfolio.holdings.find(h => h.stockId === stockId);
        if (!holding || holding.quantity < quantity) {
            return { success: false, message: "Insufficient shares to sell" };
        }

        try {
            console.log('Attempting to sell stock:', {
                stockSymbol: stock.symbol,
                stockId: stockId,
                quantity,
                price: stock.currentPrice
            });
            
            const response = await stockApi.sellStock(stock.symbol, quantity, stock.currentPrice);

            if (response.success) {
                const saleValue = stock.currentPrice * quantity;
                
                // Update balance
                const newBalance = currentRupees + saleValue;
                setCurrentRupees(newBalance);
                balanceManager.updateCash(newBalance);
                
                // Record transaction in analytics
                portfolioAnalytics.recordTransaction({
                    stockId: stock.symbol.toLowerCase(), // Ensure consistent lowercase
                    stockName: stock.name,
                    type: 'sell',
                    quantity,
                    price: stock.currentPrice,
                    total: saleValue,
                });

                // Dispatch stock-transaction event for real-time ATM/history updates
                window.dispatchEvent(new CustomEvent('stock-transaction', {
                    detail: {
                        type: 'sell',
                        amount: saleValue,
                        symbol: stock.symbol,
                        quantity,
                        price: stock.currentPrice
                    }
                }));
                
                // Update portfolio
                const portfolioResponse = await stockApi.getPortfolio();
                if (portfolioResponse.success && portfolioResponse.data) {
                    const transformedPortfolio: PlayerPortfolio = {
                        holdings: portfolioResponse.data.holdings?.map((holding: any) => ({
                            // Normalize to lowercase to stay consistent with filteredStocks ids
                            stockId: holding.symbol.toLowerCase(),
                            quantity: holding.quantity,
                            averagePurchasePrice: holding.averagePrice,
                            totalInvestment: holding.quantity * holding.averagePrice,
                        })) || [],
                        transactionHistory: [],
                    };
                    setPortfolio(transformedPortfolio);
                    
                    const stockNames: { [stockId: string]: string } = {};
                    filteredStocks.forEach(s => { stockNames[s.symbol.toLowerCase()] = s.name; });
                    transformedPortfolio.holdings.forEach((h: any) => { if (!stockNames[h.stockId]) stockNames[h.stockId] = h.stockId.toUpperCase(); });
                    const hydrated = await fetchAndHydrateTransactions(stockNames);
                    if (!hydrated && transformedPortfolio.holdings.length > 0) {
                        portfolioAnalytics.clearAllData();
                        portfolioAnalytics.loadExistingPortfolio(transformedPortfolio.holdings, stockNames);
                    }
                }
                
                const profit = saleValue - holding.averagePurchasePrice * quantity;
                const profitPercent = (profit / (holding.averagePurchasePrice * quantity)) * 100;
                
                const profitMessage = profit >= 0
                    ? `with a profit of ₹${profit.toLocaleString()} (${profitPercent.toFixed(2)}%)`
                    : `with a loss of ₹${Math.abs(profit).toLocaleString()} (${Math.abs(profitPercent).toFixed(2)}%)`;

                return {
                    success: true,
                    message: `Successfully sold ${quantity} shares of ${stock.name} for ₹${saleValue.toLocaleString()} ${profitMessage}`,
                };
            }
            
            return { success: false, message: response.error || response.message || "Sale failed" };
        } catch (error) {
            console.error("Sell stock error:", error);
            return { success: false, message: "Transaction failed: " + (error instanceof Error ? error.message : "Unknown error occurred") };
        }
    };

    return (
        <>
            <div className="fixed inset-0 bg-black z-50 flex flex-col">
                {/* Loading Layer */}
                {isLoading && (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <div className="mb-8">
                                <h1 className="text-4xl font-bold text-yellow-500 mb-2" style={{ fontFamily:'VCR OSD Mono, monospace' }}>
                                    DHANIVERSE EXCHANGE
                                </h1>
                                <div className="w-24 h-1 bg-yellow-500 mx-auto rounded" />
                            </div>
                            <ProcessingLoader text={loadingStage} className="mt-8" />
                        </div>
                    </div>
                )}

                {!isLoading && (
                    <>
                        {/* Header */}
                        <div className="bg-black border-b border-yellow-600/30 p-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <div className="w-12 h-12 bg-yellow-600 rounded flex items-center justify-center">
                                        <svg className="w-7 h-7 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                                        </svg>
                                    </div>
                                    <div>
                                        <h1 className="text-2xl font-light text-yellow-500 tracking-wide" style={{ fontFamily:'VCR OSD Mono, monospace' }}>
                                            DHANIVERSE EXCHANGE
                                        </h1>
                                        <p className="text-gray-400 text-xs tracking-wider uppercase">Real-time stock trading powered by ICP</p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-8">
                                    <div className="text-right">
                                        <p className="text-xs text-gray-400 uppercase tracking-wide">Available Balance</p>
                                        <p className="text-xl font-light text-yellow-500">₹{currentRupees.toLocaleString()}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">All prices in INR</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-400 uppercase tracking-wide">Portfolio Value</p>
                                        <p className="text-xl font-light text-yellow-500">₹{calculatePortfolioValue().totalValue.toLocaleString()}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">1 USD = ₹88</p>
                                    </div>
                                    <button 
                                        onClick={openLeaderboard}
                                        className="bg-purple-600 text-white px-4 py-2 rounded font-medium hover:bg-purple-500 transition-colors duration-200"
                                    >
                                        LEADERBOARD
                                    </button>
                                    <div className="flex items-center space-x-2">
                                        <button
                                            onClick={() => setShowWallets(true)}
                                            className="bg-gray-800 text-white px-3 py-2 rounded font-medium hover:bg-gray-700 transition-colors duration-200"
                                            title="Wallets"
                                        >
                                            Wallets
                                        </button>
                                        <button
                                            onClick={() => setShowAchievements(true)}
                                            className="bg-gray-800 text-white px-3 py-2 rounded font-medium hover:bg-gray-700 transition-colors duration-200"
                                            title="Achievements"
                                        >
                                            Achievements
                                        </button>
                                        <button
                                            onClick={() => setShowMarketSummary(true)}
                                            className="bg-gray-800 text-white px-3 py-2 rounded font-medium hover:bg-gray-700 transition-colors duration-200"
                                            title="Market Summary"
                                        >
                                            Market
                                        </button>
                                        <button
                                            onClick={() => setShowOnChainTx(true)}
                                            className="bg-gray-800 text-white px-3 py-2 rounded font-medium hover:bg-gray-700 transition-colors duration-200"
                                            title="On-chain Transactions"
                                        >
                                            Tx
                                        </button>
                                    </div>
                                    <button onClick={onClose} className="text-gray-400 hover:text-yellow-500 text-2xl transition-colors duration-200">
                                        ×
                                    </button>
                                </div>
                            </div>
                            
                            {/* Tab Navigation */}
                            <div className="flex space-x-4 mt-6">
                                <button
                                    onClick={() => setActiveTab("market")}
                                    className={`px-6 py-3 font-medium tracking-wide transition-colors duration-200 border-b-2 ${
                                        activeTab === "market" 
                                            ? "text-yellow-500 border-yellow-500" 
                                            : "text-gray-400 border-transparent hover:text-yellow-500"
                                    }`}
                                    style={{ fontFamily:'VCR OSD Mono, monospace' }}
                                >
                                    MARKET
                                </button>
                                <button
                                    onClick={() => setActiveTab("portfolio")}
                                    className={`px-6 py-3 font-medium tracking-wide transition-colors duration-200 border-b-2 ${
                                        activeTab === "portfolio" 
                                            ? "text-yellow-500 border-yellow-500" 
                                            : "text-gray-400 border-transparent hover:text-yellow-500"
                                    }`}
                                    style={{ fontFamily:'VCR OSD Mono, monospace' }}
                                >
                                    PORTFOLIO
                                </button>
                            </div>
                        </div>

                        {/* Main Content */}
                        <div className="flex-1 overflow-y-auto flex flex-col">
                            {activeTab === "market" && (
                                <>
                                    {/* Filters */}
                                    <div className="bg-gray-900/50 border-b border-gray-700/50 p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-6">
                                                <div className="flex items-center space-x-3">
                                                    <label className="text-sm text-gray-400 uppercase tracking-wide">Filter by Sector:</label>
                                                    <select
                                                        value={filterOption}
                                                        onChange={(e) => setFilterOption(e.target.value as FilterOption)}
                                                        className="bg-gray-800 border border-gray-600 text-white px-3 py-1 rounded text-sm focus:border-yellow-500 focus:outline-none"
                                                    >
                                                        <option value="all">All Sectors</option>
                                                        <option value="technology">Technology</option>
                                                        <option value="finance">Finance</option>
                                                        <option value="healthcare">Healthcare</option>
                                                        <option value="consumer">Consumer</option>
                                                        <option value="energy">Energy</option>
                                                        <option value="cryptocurrency">Cryptocurrency</option>
                                                    </select>
                                                </div>
                                                <div className="flex items-center space-x-3">
                                                    <label className="text-sm text-gray-400 uppercase tracking-wide">Sort by:</label>
                                                    <select
                                                        value={sortField}
                                                        onChange={(e) => setSortField(e.target.value as SortField)}
                                                        className="bg-gray-800 border border-gray-600 text-white px-3 py-1 rounded text-sm focus:border-yellow-500 focus:outline-none"
                                                    >
                                                        <option value="name">Name</option>
                                                        <option value="currentPrice">Price</option>
                                                        <option value="sector">Sector</option>
                                                        <option value="marketCap">Market Cap</option>
                                                        <option value="peRatio">P/E Ratio</option>
                                                    </select>
                                                    <button
                                                        onClick={() => setSortDirection(sortDirection === "asc" ? "desc" : "asc")}
                                                        className="bg-gray-800 border border-gray-600 text-white px-3 py-1 rounded text-sm hover:border-yellow-500 focus:border-yellow-500 focus:outline-none"
                                                    >
                                                        {sortDirection === "asc" ? "↑" : "↓"}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-3">
                                                <span className="text-sm text-gray-400">View:</span>
                                                <div className="flex bg-gray-800 rounded border border-gray-600">
                                                    <button
                                                        onClick={() => setViewMode("cards")}
                                                        className={`px-3 py-1 text-sm rounded-l ${viewMode === "cards" ? 'bg-yellow-600 text-black' : 'text-white hover:bg-gray-700'}`}
                                                    >
                                                        📄 Cards
                                                    </button>
                                                    <button
                                                        onClick={() => setViewMode("table")}
                                                        className={`px-3 py-1 text-sm rounded-r ${viewMode === "table" ? 'bg-yellow-600 text-black' : 'text-white hover:bg-gray-700'}`}
                                                    >
                                                        📊 Table
                                                    </button>
                                                </div>
                                                <div className="text-sm text-gray-400">
                                                    Showing {displayStocks.length} stocks
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Stock List */}
                                    <div className="flex-1 overflow-y-auto">
                                        {viewMode === "cards" ? (
                                            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 p-6">
                                                {displayStocks.map((stock) => {
                                                    const holding = portfolio.holdings.find(h => h.stockId === stock.id);
                                                    const owned = holding?.quantity || 0;
                                                    
                                                    return (
                                                        <div
                                                            key={stock.id}
                                                            className="bg-gray-900/80 border border-gray-700/50 rounded-lg p-6 hover:border-yellow-500/50 transition-all duration-200 cursor-pointer"
                                                            onClick={() => openTrade(stock)}
                                                        >
                                                            <div className="flex justify-between items-start mb-4">
                                                                <div>
                                                                    <h3 className="text-lg font-medium text-white mb-1">{stock.name}</h3>
                                                                    <p className="text-xs text-gray-400 uppercase tracking-wide">{stock.sector}</p>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-2xl font-light text-yellow-500">₹{stock.currentPrice.toLocaleString()}</p>
                                                                    {owned > 0 && (
                                                                        <p className="text-xs text-blue-400 mt-1">Owned: {owned}</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                                <div>
                                                                    <p className="text-gray-400">Market Cap</p>
                                                                    <p className="text-white">₹{(stock.marketCap / 1000000).toFixed(1)}M</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-gray-400">P/E Ratio</p>
                                                                    <p className="text-white">{stock.peRatio.toFixed(1)}</p>
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="flex space-x-2 mt-4">
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); openDetail(stock); }}
                                                                    className="flex-1 bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-500 transition-colors duration-200 text-xs"
                                                                >
                                                                    DETAILS
                                                                </button>
                                                                <button 
                                                                    onClick={(e) => { 
                                                                        e.stopPropagation(); 
                                                                        setSelectedStock(stock);
                                                                        setShowGraph(true);
                                                                    }}
                                                                    className="flex-1 bg-purple-600 text-white py-2 rounded font-medium hover:bg-purple-500 transition-colors duration-200 text-xs"
                                                                >
                                                                    📈 GRAPH
                                                                </button>
                                                                <button 
                                                                    onClick={(e) => { e.stopPropagation(); openTrade(stock); }}
                                                                    className="flex-1 bg-yellow-600 text-black py-2 rounded font-medium hover:bg-yellow-500 transition-colors duration-200 text-xs"
                                                                >
                                                                    TRADE
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="p-6">
                                                <div className="bg-gray-900/50 rounded-lg overflow-hidden">
                                                    <table className="w-full">
                                                        <thead className="bg-gray-800/50">
                                                            <tr>
                                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Stock</th>
                                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Price</th>
                                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Market Cap</th>
                                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">P/E</th>
                                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Owned</th>
                                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-700/50">
                                                            {displayStocks.map((stock) => {
                                                                const holding = portfolio.holdings.find(h => h.stockId === stock.id);
                                                                const owned = holding?.quantity || 0;
                                                                
                                                                return (
                                                                    <tr key={stock.id} className="hover:bg-gray-800/25 cursor-pointer" onClick={() => openTrade(stock)}>
                                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                                            <div>
                                                                                <div className="text-sm font-medium text-white">{stock.name}</div>
                                                                                <div className="text-sm text-gray-400">{stock.sector}</div>
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-500 font-medium">
                                                                            ₹{stock.currentPrice.toLocaleString()}
                                                                        </td>
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                                                                            ₹{(stock.marketCap / 1000000).toFixed(1)}M
                                                                        </td>
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                                                                            {stock.peRatio.toFixed(1)}
                                                                        </td>
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                                            {owned > 0 ? (
                                                                                <span className="text-blue-400 font-medium">{owned}</span>
                                                                            ) : (
                                                                                <span className="text-gray-500">-</span>
                                                                            )}
                                                                        </td>
                                                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                                            <div className="flex space-x-1">
                                                                                <button 
                                                                                    onClick={(e) => { e.stopPropagation(); openDetail(stock); }}
                                                                                    className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-500"
                                                                                    title="Details"
                                                                                >
                                                                                    📋
                                                                                </button>
                                                                                <button 
                                                                                    onClick={(e) => { 
                                                                                        e.stopPropagation(); 
                                                                                        setSelectedStock(stock);
                                                                                        setShowGraph(true);
                                                                                    }}
                                                                                    className="bg-purple-600 text-white px-2 py-1 rounded text-xs hover:bg-purple-500"
                                                                                    title="Graph"
                                                                                >
                                                                                    📈
                                                                                </button>
                                                                                <button 
                                                                                    onClick={(e) => { e.stopPropagation(); openTrade(stock); }}
                                                                                    className="bg-yellow-600 text-black px-2 py-1 rounded text-xs hover:bg-yellow-500"
                                                                                    title="Trade"
                                                                                >
                                                                                    💰
                                                                                </button>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                            {activeTab === "portfolio" && (
                                <div className="flex-1 p-6">
                                    {/* Portfolio Overview */}
                                    <div className="mb-6">
                                        <h2 className="text-2xl font-bold text-white mb-4">Portfolio Analytics</h2>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                            <div className="bg-gray-900/50 p-4 rounded-lg">
                                                <div className="flex items-center justify-between mb-2">
                                                    <p className="text-gray-400 text-sm" title="Profit/Loss if you sold all holdings at current prices">Unrealized P/L</p>
                                                </div>
                                                <p className={`text-2xl font-light ${portfolioAnalytics.getUnrealizedProfitLoss(stockPriceMap) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                    ₹{portfolioAnalytics.getUnrealizedProfitLoss(stockPriceMap).toLocaleString()}
                                                </p>
                                            </div>
                                            <div className="bg-gray-900/50 p-4 rounded-lg">
                                                <div className="flex items-center justify-between mb-2">
                                                    <p className="text-gray-400 text-sm" title="Actual profit/loss from completed trades">Realized P/L</p>
                                                </div>
                                                <p className={`text-2xl font-light ${portfolioAnalytics.getPortfolioMetrics(stockPriceMap).netProfitLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                    ₹{portfolioAnalytics.getPortfolioMetrics(stockPriceMap).netProfitLoss.toLocaleString()}
                                                </p>
                                            </div>
                                            <div className="bg-gray-900/50 p-4 rounded-lg">
                                                <div className="flex items-center justify-between mb-2">
                                                    <p className="text-gray-400 text-sm" title="Percentage of profitable trades (sells only)">Win Rate</p>
                                                </div>
                                                <p className="text-2xl font-light text-blue-400">
                                                    {portfolioAnalytics.getPortfolioMetrics(stockPriceMap).winRate.toFixed(1)}%
                                                </p>
                                            </div>
                                            <div className="bg-gray-900/50 p-4 rounded-lg">
                                                <div className="flex items-center justify-between mb-2">
                                                    <p className="text-gray-400 text-sm" title="Number of completed sell transactions">Total Trades</p>
                                                </div>
                                                <p className="text-2xl font-light text-purple-400">
                                                    {portfolioAnalytics.getPortfolioMetrics(stockPriceMap).totalTrades}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Advanced Metrics */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                            <div className="bg-gray-900/50 p-4 rounded-lg">
                                                <div className="flex items-center justify-between mb-2">
                                                    <p className="text-gray-400 text-sm" title="Average profit per winning trade">Avg Win</p>
                                                </div>
                                                <p className="text-xl font-light text-green-400">
                                                    ₹{portfolioAnalytics.getPortfolioMetrics(stockPriceMap).averageWin.toLocaleString()}
                                                </p>
                                            </div>
                                            <div className="bg-gray-900/50 p-4 rounded-lg">
                                                <div className="flex items-center justify-between mb-2">
                                                    <p className="text-gray-400 text-sm" title="Average loss per losing trade">Avg Loss</p>
                                                </div>
                                                <p className="text-xl font-light text-red-400">
                                                    ₹{portfolioAnalytics.getPortfolioMetrics(stockPriceMap).averageLoss.toLocaleString()}
                                                </p>
                                            </div>
                                            <div className="bg-gray-900/50 p-4 rounded-lg">
                                                <div className="flex items-center justify-between mb-2">
                                                    <p className="text-gray-400 text-sm" title="Best single trade profit">Largest Win</p>
                                                </div>
                                                <p className="text-xl font-light text-green-400">
                                                    ₹{portfolioAnalytics.getPortfolioMetrics(stockPriceMap).largestWin.toLocaleString()}
                                                </p>
                                            </div>
                                            <div className="bg-gray-900/50 p-4 rounded-lg">
                                                <div className="flex items-center justify-between mb-2">
                                                    <p className="text-gray-400 text-sm" title="Worst single trade loss">Largest Loss</p>
                                                </div>
                                                <p className="text-xl font-light text-red-400">
                                                    ₹{Math.abs(portfolioAnalytics.getPortfolioMetrics(stockPriceMap).largestLoss).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Risk Metrics */}
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                                            <div className="bg-gray-900/50 p-4 rounded-lg">
                                                <div className="flex items-center justify-between mb-2">
                                                    <p className="text-gray-400 text-sm" title="Total profits ÷ Total losses (higher is better)">Profit Factor</p>
                                                </div>
                                                <p className="text-xl font-light text-cyan-400">
                                                    {portfolioAnalytics.getPortfolioMetrics(stockPriceMap).profitFactor === Infinity ? '∞' : portfolioAnalytics.getPortfolioMetrics(stockPriceMap).profitFactor.toFixed(2)}
                                                </p>
                                            </div>
                                            <div className="bg-gray-900/50 p-4 rounded-lg">
                                                <div className="flex items-center justify-between mb-2">
                                                    <p className="text-gray-400 text-sm" title="Largest peak-to-trough decline">Max Drawdown</p>
                                                </div>
                                                <p className="text-xl font-light text-orange-400">
                                                    {portfolioAnalytics.getPortfolioMetrics(stockPriceMap).maxDrawdown.toFixed(2)}%
                                                </p>
                                            </div>
                                            <div className="bg-gray-900/50 p-4 rounded-lg">
                                                <div className="flex items-center justify-between mb-2">
                                                    <p className="text-gray-400 text-sm" title="Time spent in current trading session">Session Duration</p>
                                                </div>
                                                <p className="text-xl font-light text-blue-400">
                                                    {portfolioAnalytics.getPortfolioMetrics(stockPriceMap).sessionDuration.toFixed(1)}h
                                                </p>
                                            </div>
                                        </div>

                                        {/* Best/Worst Performing Stocks */}
                                        {portfolioAnalytics.getPortfolioMetrics(stockPriceMap).bestPerformingStock && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                                <div className="bg-gray-900/50 p-4 rounded-lg">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <p className="text-gray-400 text-sm" title="Current holding with highest unrealized gains">Best Performing Stock</p>
                                                    </div>
                                                    <p className="text-lg font-light text-green-400">
                                                        {portfolioAnalytics.getPortfolioMetrics(stockPriceMap).bestPerformingStock?.stockName}
                                                    </p>
                                                    <p className="text-sm text-green-400">
                                                        +₹{portfolioAnalytics.getPortfolioMetrics(stockPriceMap).bestPerformingStock?.profitLoss.toLocaleString()}
                                                        ({portfolioAnalytics.getPortfolioMetrics(stockPriceMap).bestPerformingStock?.profitLossPercent.toFixed(2)}%)
                                                    </p>
                                                </div>
                                                <div className="bg-gray-900/50 p-4 rounded-lg">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <p className="text-gray-400 text-sm" title="Current holding with lowest unrealized gains/highest losses">Worst Performing Stock</p>
                                                    </div>
                                                    <p className="text-lg font-light text-red-400">
                                                        {portfolioAnalytics.getPortfolioMetrics(stockPriceMap).worstPerformingStock?.stockName}
                                                    </p>
                                                    <p className="text-sm text-red-400">
                                                        ₹{portfolioAnalytics.getPortfolioMetrics(stockPriceMap).worstPerformingStock?.profitLoss.toLocaleString()}
                                                        ({portfolioAnalytics.getPortfolioMetrics(stockPriceMap).worstPerformingStock?.profitLossPercent.toFixed(2)}%)
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="bg-gray-900/50 rounded-lg overflow-hidden">
                                        <div className="px-6 py-4 border-b border-gray-700/50">
                                            <h3 className="text-lg font-medium text-white">Your Holdings</h3>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead className="bg-gray-800/50">
                                                    <tr>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Stock</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Quantity</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Avg. Price</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Current Price</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Value</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">P/L</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-700/50">
                                                    {portfolio.holdings.map((holding) => {
                                                        console.log('Rendering portfolio holding:', {
                                                            holdingStockId: holding.stockId,
                                                            availableStockIds: filteredStocks.map(s => s.id),
                                                            stockFound: !!filteredStocks.find(s => s.id === holding.stockId)
                                                        });
                                                        const stock = filteredStocks.find(s => s.id === holding.stockId);
                                                        if (!stock) {
                                                            console.warn('Stock not found for holding:', holding.stockId);
                                                            return null;
                                                        }
                                                        
                                                        const currentValue = stock.currentPrice * holding.quantity;
                                                        const profitLoss = currentValue - holding.totalInvestment;
                                                        const profitLossPercent = (profitLoss / holding.totalInvestment) * 100;
                                                        
                                                        return (
                                                            <tr key={holding.stockId} className="hover:bg-gray-800/25">
                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    <div>
                                                                        <div className="text-sm font-medium text-white">{stock.name}</div>
                                                                        <div className="text-sm text-gray-400">{stock.sector}</div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{holding.quantity}</td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-white">₹{holding.averagePurchasePrice.toLocaleString()}</td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-white">₹{stock.currentPrice.toLocaleString()}</td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-white">₹{currentValue.toLocaleString()}</td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                                    <div className={profitLoss >= 0 ? 'text-green-400' : 'text-red-400'}>
                                                                        ₹{profitLoss.toLocaleString()}
                                                                        <div className="text-xs">({profitLossPercent.toFixed(2)}%)</div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                                    <button
                                                                        onClick={() => openTrade(stock)}
                                                                        className="bg-yellow-600 text-black px-3 py-1 rounded text-xs font-medium hover:bg-yellow-500 transition-colors duration-200"
                                                                    >
                                                                        TRADE
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                            {portfolio.holdings.length === 0 && (
                                                <div className="text-center py-12">
                                                    <p className="text-gray-400">No holdings yet. Start trading to build your portfolio!</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Transaction History */}
                                    <div className="bg-gray-900/50 rounded-lg overflow-hidden mt-6">
                                        <div className="px-6 py-4 border-b border-gray-700/50">
                                            <h3 className="text-lg font-medium text-white">Transaction History</h3>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead className="bg-gray-800/50">
                                                    <tr>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Stock</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Type</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Quantity</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Price</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Total</th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">P/L</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-700/50">
                                                    {portfolioAnalytics.getTransactionHistory(20).map((transaction) => (
                                                        <tr key={transaction.id} className="hover:bg-gray-800/25">
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                                                                {new Date(transaction.timestamp).toLocaleDateString()}
                                                                <div className="text-xs text-gray-400">
                                                                    {new Date(transaction.timestamp).toLocaleTimeString()}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <div className="text-sm font-medium text-white">{transaction.stockName}</div>
                                                                <div className="text-sm text-gray-400">{transaction.stockId}</div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                                                    transaction.type === 'buy'
                                                                        ? 'bg-green-100 text-green-800'
                                                                        : 'bg-red-100 text-red-800'
                                                                }`}>
                                                                    {transaction.type.toUpperCase()}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                                                                {transaction.quantity}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                                                                ₹{transaction.price.toLocaleString()}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                                                                ₹{transaction.total.toLocaleString()}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                                {transaction.type === 'sell' && transaction.profitLoss !== undefined ? (
                                                                    <div className={transaction.profitLoss >= 0 ? 'text-green-400' : 'text-red-400'}>
                                                                        ₹{transaction.profitLoss.toLocaleString()}
                                                                        <div className="text-xs">
                                                                            ({transaction.profitLossPercent?.toFixed(2)}%)
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-gray-400">-</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            {portfolioAnalytics.getTransactionHistory().length === 0 && (
                                                <div className="text-center py-12">
                                                    <p className="text-gray-400">No transactions yet. Start trading to see your history!</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Trade Popup */}
            {showTrade && selectedStock && (
                <TradeStockPopup
                    stock={selectedStock as any}
                    onClose={closeTrade}
                    onTransactionComplete={async () => {
                        // Reload portfolio after transaction
                        await loadPortfolioData();
                        // Update balance display
                        const balance = balanceManager.getBalance();
                        setCurrentRupees(balance.cash);
                    }}
                />
            )}

            {/* Stock Detail Popup */}
            {showDetail && selectedStock && (
                <StockDetail 
                    stock={selectedStock as any}
                    onShowGraph={() => {
                        closeDetail();
                        openGraph();
                    }}
                    onShowNews={() => {
                        closeDetail();
                        openNews();
                    }}
                    onTrade={() => {
                        closeDetail();
                        openTrade(selectedStock);
                    }}
                    onClose={closeDetail}
                />
            )}

            {/* Stock Graph Popup */}
            {showGraph && selectedStock && (
                <StockGraph 
                    stock={selectedStock as any}
                    onClose={closeGraph}
                />
            )}

            {/* Leaderboard Popup */}
            {showLeaderboard && (
                <StockLeaderboard 
                    icpService={getIcpService()}
                    onClose={closeLeaderboard}
                />
            )}

            {/* Wallets Panel (lazy) */}
            {showWallets && (
                <React.Suspense fallback={<div className="fixed inset-0 z-60 flex items-center justify-center">Loading wallets…</div>}>
                    <WalletsAsync onClose={() => setShowWallets(false)} />
                </React.Suspense>
            )}

            {/* Achievements Panel (lazy) */}
            {showAchievements && (
                <React.Suspense fallback={<div className="fixed inset-0 z-60 flex items-center justify-center">Loading achievements…</div>}>
                    <AchievementsAsync onClose={() => setShowAchievements(false)} />
                </React.Suspense>
            )}

            {/* Market Summary (lazy) */}
            {showMarketSummary && (
                <React.Suspense fallback={<div className="fixed inset-0 z-60 flex items-center justify-center">Loading market summary…</div>}>
                    <MarketSummaryAsync onClose={() => setShowMarketSummary(false)} />
                </React.Suspense>
            )}

            {/* On-chain Transactions (lazy) */}
            {showOnChainTx && (
                <React.Suspense fallback={<div className="fixed inset-0 z-60 flex items-center justify-center">Loading transactions…</div>}>
                    <OnChainTxAsync onClose={() => setShowOnChainTx(false)} />
                </React.Suspense>
            )}

            {/* News Popup */}
            {showNews && selectedStock && (
                <NewsPopup 
                    stock={selectedStock as any}
                    onClose={closeNews}
                />
            )}
        </>
    );
};

export default StockMarketDashboard;
