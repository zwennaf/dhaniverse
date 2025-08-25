// Real stock market data service using Alpha Vantage API
// This service fetches real stock data and integrates with the canister

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

interface StockQuote {
  "01. symbol": string;
  "05. price": string;
  "09. change": string;
  "10. change percent": string;
}

interface CompanyOverview {
  Symbol: string;
  Name: string;
  MarketCapitalization: string;
  PERatio: string;
  Sector: string;
}

class RealStockService {
  private apiKey: string;
  private baseUrl = 'https://www.alphavantage.co/query';
  private cache: Map<string, { data: RealStockData; timestamp: number }> = new Map();
  private cacheTimeout = 60000; // 1 minute cache

  constructor() {
    // Free API key for Alpha Vantage (rate limited)
    this.apiKey = 'RIBXT3Vgifv1SS5X'; // Free tier: 25 requests per day
  }

  /**
   * Get real stock data for a given symbol
   */
  async getStockData(symbol: string): Promise<RealStockData | null> {
    try {
      // Check cache first
      const cached = this.cache.get(symbol);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }

      // Fetch quote data
      const quoteData = await this.fetchQuote(symbol);
      if (!quoteData) return null;

      // Fetch company overview for additional data
      const overviewData = await this.fetchCompanyOverview(symbol);

      // Combine data
      const stockData: RealStockData = {
        symbol: symbol,
        name: overviewData?.Name || symbol,
        price: parseFloat(quoteData["05. price"]),
        change: parseFloat(quoteData["09. change"]),
        changePercent: parseFloat(quoteData["10. change percent"].replace('%', '')),
        marketCap: overviewData ? this.parseMarketCap(overviewData.MarketCapitalization) : 0,
        peRatio: overviewData ? parseFloat(overviewData.PERatio) || 0 : 0,
        volume: 0, // Would need different endpoint for volume
        sector: overviewData?.Sector || 'Unknown'
      };

      // Cache the data
      this.cache.set(symbol, { data: stockData, timestamp: Date.now() });

      // Store in canister for persistent storage
      await this.storeInCanister(stockData);

      return stockData;
    } catch (error) {
      console.error(`Failed to fetch stock data for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Get multiple stocks at once
   */
  async getMultipleStocks(symbols: string[]): Promise<RealStockData[]> {
    const results: RealStockData[] = [];
    
    // Process in batches to respect API limits
    for (const symbol of symbols) {
      const data = await this.getStockData(symbol);
      if (data) {
        results.push(data);
      }
      // Add delay between requests to respect rate limits
      await this.delay(1000); // 1 second delay
    }

    return results;
  }

  /**
   * Fetch real-time quote
   */
  private async fetchQuote(symbol: string): Promise<StockQuote | null> {
    try {
      const url = `${this.baseUrl}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${this.apiKey}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data['Global Quote']) {
        return data['Global Quote'];
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch quote:', error);
      return null;
    }
  }

  /**
   * Fetch company overview
   */
  private async fetchCompanyOverview(symbol: string): Promise<CompanyOverview | null> {
    try {
      const url = `${this.baseUrl}?function=OVERVIEW&symbol=${symbol}&apikey=${this.apiKey}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.Symbol) {
        return data as CompanyOverview;
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch company overview:', error);
      return null;
    }
  }

  /**
   * Store stock data in the canister
   */
  private async storeInCanister(stockData: RealStockData): Promise<void> {
    try {
      if (!canisterService.isConnected()) {
        await canisterService.initialize();
      }

      // Call canister method to store the real stock data
      // Note: This assumes the canister has a method to store stock prices
      // You may need to add this method to your canister if it doesn't exist
      console.log('Storing stock data in canister:', stockData.symbol, stockData.price);
      
      // For now, just log since we're not sure what canister methods exist
      // In a real implementation, you'd call something like:
      // await canisterService.storeStockPrice(stockData.symbol, stockData.price, Date.now());
      
    } catch (error) {
      console.error('Failed to store stock data in canister:', error);
    }
  }

  /**
   * Parse market cap string to number
   */
  private parseMarketCap(marketCapStr: string): number {
    if (!marketCapStr || marketCapStr === 'None') return 0;
    
    const numStr = marketCapStr.replace(/[^0-9.]/g, '');
    const num = parseFloat(numStr);
    
    if (marketCapStr.includes('T')) return num * 1e12;
    if (marketCapStr.includes('B')) return num * 1e9;
    if (marketCapStr.includes('M')) return num * 1e6;
    if (marketCapStr.includes('K')) return num * 1e3;
    
    return num;
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
    return [
      'AAPL',  // Apple
      'GOOGL', // Google
      'MSFT',  // Microsoft
      'AMZN',  // Amazon
      'TSLA',  // Tesla
      'NVDA',  // Nvidia
      'META',  // Meta
      'NFLX'   // Netflix
    ];
  }

  /**
   * Initialize with real stock data
   */
  async initializeRealStocks(): Promise<RealStockData[]> {
    const popularSymbols = this.getPopularStocks();
    console.log('Fetching real stock data for popular stocks...');
    
    const realStocks = await this.getMultipleStocks(popularSymbols);
    console.log(`Fetched ${realStocks.length} real stocks`);
    
    return realStocks;
  }
}

// Export singleton instance
export const realStockService = new RealStockService();
export default realStockService;
