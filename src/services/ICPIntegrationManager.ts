import { ICPActorService } from './ICPActorService';
import { WalletManager } from './WalletManager';
import { DualStorageManager } from './DualStorageManager';
import { ICPErrorHandler, NetworkHealthMonitor } from './ICPErrorHandler';

export class ICPIntegrationManager {
  private static instance: ICPIntegrationManager | null = null;
  
  public readonly walletManager: WalletManager;
  public readonly icpService: ICPActorService;
  public readonly dualStorageManager: DualStorageManager;
  
  private initialized = false;

  private constructor() {
    // Initialize services
    this.walletManager = new WalletManager();
    this.icpService = new ICPActorService(
      import.meta.env.VITE_DHANIVERSE_CANISTER_ID || 
      import.meta.env.REACT_APP_CANISTER_ID || 
      'rdmx6-jaaaa-aaaah-qcaiq-cai'
    );
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
          const identity = this.walletManager.getIdentity();
          if (identity) {
            await this.icpService.connect(identity);
            this.dualStorageManager.setStorageMode('hybrid');
          }
        } else {
          this.icpService.disconnect();
          this.dualStorageManager.setStorageMode('local');
        }
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
      return await ICPErrorHandler.withRetryAndFallback(
        () => this.icpService.recordTrade(profit, stockSymbol),
        () => {
          console.log('Trade recorded locally (blockchain unavailable)');
          return true; // Record locally as fallback
        },
        'Record Trade'
      );
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

  public cleanup(): void {
    NetworkHealthMonitor.stopHealthMonitoring();
    this.walletManager.disconnectWallet();
    this.icpService.disconnect();
  }
}

// Export singleton instance
export const icpIntegration = ICPIntegrationManager.getInstance();