/**
 * Real stock mappings for API integration
 * Maps stock symbols to their company names and sectors
 */

export interface StockMapping {
  symbol: string;
  name: string;
  sector: string;
  industry?: string;
}

export const realStocks: Record<string, StockMapping> = {
  // Tech Giants
  'AAPL': { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology', industry: 'Consumer Electronics' },
  'MSFT': { symbol: 'MSFT', name: 'Microsoft Corporation', sector: 'Technology', industry: 'Software' },
  'GOOGL': { symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Technology', industry: 'Internet Services' },
  'AMZN': { symbol: 'AMZN', name: 'Amazon.com Inc.', sector: 'Technology', industry: 'E-commerce' },
  'TSLA': { symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Automotive', industry: 'Electric Vehicles' },
  'META': { symbol: 'META', name: 'Meta Platforms Inc.', sector: 'Technology', industry: 'Social Media' },
  'NVDA': { symbol: 'NVDA', name: 'NVIDIA Corporation', sector: 'Technology', industry: 'Semiconductors' },
  'NFLX': { symbol: 'NFLX', name: 'Netflix Inc.', sector: 'Entertainment', industry: 'Streaming' },
  
  // Financial Services  
  'JPM': { symbol: 'JPM', name: 'JPMorgan Chase & Co.', sector: 'Finance', industry: 'Banking' },
  'BAC': { symbol: 'BAC', name: 'Bank of America Corp.', sector: 'Finance', industry: 'Banking' },
  'V': { symbol: 'V', name: 'Visa Inc.', sector: 'Finance', industry: 'Payment Processing' },
  'MA': { symbol: 'MA', name: 'Mastercard Inc.', sector: 'Finance', industry: 'Payment Processing' },
  
  // Healthcare
  'JNJ': { symbol: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare', industry: 'Pharmaceuticals' },
  'PFE': { symbol: 'PFE', name: 'Pfizer Inc.', sector: 'Healthcare', industry: 'Pharmaceuticals' },
  'UNH': { symbol: 'UNH', name: 'UnitedHealth Group Inc.', sector: 'Healthcare', industry: 'Health Insurance' },
  
  // Energy
  'XOM': { symbol: 'XOM', name: 'Exxon Mobil Corporation', sector: 'Energy', industry: 'Oil & Gas' },
  'CVX': { symbol: 'CVX', name: 'Chevron Corporation', sector: 'Energy', industry: 'Oil & Gas' },
  
  // Retail
  'WMT': { symbol: 'WMT', name: 'Walmart Inc.', sector: 'Retail', industry: 'Discount Stores' },
  'HD': { symbol: 'HD', name: 'The Home Depot Inc.', sector: 'Retail', industry: 'Home Improvement' },
  
  // Cryptocurrencies
  'BTC': { symbol: 'BTC', name: 'Bitcoin', sector: 'Cryptocurrency', industry: 'Digital Currency' },
  'ETH': { symbol: 'ETH', name: 'Ethereum', sector: 'Cryptocurrency', industry: 'Smart Contracts' },
  'ADA': { symbol: 'ADA', name: 'Cardano', sector: 'Cryptocurrency', industry: 'Blockchain Platform' },
  'DOT': { symbol: 'DOT', name: 'Polkadot', sector: 'Cryptocurrency', industry: 'Blockchain Infrastructure' },
  'SOL': { symbol: 'SOL', name: 'Solana', sector: 'Cryptocurrency', industry: 'Blockchain Platform' },
  'AVAX': { symbol: 'AVAX', name: 'Avalanche', sector: 'Cryptocurrency', industry: 'Blockchain Platform' },
  'MATIC': { symbol: 'MATIC', name: 'Polygon', sector: 'Cryptocurrency', industry: 'Layer 2 Scaling' },
  'LINK': { symbol: 'LINK', name: 'Chainlink', sector: 'Cryptocurrency', industry: 'Oracle Network' },
  'UNI': { symbol: 'UNI', name: 'Uniswap', sector: 'Cryptocurrency', industry: 'DEX Protocol' },
  'LTC': { symbol: 'LTC', name: 'Litecoin', sector: 'Cryptocurrency', industry: 'Digital Currency' },
  'ICP': { symbol: 'ICP', name: 'Internet Computer', sector: 'Cryptocurrency', industry: 'Blockchain Infrastructure' }
};
