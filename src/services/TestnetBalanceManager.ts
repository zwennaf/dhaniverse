/**
 * ICP Balance Manager
 * Manages ICP-based token balances, transactions, and canister interactions
 */

import { dhaniverse_backend, createActor } from '../../packages/icp-canister/src/declarations/dhaniverse_backend';
import { AuthClient } from '@dfinity/auth-client';
import { Actor, HttpAgent } from '@dfinity/agent';

export interface ICPToken {
    symbol: string;
    name: string;
    canister_id?: string;
    decimals: number;
    balance: string;
    usdValue?: number;
}

export interface ICPTransaction {
    id: string;
    type: 'faucet' | 'transfer' | 'stake' | 'unstake' | 'reward' | 'exchange';
    tokenSymbol: string;
    amount: string;
    from?: string;
    to?: string;
    hash?: string;
    timestamp: Date;
    status: 'pending' | 'confirmed' | 'failed';
    network: string;
}

export interface DualBalance {
    rupees_balance: number;
    token_balance: number;
    last_updated: number;
}

export interface TestnetNetwork {
    chainId: string;
    name: string;
    rpcUrl: string;
    blockExplorer: string;
    faucetUrl?: string;
    nativeCurrency: {
        name: string;
        symbol: string;
        decimals: number;
    };
}

// ICP and native tokens
const DEFAULT_ICP_TOKENS: ICPToken[] = [
    {
        symbol: 'ICP',
        name: 'Internet Computer',
        canister_id: 'rrkah-fqaaa-aaaaa-aaaaq-cai', // ICP ledger canister
        decimals: 8,
        balance: '0'
    },
    {
        symbol: 'DHANI',
        name: 'Dhaniverse Token',
        canister_id: '', // Your token canister ID
        decimals: 8,
        balance: '0'
    }
];

// Common testnet configurations for backwards compatibility
export const TESTNETS: Record<string, TestnetNetwork> = {
    icp: {
        chainId: 'icp',
        name: 'Internet Computer',
        rpcUrl: process.env.NODE_ENV === 'production' ? 'https://ic0.app' : 'http://localhost:4943',
        blockExplorer: 'https://dashboard.internetcomputer.org',
        nativeCurrency: {
            name: 'Internet Computer',
            symbol: 'ICP',
            decimals: 8
        }
    }
};

export class ICPBalanceManager {
    private tokens: Map<string, ICPToken> = new Map();
    private transactions: ICPTransaction[] = [];
    private walletAddress: string = '';
    private balanceListeners: Set<(tokens: ICPToken[]) => void> = new Set();
    private transactionListeners: Set<(transaction: ICPTransaction) => void> = new Set();
    private authClient: AuthClient | null = null;
    private actor: any = null;
    private isInitialized = false;

    constructor() {
        this.initializeDefaultTokens();
        this.loadFromStorage();
    }

    private initializeDefaultTokens() {
        DEFAULT_ICP_TOKENS.forEach(token => {
            this.tokens.set(token.symbol, { ...token });
        });
    }

    private loadFromStorage() {
        try {
            const savedTokens = localStorage.getItem('icp_tokens');
            const savedTransactions = localStorage.getItem('icp_transactions');
            const savedWallet = localStorage.getItem('icp_wallet_address');

            if (savedTokens) {
                const parsedTokens = JSON.parse(savedTokens);
                parsedTokens.forEach((token: ICPToken) => {
                    this.tokens.set(token.symbol, token);
                });
            }

            if (savedTransactions) {
                this.transactions = JSON.parse(savedTransactions);
            }

            if (savedWallet) {
                this.walletAddress = savedWallet;
            }
        } catch (error) {
            console.error('Failed to load ICP data from storage:', error);
        }
    }

    private saveToStorage() {
        try {
            localStorage.setItem('icp_tokens', JSON.stringify(Array.from(this.tokens.values())));
            localStorage.setItem('icp_transactions', JSON.stringify(this.transactions));
            localStorage.setItem('icp_wallet_address', this.walletAddress);
        } catch (error) {
            console.error('Failed to save ICP data to storage:', error);
        }
    }

    // Initialize with ICP auth client and canister
    async initialize(provider?: any) {
        if (this.isInitialized) return;

        try {
            // Initialize auth client
            this.authClient = await AuthClient.create();
            
            // Check if already authenticated
            if (await this.authClient.isAuthenticated()) {
                await this.setupActor();
                const identity = this.authClient.getIdentity();
                this.walletAddress = identity.getPrincipal().toString();
                await this.refreshAllBalances();
            }
            
            this.isInitialized = true;
        } catch (error) {
            console.error('Failed to initialize ICPBalanceManager:', error);
        }
    }

    private async setupActor() {
        if (!this.authClient) return;

        const identity = this.authClient.getIdentity();
        const agent = new HttpAgent({ identity });
        
        // Only fetch root key in development
        if (process.env.NODE_ENV !== 'production') {
            await agent.fetchRootKey();
        }

        // Use the known canister ID for dhaniverse_backend
        const canisterId = 'dzbzg-eqaaa-aaaap-an3rq-cai';
        this.actor = dhaniverse_backend || createActor(canisterId, {
            agent,
        });
    }

    // Authenticate with Internet Identity
    async authenticateWithII(): Promise<boolean> {
        try {
            if (!this.authClient) {
                this.authClient = await AuthClient.create();
            }

            return new Promise((resolve, reject) => {
                this.authClient!.login({
                    identityProvider: process.env.NODE_ENV === 'production' 
                        ? 'https://identity.ic0.app'
                        : `http://localhost:4943/?canisterId=${process.env.CANISTER_ID_INTERNET_IDENTITY}`,
                    onSuccess: async () => {
                        await this.setupActor();
                        const identity = this.authClient!.getIdentity();
                        this.walletAddress = identity.getPrincipal().toString();
                        this.saveToStorage();
                        await this.refreshAllBalances();
                        resolve(true);
                    },
                    onError: (error) => {
                        console.error('Authentication failed:', error);
                        reject(error);
                    },
                });
            });
        } catch (error) {
            console.error('Failed to authenticate with Internet Identity:', error);
            return false;
        }
    }

    // Connect with Web3 wallet (MetaMask, etc.) via canister
    async connectWeb3Wallet(walletType: string, address: string, chainId: string): Promise<boolean> {
        try {
            if (!this.actor) {
                throw new Error('Actor not initialized. Please authenticate first.');
            }

            const result = await this.actor.connect_wallet(
                { [walletType]: null },
                address,
                chainId
            );

            if (result) {
                this.walletAddress = address;
                this.saveToStorage();
                await this.refreshAllBalances();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Failed to connect Web3 wallet:', error);
            return false;
        }
    }

    // Get dual balance (rupees + tokens) from canister
    async getDualBalance(): Promise<DualBalance | null> {
        try {
            if (!this.actor || !this.walletAddress) return null;

            const result = await this.actor.get_dual_balance(this.walletAddress);
            return result;
        } catch (error) {
            console.error('Failed to get dual balance:', error);
            return null;
        }
    }

    // Get balance for a specific token from canister
    async getTokenBalance(tokenSymbol: string): Promise<string> {
        const token = this.tokens.get(tokenSymbol);
        if (!token) return '0';

        try {
            if (!this.actor || !this.walletAddress) {
                return token.balance;
            }

            // Get balance from canister
            const balance = await this.actor.get_token_balance(this.walletAddress, tokenSymbol);
            return balance.toString();
        } catch (error) {
            console.error(`Failed to fetch balance for ${tokenSymbol}:`, error);
            return token.balance;
        }
    }

    // Refresh all token balances from canister
    async refreshAllBalances() {
        if (!this.actor || !this.walletAddress) return;

        try {
            // Get dual balance (rupees + tokens)
            const dualBalance = await this.getDualBalance();
            if (dualBalance) {
                // Update DHANI token balance
                const dhaniToken = this.tokens.get('DHANI');
                if (dhaniToken) {
                    dhaniToken.balance = dualBalance.token_balance.toString();
                }
            }

            // Get other token balances
            for (const [symbol, token] of this.tokens) {
                if (symbol !== 'DHANI') {
                    const balance = await this.getTokenBalance(symbol);
                    token.balance = balance;
                }
            }

            this.saveToStorage();
            this.notifyBalanceListeners();
        } catch (error) {
            console.error('Failed to refresh balances:', error);
        }
    }

    // Exchange currency via canister
    async exchangeCurrency(fromCurrency: string, toCurrency: string, amount: number): Promise<boolean> {
        try {
            if (!this.actor || !this.walletAddress) {
                throw new Error('Not connected to canister');
            }

            const result = await this.actor.exchange_currency(
                this.walletAddress,
                fromCurrency,
                toCurrency,
                amount
            );

            if (result.success) {
                this.addTransaction({
                    type: 'exchange',
                    tokenSymbol: `${fromCurrency}->${toCurrency}`,
                    amount: amount.toString(),
                    status: 'confirmed',
                    network: 'ICP'
                });

                await this.refreshAllBalances();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Exchange failed:', error);
            return false;
        }
    }

    // Add a new token
    addToken(token: ICPToken) {
        this.tokens.set(token.symbol, { ...token });
        this.saveToStorage();
        this.notifyBalanceListeners();
    }

    // Remove a token
    removeToken(symbol: string) {
        this.tokens.delete(symbol);
        this.saveToStorage();
        this.notifyBalanceListeners();
    }

    // Get all tokens
    getAllTokens(): ICPToken[] {
        return Array.from(this.tokens.values());
    }

    // Add a transaction
    addTransaction(transaction: Omit<ICPTransaction, 'id' | 'timestamp'>) {
        const newTransaction: ICPTransaction = {
            ...transaction,
            id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date()
        };

        this.transactions.unshift(newTransaction);
        
        // Keep only last 100 transactions
        if (this.transactions.length > 100) {
            this.transactions = this.transactions.slice(0, 100);
        }

        this.saveToStorage();
        this.notifyTransactionListeners(newTransaction);
    }

    // Get transaction history
    getTransactionHistory(limit?: number): ICPTransaction[] {
        return limit ? this.transactions.slice(0, limit) : this.transactions;
    }

    // Get current wallet address/principal
    getWalletAddress(): string {
        return this.walletAddress;
    }

    // Check if authenticated
    isAuthenticated(): boolean {
        return !!this.walletAddress && !!this.actor;
    }

    // Logout
    async logout() {
        try {
            if (this.authClient) {
                await this.authClient.logout();
            }
            
            this.walletAddress = '';
            this.actor = null;
            this.tokens.clear();
            this.initializeDefaultTokens();
            this.saveToStorage();
            this.notifyBalanceListeners();
        } catch (error) {
            console.error('Logout failed:', error);
        }
    }

    // Request tokens from faucet (simulation for testing)
    async requestFromFaucet(tokenSymbol: string, amount: string): Promise<boolean> {
        try {
            const token = this.tokens.get(tokenSymbol);
            if (!token) return false;

            // In real implementation, this would call the canister faucet method
            // For now, we'll simulate it for testing
            const currentBalance = parseFloat(token.balance) || 0;
            const faucetAmount = parseFloat(amount);
            
            token.balance = (currentBalance + faucetAmount).toString();
            
            this.addTransaction({
                type: 'faucet',
                tokenSymbol,
                amount,
                status: 'confirmed',
                network: 'ICP'
            });

            this.saveToStorage();
            this.notifyBalanceListeners();
            
            return true;
        } catch (error) {
            console.error('Faucet request failed:', error);
            return false;
        }
    }

    // Switch network (for compatibility)
    async switchNetwork(networkKey: string) {
        // ICP doesn't have multiple networks like Ethereum
        // This is here for compatibility with the existing interface
        console.log(`Network switch requested: ${networkKey} (ICP is single network)`);
    }

    // Get current network info
    getCurrentNetwork(): TestnetNetwork {
        return TESTNETS.icp;
    }

    // Get all available networks
    getAvailableNetworks(): TestnetNetwork[] {
        return Object.values(TESTNETS);
    }

    // Subscribe to balance updates
    onBalanceUpdate(callback: (tokens: ICPToken[]) => void) {
        this.balanceListeners.add(callback);
        return () => this.balanceListeners.delete(callback);
    }

    // Subscribe to transaction updates
    onTransactionUpdate(callback: (transaction: ICPTransaction) => void) {
        this.transactionListeners.add(callback);
        return () => this.transactionListeners.delete(callback);
    }

    private notifyBalanceListeners() {
        const tokens = this.getAllTokens();
        this.balanceListeners.forEach(callback => callback(tokens));
    }

    private notifyTransactionListeners(transaction: ICPTransaction) {
        this.transactionListeners.forEach(callback => callback(transaction));
    }

    // Get total portfolio value in USD
    getTotalPortfolioValue(): number {
        return Array.from(this.tokens.values()).reduce((total, token) => {
            const balance = parseFloat(token.balance) || 0;
            const usdValue = token.usdValue || 0;
            return total + (balance * usdValue);
        }, 0);
    }

    // Export data for backup
    exportData() {
        return {
            tokens: Array.from(this.tokens.values()),
            transactions: this.transactions,
            walletAddress: this.walletAddress,
            exportDate: new Date().toISOString()
        };
    }

    // Import data from backup
    importData(data: any) {
        try {
            if (data.tokens) {
                this.tokens.clear();
                data.tokens.forEach((token: ICPToken) => {
                    this.tokens.set(token.symbol, token);
                });
            }
            
            if (data.transactions) {
                this.transactions = data.transactions;
            }
            
            if (data.walletAddress) {
                this.walletAddress = data.walletAddress;
            }

            this.saveToStorage();
            this.notifyBalanceListeners();
            return true;
        } catch (error) {
            console.error('Failed to import data:', error);
            return false;
        }
    }

    // Clear all data
    clearAllData() {
        this.tokens.clear();
        this.transactions = [];
        this.walletAddress = '';
        this.initializeDefaultTokens();
        this.saveToStorage();
        this.notifyBalanceListeners();
    }
}

// Singleton instance
export const icpBalanceManager = new ICPBalanceManager();

// For backwards compatibility
export const testnetBalanceManager = icpBalanceManager;
export type TestnetToken = ICPToken;
export type TestnetTransaction = ICPTransaction;
