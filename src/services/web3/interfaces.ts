/**
 * Web3 Authentication Interfaces
 * 
 * This file contains all the interfaces that define the contracts
 * for Web3 authentication services and components.
 */

import { WalletType, WalletInfo, WalletConnection, AuthResult, Web3Session } from './types';

/**
 * Core interface for Web3 authentication service
 */
export interface IWeb3AuthService {
  // Wallet connection
  detectWallets(): Promise<WalletInfo[]>;
  connectWallet(walletType: WalletType): Promise<WalletConnection>;
  disconnectWallet(): Promise<void>;
  
  // Authentication
  signAuthenticationMessage(address: string): Promise<string>;
  authenticateWithSignature(address: string, signature: string): Promise<AuthResult>;
  
  // Session management
  restoreSession(): Promise<boolean>;
  clearSession(): Promise<void>;
  
  // Event handling
  onAccountChange(callback: (accounts: string[]) => void): void;
  onChainChange(callback: (chainId: string) => void): void;
  onDisconnect(callback: () => void): void;
}

/**
 * Interface for wallet connector implementations
 */
export interface IWalletConnector {
  connect(): Promise<WalletConnection>;
  disconnect(): Promise<void>;
  signMessage(message: string): Promise<string>;
  getAccounts(): Promise<string[]>;
  isConnected(): boolean;
  getWalletInfo(): WalletInfo;
  isWalletAvailable(): boolean;
  getInstallationUrl(): string;
  getConnectionState(): 'disconnected' | 'connecting' | 'connected' | 'error';
  registerEventHandlers(handlers: WalletEventHandlers): void;
}

/**
 * Props for Web3 sign-in component
 */
export interface Web3SignInProps {
  onSuccess: (authResult: AuthResult) => void;
  onError: (error: string) => void;
  disabled?: boolean;
}

/**
 * Extended AuthContext interface to support Web3
 */
export interface AuthContextType {
  // Existing auth methods would be here
  signInWithWeb3: (walletType: WalletType) => Promise<AuthResult>;
  connectWallet: (walletType: WalletType) => Promise<WalletConnection>;
  disconnectWallet: () => Promise<void>;
  walletConnection: WalletConnection | null;
  availableWallets: WalletInfo[];
}

/**
 * Configuration options for Web3 authentication
 */
export interface Web3AuthConfig {
  supportedChains?: string[];
  sessionTimeout?: number; // in milliseconds
  messageExpirationTime?: number; // in milliseconds
  enableAutoReconnect?: boolean;
}

/**
 * Event handlers for wallet events
 */
export interface WalletEventHandlers {
  onAccountsChanged?: (accounts: string[]) => void;
  onChainChanged?: (chainId: string) => void;
  onConnect?: (connectInfo: { chainId: string }) => void;
  onDisconnect?: (error: { code: number; message: string }) => void;
}