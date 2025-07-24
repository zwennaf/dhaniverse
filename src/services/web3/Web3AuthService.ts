/**
 * Web3 Authentication Service
 * 
 * Core service for handling Web3 authentication logic including wallet
 * connection, signature verification, and session management.
 */

import { ethers } from 'ethers';
import { IWeb3AuthService, Web3AuthConfig } from './interfaces';
import { 
  WalletType, 
  WalletInfo, 
  WalletConnection, 
  AuthResult, 
  Web3AuthRequest,
  Web3Session
} from './types';
import { MetaMaskConnector } from './connectors/MetaMaskConnector';

// Default configuration
const DEFAULT_CONFIG: Web3AuthConfig = {
  supportedChains: ['0x1', '0x5', '0x89'], // Ethereum Mainnet, Goerli, Polygon
  sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
  messageExpirationTime: 5 * 60 * 1000, // 5 minutes
  enableAutoReconnect: true
};

export class Web3AuthService implements IWeb3AuthService {
  private config: Web3AuthConfig;
  private currentConnection: WalletConnection | null = null;
  private connectors: Map<WalletType, any> = new Map();
  
  // Session storage key
  private static readonly SESSION_STORAGE_KEY = 'web3_auth_session';
  
  constructor(config: Partial<Web3AuthConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Initialize connectors
    this.initializeConnectors();
  }
  
  /**
   * Initialize wallet connectors
   */
  private initializeConnectors(): void {
    // Register MetaMask connector
    this.connectors.set(WalletType.METAMASK, MetaMaskConnector);
    
    // Other connectors will be added in future tasks
  }
  
  /**
   * Detect available wallets
   */
  async detectWallets(): Promise<WalletInfo[]> {
    const walletInfos: WalletInfo[] = [];
    
    // Check for MetaMask
    if (this.connectors.has(WalletType.METAMASK)) {
      const MetaMaskConnectorClass = this.connectors.get(WalletType.METAMASK);
      const isInstalled = MetaMaskConnectorClass.isInstalled();
      
      if (isInstalled) {
        const connector = new MetaMaskConnectorClass();
        walletInfos.push(connector.getWalletInfo());
      }
    }
    
    // Other wallet detections will be added in future tasks
    
    return walletInfos;
  }
  
  /**
   * Connect to a wallet
   * @param walletType - Type of wallet to connect to
   */
  async connectWallet(walletType: WalletType): Promise<WalletConnection> {
    try {
      const ConnectorClass = this.connectors.get(walletType);
      
      if (!ConnectorClass) {
        throw new Error(`Wallet type ${walletType} not supported`);
      }
      
      const connector = new ConnectorClass();
      
      // Set up event handlers
      connector.registerEventHandlers({
        onAccountsChanged: this.handleAccountsChanged.bind(this),
        onChainChanged: this.handleChainChanged.bind(this),
        onDisconnect: this.handleDisconnect.bind(this)
      });
      
      // Connect to wallet
      const connection = await connector.connect();
      
      // Store connection
      this.currentConnection = connection;
      
      // Save session
      this.saveSession(connection);
      
      return connection;
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    }
  }
  
  /**
   * Disconnect current wallet
   */
  async disconnectWallet(): Promise<void> {
    if (!this.currentConnection) {
      return;
    }
    
    const walletType = this.currentConnection.walletType;
    const ConnectorClass = this.connectors.get(walletType);
    
    if (ConnectorClass) {
      const connector = new ConnectorClass();
      await connector.disconnect();
    }
    
    this.currentConnection = null;
    this.clearSession();
  }
  
  /**
   * Generate authentication message for signing
   * @param address - Wallet address
   */
  async signAuthenticationMessage(address: string): Promise<string> {
    const timestamp = Date.now();
    const nonce = Math.floor(Math.random() * 1000000);
    
    const message = `Sign this message to authenticate with our application.\n\nWallet address: ${address}\nTimestamp: ${timestamp}\nNonce: ${nonce}`;
    
    return message;
  }
  
  /**
   * Authenticate with signature
   * @param address - Wallet address
   * @param signature - Signed message
   */
  async authenticateWithSignature(address: string, signature: string): Promise<AuthResult> {
    try {
      // In a real implementation, this would make an API call to the backend
      // For now, we'll simulate a successful authentication
      
      const mockUser = {
        id: `user_${Math.random().toString(36).substring(2, 9)}`,
        gameUsername: `Player_${Math.random().toString(36).substring(2, 6)}`,
        walletAddress: address,
        authMethod: 'web3' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const mockToken = `token_${Math.random().toString(36).substring(2, 15)}`;
      
      return {
        success: true,
        user: mockUser,
        token: mockToken,
        isNewUser: true
      };
    } catch (error) {
      console.error('Authentication failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed'
      };
    }
  }
  
  /**
   * Restore previous session
   */
  async restoreSession(): Promise<boolean> {
    if (!this.config.enableAutoReconnect) {
      return false;
    }
    
    try {
      const session = this.getSession();
      
      if (!session) {
        return false;
      }
      
      // Check if session is expired
      const now = Date.now();
      if (now - session.lastActivity > (this.config.sessionTimeout || DEFAULT_CONFIG.sessionTimeout!)) {
        this.clearSession();
        return false;
      }
      
      // Try to reconnect
      await this.connectWallet(session.walletType);
      return true;
    } catch (error) {
      console.error('Failed to restore session:', error);
      this.clearSession();
      return false;
    }
  }
  
  /**
   * Clear current session
   */
  async clearSession(): Promise<void> {
    localStorage.removeItem(Web3AuthService.SESSION_STORAGE_KEY);
  }
  
  /**
   * Register account change handler
   * @param callback - Function to call when accounts change
   */
  onAccountChange(callback: (accounts: string[]) => void): void {
    this.handleAccountsChanged = callback;
  }
  
  /**
   * Register chain change handler
   * @param callback - Function to call when chain changes
   */
  onChainChange(callback: (chainId: string) => void): void {
    this.handleChainChanged = callback;
  }
  
  /**
   * Register disconnect handler
   * @param callback - Function to call on disconnect
   */
  onDisconnect(callback: () => void): void {
    this.handleDisconnect = () => callback();
  }
  
  /**
   * Save session to local storage
   * @param connection - Wallet connection
   */
  private saveSession(connection: WalletConnection): void {
    const session: Web3Session = {
      walletAddress: connection.address,
      walletType: connection.walletType,
      chainId: connection.chainId,
      connectedAt: Date.now(),
      lastActivity: Date.now()
    };
    
    localStorage.setItem(Web3AuthService.SESSION_STORAGE_KEY, JSON.stringify(session));
  }
  
  /**
   * Get session from local storage
   */
  private getSession(): Web3Session | null {
    const sessionData = localStorage.getItem(Web3AuthService.SESSION_STORAGE_KEY);
    
    if (!sessionData) {
      return null;
    }
    
    try {
      return JSON.parse(sessionData) as Web3Session;
    } catch (error) {
      console.error('Failed to parse session data:', error);
      return null;
    }
  }
  
  /**
   * Update session last activity
   */
  private updateSessionActivity(): void {
    const session = this.getSession();
    
    if (session) {
      session.lastActivity = Date.now();
      localStorage.setItem(Web3AuthService.SESSION_STORAGE_KEY, JSON.stringify(session));
    }
  }
  
  // Event handlers (will be overridden by registered callbacks)
  private handleAccountsChanged(accounts: string[]): void {
    console.log('Accounts changed:', accounts);
  }
  
  private handleChainChanged(chainId: string): void {
    console.log('Chain changed:', chainId);
  }
  
  private handleDisconnect(error: { code: number; message: string }): void {
    console.log('Disconnected:', error);
    this.currentConnection = null;
  }
}