/**
 * Stock Market Data Preloader
 * 
 * Pre-loads stock and cryptocurrency data during initial game loading
 * so the Stock Market Dashboard opens instantly when accessed.
 * 
 * This service loads data in the background while other game assets
 * are loading, making the stock market feel instant to users.
 * 
 * @author Dhaniverse Team
 * @date 2025-10-05
 */

import { stockMarketDataService } from './StockMarketDataService';
import type { UIStock, MarketDataResponse } from './StockMarketDataService';

interface PreloadStatus {
    isPreloading: boolean;
    isPreloaded: boolean;
    cryptocurrencies: UIStock[];
    stocks: UIStock[];
    error: string | null;
    startTime: number;
    endTime: number | null;
}

class StockMarketPreloader {
    private status: PreloadStatus = {
        isPreloading: false,
        isPreloaded: false,
        cryptocurrencies: [],
        stocks: [],
        error: null,
        startTime: 0,
        endTime: null
    };

    /**
     * Start preloading stock market data in background
     * This should be called during game initialization
     */
    async preloadMarketData(): Promise<void> {
        // Don't preload if already done or in progress
        if (this.status.isPreloading || this.status.isPreloaded) {
            console.log('📊 Stock market data already loaded/loading');
            return;
        }

        this.status.isPreloading = true;
        this.status.startTime = Date.now();
        console.log('🚀 [PRELOAD] Starting stock market data preload...');

        try {
            // Fetch both crypto and stocks in parallel during game loading
            const [cryptoData, stockData] = await Promise.all([
                stockMarketDataService.getCryptocurrencies(),
                stockMarketDataService.getStocks()
            ]);

            if (cryptoData.success && stockData.success) {
                this.status.cryptocurrencies = cryptoData.stocks;
                this.status.stocks = stockData.stocks;
                this.status.isPreloaded = true;
                this.status.endTime = Date.now();
                
                const loadTime = this.status.endTime - this.status.startTime;
                console.log(`✅ [PRELOAD] Stock market data preloaded successfully in ${loadTime}ms`);
                console.log(`   - ${cryptoData.stocks.length} cryptocurrencies`);
                console.log(`   - ${stockData.stocks.length} stocks`);
                console.log(`   - Total: ${cryptoData.stocks.length + stockData.stocks.length} assets ready`);

                // Dispatch event to notify UI that data is ready
                window.dispatchEvent(new CustomEvent('stockMarketDataPreloaded', {
                    detail: {
                        cryptocurrencies: this.status.cryptocurrencies,
                        stocks: this.status.stocks,
                        totalAssets: this.status.cryptocurrencies.length + this.status.stocks.length
                    }
                }));
            } else {
                throw new Error('Failed to fetch market data');
            }
        } catch (error) {
            console.error('❌ [PRELOAD] Failed to preload stock market data:', error);
            this.status.error = error instanceof Error ? error.message : 'Unknown error';
            this.status.isPreloaded = false;
        } finally {
            this.status.isPreloading = false;
        }
    }

    /**
     * Get preloaded market data (instant if already loaded)
     */
    getPreloadedData(): { cryptocurrencies: UIStock[], stocks: UIStock[], allStocks: UIStock[] } | null {
        if (!this.status.isPreloaded) {
            return null;
        }

        return {
            cryptocurrencies: this.status.cryptocurrencies,
            stocks: this.status.stocks,
            allStocks: [...this.status.cryptocurrencies, ...this.status.stocks]
        };
    }

    /**
     * Check if data is preloaded and ready
     */
    isReady(): boolean {
        return this.status.isPreloaded;
    }

    /**
     * Get loading status
     */
    getStatus(): PreloadStatus {
        return { ...this.status };
    }

    /**
     * Force refresh the preloaded data
     */
    async refreshData(): Promise<void> {
        console.log('🔄 [PRELOAD] Forcing refresh of stock market data...');
        this.status.isPreloaded = false;
        await this.preloadMarketData();
    }

    /**
     * Clear preloaded data (useful for testing or forcing fresh load)
     */
    clearCache(): void {
        console.log('🗑️ [PRELOAD] Clearing preloaded stock market data');
        this.status = {
            isPreloading: false,
            isPreloaded: false,
            cryptocurrencies: [],
            stocks: [],
            error: null,
            startTime: 0,
            endTime: null
        };
        stockMarketDataService.clearCache();
    }
}

// Singleton instance
export const stockMarketPreloader = new StockMarketPreloader();

// Global access for debugging
(window as any).stockMarketPreloader = stockMarketPreloader;

export default stockMarketPreloader;
