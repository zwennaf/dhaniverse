// Transaction Event Emitter Utility
// This utility helps other game systems emit transaction events for real-time updates

export interface TransactionEventDetail {
    type: "deposit" | "withdrawal" | "buy" | "sell" | "transfer";
    amount: number;
    description: string;
    symbol?: string;
    quantity?: number;
    price?: number;
    location?: string;
}

export class TransactionEventEmitter {
    /**
     * Emit a banking transaction event
     */
    static emitBankTransaction(detail: {
        type: "deposit" | "withdrawal";
        amount: number;
        description: string;
        location?: string;
    }) {
        window.dispatchEvent(
            new CustomEvent("bank-transaction", {
                detail: {
                    type: detail.type,
                    amount: detail.amount,
                    description: detail.description,
                    location: detail.location || "Bank",
                },
            })
        );
        console.log("Bank transaction event emitted:", detail);
    }

    /**
     * Emit a stock market transaction event
     */
    static emitStockTransaction(detail: {
        type: "buy" | "sell";
        symbol: string;
        quantity: number;
        price: number;
        amount?: number;
    }) {
        const totalAmount = detail.amount || detail.quantity * detail.price;
        window.dispatchEvent(
            new CustomEvent("stock-transaction", {
                detail: {
                    type: detail.type,
                    symbol: detail.symbol,
                    quantity: detail.quantity,
                    price: detail.price,
                    amount: totalAmount,
                    location: "Stock Market",
                },
            })
        );
        console.log("Stock transaction event emitted:", detail);
    }

    /**
     * Emit an ATM transaction event
     */
    static emitATMTransaction(detail: {
        type: "deposit" | "withdrawal";
        amount: number;
        atmName: string;
        description?: string;
    }) {
        window.dispatchEvent(
            new CustomEvent("atm-transaction", {
                detail: {
                    type: detail.type,
                    amount: detail.amount,
                    atmName: detail.atmName,
                    description:
                        detail.description ||
                        `ATM ${detail.type} at ${detail.atmName}`,
                },
            })
        );
        console.log("ATM transaction event emitted:", detail);
    }

    /**
     * Emit a portfolio update event for real-time balance updates
     */
    static emitPortfolioUpdate(detail: {
        cashBalance: number;
        bankBalance: number;
        stockValue?: number;

        totalValue: number;
    }) {
        window.dispatchEvent(
            new CustomEvent("portfolio-update", {
                detail: detail,
            })
        );
        console.log("Portfolio update event emitted:", detail);
    }
}

// Export individual functions for easier imports
export const {
    emitBankTransaction,
    emitStockTransaction,
    emitATMTransaction,
    emitPortfolioUpdate,
} = TransactionEventEmitter;
