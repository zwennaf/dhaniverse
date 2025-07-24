/**
 * MetaMask Wallet Connector
 * 
 * Implementation of wallet connector for MetaMask with enhanced detection,
 * connection management, and MetaMask-specific event handling.
 */

import { BaseWalletConnector } from './BaseWalletConnector';
import { WalletConnection, WalletInfo, WalletType, EthereumProvider } from '../types';
import { Web3ErrorHandler, Web3ErrorCode } from '../utils/Web3ErrorHandler';

export class MetaMaskConnector extends BaseWalletConnector {
  private static METAMASK_DOWNLOAD_URL = 'https://metamask.io/download/';
  private static METAMASK_ICON = 'https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg';
  private static METAMASK_EXTENSION_ID = 'nkbihfbeogaeaoehlefnkodbefgpgknn';
  
  // MetaMask-specific event handlers
  private accountChangeHandler?: (accounts: string[]) => void;
  private chainChangeHandler?: (chainId: string) => void;
  private connectHandler?: (connectInfo: { chainId: string }) => void;
  private disconnectHandler?: (error: { code: number; message: string }) => void;

  /**
   * Check if MetaMask is installed
   */
  static isInstalled(): boolean {
    return typeof window !== 'undefined' && 
           typeof window.ethereum !== 'undefined' && 
           window.ethereum.isMetaMask === true;
  }

  /**
   * Enhanced MetaMask detection with multiple checks
   */
  static async detectMetaMask(): Promise<boolean> {
    // Check if running in browser environment
    if (typeof window === 'undefined') {
      return false;
    }

    // Primary check for MetaMask
    if (window.ethereum?.isMetaMask) {
      return true;
    }

    // Check for multiple providers (when multiple wallets are installed)
    if (window.ethereum?.providers) {
      return window.ethereum.providers.some((provider: any) => provider.isMetaMask);
    }

    // Additional check for MetaMask extension
    try {
      // Wait a bit for MetaMask to initialize
      await new Promise(resolve => setTimeout(resolve, 100));
      return window.ethereum?.isMetaMask === true;
    } catch {
      return false;
    }
  }

  /**
   * Get MetaMask provider from multiple providers if available
   */
  private getMetaMaskProvider(): EthereumProvider | null {
    if (!window.ethereum) {
      return null;
    }

    // If MetaMask is the only provider
    if (window.ethereum.isMetaMask && !window.ethereum.providers) {
      return window.ethereum;
    }

    // If multiple providers exist, find MetaMask
    if (window.ethereum.providers) {
      const metamaskProvider = window.ethereum.providers.find(
        (provider: any) => provider.isMetaMask
      );
      return metamaskProvider || null;
    }

    // Fallback to main ethereum object if it's MetaMask
    return window.ethereum.isMetaMask ? window.ethereum : null;
  }

  /**
   * Check if MetaMask wallet is available
   */
  isWalletAvailable(): boolean {
    return MetaMaskConnector.isInstalled();
  }

  /**
   * Get MetaMask installation URL
   */
  getInstallationUrl(): string {
    return MetaMaskConnector.METAMASK_DOWNLOAD_URL;
  }

  /**
   * Get installation instructions for MetaMask
   */
  getInstallationInstructions(): string {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('chrome')) {
      return 'Install MetaMask from the Chrome Web Store';
    } else if (userAgent.includes('firefox')) {
      return 'Install MetaMask from Firefox Add-ons';
    } else if (userAgent.includes('edge')) {
      return 'Install MetaMask from Microsoft Edge Add-ons';
    } else {
      return 'Install MetaMask browser extension from metamask.io';
    }
  }

  /**
   * Enhanced connection with better error handling and MetaMask-specific logic
   */
  async connect(): Promise<WalletConnection> {
    try {
      this.setConnectionState('connecting');

      // Enhanced MetaMask detection
      const isDetected = await MetaMaskConnector.detectMetaMask();
      if (!isDetected) {
        throw Web3ErrorHandler.createError(
          Web3ErrorCode.WALLET_NOT_INSTALLED,
          'MetaMask not detected',
          'MetaMask is not installed. Please install MetaMask extension and refresh the page.',
          false
        );
      }

      // Get MetaMask provider
      this._provider = this.getMetaMaskProvider();
      if (!this._provider) {
        throw Web3ErrorHandler.createError(
          Web3ErrorCode.WALLET_NOT_INSTALLED,
          'MetaMask provider not found',
          'MetaMask provider not found. Please ensure MetaMask is properly installed.',
          false
        );
      }

      // Initialize provider and set up event listeners
      await this.initializeProvider();
      
      // Check if already connected
      const existingAccounts = await this._provider.request({ method: 'eth_accounts' });
      if (existingAccounts && existingAccounts.length > 0) {
        // Already connected, just update state
        const chainId = await this._provider.request({ method: 'eth_chainId' });
        this._accounts = existingAccounts;
        this._chainId = chainId;
        this._isConnected = true;
        this.setConnectionState('connected');

        return {
          address: existingAccounts[0],
          chainId: chainId,
          walletType: WalletType.METAMASK
        };
      }

      // Request new connection
      return await this.requestConnection();
    } catch (error) {
      this.setConnectionState('error');
      throw this.handleWalletError(error);
    }
  }

  /**
   * Disconnect from MetaMask with proper cleanup
   */
  async disconnect(): Promise<void> {
    try {
      // Remove event listeners first
      this.removeEventListeners();
      
      // Clear connection state
      this.cleanup();
      
      // Note: MetaMask doesn't have a programmatic disconnect method
      // The user needs to disconnect from within MetaMask itself
      console.log('MetaMask disconnected. User should disconnect from MetaMask extension if needed.');
    } catch (error) {
      console.error('Error during MetaMask disconnect:', error);
      // Still cleanup even if there's an error
      this.cleanup();
    }
  }

  /**
   * Enhanced message signing with better error handling
   * @param message - Message to sign
   */
  async signMessage(message: string): Promise<string> {
    try {
      if (!this.isConnected()) {
        throw Web3ErrorHandler.createError(
          Web3ErrorCode.WALLET_DISCONNECTED,
          'Wallet not connected',
          'Please connect your MetaMask wallet first.',
          true
        );
      }

      if (!this._provider) {
        throw Web3ErrorHandler.createError(
          Web3ErrorCode.WALLET_DISCONNECTED,
          'Provider not available',
          'MetaMask provider not available. Please refresh and try again.',
          true
        );
      }

      const address = this._accounts[0];
      if (!address) {
        throw Web3ErrorHandler.createError(
          Web3ErrorCode.INVALID_ADDRESS,
          'No account address available',
          'No account address found. Please ensure MetaMask is connected.',
          true
        );
      }

      // Use personal_sign method for MetaMask
      const signature = await this._provider.request({
        method: 'personal_sign',
        params: [message, address]
      });

      if (!signature) {
        throw Web3ErrorHandler.createError(
          Web3ErrorCode.SIGNATURE_REJECTED,
          'Signature not returned',
          'Failed to get signature from MetaMask.',
          true
        );
      }

      return signature;
    } catch (error) {
      throw this.handleSignatureError(error);
    }
  }

  /**
   * Get MetaMask wallet information with enhanced details
   */
  getWalletInfo(): WalletInfo {
    return {
      name: 'MetaMask',
      type: WalletType.METAMASK,
      icon: MetaMaskConnector.METAMASK_ICON,
      installed: MetaMaskConnector.isInstalled(),
      downloadUrl: MetaMaskConnector.METAMASK_DOWNLOAD_URL
    };
  }

  /**
   * Get MetaMask version if available
   */
  getWalletVersion(): string | undefined {
    try {
      return (window.ethereum as any)?._metamask?.version;
    } catch {
      return undefined;
    }
  }

  /**
   * Check if MetaMask is locked
   */
  async isWalletLocked(): Promise<boolean> {
    try {
      if (!this._provider) return true;
      
      const accounts = await this._provider.request({ method: 'eth_accounts' });
      return !accounts || accounts.length === 0;
    } catch {
      return true;
    }
  }

  /**
   * Enhanced event listener setup with MetaMask-specific handling
   */
  protected setupEventListeners(): void {
    if (!this._provider) return;

    // Account changed event handler
    this.accountChangeHandler = (accounts: string[]) => {
      console.log('MetaMask accounts changed:', accounts);
      
      const previousAccounts = [...this._accounts];
      this._accounts = accounts;
      
      if (accounts.length === 0) {
        // User disconnected or locked MetaMask
        this._isConnected = false;
        this.setConnectionState('disconnected');
        console.log('MetaMask disconnected - no accounts available');
      } else if (previousAccounts[0] !== accounts[0]) {
        // Account switched
        this._isConnected = true;
        this.setConnectionState('connected');
        console.log('MetaMask account switched from', previousAccounts[0], 'to', accounts[0]);
      }
      
      // Notify event handlers
      this._eventHandlers.onAccountsChanged?.(accounts);
    };

    // Chain changed event handler
    this.chainChangeHandler = (chainId: string) => {
      console.log('MetaMask chain changed to:', chainId);
      
      const previousChainId = this._chainId;
      this._chainId = chainId;
      
      // Notify event handlers
      this._eventHandlers.onChainChanged?.(chainId);
      
      // Log chain change for debugging
      if (previousChainId && previousChainId !== chainId) {
        console.log('Chain switched from', previousChainId, 'to', chainId);
      }
    };

    // Connect event handler
    this.connectHandler = (connectInfo: { chainId: string }) => {
      console.log('MetaMask connected:', connectInfo);
      
      this._chainId = connectInfo.chainId;
      this.setConnectionState('connected');
      
      // Notify event handlers
      this._eventHandlers.onConnect?.(connectInfo);
    };

    // Disconnect event handler
    this.disconnectHandler = (error: { code: number; message: string }) => {
      console.log('MetaMask disconnected:', error);
      
      this.cleanup();
      this.setConnectionState('disconnected');
      
      // Notify event handlers
      this._eventHandlers.onDisconnect?.(error);
    };

    // Register event listeners
    this._provider.on('accountsChanged', this.accountChangeHandler);
    this._provider.on('chainChanged', this.chainChangeHandler);
    this._provider.on('connect', this.connectHandler);
    this._provider.on('disconnect', this.disconnectHandler);
  }

  /**
   * Enhanced event listener removal with proper cleanup
   */
  protected removeEventListeners(): void {
    if (!this._provider) return;

    try {
      // Remove specific event handlers
      if (this.accountChangeHandler) {
        this._provider.removeListener('accountsChanged', this.accountChangeHandler);
        this.accountChangeHandler = undefined;
      }
      
      if (this.chainChangeHandler) {
        this._provider.removeListener('chainChanged', this.chainChangeHandler);
        this.chainChangeHandler = undefined;
      }
      
      if (this.connectHandler) {
        this._provider.removeListener('connect', this.connectHandler);
        this.connectHandler = undefined;
      }
      
      if (this.disconnectHandler) {
        this._provider.removeListener('disconnect', this.disconnectHandler);
        this.disconnectHandler = undefined;
      }
      
      console.log('MetaMask event listeners removed');
    } catch (error) {
      console.error('Error removing MetaMask event listeners:', error);
    }
  }

  /**
   * Request specific permissions from MetaMask
   */
  async requestPermissions(permissions: string[] = ['eth_accounts']): Promise<any> {
    try {
      if (!this._provider) {
        throw new Error('Provider not available');
      }

      return await this._provider.request({
        method: 'wallet_requestPermissions',
        params: [{ eth_accounts: {} }]
      });
    } catch (error) {
      throw this.handleWalletError(error);
    }
  }

  /**
   * Get current permissions from MetaMask
   */
  async getPermissions(): Promise<any> {
    try {
      if (!this._provider) {
        throw new Error('Provider not available');
      }

      return await this._provider.request({
        method: 'wallet_getPermissions'
      });
    } catch (error) {
      console.error('Error getting MetaMask permissions:', error);
      return [];
    }
  }

  /**
   * Switch to a specific network in MetaMask
   */
  async switchNetwork(chainId: string): Promise<void> {
    try {
      if (!this._provider) {
        throw new Error('Provider not available');
      }

      await this._provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId }]
      });
    } catch (error) {
      throw this.handleWalletError(error);
    }
  }
}