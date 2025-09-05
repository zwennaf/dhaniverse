import { stockApi } from '../utils/api';

export interface PortfolioTransaction {
  id: string;
  stockId: string;
  stockName: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  total: number;
  timestamp: number;
  profitLoss?: number; // Only for sell transactions
  profitLossPercent?: number; // Only for sell transactions
}

export interface PortfolioMetrics {
  // Basic metrics
  totalValue: number;
  totalInvestment: number;
  netProfitLoss: number;
  netProfitLossPercent: number;

  // Advanced metrics
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
  largestWin: number;
  largestLoss: number;
  totalVolume: number;

  // Time-based metrics
  sessionStartTime: number;
  sessionDuration: number;
  tradesPerHour: number;

  // Risk metrics
  maxDrawdown: number;
  sharpeRatio: number;
  volatility: number;

  // Performance by stock
  bestPerformingStock: {
    stockId: string;
    stockName: string;
    profitLoss: number;
    profitLossPercent: number;
  } | null;
  worstPerformingStock: {
    stockId: string;
    stockName: string;
    profitLoss: number;
    profitLossPercent: number;
  } | null;
}

export interface StockPerformance {
  stockId: string;
  stockName: string;
  totalInvested: number;
  currentValue: number;
  profitLoss: number;
  profitLossPercent: number;
  quantity: number;
  averagePurchasePrice: number;
  bestPrice: number;
  worstPrice: number;
  daysHeld: number;
  firstPurchaseDate: number;
  lastTransactionDate: number;
}

export class PortfolioAnalyticsService {
  private static instance: PortfolioAnalyticsService;
  private sessionStartTime: number;
  private allTimeTransactions: PortfolioTransaction[] = [];
  private sessionTransactions: PortfolioTransaction[] = [];
  private portfolioHistory: { timestamp: number; value: number; investment: number }[] = [];

  private constructor() {
    this.sessionStartTime = Date.now();
  }

  public static getInstance(): PortfolioAnalyticsService {
    if (!PortfolioAnalyticsService.instance) {
      PortfolioAnalyticsService.instance = new PortfolioAnalyticsService();
    }
    return PortfolioAnalyticsService.instance;
  }

  public recordTransaction(transaction: Omit<PortfolioTransaction, 'id' | 'timestamp'>): void {
    const newTransaction: PortfolioTransaction = {
      ...transaction,
      id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };

    // Add to both all-time and session transactions
    this.allTimeTransactions.push(newTransaction);
    this.sessionTransactions.push(newTransaction);

    // Calculate profit/loss for sell transactions
    if (transaction.type === 'sell') {
      this.calculateSellProfitLoss(newTransaction);
    }

    // Update portfolio history
    this.updatePortfolioHistory();

    console.log('📊 Portfolio transaction recorded:', newTransaction);
  }

  private calculateSellProfitLoss(sellTransaction: PortfolioTransaction): void {
    // Find all buy transactions for this stock to calculate average cost basis
    const buyTransactions = this.allTimeTransactions.filter(
      t => t.stockId === sellTransaction.stockId && t.type === 'buy'
    );

    if (buyTransactions.length === 0) {
      console.warn('No buy transactions found for stock:', sellTransaction.stockId);
      return;
    }

    // Calculate weighted average purchase price
    let totalQuantity = 0;
    let totalCost = 0;

    buyTransactions.forEach(buy => {
      totalQuantity += buy.quantity;
      totalCost += buy.total;
    });

    const averagePurchasePrice = totalCost / totalQuantity;
    const profitLoss = (sellTransaction.price - averagePurchasePrice) * sellTransaction.quantity;
    const profitLossPercent = (profitLoss / (averagePurchasePrice * sellTransaction.quantity)) * 100;

    sellTransaction.profitLoss = profitLoss;
    sellTransaction.profitLossPercent = profitLossPercent;
  }

  private updatePortfolioHistory(): void {
    // This would be called periodically to track portfolio value over time
    // For now, we'll update it with each transaction
    const currentMetrics = this.getPortfolioMetrics();
    this.portfolioHistory.push({
      timestamp: Date.now(),
      value: currentMetrics.totalValue,
      investment: currentMetrics.totalInvestment,
    });

    // Keep only last 1000 entries to prevent memory issues
    if (this.portfolioHistory.length > 1000) {
      this.portfolioHistory = this.portfolioHistory.slice(-1000);
    }
  }

  public getPortfolioMetrics(currentStockPrices?: { [stockId: string]: number }): PortfolioMetrics {
    const allTimeTransactions = this.allTimeTransactions;
    
    // Separate synthetic holdings from real transactions
    const realTransactions = allTimeTransactions.filter(t => !t.id.startsWith('existing_'));
    const syntheticHoldings = allTimeTransactions.filter(t => t.id.startsWith('existing_'));
    
    // Calculate REALIZED P/L (from actual completed sell transactions)
    const sellTransactions = realTransactions.filter(t => t.type === 'sell' && t.profitLoss !== undefined);
    const realizedPL = sellTransactions.reduce((sum, t) => sum + (t.profitLoss || 0), 0);
    
    // Calculate current holdings (synthetic + real transactions)
    const currentHoldings = this.calculateCurrentHoldings();
    
    // Calculate UNREALIZED P/L (from current holdings at current prices)
    let unrealizedPL = 0;
    let totalCurrentValue = 0;
    let totalInvestment = 0;
    
    Object.entries(currentHoldings).forEach(([stockId, holding]) => {
      if (holding.quantity > 0) {
        const currentPrice = currentStockPrices?.[stockId] || holding.averagePrice;
        const currentValue = currentPrice * holding.quantity;
        totalCurrentValue += currentValue;
        totalInvestment += holding.totalInvested;
        unrealizedPL += currentValue - holding.totalInvested;
      }
    });

    // Trading metrics (based on completed sells only)
    const winningTrades = sellTransactions.filter(t => (t.profitLoss || 0) > 0);
    const losingTrades = sellTransactions.filter(t => (t.profitLoss || 0) < 0);
    
    const totalTrades = sellTransactions.length;
    const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0;

    const averageWin = winningTrades.length > 0
      ? winningTrades.reduce((sum, t) => sum + (t.profitLoss || 0), 0) / winningTrades.length
      : 0;

    const averageLoss = losingTrades.length > 0
      ? Math.abs(losingTrades.reduce((sum, t) => sum + (t.profitLoss || 0), 0) / losingTrades.length)
      : 0;

    const totalWins = winningTrades.reduce((sum, t) => sum + (t.profitLoss || 0), 0);
    const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + (t.profitLoss || 0), 0));
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;

    const largestWin = winningTrades.length > 0 ? Math.max(...winningTrades.map(t => t.profitLoss || 0)) : 0;
    const largestLoss = losingTrades.length > 0 ? Math.min(...losingTrades.map(t => t.profitLoss || 0)) : 0;

    const totalVolume = allTimeTransactions.reduce((sum, t) => sum + t.total, 0);

    // Time-based metrics
    const sessionDuration = (Date.now() - this.sessionStartTime) / (1000 * 60 * 60); // hours
    const tradesPerHour = sessionDuration > 0 ? this.sessionTransactions.length / sessionDuration : 0;

    // Risk metrics
    const maxDrawdown = this.calculateMaxDrawdown();
    const volatility = this.calculateVolatility();

    // Best/Worst performing stocks (based on current unrealized gains)
    const holdingPerformance = Object.entries(currentHoldings)
      .filter(([_, holding]) => holding.quantity > 0)
      .map(([stockId, holding]) => {
        const currentPrice = currentStockPrices?.[stockId] || holding.averagePrice;
        const currentValue = currentPrice * holding.quantity;
        const profitLoss = currentValue - holding.totalInvested;
        const profitLossPercent = holding.totalInvested > 0 ? (profitLoss / holding.totalInvested) * 100 : 0;
        
        // Find stock name from transactions
        const transaction = allTimeTransactions.find(t => t.stockId === stockId);
        const stockName = transaction?.stockName || stockId.toUpperCase();
        
        return {
          stockId,
          stockName,
          profitLoss,
          profitLossPercent
        };
      });

    const bestPerformingStock = holdingPerformance.length > 0
      ? holdingPerformance.reduce((best, current) =>
          current.profitLossPercent > best.profitLossPercent ? current : best
        )
      : null;

    const worstPerformingStock = holdingPerformance.length > 0
      ? holdingPerformance.reduce((worst, current) =>
          current.profitLossPercent < worst.profitLossPercent ? current : worst
        )
      : null;

    return {
      totalValue: totalCurrentValue,
      totalInvestment,
      netProfitLoss: realizedPL, // This is REALIZED P/L
      netProfitLossPercent: totalInvestment > 0 ? (realizedPL / totalInvestment) * 100 : 0,
      totalTrades,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate,
      averageWin,
      averageLoss,
      profitFactor,
      largestWin,
      largestLoss,
      totalVolume,
      sessionStartTime: this.sessionStartTime,
      sessionDuration,
      tradesPerHour,
      maxDrawdown,
      sharpeRatio: 0,
      volatility,
      bestPerformingStock,
      worstPerformingStock,
    };
  }

  private calculateMaxDrawdown(): number {
    if (this.portfolioHistory.length < 2) return 0;

    let maxDrawdown = 0;
    let peak = this.portfolioHistory[0].value;

    for (const entry of this.portfolioHistory) {
      if (entry.value > peak) {
        peak = entry.value;
      }
      const drawdown = (peak - entry.value) / peak * 100;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }

    return maxDrawdown;
  }

  private calculateVolatility(): number {
    if (this.portfolioHistory.length < 2) return 0;

    const returns: number[] = [];
    for (let i = 1; i < this.portfolioHistory.length; i++) {
      const prevValue = this.portfolioHistory[i - 1].value;
      const currentValue = this.portfolioHistory[i].value;
      if (prevValue > 0) {
        returns.push((currentValue - prevValue) / prevValue);
      }
    }

    if (returns.length === 0) return 0;

    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;

    return Math.sqrt(variance) * 100; // Return as percentage
  }

  public getStockPerformance(): StockPerformance[] {
    const stockStats: { [stockId: string]: StockPerformance } = {};

    this.allTimeTransactions.forEach(transaction => {
      if (!stockStats[transaction.stockId]) {
        stockStats[transaction.stockId] = {
          stockId: transaction.stockId,
          stockName: transaction.stockName,
          totalInvested: 0,
          currentValue: 0,
          profitLoss: 0,
          profitLossPercent: 0,
          quantity: 0,
          averagePurchasePrice: 0,
          bestPrice: 0,
          worstPrice: 0,
          daysHeld: 0,
          firstPurchaseDate: 0,
          lastTransactionDate: 0,
        };
      }

      const stat = stockStats[transaction.stockId];

      if (transaction.type === 'buy') {
        stat.quantity += transaction.quantity;
        stat.totalInvested += transaction.total;
        stat.firstPurchaseDate = stat.firstPurchaseDate || transaction.timestamp;
      } else if (transaction.type === 'sell') {
        stat.quantity -= transaction.quantity;
        stat.profitLoss += transaction.profitLoss || 0;
      }

      stat.lastTransactionDate = Math.max(stat.lastTransactionDate, transaction.timestamp);

      if (stat.quantity > 0) {
        stat.averagePurchasePrice = stat.totalInvested / (stat.totalInvested / stat.averagePurchasePrice || 1);
        stat.daysHeld = Math.floor((Date.now() - stat.firstPurchaseDate) / (1000 * 60 * 60 * 24));
      }
    });

    return Object.values(stockStats).filter(stat => stat.quantity > 0);
  }

  public getTransactionHistory(limit?: number): PortfolioTransaction[] {
    const transactions = [...this.allTimeTransactions].sort((a, b) => b.timestamp - a.timestamp);
    return limit ? transactions.slice(0, limit) : transactions;
  }

  public getSessionTransactions(): PortfolioTransaction[] {
    return [...this.sessionTransactions];
  }

  public resetSession(): void {
    this.sessionStartTime = Date.now();
    this.sessionTransactions = [];
  }

  public loadExistingPortfolio(holdings: { stockId: string; quantity: number; averagePurchasePrice: number; totalInvestment: number }[], stockNames?: { [stockId: string]: string }): void {
    // Clear any existing synthetic transactions first
    this.allTimeTransactions = this.allTimeTransactions.filter(t => !t.id.startsWith('existing_'));
    
    // Create synthetic buy transactions for existing holdings
    // This allows the analytics to calculate metrics based on current portfolio
    const syntheticTransactions: PortfolioTransaction[] = holdings.map(holding => ({
      id: `existing_${holding.stockId}_${Date.now()}`,
      stockId: holding.stockId,
      stockName: stockNames?.[holding.stockId] || holding.stockId.toUpperCase(),
      type: 'buy' as const,
      quantity: holding.quantity,
      price: holding.averagePurchasePrice,
      total: holding.totalInvestment,
      timestamp: Date.now() - (24 * 60 * 60 * 1000), // Assume purchased 1 day ago
    }));

    // Add to all-time transactions
    this.allTimeTransactions = [...this.allTimeTransactions, ...syntheticTransactions];
    
    console.log('📊 Loaded existing portfolio into analytics:', syntheticTransactions.length, 'holdings');
  }

  /**
   * Hydrate full historical transactions (buy & sell) from backend so realized P/L persists across reloads.
   * Backend should return chronological transactions with shape: { type: 'buy'|'sell', symbol, quantity, price, timestamp }
   */
  public hydrateServerTransactions(transactions: { type: 'buy' | 'sell'; symbol: string; quantity: number; price: number; timestamp?: number }[], stockNames?: { [id: string]: string }): void {
    if (!transactions || transactions.length === 0) return;

    // Remove any previously hydrated real transactions (keep synthetic existing_ buys so holdings still show if server omitted them)
    this.allTimeTransactions = this.allTimeTransactions.filter(t => t.id.startsWith('existing_'));
    this.sessionTransactions = [];

    // Sort by timestamp ascending to compute cost basis correctly
    const ordered = [...transactions].sort((a,b) => (a.timestamp || 0) - (b.timestamp || 0));

    ordered.forEach(trx => {
      const base: PortfolioTransaction = {
        id: `srv_${trx.type}_${trx.symbol.toLowerCase()}_${trx.timestamp || Date.now()}_${Math.random().toString(36).slice(2,7)}`,
        stockId: trx.symbol.toLowerCase(),
        stockName: stockNames?.[trx.symbol.toLowerCase()] || trx.symbol,
        type: trx.type,
        quantity: trx.quantity,
        price: trx.price,
        total: trx.price * trx.quantity,
        timestamp: trx.timestamp || Date.now()
      };
      this.allTimeTransactions.push(base);
      this.sessionTransactions.push(base);
      if (trx.type === 'sell') {
        // compute realized P/L for this sell immediately
        this.calculateSellProfitLoss(base);
      }
    });

    // Rebuild portfolio history quickly with last snapshot
    this.updatePortfolioHistory();
    console.log('📊 Hydrated server transactions into analytics:', ordered.length);
  }

  public getTransactionCount(): number {
    return this.allTimeTransactions.length;
  }

  public getAllTransactions(): PortfolioTransaction[] {
    return [...this.allTimeTransactions];
  }

  public getCurrentMetrics(currentStockPrices?: { [stockId: string]: number }): PortfolioMetrics {
    return this.getPortfolioMetrics(currentStockPrices);
  }

  public clearAllData(): void {
    this.allTimeTransactions = [];
    this.sessionTransactions = [];
    this.portfolioHistory = [];
    this.sessionStartTime = Date.now();
  }

  public getUnrealizedProfitLoss(currentStockPrices?: { [stockId: string]: number }): number {
    if (!currentStockPrices) return 0;

    let unrealizedPL = 0;
    const holdings = this.calculateCurrentHoldings();

    Object.entries(holdings).forEach(([stockId, holding]) => {
      if (holding.quantity > 0) {
        const currentPrice = currentStockPrices[stockId] || holding.averagePrice;
        const currentValue = currentPrice * holding.quantity;
        unrealizedPL += currentValue - holding.totalInvested;
      }
    });

    return unrealizedPL;
  }

  private calculateCurrentHoldings(): { [stockId: string]: { quantity: number; totalInvested: number; averagePrice: number } } {
    const holdings: { [stockId: string]: { quantity: number; totalInvested: number; averagePrice: number } } = {};

    this.allTimeTransactions.forEach(transaction => {
      if (transaction.type === 'buy') {
        if (!holdings[transaction.stockId]) {
          holdings[transaction.stockId] = { quantity: 0, totalInvested: 0, averagePrice: 0 };
        }
        holdings[transaction.stockId].quantity += transaction.quantity;
        holdings[transaction.stockId].totalInvested += transaction.total;
        holdings[transaction.stockId].averagePrice = 
          holdings[transaction.stockId].totalInvested / holdings[transaction.stockId].quantity;
      } else if (transaction.type === 'sell') {
        if (holdings[transaction.stockId]) {
          holdings[transaction.stockId].quantity -= transaction.quantity;
          const sellRatio = transaction.quantity / (holdings[transaction.stockId].quantity + transaction.quantity);
          const investmentReduction = holdings[transaction.stockId].totalInvested * sellRatio;
          holdings[transaction.stockId].totalInvested -= investmentReduction;
        }
      }
    });

    return holdings;
  }

  public exportData(): string {
    return JSON.stringify({
      allTimeTransactions: this.allTimeTransactions,
      sessionTransactions: this.sessionTransactions,
      portfolioHistory: this.portfolioHistory,
      metrics: this.getPortfolioMetrics(),
    }, null, 2);
  }
}

export const portfolioAnalytics = PortfolioAnalyticsService.getInstance();
