import React, { useState, useEffect } from "react";
import TradeStockPopup from "./TradeStockPopup.tsx";
import ProcessingLoader from "../common/ProcessingLoader.tsx";
import { stockApi } from "../../../utils/api.ts";
import { balanceManager } from "../../../services/BalanceManager";
import { canisterService } from "../../../services/CanisterService.ts";
import realStockService from "../../../services/RealStockService";

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
    sector?: string;
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

interface StockMarketDashboardProps {
    onClose: () => void;
    playerRupees: number;
    stocks: Stock[];
}

type SortField = "name" | "price" | "marketCap" | "peRatio" | "debtEquity" | "eps" | "growth";
type SortDirection = "asc" | "desc";
type FilterOption = "all" | "undervalued" | "highGrowth" | "lowRisk" | "highRisk";
type TabOption = "market" | "portfolio";

const StockMarketDashboard: React.FC<StockMarketDashboardProps> = ({ onClose, playerRupees, stocks }) => {
    // Core UI state
    const [activeTab, setActiveTab] = useState<TabOption>("market");
    const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
    const [showTrade, setShowTrade] = useState(false);
    const [sortField, setSortField] = useState<SortField>("name");
    const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
    const [filterOption, setFilterOption] = useState<FilterOption>("all");
    const [filteredStocks, setFilteredStocks] = useState<Stock[]>(stocks);
    const [currentRupees, setCurrentRupees] = useState(playerRupees);
    const [portfolio, setPortfolio] = useState<PlayerPortfolio>({ holdings: [], transactionHistory: [] });
    const [isLoading, setIsLoading] = useState(true);
    const [loadingStage, setLoadingStage] = useState("Initializing Market Data");

    // Load portfolio
    useEffect(() => {
        const loadPortfolio = async () => {
            try {
                const response = await stockApi.getPortfolio();
                if (response.success && response.data) {
                    const transformed: PlayerPortfolio = {
                        holdings: response.data.holdings?.map((h: any) => ({
                            stockId: h.symbol,
                            quantity: h.quantity,
                            averagePurchasePrice: h.averagePrice,
                            totalInvestment: h.quantity * h.averagePrice,
                        })) || [],
                        transactionHistory: [],
                    };
                    setPortfolio(transformed);
                }
            } catch (e) {
                console.error("Portfolio load failed", e);
            }
        };
        loadPortfolio();
    }, []);

    // Real stock data load
    useEffect(() => {
        let mounted = true;
        const load = async () => {
            try {
                const initialized = await canisterService.initialize().catch(() => false);
                if (!initialized) {
                    console.warn("Canister not initialized, using fallback stock data");
                    setFilteredStocks(stocks);
                    return;
                }

                const realStocks = await realStockService.initializeRealStocks();
                if (!mounted) return;
                
                if (realStocks && realStocks.length > 0) {
                    const updated = stocks.map(s => {
                        const realStock = realStocks.find(rs => 
                            rs.symbol === s.id.toUpperCase() || 
                            rs.symbol.toLowerCase() === s.id.toLowerCase()
                        );
                        if (realStock) {
                            return {
                                ...s,
                                currentPrice: realStock.price,
                                marketCap: realStock.marketCap,
                                peRatio: realStock.peRatio || s.peRatio,
                                priceHistory: [...s.priceHistory.slice(1), realStock.price],
                                sector: realStock.sector,
                                lastUpdate: Date.now()
                            };
                        }
                        return s;
                    });
                    setFilteredStocks(updated);
                    console.log("Successfully loaded real stock data from ICP canister");
                } else {
                    setFilteredStocks(stocks);
                    console.log("No real stock data available, using fallback");
                }
            } catch (e) {
                console.warn("Real stock load failed, using fallback:", e);
                setFilteredStocks(stocks);
            }
        };
        load();
        return () => { mounted = false; };
    }, [stocks]);

    // Listen for rupee updates
    useEffect(() => {
        const handler = (e: any) => {
            if (e.detail?.rupees !== undefined) setCurrentRupees(e.detail.rupees);
        };
        window.addEventListener("rupee-update", handler as EventListener);
        return () => window.removeEventListener("rupee-update", handler as EventListener);
    }, []);

    // Filtering & sorting
    useEffect(() => {
        let result = [...filteredStocks];
        
        // Apply filter
        if (filterOption !== "all") {
            result = filteredStocks.filter(s => {
                switch (filterOption) {
                    case "undervalued": return s.peRatio < s.industryAvgPE && s.eps > 30;
                    case "highGrowth": return s.businessGrowth > 3;
                    case "lowRisk": return s.debtEquityRatio < 0.8 && s.marketCap > 1_000_000_000;
                    case "highRisk": return s.debtEquityRatio > 1.5 || s.volatility > 2.5;
                    default: return true;
                }
            });
        }
        
        // Apply sort
        result.sort((a, b) => {
            let aVal: number, bVal: number;
            switch (sortField) {
                case "name": return sortDirection === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
                case "price": aVal = a.currentPrice; bVal = b.currentPrice; break;
                case "marketCap": aVal = a.marketCap; bVal = b.marketCap; break;
                case "peRatio": aVal = a.peRatio; bVal = b.peRatio; break;
                case "growth": aVal = a.businessGrowth; bVal = b.businessGrowth; break;
                default: aVal = 0; bVal = 0;
            }
            return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
        });
        
        setFilteredStocks(result);
    }, [sortField, sortDirection, filterOption]);

    // Loading simulation
    useEffect(() => {
        const run = async () => {
            setLoadingStage("Connecting to ICP Canister"); 
            await new Promise(r => setTimeout(r, 900));
            setLoadingStage("Loading CoinGecko Prices"); 
            await new Promise(r => setTimeout(r, 1100));
            setLoadingStage("Converting to Stock Data"); 
            await new Promise(r => setTimeout(r, 800));
            setIsLoading(false);
        }; 
        run();
    }, []);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortDirection("asc");
        }
    };

    const renderSortIndicator = (field: SortField) => {
        if (sortField !== field) return null;
        return (
            <span className="ml-1">
                {sortDirection === "asc" ? "↑" : "↓"}
            </span>
        );
    };

    const calculatePortfolioValue = () => {
        let totalValue = 0;
        let totalInvestment = 0;

        portfolio.holdings.forEach(holding => {
            const stock = filteredStocks.find(s => s.id === holding.stockId);
            if (stock) {
                totalValue += stock.currentPrice * holding.quantity;
                totalInvestment += holding.totalInvestment;
            }
        });

        const totalProfit = totalValue - totalInvestment;
        const profitPercent = totalInvestment > 0 ? (totalProfit / totalInvestment) * 100 : 0;

        return {
            totalValue,
            totalInvestment,
            totalProfit,
            profitPercent,
        };
    };

    const handleBuyStock = async (stockId: string, quantity: number) => {
        const stock = filteredStocks.find(s => s.id === stockId);
        if (!stock) {
            return { success: false, message: "Stock not found" };
        }

        const cost = stock.currentPrice * quantity;
        
        if (cost > currentRupees) {
            return { success: false, message: "Insufficient funds" };
        }

        try {
            const response = await stockApi.buyStock(stock.id, quantity, stock.currentPrice);
            
            if (response.success) {
                balanceManager.processWithdrawal(cost, `Stock purchase: ${stock.name}`);
                setCurrentRupees(prev => prev - cost);
                
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
                
                return {
                    success: true,
                    message: `Successfully bought ${quantity} shares of ${stock.name} for ₹${cost.toLocaleString()}`,
                };
            }
            
            return { success: false, message: response.error || "Purchase failed" };
        } catch (error) {
            console.error("Buy stock error:", error);
            return { success: false, message: "Transaction failed" };
        }
    };

    const handleSellStock = async (stockId: string, quantity: number) => {
        const stock = filteredStocks.find(s => s.id === stockId);
        if (!stock) {
            return { success: false, message: "Stock not found" };
        }

        const holding = portfolio.holdings.find(h => h.stockId === stock.id);
        
        if (!holding || holding.quantity < quantity) {
            return { success: false, message: "Insufficient shares" };
        }

        try {
            const response = await stockApi.sellStock(stock.id, quantity, stock.currentPrice);
            
            if (response.success) {
                const saleValue = stock.currentPrice * quantity;
                balanceManager.updateCash(currentRupees + saleValue);
                setCurrentRupees(prev => prev + saleValue);
                
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
            
            return { success: false, message: response.error || "Sale failed" };
        } catch (error) {
            console.error("Sell stock error:", error);
            return { success: false, message: "Transaction failed" };
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
                                    PORTFOLIO ({portfolio.holdings.length})
                                </button>
                            </div>
                        </div>

                        {/* Main Content */}
                        <div className="flex-1 flex overflow-hidden">
                            {activeTab === "market" ? (
                                <>
                                    {/* Left: Stock List */}
                                    <div className="w-1/2 bg-black border-r border-yellow-600/30 p-6 flex flex-col">
                                        <div className="flex justify-between items-center mb-6">
                                            <h2 className="text-lg font-light text-yellow-500 tracking-wide uppercase" style={{ fontFamily:'VCR OSD Mono, monospace' }}>
                                                Live Stocks
                                            </h2>
                                            <div className="flex space-x-2">
                                                {(['all','undervalued','highGrowth','lowRisk','highRisk'] as FilterOption[]).map(f => (
                                                    <button 
                                                        key={f} 
                                                        onClick={() => setFilterOption(f)} 
                                                        className={`px-3 py-1 text-xs rounded border tracking-wider transition-colors duration-200 ${
                                                            filterOption===f
                                                                ?'bg-yellow-600 text-black border-yellow-600'
                                                                :'bg-black border-gray-600 text-gray-400 hover:border-yellow-500'
                                                        }`} 
                                                        style={{ fontFamily:'VCR OSD Mono, monospace' }}
                                                    >
                                                        {f.toUpperCase()}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center text-xs text-gray-400 mb-4 space-x-4">
                                            <span className="uppercase tracking-wide">Sort by:</span>
                                            {(['name','price','marketCap','peRatio','growth'] as SortField[]).map(sf => (
                                                <button 
                                                    key={sf} 
                                                    onClick={() => handleSort(sf)} 
                                                    className={`flex items-center space-x-1 transition-colors duration-200 ${
                                                        sortField===sf ? 'text-yellow-500' : 'hover:text-yellow-500'
                                                    }`}
                                                >
                                                    <span className="uppercase">{sf}</span>
                                                    {renderSortIndicator(sf)}
                                                </button>
                                            ))}
                                        </div>
                                        
                                        <div className="flex-1 overflow-y-auto space-y-3 pr-2" style={{scrollbarWidth: 'thin', scrollbarColor: '#ca8a04 transparent'}}>
                                            {filteredStocks.map(s => {
                                                const isSel = selectedStock?.id === s.id;
                                                const change = s.priceHistory.length>1 ? ((s.currentPrice - s.priceHistory[s.priceHistory.length-2]) / s.priceHistory[s.priceHistory.length-2]) * 100 : 0;
                                                return (
                                                    <div 
                                                        key={s.id} 
                                                        onClick={() => setSelectedStock(s)} 
                                                        className={`p-4 rounded border cursor-pointer transition-all duration-200 ${
                                                            isSel
                                                                ? 'bg-yellow-600/10 border-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.2)]'
                                                                : 'bg-black border-gray-700 hover:border-yellow-500/50 hover:bg-gray-900/50'
                                                        }`}
                                                    >
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div>
                                                                <h3 className="text-white font-medium leading-none">{s.name}</h3>
                                                                <p className="text-gray-400 text-xs tracking-wider mt-1">{s.id.toUpperCase()}</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="text-white font-medium">₹{s.currentPrice.toFixed(2)}</div>
                                                                <div className={`text-xs font-medium ${change>=0?'text-yellow-500':'text-red-400'}`}>
                                                                    {change>=0?'+':''}{change.toFixed(2)}%
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex justify-between text-xs text-gray-500">
                                                            <span>MCap ₹{(s.marketCap/1_000_000).toFixed(0)}M</span>
                                                            <span>P/E {s.peRatio.toFixed(1)}</span>
                                                            <span>Vol {s.volatility.toFixed(1)}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Right: Stock Details */}
                                    <div className="w-1/2 bg-black p-8 flex flex-col">
                                        {selectedStock ? (
                                            <>
                                                <div className="flex justify-between items-start mb-8 border-b border-yellow-600/20 pb-6">
                                                    <div>
                                                        <h2 className="text-2xl font-light text-yellow-500 mb-2 tracking-wide" style={{ fontFamily:'VCR OSD Mono, monospace' }}>
                                                            {selectedStock.name}
                                                        </h2>
                                                        <p className="text-gray-400 text-sm tracking-wider uppercase">
                                                            {selectedStock.id} • {selectedStock.sector||'Technology'}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-3xl font-light text-white mb-1">₹{selectedStock.currentPrice.toFixed(2)}</div>
                                                        <div className={`text-sm font-medium ${
                                                            selectedStock.priceHistory.length>1 && selectedStock.currentPrice > selectedStock.priceHistory[selectedStock.priceHistory.length-2] 
                                                                ? 'text-yellow-500' : 'text-red-400'
                                                        }`}>
                                                            {selectedStock.priceHistory.length>1
                                                                ? `${selectedStock.currentPrice>selectedStock.priceHistory[selectedStock.priceHistory.length-2]?'+':''}${(((selectedStock.currentPrice-selectedStock.priceHistory[selectedStock.priceHistory.length-2])/selectedStock.priceHistory[selectedStock.priceHistory.length-2])*100).toFixed(2)}%`
                                                                : '0.00%'
                                                            }
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div className="grid grid-cols-2 gap-4 mb-8">
                                                    {[
                                                        { label:'Market Cap', value:`₹${(selectedStock.marketCap/1_000_000).toFixed(0)}M`},
                                                        { label:'P/E Ratio', value:selectedStock.peRatio.toFixed(1)},
                                                        { label:'EPS', value:`₹${selectedStock.eps.toFixed(2)}`},
                                                        { label:'Volatility', value:selectedStock.volatility.toFixed(1)},
                                                    ].map(m => (
                                                        <div key={m.label} className="bg-black border border-gray-700 rounded p-4">
                                                            <div className="text-xs text-gray-400 mb-2 uppercase tracking-wide">{m.label}</div>
                                                            <div className="text-lg font-light text-white">{m.value}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                                
                                                <div className="flex-1 bg-black border border-gray-700 rounded p-4 mb-8">
                                                    <h3 className="text-sm font-medium text-yellow-500 mb-4 tracking-wider uppercase">Price History</h3>
                                                    <div className="h-32 flex items-end space-x-1">
                                                        {selectedStock.priceHistory.map((p,i) => {
                                                            const max = Math.max(...selectedStock.priceHistory); 
                                                            const min = Math.min(...selectedStock.priceHistory); 
                                                            const h = max===min ? 50 : ((p-min)/(max-min))*100+10;
                                                            return (
                                                                <div 
                                                                    key={i} 
                                                                    className="flex-1 bg-yellow-600 rounded-t" 
                                                                    style={{ height:`${h}%`}} 
                                                                    title={`₹${p.toFixed(2)}`} 
                                                                />
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                                
                                                <div className="flex space-x-4">
                                                    <button 
                                                        onClick={() => setShowTrade(true)} 
                                                        className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-black font-medium py-3 rounded transition-colors duration-200" 
                                                        style={{ fontFamily:'VCR OSD Mono, monospace' }}
                                                    >
                                                        BUY
                                                    </button>
                                                    <button 
                                                        onClick={() => setShowTrade(true)} 
                                                        className="flex-1 bg-black border border-gray-600 hover:border-yellow-500 text-white font-medium py-3 rounded transition-colors duration-200" 
                                                        style={{ fontFamily:'VCR OSD Mono, monospace' }}
                                                    >
                                                        SELL
                                                    </button>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex-1 flex items-center justify-center text-center">
                                                <div>
                                                    <div className="w-24 h-24 bg-yellow-600/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                                        <svg className="w-12 h-12 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                                        </svg>
                                                    </div>
                                                    <h3 className="text-xl font-light text-gray-300 mb-2">Select a Stock</h3>
                                                    <p className="text-gray-500">Choose a stock from the list to view details and trade</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                /* Portfolio View */
                                <div className="flex-1 bg-black p-8 overflow-y-auto" style={{scrollbarWidth: 'thin', scrollbarColor: '#ca8a04 transparent'}}>
                                    <div className="mb-8">
                                        <h2 className="text-2xl font-light text-yellow-500 mb-6 tracking-wide" style={{ fontFamily:'VCR OSD Mono, monospace' }}>
                                            YOUR PORTFOLIO
                                        </h2>
                                        
                                        {/* Portfolio Summary */}
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                                            {(() => {
                                                const stats = calculatePortfolioValue();
                                                return [
                                                    { label: 'Total Value', value: `₹${stats.totalValue.toLocaleString()}`, color: 'text-yellow-500' },
                                                    { label: 'Total Investment', value: `₹${stats.totalInvestment.toLocaleString()}`, color: 'text-white' },
                                                    { label: 'Total P&L', value: `₹${stats.totalProfit.toLocaleString()}`, color: stats.totalProfit >= 0 ? 'text-yellow-500' : 'text-red-400' },
                                                    { label: 'Return %', value: `${stats.profitPercent.toFixed(2)}%`, color: stats.profitPercent >= 0 ? 'text-yellow-500' : 'text-red-400' }
                                                ].map(stat => (
                                                    <div key={stat.label} className="bg-black border border-gray-700 rounded p-4">
                                                        <div className="text-xs text-gray-400 mb-2 uppercase tracking-wide">{stat.label}</div>
                                                        <div className={`text-xl font-light ${stat.color}`}>{stat.value}</div>
                                                    </div>
                                                ));
                                            })()}
                                        </div>
                                    </div>

                                    {/* Holdings */}
                                    {portfolio.holdings.length === 0 ? (
                                        <div className="text-center py-16">
                                            <div className="w-24 h-24 bg-yellow-600/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                                <svg className="w-12 h-12 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                                </svg>
                                            </div>
                                            <h3 className="text-xl font-light text-gray-300 mb-2">No Holdings Yet</h3>
                                            <p className="text-gray-500 mb-6">Start trading to build your portfolio</p>
                                            <button 
                                                onClick={() => setActiveTab("market")} 
                                                className="bg-yellow-600 hover:bg-yellow-500 text-black font-medium px-6 py-3 rounded transition-colors duration-200"
                                                style={{ fontFamily:'VCR OSD Mono, monospace' }}
                                            >
                                                EXPLORE MARKET
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {portfolio.holdings.map(holding => {
                                                const stock = filteredStocks.find(s => s.id === holding.stockId);
                                                if (!stock) return null;
                                                
                                                const currentValue = stock.currentPrice * holding.quantity;
                                                const profit = currentValue - holding.totalInvestment;
                                                const profitPercent = (profit / holding.totalInvestment) * 100;
                                                
                                                return (
                                                    <div key={holding.stockId} className="bg-black border border-gray-700 rounded p-6 hover:border-yellow-500/50 transition-colors duration-200">
                                                        <div className="flex justify-between items-start mb-4">
                                                            <div>
                                                                <h3 className="text-white font-medium text-lg">{stock.name}</h3>
                                                                <p className="text-gray-400 text-sm uppercase tracking-wide">{stock.id}</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="text-white font-medium">₹{stock.currentPrice.toFixed(2)}</div>
                                                                <div className="text-sm text-gray-400">{holding.quantity} shares</div>
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                            <div>
                                                                <div className="text-gray-400 uppercase tracking-wide">Avg. Price</div>
                                                                <div className="text-white font-medium">₹{holding.averagePurchasePrice.toFixed(2)}</div>
                                                            </div>
                                                            <div>
                                                                <div className="text-gray-400 uppercase tracking-wide">Invested</div>
                                                                <div className="text-white font-medium">₹{holding.totalInvestment.toLocaleString()}</div>
                                                            </div>
                                                            <div>
                                                                <div className="text-gray-400 uppercase tracking-wide">Current Value</div>
                                                                <div className="text-white font-medium">₹{currentValue.toLocaleString()}</div>
                                                            </div>
                                                            <div>
                                                                <div className="text-gray-400 uppercase tracking-wide">P&L</div>
                                                                <div className={`font-medium ${profit >= 0 ? 'text-yellow-500' : 'text-red-400'}`}>
                                                                    ₹{profit.toLocaleString()} ({profitPercent.toFixed(2)}%)
                                                                </div>
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="flex space-x-3 mt-4 pt-4 border-t border-gray-800">
                                                            <button 
                                                                onClick={() => {
                                                                    setSelectedStock(stock);
                                                                    setShowTrade(true);
                                                                }}
                                                                className="bg-yellow-600 hover:bg-yellow-500 text-black font-medium px-4 py-2 rounded text-sm transition-colors duration-200"
                                                            >
                                                                BUY MORE
                                                            </button>
                                                            <button 
                                                                onClick={() => {
                                                                    setSelectedStock(stock);
                                                                    setShowTrade(true);
                                                                }}
                                                                className="bg-black border border-gray-600 hover:border-yellow-500 text-white font-medium px-4 py-2 rounded text-sm transition-colors duration-200"
                                                            >
                                                                SELL
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

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
        </>
    );
};

export default StockMarketDashboard;
