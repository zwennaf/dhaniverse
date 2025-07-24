/**
 * WalletConnect Connector
 * 
 * Implementation of wallet connector for WalletConnect.
 * This is a placeholder that will be implemented in a future task.
 */

import { BaseWalletConnector } from './BaseWalletConnector';
import { WalletConnection, WalletInfo, WalletType } from '../types';

export class WalletConnectConnector extends BaseWalletConnector {
  private static WALLETCONNECT_ICON = 'https://walletconnect.com/images/walletconnect-logo.svg';
  
  /**
   * Connect to WalletConnect
   * This is a placeholder implementation
   */
  async connect(): Promise<WalletConnection> {
    throw new Error('WalletConnect connector not yet implemented');
  }

  /**
   * Disconnect from WalletConnect
   * This is a placeholder implementation
   */
  async disconnect(): Promise<void> {
    throw new Error('WalletConnect connector not yet implemented');
  }

  /**
   * Sign a message with WalletConnect
   * This is a placeholder implementation
   */
  async signMessage(message: string): Promise<string> {
    throw new Error('WalletConnect connector not yet implemented');
  }

  /**
   * Get WalletConnect information
   */
  getWalletInfo(): WalletInfo {
    return {
      name: 'WalletConnect',
      type: WalletType.WALLET_CONNECT,
      icon: WalletConnectConnector.WALLETCONNECT_ICON,
      installed: true // WalletConnect doesn't require installation
    };
  }

  /**
   * Check if WalletConnect is available
   */
  isWalletAvailable(): boolean {
    return true; // WalletConnect is always available as it's a protocol
  }

  /**
   * Get installation URL for WalletConnect
   */
  getInstallationUrl(): string {
    return 'https://walletconnect.com/'; // No installation needed, but provide info URL
  }
}