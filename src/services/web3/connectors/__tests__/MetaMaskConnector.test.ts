/**
 * MetaMask Connector Unit Tests
 * 
 * Comprehensive tests for MetaMask wallet connector functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MetaMaskConnector } from '../MetaMaskConnector';
import { WalletType } from '../../types';
import { Web3ErrorCode } from '../../utils/Web3ErrorHandler';

// Mock ethereum provider
const createMockEthereum = (overrides = {}) => ({
  isMetaMask: true,
  request: vi.fn(),
  on: vi.fn(),
  removeListener: vi.fn(),
  selectedAddress: '0x1234567890123456789012345678901234567890',
  chainId: '0x1',
  providers: undefined,
  ...overrides
});

describe('MetaMaskConnector', () => {
  let connector: MetaMaskConnector;
  let mockEthereum: any;

  beforeEach(() => {
    // Reset window.ethereum mock
    mockEthereum = createMockEthereum();
    Object.defineProperty(window, 'ethereum', {
      value: mockEthereum,
      writable: true,
      configurable: true
    });

    connector = new MetaMaskConnector();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Static Methods', () => {
    describe('isInstalled', () => {
      it('should return true when MetaMask is installed', () => {
        expect(MetaMaskConnector.isInstalled()).toBe(true);
      });

      it('should return false when ethereum is not available', () => {
        delete (window as any).ethereum;
        expect(MetaMaskConnector.isInstalled()).toBe(false);
      });

      it('should return false when ethereum is not MetaMask', () => {
        mockEthereum.isMetaMask = false;
        expect(MetaMaskConnector.isInstalled()).toBe(false);
      });
    });

    describe('detectMetaMask', () => {
      it('should detect MetaMask when available', async () => {
        const result = await MetaMaskConnector.detectMetaMask();
        expect(result).toBe(true);
      });

      it('should detect MetaMask in providers array', async () => {
        mockEthereum.isMetaMask = false;
        mockEthereum.providers = [
          { isMetaMask: false },
          { isMetaMask: true }
        ];
        
        const result = await MetaMaskConnector.detectMetaMask();
        expect(result).toBe(true);
      });

      it('should return false when MetaMask is not detected', async () => {
        delete (window as any).ethereum;
        
        const result = await MetaMaskConnector.detectMetaMask();
        expect(result).toBe(false);
      });
    });
  });

  describe('Instance Methods', () => {
    describe('isWalletAvailable', () => {
      it('should return true when MetaMask is available', () => {
        expect(connector.isWalletAvailable()).toBe(true);
      });

      it('should return false when MetaMask is not available', () => {
        delete (window as any).ethereum;
        expect(connector.isWalletAvailable()).toBe(false);
      });
    });

    describe('getInstallationUrl', () => {
      it('should return MetaMask download URL', () => {
        expect(connector.getInstallationUrl()).toBe('https://metamask.io/download/');
      });
    });

    describe('getInstallationInstructions', () => {
      it('should return Chrome-specific instructions', () => {
        Object.defineProperty(navigator, 'userAgent', {
          value: 'Chrome/91.0.4472.124',
          writable: true
        });
        
        expect(connector.getInstallationInstructions()).toContain('Chrome Web Store');
      });

      it('should return Firefox-specific instructions', () => {
        Object.defineProperty(navigator, 'userAgent', {
          value: 'Firefox/89.0',
          writable: true
        });
        
        expect(connector.getInstallationInstructions()).toContain('Firefox Add-ons');
      });

      it('should return generic instructions for other browsers', () => {
        Object.defineProperty(navigator, 'userAgent', {
          value: 'Safari/14.1.1',
          writable: true
        });
        
        expect(connector.getInstallationInstructions()).toContain('metamask.io');
      });
    });

    describe('getWalletInfo', () => {
      it('should return correct wallet information', () => {
        const walletInfo = connector.getWalletInfo();
        
        expect(walletInfo).toEqual({
          name: 'MetaMask',
          type: WalletType.METAMASK,
          icon: 'https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg',
          installed: true,
          downloadUrl: 'https://metamask.io/download/'
        });
      });
    });

    describe('connect', () => {
      it('should connect successfully when MetaMask is available', async () => {
        const mockAccounts = ['0x1234567890123456789012345678901234567890'];
        const mockChainId = '0x1';
        
        mockEthereum.request
          .mockResolvedValueOnce(mockAccounts) // eth_accounts
          .mockResolvedValueOnce(mockChainId)  // eth_chainId
          .mockResolvedValueOnce(mockAccounts) // eth_requestAccounts
          .mockResolvedValueOnce(mockChainId); // eth_chainId

        const connection = await connector.connect();

        expect(connection).toEqual({
          address: mockAccounts[0],
          chainId: mockChainId,
          walletType: WalletType.METAMASK
        });
        expect(connector.isConnected()).toBe(true);
      });

      it('should use existing connection if already connected', async () => {
        const mockAccounts = ['0x1234567890123456789012345678901234567890'];
        const mockChainId = '0x1';
        
        mockEthereum.request
          .mockResolvedValueOnce(mockAccounts) // eth_accounts (existing)
          .mockResolvedValueOnce(mockChainId); // eth_chainId

        const connection = await connector.connect();

        expect(connection).toEqual({
          address: mockAccounts[0],
          chainId: mockChainId,
          walletType: WalletType.METAMASK
        });
        
        // Should not call eth_requestAccounts since already connected
        expect(mockEthereum.request).toHaveBeenCalledTimes(2);
      });

      it('should throw error when MetaMask is not installed', async () => {
        delete (window as any).ethereum;
        
        await expect(connector.connect()).rejects.toMatchObject({
          code: Web3ErrorCode.WALLET_NOT_INSTALLED,
          userMessage: expect.stringContaining('MetaMask is not installed')
        });
      });

      it('should handle user rejection', async () => {
        mockEthereum.request
          .mockResolvedValueOnce([]) // eth_accounts (not connected)
          .mockRejectedValueOnce({ code: 4001, message: 'User rejected' });

        await expect(connector.connect()).rejects.toMatchObject({
          code: Web3ErrorCode.USER_REJECTED_CONNECTION
        });
      });

      it('should handle connection pending error', async () => {
        mockEthereum.request
          .mockResolvedValueOnce([]) // eth_accounts (not connected)
          .mockRejectedValueOnce({ code: -32002, message: 'Already processing' });

        await expect(connector.connect()).rejects.toMatchObject({
          code: Web3ErrorCode.CONNECTION_PENDING
        });
      });
    });

    describe('disconnect', () => {
      it('should disconnect successfully', async () => {
        // First connect
        mockEthereum.request
          .mockResolvedValueOnce(['0x1234567890123456789012345678901234567890'])
          .mockResolvedValueOnce('0x1');
        
        await connector.connect();
        expect(connector.isConnected()).toBe(true);

        // Then disconnect
        await connector.disconnect();
        expect(connector.isConnected()).toBe(false);
      });

      it('should handle disconnect errors gracefully', async () => {
        // Mock removeListener to throw error
        mockEthereum.removeListener.mockImplementation(() => {
          throw new Error('Remove listener error');
        });

        // Should not throw error
        await expect(connector.disconnect()).resolves.toBeUndefined();
        expect(connector.isConnected()).toBe(false);
      });
    });

    describe('signMessage', () => {
      beforeEach(async () => {
        // Connect first
        mockEthereum.request
          .mockResolvedValueOnce(['0x1234567890123456789012345678901234567890'])
          .mockResolvedValueOnce('0x1');
        
        await connector.connect();
      });

      it('should sign message successfully', async () => {
        const message = 'Test message';
        const expectedSignature = '0xsignature';
        
        mockEthereum.request.mockResolvedValueOnce(expectedSignature);

        const signature = await connector.signMessage(message);

        expect(signature).toBe(expectedSignature);
        expect(mockEthereum.request).toHaveBeenCalledWith({
          method: 'personal_sign',
          params: [message, '0x1234567890123456789012345678901234567890']
        });
      });

      it('should throw error when not connected', async () => {
        await connector.disconnect();

        await expect(connector.signMessage('test')).rejects.toMatchObject({
          code: Web3ErrorCode.WALLET_DISCONNECTED
        });
      });

      it('should handle signature rejection', async () => {
        mockEthereum.request.mockRejectedValueOnce({ code: 4001, message: 'User rejected' });

        await expect(connector.signMessage('test')).rejects.toMatchObject({
          code: Web3ErrorCode.SIGNATURE_REJECTED
        });
      });

      it('should handle missing signature', async () => {
        mockEthereum.request.mockResolvedValueOnce(null);

        await expect(connector.signMessage('test')).rejects.toMatchObject({
          code: Web3ErrorCode.SIGNATURE_REJECTED
        });
      });
    });

    describe('Event Handling', () => {
      let eventHandlers: any;

      beforeEach(async () => {
        eventHandlers = {
          onAccountsChanged: vi.fn(),
          onChainChanged: vi.fn(),
          onConnect: vi.fn(),
          onDisconnect: vi.fn()
        };

        connector.registerEventHandlers(eventHandlers);
        
        // Connect to set up event listeners
        mockEthereum.request
          .mockResolvedValueOnce(['0x1234567890123456789012345678901234567890'])
          .mockResolvedValueOnce('0x1');
        
        await connector.connect();
      });

      it('should handle account changes', () => {
        const newAccounts = ['0x9876543210987654321098765432109876543210'];
        
        // Get the registered handler and call it
        const accountsChangedHandler = mockEthereum.on.mock.calls
          .find((call: any[]) => call[0] === 'accountsChanged')[1];
        
        accountsChangedHandler(newAccounts);

        expect(eventHandlers.onAccountsChanged).toHaveBeenCalledWith(newAccounts);
        expect(connector.getAddress()).toBe(newAccounts[0]);
      });

      it('should handle account disconnection', () => {
        // Get the registered handler and call it with empty accounts
        const accountsChangedHandler = mockEthereum.on.mock.calls
          .find((call: any[]) => call[0] === 'accountsChanged')[1];
        
        accountsChangedHandler([]);

        expect(eventHandlers.onAccountsChanged).toHaveBeenCalledWith([]);
        expect(connector.isConnected()).toBe(false);
      });

      it('should handle chain changes', () => {
        const newChainId = '0x89'; // Polygon
        
        // Get the registered handler and call it
        const chainChangedHandler = mockEthereum.on.mock.calls
          .find((call: any[]) => call[0] === 'chainChanged')[1];
        
        chainChangedHandler(newChainId);

        expect(eventHandlers.onChainChanged).toHaveBeenCalledWith(newChainId);
        expect(connector.getChainId()).toBe(newChainId);
      });

      it('should handle connect events', () => {
        const connectInfo = { chainId: '0x1' };
        
        // Get the registered handler and call it
        const connectHandler = mockEthereum.on.mock.calls
          .find((call: any[]) => call[0] === 'connect')[1];
        
        connectHandler(connectInfo);

        expect(eventHandlers.onConnect).toHaveBeenCalledWith(connectInfo);
      });

      it('should handle disconnect events', () => {
        const error = { code: 1013, message: 'Disconnected' };
        
        // Get the registered handler and call it
        const disconnectHandler = mockEthereum.on.mock.calls
          .find((call: any[]) => call[0] === 'disconnect')[1];
        
        disconnectHandler(error);

        expect(eventHandlers.onDisconnect).toHaveBeenCalledWith(error);
        expect(connector.isConnected()).toBe(false);
      });
    });

    describe('Additional Methods', () => {
      describe('isWalletLocked', () => {
        it('should return false when wallet is unlocked', async () => {
          mockEthereum.request.mockResolvedValueOnce(['0x1234567890123456789012345678901234567890']);
          
          const isLocked = await connector.isWalletLocked();
          expect(isLocked).toBe(false);
        });

        it('should return true when wallet is locked', async () => {
          mockEthereum.request.mockResolvedValueOnce([]);
          
          const isLocked = await connector.isWalletLocked();
          expect(isLocked).toBe(true);
        });

        it('should return true when request fails', async () => {
          mockEthereum.request.mockRejectedValueOnce(new Error('Request failed'));
          
          const isLocked = await connector.isWalletLocked();
          expect(isLocked).toBe(true);
        });
      });

      describe('requestPermissions', () => {
        it('should request permissions successfully', async () => {
          const mockPermissions = [{ parentCapability: 'eth_accounts' }];
          mockEthereum.request.mockResolvedValueOnce(mockPermissions);

          const permissions = await connector.requestPermissions();
          
          expect(permissions).toEqual(mockPermissions);
          expect(mockEthereum.request).toHaveBeenCalledWith({
            method: 'wallet_requestPermissions',
            params: [{ eth_accounts: {} }]
          });
        });
      });

      describe('getPermissions', () => {
        it('should get permissions successfully', async () => {
          const mockPermissions = [{ parentCapability: 'eth_accounts' }];
          mockEthereum.request.mockResolvedValueOnce(mockPermissions);

          const permissions = await connector.getPermissions();
          
          expect(permissions).toEqual(mockPermissions);
          expect(mockEthereum.request).toHaveBeenCalledWith({
            method: 'wallet_getPermissions'
          });
        });

        it('should return empty array on error', async () => {
          mockEthereum.request.mockRejectedValueOnce(new Error('Permission error'));

          const permissions = await connector.getPermissions();
          
          expect(permissions).toEqual([]);
        });
      });

      describe('switchNetwork', () => {
        it('should switch network successfully', async () => {
          const chainId = '0x89'; // Polygon
          mockEthereum.request.mockResolvedValueOnce(null);

          await connector.switchNetwork(chainId);
          
          expect(mockEthereum.request).toHaveBeenCalledWith({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId }]
          });
        });
      });

      describe('getWalletVersion', () => {
        it('should return version when available', () => {
          (window.ethereum as any)._metamask = { version: '10.0.0' };
          
          const version = connector.getWalletVersion();
          expect(version).toBe('10.0.0');
        });

        it('should return undefined when version not available', () => {
          delete (window.ethereum as any)._metamask;
          
          const version = connector.getWalletVersion();
          expect(version).toBeUndefined();
        });
      });
    });

    describe('Multiple Providers Scenario', () => {
      it('should find MetaMask in providers array', async () => {
        // Setup multiple providers scenario
        const metamaskProvider = createMockEthereum();
        const otherProvider = createMockEthereum({ isMetaMask: false });
        
        mockEthereum.isMetaMask = false;
        mockEthereum.providers = [otherProvider, metamaskProvider];
        
        mockEthereum.request
          .mockResolvedValueOnce([]) // eth_accounts (not connected)
          .mockResolvedValueOnce('0x1') // eth_chainId
          .mockResolvedValueOnce(['0x1234567890123456789012345678901234567890']) // eth_requestAccounts
          .mockResolvedValueOnce('0x1'); // eth_chainId

        const connection = await connector.connect();
        
        expect(connection.walletType).toBe(WalletType.METAMASK);
      });
    });
  });
});