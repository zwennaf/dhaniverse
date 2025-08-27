import { canisterService } from './CanisterService';

export interface Stock {
    id: string;
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
    sector: string;
}

interface StockMapping {
    symbol: string;
    name: string;
    sector: string;
    basePrice: number; // Fallback price in INR if API fails
}

class StockService {
    private cache = new Map<string, { price: number; timestamp: number }>();
    private cacheTimeout = 60000; // 1 minute cache
    
    private stocks: StockMapping[] = [
        // Tech Giants (scaled to realistic INR prices)
        { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology', basePrice: 19000 },        // ~$230 * 83
        { symbol: 'MSFT', name: 'Microsoft Corporation', sector: 'Technology', basePrice: 35000 }, // ~$420 * 83
        { symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Technology', basePrice: 12500 },   // ~$150 * 83
        { symbol: 'AMZN', name: 'Amazon.com Inc.', sector: 'Technology', basePrice: 14000 },  // ~$170 * 83
        { symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Automotive', basePrice: 25000 },       // ~$300 * 83
        { symbol: 'META', name: 'Meta Platforms Inc.', sector: 'Technology', basePrice: 45000 }, // ~$540 * 83
        { symbol: 'NVDA', name: 'NVIDIA Corporation', sector: 'Technology', basePrice: 120000 }, // ~$1440 * 83
        { symbol: 'NFLX', name: 'Netflix Inc.', sector: 'Entertainment', basePrice: 45000 },  // ~$540 * 83
        
        // Financial Services  
        { symbol: 'JPM', name: 'JPMorgan Chase & Co.', sector: 'Finance', basePrice: 18000 }, // ~$217 * 83
        { symbol: 'BAC', name: 'Bank of America Corp.', sector: 'Finance', basePrice: 3800 }, // ~$46 * 83
        { symbol: 'V', name: 'Visa Inc.', sector: 'Finance', basePrice: 28000 },              // ~$337 * 83
        { symbol: 'MA', name: 'Mastercard Inc.', sector: 'Finance', basePrice: 42000 },      // ~$506 * 83
        
        // Healthcare
        { symbol: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare', basePrice: 13500 }, // ~$163 * 83
        { symbol: 'PFE', name: 'Pfizer Inc.', sector: 'Healthcare', basePrice: 2900 },       // ~$35 * 83
        { symbol: 'UNH', name: 'UnitedHealth Group', sector: 'Healthcare', basePrice: 52000 }, // ~$627 * 83
        
        // Consumer Goods
        { symbol: 'KO', name: 'Coca-Cola Company', sector: 'Consumer Goods', basePrice: 6200 }, // ~$75 * 83
        { symbol: 'PEP', name: 'PepsiCo Inc.', sector: 'Consumer Goods', basePrice: 17000 },  // ~$205 * 83
        { symbol: 'WMT', name: 'Walmart Inc.', sector: 'Retail', basePrice: 8500 },           // ~$102 * 83
        
        // Energy
        { symbol: 'XOM', name: 'Exxon Mobil Corporation', sector: 'Energy', basePrice: 12000 }, // ~$145 * 83
        
        // Cryptocurrencies
        { symbol: 'BTC', name: 'Bitcoin', sector: 'Cryptocurrency', basePrice: 8200000 },
        { symbol: 'ETH', name: 'Ethereum', sector: 'Cryptocurrency', basePrice: 290000 },
        { symbol: 'BNB', name: 'Binance Coin', sector: 'Cryptocurrency', basePrice: 55000 },
        { symbol: 'SOL', name: 'Solana', sector: 'Cryptocurrency', basePrice: 18500 },
        { symbol: 'ADA', name: 'Cardano', sector: 'Cryptocurrency', basePrice: 42 },
        { symbol: 'AVAX', name: 'Avalanche', sector: 'Cryptocurrency', basePrice: 2800 },
        { symbol: 'DOT', name: 'Polkadot', sector: 'Cryptocurrency', basePrice: 680 },
        { symbol: 'LINK', name: 'Chainlink', sector: 'Cryptocurrency', basePrice: 1450 },
        { symbol: 'MATIC', name: 'Polygon', sector: 'Cryptocurrency', basePrice: 52 },
        { symbol: 'ICP', name: 'Internet Computer', sector: 'Cryptocurrency', basePrice: 980 }
    ];

    private async getPrice(symbol: string): Promise<number> {
        // Check cache first
        const cached = this.cache.get(symbol);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.price;
        }

        try {
            // Try to get real price from ICP canister with 10 second timeout
            const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error('Timeout')), 10000);
            });

            const pricePromise = canisterService.fetchExternalPrice(symbol);
            const result = await Promise.race([pricePromise, timeoutPromise]);

            if (result && typeof result === 'number' && result > 0) {
                // Convert USD to INR (approx rate) and add some variation
                const priceInINR = result * (80 + Math.random() * 6); // 80-86 INR per USD
                this.cache.set(symbol, { price: priceInINR, timestamp: Date.now() });
                console.log(`Real price for ${symbol}: $${result} = ₹${Math.round(priceInINR)}`);
                return priceInINR;
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.log(`Using base price for ${symbol} due to API issue:`, errorMessage);
        }

        // Fallback to base price with significant random variation
        const stock = this.stocks.find(s => s.symbol === symbol);
        if (stock) {
            const variation = (Math.random() - 0.5) * 0.3; // ±15% variation from base price
            const price = stock.basePrice * (1 + variation);
            this.cache.set(symbol, { price, timestamp: Date.now() });
            console.log(`Fallback price for ${symbol}: ₹${Math.round(price)} (base: ₹${stock.basePrice})`);
            return price;
        }

        return 100; // Ultimate fallback
    }

    async getAllStocks(): Promise<Stock[]> {
        console.log('Loading all stocks...');
        
        const stocks: Stock[] = [];
        
        for (const stockMapping of this.stocks) {
            try {
                const price = await this.getPrice(stockMapping.symbol);
                const peRatio = 15 + Math.random() * 20;
                const marketCap = price * (1000000 + Math.random() * 10000000);
                
                const stock: Stock = {
                    id: stockMapping.symbol.toLowerCase(),
                    name: stockMapping.name,
                    currentPrice: Math.round(price),
                    priceHistory: Array.from({ length: 15 }, (_, i) => 
                        Math.round(price * (0.95 + Math.random() * 0.1))
                    ),
                    debtEquityRatio: 0.3 + Math.random() * 1.2,
                    businessGrowth: (Math.random() - 0.5) * 10,
                    news: [],
                    marketCap: Math.round(marketCap),
                    peRatio: Math.round(peRatio * 10) / 10,
                    eps: Math.round((price / peRatio) * 100) / 100,
                    industryAvgPE: 15 + Math.random() * 10,
                    outstandingShares: Math.round(marketCap / price),
                    volatility: 1 + Math.random() * 3,
                    lastUpdate: Date.now(),
                    sector: stockMapping.sector
                };
                
                stocks.push(stock);
                console.log(`Loaded ${stock.name}: ₹${stock.currentPrice.toLocaleString()}`);
            } catch (error) {
                console.error(`Failed to load ${stockMapping.name}:`, error);
            }
        }
        
        console.log(`Successfully loaded ${stocks.length} stocks`);
        return stocks;
    }

    async getStock(symbol: string): Promise<Stock | null> {
        const stocks = await this.getAllStocks();
        return stocks.find(s => s.id === symbol.toLowerCase()) || null;
    }
}

export const stockService = new StockService();
export default stockService;
