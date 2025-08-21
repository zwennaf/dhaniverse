import { useState, useEffect } from 'react';
import { icpService } from '../services/icp';

export const useICP = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [principal, setPrincipal] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const authenticated = await icpService.isAuthenticated();
      setIsAuthenticated(authenticated);
      
      if (authenticated) {
        const userPrincipal = await icpService.getPrincipal();
        setPrincipal(userPrincipal);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async () => {
    setLoading(true);
    try {
      const success = await icpService.login();
      if (success) {
        await checkAuth();
      }
      return success;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await icpService.logout();
      setIsAuthenticated(false);
      setPrincipal(null);
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // Canister methods
  const healthCheck = async () => {
    return await icpService.healthCheck();
  };

  const getAvailableWallets = async () => {
    return await icpService.getAvailableWallets();
  };

  const connectWallet = async (walletType: string, address: string, chainId: string) => {
    return await icpService.connectWallet(walletType, address, chainId);
  };

  const getDualBalance = async (walletAddress: string) => {
    return await icpService.getDualBalance(walletAddress);
  };

  const exchangeCurrency = async (walletAddress: string, fromCurrency: string, toCurrency: string, amount: number) => {
    return await icpService.exchangeCurrency(walletAddress, fromCurrency, toCurrency, amount);
  };

  const getCanisterMetrics = async () => {
    return await icpService.getCanisterMetrics();
  };

  return {
    // Auth state
    isAuthenticated,
    principal,
    loading,
    
    // Auth methods
    login,
    logout,
    
    // Canister methods
    healthCheck,
    getAvailableWallets,
    connectWallet,
    getDualBalance,
    exchangeCurrency,
    getCanisterMetrics,
  };
};