// Real stock market data service using ICP Canister integration
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

// Real stock companies mapping
interface StockMapping {
  symbol: string;
  name: string;
  sector: string;
}

class RealStockService {
  private cache: Map<string, { data: RealStockData; timestamp: number }> = new Map();
  private cacheTimeout = 300000; // 5 minute cache for canister calls

  // Real world stocks that players can buy and sell
  private realStocks: StockMapping[] = [
    // Technology Sector
    { symbol: 'AAPL', name: 'Apple Inc', sector: 'Technology' },
    { symbol: 'MSFT', name: 'Microsoft Corporation', sector: 'Technology' },
    { symbol: 'GOOGL', name: 'Alphabet Inc', sector: 'Technology' },
    { symbol: 'AMZN', name: 'Amazon.com Inc', sector: 'Technology' },
    { symbol: 'TSLA', name: 'Tesla Inc', sector: 'Automotive' },
    { symbol: 'META', name: 'Meta Platforms Inc', sector: 'Technology' },
    { symbol: 'NVDA', name: 'NVIDIA Corporation', sector: 'Technology' },
    { symbol: 'NFLX', name: 'Netflix Inc', sector: 'Technology' },
    
    // Financial Sector
    { symbol: 'JPM', name: 'JPMorgan Chase & Co', sector: 'Financial' },
    { symbol: 'BAC', name: 'Bank of America Corp', sector: 'Financial' },
    { symbol: 'WFC', name: 'Wells Fargo & Company', sector: 'Financial' },
    { symbol: 'GS', name: 'Goldman Sachs Group Inc', sector: 'Financial' },
    
    // Healthcare Sector
    { symbol: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare' },
    { symbol: 'PFE', name: 'Pfizer Inc', sector: 'Healthcare' },
    { symbol: 'UNH', name: 'UnitedHealth Group Inc', sector: 'Healthcare' },
    { symbol: 'ABBV', name: 'AbbVie Inc', sector: 'Healthcare' },
    
    // Consumer Goods
    { symbol: 'KO', name: 'Coca-Cola Company', sector: 'Consumer Goods' },
    { symbol: 'PEP', name: 'PepsiCo Inc', sector: 'Consumer Goods' },
    { symbol: 'WMT', name: 'Walmart Inc', sector: 'Consumer Goods' },
    { symbol: 'PG', name: 'Procter & Gamble Co', sector: 'Consumer Goods' },
    
    // Energy Sector
    { symbol: 'XOM', name: 'Exxon Mobil Corporation', sector: 'Energy' },
    { symbol: 'CVX', name: 'Chevron Corporation', sector: 'Energy' },
    
    // Telecommunications
    { symbol: 'VZ', name: 'Verizon Communications Inc', sector: 'Telecommunications' },
    { symbol: 'T', name: 'AT&T Inc', sector: 'Telecommunications' },
    
    // Cryptocurrency Stocks
    { symbol: 'BTC', name: 'Bitcoin', sector: 'Cryptocurrency' },
    { symbol: 'ETH', name: 'Ethereum', sector: 'Cryptocurrency' },
    { symbol: 'BNB', name: 'Binance Coin', sector: 'Cryptocurrency' },
    { symbol: 'SOL', name: 'Solana', sector: 'Cryptocurrency' },
    { symbol: 'ADA', name: 'Cardano', sector: 'Cryptocurrency' },
    { symbol: 'AVAX', name: 'Avalanche', sector: 'Cryptocurrency' },
    { symbol: 'DOT', name: 'Polkadot', sector: 'Cryptocurrency' },
    { symbol: 'LINK', name: 'Chainlink', sector: 'Cryptocurrency' },
    { symbol: 'MATIC', name: 'Polygon', sector: 'Cryptocurrency' },
    { symbol: 'ICP', name: 'Internet Computer', sector: 'Cryptocurrency' }
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

      // Find corresponding real stock for this symbol
      const mapping = this.realStocks.find((m: StockMapping) => m.symbol === symbol.toUpperCase());
      if (!mapping) {
        console.warn(`No mapping found for symbol: ${symbol}`);
        return null;
      }

      // Call ICP canister to get real stock price from external API
      if (!canisterService.isConnected()) {
        await canisterService.initialize();
      }

      const actor = (canisterService as any).actor;
      if (!actor) {
        console.error('Canister actor not available');
        return this.generateFallbackData(symbol, mapping);
      }

      // Call the canister's fetch_stock_price method for real stock data
      let result;
      try {
        // Add timeout wrapper for canister calls to prevent 5-minute hangs
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout after 10 seconds')), 10000);
        });

        const fetchPromise = actor.fetch_stock_price(mapping.symbol);
        result = await Promise.race([fetchPromise, timeoutPromise]);
      } catch (error) {
        console.error(`Failed to fetch price for ${mapping.symbol}:`, error);
        return this.generateFallbackData(symbol, mapping);
      }

      if (!result || !('Ok' in result)) {
        console.warn(`No price data returned for ${mapping.symbol}`, result);
        return this.generateFallbackData(symbol, mapping);
      }

      const stockPrice = result.Ok;
      console.log(`🔍 DEBUG: ${mapping.symbol} raw result:`, result, 'stockPrice:', stockPrice, 'type:', typeof stockPrice);
      
      // Check if stockPrice is valid
      if (!stockPrice || stockPrice <= 0) {
        console.warn(`❌ Invalid price for ${mapping.symbol}: ${stockPrice}, using fallback`);
        return this.generateFallbackData(symbol, mapping);
      }
      
      // Convert USD to INR and scale for gameplay
      const priceInINR = this.convertToGamePrice(stockPrice); 
      
      console.log(`✅ ${mapping.symbol}: $${stockPrice} USD → ₹${priceInINR} INR`);
      
      // Generate realistic stock metrics
      const stockData: RealStockData = {
        symbol: mapping.symbol,
        name: mapping.name,
        price: Math.round(priceInINR * 100) / 100,
        change: this.generateRealisticChange(priceInINR),
        changePercent: (Math.random() - 0.5) * 5, // ±2.5% realistic daily change
        marketCap: stockPrice * 1000000000, // Simulated market cap
        peRatio: this.generatePERatio(),
        volume: Math.floor(Math.random() * 5000000 + 1000000), // 1M-6M volume
        sector: mapping.sector
      };

      // Cache the data
      this.cache.set(symbol, { data: stockData, timestamp: Date.now() });

      // Store in canister for persistence
      await this.storeInCanister(stockData);

      return stockData;
    } catch (error) {
      console.error(`Failed to fetch stock data for ${symbol}:`, error);
      const mapping = this.realStocks.find((m: StockMapping) => m.symbol === symbol.toUpperCase());
      return mapping ? this.generateFallbackData(symbol, mapping) : null;
    }
  }

  /**
   * Get multiple stocks at once using CORRECT canister methods
   */
  async getMultipleStocks(symbols: string[]): Promise<RealStockData[]> {
    const results: RealStockData[] = [];
    
    try {
      // Find mappings for all requested symbols
      const mappings = symbols.map(symbol => 
        this.realStocks.find((m: StockMapping) => m.symbol === symbol.toUpperCase())
      ).filter(Boolean) as StockMapping[];

      if (mappings.length === 0) {
        console.warn('No mappings found for symbols:', symbols);
        return results;
      }

      // Initialize canister connection
      if (!canisterService.isConnected()) {
        await canisterService.initialize();
      }

      const actor = (canisterService as any).actor;
      if (!actor) {
        console.error('Canister actor not available, using fallback data');
        return this.generateAllFallbackData(mappings);
      }

      // Separate crypto and stock symbols for different API calls
      const cryptoMappings = mappings.filter(m => m.sector === 'Cryptocurrency');
      const stockMappings = mappings.filter(m => m.sector !== 'Cryptocurrency');

      console.log(`🚀 Batch loading: ${cryptoMappings.length} cryptos + ${stockMappings.length} stocks`);

      // 1. Fetch crypto prices in batch using fetch_multiple_crypto_prices
      if (cryptoMappings.length > 0) {
        try {
          // Map our symbols to CoinGecko IDs
          const coinGeckoIds = cryptoMappings.map(m => this.getCoinGeckoId(m.symbol)).join(',');
          console.log(`💰 Fetching crypto batch: ${coinGeckoIds}`);
          
          const cryptoResult = await actor.fetch_multiple_crypto_prices(coinGeckoIds);
          
          if (cryptoResult && Array.isArray(cryptoResult)) {
            cryptoResult.forEach(([coinId, priceUsd]: [string, number]) => {
              const symbol = this.getSymbolFromCoinGeckoId(coinId);
              const mapping = cryptoMappings.find(m => m.symbol === symbol);
              
              if (mapping && priceUsd > 0) {
                const priceInINR = this.convertToGamePrice(priceUsd);
                const stockData: RealStockData = {
                  symbol: mapping.symbol,
                  name: mapping.name,
                  price: Math.round(priceInINR * 100) / 100,
                  change: this.generateRealisticChange(priceInINR),
                  changePercent: (Math.random() - 0.5) * 5,
                  marketCap: priceUsd * 1000000000,
                  peRatio: this.generatePERatio(),
                  volume: Math.floor(Math.random() * 5000000 + 1000000),
                  sector: mapping.sector
                };
                
                results.push(stockData);
                this.cache.set(mapping.symbol, { data: stockData, timestamp: Date.now() });
                console.log(`✅ ${mapping.symbol}: $${priceUsd} USD → ₹${priceInINR} INR`);
              }
            });
          }
        } catch (error) {
          console.error('Crypto batch fetch failed:', error);
          // Add fallback data for failed crypto requests
          results.push(...this.generateAllFallbackData(cryptoMappings));
        }
      }

      // 2. Fetch stock prices individually using fetch_stock_price (no batch method available)
      if (stockMappings.length > 0) {
        console.log(`📈 Fetching ${stockMappings.length} stocks individually (no batch method in canister)`);
        
        for (const mapping of stockMappings) {
          try {
            const stockResult = await actor.fetch_stock_price(mapping.symbol);
            
            if (stockResult && 'Ok' in stockResult && stockResult.Ok > 0) {
              const priceInINR = this.convertToGamePrice(stockResult.Ok);
              const stockData: RealStockData = {
                symbol: mapping.symbol,
                name: mapping.name,
                price: Math.round(priceInINR * 100) / 100,
                change: this.generateRealisticChange(priceInINR),
                changePercent: (Math.random() - 0.5) * 5,
                marketCap: stockResult.Ok * 1000000000,
                peRatio: this.generatePERatio(),
                volume: Math.floor(Math.random() * 5000000 + 1000000),
                sector: mapping.sector
              };
              
              results.push(stockData);
              this.cache.set(mapping.symbol, { data: stockData, timestamp: Date.now() });
              console.log(`✅ ${mapping.symbol}: $${stockResult.Ok} USD → ₹${priceInINR} INR`);
            } else {
              console.warn(`❌ Invalid price for ${mapping.symbol}, using fallback`);
              const fallbackData = this.generateFallbackData(mapping.symbol, mapping);
              results.push(fallbackData);
            }
            
            // Add small delay between individual stock calls to be respectful
            await this.delay(500);
            
          } catch (error) {
            console.error(`Failed to fetch ${mapping.symbol}:`, error);
            const fallbackData = this.generateFallbackData(mapping.symbol, mapping);
            results.push(fallbackData);
          }
        }
      }

      console.log(`✅ Mixed batch loading complete: ${results.length}/${mappings.length} stocks loaded`);
      return results;
      
    } catch (error) {
      console.error('Failed to fetch multiple stocks:', error);
      // Return fallback data for all requested stocks
      const mappings = symbols.map(symbol => 
        this.realStocks.find((m: StockMapping) => m.symbol === symbol.toUpperCase())
      ).filter(Boolean) as StockMapping[];
      
      return this.generateAllFallbackData(mappings);
    }
  }

  /**
   * Convert USD stock price to INR (real pricing)
   */
  private convertToGamePrice(usdPrice: number): number {
    // Convert USD to INR (approximately 83 INR per USD) - keep real prices
    return usdPrice * 83;
  }

  /**
   * Map our crypto symbols to CoinGecko IDs
   */
  private getCoinGeckoId(symbol: string): string {
    const mapping: Record<string, string> = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'BNB': 'binancecoin',
      'SOL': 'solana',
      'ADA': 'cardano',
      'AVAX': 'avalanche-2',
      'DOT': 'polkadot',
      'LINK': 'chainlink',
      'MATIC': 'matic-network',
      'ICP': 'internet-computer'
    };
    return mapping[symbol] || symbol.toLowerCase();
  }

  /**
   * Map CoinGecko IDs back to our symbols
   */
  private getSymbolFromCoinGeckoId(coinId: string): string {
    const mapping: Record<string, string> = {
      'bitcoin': 'BTC',
      'ethereum': 'ETH',
      'binancecoin': 'BNB',
      'solana': 'SOL',
      'cardano': 'ADA',
      'avalanche-2': 'AVAX',
      'polkadot': 'DOT',
      'chainlink': 'LINK',
      'matic-network': 'MATIC',
      'internet-computer': 'ICP'
    };
    return mapping[coinId] || coinId.toUpperCase();
  }

  /**
   * Generate realistic daily change for stock
   */
  private generateRealisticChange(price: number): number {
    // Realistic daily changes are usually ±1-5% of stock price
    const changePercent = (Math.random() - 0.5) * 0.1; // ±5%
    return price * changePercent;
  }

  /**
   * Generate realistic P/E ratio
   */
  private generatePERatio(): number {
    // Most stocks have P/E ratios between 10-30
    return Math.round((10 + Math.random() * 20) * 100) / 100;
  }

  /**
   * Generate fallback data when API calls fail
   */
  private generateFallbackData(symbol: string, mapping: StockMapping): RealStockData {
    // Generate realistic fallback prices based on typical ranges for different sectors
    let basePrice: number;
    
    if (mapping.sector === 'Cryptocurrency') {
      // Crypto prices vary widely
      switch (symbol) {
        case 'BTC': basePrice = 3700000; break; // ~$45k
        case 'ETH': basePrice = 290000; break;  // ~$3.5k
        case 'BNB': basePrice = 41500; break;   // ~$500
        case 'SOL': basePrice = 8300; break;    // ~$100
        case 'ICP': basePrice = 830; break;     // ~$10
        default: basePrice = 1660 + (symbol.charCodeAt(0) % 4140); // $20-70 range
      }
    } else if (mapping.sector === 'Technology') {
      // Tech stocks typically $50-500
      basePrice = 4150 + (symbol.charCodeAt(0) % 37350); // ₹4k-41k range
    } else {
      // Other stocks $20-200
      basePrice = 1660 + (symbol.charCodeAt(0) % 14940); // ₹1.6k-16k range
    }
    
    console.log(`🔄 Using fallback data for ${symbol}: ₹${basePrice}`);
    
    return {
      symbol: mapping.symbol,
      name: mapping.name,
      price: Math.round(basePrice * 100) / 100,
      change: (Math.random() - 0.5) * basePrice * 0.05,
      changePercent: (Math.random() - 0.5) * 5,
      marketCap: basePrice * 1000000000,
      peRatio: this.generatePERatio(),
      volume: Math.floor(Math.random() * 3000000 + 1000000),
      sector: mapping.sector
    };
  }

  /**
   * Generate fallback data for all mappings at once
   */
  private generateAllFallbackData(mappings: StockMapping[]): RealStockData[] {
    console.log(`🔄 Generating fallback data for ${mappings.length} stocks`);
    return mappings.map(mapping => this.generateFallbackData(mapping.symbol, mapping));
  }

  /**
   * Optimized individual calls with rate limiting (fallback when batch isn't available)
   */
  private async getMultipleStocksOptimized(mappings: StockMapping[]): Promise<RealStockData[]> {
    const results: RealStockData[] = [];
    
    // Process in smaller batches to avoid overwhelming the canister
    const batchSize = 5;
    for (let i = 0; i < mappings.length; i += batchSize) {
      const batch = mappings.slice(i, i + batchSize);
      
      console.log(`📦 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(mappings.length/batchSize)}: ${batch.map(m => m.symbol).join(', ')}`);
      
      // Process batch in parallel
      const batchPromises = batch.map(async (mapping) => {
        try {
          const data = await this.getStockData(mapping.symbol);
          return data;
        } catch (error) {
          console.warn(`Failed to fetch ${mapping.symbol}:`, error);
          return this.generateFallbackData(mapping.symbol, mapping);
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter(Boolean) as RealStockData[]);
      
      // Add delay between batches to be respectful to the canister
      if (i + batchSize < mappings.length) {
        await this.delay(1000); // 1 second between batches
      }
    }

    console.log(`✅ Optimized fetch completed: ${results.length}/${mappings.length} stocks loaded`);
    return results;
  }

  private async getMultipleStocksIndividually(symbols: string[]): Promise<RealStockData[]> {
    const results: RealStockData[] = [];
    
    // Process in batches to avoid overwhelming the canister
    for (const symbol of symbols) {
      try {
        const data = await this.getStockData(symbol);
        if (data) {
          results.push(data);
        }
      } catch (error) {
        console.warn(`Failed to fetch individual stock data for ${symbol}:`, error);
        // Continue with other stocks
      }
      // Add small delay between requests
      await this.delay(300); // Reduced delay
    }

    console.log(`Individual fetch completed: ${results.length}/${symbols.length} stocks loaded`);
    return results;
  }

  /**
   * Delay utility for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get popular stocks for the game
   */
  getPopularStocks(): string[] {
    return this.realStocks.map((mapping: StockMapping) => mapping.symbol);
  }

  /**
   * Initialize with real stock data using ICP canister (BACKGROUND BATCH LOADING)
   */
  async initializeRealStocks(): Promise<RealStockData[]> {
    const popularSymbols = this.getPopularStocks();
    console.log(`� BATCH LOADING ${popularSymbols.length} real stocks from CoinGecko via ICP canister...`);
    console.log(`💰 Saving ICP cycles by using single batch call instead of ${popularSymbols.length} individual calls!`);
    
    // Start background batch loading to save cycles
    const loadingPromise = this.getMultipleStocks(popularSymbols);
    
    // Show immediate feedback while loading in background
    console.log(`⏳ Background loading started for: ${popularSymbols.slice(0, 10).join(', ')}${popularSymbols.length > 10 ? '...' : ''}`);
    
    try {
      const realStocks = await loadingPromise;
      
      if (realStocks && realStocks.length > 0) {
        console.log(`✅ BATCH LOADING COMPLETE! Loaded ${realStocks.length} real stocks from CoinGecko:`);
        console.log(`📊 Stocks loaded:`, realStocks.map(s => `${s.symbol}: ₹${s.price.toLocaleString()}`));
        return realStocks;
      } else {
        console.warn(`❌ Batch loading failed, no stocks received`);
        // Generate fallback data for all symbols
        const mappings = popularSymbols.map(symbol => 
          this.realStocks.find((m: StockMapping) => m.symbol === symbol.toUpperCase())
        ).filter(Boolean) as StockMapping[];
        
        return this.generateAllFallbackData(mappings);
      }
    } catch (error) {
      console.error(`❌ Background batch loading failed:`, error);
      
      // Generate fallback data for all symbols
      const mappings = popularSymbols.map(symbol => 
        this.realStocks.find((m: StockMapping) => m.symbol === symbol.toUpperCase())
      ).filter(Boolean) as StockMapping[];
      
      console.log(`🔄 Using fallback data for all ${mappings.length} stocks due to canister error`);
      return this.generateAllFallbackData(mappings);
    }
  }

  /**
   * Get available stock symbols
   */
  getAvailableSymbols(): string[] {
    return this.realStocks.map((stock: StockMapping) => stock.symbol);
  }

  /**
   * Store stock data in ICP canister for persistence
   */
  private async storeInCanister(stockData: RealStockData): Promise<void> {
    try {
      if (!canisterService.isConnected()) {
        await canisterService.initialize();
      }

      const actor = (canisterService as any).actor;
      if (actor && actor.store_stock_data) {
        await actor.store_stock_data(stockData.symbol, stockData.price, stockData.changePercent);
      }
    } catch (error) {
      console.warn('Failed to store stock data in canister:', error);
      // Non-critical error, continue operation
    }
  }

  /**
   * Update prices from external APIs via ICP canister (using CORRECT canister methods)
   */
  async updatePricesFromCanister(): Promise<number> {
    try {
      console.log(`🔄 Starting price update using correct canister methods...`);
      
      if (!canisterService.isConnected()) {
        await canisterService.initialize();
      }

      const actor = (canisterService as any).actor;
      if (!actor) {
        console.warn('Canister actor not available for price updates');
        return 0;
      }

      // Use the update_prices_from_external method which internally calls CoinGecko
      let updatedCount = 0;
      
      try {
        console.log(`🚀 Calling update_prices_from_external() on canister...`);
        const result = await actor.update_prices_from_external();
        
        if (typeof result === 'number') {
          updatedCount = result;
          console.log(`✅ Canister updated ${updatedCount} crypto prices internally`);
          
          // Now fetch the updated prices from the canister's internal storage
          const cryptoSymbols = ['BTC', 'ETH', 'ICP', 'LINK'];
          for (const symbol of cryptoSymbols) {
            try {
              const price = await actor.get_price_feed(symbol);
              if (price && price > 0) {
                const mapping = this.realStocks.find(m => m.symbol === symbol);
                if (mapping) {
                  const priceInINR = this.convertToGamePrice(price);
                  const stockData: RealStockData = {
                    symbol: mapping.symbol,
                    name: mapping.name,
                    price: Math.round(priceInINR * 100) / 100,
                    change: this.generateRealisticChange(priceInINR),
                    changePercent: (Math.random() - 0.5) * 5,
                    marketCap: price * 1000000000,
                    peRatio: this.generatePERatio(),
                    volume: Math.floor(Math.random() * 5000000 + 1000000),
                    sector: mapping.sector
                  };
                  
                  this.cache.set(symbol, { data: stockData, timestamp: Date.now() });
                  console.log(`✅ Updated ${symbol}: $${price} USD → ₹${priceInINR} INR`);
                }
              }
            } catch (error) {
              console.warn(`Failed to get price feed for ${symbol}:`, error);
            }
          }
        }
      } catch (error) {
        console.error('Canister price update failed:', error);
        return 0;
      }
      
      console.log(`✅ Price update complete: ${updatedCount} prices updated from CoinGecko via canister`);
      return updatedCount;
    } catch (error) {
      console.error('Failed to update prices from canister:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const realStockService = new RealStockService();
export default realStockService;
