import { Web3WalletService, WalletType, WalletInfo, WalletStatus as Web3WalletStatus } from './Web3WalletService';

export interface WalletStatus {
    connected: boolean;
    address?: string;
    walletType?: WalletType;
    error?: string;
    isConnecting?: boolean;
    lastConnected?: number;
    balance?: string;
}

export interface WalletConnectionResult {
    success: boolean;
    address?: string;
    walletType?: WalletType;
    error?: string;
}

export class WalletManager {
    private web3Service: Web3WalletService;
    private connectionCallbacks: ((status: WalletStatus) => void)[] = [];

    constructor() {
        this.web3Service = new Web3WalletService();
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        this.web3Service.onStatusChange((status: Web3WalletStatus) => {
            const walletStatus: WalletStatus = {
                connected: status.connected,
                address: status.address,
                walletType: status.walletType,
                error: status.error,
                isConnecting: status.isConnecting,
                balance: status.balance
            };
            this.notifyConnectionChange(walletStatus);
        });
    }

    // Wallet Connection
    async connectWallet(walletType?: WalletType): Promise<WalletConnectionResult> {
        if (walletType) {
            const result = await this.web3Service.connectWallet(walletType);
            const status = this.web3Service.getStatus();
            return {
                success: result.success,
                address: status.address,
                walletType: status.walletType,
                error: result.error
            };
        } else {
            return await this.autoDetectAndConnect();
        }
    }

    // Check if specific wallet is available
    isWalletAvailable(walletType: WalletType): boolean {
        const wallets = this.web3Service.getAvailableWallets();
        const wallet = wallets.find(w => w.type === walletType);
        return wallet?.installed || false;
    }

    // Auto-detect and connect to available wallet
    async autoDetectAndConnect(): Promise<WalletConnectionResult> {
        console.log("🔍 Auto-detecting wallets...");
        
        const result = await this.web3Service.autoConnect();
        const status = this.web3Service.getStatus();
        
        return {
            success: result.success,
            address: status.address,
            walletType: status.walletType,
            error: result.error
        };
    }

    // Get wallet installation URLs
    getWalletInstallUrl(walletType: WalletType): string {
        const wallets = this.web3Service.getAvailableWallets();
        const wallet = wallets.find(w => w.type === walletType);
        return wallet?.downloadUrl || '';
    }

    // Get available wallets
    getAvailableWallets(): Array<{
        type: WalletType;
        name: string;
        available: boolean;
    }> {
        return this.web3Service.getAvailableWallets().map(wallet => ({
            type: wallet.type,
            name: wallet.name,
            available: wallet.installed
        }));
    }

    disconnectWallet(): void {
        this.web3Service.disconnectWallet();
    }

    getConnectionStatus(): WalletStatus {
        const status = this.web3Service.getStatus();
        return {
            connected: status.connected,
            address: status.address,
            walletType: status.walletType,
            error: status.error,
            isConnecting: status.isConnecting,
            balance: status.balance
        };
    }

    // Get Web3 service for banking operations
    getWeb3Service(): Web3WalletService {
        return this.web3Service;
    }

    // Event Management
    onConnectionChange(callback: (status: WalletStatus) => void): void {
        this.connectionCallbacks.push(callback);
    }

    removeConnectionCallback(callback: (status: WalletStatus) => void): void {
        const index = this.connectionCallbacks.indexOf(callback);
        if (index > -1) {
            this.connectionCallbacks.splice(index, 1);
        }
    }

    private notifyConnectionChange(status: WalletStatus): void {
        this.connectionCallbacks.forEach(callback => callback(status));
    }

    // Legacy methods for compatibility
    getIdentity(): any {
        return null; // Not needed for Web3 wallets
    }

    getPrincipal(): string | null {
        return this.getConnectionStatus().address || null;
    }

    authenticate(): Promise<any> {
        const status = this.getConnectionStatus();
        return Promise.resolve({
            success: status.connected,
            address: status.address,
            error: status.error
        });
    }

    onAuthChange(callback: (identity: any) => void): void {
        // For compatibility - convert connection changes to auth changes
        this.onConnectionChange((status) => {
            callback(status.connected ? { address: status.address } : null);
        });
    }

    removeAuthCallback(callback: (identity: any) => void): void {
        // For compatibility
    }
}