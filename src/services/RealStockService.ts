// Real stock market data service using ICP Canister CoinGecko integration
// This service fetches real stock data through the ICP canister HTTP outcalls

import canisterService from './CanisterService';

interface RealStockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: number;
  peRatio: number;
  volume: number;
  sector: string;
}

// CoinGecko to stock symbol mapping
interface CoinGeckoTokenMapping {
  coinId: string;
  symbol: string;
  name: string;
  sector: string;
}

class RealStockService {
  private cache: Map<string, { data: RealStockData; timestamp: number }> = new Map();
  private cacheTimeout = 300000; // 5 minute cache for canister calls

  // Popular crypto tokens that can represent "stocks" in the game
  private cryptoToStockMapping: CoinGeckoTokenMapping[] = [
    { coinId: 'bitcoin', symbol: 'BTC', name: 'Bitcoin Corp', sector: 'Technology' },
    { coinId: 'ethereum', symbol: 'ETH', name: 'Ethereum Inc', sector: 'Technology' },
    { coinId: 'binancecoin', symbol: 'BNB', name: 'Binance Ltd', sector: 'Financial' },
    { coinId: 'cardano', symbol: 'ADA', name: 'Cardano Systems', sector: 'Technology' },
    { coinId: 'solana', symbol: 'SOL', name: 'Solana Labs', sector: 'Technology' },
    { coinId: 'chainlink', symbol: 'LINK', name: 'ChainLink Corp', sector: 'Technology' },
    { coinId: 'polygon', symbol: 'MATIC', name: 'Polygon Tech', sector: 'Technology' },
    { coinId: 'uniswap', symbol: 'UNI', name: 'Uniswap Labs', sector: 'Financial' }
  ];

  constructor() {
    console.log('RealStockService initialized with ICP CoinGecko integration');
  }

  /**
   * Get real stock data for a given symbol using ICP canister
   */
  async getStockData(symbol: string): Promise<RealStockData | null> {
    try {
      // Check cache first
      const cached = this.cache.get(symbol);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }

      // Find corresponding crypto token for this "stock" symbol
      const mapping = this.cryptoToStockMapping.find(m => m.symbol === symbol.toUpperCase());
      if (!mapping) {
        console.warn(`No mapping found for symbol: ${symbol}`);
        return null;
      }

      // Call ICP canister to get crypto price from CoinGecko
      if (!canisterService.isConnected()) {
        await canisterService.initialize();
      }

      const actor = (canisterService as any).actor;
      if (!actor) {
        console.error('Canister actor not available');
        return null;
      }

      // Call the canister's fetch_external_price method (this fetches from CoinGecko)
      let result;
      try {
        result = await actor.fetch_external_price(mapping.coinId);
      } catch (error) {
        console.error(`Failed to fetch price for ${mapping.coinId}:`, error);
        return null;
      }

      if (!result || !('Ok' in result)) {
        console.warn(`No price data returned for ${mapping.coinId}`);
        return null;
      }

      const price = result.Ok;
      
      // Convert to INR (approximate) and format as stock data
      const priceInINR = price * 83; // Approximate USD to INR conversion
      
      // Generate realistic stock-like metrics based on crypto data
      const stockData: RealStockData = {
        symbol: mapping.symbol,
        name: mapping.name,
        price: Math.round(priceInINR * 100) / 100,
        change: (Math.random() - 0.5) * 200, // Random change for now
        changePercent: (Math.random() - 0.5) * 10,
        marketCap: price * 1000000000, // Simulated market cap
        peRatio: 15 + Math.random() * 20, // Simulated P/E ratio
        volume: Math.floor(Math.random() * 1000000),
        sector: mapping.sector
      };

      // Cache the data
      this.cache.set(symbol, { data: stockData, timestamp: Date.now() });

      // Store in canister for persistence
      await this.storeInCanister(stockData);

      return stockData;
    } catch (error) {
      console.error(`Failed to fetch stock data for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get multiple stocks at once using batch crypto price fetching
   */
  async getMultipleStocks(symbols: string[]): Promise<RealStockData[]> {
    const results: RealStockData[] = [];
    
    try {
      // Find mappings for all requested symbols
      const mappings = symbols.map(symbol => 
        this.cryptoToStockMapping.find(m => m.symbol === symbol.toUpperCase())
      ).filter(Boolean);

      if (mappings.length === 0) {
        console.warn('No mappings found for symbols:', symbols);
        return results;
      }

      // Create comma-separated list of coin IDs for batch fetching
      const coinIds = mappings.map(m => m!.coinId).join(',');

      // Call ICP canister to get multiple crypto prices at once
      if (!canisterService.isConnected()) {
        await canisterService.initialize();
      }

      const actor = (canisterService as any).actor;
      if (!actor || !actor.fetch_multiple_crypto_prices) {
        console.error('Canister actor or method not available');
        // Fallback to individual fetching
        return this.getMultipleStocksIndividually(symbols);
      }

      const result = await actor.fetch_multiple_crypto_prices(coinIds);
      
      if (!result || !('Ok' in result)) {
        console.warn('No price data returned for batch request');
        return this.getMultipleStocksIndividually(symbols);
      }

      const priceData = result.Ok; // Array of [coinId, price] tuples

      // Convert each price to stock data
      for (const [coinId, price] of priceData) {
        const mapping = mappings.find(m => m!.coinId === coinId);
        if (!mapping) continue;

        // Convert to INR and format as stock data
        const priceInINR = price * 83;
        
        const stockData: RealStockData = {
          symbol: mapping.symbol,
          name: mapping.name,
          price: Math.round(priceInINR * 100) / 100,
          change: (Math.random() - 0.5) * 200,
          changePercent: (Math.random() - 0.5) * 10,
          marketCap: price * 1000000000,
          peRatio: 15 + Math.random() * 20,
          volume: Math.floor(Math.random() * 1000000),
          sector: mapping.sector
        };

        // Cache the data
        this.cache.set(mapping.symbol, { data: stockData, timestamp: Date.now() });
        results.push(stockData);
      }

      console.log(`Batch fetched ${results.length} stocks via ICP canister`);
      return results;

    } catch (error) {
      console.error('Batch crypto price fetch failed, falling back to individual:', error);
      return this.getMultipleStocksIndividually(symbols);
    }
  }

  /**
   * Fallback method for individual stock fetching
   */
  private async getMultipleStocksIndividually(symbols: string[]): Promise<RealStockData[]> {
    const results: RealStockData[] = [];
    
    // Process in batches to avoid overwhelming the canister
    for (const symbol of symbols) {
      const data = await this.getStockData(symbol);
      if (data) {
        results.push(data);
      }
      // Add small delay between requests
      await this.delay(500);
    }

    return results;
  }

  /**
   * Store stock data in the canister
   */
  private async storeInCanister(stockData: RealStockData): Promise<void> {
    try {
      if (!canisterService.isConnected()) {
        await canisterService.initialize();
      }

      // Store the converted stock data in canister
      console.log('Storing stock data in canister:', stockData.symbol, stockData.price);
      
      // For now, just log since we're storing crypto prices, not stock prices
      // In a real implementation, you might want to add a separate method to store converted stock data
      
    } catch (error) {
      console.error('Failed to store stock data in canister:', error);
    }
  }

  /**
   * Delay utility for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get popular stocks for the game (mapped from crypto)
   */
  getPopularStocks(): string[] {
    return this.cryptoToStockMapping.map(mapping => mapping.symbol);
  }

  /**
   * Initialize with real stock data using ICP canister
   */
  async initializeRealStocks(): Promise<RealStockData[]> {
    const popularSymbols = this.getPopularStocks();
    console.log('Fetching real stock data via ICP canister CoinGecko integration...');
    
    const realStocks = await this.getMultipleStocks(popularSymbols);
    console.log(`Fetched ${realStocks.length} stocks via ICP canister`);
    
    return realStocks;
  }

  /**
   * Update prices from external APIs via ICP canister
   */
  async updatePricesFromCanister(): Promise<number> {
    try {
      if (!canisterService.isConnected()) {
        await canisterService.initialize();
      }

      const actor = (canisterService as any).actor;
      if (!actor || !actor.update_prices_from_external) {
        console.error('Canister method update_prices_from_external not available');
        return 0;
      }

      const result = await actor.update_prices_from_external();
      
      if (result && 'Ok' in result) {
        console.log(`Updated ${result.Ok} prices from external APIs via canister`);
        return result.Ok;
      } else {
        console.error('Failed to update prices:', result);
        return 0;
      }
    } catch (error) {
      console.error('Failed to update prices from canister:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const realStockService = new RealStockService();
export default realStockService;
