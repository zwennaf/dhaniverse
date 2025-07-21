import { IDL, query, update } from "azle";
import {
    BankAccount,
    Transaction,
    TradeRecord,
    LeaderboardEntry,
    BalanceResponse,
    DepositResponse,
    WithdrawResponse,
    LeaderboardResponse,
} from "./types";

export default class DhaniverseCanister {
    // Storage maps
    private accounts: Map<string, BankAccount> = new Map();
    private transactions: Map<string, Transaction> = new Map();
    private trades: Map<string, TradeRecord[]> = new Map();
    private transactionCounter: number = 0;

    // Helper method to generate unique transaction IDs
    private generateTransactionId(): string {
        this.transactionCounter++;
        return `tx_${Date.now()}_${this.transactionCounter}`;
    }

    // Helper method to get or create account
    private getOrCreateAccount(principal: string): BankAccount {
        let account = this.accounts.get(principal);
        if (!account) {
            account = {
                principal,
                balance: 0,
                lastUpdated: Date.now(),
                transactionCount: 0,
            };
            this.accounts.set(principal, account);
        }
        return account;
    }

    // Banking Operations
    @query(
        [IDL.Text],
        IDL.Record({
            balance: IDL.Float64,
            lastUpdated: IDL.Nat64,
        })
    )
    getBalance(principal: string): BalanceResponse {
        const account = this.getOrCreateAccount(principal);
        return {
            balance: account.balance,
            lastUpdated: account.lastUpdated,
        };
    }

    @update(
        [IDL.Float64],
        IDL.Record({
            success: IDL.Bool,
            newBalance: IDL.Float64,
            transactionId: IDL.Text,
        })
    )
    deposit(amount: number): DepositResponse {
        const callerPrincipal = "demo-user"; // For demo purposes - in production use proper caller identification

        if (amount <= 0) {
            throw new Error("Deposit amount must be positive");
        }

        const account = this.getOrCreateAccount(callerPrincipal);
        const transactionId = this.generateTransactionId();

        // Update account
        account.balance += amount;
        account.lastUpdated = Date.now();
        account.transactionCount++;
        this.accounts.set(callerPrincipal, account);

        // Record transaction
        const transaction: Transaction = {
            id: transactionId,
            principal: callerPrincipal,
            type: "deposit",
            amount,
            timestamp: Date.now(),
        };
        this.transactions.set(transactionId, transaction);

        return {
            success: true,
            newBalance: account.balance,
            transactionId,
        };
    }

    @update(
        [IDL.Float64],
        IDL.Record({
            success: IDL.Bool,
            newBalance: IDL.Float64,
            transactionId: IDL.Text,
            error: IDL.Opt(IDL.Text),
        })
    )
    withdraw(amount: number): WithdrawResponse {
        const callerPrincipal = "demo-user"; // For demo purposes - in production use proper caller identification

        if (amount <= 0) {
            return {
                success: false,
                newBalance: 0,
                transactionId: "",
                error: "Withdrawal amount must be positive",
            };
        }

        const account = this.getOrCreateAccount(callerPrincipal);

        if (account.balance < amount) {
            return {
                success: false,
                newBalance: account.balance,
                transactionId: "",
                error: "Insufficient funds",
            };
        }

        const transactionId = this.generateTransactionId();

        // Update account
        account.balance -= amount;
        account.lastUpdated = Date.now();
        account.transactionCount++;
        this.accounts.set(callerPrincipal, account);

        // Record transaction
        const transaction: Transaction = {
            id: transactionId,
            principal: callerPrincipal,
            type: "withdraw",
            amount,
            timestamp: Date.now(),
        };
        this.transactions.set(transactionId, transaction);

        return {
            success: true,
            newBalance: account.balance,
            transactionId,
        };
    }

    @query(
        [IDL.Text],
        IDL.Vec(
            IDL.Record({
                id: IDL.Text,
                principal: IDL.Text,
                type: IDL.Text,
                amount: IDL.Float64,
                timestamp: IDL.Nat64,
            })
        )
    )
    getTransactionHistory(principal: string): Transaction[] {
        const userTransactions: Transaction[] = [];

        this.transactions.forEach((transaction) => {
            if (transaction.principal === principal) {
                userTransactions.push(transaction);
            }
        });

        // Sort by timestamp (newest first)
        return userTransactions.sort((a, b) => b.timestamp - a.timestamp);
    }

    // Leaderboard Operations
    @update([IDL.Float64, IDL.Text], IDL.Bool)
    recordTrade(profit: number, stockSymbol: string): boolean {
        const caller = "anonymous"; // For demo purposes - in real implementation use proper caller identification

        const trade: TradeRecord = {
            principal: caller,
            stockSymbol,
            profit,
            timestamp: Date.now(),
            verified: true,
        };

        let userTrades = this.trades.get(caller) || [];
        userTrades.push(trade);
        this.trades.set(caller, userTrades);

        return true;
    }

    @query(
        [IDL.Opt(IDL.Nat32)],
        IDL.Record({
            entries: IDL.Vec(
                IDL.Record({
                    principal: IDL.Text,
                    displayName: IDL.Opt(IDL.Text),
                    totalProfit: IDL.Float64,
                    tradeCount: IDL.Nat32,
                    rank: IDL.Nat32,
                    badges: IDL.Vec(IDL.Text),
                })
            ),
            totalEntries: IDL.Nat32,
        })
    )
    getLeaderboard(limit?: number): LeaderboardResponse {
        const leaderboardMap = new Map<string, LeaderboardEntry>();

        // Calculate totals for each user
        this.trades.forEach((trades, principal) => {
            const totalProfit = trades.reduce(
                (sum: number, trade: TradeRecord) => sum + trade.profit,
                0
            );
            const tradeCount = trades.length;

            leaderboardMap.set(principal, {
                principal,
                totalProfit,
                tradeCount,
                rank: 0, // Will be set after sorting
                badges: this.calculateBadges(totalProfit, tradeCount),
            });
        });

        // Convert to array and sort by total profit
        const entries = Array.from(leaderboardMap.values()).sort(
            (a, b) => b.totalProfit - a.totalProfit
        );

        // Assign ranks
        entries.forEach((entry, index) => {
            entry.rank = index + 1;
        });

        // Apply limit if specified
        const limitedEntries = limit ? entries.slice(0, limit) : entries;

        return {
            entries: limitedEntries,
            totalEntries: entries.length,
        };
    }

    @query([IDL.Text], IDL.Nat32)
    getUserRank(principal: string): number {
        const leaderboard = this.getLeaderboard();
        const userEntry = leaderboard.entries.find(
            (entry) => entry.principal === principal
        );
        return userEntry ? userEntry.rank : 0;
    }

    // Helper method to calculate badges based on performance
    private calculateBadges(totalProfit: number, tradeCount: number): string[] {
        const badges: string[] = [];

        if (totalProfit >= 10000) badges.push("High Roller");
        if (totalProfit >= 50000) badges.push("Profit Master");
        if (totalProfit >= 100000) badges.push("Trading Legend");

        if (tradeCount >= 10) badges.push("Active Trader");
        if (tradeCount >= 50) badges.push("Market Veteran");
        if (tradeCount >= 100) badges.push("Trading Addict");

        return badges;
    }

    // Health check endpoint
    @query([], IDL.Text)
    getHealth(): string {
        return `Dhaniverse Canister is healthy. Accounts: ${this.accounts.size}, Transactions: ${this.transactions.size}`;
    }
}
