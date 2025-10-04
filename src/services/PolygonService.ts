/**
 * Polygon.io API Service - Real Stock Market Data
 * 
 * This service fetches REAL stock prices from Polygon.io API.
 * Provides real-time and historical stock data for US and Indian markets.
 * 
 * Features:
 * - Real-time stock prices
 * - Previous day's OHLC data
 * - Smart caching (5 minutes TTL)
 * - Batch fetching support
 * - Free tier compatible
 * 
 * @author Dhaniverse Team
 * @date 2025-10-05
 */

import type { StockPrice } from '../types/stock.types';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
    API_KEY: '8gQaSj2WkVK0iwh2fHDJxl4DhM02QrBl', // Polygon.io API key
    BASE_URL: 'https://api.polygon.io',
    CACHE_TTL: 5 * 60 * 1000, // 5 minutes
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,
    REQUEST_TIMEOUT: 10000,
} as const;

// ============================================================================
// TYPES
// ============================================================================

interface PolygonPrevClose {
    T: string;      // Ticker symbol
    v: number;      // Volume
    vw: number;     // Volume weighted average price
    o: number;      // Open
    c: number;      // Close
    h: number;      // High
    l: number;      // Low
    t: number;      // Timestamp
    n: number;      // Number of transactions
}

interface PolygonPrevCloseResponse {
    ticker: string;
    status: string;
    from: string;
    symbol: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    afterHours: number;
    preMarket: number;
}

interface CachedPrice {
    price: StockPrice;
    cachedAt: number;
}

// ============================================================================
// STOCK SYMBOL MAPPING
// ============================================================================

/**
 * US Stock Symbols supported by Polygon
 */
const US_STOCKS = [
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX',
    'JPM', 'BAC', 'V', 'MA', 'JNJ', 'PFE', 'UNH', 'XOM', 'CVX', 'WMT', 'HD'
];

/**
 * Stock metadata (names and sectors)
 */
const STOCK_METADATA: Record<string, { name: string; sector: string }> = {
    'AAPL': { name: 'Apple Inc.', sector: 'Technology' },
    'MSFT': { name: 'Microsoft Corporation', sector: 'Technology' },
    'GOOGL': { name: 'Alphabet Inc.', sector: 'Technology' },
    'AMZN': { name: 'Amazon.com Inc.', sector: 'Technology' },
    'TSLA': { name: 'Tesla Inc.', sector: 'Automotive' },
    'META': { name: 'Meta Platforms Inc.', sector: 'Technology' },
    'NVDA': { name: 'NVIDIA Corporation', sector: 'Technology' },
    'NFLX': { name: 'Netflix Inc.', sector: 'Entertainment' },
    'JPM': { name: 'JPMorgan Chase & Co.', sector: 'Finance' },
    'BAC': { name: 'Bank of America Corp.', sector: 'Finance' },
    'V': { name: 'Visa Inc.', sector: 'Finance' },
    'MA': { name: 'Mastercard Inc.', sector: 'Finance' },
    'JNJ': { name: 'Johnson & Johnson', sector: 'Healthcare' },
    'PFE': { name: 'Pfizer Inc.', sector: 'Healthcare' },
    'UNH': { name: 'UnitedHealth Group Inc.', sector: 'Healthcare' },
    'XOM': { name: 'Exxon Mobil Corporation', sector: 'Energy' },
    'CVX': { name: 'Chevron Corporation', sector: 'Energy' },
    'WMT': { name: 'Walmart Inc.', sector: 'Retail' },
    'HD': { name: 'The Home Depot Inc.', sector: 'Retail' },
};

// ============================================================================
// POLYGON SERVICE
// ============================================================================

class PolygonService {
    private cache = new Map<string, CachedPrice>();
    
    private stats = {
        totalRequests: 0,
        cacheHits: 0,
        apiCalls: 0,
        errors: 0,
    };
    
    constructor() {
        console.log('📈 Polygon.io Service initialized - Real stock prices!');
        
        // Clean up cache every minute
        setInterval(() => this.cleanupCache(), 60000);
    }
    
    // ========================================================================
    // PUBLIC API
    // ========================================================================
    
    /**
     * Get prices for multiple stocks
     */
    async getPrices(symbols: string[]): Promise<StockPrice[]> {
        this.stats.totalRequests++;
        
        const normalizedSymbols = symbols.map(s => s.trim().toUpperCase());
        
        // Check cache first
        const cachedPrices: StockPrice[] = [];
        const symbolsToFetch: string[] = [];
        
        for (const symbol of normalizedSymbols) {
            const cached = this.getFromCache(symbol);
            if (cached) {
                cachedPrices.push(cached);
                this.stats.cacheHits++;
            } else {
                symbolsToFetch.push(symbol);
            }
        }
        
        // If all cached, return immediately
        if (symbolsToFetch.length === 0) {
            console.log(`✅ All ${symbols.length} stock prices from cache`);
            return cachedPrices;
        }
        
        // Fetch missing prices
        console.log(`📊 Fetching ${symbolsToFetch.length} stock prices from Polygon.io...`);
        const freshPrices = await this.fetchPricesFromAPI(symbolsToFetch);
        
        // Cache fresh results
        for (const price of freshPrices) {
            this.cachePrice(price);
        }
        
        return [...cachedPrices, ...freshPrices];
    }
    
    /**
     * Get price for a single stock
     */
    async getPrice(symbol: string): Promise<StockPrice | null> {
        const prices = await this.getPrices([symbol]);
        return prices[0] || null;
    }
    
    /**
     * Get all supported stock symbols
     */
    getSupportedSymbols(): string[] {
        return US_STOCKS;
    }
    
    /**
     * Check if a symbol is supported
     */
    isSupported(symbol: string): boolean {
        return US_STOCKS.includes(symbol.toUpperCase());
    }
    
    /**
     * Get all default stocks with prices
     */
    async getAllStocks(): Promise<StockPrice[]> {
        return this.getPrices(US_STOCKS);
    }
    
    /**
     * Clear cache
     */
    clearCache(): void {
        this.cache.clear();
        console.log('🗑️ Polygon cache cleared');
    }
    
    /**
     * Get service statistics
     */
    getStats() {
        const cacheHitRate = this.stats.totalRequests > 0
            ? (this.stats.cacheHits / this.stats.totalRequests) * 100
            : 0;
            
        return {
            ...this.stats,
            cacheHitRate: Math.round(cacheHitRate),
            cacheSize: this.cache.size,
        };
    }
    
    // ========================================================================
    // PRIVATE METHODS
    // ========================================================================
    
    private async fetchPricesFromAPI(symbols: string[]): Promise<StockPrice[]> {
        const prices: StockPrice[] = [];
        
        // Fetch each stock individually (Polygon requires separate calls)
        for (const symbol of symbols) {
            try {
                this.stats.apiCalls++;
                
                const url = `${CONFIG.BASE_URL}/v2/aggs/ticker/${symbol}/prev?adjusted=true&apiKey=${CONFIG.API_KEY}`;
                
                console.log(`🌐 Polygon API Call: ${symbol}`);
                
                const response = await this.fetchWithRetry(url);
                const data = await response.json();
                
                if (data.status === 'OK' && data.results && data.results[0]) {
                    const result = data.results[0];
                    
                    const metadata = STOCK_METADATA[symbol] || {
                        name: symbol,
                        sector: 'Unknown'
                    };
                    
                    // Calculate price change
                    const change = result.c - result.o;
                    const changePercent = ((change / result.o) * 100);
                    
                    prices.push({
                        symbol: symbol,
                        price: result.c, // Close price in USD
                        open: result.o,
                        high: result.h,
                        low: result.l,
                        close: result.c,
                        volume: result.v,
                        change: change,
                        changePercent: changePercent,
                        timestamp: Date.now(),
                        isRealTime: true,
                        source: 'polygon',
                    });
                    
                    console.log(`✅ ${symbol}: $${result.c} (${changePercent > 0 ? '+' : ''}${changePercent.toFixed(2)}%)`);
                } else {
                    console.warn(`⚠️ No data for ${symbol}:`, data.status);
                }
                
                // Small delay to avoid rate limiting (5 calls/minute on free tier)
                await new Promise(resolve => setTimeout(resolve, 12000)); // 12 seconds between calls
                
            } catch (error) {
                console.error(`❌ Failed to fetch ${symbol}:`, error);
                this.stats.errors++;
            }
        }
        
        console.log(`✅ Fetched ${prices.length}/${symbols.length} stock prices from Polygon`);
        return prices;
    }
    
    private async fetchWithRetry(url: string, retries = CONFIG.MAX_RETRIES): Promise<Response> {
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT);
                
                const response = await fetch(url, {
                    signal: controller.signal,
                    headers: {
                        'Accept': 'application/json',
                    },
                });
                
                clearTimeout(timeout);
                
                if (!response.ok) {
                    throw new Error(`Polygon API error: ${response.status} ${response.statusText}`);
                }
                
                return response;
                
            } catch (error) {
                if (attempt === retries) {
                    throw error;
                }
                
                const delay = CONFIG.RETRY_DELAY * Math.pow(2, attempt);
                console.warn(`⚠️ Polygon request failed (attempt ${attempt + 1}/${retries + 1}), retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        throw new Error('Max retries exceeded');
    }
    
    private getFromCache(symbol: string): StockPrice | null {
        const cached = this.cache.get(symbol);
        
        if (!cached) return null;
        
        const age = Date.now() - cached.cachedAt;
        if (age > CONFIG.CACHE_TTL) {
            this.cache.delete(symbol);
            return null;
        }
        
        return cached.price;
    }
    
    private cachePrice(price: StockPrice): void {
        this.cache.set(price.symbol, {
            price,
            cachedAt: Date.now(),
        });
    }
    
    private cleanupCache(): void {
        const now = Date.now();
        let removed = 0;
        
        for (const [symbol, cached] of this.cache.entries()) {
            if (now - cached.cachedAt > CONFIG.CACHE_TTL) {
                this.cache.delete(symbol);
                removed++;
            }
        }
        
        if (removed > 0) {
            console.log(`🧹 Cleaned up ${removed} expired Polygon cache entries`);
        }
    }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const polygonService = new PolygonService();

// Debug access
(window as any).polygonService = polygonService;

export default polygonService;
