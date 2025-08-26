import React, { useState, useEffect } from "react";
// Core popups still supported (kept minimal)
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

const StockMarketDashboard: React.FC<StockMarketDashboardProps> = ({ onClose, playerRupees, stocks }) => {
    // Core UI state
    const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
    const [showTrade, setShowTrade] = useState(false);
    const [sortField, setSortField] = useState<SortField>("name");
    const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
    const [filterOption, setFilterOption] = useState<FilterOption>("all");
    const [filteredStocks, setFilteredStocks] = useState<Stock[]>(stocks);
    const [currentRupees, setCurrentRupees] = useState(playerRupees);
    const [marketStatus] = useState<MarketStatus>({
        isOpen: true,
        trend: "neutral",
        volatility: 1.0,
        nextOpenTime: Date.now() + 3600000,
        nextCloseTime: Date.now() + 3600000,
    });

    // Portfolio
    const [portfolio, setPortfolio] = useState<PlayerPortfolio>({ holdings: [], transactionHistory: [] });
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

    // Real stock data load & merge using ICP canister CoinGecko integration
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

                // Use updated RealStockService with ICP canister CoinGecko integration
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
                    console.log("Successfully loaded real stock data from ICP canister CoinGecko integration");
                } else {
                    // Fallback to original stocks if no real data available
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

    // Listen for rupee updates from game
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
        // Rebase from original stocks when filters change
        if (filterOption === "all") result = [...filteredStocks];
        else {
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
        result.sort((a,b) => {
            const dir = sortDirection === "asc" ? 1 : -1;
            switch (sortField) {
                case "name": return dir * a.name.localeCompare(b.name);
                case "price": return dir * (a.currentPrice - b.currentPrice);
                case "marketCap": return dir * (a.marketCap - b.marketCap);
                case "peRatio": return dir * (a.peRatio - b.peRatio);
                case "debtEquity": return dir * (a.debtEquityRatio - b.debtEquityRatio);
                case "eps": return dir * (a.eps - b.eps);
                case "growth": return dir * (a.businessGrowth - b.businessGrowth);
            }
            return 0;
        });
        setFilteredStocks(result);
    }, [filterOption, sortField, sortDirection]);

    const handleShowTrade = (stock: Stock) => { setSelectedStock(stock); setShowTrade(true); };

    const handleSort = (field: SortField) => {
        if (field === sortField) setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        else { setSortField(field); setSortDirection("asc"); }
    };
    const renderSortIndicator = (field: SortField) => sortField === field ? (
        <span className="ml-1">{sortDirection === "asc" ? "▲" : "▼"}</span>
    ) : null;

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

    // Loading experience
    const [isLoading, setIsLoading] = useState(true);
    const [loadingStage, setLoadingStage] = useState("Initializing Market Data");
    useEffect(() => {
        const run = async () => {
            setLoadingStage("Connecting to ICP Canister"); await new Promise(r=>setTimeout(r,900));
            setLoadingStage("Loading CoinGecko Prices"); await new Promise(r=>setTimeout(r,1100));
            setLoadingStage("Converting to Stock Data"); await new Promise(r=>setTimeout(r,800));
            setIsLoading(false);
        }; run();
    }, []);

    return (
        <>
            <div className="fixed inset-0 bg-black z-50 flex flex-col">
                {/* Loading Layer */}
                {isLoading && (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <div className="mb-8">
                                <h1 className="text-4xl font-bold text-dhani-gold mb-2" style={{ fontFamily:'VCR OSD Mono, monospace' }}>DHANIVERSE EXCHANGE</h1>
                                <div className="w-24 h-1 bg-dhani-gold mx-auto rounded" />
                            </div>
                            <ProcessingLoader text={loadingStage} className="mt-8" />
                        </div>
                    </div>
                )}

                {!isLoading && (
                    <>
                        {/* Header */}
                        <div className="bg-gradient-to-r from-black via-gray-900 to-black border-b border-dhani-gold/30 p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <div className="w-12 h-12 bg-dhani-gold rounded-lg flex items-center justify-center">
                                        <svg className="w-7 h-7 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
                                    </div>
                                    <div>
                                        <h1 className="text-2xl font-bold text-dhani-gold" style={{ fontFamily:'VCR OSD Mono, monospace' }}>DHANIVERSE EXCHANGE</h1>
                                        <p className="text-gray-400 text-xs tracking-wider">REAL-TIME STOCK TRADING</p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-6">
                                    <div className="flex items-center space-x-2 text-sm">
                                        <div className={`w-3 h-3 rounded-full ${marketStatus.isOpen ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                                        <span className="text-white font-bold">{marketStatus.isOpen ? 'OPEN' : 'CLOSED'}</span>
                                    </div>
                                    <div className="bg-black/50 border border-dhani-gold/30 rounded-lg px-4 py-2">
                                        <div className="text-[10px] text-gray-400 uppercase mb-1">Balance</div>
                                        <div className="text-xl font-bold text-dhani-gold">₹{currentRupees.toLocaleString()}</div>
                                    </div>
                                    <button onClick={onClose} className="w-10 h-10 bg-red-600/20 border border-red-500/30 rounded-lg flex items-center justify-center hover:bg-red-600/30 transition-colors">
                                        <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 flex overflow-hidden">
                            {/* Left: Stock List */}
                            <div className="w-1/2 flex flex-col bg-gradient-to-b from-gray-900 to-black border-r border-dhani-gold/30 p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-bold text-dhani-gold" style={{ fontFamily:'VCR OSD Mono, monospace' }}>LIVE STOCKS</h2>
                                    <div className="flex space-x-2">
                                        {(['all','undervalued','highGrowth','lowRisk','highRisk'] as FilterOption[]).map(f => (
                                            <button key={f} onClick={() => setFilterOption(f)} className={`px-2 py-1 text-[10px] rounded border tracking-wider ${filterOption===f?'bg-dhani-gold text-black border-dhani-gold':'bg-black/40 text-gray-400 border-gray-700 hover:border-dhani-gold/40'}`} style={{ fontFamily:'VCR OSD Mono, monospace' }}>{f.toUpperCase()}</button>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center text-xs text-gray-500 mb-2">
                                    <span className="mr-2">SORT:</span>
                                    {(['name','price','marketCap','peRatio','growth'] as SortField[]).map(sf => (
                                        <button key={sf} onClick={() => handleSort(sf)} className={`mr-3 last:mr-0 flex items-center ${sortField===sf?'text-dhani-gold':'hover:text-dhani-gold'}`}>{sf.toUpperCase()}{renderSortIndicator(sf)}</button>
                                    ))}
                                </div>
                                <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scroll">
                                    {filteredStocks.map(s => {
                                        const isSel = selectedStock?.id === s.id;
                                        const change = s.priceHistory.length>1 ? ((s.currentPrice - s.priceHistory[s.priceHistory.length-2]) / s.priceHistory[s.priceHistory.length-2]) * 100 : 0;
                                        return (
                                            <div key={s.id} onClick={() => setSelectedStock(s)} className={`p-4 rounded-lg border cursor-pointer transition-all group ${isSel?'bg-dhani-gold/10 border-dhani-gold shadow-[0_0_10px_rgba(255,215,0,0.2)]':'bg-black/30 border-gray-700 hover:border-dhani-gold/50 hover:bg-black/60'}`}>
                                                <div className="flex justify-between items-start mb-1">
                                                    <div>
                                                        <h3 className="text-white font-semibold leading-none">{s.name}</h3>
                                                        <p className="text-gray-500 text-[11px] tracking-wider">{s.id.toUpperCase()}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-white font-bold text-sm">₹{s.currentPrice.toFixed(2)}</div>
                                                        <div className={`text-[11px] font-medium ${change>=0?'text-green-400':'text-red-400'}`}>{change>=0?'+':''}{change.toFixed(2)}%</div>
                                                    </div>
                                                </div>
                                                <div className="flex justify-between text-[10px] text-gray-500 tracking-wide">
                                                    <span>MCap ₹{(s.marketCap/1_000_000).toFixed(0)}M</span>
                                                    <span>P/E {s.peRatio.toFixed(1)}</span>
                                                    <span>VOL {s.volatility.toFixed(1)}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Right: Details */}
                            <div className="w-1/2 bg-gradient-to-b from-black to-gray-900 p-8 flex flex-col">
                                {selectedStock ? (
                                    <>
                                        <div className="flex justify-between items-start mb-6">
                                            <div>
                                                <h2 className="text-2xl font-bold text-dhani-gold mb-1" style={{ fontFamily:'VCR OSD Mono, monospace' }}>{selectedStock.name}</h2>
                                                <p className="text-gray-500 text-sm tracking-wider">{selectedStock.id.toUpperCase()} • {selectedStock.sector||'SECTOR'}</p>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-3xl font-bold text-white mb-1">₹{selectedStock.currentPrice.toFixed(2)}</div>
                                                <div className={`text-sm font-semibold ${selectedStock.priceHistory.length>1 && selectedStock.currentPrice > selectedStock.priceHistory[selectedStock.priceHistory.length-2] ? 'text-green-400':'text-red-400'}`}>{selectedStock.priceHistory.length>1?`${selectedStock.currentPrice>selectedStock.priceHistory[selectedStock.priceHistory.length-2]?'+':''}${(((selectedStock.currentPrice-selectedStock.priceHistory[selectedStock.priceHistory.length-2])/selectedStock.priceHistory[selectedStock.priceHistory.length-2])*100).toFixed(2)}%`:'0.00%'}</div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 mb-6">
                                            {[
                                                { label:'Market Cap', value:`₹${(selectedStock.marketCap/1_000_000).toFixed(0)}M`},
                                                { label:'P/E Ratio', value:selectedStock.peRatio.toFixed(1)},
                                                { label:'EPS', value:`₹${selectedStock.eps.toFixed(2)}`},
                                                { label:'Volatility', value:selectedStock.volatility.toFixed(1)},
                                            ].map(m => (
                                                <div key={m.label} className="bg-black/30 border border-gray-700 rounded-lg p-4">
                                                    <div className="text-[10px] text-gray-400 mb-1 tracking-wider">{m.label.toUpperCase()}</div>
                                                    <div className="text-lg font-bold text-white">{m.value}</div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex-1 bg-black/30 border border-gray-700 rounded-lg p-4 mb-6">
                                            <h3 className="text-sm font-bold text-dhani-gold mb-3 tracking-wider">PRICE HISTORY</h3>
                                            <div className="h-32 flex items-end space-x-1">
                                                {selectedStock.priceHistory.map((p,i) => {
                                                    const max = Math.max(...selectedStock.priceHistory); const min = Math.min(...selectedStock.priceHistory); const h = max===min?50:((p-min)/(max-min))*100+10;
                                                    return <div key={i} className="flex-1 bg-dhani-gold rounded-t" style={{ height:`${h}%`}} title={`₹${p.toFixed(2)}`} />;
                                                })}
                                            </div>
                                        </div>
                                        <div className="flex space-x-4">
                                            <button onClick={() => setShowTrade(true)} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-colors" style={{ fontFamily:'VCR OSD Mono, monospace' }}>BUY</button>
                                            <button onClick={() => setShowTrade(true)} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors" style={{ fontFamily:'VCR OSD Mono, monospace' }}>SELL</button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex-1 flex items-center justify-center text-center text-gray-500">
                                        <div>
                                            <div className="w-24 h-24 bg-dhani-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <svg className="w-12 h-12 text-dhani-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                                            </div>
                                            <h3 className="text-xl text-gray-300 mb-2">Select a Stock</h3>
                                            <p className="text-gray-500">Choose a stock from the list to view details & trade</p>
                                        </div>
                                    </div>
                                )}
                            </div>
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
