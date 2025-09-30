/**
 * StockMarketService - Game Integration Layer
 * 
 * This service acts as the bridge between:
 * - React UI components (stock market dashboard, trade popups)
 * - Phaser game systems (NPCs, scene-specific logic)
 * - StockPriceService (clean price fetching with caching)
 * 
 * Responsibilities:
 * - Provide game-specific stock data (enriched with history, volatility, etc.)
 * - Emit game events for Phaser systems
 * - Handle UI <-> Game communication
 * - Manage periodic updates for real-time price changes
 * 
 * This does NOT handle transactions (see StockTransactionService)
 * This does NOT fetch prices directly (delegates to StockPriceService)
 * 
 * @author Dhaniverse Team
 */

import { stockPriceService } from './StockPriceService';
import { realStocks } from '../config/RealStocks';
import type { Stock, MarketStatus } from '../types/stock.types';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
    UPDATE_INTERVAL_MS: 5 * 60 * 1000, // 5 minutes - real-time feel
    PRICE_HISTORY_LENGTH: 24, // 24 data points for charts
    PREFETCH_ON_INIT: true, // Prefetch prices during initialization
} as const;

// ============================================================================
// STOCK MARKET SERVICE
// ============================================================================

class StockMarketService {
    private stocks: Map<string, Stock> = new Map();
    private isInitialized = false;
    private updateIntervalHandle: NodeJS.Timeout | null = null;
    private isUpdating = false; // Prevent concurrent updates
    private marketStatus: MarketStatus = {
        isOpen: true,
        nextOpen: new Date(),
        nextClose: new Date(),
        reason: 'Market is open',
        timezone: 'America/New_York'
    };

    constructor() {
        console.log('📊 StockMarketService created (lazy initialization)');
    }

    // ========================================================================
    // INITIALIZATION
    // ========================================================================

    /**
     * Initialize stock market data from RealStocks.ts configuration
     * Optionally prefetch prices for immediate availability
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) {
            console.log('StockMarketService already initialized');
            return;
        }

        console.log('📊 Initializing StockMarketService...');

        try {
            // Build stock list from RealStocks.ts configuration
            const stockSymbols = Object.keys(realStocks);
            
            for (const symbol of stockSymbols) {
                const config = realStocks[symbol];
                if (!config) {
                    console.warn(`Stock config not found for ${symbol}`);
                    continue;
                }
                
                const stock: Stock = {
                    id: symbol.toLowerCase(),
                    symbol: symbol,
                    name: config.name,
                    sector: config.sector,
                    industry: config.industry,
                    currentPrice: 0, // Will be fetched
                    open: 0,
                    volume: 0,
                    change: 0,
                    changePercent: 0,
                    priceHistory: [],
                    lastUpdated: Date.now(),
                    isRealTime: false,
                    marketCap: 0,
                    peRatio: 0,
                    eps: 0,
                    source: 'pending'
                };
                
                this.stocks.set(symbol, stock);
            }

            this.isInitialized = true;
            console.log(`✅ StockMarketService initialized with ${this.stocks.size} stocks`);

            // Prefetch initial prices
            if (CONFIG.PREFETCH_ON_INIT) {
                await this.refreshAllPrices();
            }

            // Emit event for game systems
            window.dispatchEvent(new CustomEvent('stock-market-initialized', {
                detail: { stockCount: this.stocks.size }
            }));

        } catch (error) {
            console.error('❌ Failed to initialize StockMarketService:', error);
            throw error;
        }
    }

    // ========================================================================
    // PUBLIC API - STOCK DATA
    // ========================================================================

    /**
     * Get all available stocks
     */
    getStockMarketData(): Stock[] {
        return Array.from(this.stocks.values());
    }

    /**
     * Get a specific stock by symbol
     */
    getStockBySymbol(symbol: string): Stock | undefined {
        return this.stocks.get(symbol.toUpperCase());
    }

    /**
     * Get stocks by sector
     */
    getStocksBySector(sector: string): Stock[] {
        return this.getStockMarketData().filter(stock => 
            stock.sector.toLowerCase() === sector.toLowerCase()
        );
    }

    /**
     * Get top gainers
     */
    getTopGainers(limit = 5): Stock[] {
        return this.getStockMarketData()
            .filter(stock => (stock.changePercent ?? 0) > 0)
            .sort((a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0))
            .slice(0, limit);
    }

    /**
     * Get top losers
     */
    getTopLosers(limit = 5): Stock[] {
        return this.getStockMarketData()
            .filter(stock => (stock.changePercent ?? 0) < 0)
            .sort((a, b) => (a.changePercent ?? 0) - (b.changePercent ?? 0))
            .slice(0, limit);
    }

    /**
     * Search stocks by name or symbol
     */
    searchStocks(query: string): Stock[] {
        const lowerQuery = query.toLowerCase();
        return this.getStockMarketData().filter(stock =>
            stock.symbol.toLowerCase().includes(lowerQuery) ||
            stock.name.toLowerCase().includes(lowerQuery)
        );
    }

    // ========================================================================
    // PUBLIC API - MARKET STATUS
    // ========================================================================

    /**
     * Get current market status
     */
    getMarketStatus(): MarketStatus {
        return this.marketStatus;
    }

    /**
     * Check if service is initialized
     */
    isServiceInitialized(): boolean {
        return this.isInitialized;
    }

    // ========================================================================
    // PRICE UPDATES
    // ========================================================================

    /**
     * Refresh all stock prices (batch operation)
     */
    async refreshAllPrices(): Promise<void> {
        // Prevent concurrent updates
        if (this.isUpdating) {
            console.log('⏭️  Update already in progress, skipping');
            return;
        }
        
        this.isUpdating = true;
        
        try {
            console.log('🔄 Refreshing all stock prices...');
            
            const symbols = Array.from(this.stocks.keys());
            const response = await stockPriceService.getStockPrices({ symbols });

            if (!response.success) {
                throw new Error('Failed to fetch stock prices');
            }

            // Update stocks with fresh prices
            for (const priceData of response.data) {
                const stock = this.stocks.get(priceData.symbol);
                if (stock) {
                    this.updateStockWithPrice(stock, priceData);
                }
            }

            console.log(`✅ Refreshed ${response.data.length} stock prices`);

            // Emit update event
            window.dispatchEvent(new CustomEvent('stock-prices-updated', {
                detail: { count: response.data.length }
            }));

        } catch (error) {
            console.error('❌ Failed to refresh stock prices:', error);
            throw error;
        } finally {
            this.isUpdating = false;
        }
    }

    /**
     * Refresh a single stock's price
     */
    async refreshStockPrice(symbol: string): Promise<void> {
        try {
            const price = await stockPriceService.getStockPrice(symbol);
            if (!price) {
                throw new Error(`No price data for ${symbol}`);
            }

            const stock = this.stocks.get(symbol.toUpperCase());
            if (stock) {
                this.updateStockWithPrice(stock, price);
            }

            // Emit update event
            window.dispatchEvent(new CustomEvent('stock-price-updated', {
                detail: { symbol, price: price.price }
            }));

        } catch (error) {
            console.error(`❌ Failed to refresh price for ${symbol}:`, error);
            throw error;
        }
    }

    /**
     * Internal: Update stock object with fresh price data
     */
    private updateStockWithPrice(stock: Stock, priceData: any): void {
        // Update basic price info
        stock.currentPrice = priceData.price;
        stock.open = priceData.open || priceData.price;
        stock.dayHigh = priceData.high || priceData.price;
        stock.dayLow = priceData.low || priceData.price;
        stock.close = priceData.close || priceData.price;
        stock.volume = priceData.volume || 0;
        stock.change = priceData.change || 0;
        stock.changePercent = priceData.changePercent || 0;
        stock.lastUpdated = priceData.timestamp || Date.now();
        stock.isRealTime = priceData.isRealTime || false;
        stock.source = priceData.source || 'unknown';

        // Update price history (keep last 24 points)
        // Support both number[] and PriceHistoryPoint[] formats
        if (Array.isArray(stock.priceHistory)) {
            if (stock.priceHistory.length === 0 || typeof stock.priceHistory[0] === 'number') {
                // Simple number array
                (stock.priceHistory as number[]).push(priceData.price);
                if (stock.priceHistory.length > CONFIG.PRICE_HISTORY_LENGTH) {
                    (stock.priceHistory as number[]).shift(); // Remove oldest
                }
            } else {
                // PriceHistoryPoint array
                (stock.priceHistory as any[]).push({
                    timestamp: priceData.timestamp || Date.now(),
                    price: priceData.price,
                    open: priceData.open || priceData.price,
                    high: priceData.high || priceData.price,
                    low: priceData.low || priceData.price,
                    close: priceData.close || priceData.price,
                    volume: priceData.volume || 0
                });
                if (stock.priceHistory.length > CONFIG.PRICE_HISTORY_LENGTH) {
                    (stock.priceHistory as any[]).shift();
                }
            }
        }

        // Generate initial history if empty
        if (!stock.priceHistory || stock.priceHistory.length === 0) {
            stock.priceHistory = this.generateInitialPriceHistory(priceData.price, priceData.changePercent || 0);
        }
    }

    /**
     * Generate realistic initial price history for charts
     */
    private generateInitialPriceHistory(currentPrice: number, changePercent: number): number[] {
        const history: number[] = [];
        const basePrice = currentPrice / (1 + changePercent / 100);
        
        for (let i = 0; i < CONFIG.PRICE_HISTORY_LENGTH; i++) {
            const progress = i / (CONFIG.PRICE_HISTORY_LENGTH - 1);
            const randomFactor = (Math.random() - 0.5) * 0.02; // ±2% random
            const trendFactor = progress * (changePercent / 100); // Apply trend
            const price = basePrice * (1 + trendFactor + randomFactor);
            history.push(Math.max(price, 1)); // Ensure positive
        }
        
        return history;
    }

    // ========================================================================
    // PERIODIC UPDATES
    // ========================================================================

    /**
     * Start automatic price updates (called by UI when stock market opens)
     */
    startPeriodicUpdates(): void {
        if (this.updateIntervalHandle) {
            console.log('Periodic updates already running');
            return;
        }

        if (!this.isInitialized) {
            console.warn('Cannot start updates - service not initialized');
            return;
        }

        console.log(`🔄 Starting periodic updates (every ${CONFIG.UPDATE_INTERVAL_MS / 1000}s)`);

        this.updateIntervalHandle = setInterval(async () => {
            try {
                await this.refreshAllPrices();
            } catch (error) {
                console.error('Periodic update failed:', error);
            }
        }, CONFIG.UPDATE_INTERVAL_MS);
    }

    /**
     * Stop automatic price updates (called when UI closes)
     */
    stopPeriodicUpdates(): void {
        if (this.updateIntervalHandle) {
            clearInterval(this.updateIntervalHandle);
            this.updateIntervalHandle = null;
            console.log('🛑 Stopped periodic updates');
        }
    }

    /**
     * Legacy method name for backward compatibility
     */
    startPeriodicUpdatesIfNeeded(): void {
        this.startPeriodicUpdates();
    }

    // ========================================================================
    // GAME EVENTS
    // ========================================================================

    /**
     * Emit event to open stock market UI from game
     */
    openStockMarketUI(): void {
        window.dispatchEvent(new CustomEvent('openStockMarketUI'));
    }

    /**
     * Emit event to close stock market UI
     */
    closeStockMarketUI(): void {
        window.dispatchEvent(new CustomEvent('closeStockMarketUI'));
    }

    // ========================================================================
    // STATISTICS
    // ========================================================================

    /**
     * Get service statistics
     */
    getStats() {
        return {
            totalStocks: this.stocks.size,
            initialized: this.isInitialized,
            updatesRunning: this.updateIntervalHandle !== null,
            priceServiceStats: stockPriceService.getStats(),
        };
    }

    /**
     * Reset service (for testing)
     */
    reset(): void {
        this.stopPeriodicUpdates();
        this.stocks.clear();
        this.isInitialized = false;
        this.isUpdating = false;
        stockPriceService.clearCache();
        console.log('🗑️ StockMarketService reset');
    }
    
    /**
     * Cleanup method (call when unmounting)
     */
    cleanup(): void {
        this.stopPeriodicUpdates();
        console.log('🧹 StockMarketService cleaned up');
    }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const stockMarketService = new StockMarketService();

// Debug access
(window as any).stockMarketService = stockMarketService;

export default stockMarketService;
