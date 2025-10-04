/**
 * Unified Stock Market Type Definitions
 * 
 * This file contains ALL stock-related types used across the application.
 * These types are designed to match the Rust ICP canister types for consistency.
 * 
 * Architecture:
 * - StockPrice: Real-time price data from APIs
 * - Stock: Complete stock information with metrics
 * - StockTransaction: Buy/sell transaction records
 * - Portfolio: User's stock holdings
 * - MarketData: Aggregated market information
 */

// ============================================================================
// PRICE DATA TYPES
// ============================================================================

/**
 * Real-time stock price information
 * Source: CoinGecko API, Polygon.io API or ICP canister cache
 */
export interface StockPrice {
    symbol: string;
    price: number; // Current price in INR
    open: number; // Opening price
    high: number; // Day's high
    low: number; // Day's low
    close: number; // Previous close
    volume: number; // Trading volume
    change: number; // Price change in INR
    changePercent: number; // Price change percentage
    timestamp: number; // Unix timestamp (ms)
    isRealTime: boolean; // True if from API, false if cached/fallback
    source: 'coingecko' | 'polygon' | 'canister' | 'cache' | 'fallback' | 'none';
}

/**
 * Historical price point for charts
 */
export interface PriceHistoryPoint {
    timestamp: number;
    price: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

/**
 * OHLCV data for candlestick charts
 */
export interface OHLCV {
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

// ============================================================================
// STOCK INFORMATION TYPES
// ============================================================================

/**
 * Complete stock information including metrics and analysis
 */
export interface Stock {
    id?: string; // Unique identifier (lowercase symbol)
    symbol: string; // Stock ticker symbol (uppercase)
    name: string; // Company name
    sector: string; // Industry sector
    industry?: string; // Specific industry
    description?: string; // Company description
    
    // Current price data
    currentPrice: number; // Current price in INR
    previousClose?: number; // Previous closing price
    open: number; // Today's opening price
    dayHigh?: number; // Today's high
    dayLow?: number; // Today's low
    high?: number; // Alias for dayHigh (backward compatibility)
    low?: number; // Alias for dayLow (backward compatibility)
    close?: number; // Closing price
    
    // Trading data
    volume: number; // Current volume
    avgVolume?: number; // Average volume
    marketCap: number; // Market capitalization
    
    // Financial metrics
    peRatio: number; // Price-to-Earnings ratio
    eps: number; // Earnings per share
    dividendYield?: number; // Dividend yield percentage
    beta?: number; // Stock volatility measure
    
    // Change metrics
    change?: number; // Price change from previous close
    changePercent?: number; // Percentage change
    
    // Historical data
    priceHistory: PriceHistoryPoint[] | number[]; // Price history for charts (flexible)
    week52High?: number; // 52-week high
    week52Low?: number; // 52-week low
    fiftyTwoWeekHigh?: number; // Alias for week52High
    fiftyTwoWeekLow?: number; // Alias for week52Low
    
    // Metadata
    lastUpdated: number; // Last price update timestamp
    isRealTime?: boolean; // Whether price is real-time
    source?: string; // Data source (canister, cache, fallback)
    news?: StockNews[]; // Related news articles
}

/**
 * Simplified stock data for lists/grids
 */
export interface StockListItem {
    symbol: string;
    name: string;
    currentPrice: number;
    change: number;
    changePercent: number;
    volume: number;
    sector: string;
}

/**
 * Stock news article
 */
export interface StockNews {
    id: string;
    title: string;
    summary: string;
    url?: string;
    source: string;
    publishedAt: number; // Unix timestamp
    sentiment?: 'positive' | 'negative' | 'neutral';
    relevanceScore?: number; // 0-1
}

// ============================================================================
// TRANSACTION TYPES
// ============================================================================

/**
 * Stock transaction record
 */
export interface StockTransaction {
    id: string; // Unique transaction ID
    userId?: string; // User identifier (optional)
    symbol: string; // Stock symbol
    type: 'buy' | 'sell';
    quantity: number; // Number of shares
    price: number; // Price per share at transaction
    totalAmount: number; // Total transaction value
    commission?: number; // Trading commission/fees (deprecated, use fee)
    fee?: number; // Trading fee (preferred over commission)
    timestamp: number; // Transaction timestamp
    status: 'pending' | 'completed' | 'failed' | 'cancelled';
    
    // Portfolio impact
    balanceBefore?: number; // Cash balance before
    balanceAfter?: number; // Cash balance after
    
    // Metadata
    source?: 'game' | 'canister' | 'api'; // Where transaction originated
    notes?: string; // Additional notes
}

/**
 * Portfolio holding (user's stock position)
 */
export interface StockHolding {
    symbol: string;
    companyName?: string; // Optional company name
    quantity: number; // Number of shares owned
    averagePrice: number; // Average purchase price
    currentPrice: number; // Current market price
    totalValue?: number; // Current total value (quantity * currentPrice)
    currentValue?: number; // Alias for totalValue
    totalCost: number; // Total amount spent (quantity * averagePrice)
    profitLoss?: number; // Unrealized P&L (deprecated, use gainLoss)
    gainLoss?: number; // Unrealized gain/loss (preferred)
    profitLossPercent?: number; // P&L percentage (deprecated, use gainLossPercent)
    gainLossPercent?: number; // Gain/loss percentage (preferred)
    lastTradePrice?: number; // Last trade price
    lastTradeDate?: number; // Last trade date
    lastUpdated?: number; // Last price update timestamp
}

/**
 * Complete user portfolio
 */
export interface Portfolio {
    userId?: string; // Optional user identifier
    holdings: StockHolding[]; // Current stock positions
    cashBalance?: number; // Available cash (optional)
    totalInvested?: number; // Total amount invested in stocks
    totalCost?: number; // Total cost of all holdings
    currentValue?: number; // Current portfolio value (stocks only)
    totalValue: number; // Cash + stocks value
    profitLoss?: number; // Total unrealized P&L (deprecated, use totalGainLoss)
    totalGainLoss?: number; // Total gain/loss (preferred)
    profitLossPercent?: number; // Total P&L percentage (deprecated, use totalGainLossPercent)
    totalGainLossPercent?: number; // Total gain/loss percentage (preferred)
    transactions?: StockTransaction[]; // Transaction history (optional)
    lastUpdated: number; // Last portfolio update
}

// ============================================================================
// MARKET DATA TYPES
// ============================================================================

/**
 * Market status information
 */
export interface MarketStatus {
    isOpen: boolean; // Whether market is currently open
    nextOpen: Date; // Next market open time
    nextClose: Date; // Next market close time
    reason?: string; // Reason if market is closed
    timezone: string; // Market timezone
}

/**
 * Market summary/overview
 */
export interface MarketSummary {
    totalStocks: number; // Number of stocks available
    gainers: StockListItem[]; // Top gaining stocks
    losers: StockListItem[]; // Top losing stocks
    mostActive: StockListItem[]; // Most actively traded
    indices?: MarketIndex[]; // Market indices
    lastUpdated: number; // Last update timestamp
}

/**
 * Market index (e.g., NIFTY 50)
 */
export interface MarketIndex {
    name: string; // Index name
    value: number; // Current value
    change: number; // Change in points
    changePercent: number; // Change percentage
}

// ============================================================================
// CACHE & METADATA TYPES
// ============================================================================

/**
 * Cache entry with metadata
 */
export interface CachedStockPrice {
    data: StockPrice;
    cachedAt: number; // When data was cached
    expiresAt: number; // When cache expires
    source: 'memory' | 'canister' | 'localStorage';
}

/**
 * API rate limit information
 */
export interface RateLimitInfo {
    limit: number; // Total requests allowed
    remaining: number; // Requests remaining
    resetAt: number; // When limit resets (timestamp)
    retryAfter?: number; // Seconds to wait before retry
}

/**
 * Stock data freshness metadata
 */
export interface DataFreshness {
    symbol: string;
    age: number; // Age in milliseconds
    isStale: boolean; // Whether data is considered stale
    nextUpdate: number; // When next update is scheduled
    updateAttempts: number; // Failed update attempts
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * Stock price request
 */
export interface StockPriceRequest {
    symbols: string[]; // Stock symbols to fetch
    forceRefresh?: boolean; // Force API call, ignore cache
    includeHistory?: boolean; // Include price history
    historyDays?: number; // Days of history (default: 30)
}

/**
 * Stock price response
 */
export interface StockPriceResponse {
    success: boolean;
    data: StockPrice[];
    errors?: string[]; // Symbols that failed
    rateLimit?: RateLimitInfo;
    metadata: {
        source: 'coingecko' | 'polygon' | 'canister' | 'cache' | 'fallback' | 'none';
        timestamp: number;
        cacheHit: boolean;
        apiCallsMade: number;
    };
}

/**
 * Transaction request
 */
export interface TransactionRequest {
    symbol: string;
    type: 'buy' | 'sell';
    quantity: number;
    price?: number; // Optional limit price
}

/**
 * Transaction response
 */
export interface TransactionResponse {
    success: boolean;
    transaction?: StockTransaction;
    error?: string;
    balance?: {
        cash: number;
        stockValue: number;
        totalValue: number;
    };
}

/**
 * Transaction result (unified response)
 */
export interface TransactionResult {
    success: boolean;
    transaction?: StockTransaction;
    error?: StockMarketError;
    message?: string;
}

// ============================================================================
// HEALTH CHECK TYPES
// ============================================================================

/**
 * Stock market service health
 */
export interface StockMarketHealth {
    status: 'healthy' | 'degraded' | 'down';
    services: {
        polygonApi: ServiceHealth;
        icpCanister: ServiceHealth;
        caching: ServiceHealth;
        transactions: ServiceHealth;
    };
    performance: {
        avgResponseTime: number; // ms
        cacheHitRate: number; // percentage
        errorRate: number; // percentage
    };
    cycleUsage: {
        total: number;
        httpOutcalls: number;
        storage: number;
        estimatedMonthly: number;
    };
    lastCheck: number; // timestamp
}

/**
 * Individual service health
 */
export interface ServiceHealth {
    status: 'up' | 'down' | 'slow';
    responseTime?: number; // ms
    lastSuccess?: number; // timestamp
    lastError?: string;
    uptime: number; // percentage
}

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

/**
 * Stock market service configuration
 */
export interface StockMarketConfig {
    // Cache settings
    memoryCacheTTL: number; // Memory cache TTL (ms)
    canisterCacheTTL: number; // ICP canister cache TTL (ms)
    localStorageTTL: number; // localStorage cache TTL (ms)
    
    // API settings
    polygonApiKey?: string; // Polygon.io API key
    polygonBaseUrl: string; // Polygon API base URL
    maxBatchSize: number; // Max symbols per batch request
    requestTimeout: number; // Request timeout (ms)
    
    // Update intervals
    priceUpdateInterval: number; // Price update frequency (ms)
    portfolioUpdateInterval: number; // Portfolio update frequency (ms)
    healthCheckInterval: number; // Health check frequency (ms)
    
    // Cycle optimization
    minTimeBetweenCalls: number; // Min time between API calls (ms)
    maxCallsPerHour: number; // Max API calls per hour
    
    // Feature flags
    enableRealTimeUpdates: boolean;
    enablePolygonAPI: boolean;
    enableCanisterCache: boolean;
    enableLocalStorageCache: boolean;
    fallbackToMockData: boolean;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

/**
 * Stock market error
 */
export interface StockMarketError {
    code: StockMarketErrorCode;
    message: string;
    symbol?: string;
    timestamp: number;
    details?: any;
}

export enum StockMarketErrorCode {
    // API errors
    API_ERROR = 'API_ERROR',
    API_RATE_LIMIT = 'API_RATE_LIMIT',
    API_TIMEOUT = 'API_TIMEOUT',
    API_UNAUTHORIZED = 'API_UNAUTHORIZED',
    
    // Data errors
    SYMBOL_NOT_FOUND = 'SYMBOL_NOT_FOUND',
    INVALID_SYMBOL = 'INVALID_SYMBOL',
    STALE_DATA = 'STALE_DATA',
    
    // Transaction errors
    INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
    INSUFFICIENT_SHARES = 'INSUFFICIENT_SHARES',
    INVALID_QUANTITY = 'INVALID_QUANTITY',
    MARKET_CLOSED = 'MARKET_CLOSED',
    TRANSACTION_FAILED = 'TRANSACTION_FAILED',
    TRANSACTION_IN_PROGRESS = 'TRANSACTION_IN_PROGRESS',
    VALIDATION_FAILED = 'VALIDATION_FAILED',
    
    // System errors
    CANISTER_ERROR = 'CANISTER_ERROR',
    CACHE_ERROR = 'CACHE_ERROR',
    NETWORK_ERROR = 'NETWORK_ERROR',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

// ============================================================================
// LEADERBOARD TYPES
// ============================================================================

/**
 * Leaderboard entry
 */
export interface LeaderboardEntry {
    rank: number;
    userId: string;
    username: string;
    totalProfit: number; // Total realized + unrealized profit
    totalTrades: number; // Number of trades
    winRate: number; // Percentage of profitable trades
    portfolioValue: number; // Current portfolio value
    avatar?: string; // User avatar URL
}

/**
 * Trading achievement
 */
export interface TradingAchievement {
    id: string;
    name: string;
    description: string;
    icon: string;
    requirement: string;
    unlockedAt?: number; // Timestamp when unlocked
    progress?: number; // Progress towards achievement (0-100)
}

// ============================================================================
// EXPORT UTILITIES
// ============================================================================

/**
 * Type guard to check if data is stale
 */
export function isDataStale(timestamp: number, ttl: number): boolean {
    return Date.now() - timestamp > ttl;
}

/**
 * Calculate profit/loss percentage
 */
export function calculateProfitLossPercent(
    currentValue: number,
    originalCost: number
): number {
    if (originalCost === 0) return 0;
    return ((currentValue - originalCost) / originalCost) * 100;
}

/**
 * Format INR currency
 */
export function formatINR(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
}

/**
 * Format percentage
 */
export function formatPercent(value: number, decimals: number = 2): string {
    return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
}

/**
 * Convert USD to INR (approximate rate)
 */
export const USD_TO_INR_RATE = 88.76; // Updated October 5, 2025

export function usdToInr(usd: number): number {
    return usd * USD_TO_INR_RATE;
}

export function inrToUsd(inr: number): number {
    return inr / USD_TO_INR_RATE;
}
