// Web3 Wallet Service - Supports multiple browser wallets
export interface WalletInfo {
    name: string;
    type: WalletType;
    icon: string;
    installed: boolean;
    downloadUrl?: string;
}

export interface WalletConnection {
    address: string;
    chainId: string;
    walletType: WalletType;
    balance?: string;
}

export interface WalletStatus {
    connected: boolean;
    address?: string;
    walletType?: WalletType;
    error?: string;
    isConnecting?: boolean;
    balance?: string;
}

export enum WalletType {
    METAMASK = 'metamask',
    PHANTOM = 'phantom',
    COINBASE = 'coinbase',
    WALLETCONNECT = 'walletconnect',
    INJECTED = 'injected'
}

export interface Web3Transaction {
    id: string;
    from: string;
    to?: string;
    amount: number;
    type: 'deposit' | 'withdraw' | 'exchange' | 'stake';
    timestamp: number;
    status: 'pending' | 'confirmed' | 'failed';
    hash?: string;
}

export class Web3WalletService {
    private currentConnection: WalletConnection | null = null;
    private connectionCallbacks: ((status: WalletStatus) => void)[] = [];
    private transactions: Web3Transaction[] = [];

    constructor() {
        this.setupEventListeners();
        this.loadStoredConnection();
    }

    // Get available wallets in browser
    getAvailableWallets(): WalletInfo[] {
        return [
            {
                name: 'MetaMask',
                type: WalletType.METAMASK,
                icon: '🦊',
                installed: this.isMetaMaskInstalled(),
                downloadUrl: 'https://metamask.io/download/'
            },
            {
                name: 'Phantom',
                type: WalletType.PHANTOM,
                icon: '👻',
                installed: this.isPhantomInstalled(),
                downloadUrl: 'https://phantom.app/'
            },
            {
                name: 'Coinbase Wallet',
                type: WalletType.COINBASE,
                icon: '🔵',
                installed: this.isCoinbaseInstalled(),
                downloadUrl: 'https://www.coinbase.com/wallet'
            }
        ];
    }

    // Check wallet installations
    private isMetaMaskInstalled(): boolean {
        return typeof (window as any).ethereum !== 'undefined' && 
               (window as any).ethereum.isMetaMask;
    }

    private isPhantomInstalled(): boolean {
        return typeof (window as any).solana !== 'undefined' && 
               (window as any).solana.isPhantom;
    }

    private isCoinbaseInstalled(): boolean {
        return typeof (window as any).ethereum !== 'undefined' && 
               (window as any).ethereum.isCoinbaseWallet;
    }

    // Connect to wallet
    async connectWallet(walletType: WalletType): Promise<{ success: boolean; error?: string }> {
        try {
            this.notifyStatusChange({ isConnecting: true });

            let connection: WalletConnection;

            switch (walletType) {
                case WalletType.METAMASK:
                    connection = await this.connectMetaMask();
                    break;
                case WalletType.PHANTOM:
                    connection = await this.connectPhantom();
                    break;
                case WalletType.COINBASE:
                    connection = await this.connectCoinbase();
                    break;
                default:
                    throw new Error(`Unsupported wallet type: ${walletType}`);
            }

            this.currentConnection = connection;
            this.storeConnection(connection);
            
            this.notifyStatusChange({
                connected: true,
                address: connection.address,
                walletType: connection.walletType,
                balance: connection.balance,
                isConnecting: false
            });

            return { success: true };
        } catch (error) {
            this.notifyStatusChange({
                connected: false,
                isConnecting: false,
                error: `Failed to connect: ${error}`
            });
            return { success: false, error: String(error) };
        }
    }

    // MetaMask connection
    private async connectMetaMask(): Promise<WalletConnection> {
        if (!this.isMetaMaskInstalled()) {
            throw new Error('MetaMask not installed');
        }

        const ethereum = (window as any).ethereum;
        
        // Request account access
        const accounts = await ethereum.request({ 
            method: 'eth_requestAccounts' 
        });

        if (!accounts || accounts.length === 0) {
            throw new Error('No accounts found');
        }

        // Get chain ID
        const chainId = await ethereum.request({ 
            method: 'eth_chainId' 
        });

        // Get balance
        const balance = await ethereum.request({
            method: 'eth_getBalance',
            params: [accounts[0], 'latest']
        });

        return {
            address: accounts[0],
            chainId,
            walletType: WalletType.METAMASK,
            balance: this.formatBalance(balance)
        };
    }

    // Phantom connection
    private async connectPhantom(): Promise<WalletConnection> {
        if (!this.isPhantomInstalled()) {
            throw new Error('Phantom wallet not installed');
        }

        const solana = (window as any).solana;
        
        const response = await solana.connect();
        
        if (!response.publicKey) {
            throw new Error('Failed to connect to Phantom');
        }

        // Get balance (Solana)
        const balance = await this.getSolanaBalance(response.publicKey.toString());

        return {
            address: response.publicKey.toString(),
            chainId: 'solana-mainnet',
            walletType: WalletType.PHANTOM,
            balance
        };
    }

    // Coinbase connection
    private async connectCoinbase(): Promise<WalletConnection> {
        if (!this.isCoinbaseInstalled()) {
            throw new Error('Coinbase Wallet not installed');
        }

        const ethereum = (window as any).ethereum;
        
        const accounts = await ethereum.request({ 
            method: 'eth_requestAccounts' 
        });

        if (!accounts || accounts.length === 0) {
            throw new Error('No accounts found');
        }

        const chainId = await ethereum.request({ 
            method: 'eth_chainId' 
        });

        const balance = await ethereum.request({
            method: 'eth_getBalance',
            params: [accounts[0], 'latest']
        });

        return {
            address: accounts[0],
            chainId,
            walletType: WalletType.COINBASE,
            balance: this.formatBalance(balance)
        };
    }

    // Auto-detect and connect
    async autoConnect(): Promise<{ success: boolean; error?: string }> {
        const wallets = this.getAvailableWallets();
        
        // Try installed wallets in order of preference
        for (const wallet of wallets) {
            if (wallet.installed) {
                const result = await this.connectWallet(wallet.type);
                if (result.success) {
                    return result;
                }
            }
        }

        return { 
            success: false, 
            error: 'No compatible wallets found. Please install MetaMask, Phantom, or Coinbase Wallet.' 
        };
    }

    // Disconnect wallet
    async disconnectWallet(): Promise<void> {
        if (this.currentConnection?.walletType === WalletType.PHANTOM) {
            const solana = (window as any).solana;
            if (solana?.disconnect) {
                await solana.disconnect();
            }
        }

        this.currentConnection = null;
        this.clearStoredConnection();
        
        this.notifyStatusChange({
            connected: false,
            address: undefined,
            walletType: undefined,
            balance: undefined
        });
    }

    // Get current status
    getStatus(): WalletStatus {
        return {
            connected: !!this.currentConnection,
            address: this.currentConnection?.address,
            walletType: this.currentConnection?.walletType,
            balance: this.currentConnection?.balance
        };
    }

    // Banking operations
    async deposit(amount: number): Promise<Web3Transaction> {
        if (!this.currentConnection) {
            throw new Error('No wallet connected');
        }

        const transaction: Web3Transaction = {
            id: this.generateTransactionId(),
            from: this.currentConnection.address,
            amount,
            type: 'deposit',
            timestamp: Date.now(),
            status: 'pending'
        };

        this.transactions.push(transaction);
        
        // Simulate transaction processing
        setTimeout(() => {
            transaction.status = 'confirmed';
            transaction.hash = this.generateTxHash();
        }, 2000);

        return transaction;
    }

    async withdraw(amount: number): Promise<Web3Transaction> {
        if (!this.currentConnection) {
            throw new Error('No wallet connected');
        }

        const transaction: Web3Transaction = {
            id: this.generateTransactionId(),
            from: this.currentConnection.address,
            amount,
            type: 'withdraw',
            timestamp: Date.now(),
            status: 'pending'
        };

        this.transactions.push(transaction);
        
        // Simulate transaction processing
        setTimeout(() => {
            transaction.status = 'confirmed';
            transaction.hash = this.generateTxHash();
        }, 2000);

        return transaction;
    }

    async exchangeCurrency(fromCurrency: string, toCurrency: string, amount: number): Promise<Web3Transaction> {
        if (!this.currentConnection) {
            throw new Error('No wallet connected');
        }

        const transaction: Web3Transaction = {
            id: this.generateTransactionId(),
            from: this.currentConnection.address,
            amount,
            type: 'exchange',
            timestamp: Date.now(),
            status: 'pending'
        };

        this.transactions.push(transaction);
        
        // Simulate exchange processing
        setTimeout(() => {
            transaction.status = 'confirmed';
            transaction.hash = this.generateTxHash();
        }, 1500);

        return transaction;
    }

    async stakeTokens(amount: number, duration: number): Promise<Web3Transaction> {
        if (!this.currentConnection) {
            throw new Error('No wallet connected');
        }

        const transaction: Web3Transaction = {
            id: this.generateTransactionId(),
            from: this.currentConnection.address,
            amount,
            type: 'stake',
            timestamp: Date.now(),
            status: 'pending'
        };

        this.transactions.push(transaction);
        
        // Simulate staking processing
        setTimeout(() => {
            transaction.status = 'confirmed';
            transaction.hash = this.generateTxHash();
        }, 3000);

        return transaction;
    }

    // Get transaction history
    getTransactionHistory(): Web3Transaction[] {
        return this.transactions.sort((a, b) => b.timestamp - a.timestamp);
    }

    // Event listeners
    onStatusChange(callback: (status: WalletStatus) => void): void {
        this.connectionCallbacks.push(callback);
    }

    removeStatusListener(callback: (status: WalletStatus) => void): void {
        const index = this.connectionCallbacks.indexOf(callback);
        if (index > -1) {
            this.connectionCallbacks.splice(index, 1);
        }
    }

    // Private helper methods
    private setupEventListeners(): void {
        // Listen for account changes
        if (typeof (window as any).ethereum !== 'undefined') {
            (window as any).ethereum.on('accountsChanged', (accounts: string[]) => {
                if (accounts.length === 0) {
                    this.disconnectWallet();
                } else if (this.currentConnection) {
                    this.currentConnection.address = accounts[0];
                    this.notifyStatusChange({
                        connected: true,
                        address: accounts[0],
                        walletType: this.currentConnection.walletType
                    });
                }
            });

            (window as any).ethereum.on('chainChanged', (chainId: string) => {
                if (this.currentConnection) {
                    this.currentConnection.chainId = chainId;
                }
            });
        }

        // Listen for Phantom events
        if (typeof (window as any).solana !== 'undefined') {
            (window as any).solana.on('disconnect', () => {
                this.disconnectWallet();
            });
        }
    }

    private notifyStatusChange(status: Partial<WalletStatus>): void {
        const fullStatus = { ...this.getStatus(), ...status };
        this.connectionCallbacks.forEach(callback => callback(fullStatus));
    }

    private storeConnection(connection: WalletConnection): void {
        localStorage.setItem('dhaniverse_wallet_connection', JSON.stringify(connection));
    }

    private loadStoredConnection(): void {
        try {
            const stored = localStorage.getItem('dhaniverse_wallet_connection');
            if (stored) {
                this.currentConnection = JSON.parse(stored);
                // Verify connection is still valid
                this.verifyStoredConnection();
            }
        } catch (error) {
            console.warn('Failed to load stored connection:', error);
            this.clearStoredConnection();
        }
    }

    private async verifyStoredConnection(): Promise<void> {
        if (!this.currentConnection) return;

        try {
            // Try to verify the connection is still active
            const wallets = this.getAvailableWallets();
            const wallet = wallets.find(w => w.type === this.currentConnection?.walletType);
            
            if (wallet?.installed) {
                this.notifyStatusChange({
                    connected: true,
                    address: this.currentConnection.address,
                    walletType: this.currentConnection.walletType,
                    balance: this.currentConnection.balance
                });
            } else {
                this.clearStoredConnection();
            }
        } catch (error) {
            console.warn('Failed to verify stored connection:', error);
            this.clearStoredConnection();
        }
    }

    private clearStoredConnection(): void {
        localStorage.removeItem('dhaniverse_wallet_connection');
        this.currentConnection = null;
    }

    private formatBalance(balance: string): string {
        // Convert hex balance to decimal and format
        const balanceInWei = parseInt(balance, 16);
        const balanceInEth = balanceInWei / Math.pow(10, 18);
        return balanceInEth.toFixed(4);
    }

    private async getSolanaBalance(publicKey: string): Promise<string> {
        // Simulate Solana balance check
        return (Math.random() * 10).toFixed(4);
    }

    private generateTransactionId(): string {
        return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private generateTxHash(): string {
        return `0x${Math.random().toString(16).substr(2, 64)}`;
    }
}