// Stock Market Service for UI components
// This service provides access to stock data without requiring Phaser scene context

import { realStockService } from './RealStockService';

export interface Stock {
  id: string;
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
    console.log('StockMarketService initialized for UI components');
  }

  /**
   * Initialize stock data from ICP canister (BACKGROUND BATCH LOADING)
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      console.log('� StockMarketService: Starting BATCH loading of real stock data...');
      console.log('💰 Using optimized batch calls to save ICP cycles!');
      
      // Start background batch loading from ICP canister
      const realStocks = await realStockService.initializeRealStocks();
      
      if (!realStocks || realStocks.length === 0) {
        throw new Error('Failed to load real stock data from ICP canister');
      }

      // Convert RealStockData to Stock interface
      this.stockData = realStocks.map((realStock: any) => ({
        id: realStock.symbol.toLowerCase(),
        name: realStock.name,
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
        eps: realStock.price / realStock.peRatio,
        outstandingShares: Math.floor(realStock.marketCap / realStock.price),
        industryAvgPE: 15 + Math.random() * 10
      }));

      this.isInitialized = true;
      console.log(`✅ StockMarketService BATCH LOADING COMPLETE!`); 
      console.log(`📊 Loaded ${this.stockData.length} real stocks:`, 
        this.stockData.map(s => `${s.name} (₹${s.currentPrice.toLocaleString()})`));
      
      // Start periodic batch updates in background
      this.startPeriodicUpdates();
      
    } catch (error) {
      console.error('❌ StockMarketService batch initialization failed:', error);
      throw error;
    }
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
   * Start periodic BATCH updates from canister (saves cycles!)
   */
  private startPeriodicUpdates(): void {
    setInterval(async () => {
      try {
        console.log('🔄 Starting periodic BATCH update to save ICP cycles...');
        
        // Use batch update method to save cycles
        const updatedCount = await realStockService.updatePricesFromCanister();
        
        if (updatedCount > 0) {
          // Refresh our local stock data with updated cache
          const symbols = this.stockData.map(s => s.id.toUpperCase());
          for (const symbol of symbols) {
            const cached = (realStockService as any).cache.get(symbol);
            if (cached) {
              const existingStock = this.stockData.find(s => s.id === symbol.toLowerCase());
              if (existingStock) {
                existingStock.currentPrice = cached.data.price;
                existingStock.priceHistory.push(cached.data.price);
                if (existingStock.priceHistory.length > 24) {
                  existingStock.priceHistory.shift();
                }
                existingStock.lastUpdate = Date.now();
                existingStock.businessGrowth = cached.data.changePercent * 2;
                existingStock.volatility = Math.abs(cached.data.changePercent) / 10 + 1;
              }
            }
          }
          console.log(`✅ BATCH update completed: ${updatedCount} stocks updated`);
        } else {
          console.log('⏭️ Skipping individual updates to save ICP cycles');
        }
      } catch (error) {
        console.error('❌ Periodic batch update failed:', error);
      }
    }, 10 * 60 * 1000); // 10 minutes instead of 5 to save even more cycles
  }

  /**
   * Force refresh stock data
   */
  async refreshStockData(): Promise<void> {
    try {
      const updatedStocks = await realStockService.initializeRealStocks();
      
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
}

// Export singleton instance
export const stockMarketService = new StockMarketService();
export default stockMarketService;
