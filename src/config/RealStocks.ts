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

export const realStocks: StockMapping[] = [
  // Tech Giants
  { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology', industry: 'Consumer Electronics' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', sector: 'Technology', industry: 'Software' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Technology', industry: 'Internet Services' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', sector: 'Technology', industry: 'E-commerce' },
  { symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Automotive', industry: 'Electric Vehicles' },
  { symbol: 'META', name: 'Meta Platforms Inc.', sector: 'Technology', industry: 'Social Media' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', sector: 'Technology', industry: 'Semiconductors' },
  { symbol: 'NFLX', name: 'Netflix Inc.', sector: 'Entertainment', industry: 'Streaming' },
  
  // Financial Services  
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.', sector: 'Finance', industry: 'Banking' },
  { symbol: 'BAC', name: 'Bank of America Corp.', sector: 'Finance', industry: 'Banking' },
  { symbol: 'V', name: 'Visa Inc.', sector: 'Finance', industry: 'Payment Processing' },
  { symbol: 'MA', name: 'Mastercard Inc.', sector: 'Finance', industry: 'Payment Processing' },
  
  // Healthcare
  { symbol: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare', industry: 'Pharmaceuticals' },
  { symbol: 'PFE', name: 'Pfizer Inc.', sector: 'Healthcare', industry: 'Pharmaceuticals' },
  { symbol: 'UNH', name: 'UnitedHealth Group Inc.', sector: 'Healthcare', industry: 'Health Insurance' },
  
  // Energy
  { symbol: 'XOM', name: 'Exxon Mobil Corporation', sector: 'Energy', industry: 'Oil & Gas' },
  { symbol: 'CVX', name: 'Chevron Corporation', sector: 'Energy', industry: 'Oil & Gas' },
  
  // Retail
  { symbol: 'WMT', name: 'Walmart Inc.', sector: 'Retail', industry: 'Discount Stores' },
  { symbol: 'HD', name: 'The Home Depot Inc.', sector: 'Retail', industry: 'Home Improvement' },
  
  // Cryptocurrencies
  { symbol: 'BTC', name: 'Bitcoin', sector: 'Cryptocurrency', industry: 'Digital Currency' },
  { symbol: 'ETH', name: 'Ethereum', sector: 'Cryptocurrency', industry: 'Smart Contracts' },
  { symbol: 'ADA', name: 'Cardano', sector: 'Cryptocurrency', industry: 'Blockchain Platform' },
  { symbol: 'DOT', name: 'Polkadot', sector: 'Cryptocurrency', industry: 'Blockchain Infrastructure' },
  { symbol: 'SOL', name: 'Solana', sector: 'Cryptocurrency', industry: 'Blockchain Platform' },
  { symbol: 'AVAX', name: 'Avalanche', sector: 'Cryptocurrency', industry: 'Blockchain Platform' },
  { symbol: 'MATIC', name: 'Polygon', sector: 'Cryptocurrency', industry: 'Layer 2 Scaling' },
  { symbol: 'LINK', name: 'Chainlink', sector: 'Cryptocurrency', industry: 'Oracle Network' },
  { symbol: 'UNI', name: 'Uniswap', sector: 'Cryptocurrency', industry: 'DEX Protocol' },
  { symbol: 'LTC', name: 'Litecoin', sector: 'Cryptocurrency', industry: 'Digital Currency' },
  { symbol: 'ICP', name: 'Internet Computer', sector: 'Cryptocurrency', industry: 'Blockchain Infrastructure' }
];
