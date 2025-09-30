/**
 * StockTransactionService - Buy/Sell Operations Handler
 * 
 * This service handles all stock trading operations with complete validation,
 * balance management, and transaction recording.
 * 
 * Transaction Flow:
 * 1. UI initiates buy/sell
 * 2. Validate transaction (balance, quantity, price)
 * 3. Update BalanceManager (optimistic update)
 * 4. Send to Backend API (persistent storage)
 * 5. Record on ICP Canister (blockchain record)
 * 6. Handle success/failure with rollback
 * 
 * @author Dhaniverse Team
 */

import { balanceManager } from './BalanceManager';
import { canisterService } from './CanisterService';
import { stockPriceService } from './StockPriceService';
import type { 
    StockTransaction, 
    StockHolding, 
    Portfolio,
    TransactionResult,
    StockMarketError
} from '../types/stock.types';
import { StockMarketErrorCode } from '../types/stock.types';
import { config } from '../config/environment';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
    MIN_TRANSACTION_AMOUNT: 1, // Minimum 1 rupee
    MAX_TRANSACTION_AMOUNT: 10_000_000, // Maximum 10 million rupees
    MIN_SHARES: 1, // Minimum 1 share
    MAX_SHARES: 100_000, // Maximum 100k shares per transaction
    
    // Fees
    TRANSACTION_FEE_PERCENT: 0.1, // 0.1% transaction fee
    MIN_TRANSACTION_FEE: 1, // Minimum 1 rupee fee
    
    // Validation
    REQUIRE_BALANCE_CHECK: true,
    ENABLE_ICP_RECORDING: config.features.enableICPWallet,
    
    // Retry
    MAX_RETRY_ATTEMPTS: 3,
    RETRY_DELAY_MS: 1000,
} as const;

// ============================================================================
// TYPES
// ============================================================================

interface TransactionRequest {
    symbol: string;
    quantity: number;
    price: number;
    type: 'buy' | 'sell';
}

interface TransactionValidation {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

// ============================================================================
// STOCK TRANSACTION SERVICE
// ============================================================================

class StockTransactionService {
    private portfolio: Map<string, StockHolding> = new Map();
    private transactions: StockTransaction[] = [];
    private isProcessing = false;
    
    constructor() {
        this.loadPortfolio();
        console.log('💼 StockTransactionService initialized');
    }
    
    // ========================================================================
    // PORTFOLIO MANAGEMENT
    // ========================================================================
    
    /**
     * Load portfolio from localStorage
     */
    private loadPortfolio(): void {
        try {
            const stored = localStorage.getItem('dhaniverse_portfolio');
            if (stored) {
                const data = JSON.parse(stored);
                this.portfolio = new Map(Object.entries(data.holdings));
                this.transactions = data.transactions || [];
                console.log(`📊 Loaded portfolio: ${this.portfolio.size} holdings`);
            }
        } catch (error) {
            console.error('Failed to load portfolio:', error);
        }
    }
    
    /**
     * Save portfolio to localStorage
     */
    private savePortfolio(): void {
        try {
            const data = {
                holdings: Object.fromEntries(this.portfolio),
                transactions: this.transactions,
                lastUpdated: Date.now(),
            };
            localStorage.setItem('dhaniverse_portfolio', JSON.stringify(data));
        } catch (error) {
            console.error('Failed to save portfolio:', error);
        }
    }
    
    /**
     * Get current portfolio
     */
    getPortfolio(): Portfolio {
        const holdings = Array.from(this.portfolio.values());
        const totalValue = holdings.reduce((sum, h) => sum + (h.currentValue || 0), 0);
        const totalCost = holdings.reduce((sum, h) => sum + h.totalCost, 0);
        const totalGainLoss = totalValue - totalCost;
        const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;
        
        return {
            holdings,
            totalValue,
            totalCost,
            totalGainLoss,
            totalGainLossPercent,
            lastUpdated: Date.now(),
        };
    }
    
    /**
     * Get holding for a specific symbol
     */
    getHolding(symbol: string): StockHolding | null {
        return this.portfolio.get(symbol.toUpperCase()) || null;
    }
    
    /**
     * Get all transactions
     */
    getTransactions(limit?: number): StockTransaction[] {
        const sorted = [...this.transactions].sort((a, b) => b.timestamp - a.timestamp);
        return limit ? sorted.slice(0, limit) : sorted;
    }
    
    // ========================================================================
    // TRANSACTION EXECUTION
    // ========================================================================
    
    /**
     * Buy stocks
     */
    async buyStock(symbol: string, quantity: number): Promise<TransactionResult> {
        // Prevent concurrent transactions
        if (this.isProcessing) {
            return this.createErrorResult(StockMarketErrorCode.TRANSACTION_IN_PROGRESS, 'Another transaction is in progress');
        }
        
        this.isProcessing = true;
        
        try {
            // 1. Get current price
            const priceData = await stockPriceService.getStockPrice(symbol);
            if (!priceData) {
                throw new Error(`Unable to fetch price for ${symbol}`);
            }
            
            const request: TransactionRequest = {
                symbol: symbol.toUpperCase(),
                quantity,
                price: priceData.price,
                type: 'buy',
            };
            
            // 2. Validate transaction
            const validation = this.validateTransaction(request);
            if (!validation.valid) {
                return this.createErrorResult(StockMarketErrorCode.VALIDATION_FAILED, validation.errors.join(', '));
            }
            
            // 3. Calculate costs
            const totalCost = request.price * request.quantity;
            const fee = this.calculateFee(totalCost);
            const totalWithFee = totalCost + fee;
            
            // 4. Check balance
            const currentBalance = balanceManager.getBalance();
            if (currentBalance.cash < totalWithFee) {
                return this.createErrorResult(
                    StockMarketErrorCode.INSUFFICIENT_FUNDS,
                    `Insufficient funds. Need ₹${totalWithFee.toFixed(2)}, have ₹${currentBalance.cash.toFixed(2)}`
                );
            }
            
            // 5. Create transaction record
            const transaction: StockTransaction = {
                id: this.generateTransactionId(),
                symbol: request.symbol,
                type: 'buy',
                quantity: request.quantity,
                price: request.price,
                totalAmount: totalCost,
                fee,
                timestamp: Date.now(),
                status: 'pending',
            };
            
            // 6. Optimistic update (local state)
            this.updatePortfolioForBuy(request.symbol, request.quantity, request.price);
            this.transactions.push(transaction);
            this.savePortfolio();
            
            // 7. Update BalanceManager
            balanceManager.addTransaction({
                type: 'stock_buy',
                amount: -totalWithFee,
                symbol: request.symbol,
                quantity: request.quantity,
                price: request.price,
                description: `Bought ${request.quantity} shares of ${request.symbol}`,
                location: 'Stock Market',
            });
            
            // 8. Send to backend API (fire and forget with retry)
            this.syncToBackend(transaction).catch(err => {
                console.warn('Backend sync failed (non-critical):', err);
            });
            
            // 9. Record on ICP Canister (optional, fire and forget)
            if (CONFIG.ENABLE_ICP_RECORDING) {
                this.recordOnICP(transaction).catch(err => {
                    console.warn('ICP recording failed (non-critical):', err);
                });
            }
            
            // 10. Success!
            transaction.status = 'completed';
            this.savePortfolio();
            
            console.log(`✅ Bought ${quantity} shares of ${symbol} at ₹${request.price}`);
            
            return {
                success: true,
                transaction,
                message: `Successfully bought ${quantity} shares of ${symbol}`,
            };
            
        } catch (error) {
            console.error('Buy transaction failed:', error);
            return this.createErrorResult(
                StockMarketErrorCode.TRANSACTION_FAILED,
                error instanceof Error ? error.message : 'Unknown error'
            );
        } finally {
            this.isProcessing = false;
        }
    }
    
    /**
     * Sell stocks
     */
    async sellStock(symbol: string, quantity: number): Promise<TransactionResult> {
        if (this.isProcessing) {
            return this.createErrorResult(StockMarketErrorCode.TRANSACTION_IN_PROGRESS, 'Another transaction is in progress');
        }
        
        this.isProcessing = true;
        
        try {
            // 1. Check if user owns the stock
            const holding = this.getHolding(symbol);
            if (!holding || holding.quantity < quantity) {
                return this.createErrorResult(
                    StockMarketErrorCode.INSUFFICIENT_SHARES,
                    `You don't own enough shares. Have ${holding?.quantity || 0}, need ${quantity}`
                );
            }
            
            // 2. Get current price
            const priceData = await stockPriceService.getStockPrice(symbol);
            if (!priceData) {
                throw new Error(`Unable to fetch price for ${symbol}`);
            }
            
            const request: TransactionRequest = {
                symbol: symbol.toUpperCase(),
                quantity,
                price: priceData.price,
                type: 'sell',
            };
            
            // 3. Calculate proceeds
            const totalProceeds = request.price * request.quantity;
            const fee = this.calculateFee(totalProceeds);
            const totalWithFee = totalProceeds - fee;
            
            // 4. Create transaction record
            const transaction: StockTransaction = {
                id: this.generateTransactionId(),
                symbol: request.symbol,
                type: 'sell',
                quantity: request.quantity,
                price: request.price,
                totalAmount: totalProceeds,
                fee,
                timestamp: Date.now(),
                status: 'pending',
            };
            
            // 5. Optimistic update
            this.updatePortfolioForSell(request.symbol, request.quantity, request.price);
            this.transactions.push(transaction);
            this.savePortfolio();
            
            // 6. Update BalanceManager
            balanceManager.addTransaction({
                type: 'stock_sell',
                amount: totalWithFee,
                symbol: request.symbol,
                quantity: request.quantity,
                price: request.price,
                description: `Sold ${request.quantity} shares of ${request.symbol}`,
                location: 'Stock Market',
            });
            
            // 7. Backend sync (fire and forget)
            this.syncToBackend(transaction).catch(err => {
                console.warn('Backend sync failed (non-critical):', err);
            });
            
            // 8. ICP recording (optional)
            if (CONFIG.ENABLE_ICP_RECORDING) {
                this.recordOnICP(transaction).catch(err => {
                    console.warn('ICP recording failed (non-critical):', err);
                });
            }
            
            // 9. Success!
            transaction.status = 'completed';
            this.savePortfolio();
            
            console.log(`✅ Sold ${quantity} shares of ${symbol} at ₹${request.price}`);
            
            return {
                success: true,
                transaction,
                message: `Successfully sold ${quantity} shares of ${symbol}`,
            };
            
        } catch (error) {
            console.error('Sell transaction failed:', error);
            return this.createErrorResult(
                StockMarketErrorCode.TRANSACTION_FAILED,
                error instanceof Error ? error.message : 'Unknown error'
            );
        } finally {
            this.isProcessing = false;
        }
    }
    
    // ========================================================================
    // VALIDATION
    // ========================================================================
    
    private validateTransaction(request: TransactionRequest): TransactionValidation {
        const errors: string[] = [];
        const warnings: string[] = [];
        
        // Validate quantity
        if (request.quantity < CONFIG.MIN_SHARES) {
            errors.push(`Minimum ${CONFIG.MIN_SHARES} share(s) required`);
        }
        if (request.quantity > CONFIG.MAX_SHARES) {
            errors.push(`Maximum ${CONFIG.MAX_SHARES} shares per transaction`);
        }
        if (!Number.isInteger(request.quantity)) {
            errors.push('Quantity must be a whole number');
        }
        
        // Validate price
        if (request.price <= 0) {
            errors.push('Invalid price');
        }
        
        // Validate amount
        const totalAmount = request.price * request.quantity;
        if (totalAmount < CONFIG.MIN_TRANSACTION_AMOUNT) {
            errors.push(`Minimum transaction amount is ₹${CONFIG.MIN_TRANSACTION_AMOUNT}`);
        }
        if (totalAmount > CONFIG.MAX_TRANSACTION_AMOUNT) {
            errors.push(`Maximum transaction amount is ₹${CONFIG.MAX_TRANSACTION_AMOUNT}`);
        }
        
        // Warnings for large transactions
        if (totalAmount > 100_000) {
            warnings.push('Large transaction - please confirm');
        }
        
        return {
            valid: errors.length === 0,
            errors,
            warnings,
        };
    }
    
    // ========================================================================
    // PORTFOLIO UPDATES
    // ========================================================================
    
    private updatePortfolioForBuy(symbol: string, quantity: number, price: number): void {
        const existing = this.portfolio.get(symbol);
        
        if (existing) {
            // Average cost calculation
            const totalCost = existing.totalCost + (price * quantity);
            const totalQuantity = existing.quantity + quantity;
            const avgPrice = totalCost / totalQuantity;
            
            existing.quantity = totalQuantity;
            existing.averagePrice = avgPrice;
            existing.totalCost = totalCost;
            existing.lastTradePrice = price;
            existing.lastTradeDate = Date.now();
        } else {
            // New holding
            const holding: StockHolding = {
                symbol,
                quantity,
                averagePrice: price,
                currentPrice: price,
                totalCost: price * quantity,
                currentValue: price * quantity,
                gainLoss: 0,
                gainLossPercent: 0,
                lastTradePrice: price,
                lastTradeDate: Date.now(),
            };
            this.portfolio.set(symbol, holding);
        }
    }
    
    private updatePortfolioForSell(symbol: string, quantity: number, price: number): void {
        const holding = this.portfolio.get(symbol);
        if (!holding) return;
        
        holding.quantity -= quantity;
        holding.lastTradePrice = price;
        holding.lastTradeDate = Date.now();
        
        // Remove if quantity is zero
        if (holding.quantity <= 0) {
            this.portfolio.delete(symbol);
        } else {
            // Update total cost proportionally
            holding.totalCost = holding.averagePrice * holding.quantity;
        }
    }
    
    // ========================================================================
    // UTILITY FUNCTIONS
    // ========================================================================
    
    private calculateFee(amount: number): number {
        const fee = amount * (CONFIG.TRANSACTION_FEE_PERCENT / 100);
        return Math.max(fee, CONFIG.MIN_TRANSACTION_FEE);
    }
    
    private generateTransactionId(): string {
        return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    private createErrorResult(code: StockMarketErrorCode, message: string): TransactionResult {
        return {
            success: false,
            error: {
                code,
                message,
                timestamp: Date.now(),
            },
        };
    }
    
    // ========================================================================
    // BACKEND SYNC
    // ========================================================================
    
    private async syncToBackend(transaction: StockTransaction): Promise<void> {
        try {
            const response = await fetch(`${config.api.baseUrl}/api/stock-transactions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(transaction),
            });
            
            if (!response.ok) {
                throw new Error(`Backend sync failed: ${response.statusText}`);
            }
            
            console.log('✅ Transaction synced to backend');
        } catch (error) {
            console.error('Backend sync error:', error);
            throw error;
        }
    }
    
    private async recordOnICP(transaction: StockTransaction): Promise<void> {
        try {
            // Record on ICP canister for blockchain permanence
            await canisterService.recordStockTransaction(transaction);
            console.log('✅ Transaction recorded on ICP');
        } catch (error) {
            console.error('ICP recording error:', error);
            throw error;
        }
    }
    
    // ========================================================================
    // STATISTICS
    // ========================================================================
    
    getStats() {
        const portfolio = this.getPortfolio();
        return {
            totalHoldings: this.portfolio.size,
            totalTransactions: this.transactions.length,
            totalValue: portfolio.totalValue,
            totalGainLoss: portfolio.totalGainLoss,
            totalGainLossPercent: portfolio.totalGainLossPercent,
            isProcessing: this.isProcessing,
        };
    }
    
    /**
     * Reset portfolio (for testing)
     */
    reset(): void {
        this.portfolio.clear();
        this.transactions = [];
        this.savePortfolio();
        console.log('🗑️ Portfolio reset');
    }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const stockTransactionService = new StockTransactionService();

// Debug access
(window as any).stockTransactionService = stockTransactionService;

export default stockTransactionService;
