/**
 * Base Wallet Connector
 * 
 * Abstract class that implements common functionality for all wallet connectors.
 * Specific wallet implementations will extend this class.
 */

import { IWalletConnector, WalletEventHandlers } from '../interfaces';
import { WalletConnection, WalletInfo, WalletType, EthereumProvider } from '../types';
import { Web3ErrorHandler, Web3Error, Web3ErrorCode } from '../utils/Web3ErrorHandler';

export abstract class BaseWalletConnector implements IWalletConnector {
  protected _isConnected: boolean = false;
  protected _accounts: string[] = [];
  protected _chainId: string = '';
  protected _provider: EthereumProvider | null = null;
  protected _eventHandlers: WalletEventHandlers = {};
  protected _connectionState: 'disconnected' | 'connecting' | 'connected' | 'error' = 'disconnected';

  /**
   * Connect to the wallet
   */
  abstract connect(): Promise<WalletConnection>;

  /**
   * Disconnect from the wallet
   */
  abstract disconnect(): Promise<void>;

  /**
   * Sign a message with the wallet
   * @param message - Message to sign
   */
  abstract signMessage(message: string): Promise<string>;

  /**
   * Get wallet information
   */
  abstract getWalletInfo(): WalletInfo;

  /**
   * Check if wallet is connected
   */
  isConnected(): boolean {
    return this._isConnected && this._accounts.length > 0;
  }

  /**
   * Get connected accounts
   */
  async getAccounts(): Promise<string[]> {
    return this._accounts;
  }

  /**
   * Get current chain ID
   */
  getChainId(): string {
    return this._chainId;
  }

  /**
   * Get primary account address
   */
  getAddress(): string {
    return this._accounts[0] || '';
  }

  /**
   * Register event handlers for wallet events
   * @param handlers - Event handler functions
   */
  registerEventHandlers(handlers: WalletEventHandlers): void {
    this._eventHandlers = { ...this._eventHandlers, ...handlers };
  }



  /**
   * Get current connection state
   */
  getConnectionState(): 'disconnected' | 'connecting' | 'connected' | 'error' {
    return this._connectionState;
  }

  /**
   * Set connection state and notify handlers
   */
  protected setConnectionState(state: 'disconnected' | 'connecting' | 'connected' | 'error'): void {
    this._connectionState = state;
  }

  /**
   * Detect if wallet is available in the browser
   */
  abstract isWalletAvailable(): boolean;

  /**
   * Get installation URL for the wallet
   */
  abstract getInstallationUrl(): string;

  /**
   * Initialize wallet provider and set up event listeners
   */
  protected async initializeProvider(): Promise<void> {
    if (!this.isWalletAvailable()) {
      throw Web3ErrorHandler.createError(
        Web3ErrorCode.WALLET_NOT_INSTALLED,
        'Wallet not available',
        'Wallet not detected. Please install the wallet extension.',
        false
      );
    }

    // Set up common event listeners
    this.setupEventListeners();
  }

  /**
   * Set up event listeners for wallet events
   */
  protected setupEventListeners(): void {
    if (!this._provider) return;

    // Account change handler
    const handleAccountsChanged = (accounts: string[]) => {
      this._accounts = accounts;
      if (accounts.length === 0) {
        this.cleanup();
      }
      this._eventHandlers.onAccountsChanged?.(accounts);
    };

    // Chain change handler
    const handleChainChanged = (chainId: string) => {
      this._chainId = chainId;
      this._eventHandlers.onChainChanged?.(chainId);
    };

    // Connect handler
    const handleConnect = (connectInfo: { chainId: string }) => {
      this._chainId = connectInfo.chainId;
      this.setConnectionState('connected');
      this._eventHandlers.onConnect?.(connectInfo);
    };

    // Disconnect handler
    const handleDisconnect = (error: { code: number; message: string }) => {
      this.cleanup();
      this.setConnectionState('disconnected');
      this._eventHandlers.onDisconnect?.(error);
    };

    // Register event listeners
    this._provider.on('accountsChanged', handleAccountsChanged);
    this._provider.on('chainChanged', handleChainChanged);
    this._provider.on('connect', handleConnect);
    this._provider.on('disconnect', handleDisconnect);
  }

  /**
   * Remove event listeners
   */
  protected removeEventListeners(): void {
    if (!this._provider) return;

    this._provider.removeListener('accountsChanged', () => {});
    this._provider.removeListener('chainChanged', () => {});
    this._provider.removeListener('connect', () => {});
    this._provider.removeListener('disconnect', () => {});
  }

  /**
   * Handle wallet errors with appropriate messages
   * @param error - Error object
   */
  protected handleWalletError(error: any): Web3Error {
    return Web3ErrorHandler.handleWalletError(error);
  }

  /**
   * Handle signature errors
   * @param error - Error object
   */
  protected handleSignatureError(error: any): Web3Error {
    return Web3ErrorHandler.handleSignatureError(error);
  }

  /**
   * Clean up event listeners and state
   */
  protected cleanup(): void {
    this._isConnected = false;
    this._accounts = [];
    this._chainId = '';
    this.setConnectionState('disconnected');
    this.removeEventListeners();
  }

  /**
   * Validate wallet connection
   */
  protected async validateConnection(): Promise<boolean> {
    try {
      if (!this._provider) return false;
      
      const accounts = await this._provider.request({ method: 'eth_accounts' });
      const chainId = await this._provider.request({ method: 'eth_chainId' });
      
      this._accounts = accounts || [];
      this._chainId = chainId || '';
      this._isConnected = this._accounts.length > 0;
      
      return this._isConnected;
    } catch (error) {
      console.error('Connection validation failed:', error);
      return false;
    }
  }

  /**
   * Request wallet connection with proper state management
   */
  protected async requestConnection(): Promise<WalletConnection> {
    try {
      this.setConnectionState('connecting');
      
      if (!this._provider) {
        throw new Error('Provider not initialized');
      }

      // Request account access
      const accounts = await this._provider.request({ 
        method: 'eth_requestAccounts' 
      });
      
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts returned from wallet');
      }

      // Get chain ID
      const chainId = await this._provider.request({ 
        method: 'eth_chainId' 
      });

      // Update state
      this._accounts = accounts;
      this._chainId = chainId;
      this._isConnected = true;
      this.setConnectionState('connected');

      const walletInfo = this.getWalletInfo();
      
      return {
        address: accounts[0],
        chainId: chainId,
        walletType: walletInfo.type
      };
      
    } catch (error) {
      this.setConnectionState('error');
      throw this.handleWalletError(error);
    }
  }
}