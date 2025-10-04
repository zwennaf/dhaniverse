/**
 * CoinGecko API Service - Real Cryptocurrency Price Data
 * 
 * This service fetches REAL cryptocurrency prices from CoinGecko API.
 * NO fallback prices - always uses live market data.
 * 
 * Features:
 * - Real-time price data for cryptocurrencies
 * - Batch fetching for multiple coins
 * - Smart caching (5 minutes TTL)
 * - Free tier compatible (no API key required)
 * - Automatic retry with exponential backoff
 * 
 * @author Dhaniverse Team
 * @date 2025-10-05
 */

import type { StockPrice } from '../types/stock.types';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
    BASE_URL: 'https://api.coingecko.com/api/v3',
    CACHE_TTL: 5 * 60 * 1000, // 5 minutes
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000, // 1 second initial backoff
    REQUEST_TIMEOUT: 10000, // 10 seconds
} as const;

// ============================================================================
// TYPES
// ============================================================================

interface CoinGeckoPrice {
    [coinId: string]: {
        usd: number;
        usd_24h_change: number;
        usd_market_cap: number;
        usd_24h_vol: number;
    };
}

interface CoinGeckoMarketData {
    id: string;
    symbol: string;
    name: string;
    current_price: number;
    market_cap: number;
    market_cap_rank: number;
    total_volume: number;
    high_24h: number;
    low_24h: number;
    price_change_24h: number;
    price_change_percentage_24h: number;
    circulating_supply: number;
    total_supply: number;
    max_supply: number | null;
    ath: number;
    ath_change_percentage: number;
    ath_date: string;
    atl: number;
    atl_change_percentage: number;
    atl_date: string;
    last_updated: string;
}

interface CachedPrice {
    price: StockPrice;
    cachedAt: number;
}

// ============================================================================
// SYMBOL MAPPING
// ============================================================================

/**
 * Maps stock symbols to CoinGecko coin IDs
 */
const SYMBOL_TO_COINGECKO_ID: Record<string, string> = {
    // Major Cryptocurrencies
    'BTC': 'bitcoin',
    'ETH': 'ethereum',
    'USDT': 'tether',
    'BNB': 'binancecoin',
    'SOL': 'solana',
    'XRP': 'ripple',
    'ADA': 'cardano',
    'AVAX': 'avalanche-2',
    'DOT': 'polkadot',
    'MATIC': 'matic-network',
    'LINK': 'chainlink',
    'UNI': 'uniswap',
    'LTC': 'litecoin',
    'ICP': 'internet-computer',
    'ATOM': 'cosmos',
    'XLM': 'stellar',
    'TRX': 'tron',
    'NEAR': 'near',
    'ALGO': 'algorand',
    'VET': 'vechain',
    
    // DeFi Tokens
    'AAVE': 'aave',
    'MKR': 'maker',
    'SNX': 'synthetix-network-token',
    'CRV': 'curve-dao-token',
    'COMP': 'compound-governance-token',
    
    // Meme Coins
    'DOGE': 'dogecoin',
    'SHIB': 'shiba-inu',
    
    // Stablecoins
    'USDC': 'usd-coin',
    'DAI': 'dai',
    'BUSD': 'binance-usd',
};

/**
 * Gets CoinGecko ID from symbol
 */
function getCoinGeckoId(symbol: string): string | null {
    const upperSymbol = symbol.toUpperCase();
    return SYMBOL_TO_COINGECKO_ID[upperSymbol] || null;
}

// ============================================================================
// COINGECKO SERVICE
// ============================================================================

class CoinGeckoService {
    private cache = new Map<string, CachedPrice>();
    private pendingRequests = new Map<string, Promise<StockPrice>>();
    
    private stats = {
        totalRequests: 0,
        cacheHits: 0,
        apiCalls: 0,
        errors: 0,
    };
    
    constructor() {
        console.log('💰 CoinGecko Service initialized - Real prices only, no fallbacks!');
        
        // Clean up cache every minute
        setInterval(() => this.cleanupCache(), 60000);
    }
    
    // ========================================================================
    // PUBLIC API
    // ========================================================================
    
    /**
     * Get prices for multiple coins in one batch call
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
            console.log(`✅ All ${symbols.length} prices from CoinGecko cache`);
            return cachedPrices;
        }
        
        // Fetch missing prices
        console.log(`📊 Fetching ${symbolsToFetch.length} prices from CoinGecko API...`);
        const freshPrices = await this.fetchPricesFromAPI(symbolsToFetch);
        
        // Cache fresh results
        for (const price of freshPrices) {
            this.cachePrice(price);
        }
        
        return [...cachedPrices, ...freshPrices];
    }
    
    /**
     * Get price for a single coin
     */
    async getPrice(symbol: string): Promise<StockPrice | null> {
        const prices = await this.getPrices([symbol]);
        return prices[0] || null;
    }
    
    /**
     * Get detailed market data for a coin
     */
    async getMarketData(symbol: string): Promise<CoinGeckoMarketData | null> {
        const coinId = getCoinGeckoId(symbol);
        if (!coinId) {
            console.warn(`❌ Unknown coin symbol: ${symbol}`);
            return null;
        }
        
        try {
            const url = `${CONFIG.BASE_URL}/coins/markets?vs_currency=usd&ids=${coinId}`;
            const response = await this.fetchWithRetry(url);
            const data = await response.json();
            
            return data[0] || null;
        } catch (error) {
            console.error(`❌ Failed to fetch market data for ${symbol}:`, error);
            this.stats.errors++;
            return null;
        }
    }
    
    /**
     * Clear cache
     */
    clearCache(): void {
        this.cache.clear();
        console.log('🗑️ CoinGecko cache cleared');
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
    
    /**
     * Check if a symbol is supported
     */
    isSupported(symbol: string): boolean {
        return getCoinGeckoId(symbol) !== null;
    }
    
    /**
     * Get all supported symbols
     */
    getSupportedSymbols(): string[] {
        return Object.keys(SYMBOL_TO_COINGECKO_ID);
    }
    
    // ========================================================================
    // PRIVATE METHODS
    // ========================================================================
    
    private async fetchPricesFromAPI(symbols: string[]): Promise<StockPrice[]> {
        // Convert symbols to CoinGecko IDs
        const coinIds: string[] = [];
        const symbolToId = new Map<string, string>();
        
        for (const symbol of symbols) {
            const coinId = getCoinGeckoId(symbol);
            if (coinId) {
                coinIds.push(coinId);
                symbolToId.set(symbol, coinId);
            } else {
                console.warn(`❌ Unknown coin symbol: ${symbol} - skipping`);
            }
        }
        
        if (coinIds.length === 0) {
            console.warn('❌ No valid coin symbols provided');
            return [];
        }
        
        try {
            this.stats.apiCalls++;
            
            // Use the simple price endpoint for batch fetching
            const url = `${CONFIG.BASE_URL}/simple/price?ids=${coinIds.join(',')}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`;
            
            console.log(`🌐 CoinGecko API Call: ${coinIds.length} coins`);
            
            const response = await this.fetchWithRetry(url);
            const data: CoinGeckoPrice = await response.json();
            
            // Convert to StockPrice format
            const prices: StockPrice[] = [];
            
            for (const [symbol, coinId] of symbolToId.entries()) {
                const priceData = data[coinId];
                
                if (!priceData) {
                    console.warn(`⚠️ No data returned for ${symbol} (${coinId})`);
                    continue;
                }
                
                const currentPrice = priceData.usd;
                const change24h = priceData.usd_24h_change;
                const priceChange = currentPrice * (change24h / 100);
                
                // Estimate OHLC from current price and 24h change
                const yesterdayPrice = currentPrice - priceChange;
                const high = Math.max(currentPrice, yesterdayPrice) * 1.02; // Add 2% buffer
                const low = Math.min(currentPrice, yesterdayPrice) * 0.98; // Subtract 2% buffer
                
                prices.push({
                    symbol: symbol,
                    price: currentPrice,
                    open: yesterdayPrice,
                    high: high,
                    low: low,
                    close: yesterdayPrice,
                    volume: priceData.usd_24h_vol || 0,
                    change: priceChange,
                    changePercent: change24h || 0,
                    timestamp: Date.now(),
                    isRealTime: true,
                    source: 'coingecko' as any,
                });
            }
            
            console.log(`✅ Fetched ${prices.length} real prices from CoinGecko`);
            return prices;
            
        } catch (error) {
            console.error('❌ CoinGecko API error:', error);
            this.stats.errors++;
            throw error;
        }
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
                    throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
                }
                
                return response;
                
            } catch (error) {
                if (attempt === retries) {
                    throw error;
                }
                
                const delay = CONFIG.RETRY_DELAY * Math.pow(2, attempt);
                console.warn(`⚠️ CoinGecko request failed (attempt ${attempt + 1}/${retries + 1}), retrying in ${delay}ms...`);
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
            console.log(`🧹 Cleaned up ${removed} expired CoinGecko cache entries`);
        }
    }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const coinGeckoService = new CoinGeckoService();

// Debug access
(window as any).coinGeckoService = coinGeckoService;

export default coinGeckoService;
