/**
 * Centralized Balance and Transaction Management System
 * Handles real-time balance updates and transaction synchronization across all systems
 */

export interface Transaction {
    id: string;
    type:
        | "deposit"
        | "withdrawal"
        | "stock_buy"
        | "stock_sell"
        | "bank_transfer"
        | "atm_deposit"
        | "atm_withdrawal";
    amount: number;
    timestamp: Date;
    description: string;
    location: string;
    symbol?: string; // For stock transactions
    quantity?: number; // For stock transactions
    price?: number; // For stock transactions
}

export interface BalanceState {
    cash: number;
    bankBalance: number;
    stockValue: number;
    totalValue: number;
}

class BalanceManager {
    private currentBalance: BalanceState = {
        cash: 1000,
        bankBalance: 0,
        stockValue: 0,
        totalValue: 1000,
    };

    private transactions: Transaction[] = [];
    private listeners: Set<(balance: BalanceState) => void> = new Set();
    private transactionListeners: Set<(transaction: Transaction) => void> =
        new Set();

    constructor() {
        this.loadFromStorage();
        this.setupEventListeners();
        this.initializeFromBackend();
    }

    // Load balance and transactions from localStorage
    private loadFromStorage() {
        try {
            const savedBalance = localStorage.getItem("player_balance_state");
            if (savedBalance) {
                const parsedBalance = JSON.parse(savedBalance);
                // Only load from storage if it's not the default values
                // This prevents overriding backend data with stale localStorage data
                if (
                    parsedBalance.cash !== 1000 ||
                    parsedBalance.bankBalance !== 0
                ) {
                    this.currentBalance = parsedBalance;
                    console.log(
                        "Loaded balance from localStorage:",
                        this.currentBalance
                    );
                }
            }

            const savedTransactions = localStorage.getItem(
                "all_player_transactions"
            );
            if (savedTransactions) {
                this.transactions = JSON.parse(savedTransactions).map(
                    (tx: any) => ({
                        ...tx,
                        timestamp: new Date(tx.timestamp),
                    })
                );
                console.log(
                    `Loaded ${this.transactions.length} transactions from localStorage`
                );
            }
        } catch (error) {
            console.warn("Failed to load balance state from storage:", error);
        }
    }

    // Save balance and transactions to localStorage
    private saveToStorage() {
        try {
            localStorage.setItem(
                "player_balance_state",
                JSON.stringify(this.currentBalance)
            );
            localStorage.setItem(
                "all_player_transactions",
                JSON.stringify(this.transactions)
            );
        } catch (error) {
            console.warn("Failed to save balance state to storage:", error);
        }
    }

    // Setup event listeners for legacy systems
    private setupEventListeners() {
        // Listen for rupee updates from game
        window.addEventListener("rupee-update", (event: any) => {
            if (event.detail?.rupees !== undefined) {
                this.updateCash(event.detail.rupees, false);
            }
        });

        // Listen for player rupee updates
        window.addEventListener("updatePlayerRupees", (event: any) => {
            if (event.detail?.rupees !== undefined) {
                this.updateCash(event.detail.rupees, false);
            }
        });
    }

    // Get current balance state
    getBalance(): BalanceState {
        return { ...this.currentBalance };
    }

    // Get all transactions
    getTransactions(): Transaction[] {
        return [...this.transactions].sort(
            (a, b) =>
                new Date(b.timestamp).getTime() -
                new Date(a.timestamp).getTime()
        );
    }

    // Subscribe to balance changes
    onBalanceChange(callback: (balance: BalanceState) => void) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    // Subscribe to new transactions
    onNewTransaction(callback: (transaction: Transaction) => void) {
        this.transactionListeners.add(callback);
        return () => this.transactionListeners.delete(callback);
    }

    // Update cash balance
    updateCash(newAmount: number, notify: boolean = true) {
        this.currentBalance.cash = newAmount;
        this.currentBalance.totalValue =
            this.currentBalance.cash +
            this.currentBalance.bankBalance +
            this.currentBalance.stockValue;

        if (notify) {
            this.notifyBalanceChange();
        }
        this.saveToStorage();
    }

    // Update bank balance
    updateBankBalance(newAmount: number) {
        this.currentBalance.bankBalance = newAmount;
        this.currentBalance.totalValue =
            this.currentBalance.cash +
            this.currentBalance.bankBalance +
            this.currentBalance.stockValue;
        this.notifyBalanceChange();
        this.saveToStorage();
    }

    // Update stock value
    updateStockValue(newAmount: number) {
        this.currentBalance.stockValue = newAmount;
        this.currentBalance.totalValue =
            this.currentBalance.cash +
            this.currentBalance.bankBalance +
            this.currentBalance.stockValue;
        this.notifyBalanceChange();
        this.saveToStorage();
    }



    // Add a new transaction
    addTransaction(transaction: Omit<Transaction, "id" | "timestamp">) {
        const newTransaction: Transaction = {
            ...transaction,
            id: `${transaction.type}_${Date.now()}_${Math.random()
                .toString(36)
                .substr(2, 9)}`,
            timestamp: new Date(),
        };

        this.transactions.unshift(newTransaction);

        // Keep only last 500 transactions
        if (this.transactions.length > 500) {
            this.transactions = this.transactions.slice(0, 500);
        }

        // Notify transaction listeners
        this.transactionListeners.forEach((callback) =>
            callback(newTransaction)
        );

        // Dispatch global events for legacy systems
        this.dispatchTransactionEvents(newTransaction);

        this.saveToStorage();
        return newTransaction;
    }

    // Process deposit transaction
    processDeposit(amount: number, location: string = "Bank") {
        if (this.currentBalance.cash < amount) {
            throw new Error("Insufficient cash balance");
        }

        this.updateCash(this.currentBalance.cash - amount);
        this.updateBankBalance(this.currentBalance.bankBalance + amount);

        return this.addTransaction({
            type: "deposit",
            amount: amount,
            description: `Deposited ₹${amount.toLocaleString()} to bank account`,
            location: location,
        });
    }

    // Process withdrawal transaction
    processWithdrawal(amount: number, location: string = "Bank") {
        if (this.currentBalance.bankBalance < amount) {
            throw new Error("Insufficient bank balance");
        }

        this.updateBankBalance(this.currentBalance.bankBalance - amount);
        this.updateCash(this.currentBalance.cash + amount);

        return this.addTransaction({
            type: "withdrawal",
            amount: amount,
            description: `Withdrew ₹${amount.toLocaleString()} from bank account`,
            location: location,
        });
    }

    // Process stock buy transaction
    processStockBuy(
        symbol: string,
        quantity: number,
        price: number,
        location: string = "Stock Market"
    ) {
        const totalCost = quantity * price;

        if (this.currentBalance.cash < totalCost) {
            throw new Error("Insufficient cash balance");
        }

        this.updateCash(this.currentBalance.cash - totalCost);
        this.updateStockValue(this.currentBalance.stockValue + totalCost);

        return this.addTransaction({
            type: "stock_buy",
            amount: totalCost,
            description: `Bought ${quantity} shares of ${symbol} at ₹${price}`,
            location: location,
            symbol: symbol,
            quantity: quantity,
            price: price,
        });
    }

    // Process stock sell transaction
    processStockSell(
        symbol: string,
        quantity: number,
        price: number,
        location: string = "Stock Market"
    ) {
        const totalValue = quantity * price;

        this.updateStockValue(
            Math.max(0, this.currentBalance.stockValue - totalValue)
        );
        this.updateCash(this.currentBalance.cash + totalValue);

        return this.addTransaction({
            type: "stock_sell",
            amount: totalValue,
            description: `Sold ${quantity} shares of ${symbol} at ₹${price}`,
            location: location,
            symbol: symbol,
            quantity: quantity,
            price: price,
        });
    }



    // Notify all balance listeners
    private notifyBalanceChange() {
        this.listeners.forEach((callback) => callback(this.getBalance()));

        // Dispatch global events for legacy systems
        window.dispatchEvent(
            new CustomEvent("balance-updated", {
                detail: this.getBalance(),
            })
        );

        window.dispatchEvent(
            new CustomEvent("rupee-update", {
                detail: { rupees: this.currentBalance.cash },
            })
        );
    }

    // Dispatch transaction events for legacy systems
    private dispatchTransactionEvents(transaction: Transaction) {
        // Generic transaction event
        window.dispatchEvent(
            new CustomEvent("transaction-added", {
                detail: transaction,
            })
        );

        // Specific system events
        switch (transaction.type) {
            case "deposit":
            case "withdrawal":
                window.dispatchEvent(
                    new CustomEvent("bank-transaction", {
                        detail: {
                            type: transaction.type,
                            amount: transaction.amount,
                            description: transaction.description,
                        },
                    })
                );
                break;

            case "stock_buy":
            case "stock_sell":
                window.dispatchEvent(
                    new CustomEvent("stock-transaction", {
                        detail: {
                            type:
                                transaction.type === "stock_buy"
                                    ? "buy"
                                    : "sell",
                            amount: transaction.amount,
                            symbol: transaction.symbol,
                            quantity: transaction.quantity,
                            price: transaction.price,
                        },
                    })
                );
                break;



            case "atm_deposit":
            case "atm_withdrawal":
                window.dispatchEvent(
                    new CustomEvent("atm-transaction", {
                        detail: {
                            type:
                                transaction.type === "atm_deposit"
                                    ? "deposit"
                                    : "withdrawal",
                            amount: transaction.amount,
                            atmName: transaction.location,
                            description: transaction.description,
                        },
                    })
                );
                break;
        }
    }

    // Initialize balance from backend APIs
    private async initializeFromBackend() {
        try {
            // Import APIs dynamically to avoid circular dependencies
            const { playerStateApi, bankingApi, stockApi } =
                await import("../utils/api");

            // Load player state (cash balance)
            try {
                const playerResponse = await playerStateApi.get();
                if (playerResponse.success && playerResponse.data) {
                    const playerCash =
                        playerResponse.data.rupees ||
                        playerResponse.data.cash ||
                        this.currentBalance.cash;
                    this.currentBalance.cash = playerCash;
                    console.log("Loaded player cash from backend:", playerCash);
                }
            } catch (error) {
                console.warn("Failed to load player cash from backend:", error);
            }

            // Load bank balance
            try {
                const bankResponse = await bankingApi.getAccount();
                if (bankResponse.success && bankResponse.data) {
                    const bankBalance = bankResponse.data.balance || 0;
                    this.currentBalance.bankBalance = bankBalance;
                    console.log(
                        "Loaded bank balance from backend:",
                        bankBalance
                    );
                }
            } catch (error) {
                console.warn(
                    "Failed to load bank balance from backend:",
                    error
                );
            }

            // Load stock portfolio value
            try {
                const stockResponse = await stockApi.getPortfolio();
                if (
                    stockResponse.success &&
                    stockResponse.data &&
                    stockResponse.data.holdings
                ) {
                    let totalStockValue = 0;
                    stockResponse.data.holdings.forEach((holding: any) => {
                        totalStockValue +=
                            (holding.quantity || 0) *
                            (holding.averagePrice || 0);
                    });
                    this.currentBalance.stockValue = totalStockValue;
                    console.log(
                        "Loaded stock value from backend:",
                        totalStockValue
                    );
                }
            } catch (error) {
                console.warn(
                    "Failed to load stock portfolio from backend:",
                    error
                );
            }



            // Calculate total value
            this.currentBalance.totalValue =
                this.currentBalance.cash +
                this.currentBalance.bankBalance +
                this.currentBalance.stockValue;

            // Notify listeners and save to storage
            this.notifyBalanceChange();
            this.saveToStorage();

            console.log(
                "Balance Manager initialized from backend:",
                this.currentBalance
            );
        } catch (error) {
            console.error(
                "Failed to initialize balance manager from backend:",
                error
            );
            // Continue with existing balance from localStorage or defaults
        }
    }

    // Initialize balance from game state
    initializeFromGameState(cash: number, bankBalance: number = 0) {
        this.currentBalance.cash = cash;
        this.currentBalance.bankBalance = bankBalance;
        this.currentBalance.totalValue =
            cash +
            bankBalance +
            this.currentBalance.stockValue;
        this.notifyBalanceChange();
        this.saveToStorage();
    }

    // Reset all balances (for testing)
    reset() {
        this.currentBalance = {
            cash: 1000,
            bankBalance: 0,
            stockValue: 0,
            totalValue: 1000,
        };
        this.transactions = [];
        this.saveToStorage();
        this.notifyBalanceChange();
    }
}

// Create singleton instance
export const balanceManager = new BalanceManager();

// Export for global access
(window as any).balanceManager = balanceManager;
