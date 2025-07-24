/**
 * Web3 Authentication Types
 * 
 * This file contains all the TypeScript types and enums used throughout
 * the Web3 authentication system.
 */

/**
 * Supported wallet types for Web3 authentication
 */
export enum WalletType {
  METAMASK = 'metamask',
  WALLET_CONNECT = 'walletconnect',
  COINBASE = 'coinbase',
  INJECTED = 'injected'
}

/**
 * Information about a wallet provider
 */
export interface WalletInfo {
  name: string;
  type: WalletType;
  icon: string;
  installed: boolean;
  downloadUrl?: string;
}

/**
 * Represents an active wallet connection
 */
export interface WalletConnection {
  address: string;
  chainId: string;
  walletType: WalletType;
}

/**
 * Request payload for Web3 authentication
 */
export interface Web3AuthRequest {
  walletAddress: string;
  signature: string;
  message: string;
  timestamp: number;
}

/**
 * Result of authentication attempt
 */
export interface AuthResult {
  success: boolean;
  user?: User;
  token?: string;
  isNewUser?: boolean;
  error?: string;
}

/**
 * Extended User interface to support Web3 authentication
 */
export interface User {
  id: string;
  email?: string; // Optional for Web3-only users
  gameUsername: string;
  walletAddress?: string; // New field for Web3 users
  authMethod: 'email' | 'google' | 'web3'; // Track auth method
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Web3 session data stored locally
 */
export interface Web3Session {
  walletAddress: string;
  walletType: WalletType;
  chainId: string;
  connectedAt: number;
  lastActivity: number;
}

/**
 * Ethereum provider interface (for window.ethereum)
 */
export interface EthereumProvider {
  isMetaMask?: boolean;
  isCoinbaseWallet?: boolean;
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on: (event: string, callback: (...args: any[]) => void) => void;
  removeListener: (event: string, callback: (...args: any[]) => void) => void;
  selectedAddress?: string;
  chainId?: string;
  providers?: EthereumProvider[];
}

/**
 * Extended window interface to include ethereum provider
 */
declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}