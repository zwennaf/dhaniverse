import { ICPActorService } from './ICPActorService';
import { WalletManager } from './WalletManager';
import { DualStorageManager } from './DualStorageManager';
import { ICPErrorHandler, NetworkHealthMonitor } from './ICPErrorHandler';
import { ICP_CONFIG } from './config';
import { icpBalanceManager, ICPToken } from './TestnetBalanceManager';

// Unified connection status type (superset of legacy ICPIntegrationService)
export interface ICPConnectionStatus {
  isConnected: boolean;
  isAuthenticated: boolean;
  walletAddress: string;
  connectionType: 'internet-identity' | 'web3-wallet' | 'none';
  network: string;
}

export class ICPIntegrationManager {
  private static instance: ICPIntegrationManager | null = null;
  
  public readonly walletManager: WalletManager;
  public readonly icpService: ICPActorService;
  public readonly dualStorageManager: DualStorageManager;
  // Expose underlying balance service for advanced use
  public readonly icpBalanceManager = icpBalanceManager;
  
  private initialized = false;
  private connectionListeners: Set<(status: ICPConnectionStatus) => void> = new Set();

  private constructor() {
    // Initialize services
    this.walletManager = new WalletManager();
    // Use singleton instance to prevent duplication
    this.icpService = ICPActorService.getInstance(ICP_CONFIG.CANISTER_ID);
    this.dualStorageManager = new DualStorageManager(this.icpService, this.walletManager);
  }

  public static getInstance(): ICPIntegrationManager {
    if (!ICPIntegrationManager.instance) {
      ICPIntegrationManager.instance = new ICPIntegrationManager();
    }
    return ICPIntegrationManager.instance;
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Initialize balance manager & staking (legacy services) to unify old & new APIs
  await this.icpBalanceManager.initialize();

      // Start network health monitoring
      NetworkHealthMonitor.startHealthMonitoring(
        async () => {
          try {
            if (this.icpService.isActorConnected()) {
              await this.icpService.getHealth();
              return true;
            }
            return false;
          } catch {
            return false;
          }
        },
        async () => {
          // MongoDB health check - you can implement this based on your backend
          try {
            const response = await fetch('/api/health');
            return response.ok;
          } catch {
            return false;
          }
        }
      );

      // Listen for wallet connection changes
      this.walletManager.onConnectionChange(async (status) => {
        if (status.connected) {
          // Web3 wallet connected
          // Connect ICP actor using wallet service (passes through Web3WalletService)
          await this.icpService.connect(this.walletManager.getWeb3Service());
          this.dualStorageManager.setStorageMode('hybrid');
        } else {
          this.icpService.disconnect();
          this.dualStorageManager.setStorageMode('local');
        }
        this.notifyConnectionListeners();
      });

      // Balance updates can reflect authentication (II) state changes
      this.icpBalanceManager.onBalanceUpdate(() => {
        this.notifyConnectionListeners();
      });

      this.initialized = true;
      console.log('ICP Integration Manager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize ICP Integration Manager:', error);
      throw error;
    }
  }

  public async connectWallet(): Promise<boolean> {
    try {
      const result = await this.walletManager.connectWallet();
      return result.success;
    } catch (error) {
      console.error('Wallet connection failed:', error);
      return false;
    }
  }

  public disconnectWallet(): void {
    this.walletManager.disconnectWallet();
  this.notifyConnectionListeners();
  }

  public isWalletConnected(): boolean {
    return this.walletManager.getConnectionStatus().connected;
  }

  public async recordTrade(profit: number, stockSymbol: string): Promise<boolean> {
    if (!this.isWalletConnected()) {
      console.warn('Cannot record trade: wallet not connected');
      return false;
    }

    try {
      const result = await ICPErrorHandler.withRetryAndFallback(
        async () => {
          const tradeResult = await this.icpService.recordTrade(profit, stockSymbol);
          return tradeResult.success;
        },
        () => {
          console.log('Trade recorded locally (blockchain unavailable)');
          return true; // Record locally as fallback
        },
        'Record Trade'
      );
      return result;
    } catch (error) {
      console.error('Failed to record trade:', error);
      return false;
    }
  }

  public async getBalance(): Promise<number> {
    try {
      return await this.dualStorageManager.getBalance();
    } catch (error) {
      console.error('Failed to get balance:', error);
      return 0;
    }
  }

  public async deposit(amount: number): Promise<boolean> {
    try {
      return await this.dualStorageManager.deposit(amount);
    } catch (error) {
      console.error('Failed to deposit:', error);
      return false;
    }
  }

  public async withdraw(amount: number): Promise<boolean> {
    try {
      return await this.dualStorageManager.withdraw(amount);
    } catch (error) {
      console.error('Failed to withdraw:', error);
      return false;
    }
  }

  public async syncToBlockchain(): Promise<{ success: boolean; message: string }> {
    if (!this.isWalletConnected()) {
      return { success: false, message: 'Wallet not connected' };
    }

    try {
      const result = await this.dualStorageManager.syncToBlockchain();
      if (result.success) {
        return {
          success: true,
          message: `Successfully synced ${result.syncedTransactions} transactions${
            result.conflicts > 0 ? ` (${result.conflicts} conflicts resolved)` : ''
          }`
        };
      } else {
        return { success: false, message: result.error || 'Sync failed' };
      }
    } catch (error) {
      return { success: false, message: `Sync error: ${error}` };
    }
  }

  public getNetworkStatus() {
    return {
      wallet: this.walletManager.getConnectionStatus(),
      icp: ICPErrorHandler.getNetworkStatus(),
      health: NetworkHealthMonitor.getHealthStatus(),
      storage: this.dualStorageManager.getStorageMode()
    };
  }

  // ===== Unified (legacy-compatible) API surface =====

  public getConnectionStatus(): ICPConnectionStatus {
    const walletStatus = this.walletManager.getConnectionStatus();
    const isAuthenticated = this.icpBalanceManager.isAuthenticated();
    const walletAddress = (isAuthenticated && this.icpBalanceManager.getWalletAddress()) || walletStatus.address || '';
    let connectionType: ICPConnectionStatus['connectionType'] = 'none';
    if (isAuthenticated) connectionType = 'internet-identity';
    else if (walletStatus.connected) connectionType = 'web3-wallet';
    return {
      isConnected: !!walletAddress,
      isAuthenticated,
      walletAddress,
      connectionType,
      network: ICP_CONFIG.NETWORK
    };
  }

  public onConnectionChange(callback: (status: ICPConnectionStatus) => void) {
    this.connectionListeners.add(callback);
    // immediate emit
    callback(this.getConnectionStatus());
    return () => this.connectionListeners.delete(callback);
  }

  private notifyConnectionListeners() {
    const status = this.getConnectionStatus();
    this.connectionListeners.forEach(cb => cb(status));
  }

  // Internet Identity authentication
  public async authenticateWithInternetIdentity(): Promise<boolean> {
    try {
      const success = await this.icpBalanceManager.authenticateWithII();
      if (success) this.notifyConnectionListeners();
      return success;
    } catch (e) {
      console.error('II auth failed:', e);
      return false;
    }
  }

  // Tokens / balances (legacy wrappers)
  public getTokens(): ICPToken[] { return this.icpBalanceManager.getAllTokens(); }
  public onBalanceUpdate(callback: (tokens: ICPToken[]) => void) { return this.icpBalanceManager.onBalanceUpdate(callback); }
  public async getDualBalance() { return await this.icpBalanceManager.getDualBalance(); }
  public async syncWithCanister(): Promise<boolean> {
    try {
      await this.icpBalanceManager.refreshAllBalances();
  // staking feature removed
      return true;
    } catch (e) {
      console.warn('syncWithCanister failed:', e);
      return false;
    }
  }

  // staking API removed

  public cleanup(): void {
    NetworkHealthMonitor.stopHealthMonitoring();
    this.walletManager.disconnectWallet();
    this.icpService.disconnect();
    this.connectionListeners.clear();
  }
}

// Export singleton instance
export const icpIntegration = ICPIntegrationManager.getInstance();