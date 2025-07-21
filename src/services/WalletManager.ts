import { Identity } from '@dfinity/agent';
import { AuthClient } from '@dfinity/auth-client';

export interface WalletStatus {
  connected: boolean;
  principal?: string;
  walletType?: 'plug' | 'stoic' | 'ii';
  error?: string;
}

export interface WalletConnectionResult {
  success: boolean;
  principal?: string;
  identity?: Identity;
  error?: string;
}

export interface AuthResult {
  success: boolean;
  identity?: Identity;
  principal?: string;
  error?: string;
}

export class WalletManager {
  private authClient: AuthClient | null = null;
  private currentIdentity: Identity | null = null;
  private connectionStatus: WalletStatus = { connected: false };
  private connectionCallbacks: ((status: WalletStatus) => void)[] = [];
  private authCallbacks: ((identity: Identity | null) => void)[] = [];

  constructor() {
    this.initializeAuthClient();
  }

  private async initializeAuthClient(): Promise<void> {
    try {
      this.authClient = await AuthClient.create({
        idleOptions: {
          idleTimeout: 1000 * 60 * 30, // 30 minutes
          disableDefaultIdleCallback: true
        }
      });

      // Check if already authenticated
      if (await this.authClient.isAuthenticated()) {
        this.currentIdentity = this.authClient.getIdentity();
        this.updateConnectionStatus({
          connected: true,
          principal: this.currentIdentity.getPrincipal().toString(),
          walletType: 'ii'
        });
      }
    } catch (error) {
      console.error('Failed to initialize auth client:', error);
    }
  }  // Wallet Connection
  async connectWallet(): Promise<WalletConnectionResult> {
    try {
      // Try Plug wallet first
      const plugResult = await this.connectPlug();
      if (plugResult.success) {
        return plugResult;
      }

      // Fallback to Internet Identity
      return await this.connectInternetIdentity();
    } catch (error) {
      const errorMessage = `Failed to connect wallet: ${error}`;
      console.error(errorMessage);
      
      this.updateConnectionStatus({
        connected: false,
        error: errorMessage
      });

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  private async connectPlug(): Promise<WalletConnectionResult> {
    try {
      // Check if Plug is available
      if (!(window as any).ic?.plug) {
        return {
          success: false,
          error: 'Plug wallet not installed'
        };
      }

      const plug = (window as any).ic.plug;
      
      // Request connection
      const connected = await plug.requestConnect({
        whitelist: [process.env.REACT_APP_CANISTER_ID || 'rdmx6-jaaaa-aaaah-qcaiq-cai'],
        host: process.env.NODE_ENV === 'production' 
          ? 'https://ic0.app' 
          : 'http://127.0.0.1:4943'
      });

      if (!connected) {
        return {
          success: false,
          error: 'User rejected connection'
        };
      }

      // Get principal
      const principal = await plug.agent.getPrincipal();
      
      this.currentIdentity = plug.agent._identity;
      this.updateConnectionStatus({
        connected: true,
        principal: principal.toString(),
        walletType: 'plug'
      });

      return {
        success: true,
        principal: principal.toString(),
        identity: this.currentIdentity || undefined
      };
    } catch (error) {
      return {
        success: false,
        error: `Plug connection failed: ${error}`
      };
    }
  }  
private async connectInternetIdentity(): Promise<WalletConnectionResult> {
    try {
      if (!this.authClient) {
        throw new Error('Auth client not initialized');
      }

      return new Promise((resolve) => {
        this.authClient!.login({
          identityProvider: process.env.NODE_ENV === 'production'
            ? 'https://identity.ic0.app/#authorize'
            : `http://127.0.0.1:4943/?canisterId=rdmx6-jaaaa-aaaah-qcaiq-cai#authorize`,
          onSuccess: () => {
            this.currentIdentity = this.authClient!.getIdentity();
            const principal = this.currentIdentity.getPrincipal().toString();
            
            this.updateConnectionStatus({
              connected: true,
              principal,
              walletType: 'ii'
            });

            resolve({
              success: true,
              principal,
              identity: this.currentIdentity || undefined
            });
          },
          onError: (error) => {
            const errorMessage = `Internet Identity login failed: ${error}`;
            this.updateConnectionStatus({
              connected: false,
              error: errorMessage
            });

            resolve({
              success: false,
              error: errorMessage
            });
          }
        });
      });
    } catch (error) {
      return {
        success: false,
        error: `Internet Identity connection failed: ${error}`
      };
    }
  }

  disconnectWallet(): void {
    try {
      // Disconnect Plug if connected
      if (this.connectionStatus.walletType === 'plug' && (window as any).ic?.plug) {
        (window as any).ic.plug.disconnect();
      }

      // Logout from Internet Identity
      if (this.connectionStatus.walletType === 'ii' && this.authClient) {
        this.authClient.logout();
      }

      this.currentIdentity = null;
      this.updateConnectionStatus({ connected: false });
      
      // Notify auth callbacks
      this.authCallbacks.forEach(callback => callback(null));
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
    }
  }

  getConnectionStatus(): WalletStatus {
    return { ...this.connectionStatus };
  } 
 // Authentication
  async authenticate(): Promise<AuthResult> {
    if (!this.connectionStatus.connected || !this.currentIdentity) {
      return {
        success: false,
        error: 'No wallet connected'
      };
    }

    try {
      // Verify identity is still valid
      const principal = this.currentIdentity.getPrincipal();
      
      if (principal.isAnonymous()) {
        return {
          success: false,
          error: 'Anonymous identity not allowed'
        };
      }

      return {
        success: true,
        identity: this.currentIdentity || undefined,
        principal: principal.toString()
      };
    } catch (error) {
      return {
        success: false,
        error: `Authentication failed: ${error}`
      };
    }
  }

  getIdentity(): Identity | null {
    return this.currentIdentity;
  }

  getPrincipal(): string | null {
    if (!this.currentIdentity) return null;
    return this.currentIdentity.getPrincipal().toString();
  }

  // Event Management
  onConnectionChange(callback: (status: WalletStatus) => void): void {
    this.connectionCallbacks.push(callback);
  }

  onAuthChange(callback: (identity: Identity | null) => void): void {
    this.authCallbacks.push(callback);
  }

  removeConnectionCallback(callback: (status: WalletStatus) => void): void {
    const index = this.connectionCallbacks.indexOf(callback);
    if (index > -1) {
      this.connectionCallbacks.splice(index, 1);
    }
  }

  removeAuthCallback(callback: (identity: Identity | null) => void): void {
    const index = this.authCallbacks.indexOf(callback);
    if (index > -1) {
      this.authCallbacks.splice(index, 1);
    }
  }

  private updateConnectionStatus(status: Partial<WalletStatus>): void {
    this.connectionStatus = { ...this.connectionStatus, ...status };
    
    // Notify all connection callbacks
    this.connectionCallbacks.forEach(callback => callback(this.connectionStatus));
  }
}