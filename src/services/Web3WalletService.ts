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
            ,
            {
                name: 'Injected',
                type: WalletType.INJECTED,
                icon: '🔌',
                installed: this.isInjectedAvailable(),
                downloadUrl: undefined
            }
        ];
    }

    // Check wallet installations
    private isMetaMaskInstalled(): boolean {
        const eth = (window as any).ethereum;
        if (!eth) return false;

        // Some browsers expose multiple providers (e.g. window.ethereum.providers)
        if (Array.isArray(eth.providers)) {
            return eth.providers.some((p: any) => p && p.isMetaMask);
        }

        return !!eth.isMetaMask;
    }

    private isPhantomInstalled(): boolean {
    return typeof (window as any).solana !== 'undefined' && (window as any).solana.isPhantom;
    }

    private isCoinbaseInstalled(): boolean {
        const eth = (window as any).ethereum;
        if (!eth) return false;

        if (Array.isArray(eth.providers)) {
            return eth.providers.some((p: any) => p && p.isCoinbaseWallet);
        }

        return !!eth.isCoinbaseWallet;
    }

    private isInjectedAvailable(): boolean {
        return typeof (window as any).ethereum !== 'undefined';
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
                case WalletType.INJECTED:
                    connection = await this.connectInjected();
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
        // First, attempt a silent check (no popup) to see if a wallet is already authorized for this site.
        // For Ethereum providers we use 'eth_accounts' which does not prompt. For Phantom we use onlyIfTrusted.

        // Helper: try silent connect for an ethereum provider
        const trySilentEthereum = async (provider: any): Promise<WalletConnection | null> => {
            try {
                if (!provider || !provider.request) return null;
                const accounts = await provider.request({ method: 'eth_accounts' });
                if (!accounts || accounts.length === 0) return null;
                const chainId = await provider.request({ method: 'eth_chainId' });
                const balance = await provider.request({ method: 'eth_getBalance', params: [accounts[0], 'latest'] });
                return {
                    address: accounts[0],
                    chainId,
                    walletType: WalletType.INJECTED,
                    balance: this.formatBalance(balance)
                };
            } catch (e) {
                return null;
            }
        };

        // Helper: try silent connect for Phantom
        const trySilentPhantom = async (): Promise<WalletConnection | null> => {
            try {
                const solana = (window as any).solana;
                if (!solana) return null;
                // some phantom builds support onlyIfTrusted to avoid prompting
                if (solana.isConnected) {
                    const pub = solana.publicKey?.toString?.() || (await solana.connect({ onlyIfTrusted: true })).publicKey.toString();
                    if (!pub) return null;
                    const balance = await this.getSolanaBalance(pub);
                    return {
                        address: pub,
                        chainId: 'solana-mainnet',
                        walletType: WalletType.PHANTOM,
                        balance
                    };
                } else {
                    // attempt onlyIfTrusted which should not prompt
                    const res = await solana.connect?.({ onlyIfTrusted: true });
                    if (res?.publicKey) {
                        const pub = res.publicKey.toString();
                        const balance = await this.getSolanaBalance(pub);
                        return {
                            address: pub,
                            chainId: 'solana-mainnet',
                            walletType: WalletType.PHANTOM,
                            balance
                        };
                    }
                }
                return null;
            } catch (e) {
                return null;
            }
        };

        // Check named wallets first with silent checks
        for (const wallet of wallets) {
            if (!wallet.installed) continue;

            if (wallet.type === WalletType.PHANTOM) {
                const conn = await trySilentPhantom();
                if (conn) {
                    this.currentConnection = conn;
                    this.storeConnection(conn);
                    this.notifyStatusChange({ connected: true, address: conn.address, walletType: conn.walletType, balance: conn.balance });
                    return { success: true };
                }
                continue;
            }

            if (wallet.type === WalletType.METAMASK || wallet.type === WalletType.COINBASE) {
                // iterate ethereum providers and look for provider flagged as the wallet type
                const win: any = window as any;
                const eth = win.ethereum;
                const candidates: any[] = [];
                if (eth) {
                    if (Array.isArray(eth.providers) && eth.providers.length > 0) candidates.push(...eth.providers);
                    else candidates.push(eth);
                }

                for (const provider of candidates) {
                    try {
                        if (!provider) continue;
                        // If checking specific wallet, skip providers that don't match when possible
                        if (wallet.type === WalletType.METAMASK && provider.isMetaMask === false) continue;
                        if (wallet.type === WalletType.COINBASE && provider.isCoinbaseWallet === false) continue;

                        const conn = await trySilentEthereum(provider);
                        if (conn) {
                            // assign proper walletType if provider reports identity
                            conn.walletType = wallet.type === WalletType.METAMASK ? WalletType.METAMASK : WalletType.COINBASE;
                            this.currentConnection = conn;
                            this.storeConnection(conn);
                            this.notifyStatusChange({ connected: true, address: conn.address, walletType: conn.walletType, balance: conn.balance });
                            return { success: true };
                        }
                    } catch (e) {
                        continue;
                    }
                }
            }
        }

        // If no silent connection found, try generic injected providers silently
        const winAny: any = window as any;
        const ethAny = winAny.ethereum || (winAny.web3 && winAny.web3.currentProvider);
        if (ethAny) {
            const candidates: any[] = [];
            if (Array.isArray(ethAny.providers) && ethAny.providers.length > 0) candidates.push(...ethAny.providers);
            else candidates.push(ethAny);

            for (const provider of candidates) {
                const conn = await (async () => {
                    try {
                        if (!provider) return null;
                        return await (async () => {
                            const accounts = await provider.request({ method: 'eth_accounts' });
                            if (!accounts || accounts.length === 0) return null;
                            const chainId = await provider.request({ method: 'eth_chainId' });
                            const balance = await provider.request({ method: 'eth_getBalance', params: [accounts[0], 'latest'] });
                            return {
                                address: accounts[0],
                                chainId,
                                walletType: WalletType.INJECTED,
                                balance: this.formatBalance(balance)
                            } as WalletConnection;
                        })();
                    } catch (e) {
                        return null;
                    }
                })();

                if (conn) {
                    this.currentConnection = conn;
                    this.storeConnection(conn);
                    this.notifyStatusChange({ connected: true, address: conn.address, walletType: conn.walletType, balance: conn.balance });
                    return { success: true };
                }
            }
        }

        // No silent connection - return clear guidance. Do not trigger eth_requestAccounts here to avoid unwanted popups.
        return {
            success: false,
            error: 'No compatible wallets found or no wallet is authorized for this site. Please install/enable MetaMask, Phantom, or Coinbase Wallet and click Connect Wallet.'
        };
    }

    // Fallback for generic injected providers
    private async connectInjected(): Promise<WalletConnection> {
        // Prefer window.ethereum but also accept legacy window.web3
        const win: any = window as any;
        const eth = win.ethereum || (win.web3 && win.web3.currentProvider);
        if (!eth) throw new Error('No injected provider found');

        // Build a list of candidate providers to try
        const candidates: any[] = [];
        if (Array.isArray(eth.providers) && eth.providers.length > 0) {
            candidates.push(...eth.providers);
        } else {
            candidates.push(eth);
        }

        // Try each provider until one responds to requests
        for (const provider of candidates) {
            try {
                if (!provider || !provider.request) continue;

                const accounts = await provider.request({ method: 'eth_requestAccounts' });
                if (!accounts || accounts.length === 0) continue;

                const chainId = await provider.request({ method: 'eth_chainId' });
                const balance = await provider.request({ method: 'eth_getBalance', params: [accounts[0], 'latest'] });

                return {
                    address: accounts[0],
                    chainId,
                    walletType: WalletType.INJECTED,
                    balance: this.formatBalance(balance)
                };
            } catch (e) {
                // try next provider
                console.warn('Injected provider failed to respond, trying next if available:', e);
                continue;
            }
        }

        throw new Error('No injected provider responded. Ensure your wallet is enabled for this site and try again.');
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