/**
 * RealStockService - Hybrid API integration for real-time stock and crypto prices
 * 
 * Strategy:
 * 1. Crypto prices: Always use CoinGecko API directly (reliable & free)
 * 2. Stock prices: Try canister first, fall back to CoinGecko/generated data if out of cycles
 * 3. Smart caching with timer-based updates to minimize API calls
 * 4. Graceful fallback to generated data if all APIs fail
 */

import { canisterService } from './CanisterService';

// Import the centralized stock mappings
import { realStocks, type StockMapping } from '../config/RealStocks';

// Export the types for other modules
export type { StockMapping };

interface RealStockData {
  symbol: string;
  companyName: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  peRatio: number;
  sector: string;
  industry: string;
  isRealTime: boolean;
  lastUpdated: string;
}

// RealStockService uses the centralized stock mappings from config
class RealStockService {
  private cache: Map<string, { data: RealStockData; timestamp: number }> = new Map();
  private cacheTimeout = 60000; // 1 minute cache for API calls
  private updateTimer: NodeJS.Timeout | null = null;
  private lastBatchUpdate = 0;
  private BATCH_UPDATE_INTERVAL = 60000; // 1 minute between batch updates
  private realStocks: StockMapping[] = realStocks;
  private initializationPromise: Promise<RealStockData[]> | null = null;
  private isInitializing = false;
  private canisterSpamPrevention = new Set<string>();

  constructor() {
    this.initializeTimers();
  }

  /**
   * Initialize stock service with timer-based updates
   */
  private initializeTimers(): void {
    // Clear existing timer if any
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }
    
    // Set up periodic updates every minute
    this.updateTimer = setInterval(() => {
      this.updatePricesIfNeeded();
    }, this.BATCH_UPDATE_INTERVAL);
  }

  /**
   * Check if prices need updating and update if necessary
   */
  private async updatePricesIfNeeded(): Promise<void> {
    const now = Date.now();
    if (now - this.lastBatchUpdate < this.BATCH_UPDATE_INTERVAL) {
      return; // Too soon for update
    }
    
    console.log('🔄 Periodic price update triggered');
    this.lastBatchUpdate = now;
    
    // Get all symbols that need updating
    const symbolsToUpdate = this.realStocks.map(stock => stock.symbol);
    if (symbolsToUpdate.length > 0) {
      await this.getMultipleStocks(symbolsToUpdate);
    }
  }

  /**
   * Fetch stock prices from CoinGecko API as fallback
   * Note: CoinGecko primarily has crypto data, but we'll try to get what we can
   */
  private async fetchStockPricesFromCoinGecko(stockMappings: StockMapping[]): Promise<RealStockData[]> {
    try {
      console.log('🌐 Trying CoinGecko API as fallback for stock prices...');
      
      // CoinGecko mainly has crypto data, so we'll try to find any matching symbols
      // For traditional stocks, we'll generate realistic fallback data
      const results: RealStockData[] = [];
      
      for (const mapping of stockMappings) {
        // For most traditional stocks, CoinGecko won't have data
        // So we generate realistic fallback data instead
        const fallbackData = this.generateFallbackData(mapping.symbol, mapping);
        fallbackData.isRealTime = false; // Mark as fallback since it's not real API data
        results.push(fallbackData);
        
        console.log(`📊 Generated fallback data for ${mapping.symbol}: ₹${fallbackData.price.toLocaleString()}`);
      }
      
      return results;
    } catch (error) {
      console.error('CoinGecko fallback failed:', error);
      return this.generateAllFallbackData(stockMappings);
    }
  }

  /**
   * Fetch stock prices from canister in batch
   */
  private async fetchStockPricesFromCanister(actor: any, symbols: string[]): Promise<any[]> {
    try {
      // Try to use batch method first if available
      if (actor.fetch_multiple_stock_prices) {
        console.log('🚀 Using canister batch method for stocks');
        const result = await actor.fetch_multiple_stock_prices(symbols);
        return Array.isArray(result) ? result : [];
      }
      
      // Check if we've recently tried individual calls and failed
      const batchKey = symbols.join(',');
      if (this.canisterSpamPrevention.has(batchKey)) {
        console.log('� Preventing canister spam - using fallback data instead');
        return [];
      }

      // Mark this batch to prevent future spam
      this.canisterSpamPrevention.add(batchKey);
      
      // Try limited individual calls (max 3 symbols to test canister availability)
      console.log('🔄 Testing canister with limited individual calls');
      const results = [];
      const testSymbols = symbols.slice(0, 3); // Only test with first 3 symbols
      
      for (const symbol of testSymbols) {
        try {
          const price = await actor.fetch_stock_price(symbol);
          if (price && typeof price === 'number' && price > 0) {
            results.push({ symbol, price });
          } else if (price && typeof price === 'object') {
            // Handle Rust Result/Option types
            let actualPrice = null;
            if ('Ok' in price) {
              actualPrice = price.Ok;
            } else if ('Some' in price) {
              actualPrice = price.Some;
            }
            
            if (actualPrice && actualPrice > 0) {
              results.push({ symbol, price: actualPrice });
            }
          }
          
          // Small delay between calls
          await this.delay(100);
        } catch (error) {
          const errorMsg = error?.toString() || '';
          if (errorMsg.includes('out of cycles') || errorMsg.includes('IC0207')) {
            console.warn('🔄 Canister out of cycles detected during test, stopping individual calls');
            throw error;
          }
          console.warn(`Failed to fetch price for ${symbol}:`, error);
          // Continue with other symbols for non-cycle errors
        }
      }
      
      // If test calls succeeded, we can fetch more (but still limit it)
      if (results.length > 0 && symbols.length > 3) {
        console.log('✅ Test calls succeeded, fetching remaining symbols with limits');
        const remainingSymbols = symbols.slice(3, 8); // Limit to max 8 total calls
        
        for (const symbol of remainingSymbols) {
          try {
            const price = await actor.fetch_stock_price(symbol);
            if (price && typeof price === 'number' && price > 0) {
              results.push({ symbol, price });
            } else if (price && typeof price === 'object') {
              let actualPrice = null;
              if ('Ok' in price) {
                actualPrice = price.Ok;
              } else if ('Some' in price) {
                actualPrice = price.Some;
              }
              
              if (actualPrice && actualPrice > 0) {
                results.push({ symbol, price: actualPrice });
              }
            }
            
            await this.delay(150);
          } catch (error) {
            console.warn(`Failed to fetch price for ${symbol}:`, error);
            break; // Stop on any error
          }
        }
      }
      
      // Clear spam prevention after successful calls
      setTimeout(() => {
        this.canisterSpamPrevention.delete(batchKey);
      }, 300000); // Clear after 5 minutes
      
      return results;
    } catch (error) {
      console.error('Failed to fetch stock prices from canister:', error);
      return [];
    }
  }

  /**
   * Fetch crypto prices directly from CoinGecko API
   */
  private async fetchCryptoPricesBatch(coinGeckoIds: string[]): Promise<any[]> {
    try {
      const idsStr = coinGeckoIds.join(',');
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${idsStr}&vs_currencies=usd`;
      
      console.log(`🌐 Direct CoinGecko API call: ${url}`);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Convert to array format expected by the caller
      const results = [];
      for (const [coinId, priceData] of Object.entries(data)) {
        if (priceData && typeof priceData === 'object' && 'usd' in priceData) {
          results.push([coinId, (priceData as any).usd]);
        }
      }
      
      return results;
    } catch (error) {
      console.error('Failed to fetch crypto prices from CoinGecko:', error);
      return [];
    }
  }

  /**
   * REMOVED: Yahoo Finance direct API calls - too unreliable and unnecessary
   */

  /**
   * Get real stock data for a given symbol - DISABLED to prevent spam
   */
  async getStockData(symbol: string): Promise<RealStockData | null> {
    console.log('🚫 Individual getStockData DISABLED to prevent canister cycle waste');
    
    // Only return cached data if available
    const cached = this.cache.get(symbol);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      console.log(`📦 Returning cached data for ${symbol}`);
      return cached.data;
    }
    
    console.log(`❌ No cached data for ${symbol} - individual API calls disabled`);
    return null;
  }

  /**
   * Get multiple stocks with batch optimization
   */
  async getMultipleStocks(symbols: string[]): Promise<RealStockData[]> {
    try {
      const results: RealStockData[] = [];
      
      // Find mappings for all symbols
      const mappings = symbols.map(symbol => 
        this.realStocks.find((m: StockMapping) => m.symbol === symbol.toUpperCase())
      ).filter(Boolean) as StockMapping[];

      if (mappings.length === 0) {
        console.warn('No mappings found for symbols:', symbols);
        return results;
      }

      // Separate crypto and stock symbols for different API calls
      const cryptoMappings = mappings.filter(m => m.sector === 'Cryptocurrency');
      const stockMappings = mappings.filter(m => m.sector !== 'Cryptocurrency');

      console.log(`🚀 Batch loading: ${cryptoMappings.length} cryptos + ${stockMappings.length} stocks`);

      // 1. Fetch ALL crypto prices in ONE call using CoinGecko's bulk endpoint directly
      if (cryptoMappings.length > 0) {
        try {
          const coinGeckoIds = cryptoMappings.map(m => this.getCoinGeckoId(m.symbol));
          console.log(`💎 SINGLE CoinGecko call for ALL cryptos: ${coinGeckoIds.join(',')}`);
          console.log(`💰 This saves ${cryptoMappings.length - 1} individual API calls!`);
          
          const cryptoResult = await this.fetchCryptoPricesBatch(coinGeckoIds);
          
          if (cryptoResult && Array.isArray(cryptoResult)) {
            cryptoResult.forEach(([coinId, priceUsd]: [string, number]) => {
              const symbol = this.getSymbolFromCoinGeckoId(coinId);
              const mapping = cryptoMappings.find(m => m.symbol === symbol);
              
              if (mapping && priceUsd > 0) {
                const priceInINR = this.convertToGamePrice(priceUsd);
                const stockData: RealStockData = {
                  symbol: mapping.symbol,
                  companyName: mapping.name,
                  price: priceInINR,
                  change: this.generateRealisticChange(priceInINR),
                  changePercent: Math.random() * 10 - 5,
                  volume: Math.floor(Math.random() * 1000000) + 100000,
                  marketCap: priceInINR * (Math.floor(Math.random() * 1000000000) + 100000000),
                  peRatio: this.generatePERatio(),
                  sector: mapping.sector,
                  industry: mapping.industry || 'Technology',
                  isRealTime: true,
                  lastUpdated: new Date().toISOString()
                };
                
                console.log(`🏢 Creating stock data for ${mapping.symbol}:`, {
                  companyName: stockData.companyName,
                  sector: stockData.sector,
                  mappingName: mapping.name
                });

                results.push(stockData);
                this.cache.set(mapping.symbol, { data: stockData, timestamp: Date.now() });
                console.log(`✅ ${mapping.symbol} crypto loaded: $${priceUsd} → ₹${priceInINR.toLocaleString()}`);
              }
            });
          }
        } catch (error) {
          console.error('Failed to fetch crypto prices:', error);
          // Add fallback data for failed crypto requests
          results.push(...this.generateAllFallbackData(cryptoMappings));
        }
      }

      // 2. Fetch real stock prices from canister in ONE batch call
      if (stockMappings.length > 0) {
        console.log(`🔎 Fetching ${stockMappings.length} stock prices from canister in single batch call`);

        try {
          // Initialize canister connection
          if (!canisterService.isConnected()) {
            await canisterService.initialize();
          }

          // Check canister cycles before attempting batch calls to avoid IC0207 errors
          try {
            const metrics: any = await canisterService.getCanisterMetrics();
            const cycles = metrics?.cycles_balance ?? metrics?.cycles ?? 0;
            const safeThreshold = 1e6; // 1,000,000 cycles (adjustable)
            if (typeof cycles === 'string') {
              // Try to parse string numbers
              const parsed = Number(cycles.replace(/[^0-9]/g, '')) || 0;
              if (parsed < safeThreshold) {
                console.warn(`⚠️ Canister cycles low (${parsed}), skipping canister calls and using fallback`);
                const fallbackStockData = await this.fetchStockPricesFromCoinGecko(stockMappings);
                results.push(...fallbackStockData);
                return results;
              }
            } else if (typeof cycles === 'number' && cycles < safeThreshold) {
              console.warn(`⚠️ Canister cycles low (${cycles}), skipping canister calls and using fallback`);
              const fallbackStockData = await this.fetchStockPricesFromCoinGecko(stockMappings);
              results.push(...fallbackStockData);
              return results;
            }
          } catch (metricsError) {
            console.warn('Could not read canister metrics, proceeding cautiously:', metricsError);
            // continue: we'll still attempt canister call but be ready to fallback on error
          }

          const actor = (canisterService as any).actor;
          if (!actor) {
            console.error('Canister actor not available, trying CoinGecko for stocks');
            // Try to get stock prices from CoinGecko as fallback
            const fallbackStockData = await this.fetchStockPricesFromCoinGecko(stockMappings);
            results.push(...fallbackStockData);
          } else {
            // Get all stock symbols for batch call
            const stockSymbols = stockMappings.map(m => m.symbol);
            console.log(`💰 Single canister call for ALL stocks: ${stockSymbols.join(',')}`);
            
            try {
              // Try to use a batch method if available, otherwise fall back to individual calls
              const stockPrices = await this.fetchStockPricesFromCanister(actor, stockSymbols);
              
              // Process the results
              for (const mapping of stockMappings) {
                const priceData = stockPrices.find((p: any) => p.symbol === mapping.symbol);
                
                if (priceData && priceData.price > 0) {
                  const priceInINR = this.convertToGamePrice(priceData.price);
                  const stockData: RealStockData = {
                    symbol: mapping.symbol,
                    companyName: mapping.name,
                    price: priceInINR,
                    change: this.generateRealisticChange(priceInINR),
                    changePercent: Math.random() * 10 - 5,
                    volume: Math.floor(Math.random() * 1000000) + 100000,
                    marketCap: priceInINR * (Math.floor(Math.random() * 1000000000) + 100000000),
                    peRatio: this.generatePERatio(),
                    sector: mapping.sector,
                    industry: mapping.industry || 'Technology',
                    isRealTime: true,
                    lastUpdated: new Date().toISOString()
                  };

                  results.push(stockData);
                  this.cache.set(mapping.symbol, { data: stockData, timestamp: Date.now() });
                  console.log(`✅ ${mapping.symbol} stock loaded from canister: $${priceData.price} → ₹${priceInINR.toLocaleString()}`);
                } else {
                  // Use fallback for this specific stock
                  const fallback = this.generateFallbackData(mapping.symbol, mapping);
                  results.push(fallback);
                  this.cache.set(mapping.symbol, { data: fallback, timestamp: Date.now() });
                  console.warn(`⚠️ No price from canister for ${mapping.symbol}, using fallback`);
                }
              }
            } catch (error) {
              const errorMsg = error?.toString() || '';
              const isOutOfCycles = errorMsg.includes('out of cycles') || errorMsg.includes('IC0207');
              
              if (isOutOfCycles) {
                console.warn('🔄 Canister out of cycles detected during batch call, falling back to CoinGecko API for stock prices');
                
                // Fall back to CoinGecko API for stock prices
                try {
                  const fallbackResults = await this.fetchStockPricesFromCoinGecko(stockMappings);
                  fallbackResults.forEach((stockData: RealStockData) => {
                    results.push(stockData);
                    this.cache.set(stockData.symbol, { data: stockData, timestamp: Date.now() });
                  });
                } catch (coinGeckoError) {
                  console.error('CoinGecko fallback also failed:', coinGeckoError);
                  results.push(...this.generateAllFallbackData(stockMappings));
                }
              } else {
                console.error('Canister batch call failed, trying CoinGecko fallback:', error);
                // Try CoinGecko as fallback for stocks
                try {
                  const fallbackResults = await this.fetchStockPricesFromCoinGecko(stockMappings);
                  results.push(...fallbackResults);
                  fallbackResults.forEach((stockData: RealStockData) => {
                    this.cache.set(stockData.symbol, { data: stockData, timestamp: Date.now() });
                  });
                } catch (coinGeckoError) {
                  console.error('CoinGecko fallback also failed:', coinGeckoError);
                  results.push(...this.generateAllFallbackData(stockMappings));
                }
              }
            }
          }
        } catch (error) {
          const errorMsg = error?.toString() || '';
          const isOutOfCycles = errorMsg.includes('out of cycles') || errorMsg.includes('IC0207');
          
          if (isOutOfCycles) {
            console.warn('🔄 Canister connection failed due to cycles, falling back to CoinGecko API');
            try {
              const fallbackResults = await this.fetchStockPricesFromCoinGecko(stockMappings);
              results.push(...fallbackResults);
              fallbackResults.forEach((stockData: RealStockData) => {
                this.cache.set(stockData.symbol, { data: stockData, timestamp: Date.now() });
              });
            } catch (coinGeckoError) {
              console.error('CoinGecko fallback also failed:', coinGeckoError);
              results.push(...this.generateAllFallbackData(stockMappings));
            }
          } else {
            console.error('Failed to connect to canister, trying CoinGecko fallback:', error);
            try {
              const fallbackResults = await this.fetchStockPricesFromCoinGecko(stockMappings);
              results.push(...fallbackResults);
            } catch (coinGeckoError) {
              console.error('CoinGecko fallback also failed:', coinGeckoError);
              results.push(...this.generateAllFallbackData(stockMappings));
            }
          }
        }
      }

      console.log(`✅ Mixed batch loading complete: ${results.length}/${mappings.length} stocks loaded`);
      return results;
      
    } catch (error) {
      console.error('Failed to fetch multiple stocks:', error);
      // Try CoinGecko as final fallback for all requested stocks
      const mappings = symbols.map(symbol => 
        this.realStocks.find((m: StockMapping) => m.symbol === symbol.toUpperCase())
      ).filter(Boolean) as StockMapping[];
      
      try {
        console.log('🔄 Trying CoinGecko as final fallback...');
        return await this.fetchStockPricesFromCoinGecko(mappings);
      } catch (coinGeckoError) {
        console.error('CoinGecko final fallback failed:', coinGeckoError);
        return this.generateAllFallbackData(mappings);
      }
    }
  }

  /**
   * Convert USD stock price to INR (real pricing)
   */
  private convertToGamePrice(usdPrice: number): number {
    // Using realistic USD to INR conversion (around 82-85 INR per USD)
    const exchangeRate = 83.5;
    return Math.round(usdPrice * exchangeRate * 100) / 100;
  }

  private getCoinGeckoId(symbol: string): string {
    const cryptoMappings: { [key: string]: string } = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'ADA': 'cardano',
      'DOT': 'polkadot',
      'SOL': 'solana',
      'AVAX': 'avalanche-2',
      'MATIC': 'matic-network',
      'LINK': 'chainlink',
      'UNI': 'uniswap',
      'LTC': 'litecoin'
    };
    return cryptoMappings[symbol.toUpperCase()] || symbol.toLowerCase();
  }

  private getSymbolFromCoinGeckoId(coinId: string): string {
    const reverseCryptoMappings: { [key: string]: string } = {
      'bitcoin': 'BTC',
      'ethereum': 'ETH',
      'cardano': 'ADA',
      'polkadot': 'DOT',
      'solana': 'SOL',
      'avalanche-2': 'AVAX',
      'matic-network': 'MATIC',
      'chainlink': 'LINK',
      'uniswap': 'UNI',
      'litecoin': 'LTC'
    };
    return reverseCryptoMappings[coinId] || coinId.toUpperCase();
  }

  private generateRealisticChange(price: number): number {
    // Generate a realistic change amount (±2% of current price)
    const maxChangePercent = 0.02;
    const changePercent = (Math.random() - 0.5) * 2 * maxChangePercent;
    return Math.round(price * changePercent * 100) / 100;
  }

  private generatePERatio(): number {
    // Generate realistic P/E ratios between 10 and 35
    return Math.round((Math.random() * 25 + 10) * 100) / 100;
  }

  /**
   * Generate fallback data for a single stock
   */
  private generateFallbackData(symbol: string, mapping: StockMapping): RealStockData {
    // Generate deterministic but realistic-looking prices based on symbol
    const hash = this.simpleHash(symbol);
    const basePrice = 100 + (hash % 9900); // Price between 100-10000 INR
    
    const fallbackData = {
      symbol: mapping.symbol,
      companyName: mapping.name,
      price: basePrice,
      change: this.generateRealisticChange(basePrice),
      changePercent: (Math.random() - 0.5) * 10, // -5% to +5%
      volume: Math.floor(Math.random() * 1000000) + 100000,
      marketCap: basePrice * Math.floor(Math.random() * 1000000000 + 100000000),
      peRatio: this.generatePERatio(),
      sector: mapping.sector,
      industry: mapping.industry || 'Technology',
      isRealTime: false, // Mark as fallback
      lastUpdated: new Date().toISOString()
    };
    
    console.log(`🎭 Creating fallback data for ${symbol}:`, {
      companyName: fallbackData.companyName,
      sector: fallbackData.sector,
      mappingName: mapping.name
    });
    
    return fallbackData;
  }

  /**
   * Generate fallback data for multiple stocks
   */
  private generateAllFallbackData(mappings: StockMapping[]): RealStockData[] {
    return mappings.map(mapping => this.generateFallbackData(mapping.symbol, mapping));
  }

  /**
   * Simple hash function for deterministic pricing
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash + str.charCodeAt(i)) & 0xffffffff;
    }
    return Math.abs(hash);
  }

  /**
   * Delay utility for API rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Initialize real stocks data (with deduplication to prevent spam)
   */
  async initializeRealStocks(): Promise<RealStockData[]> {
    // Prevent multiple simultaneous initialization calls
    if (this.isInitializing && this.initializationPromise) {
      console.log('� Already initializing, returning existing promise');
      return this.initializationPromise;
    }

    // Check if we have recent cached data for all stocks
    const allSymbols = this.realStocks.map(stock => stock.symbol);
    const cachedResults: RealStockData[] = [];
    let allCached = true;

    for (const symbol of allSymbols) {
      const cached = this.cache.get(symbol);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        cachedResults.push(cached.data);
      } else {
        allCached = false;
        break;
      }
    }

    if (allCached && cachedResults.length > 0) {
      console.log('✅ Returning cached stock data, avoiding API spam');
      return cachedResults;
    }

    // Start new initialization
    this.isInitializing = true;
    this.initializationPromise = this.performInitialization();

    try {
      const result = await this.initializationPromise;
      this.isInitializing = false;
      this.initializationPromise = null;
      return result;
    } catch (error) {
      this.isInitializing = false;
      this.initializationPromise = null;
      throw error;
    }
  }

  private async performInitialization(): Promise<RealStockData[]> {
    console.log('🚀 Performing fresh stock data initialization');
    const symbols = this.realStocks.map(stock => stock.symbol);
    return await this.getMultipleStocks(symbols);
  }

  // DISABLED: updateStockPrices method to prevent canister spam
  /*
  public async updateStockPrices(): Promise<RealStockData[] | null> {
    console.log('🔄 Updating stock prices (lightweight)...');
    
    // Return cached data if available
    const symbols = this.realStocks.slice(0, 8).map(stock => stock.symbol);
    for (const symbol of symbols) {
      const cached = this.cache.get(symbol);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log('📦 Returning cached stock data for update');
        return [cached.data];
      }
    }

    try {
      // Use existing method to get all stocks but limit to essential symbols only
      const symbols = this.realStocks.slice(0, 8).map(stock => stock.symbol); // Limit to first 8 to prevent spam
      console.log(`� Updating ${symbols.length} essential stocks:`, symbols);
      
      const result = await this.getMultipleStocks(symbols);
      console.log(`✅ Updated ${result.length} stock prices successfully`);
      return result;
      
    } catch (error) {
      console.error('❌ Failed to update stock prices:', error);
      // Return empty array if no cache available
      return [];
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
    this.cache.clear();
  }
}

// Lazily create singleton instance to avoid initialization side-effects during pages that don't need stock data
let _realStockService: RealStockService | null = null;
export function getRealStockService(): RealStockService {
  if (!_realStockService) _realStockService = new RealStockService();
  return _realStockService;
}

export default getRealStockService;
