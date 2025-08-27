import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import TradeStockPopup from "./TradeStockPopup.tsx";
import StockDetail from "./StockDetail.tsx";
import StockGraph from "./StockGraph.tsx";
import StockLeaderboard from "./StockLeaderboard.tsx";
import NewsPopup from "./NewsPopup.tsx";
import ProcessingLoader from "../common/ProcessingLoader.tsx";
import { stockApi } from "../../../utils/api.ts";
import { balanceManager } from "../../../services/BalanceManager";
import { stockMarketService, type Stock } from "../../../services/StockMarketService";
import { ICPActorService } from "../../../services/ICPActorService";
import { WalletManager } from "../../../services/WalletManager";

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
}

type SortField = "name" | "currentPrice" | "sector" | "marketCap" | "peRatio";
type SortDirection = "asc" | "desc";
type FilterOption = "all" | "technology" | "finance" | "healthcare" | "consumer" | "energy" | "cryptocurrency";
type TabOption = "market" | "portfolio";
type ViewMode = "cards" | "table";

const StockMarketDashboard: React.FC<StockMarketDashboardProps> = ({ onClose, playerRupees }) => {
    // Auth context for Internet Identity persistence
    const { user, isSignedIn, refreshAuth } = useAuth();

    // Services
    const icpService = new ICPActorService();
    const walletManager = new WalletManager();
    
    // Core UI state
    const [activeTab, setActiveTab] = useState<TabOption>("market");
    const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
    const [showTrade, setShowTrade] = useState(false);
    const [showDetail, setShowDetail] = useState(false);
    const [showGraph, setShowGraph] = useState(false);
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [showNews, setShowNews] = useState(false);
    const [sortField, setSortField] = useState<SortField>("name");
    const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
    const [filterOption, setFilterOption] = useState<FilterOption>("all");
    const [filteredStocks, setFilteredStocks] = useState<Stock[]>([]);
    const [currentRupees, setCurrentRupees] = useState(playerRupees);
    const [portfolio, setPortfolio] = useState<PlayerPortfolio>({ holdings: [], transactionHistory: [] });
    const [isLoading, setIsLoading] = useState(true);
    const [loadingStage, setLoadingStage] = useState("Loading Stock Market Data");
    const [viewMode, setViewMode] = useState<ViewMode>("cards");

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

    // Load portfolio
    useEffect(() => {
        const loadPortfolio = async () => {
            try {
                const response = await stockApi.getPortfolio();
                console.log('Initial portfolio load response:', response);
                if (response.success && response.data) {
                    console.log('Initial portfolio holdings data:', response.data.holdings);
                    const transformed: PlayerPortfolio = {
                        holdings: response.data.holdings?.map((h: any) => ({
                            stockId: h.symbol.toLowerCase(), // Convert to lowercase to match stock IDs
                            quantity: h.quantity,
                            averagePurchasePrice: h.averagePrice,
                            totalInvestment: h.quantity * h.averagePrice,
                        })) || [],
                        transactionHistory: [],
                    };
                    console.log('Initial transformed portfolio:', transformed);
                    setPortfolio(transformed);
                }
            } catch (e) {
                console.error("Portfolio load failed", e);
            }
        };
        loadPortfolio();
    }, []);

    // Load real stocks data
    useEffect(() => {
        let mounted = true;
        const load = async () => {
            try {
                setLoadingStage("Loading Real Stock Market Data from ICP Canister");
                
                // Initialize real stock data if not already done
                if (!stockMarketService.isServiceInitialized()) {
                    await stockMarketService.initialize();
                }
                
                const allStocks = stockMarketService.getStockMarketData();
                if (!mounted) return;
                
                if (allStocks && allStocks.length > 0) {
                    setFilteredStocks(allStocks);
                    console.log(`✅ Successfully loaded ${allStocks.length} REAL stocks from ICP canister:`, 
                        allStocks.map((s: Stock) => `${s.name} (₹${s.currentPrice.toLocaleString()})`));
                } else {
                    console.warn("❌ No real stocks loaded from canister");
                }
            } catch (e) {
                console.error("❌ Failed to load real stocks from ICP canister:", e);
            } finally {
                setIsLoading(false);
            }
        };
        load();
        return () => { mounted = false; };
    }, []);

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
                stockId: stockId.toUpperCase(),
                quantity,
                price: stock.currentPrice,
                name: stock.name,
                totalCost
            });

            const response = await stockApi.buyStock(
                stockId.toUpperCase(),
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
            const response = await stockApi.sellStock(stockId.toUpperCase(), quantity, stock.currentPrice);

            if (response.success) {
                const saleValue = stock.currentPrice * quantity;
                
                // Update balance
                const newBalance = currentRupees + saleValue;
                setCurrentRupees(newBalance);
                balanceManager.updateCash(newBalance);
                
                // Update portfolio
                const portfolioResponse = await stockApi.getPortfolio();
                if (portfolioResponse.success && portfolioResponse.data) {
                    const transformedPortfolio: PlayerPortfolio = {
                        holdings: portfolioResponse.data.holdings?.map((holding: any) => ({
                            stockId: holding.symbol,
                            quantity: holding.quantity,
                            averagePurchasePrice: holding.averagePrice,
                            totalInvestment: holding.quantity * holding.averagePrice,
                        })) || [],
                        transactionHistory: [],
                    };
                    setPortfolio(transformedPortfolio);
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
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-400 uppercase tracking-wide">Portfolio Value</p>
                                        <p className="text-xl font-light text-yellow-500">₹{calculatePortfolioValue().totalValue.toLocaleString()}</p>
                                    </div>
                                    <button 
                                        onClick={openLeaderboard}
                                        className="bg-purple-600 text-white px-4 py-2 rounded font-medium hover:bg-purple-500 transition-colors duration-200"
                                    >
                                        LEADERBOARD
                                    </button>
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
                        <div className="flex-1 overflow-hidden flex flex-col">
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
                                    <div className="mb-6">
                                        <div className="grid grid-cols-4 gap-4">
                                            <div className="bg-gray-900/50 p-4 rounded-lg">
                                                <p className="text-gray-400 text-sm">Total Value</p>
                                                <p className="text-2xl font-light text-yellow-500">₹{calculatePortfolioValue().totalValue.toLocaleString()}</p>
                                            </div>
                                            <div className="bg-gray-900/50 p-4 rounded-lg">
                                                <p className="text-gray-400 text-sm">Total Investment</p>
                                                <p className="text-2xl font-light text-white">₹{calculatePortfolioValue().totalInvestment.toLocaleString()}</p>
                                            </div>
                                            <div className="bg-gray-900/50 p-4 rounded-lg">
                                                <p className="text-gray-400 text-sm">Profit/Loss</p>
                                                <p className={`text-2xl font-light ${calculatePortfolioValue().profitLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                    ₹{calculatePortfolioValue().profitLoss.toLocaleString()}
                                                </p>
                                            </div>
                                            <div className="bg-gray-900/50 p-4 rounded-lg">
                                                <p className="text-gray-400 text-sm">P/L Percentage</p>
                                                <p className={`text-2xl font-light ${calculatePortfolioValue().profitLossPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                    {calculatePortfolioValue().profitLossPercent.toFixed(2)}%
                                                </p>
                                            </div>
                                        </div>
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
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Trade Popup */}
            {showTrade && selectedStock && (
                <TradeStockPopup
                    stock={selectedStock}
                    onClose={closeTrade}
                    onBuy={handleBuyStock}
                    onSell={handleSellStock}
                    playerRupees={currentRupees}
                    holdings={portfolio.holdings}
                />
            )}

            {/* Stock Detail Popup */}
            {showDetail && selectedStock && (
                <StockDetail 
                    stock={selectedStock}
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
                    stock={selectedStock}
                    onClose={closeGraph}
                />
            )}

            {/* Leaderboard Popup */}
            {showLeaderboard && (
                <StockLeaderboard 
                    icpService={icpService}
                    onClose={closeLeaderboard}
                />
            )}

            {/* News Popup */}
            {showNews && selectedStock && (
                <NewsPopup 
                    stock={selectedStock}
                    onClose={closeNews}
                />
            )}
        </>
    );
};

export default StockMarketDashboard;
