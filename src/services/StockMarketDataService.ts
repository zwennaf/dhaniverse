/**
 * StockMarketDataService - Single Batch Call for Complete Market Data
 * 
 * This service fetches ALL stock market data using REAL prices from CoinGecko.
 * NO FALLBACK PRICES - Always uses l        } catch (error) {
            console.error('❌ Failed to fetch market data from canister:', error);
            
            // Try CoinGecko as fallback
            try {
                const fallbackResponse = await this.getFallbackData();
                this.notifyPendingCallbacks(fallbackResponse);
                return fallbackResponse;
            } catch (fallbackError) {
                console.error('❌ Fallback also failed:', fallbackError);
                const emptyResponse: MarketDataResponse = {
                    success: false,
                    stocks: [],
                    timestamp: Date.now(),
                    source: 'fallback',
                    error: 'All data sources failed'
                };
                this.notifyPendingCallbacks(emptyResponse);
                return emptyResponse;
            }

        } finally {
            this.isFetching = false;
        }
    }ata.
 * 
 * Architecture:
 * - Primary: CoinGecko API for real cryptocurrency prices
 * - Secondary: ICP Canister for traditional stocks (if needed)
 * - Mock data: News, graphs, and metrics (until real sources available)
 * - Cached: 5 minutes for optimal performance
 * - Format: Ready for StockDetail.tsx and StockGraph.tsx
 * 
 * @author Dhaniverse Team
 * @date 2025-10-05
 */

import { canisterService } from './CanisterService';
import { coinGeckoService } from './CoinGeckoService';
import { convertUsdToInr } from '../utils/currencyConversion';

// ============================================================================
// TYPES - Matches Rust canister types exactly
// ============================================================================

export interface StockPrice {
    timestamp: bigint;
    price: number;
    volume: bigint;
    high: number;
    low: number;
    open: number;
    close: number;
}

export interface StockMetrics {
    market_cap: number;
    pe_ratio: number;
    eps: number;
    debt_equity_ratio: number;
    business_growth: number;
    industry_avg_pe: number;
    outstanding_shares: bigint;
    volatility: number;
}

export interface CanisterStock {
    id: string;
    name: string;
    symbol: string;
    current_price: number;
    price_history: StockPrice[];
    metrics: StockMetrics;
    news: string[];
    last_update: bigint;
}

// UI-friendly format for components
export interface UIStock {
    id: string;
    symbol: string; // Stock symbol (same as id)
    name: string;
    currentPrice: number;
    priceHistory: number[]; // Simplified for graph
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
    sector?: string; // Stock sector (technology, finance, etc.)
}

export interface MarketDataResponse {
    success: boolean;
    stocks: UIStock[];
    timestamp: number;
    source: 'canister' | 'cache' | 'fallback';
    error?: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
    CACHE_TTL: 5 * 60 * 1000, // 5 minutes
    STORAGE_KEY: 'dhaniverse_market_data',
    // Default crypto stocks to show (all from CoinGecko)
    DEFAULT_STOCKS: [
        'BTC', 'ETH', 'SOL', 'BNB', 'ADA',
        'AVAX', 'DOT', 'MATIC', 'LINK', 'UNI',
        'LTC', 'ICP', 'XRP', 'ATOM', 'ALGO'
    ]
} as const;

// ============================================================================
// STOCK MARKET DATA SERVICE
// ============================================================================

class StockMarketDataService {
    private cache: MarketDataResponse | null = null;
    private cacheTimestamp: number = 0;
    private isFetching: boolean = false;
    private pendingCallbacks: Array<(data: MarketDataResponse) => void> = [];

    constructor() {
        this.loadFromStorage();
        console.log('📊 StockMarketDataService initialized - ONE CALL architecture');
    }

    // ========================================================================
    // PUBLIC API - THE ONLY METHOD YOU NEED
    // ========================================================================

    /**
     * Get complete market data for ALL stocks in ONE call
     * Returns cached data if fresh (< 5 min old), otherwise fetches from canister
     */
    async getCompleteMarketData(forceRefresh = false): Promise<MarketDataResponse> {
        // Check cache first
        if (!forceRefresh && this.isCacheValid()) {
            console.log('✅ Market data from cache');
            return this.cache!;
        }

        // If already fetching, wait for that call to complete
        if (this.isFetching) {
            console.log('⏳ Market data fetch in progress, waiting...');
            return new Promise((resolve) => {
                this.pendingCallbacks.push(resolve);
            });
        }

        // Fetch fresh data
        return this.fetchMarketData();
    }

    /**
     * Clear cache and force refresh on next call
     */
    clearCache(): void {
        this.cache = null;
        this.cacheTimestamp = 0;
        localStorage.removeItem(CONFIG.STORAGE_KEY);
        console.log('🗑️ Market data cache cleared');
    }

    /**
     * Get cache status
     */
    getCacheStatus() {
        return {
            isCached: this.cache !== null,
            cacheAge: this.cache ? Date.now() - this.cacheTimestamp : 0,
            isValid: this.isCacheValid(),
            stockCount: this.cache?.stocks.length || 0,
            source: this.cache?.source || 'none'
        };
    }

    // ========================================================================
    // PRIVATE METHODS
    // ========================================================================

    private async fetchMarketData(): Promise<MarketDataResponse> {
        this.isFetching = true;

        try {
            console.log('🔄 Fetching complete market data from canister...');
            
            // ONE CALL to get all stocks
            const result = await canisterService.getMarketSummary();
            
            if (result && typeof result === 'object') {
                // Convert HashMap<String, Stock> to array
                const stocks = Object.entries(result).map(([symbol, stock]) => 
                    this.convertToUIFormat(stock as any)
                );

                const response: MarketDataResponse = {
                    success: true,
                    stocks,
                    timestamp: Date.now(),
                    source: 'canister'
                };

                this.updateCache(response);
                this.notifyPendingCallbacks(response);

                console.log(`✅ Fetched ${stocks.length} stocks from canister in ONE call`);
                return response;
            }

            throw new Error('Invalid response from canister');

        } catch (error) {
            console.error('❌ Failed to fetch market data from canister:', error);
            
            // Try CoinGecko as fallback
            try {
                const fallbackResponse = await this.getFallbackData();
                this.notifyPendingCallbacks(fallbackResponse);
                return fallbackResponse;
            } catch (fallbackError) {
                console.error('❌ Fallback also failed:', fallbackError);
                const emptyResponse: MarketDataResponse = {
                    success: false,
                    stocks: [],
                    timestamp: Date.now(),
                    source: 'fallback',
                    error: 'All data sources failed'
                };
                this.notifyPendingCallbacks(emptyResponse);
                return emptyResponse;
            }

        } finally {
            this.isFetching = false;
        }
    }

    private convertToUIFormat(canisterStock: CanisterStock): UIStock {
        const symbol = canisterStock.symbol || canisterStock.id;
        
        // Convert all USD prices to INR (1 USD = 83 INR)
        const currentPriceInr = convertUsdToInr(canisterStock.current_price);
        const priceHistoryInr = canisterStock.price_history.map(p => convertUsdToInr(p.close));
        const marketCapInr = convertUsdToInr(canisterStock.metrics.market_cap);
        const epsInr = convertUsdToInr(canisterStock.metrics.eps);
        
        return {
            id: symbol,
            symbol: symbol,
            name: canisterStock.name,
            currentPrice: currentPriceInr,
            priceHistory: priceHistoryInr,
            debtEquityRatio: canisterStock.metrics.debt_equity_ratio,
            businessGrowth: canisterStock.metrics.business_growth,
            news: canisterStock.news,
            marketCap: marketCapInr,
            peRatio: canisterStock.metrics.pe_ratio, // Ratio stays same
            eps: epsInr,
            industryAvgPE: canisterStock.metrics.industry_avg_pe, // Ratio stays same
            outstandingShares: Number(canisterStock.metrics.outstanding_shares),
            volatility: canisterStock.metrics.volatility, // Percentage stays same
            lastUpdate: Number(canisterStock.last_update),
            sector: this.determineSector(symbol)
        };
    }
    
    private determineSector(symbol: string): string {
        const upperSymbol = symbol.toUpperCase();
        
        // Technology stocks
        if (['AAPL', 'GOOGL', 'MSFT', 'NVDA', 'META', 'AMZN', 'TSLA'].includes(upperSymbol)) {
            return 'Technology';
        }
        
        // Finance stocks
        if (['HDFCBANK', 'ICICIBANK', 'SBIN', 'AXISBANK', 'KOTAKBANK'].includes(upperSymbol)) {
            return 'Finance';
        }
        
        // IT Services
        if (['TCS', 'INFY', 'WIPRO', 'HCLTECH', 'TECHM'].includes(upperSymbol)) {
            return 'Technology';
        }
        
        // Consumer/Retail
        if (['RELIANCE', 'HINDUNILVR', 'ITC', 'ASIANPAINT', 'NESTLEIND'].includes(upperSymbol)) {
            return 'Consumer';
        }
        
        // Cryptocurrency
        if (['BTC', 'ETH', 'USDT', 'BNB', 'SOL'].includes(upperSymbol)) {
            return 'Cryptocurrency';
        }
        
        // Default to Technology
        return 'Technology';
    }

    private isCacheValid(): boolean {
        if (!this.cache || this.cacheTimestamp === 0) return false;
        const age = Date.now() - this.cacheTimestamp;
        return age < CONFIG.CACHE_TTL;
    }

    private updateCache(data: MarketDataResponse): void {
        this.cache = data;
        this.cacheTimestamp = Date.now();
        this.saveToStorage(data);
    }

    private notifyPendingCallbacks(data: MarketDataResponse): void {
        this.pendingCallbacks.forEach(callback => callback(data));
        this.pendingCallbacks = [];
    }

    private saveToStorage(data: MarketDataResponse): void {
        try {
            localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify({
                data,
                timestamp: this.cacheTimestamp
            }));
        } catch (error) {
            console.warn('Failed to save market data to storage:', error);
        }
    }

    private loadFromStorage(): void {
        try {
            const stored = localStorage.getItem(CONFIG.STORAGE_KEY);
            if (!stored) return;

            const { data, timestamp } = JSON.parse(stored);
            const age = Date.now() - timestamp;

            if (age < CONFIG.CACHE_TTL) {
                this.cache = data;
                this.cacheTimestamp = timestamp;
                console.log(`✅ Loaded ${data.stocks.length} stocks from storage (${Math.round(age / 1000)}s old)`);
            } else {
                localStorage.removeItem(CONFIG.STORAGE_KEY);
            }
        } catch (error) {
            console.warn('Failed to load market data from storage:', error);
        }
    }

    private async getFallbackData(): Promise<MarketDataResponse> {
        console.log('💰 Fetching real cryptocurrency prices from CoinGecko...');

        try {
            // Fetch real prices from CoinGecko
            const realPrices = await coinGeckoService.getPrices([...CONFIG.DEFAULT_STOCKS]);
            
            if (realPrices.length === 0) {
                console.error('❌ CoinGecko returned no data');
                return {
                    success: false,
                    stocks: [],
                    timestamp: Date.now(),
                    source: 'fallback',
                    error: 'Failed to fetch cryptocurrency prices'
                };
            }

            // Convert to UIStock format with mock data for news/metrics
            const stocks: UIStock[] = realPrices.map(priceData => {
                const inrPrice = convertUsdToInr(priceData.price);
                
                return {
                    id: priceData.symbol,
                    symbol: priceData.symbol,
                    name: this.getCoinName(priceData.symbol),
                    currentPrice: inrPrice,
                    priceHistory: this.generateMockHistory(inrPrice),
                    debtEquityRatio: 0, // N/A for crypto
                    businessGrowth: priceData.changePercent,
                    news: this.generateMockNews(priceData.symbol, priceData.changePercent),
                    marketCap: convertUsdToInr(priceData.price * 1000000000), // Estimate
                    peRatio: 0, // N/A for crypto
                    eps: 0, // N/A for crypto
                    industryAvgPE: 0, // N/A for crypto
                    outstandingShares: 1000000000, // Estimate
                    volatility: Math.abs(priceData.changePercent) / 100,
                    lastUpdate: priceData.timestamp,
                    sector: 'Cryptocurrency'
                };
            });

            console.log(`✅ Loaded ${stocks.length} real cryptocurrency prices from CoinGecko`);

            return {
                success: true,
                stocks,
                timestamp: Date.now(),
                source: 'coingecko' as any
            };
        } catch (error) {
            console.error('❌ Failed to fetch from CoinGecko:', error);
            return {
                success: false,
                stocks: [],
                timestamp: Date.now(),
                source: 'fallback',
                error: 'CoinGecko API error'
            };
        }
    }

    private getCoinName(symbol: string): string {
        const names: Record<string, string> = {
            'BTC': 'Bitcoin',
            'ETH': 'Ethereum',
            'SOL': 'Solana',
            'BNB': 'Binance Coin',
            'ADA': 'Cardano',
            'AVAX': 'Avalanche',
            'DOT': 'Polkadot',
            'MATIC': 'Polygon',
            'LINK': 'Chainlink',
            'UNI': 'Uniswap',
            'LTC': 'Litecoin',
            'ICP': 'Internet Computer',
            'XRP': 'Ripple',
            'ATOM': 'Cosmos',
            'ALGO': 'Algorand',
        };
        return names[symbol.toUpperCase()] || symbol;
    }

    private generateMockNews(symbol: string, changePercent: number): string[] {
        const direction = changePercent > 0 ? 'up' : 'down';
        const change = Math.abs(changePercent).toFixed(2);
        
        return [
            `${this.getCoinName(symbol)} is ${direction} ${change}% in the last 24 hours`,
            `Market analysis: ${symbol} showing ${changePercent > 0 ? 'bullish' : 'bearish'} trends`,
            `Trading volume increases for ${symbol}`,
        ];
    }

    private generateMockHistory(currentPrice: number): number[] {
        const history: number[] = [];
        let price = currentPrice * 0.9; // Start 10% lower
        
        for (let i = 0; i < 30; i++) {
            history.push(price);
            price += (Math.random() - 0.48) * currentPrice * 0.02; // Random walk
        }
        
        history.push(currentPrice); // End at current price
        return history;
    }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const stockMarketDataService = new StockMarketDataService();

// Debug access
(window as any).stockMarketDataService = stockMarketDataService;

export default stockMarketDataService;
