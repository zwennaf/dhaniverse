import React, { useState, useEffect } from "react";
import StockDetail from "./StockDetail.tsx";
import StockGraph from "./StockGraph.tsx";
import NewsPopup from "./NewsPopup.tsx";
import HelpPanel from "./HelpPanel.tsx";
import TradeStockPopup from "./TradeStockPopup.tsx";
import { stockApi } from "../../../utils/api.ts";
import { balanceManager } from "../../../services/BalanceManager";

interface Stock {
    id: string;
    name: string;
    currentPrice: number;
    priceHistory: number[];
    debtEquityRatio: number;
    businessGrowth: number;
    news: string[];
    marketCap: number;
    peRatio: number;
    eps: number;
    industryAvgPE: number;
    outstandingShares: number;
    volatility: number;
    lastUpdate: number;
}

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

interface MarketStatus {
    isOpen: boolean;
    trend: "bull" | "bear" | "neutral";
    volatility: number;
    nextOpenTime: number;
    nextCloseTime: number;
}

interface StockMarketDashboardProps {
    onClose: () => void;
    playerRupees: number;
    stocks: Stock[];
}

// Sort types for column headers
type SortField =
    | "name"
    | "price"
    | "marketCap"
    | "peRatio"
    | "debtEquity"
    | "eps"
    | "growth";
type SortDirection = "asc" | "desc";

// Filter options
type FilterOption =
    | "all"
    | "undervalued"
    | "highGrowth"
    | "lowRisk"
    | "highRisk";

// Tab options
type TabOption = "market" | "portfolio";

const StockMarketDashboard: React.FC<StockMarketDashboardProps> = ({
    onClose,
    playerRupees,
    stocks,
}) => {
    const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
    const [showGraph, setShowGraph] = useState(false);
    const [showNews, setShowNews] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const [showTrade, setShowTrade] = useState(false);
    const [sortField, setSortField] = useState<SortField>("name");
    const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
    const [filterOption, setFilterOption] = useState<FilterOption>("all");
    const [filteredStocks, setFilteredStocks] = useState<Stock[]>(stocks);
    const [currentRupees, setCurrentRupees] = useState(playerRupees);
    const [activeTab, setActiveTab] = useState<TabOption>("market");
    const [marketStatus, setMarketStatus] = useState<MarketStatus>({
        isOpen: true,
        trend: "neutral",
        volatility: 1.0,
        nextOpenTime: Date.now() + 3600000,
        nextCloseTime: Date.now() + 3600000,
    });

    // Portfolio state
    const [portfolio, setPortfolio] = useState<PlayerPortfolio>({
        holdings: [],
        transactionHistory: [],
    });
    // Load portfolio data from backend API on initial render
    useEffect(() => {
        const loadPortfolio = async () => {
            try {
                const response = await stockApi.getPortfolio();
                if (response.success && response.data) {
                    const backendPortfolio = response.data;
                    const transformedPortfolio: PlayerPortfolio = {
                        holdings:
                            backendPortfolio.holdings?.map((holding: any) => ({
                                stockId: holding.symbol,
                                quantity: holding.quantity,
                                averagePurchasePrice: holding.averagePrice,
                                totalInvestment:
                                    holding.quantity * holding.averagePrice,
                            })) || [],
                        transactionHistory: [],
                    };
                    setPortfolio(transformedPortfolio);
                }
            } catch (error) {
                console.error(
                    "Error loading stock portfolio from backend:",
                    error
                );
            }
        };

        loadPortfolio();
    }, []);

    // Listen for rupee updates from the game
    useEffect(() => {
        const handleRupeeUpdate = (event: CustomEvent) => {
            if (event.detail.rupees !== undefined) {
                console.log(
                    "StockMarketDashboard received rupee update:",
                    event.detail.rupees
                );
                setCurrentRupees(event.detail.rupees);
            }
        };

        // Add event listener
        window.addEventListener(
            "rupee-update",
            handleRupeeUpdate as EventListener
        );

        // Clean up event listener when component unmounts
        return () => {
            window.removeEventListener(
                "rupee-update",
                handleRupeeUpdate as EventListener
            );
        };
    }, []);

    // Apply sorting and filtering whenever related states change
    useEffect(() => {
        let result = [...stocks];

        // Apply filters
        if (filterOption !== "all") {
            result = result.filter((stock) => {
                switch (filterOption) {
                    case "undervalued":
                        return (
                            stock.peRatio < stock.industryAvgPE &&
                            stock.eps > 30
                        );
                    case "highGrowth":
                        return stock.businessGrowth > 3;
                    case "lowRisk":
                        return (
                            stock.debtEquityRatio < 0.8 &&
                            stock.marketCap > 1000000000
                        );
                    case "highRisk":
                        return (
                            stock.debtEquityRatio > 1.5 ||
                            stock.volatility > 2.5
                        );
                    default:
                        return true;
                }
            });
        }

        // Apply sorting
        result.sort((a, b) => {
            let comparison = 0;

            switch (sortField) {
                case "name":
                    comparison = a.name.localeCompare(b.name);
                    break;
                case "price":
                    comparison = a.currentPrice - b.currentPrice;
                    break;
                case "marketCap":
                    comparison = a.marketCap - b.marketCap;
                    break;
                case "peRatio":
                    comparison = a.peRatio - b.peRatio;
                    break;
                case "debtEquity":
                    comparison = a.debtEquityRatio - b.debtEquityRatio;
                    break;
                case "eps":
                    comparison = a.eps - b.eps;
                    break;
                case "growth":
                    comparison = a.businessGrowth - b.businessGrowth;
                    break;
            }

            return sortDirection === "asc" ? comparison : -comparison;
        });

        setFilteredStocks(result);
    }, [stocks, sortField, sortDirection, filterOption]);

    // Handle showing stock graph
    const handleShowGraph = (stock: Stock) => {
        setSelectedStock(stock);
        setShowGraph(true);
        setShowNews(false);
        setShowTrade(false);
    };

    // Handle showing news for a stock
    const handleShowNews = (stock: Stock) => {
        setSelectedStock(stock);
        setShowNews(true);
        setShowGraph(false);
        setShowTrade(false);
    };

    // Handle showing trade UI for a stock
    const handleShowTrade = (stock: Stock) => {
        setSelectedStock(stock);
        setShowTrade(true);
        setShowGraph(false);
        setShowNews(false);
    };

    // Toggle help panel
    const toggleHelp = () => {
        setShowHelp(!showHelp);
        if (!showHelp) {
            setShowGraph(false);
            setShowNews(false);
            setShowTrade(false);
        }
    };

    // Handle sorting when column header is clicked
    const handleSort = (field: SortField) => {
        if (field === sortField) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortDirection("asc");
        }
    };

    // Render sort indicator
    const renderSortIndicator = (field: SortField) => {
        if (sortField !== field) return null;

        return (
            <span className="ml-2">
                {sortDirection === "asc" ? (
                    <svg
                        className="w-4 h-4 inline"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 15l7-7 7 7"
                        />
                    </svg>
                ) : (
                    <svg
                        className="w-4 h-4 inline"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                        />
                    </svg>
                )}
            </span>
        );
    };

    // Handle buying stock using balance manager
    const handleBuyStock = async (stockId: string, quantity: number) => {
        const stock = stocks.find((s) => s.id === stockId);
        if (!stock) {
            return { success: false, message: "Stock not found." };
        }

        if (!marketStatus.isOpen) {
            return {
                success: false,
                message: "Cannot trade while market is closed.",
            };
        }

        try {
            // Use balance manager for transaction processing
            const transaction = balanceManager.processStockBuy(
                stock.name,
                quantity,
                stock.currentPrice,
                "Stock Market"
            );

            // Try to sync with backend
            try {
                const response = await stockApi.buyStock(
                    stockId,
                    quantity,
                    stock.currentPrice,
                    stock.name
                );
                if (!response.success) {
                    console.warn(
                        "Backend stock buy failed, but local transaction completed"
                    );
                }
            } catch (apiError) {
                console.warn("Backend API error during stock buy:", apiError);
                // Continue with local transaction
            }

            // Update portfolio
            const portfolioResponse = await stockApi.getPortfolio();
            if (portfolioResponse.success && portfolioResponse.data) {
                const transformedPortfolio: PlayerPortfolio = {
                    holdings:
                        portfolioResponse.data.holdings?.map(
                            (holding: any) => ({
                                stockId: holding.symbol,
                                quantity: holding.quantity,
                                averagePurchasePrice: holding.averagePrice,
                                totalInvestment:
                                    holding.quantity * holding.averagePrice,
                            })
                        ) || [],
                    transactionHistory: [],
                };
                setPortfolio(transformedPortfolio);
            }

            const totalCost = stock.currentPrice * quantity;
            return {
                success: true,
                message: `Successfully purchased ${quantity} shares of ${
                    stock.name
                } for ₹${totalCost.toLocaleString()}.`,
            };
        } catch (error) {
            console.error("Stock buy error:", error);
            return {
                success: false,
                message:
                    error instanceof Error
                        ? error.message
                        : "Failed to buy stock.",
            };
        }
    };

    // Handle selling stock
    // Handle selling stock using balance manager
    const handleSellStock = async (stockId: string, quantity: number) => {
        const stock = stocks.find((s) => s.id === stockId);
        if (!stock) {
            return { success: false, message: "Stock not found." };
        }

        if (!marketStatus.isOpen) {
            return {
                success: false,
                message: "Cannot trade while market is closed.",
            };
        }

        const holding = portfolio.holdings.find((h) => h.stockId === stockId);

        if (!holding) {
            return {
                success: false,
                message: `You don't own any shares of ${stock.name}.`,
            };
        }

        if (holding.quantity < quantity) {
            return {
                success: false,
                message: `You only have ${holding.quantity} shares of ${stock.name}.`,
            };
        }

        try {
            // Use balance manager for transaction processing
            const transaction = balanceManager.processStockSell(
                stock.name,
                quantity,
                stock.currentPrice,
                "Stock Market"
            );

            // Try to sync with backend
            try {
                const response = await stockApi.sellStock(
                    stockId,
                    quantity,
                    stock.currentPrice
                );
                if (!response.success) {
                    console.warn(
                        "Backend stock sell failed, but local transaction completed"
                    );
                }
            } catch (apiError) {
                console.warn("Backend API error during stock sell:", apiError);
                // Continue with local transaction
            }

            // Update portfolio
            const portfolioResponse = await stockApi.getPortfolio();
            if (portfolioResponse.success && portfolioResponse.data) {
                const transformedPortfolio: PlayerPortfolio = {
                    holdings:
                        portfolioResponse.data.holdings?.map(
                            (holding: any) => ({
                                stockId: holding.symbol,
                                quantity: holding.quantity,
                                averagePurchasePrice: holding.averagePrice,
                                totalInvestment:
                                    holding.quantity * holding.averagePrice,
                            })
                        ) || [],
                    transactionHistory: [],
                };
                setPortfolio(transformedPortfolio);
            }

            const saleValue = stock.currentPrice * quantity;
            const profit = saleValue - holding.averagePurchasePrice * quantity;
            const profitPercent =
                (profit / (holding.averagePurchasePrice * quantity)) * 100;

            const profitMessage =
                profit >= 0
                    ? `with a profit of ₹${profit.toLocaleString()} (${profitPercent.toFixed(
                          2
                      )}%)`
                    : `with a loss of ₹${Math.abs(
                          profit
                      ).toLocaleString()} (${Math.abs(profitPercent).toFixed(
                          2
                      )}%)`;

            return {
                success: true,
                message: `Successfully sold ${quantity} shares of ${
                    stock.name
                } for ₹${saleValue.toLocaleString()} ${profitMessage}.`,
            };
        } catch (error) {
            console.error("Error selling stock:", error);
            return {
                success: false,
                message: "Network error. Please try again.",
            };
        }
    };

    // Calculate portfolio value
    const calculatePortfolioValue = () => {
        let totalValue = 0;
        let totalInvestment = 0;

        portfolio.holdings.forEach((holding) => {
            const stock = stocks.find((s) => s.id === holding.stockId);
            if (stock) {
                totalValue += stock.currentPrice * holding.quantity;
                totalInvestment += holding.totalInvestment;
            }
        });

        const totalProfit = totalValue - totalInvestment;
        const profitPercent =
            totalInvestment > 0 ? (totalProfit / totalInvestment) * 100 : 0;

        return {
            totalValue,
            totalInvestment,
            totalProfit,
            profitPercent,
        };
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-700">
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-green-400 via-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                                <svg
                                    className="w-7 h-7 text-white"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                                    />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-white tracking-tight">
                                    Stock Exchange
                                </h2>
                                <p className="text-sm text-gray-400 font-medium">
                                    Build your wealth • Trade smart
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-3 bg-gray-700/50 rounded-full px-5 py-3 border border-gray-600/50">
                            <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse shadow-sm"></div>
                            <span className="text-sm text-gray-300 font-medium">
                                Balance:
                            </span>
                            <span className="text-xl font-bold text-white">
                                ₹{currentRupees.toLocaleString()}
                            </span>
                        </div>

                        <button
                            onClick={toggleHelp}
                            className="p-3 bg-gray-700/70 rounded-full hover:bg-gray-600 transition-all duration-200 text-gray-300 hover:text-white hover:scale-105 border border-gray-600/50"
                            title="Help & Guide"
                        >
                            <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                        </button>

                        <button
                            onClick={onClose}
                            className="p-3 bg-gray-700/70 rounded-full hover:bg-red-500 transition-all duration-200 text-gray-300 hover:text-white hover:scale-105 border border-gray-600/50"
                            title="Close"
                        >
                            <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="flex border-b border-gray-700">
                    <button
                        onClick={() => setActiveTab("market")}
                        className={`px-6 py-4 font-semibold transition-all duration-200 ${
                            activeTab === "market"
                                ? "text-emerald-400 border-b-2 border-emerald-400 bg-gray-750"
                                : "text-gray-400 hover:text-white hover:bg-gray-750"
                        }`}
                    >
                        <div className="flex items-center space-x-2">
                            <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                                />
                            </svg>
                            <span>Market</span>
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab("portfolio")}
                        className={`px-6 py-4 font-semibold transition-all duration-200 ${
                            activeTab === "portfolio"
                                ? "text-emerald-400 border-b-2 border-emerald-400 bg-gray-750"
                                : "text-gray-400 hover:text-white hover:bg-gray-750"
                        }`}
                    >
                        <div className="flex items-center space-x-2">
                            <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                                />
                            </svg>
                            <span>Portfolio</span>
                            {portfolio.holdings.length > 0 && (
                                <span className="bg-emerald-500 text-white text-xs px-2 py-1 rounded-full">
                                    {portfolio.holdings.length}
                                </span>
                            )}
                        </div>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Market View Tab */}
                    {activeTab === "market" && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center space-x-4">
                                    <h3 className="text-xl font-bold text-white">
                                        Market Overview
                                    </h3>
                                    <div
                                        className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm font-medium ${
                                            marketStatus.isOpen
                                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                                : "bg-red-500/20 text-red-400 border border-red-500/30"
                                        }`}
                                    >
                                        <div
                                            className={`w-2 h-2 rounded-full ${
                                                marketStatus.isOpen
                                                    ? "bg-emerald-400"
                                                    : "bg-red-400"
                                            } animate-pulse`}
                                        ></div>
                                        <span>
                                            Market{" "}
                                            {marketStatus.isOpen
                                                ? "OPEN"
                                                : "CLOSED"}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-4">
                                    <div className="flex items-center space-x-2">
                                        <label className="text-sm text-gray-400 font-medium">
                                            Filter:
                                        </label>
                                        <select
                                            className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                            value={filterOption}
                                            onChange={(e) =>
                                                setFilterOption(
                                                    e.target
                                                        .value as FilterOption
                                                )
                                            }
                                        >
                                            <option value="all">
                                                All Stocks
                                            </option>
                                            <option value="undervalued">
                                                💎 Undervalued
                                            </option>
                                            <option value="highGrowth">
                                                📈 High Growth
                                            </option>
                                            <option value="lowRisk">
                                                🛡️ Low Risk
                                            </option>
                                            <option value="highRisk">
                                                ⚡ High Risk
                                            </option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Modern Stock Table */}
                            <div className="bg-gray-750 rounded-xl overflow-hidden border border-gray-700/50">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="bg-gray-700/50 text-left">
                                                <th
                                                    className="p-4 font-semibold text-gray-300 cursor-pointer hover:bg-gray-600/50 transition-colors"
                                                    onClick={() =>
                                                        handleSort("name")
                                                    }
                                                >
                                                    <div className="flex items-center space-x-1">
                                                        <span>Company</span>
                                                        {renderSortIndicator(
                                                            "name"
                                                        )}
                                                    </div>
                                                </th>
                                                <th
                                                    className="p-4 font-semibold text-gray-300 cursor-pointer hover:bg-gray-600/50 transition-colors"
                                                    onClick={() =>
                                                        handleSort("price")
                                                    }
                                                >
                                                    <div className="flex items-center space-x-1">
                                                        <span>Price</span>
                                                        {renderSortIndicator(
                                                            "price"
                                                        )}
                                                    </div>
                                                </th>
                                                <th
                                                    className="p-4 font-semibold text-gray-300 cursor-pointer hover:bg-gray-600/50 transition-colors"
                                                    onClick={() =>
                                                        handleSort("marketCap")
                                                    }
                                                >
                                                    <div className="flex items-center space-x-1">
                                                        <span>Market Cap</span>
                                                        {renderSortIndicator(
                                                            "marketCap"
                                                        )}
                                                    </div>
                                                </th>
                                                <th
                                                    className="p-4 font-semibold text-gray-300 cursor-pointer hover:bg-gray-600/50 transition-colors"
                                                    onClick={() =>
                                                        handleSort("peRatio")
                                                    }
                                                >
                                                    <div className="flex items-center space-x-1">
                                                        <span>P/E</span>
                                                        {renderSortIndicator(
                                                            "peRatio"
                                                        )}
                                                    </div>
                                                </th>
                                                <th
                                                    className="p-4 font-semibold text-gray-300 cursor-pointer hover:bg-gray-600/50 transition-colors"
                                                    onClick={() =>
                                                        handleSort("growth")
                                                    }
                                                >
                                                    <div className="flex items-center space-x-1">
                                                        <span>Growth</span>
                                                        {renderSortIndicator(
                                                            "growth"
                                                        )}
                                                    </div>
                                                </th>
                                                <th className="p-4 font-semibold text-gray-300">
                                                    Actions
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredStocks.length > 0 ? (
                                                filteredStocks.map(
                                                    (stock, index) => (
                                                        <tr
                                                            key={stock.id}
                                                            className={`border-t border-gray-700/30 hover:bg-gray-700/30 transition-colors ${
                                                                index % 2 === 0
                                                                    ? "bg-gray-800/20"
                                                                    : ""
                                                            }`}
                                                        >
                                                            <td className="p-4">
                                                                <div className="flex items-center space-x-3">
                                                                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                                                                        {stock.name.charAt(
                                                                            0
                                                                        )}
                                                                    </div>
                                                                    <div>
                                                                        <div className="font-semibold text-white">
                                                                            {
                                                                                stock.name
                                                                            }
                                                                        </div>
                                                                        <div className="text-xs text-gray-400">
                                                                            {stock.id.toUpperCase()}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="p-4">
                                                                <div className="font-bold text-lg text-white">
                                                                    ₹
                                                                    {stock.currentPrice.toLocaleString()}
                                                                </div>
                                                                <div className="text-xs text-gray-400">
                                                                    per share
                                                                </div>
                                                            </td>
                                                            <td className="p-4">
                                                                <div className="font-semibold text-white">
                                                                    ₹
                                                                    {(
                                                                        stock.marketCap /
                                                                        1000000
                                                                    ).toFixed(
                                                                        1
                                                                    )}
                                                                    M
                                                                </div>
                                                            </td>
                                                            <td className="p-4">
                                                                <div className="font-semibold text-white">
                                                                    {stock.peRatio.toFixed(
                                                                        2
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="p-4">
                                                                <div
                                                                    className={`font-semibold ${
                                                                        stock.businessGrowth >=
                                                                        0
                                                                            ? "text-emerald-400"
                                                                            : "text-red-400"
                                                                    }`}
                                                                >
                                                                    {stock.businessGrowth >=
                                                                    0
                                                                        ? "+"
                                                                        : ""}
                                                                    {stock.businessGrowth.toFixed(
                                                                        1
                                                                    )}
                                                                    %
                                                                </div>
                                                            </td>
                                                            <td className="p-4">
                                                                <div className="flex items-center space-x-2">
                                                                    <button
                                                                        onClick={() =>
                                                                            handleShowTrade(
                                                                                stock
                                                                            )
                                                                        }
                                                                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors"
                                                                    >
                                                                        Trade
                                                                    </button>
                                                                    <button
                                                                        onClick={() =>
                                                                            handleShowGraph(
                                                                                stock
                                                                            )
                                                                        }
                                                                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
                                                                    >
                                                                        Chart
                                                                    </button>
                                                                    <button
                                                                        onClick={() =>
                                                                            handleShowNews(
                                                                                stock
                                                                            )
                                                                        }
                                                                        className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-xs font-semibold rounded-lg transition-colors"
                                                                    >
                                                                        News
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )
                                                )
                                            ) : (
                                                <tr>
                                                    <td
                                                        colSpan={6}
                                                        className="p-8 text-center text-gray-400"
                                                    >
                                                        <div className="flex flex-col items-center space-y-2">
                                                            <svg
                                                                className="w-12 h-12 text-gray-500"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                viewBox="0 0 24 24"
                                                            >
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    strokeWidth={
                                                                        2
                                                                    }
                                                                    d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.291-1.007-5.824-2.562M15 6.306a7.962 7.962 0 00-6 0M12 4v2.5"
                                                                />
                                                            </svg>
                                                            <span>
                                                                No stocks match
                                                                the selected
                                                                filter
                                                            </span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Portfolio Tab */}
                    {activeTab === "portfolio" && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-bold text-white">
                                    Your Portfolio
                                </h3>

                                {portfolio.holdings.length > 0 && (
                                    <div className="bg-gray-750 rounded-lg p-4 border border-gray-700/50">
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <div className="text-gray-400">
                                                    Total Value
                                                </div>
                                                <div className="text-xl font-bold text-white">
                                                    ₹
                                                    {calculatePortfolioValue().totalValue.toLocaleString()}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-gray-400">
                                                    Total P&L
                                                </div>
                                                <div
                                                    className={`text-xl font-bold ${
                                                        calculatePortfolioValue()
                                                            .totalProfit >= 0
                                                            ? "text-emerald-400"
                                                            : "text-red-400"
                                                    }`}
                                                >
                                                    {calculatePortfolioValue()
                                                        .totalProfit >= 0
                                                        ? "+"
                                                        : ""}
                                                    ₹
                                                    {calculatePortfolioValue().totalProfit.toLocaleString()}
                                                    <span className="text-sm ml-1">
                                                        (
                                                        {calculatePortfolioValue()
                                                            .totalProfit >= 0
                                                            ? "+"
                                                            : ""}
                                                        {calculatePortfolioValue().profitPercent.toFixed(
                                                            2
                                                        )}
                                                        %)
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Holdings */}
                            <div className="bg-gray-750 rounded-xl overflow-hidden border border-gray-700/50">
                                <div className="p-4 bg-gray-700/30 border-b border-gray-700/50">
                                    <h4 className="font-semibold text-white">
                                        Current Holdings
                                    </h4>
                                </div>

                                {portfolio.holdings.length > 0 ? (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="bg-gray-700/20 text-left">
                                                    <th className="p-4 font-semibold text-gray-300">
                                                        Stock
                                                    </th>
                                                    <th className="p-4 font-semibold text-gray-300">
                                                        Quantity
                                                    </th>
                                                    <th className="p-4 font-semibold text-gray-300">
                                                        Avg. Price
                                                    </th>
                                                    <th className="p-4 font-semibold text-gray-300">
                                                        Current Price
                                                    </th>
                                                    <th className="p-4 font-semibold text-gray-300">
                                                        Value
                                                    </th>
                                                    <th className="p-4 font-semibold text-gray-300">
                                                        P&L
                                                    </th>
                                                    <th className="p-4 font-semibold text-gray-300">
                                                        Actions
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {portfolio.holdings.map(
                                                    (holding, index) => {
                                                        const stock =
                                                            stocks.find(
                                                                (s) =>
                                                                    s.id ===
                                                                    holding.stockId
                                                            );
                                                        if (!stock) return null;

                                                        const currentValue =
                                                            stock.currentPrice *
                                                            holding.quantity;
                                                        const profit =
                                                            currentValue -
                                                            holding.totalInvestment;
                                                        const profitPercent =
                                                            (profit /
                                                                holding.totalInvestment) *
                                                            100;

                                                        return (
                                                            <tr
                                                                key={
                                                                    holding.stockId
                                                                }
                                                                className={`border-t border-gray-700/30 hover:bg-gray-700/20 transition-colors ${
                                                                    index %
                                                                        2 ===
                                                                    0
                                                                        ? "bg-gray-800/10"
                                                                        : ""
                                                                }`}
                                                            >
                                                                <td className="p-4">
                                                                    <div className="flex items-center space-x-3">
                                                                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">
                                                                            {stock.name.charAt(
                                                                                0
                                                                            )}
                                                                        </div>
                                                                        <div>
                                                                            <div className="font-semibold text-white">
                                                                                {
                                                                                    stock.name
                                                                                }
                                                                            </div>
                                                                            <div className="text-xs text-gray-400">
                                                                                {stock.id.toUpperCase()}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="p-4">
                                                                    <div className="font-semibold text-white">
                                                                        {
                                                                            holding.quantity
                                                                        }
                                                                    </div>
                                                                    <div className="text-xs text-gray-400">
                                                                        shares
                                                                    </div>
                                                                </td>
                                                                <td className="p-4">
                                                                    <div className="font-semibold text-white">
                                                                        ₹
                                                                        {holding.averagePurchasePrice.toFixed(
                                                                            2
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td className="p-4">
                                                                    <div className="font-semibold text-white">
                                                                        ₹
                                                                        {stock.currentPrice.toLocaleString()}
                                                                    </div>
                                                                </td>
                                                                <td className="p-4">
                                                                    <div className="font-bold text-white">
                                                                        ₹
                                                                        {currentValue.toLocaleString()}
                                                                    </div>
                                                                </td>
                                                                <td className="p-4">
                                                                    <div
                                                                        className={`font-semibold ${
                                                                            profit >=
                                                                            0
                                                                                ? "text-emerald-400"
                                                                                : "text-red-400"
                                                                        }`}
                                                                    >
                                                                        {profit >=
                                                                        0
                                                                            ? "+"
                                                                            : ""}
                                                                        ₹
                                                                        {profit.toLocaleString()}
                                                                    </div>
                                                                    <div
                                                                        className={`text-xs ${
                                                                            profit >=
                                                                            0
                                                                                ? "text-emerald-400"
                                                                                : "text-red-400"
                                                                        }`}
                                                                    >
                                                                        (
                                                                        {profit >=
                                                                        0
                                                                            ? "+"
                                                                            : ""}
                                                                        {profitPercent.toFixed(
                                                                            2
                                                                        )}
                                                                        %)
                                                                    </div>
                                                                </td>
                                                                <td className="p-4">
                                                                    <div className="flex items-center space-x-2">
                                                                        <button
                                                                            onClick={() =>
                                                                                handleShowTrade(
                                                                                    stock
                                                                                )
                                                                            }
                                                                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors"
                                                                        >
                                                                            Trade
                                                                        </button>
                                                                        <button
                                                                            onClick={() =>
                                                                                handleShowGraph(
                                                                                    stock
                                                                                )
                                                                            }
                                                                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
                                                                        >
                                                                            Chart
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    }
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="p-8 text-center">
                                        <div className="flex flex-col items-center space-y-4">
                                            <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center">
                                                <svg
                                                    className="w-8 h-8 text-gray-500"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                                                    />
                                                </svg>
                                            </div>
                                            <div className="text-gray-400">
                                                <div className="font-semibold mb-1">
                                                    No investments yet
                                                </div>
                                                <div className="text-sm">
                                                    Start building your
                                                    portfolio by trading on the
                                                    Market tab!
                                                </div>
                                            </div>
                                            <button
                                                onClick={() =>
                                                    setActiveTab("market")
                                                }
                                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors"
                                            >
                                                Explore Market
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Popups */}
            {showGraph && selectedStock && (
                <StockGraph
                    stock={selectedStock}
                    onClose={() => setShowGraph(false)}
                />
            )}

            {showNews && selectedStock && (
                <NewsPopup
                    stock={selectedStock}
                    onClose={() => setShowNews(false)}
                />
            )}

            {showTrade && selectedStock && (
                <TradeStockPopup
                    stock={selectedStock}
                    playerRupees={currentRupees}
                    holdings={portfolio.holdings}
                    onBuy={handleBuyStock}
                    onSell={handleSellStock}
                    onClose={() => setShowTrade(false)}
                />
            )}

            {showHelp && <HelpPanel onClose={() => setShowHelp(false)} />}
        </div>
    );
};

export default StockMarketDashboard;
