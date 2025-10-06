/**
 * StockMarketDataService - Dual-Source Market Data Integration
 * 
 * This service fetches market data from TWO sources:
 * 1. CoinGecko API - Real cryptocurrency prices
 * 2. Polygon.io API - Real stock prices
 * 
 * NO FALLBACK PRICES - Always uses live market data.
 * 
 * @author Dhaniverse Team
 * @date 2025-10-05
 */

import { coinGeckoService } from './CoinGeckoService';
import { polygonService } from './PolygonService';
import { convertUsdToInr } from '../utils/currencyConversion';
import type { StockPrice } from '../types/stock.types';

// ============================================================================
// TYPES
// ============================================================================

export interface UIStock {
    id: string;
    symbol: string;
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

export interface MarketDataResponse {
    success: boolean;
    stocks: UIStock[];
    timestamp: number;
    source: 'coingecko' | 'polygon' | 'mixed' | 'cache';
    error?: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
    CACHE_TTL: 5 * 60 * 1000, // 5 minutes
} as const;

// ============================================================================
// STOCK METADATA
// ============================================================================

const STOCK_METADATA: Record<string, { name: string; sector: string }> = {
    // US Tech Stocks
    'AAPL': { name: 'Apple Inc.', sector: 'Technology' },
    'MSFT': { name: 'Microsoft Corporation', sector: 'Technology' },
    'GOOGL': { name: 'Alphabet Inc.', sector: 'Technology' },
    'AMZN': { name: 'Amazon.com Inc.', sector: 'Technology' },
    'TSLA': { name: 'Tesla Inc.', sector: 'Automotive' },
    'META': { name: 'Meta Platforms Inc.', sector: 'Technology' },
    'NVDA': { name: 'NVIDIA Corporation', sector: 'Technology' },
    'NFLX': { name: 'Netflix Inc.', sector: 'Entertainment' },
    // Financial
    'JPM': { name: 'JPMorgan Chase & Co.', sector: 'Finance' },
    'BAC': { name: 'Bank of America Corp.', sector: 'Finance' },
    'V': { name: 'Visa Inc.', sector: 'Finance' },
    'MA': { name: 'Mastercard Inc.', sector: 'Finance' },
    // Healthcare
    'JNJ': { name: 'Johnson & Johnson', sector: 'Healthcare' },
    'PFE': { name: 'Pfizer Inc.', sector: 'Healthcare' },
    'UNH': { name: 'UnitedHealth Group', sector: 'Healthcare' },
    // Energy
    'XOM': { name: 'Exxon Mobil Corporation', sector: 'Energy' },
    'CVX': { name: 'Chevron Corporation', sector: 'Energy' },
    // Retail
    'WMT': { name: 'Walmart Inc.', sector: 'Retail' },
    'HD': { name: 'The Home Depot Inc.', sector: 'Retail' },
};

const CRYPTO_NAMES: Record<string, string> = {
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

// ============================================================================
// STOCK MARKET DATA SERVICE
// ============================================================================

class StockMarketDataService {
    private cryptoCache: MarketDataResponse | null = null;
    private cryptoCacheTimestamp: number = 0;
    private stockCache: MarketDataResponse | null = null;
    private stockCacheTimestamp: number = 0;

    constructor() {
        console.log('📊 StockMarketDataService initialized - Dual source (CoinGecko + Polygon)');
    }

    // ========================================================================
    // PUBLIC API
    // ========================================================================

    /**
     * Get cryptocurrency data from CoinGecko
     */
    async getCryptocurrencies(forceRefresh = false): Promise<MarketDataResponse> {
        if (!forceRefresh && this.isCryptoCacheValid()) {
            console.log('✅ Cryptocurrency data from cache');
            return this.cryptoCache!;
        }

        try {
            console.log('💰 Fetching cryptocurrencies from CoinGecko...');
            
            const cryptoSymbols = coinGeckoService.getSupportedSymbols().slice(0, 15); // First 15
            const prices = await coinGeckoService.getPrices(cryptoSymbols);
            
            const stocks = prices.map(price => this.convertPriceToUIStock(price, 'crypto'));
            
            const response: MarketDataResponse = {
                success: true,
                stocks,
                timestamp: Date.now(),
                source: 'coingecko'
            };
            
            this.cryptoCache = response;
            this.cryptoCacheTimestamp = Date.now();
            
            console.log(`✅ Loaded ${stocks.length} cryptocurrencies from CoinGecko`);
            return response;
            
        } catch (error) {
            console.error('❌ Failed to fetch cryptocurrencies:', error);
            return {
                success: false,
                stocks: [],
                timestamp: Date.now(),
                source: 'coingecko',
                error: 'Failed to fetch cryptocurrency data'
            };
        }
    }

    /**
     * Get stock data from Polygon.io
     */
    async getStocks(forceRefresh = false): Promise<MarketDataResponse> {
        if (!forceRefresh && this.isStockCacheValid()) {
            console.log('✅ Stock data from cache');
            return this.stockCache!;
        }

        try {
            console.log('📈 Fetching stocks from Polygon.io...');
            
            const stockSymbols = polygonService.getSupportedSymbols().slice(0, 10); // First 10
            const prices = await polygonService.getPrices(stockSymbols);
            
            const stocks = prices.map(price => this.convertPriceToUIStock(price, 'stock'));
            
            const response: MarketDataResponse = {
                success: true,
                stocks,
                timestamp: Date.now(),
                source: 'polygon'
            };
            
            this.stockCache = response;
            this.stockCacheTimestamp = Date.now();
            
            console.log(`✅ Loaded ${stocks.length} stocks from Polygon.io`);
            return response;
            
        } catch (error) {
            console.error('❌ Failed to fetch stocks:', error);
            return {
                success: false,
                stocks: [],
                timestamp: Date.now(),
                source: 'polygon',
                error: 'Failed to fetch stock data'
            };
        }
    }

    /**
     * Get ALL market data (crypto + stocks combined)
     */
    async getCompleteMarketData(forceRefresh = false): Promise<MarketDataResponse> {
        const [cryptoData, stockData] = await Promise.all([
            this.getCryptocurrencies(forceRefresh),
            this.getStocks(forceRefresh)
        ]);

        return {
            success: cryptoData.success && stockData.success,
            stocks: [...cryptoData.stocks, ...stockData.stocks],
            timestamp: Date.now(),
            source: 'mixed',
            error: cryptoData.error || stockData.error
        };
    }

    /**
     * Clear all caches
     */
    clearCache(): void {
        this.cryptoCache = null;
        this.cryptoCacheTimestamp = 0;
        this.stockCache = null;
        this.stockCacheTimestamp = 0;
        console.log('🗑️ All market data caches cleared');
    }

    /**
     * Get cache status
     */
    getCacheStatus() {
        return {
            crypto: {
                isCached: this.cryptoCache !== null,
                cacheAge: this.cryptoCache ? Date.now() - this.cryptoCacheTimestamp : 0,
                isValid: this.isCryptoCacheValid(),
                count: this.cryptoCache?.stocks.length || 0
            },
            stocks: {
                isCached: this.stockCache !== null,
                cacheAge: this.stockCache ? Date.now() - this.stockCacheTimestamp : 0,
                isValid: this.isStockCacheValid(),
                count: this.stockCache?.stocks.length || 0
            }
        };
    }

    // ========================================================================
    // PRIVATE METHODS
    // ========================================================================

    private isCryptoCacheValid(): boolean {
        if (!this.cryptoCache || this.cryptoCacheTimestamp === 0) return false;
        const age = Date.now() - this.cryptoCacheTimestamp;
        return age < CONFIG.CACHE_TTL;
    }

    private isStockCacheValid(): boolean {
        if (!this.stockCache || this.stockCacheTimestamp === 0) return false;
        const age = Date.now() - this.stockCacheTimestamp;
        return age < CONFIG.CACHE_TTL;
    }

    private convertPriceToUIStock(price: StockPrice, type: 'crypto' | 'stock'): UIStock {
        const inrPrice = convertUsdToInr(price.price);
        const symbol = price.symbol.toUpperCase();
        
        // Get name and sector
        const name = type === 'crypto' 
            ? (CRYPTO_NAMES[symbol] || symbol)
            : (STOCK_METADATA[symbol]?.name || symbol);
            
        const sector = type === 'crypto'
            ? 'Cryptocurrency'
            : (STOCK_METADATA[symbol]?.sector || 'Unknown');

        return {
            id: symbol.toLowerCase(),
            symbol: symbol,
            name: name,
            currentPrice: inrPrice,
            priceHistory: this.generateMockHistory(inrPrice),
            debtEquityRatio: type === 'stock' ? 0.8 : 0,
            businessGrowth: price.changePercent,
            news: this.generateMockNews(name, price.changePercent),
            marketCap: convertUsdToInr(price.volume * price.price * 1000), // Estimate
            peRatio: type === 'stock' ? 20.0 : 0,
            eps: type === 'stock' ? convertUsdToInr(35.0) : 0,
            industryAvgPE: type === 'stock' ? 22.0 : 0,
            outstandingShares: 1000000000,
            volatility: Math.abs(price.changePercent) / 100,
            lastUpdate: price.timestamp,
            sector: sector
        };
    }

    private generateMockHistory(currentPrice: number): number[] {
        const history: number[] = [];
        let price = currentPrice * 0.9;
        
        for (let i = 0; i < 30; i++) {
            history.push(price);
            price += (Math.random() - 0.48) * currentPrice * 0.02;
        }
        
        history.push(currentPrice);
        return history;
    }

    private generateMockNews(name: string, changePercent: number): string[] {
        const direction = changePercent > 0 ? 'up' : 'down';
        const change = Math.abs(changePercent).toFixed(2);
        
        return [
            `${name} is ${direction} ${change}% today`,
            `Market analysis: ${name} showing ${changePercent > 0 ? 'bullish' : 'bearish'} trends`,
            `Trading volume increases for ${name}`,
        ];
    }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const stockMarketDataService = new StockMarketDataService();

// Debug access
(window as any).stockMarketDataService = stockMarketDataService;

export default stockMarketDataService;
