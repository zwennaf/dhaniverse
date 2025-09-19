// Stock Market Service for UI components
// This service provides access to stock data without requiring Phaser scene context

import { getRealStockService } from './RealStockService';

export interface Stock {
  id: string;
  symbol: string;         // Original uppercase symbol for API calls
  name: string;
  sector: string;
  currentPrice: number;
  priceHistory: number[];
  debtEquityRatio: number;
  businessGrowth: number;
  news: string[];
  volatility: number;
  lastUpdate: number;
  marketCap: number;
  peRatio: number;
  eps: number;
  outstandingShares: number;
  industryAvgPE: number;
}

export interface MarketStatus {
  isOpen: boolean;
  nextOpen: Date;
  nextClose: Date;
  reason: string;
}

class StockMarketService {
  private stockData: Stock[] = [];
  private isInitialized = false;
  private marketStatus: MarketStatus = {
    isOpen: true,
    nextOpen: new Date(),
    nextClose: new Date(),
    reason: 'Market is open'
  };

  constructor() {
    console.log('StockMarketService constructed for UI components (lazy)');
  }

  /**
   * Initialize stock data from ICP canister (BACKGROUND BATCH LOADING)
   */
  // Initialize is now explicit and returns created stock list
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('StockMarketService: explicit initialize called');
    const realStocks = await getRealStockService().initializeRealStocks();

    if (!realStocks || realStocks.length === 0) {
      console.warn('StockMarketService: no real stocks returned during initialize');
      this.isInitialized = true; // mark initialized to avoid repeated eager attempts
      return;
    }

    this.stockData = realStocks.map((realStock: any) => ({
      id: realStock.symbol.toLowerCase(),
      symbol: realStock.symbol,
      name: realStock.companyName || realStock.name || realStock.symbol,
      sector: realStock.sector,
      currentPrice: realStock.price,
      priceHistory: this.generateRealisticPriceHistory(realStock.price, realStock.changePercent),
      debtEquityRatio: 0.5 + Math.random() * 1.5,
      businessGrowth: realStock.changePercent * 2,
      news: [],
      volatility: Math.abs(realStock.changePercent) / 10 + 1,
      lastUpdate: Date.now(),
      marketCap: realStock.marketCap,
      peRatio: realStock.peRatio,
      eps: realStock.price / (realStock.peRatio || 1),
      outstandingShares: Math.floor((realStock.marketCap || 0) / (realStock.price || 1)),
      industryAvgPE: 15 + Math.random() * 10
    }));

    this.isInitialized = true;
    console.log(`StockMarketService: initialized with ${this.stockData.length} stocks`);
  }

  /**
   * Get all stock market data
   */
  getStockMarketData(): Stock[] {
    return this.stockData;
  }

  /**
   * Get stock by ID
   */
  getStockById(id: string): Stock | undefined {
    return this.stockData.find(stock => stock.id === id);
  }

  /**
   * Get market status
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

  /**
   * Generate realistic price history
   */
  private generateRealisticPriceHistory(currentPrice: number, changePercent: number): number[] {
    const history: number[] = [];
    const basePrice = currentPrice / (1 + changePercent / 100);
    
    for (let i = 0; i < 24; i++) {
      const progress = i / 23;
      const randomFactor = (Math.random() - 0.5) * 0.02;
      const trendFactor = progress * (changePercent / 100);
      const price = basePrice * (1 + trendFactor + randomFactor);
      history.push(Math.max(price, 1));
    }
    
    return history;
  }

  /**
   * Start periodic BATCH updates using timer-based system (saves cycles!)
   */
  private startPeriodicUpdates(): void {
    if (this.isInitialized === false) return; // don't start updates until explicitly initialized
    if (this.updateIntervalHandle) return; // already started

    this.updateIntervalHandle = setInterval(async () => {
      try {
        console.log('🔄 Starting periodic BATCH update to save ICP cycles...');
        
        // Use batch refresh to get updated prices from APIs
        const symbols = this.stockData.map(s => s.id.toUpperCase());
  const updatedStocks = await getRealStockService().getMultipleStocks(symbols);
        
        if (updatedStocks.length > 0) {
          // Refresh our local stock data with updated prices
          for (const symbol of symbols) {
            const updatedStock = updatedStocks.find((s: any) => s.symbol === symbol);
            if (updatedStock) {
              const existingStock = this.stockData.find(s => s.id === symbol.toLowerCase());
              if (existingStock) {
                existingStock.currentPrice = updatedStock.price;
                existingStock.priceHistory.push(updatedStock.price);
                if (existingStock.priceHistory.length > 24) {
                  existingStock.priceHistory.shift();
                }
                existingStock.lastUpdate = Date.now();
                existingStock.businessGrowth = updatedStock.changePercent * 2;
                existingStock.volatility = Math.abs(updatedStock.changePercent) / 10 + 1;
              }
            }
          }
          console.log(`✅ BATCH update completed: ${updatedStocks.length} stocks updated`);
        } else {
          console.log('⏭️ No stocks updated from APIs');
        }
      } catch (error) {
        console.error('❌ Periodic batch update failed:', error);
      }
    }, 10 * 60 * 1000); // 10 minutes instead of 5 to save even more cycles
  }

  // Public control to start periodic updates when UI wants them
  startPeriodicUpdatesIfNeeded(): void {
    this.startPeriodicUpdates();
  }

  stopPeriodicUpdates(): void {
    if (this.updateIntervalHandle) {
      clearInterval(this.updateIntervalHandle as any);
      this.updateIntervalHandle = null;
    }
  }

  /**
   * Force refresh stock data
   */
  async refreshStockData(): Promise<void> {
    try {
  const updatedStocks = await getRealStockService().initializeRealStocks();
      
      if (updatedStocks && updatedStocks.length > 0) {
        updatedStocks.forEach((realStock: any) => {
          const existingStock = this.stockData.find(s => s.id === realStock.symbol.toLowerCase());
          if (existingStock) {
            existingStock.currentPrice = realStock.price;
            existingStock.lastUpdate = Date.now();
            existingStock.businessGrowth = realStock.changePercent * 2;
            existingStock.volatility = Math.abs(realStock.changePercent) / 10 + 1;
          }
        });
        console.log('✅ Refreshed stock data manually');
      }
    } catch (error) {
      console.error('❌ Failed to refresh stock data:', error);
      throw error;
    }
  }

  // internal handle for setInterval so we can stop it
  private updateIntervalHandle: NodeJS.Timeout | null = null;
}

// Export singleton instance
export const stockMarketService = new StockMarketService();
export default stockMarketService;
