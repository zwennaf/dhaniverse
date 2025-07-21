import React, { useState, useEffect } from 'react';
import DepositWithdrawPanel from './DepositWithdrawPanel';
import FixedDepositPanel from './FixedDepositPanel';
import { bankingApi, fixedDepositApi, playerStateApi } from '../../../utils/api';
import { WalletManager, WalletStatus } from '../../../services/WalletManager';
import { ICPActorService } from '../../../services/ICPActorService';
import { DualStorageManager, StorageMode } from '../../../services/DualStorageManager';

interface FixedDeposit {
  _id?: string;
  id?: string;
  amount: number;
  interestRate: number;
  startDate: number;
  duration: number;
  maturityDate: number;
  matured: boolean;
  status?: 'active' | 'matured' | 'claimed';
}

interface BankingDashboardProps {
  onClose: () => void;
  playerRupees: number;
  initialRupees: number;
}

const BankingDashboard: React.FC<BankingDashboardProps> = ({
  onClose,
  playerRupees,
  initialRupees
}) => {
  const [activeTab, setActiveTab] = useState('account');
  const [bankBalance, setBankBalance] = useState(0);
  const [fixedDeposits, setFixedDeposits] = useState<FixedDeposit[]>([]);
  const [totalRupeesChange, setTotalRupeesChange] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // ICP Integration State
  const [walletManager] = useState(() => new WalletManager());
  const [icpService] = useState(() => new ICPActorService(process.env.REACT_APP_CANISTER_ID || 'rdmx6-jaaaa-aaaah-qcaiq-cai'));
  const [dualStorageManager] = useState(() => new DualStorageManager(icpService, walletManager));
  const [walletStatus, setWalletStatus] = useState<WalletStatus>({ connected: false });
  const [storageMode, setStorageMode] = useState<StorageMode>('local');
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [showWalletPrompt, setShowWalletPrompt] = useState(false);
  
  // Initialize ICP services
  useEffect(() => {
    const initializeICP = async () => {
      // Listen for wallet status changes
      walletManager.onConnectionChange((status) => {
        setWalletStatus(status);
        if (status.connected) {
          setShowWalletPrompt(false);
          // Connect ICP service with wallet identity
          const identity = walletManager.getIdentity();
          if (identity) {
            icpService.connect(identity).then((connected) => {
              if (connected) {
                dualStorageManager.setStorageMode('hybrid');
                setStorageMode('hybrid');
              }
            });
          }
        } else {
          dualStorageManager.setStorageMode('local');
          setStorageMode('local');
        }
      });

      // Check initial wallet status
      const initialStatus = walletManager.getConnectionStatus();
      setWalletStatus(initialStatus);
      setStorageMode(dualStorageManager.getStorageMode());
    };

    initializeICP();
  }, []);

  // Enhanced close handler that communicates final rupee state
  const handleClose = () => {
    // Calculate final rupees after all banking transactions
    const finalRupees = playerRupees + totalRupeesChange;
    
    // Dispatch a final rupee update to sync with game state
    window.dispatchEvent(new CustomEvent('rupee-update', {
      detail: { rupees: finalRupees }
    }));
    
    // Also dispatch to MainScene specifically
    window.dispatchEvent(new CustomEvent('updatePlayerRupees', {
      detail: { rupees: finalRupees, closeUI: true }
    }));
    
    console.log(`Banking UI closing. Final rupees: ${finalRupees}, change: ${totalRupeesChange}`);
    
    // Call the original onClose function
    onClose();
  };

  // Wallet connection handlers
  const handleConnectWallet = async () => {
    try {
      const result = await walletManager.connectWallet();
      if (result.success) {
        console.log('Wallet connected successfully');
        // Optionally sync existing data to blockchain
        setShowWalletPrompt(false);
      } else {
        console.error('Failed to connect wallet:', result.error);
        setError(`Failed to connect wallet: ${result.error}`);
      }
    } catch (error) {
      console.error('Wallet connection error:', error);
      setError(`Wallet connection error: ${error}`);
    }
  };

  const handleDisconnectWallet = () => {
    walletManager.disconnectWallet();
    setShowWalletPrompt(false);
  };

  const handleSyncToBlockchain = async () => {
    if (syncInProgress) return;
    
    setSyncInProgress(true);
    try {
      const result = await dualStorageManager.syncToBlockchain();
      if (result.success) {
        console.log(`Synced ${result.syncedTransactions} transactions to blockchain`);
        if (result.conflicts > 0) {
          setError(`Sync completed with ${result.conflicts} conflicts resolved`);
        }
      } else {
        setError(`Sync failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Sync error:', error);
      setError(`Sync error: ${error}`);
    } finally {
      setSyncInProgress(false);
    }
  };
  
  // Show wallet prompt after initial load
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!walletStatus.connected) {
        setShowWalletPrompt(true);
      }
    }, 2000); // Show prompt after 2 seconds

    return () => clearTimeout(timer);
  }, [walletStatus.connected]);

  // Load data from backend
  useEffect(() => {
    const loadBankingData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Load bank account data
        const bankData = await bankingApi.getAccount();
        if (bankData.success) {
          setBankBalance(bankData.data.balance || 0);
        }
        
        // Load fixed deposits data
        const fdData = await fixedDepositApi.getAll();
        if (fdData.success) {
          // Convert dates and ensure compatibility
          const convertedFDs = fdData.data.map((fd: any) => ({
            ...fd,
            id: fd._id || fd.id,
            startDate: new Date(fd.startDate).getTime(),
            maturityDate: new Date(fd.maturityDate).getTime(),
            matured: fd.matured || fd.status === 'matured'
          }));
          setFixedDeposits(convertedFDs);
        }
      } catch (error) {
        console.error("Error loading banking data:", error);
        setError(`Failed to load banking data: ${error}`);
        
        // Fallback to localStorage for backwards compatibility
        try {
          const bankData = localStorage.getItem('dhaniverse_bank_account');
          if (bankData) {
            const parsedData = JSON.parse(bankData);
            setBankBalance(parsedData.balance || 0);
          }
          
          const fdData = localStorage.getItem('dhaniverse_fixed_deposits');
          if (fdData) {
            let parsedFDs = JSON.parse(fdData);
            const currentTime = Date.now();
            parsedFDs = parsedFDs.map((fd: any) => {
              if (!fd.matured && fd.maturityDate <= currentTime) {
                return { ...fd, matured: true };
              }
              return fd;
            });
            setFixedDeposits(parsedFDs);
          }
        } catch (fallbackError) {
          console.error("Error loading fallback data:", fallbackError);
        }
      } finally {
        setLoading(false);
      }
    };

    loadBankingData();
  }, []);

  // Every time playerRupees changes externally, reset the change tracking
  useEffect(() => {
    setTotalRupeesChange(0);
  }, [initialRupees]);
  // Handle deposit to bank account
  const handleDeposit = async (amount: number): Promise<boolean> => {
    try {
      const result = await bankingApi.deposit(amount);
      if (result.success) {
        // Check if result.data and result.data.balance exist
        if (result.data && typeof result.data.balance === 'number') {
          setBankBalance(result.data.balance);
        } else {
          // If balance is not in the response, increment the current balance
          setBankBalance(prevBalance => prevBalance + amount);
        }
        
        setTotalRupeesChange(prev => prev - amount);
        
        // Update player state in backend
        await playerStateApi.updateRupees(playerRupees - amount);
        
        // Dispatch rupee update event to HUD
        window.dispatchEvent(new CustomEvent('rupee-update', {
          detail: { rupees: playerRupees - amount }
        }));
        
        return true;
      } else {
        throw new Error(result.error || 'Deposit failed');
      }
    } catch (error) {
      console.error("Deposit error:", error);
      // Fallback to localStorage
      const currentBankData = JSON.parse(localStorage.getItem('dhaniverse_bank_account') || '{"balance": 0}');
      currentBankData.balance += amount;
      localStorage.setItem('dhaniverse_bank_account', JSON.stringify(currentBankData));
      setBankBalance(currentBankData.balance);
      setTotalRupeesChange(prev => prev - amount);
      
      // Dispatch rupee update event to HUD (fallback)
      window.dispatchEvent(new CustomEvent('rupee-update', {
        detail: { rupees: playerRupees - amount }
      }));
      
      return true;
    }
  };
  // Handle withdrawal from bank account
  const handleWithdraw = async (amount: number): Promise<boolean> => {
    try {
      const result = await bankingApi.withdraw(amount);
      if (result.success) {
        setBankBalance(result.data.balance);
        setTotalRupeesChange(prev => prev + amount);
        
        // Update player state in backend
        await playerStateApi.updateRupees(playerRupees + amount);
        
        // Dispatch rupee update event to HUD
        window.dispatchEvent(new CustomEvent('rupee-update', {
          detail: { rupees: playerRupees + amount }
        }));
        
        return true;
      } else {
        throw new Error(result.error || 'Withdrawal failed');
      }
    } catch (error) {
      console.error("Withdrawal error:", error);
      // Fallback to localStorage
      const currentBankData = JSON.parse(localStorage.getItem('dhaniverse_bank_account') || '{"balance": 0}');
      if (currentBankData.balance >= amount) {
        currentBankData.balance -= amount;
        localStorage.setItem('dhaniverse_bank_account', JSON.stringify(currentBankData));
        setBankBalance(currentBankData.balance);
        setTotalRupeesChange(prev => prev + amount);
        
        // Dispatch rupee update event to HUD (fallback)
        window.dispatchEvent(new CustomEvent('rupee-update', {
          detail: { rupees: playerRupees + amount }
        }));
        
        return true;
      }
      return false;
    }
  };

  // Handle creating a fixed deposit
  const handleCreateFD = async (amount: number, duration: number): Promise<boolean> => {
    try {
      const result = await fixedDepositApi.create(amount, duration);
      if (result.success) {
        // Convert the new FD format
        const newFD = {
          ...result.data,
          id: result.data._id || result.data.id,
          startDate: new Date(result.data.startDate).getTime(),
          maturityDate: new Date(result.data.maturityDate).getTime(),
          matured: result.data.matured || false
        };
        
        setFixedDeposits(prev => [...prev, newFD]);
        setBankBalance(prev => prev - amount);
        return true;
      } else {
        throw new Error(result.error || 'Failed to create fixed deposit');
      }
    } catch (error) {
      console.error("Create FD error:", error);
      // Fallback to localStorage
      const currentTime = Date.now();
      const interestRate = duration === 30 ? 5 : duration === 90 ? 7 : 10;
      const maturityDate = currentTime + (duration * 24 * 60 * 60 * 1000);
      
      const newFD: FixedDeposit = {
        id: `fd_${currentTime}`,
        amount,
        interestRate,
        startDate: currentTime,
        duration,
        maturityDate,
        matured: false
      };
      
      const updatedFDs = [...fixedDeposits, newFD];
      setFixedDeposits(updatedFDs);
      localStorage.setItem('dhaniverse_fixed_deposits', JSON.stringify(updatedFDs));
      
      const currentBankData = JSON.parse(localStorage.getItem('dhaniverse_bank_account') || '{"balance": 0}');
      currentBankData.balance -= amount;
      localStorage.setItem('dhaniverse_bank_account', JSON.stringify(currentBankData));
      setBankBalance(currentBankData.balance);
      return true;
    }
  };  // Handle claiming a matured fixed deposit
  const handleClaimFD = async (fdId: string): Promise<boolean> => {
    try {
      const result = await fixedDepositApi.claim(fdId);
      if (result.success) {
        // Remove the claimed FD from the list
        setFixedDeposits(prev => prev.filter(fd => (fd._id || fd.id) !== fdId));
        setBankBalance(prev => prev + result.data.claimedAmount);
        
        // Dispatch rupee update event to HUD if the claim results in bank balance change
        // Note: FD claims add money to bank, not directly to player rupees
        // But we don't dispatch rupee updates here since it's just bank balance changing
        
        return true;
      } else {
        throw new Error(result.error || 'Failed to claim fixed deposit');
      }
    } catch (error) {
      console.error("Claim FD error:", error);
      // Fallback to localStorage
      const fdToClaim = fixedDeposits.find(fd => (fd._id || fd.id) === fdId);
      if (fdToClaim && fdToClaim.matured) {
        const claimedAmount = fdToClaim.amount + (fdToClaim.amount * fdToClaim.interestRate / 100);
        
        const updatedFDs = fixedDeposits.filter(fd => (fd._id || fd.id) !== fdId);
        setFixedDeposits(updatedFDs);
        localStorage.setItem('dhaniverse_fixed_deposits', JSON.stringify(updatedFDs));
        
        const currentBankData = JSON.parse(localStorage.getItem('dhaniverse_bank_account') || '{"balance": 0}');
        currentBankData.balance += claimedAmount;
        localStorage.setItem('dhaniverse_bank_account', JSON.stringify(currentBankData));
        setBankBalance(currentBankData.balance);
        return true;
      }
      return false;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-bold text-white">Dhaniverse Banking</h2>
            {/* Blockchain Status Indicator */}
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${walletStatus.connected ? 'bg-green-400' : 'bg-gray-400'}`}></div>
              <span className="text-sm text-gray-300">
                {walletStatus.connected ? `Connected (${walletStatus.walletType?.toUpperCase()})` : 'Local Mode'}
              </span>
              {storageMode === 'hybrid' && (
                <span className="px-2 py-1 bg-blue-600 text-xs rounded-full text-white">
                  Blockchain Enhanced
                </span>
              )}
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Wallet Connection Prompt */}
        {!walletStatus.connected && showWalletPrompt && (
          <div className="bg-blue-900/50 border border-blue-700 p-4 mx-6 mt-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-blue-300 font-medium">Connect ICP Wallet for Enhanced Features</h3>
                <p className="text-blue-200 text-sm mt-1">
                  Get tamper-proof records and compete on blockchain leaderboards
                </p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handleConnectWallet}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Connect Wallet
                </button>
                <button
                  onClick={() => setShowWalletPrompt(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                >
                  Maybe Later
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab('account')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'account'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Bank Account
          </button>
          <button
            onClick={() => setActiveTab('fd')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'fd'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Fixed Deposits ({fixedDeposits.length})
          </button>
          {walletStatus.connected && (
            <button
              onClick={() => setActiveTab('blockchain')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'blockchain'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Blockchain
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-lg text-gray-400">Loading banking data...</div>
            </div>
          ) : error ? (
            <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 mb-6">
              <div className="text-red-400 font-medium">Error Loading Banking Data</div>
              <div className="text-red-300 text-sm mt-1">{error}</div>
              <button 
                onClick={() => window.location.reload()} 
                className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              {activeTab === 'account' && (
                <div>
                  <DepositWithdrawPanel
                    playerRupees={playerRupees + totalRupeesChange}
                    bankBalance={bankBalance}
                    onDeposit={handleDeposit}
                    onWithdraw={handleWithdraw}
                  />
                  
                  {/* Blockchain Actions */}
                  {walletStatus.connected && (
                    <div className="mt-6 p-4 bg-gray-700 rounded-lg">
                      <h3 className="text-lg font-medium text-white mb-3">Blockchain Actions</h3>
                      <div className="flex space-x-3">
                        <button
                          onClick={handleSyncToBlockchain}
                          disabled={syncInProgress}
                          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {syncInProgress ? 'Syncing...' : 'Sync to Blockchain'}
                        </button>
                        <button
                          onClick={handleDisconnectWallet}
                          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                        >
                          Disconnect Wallet
                        </button>
                      </div>
                      <p className="text-sm text-gray-300 mt-2">
                        Principal: {walletStatus.principal?.slice(0, 20)}...
                      </p>
                    </div>
                  )}
                  
                  {/* Connect Wallet Button for Account Tab */}
                  {!walletStatus.connected && (
                    <div className="mt-6 p-4 bg-gray-700 rounded-lg text-center">
                      <h3 className="text-lg font-medium text-white mb-2">Enhance Your Banking</h3>
                      <p className="text-gray-300 mb-4">
                        Connect your ICP wallet for tamper-proof records and blockchain verification
                      </p>
                      <button
                        onClick={handleConnectWallet}
                        className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        Connect ICP Wallet
                      </button>
                    </div>
                  )}
                </div>
              )}
              
              {activeTab === 'fd' && (
                <FixedDepositPanel
                  bankBalance={bankBalance}
                  fixedDeposits={fixedDeposits}
                  onCreateFD={handleCreateFD}
                  onClaimFD={handleClaimFD}
                />
              )}
              
              {activeTab === 'blockchain' && walletStatus.connected && (
                <div className="space-y-6">
                  <div className="bg-gray-700 rounded-lg p-6">
                    <h3 className="text-xl font-bold text-white mb-4">Blockchain Status</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-400">Storage Mode</div>
                        <div className="text-lg font-medium text-white capitalize">{storageMode}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400">Wallet Type</div>
                        <div className="text-lg font-medium text-white">{walletStatus.walletType?.toUpperCase()}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400">Principal ID</div>
                        <div className="text-sm font-mono text-blue-300 break-all">{walletStatus.principal}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-400">Connection Status</div>
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          <span className="text-green-400">Connected</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-700 rounded-lg p-6">
                    <h3 className="text-xl font-bold text-white mb-4">Sync Management</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-white font-medium">Sync to Blockchain</div>
                          <div className="text-sm text-gray-400">Upload local transactions to ICP canister</div>
                        </div>
                        <button
                          onClick={handleSyncToBlockchain}
                          disabled={syncInProgress}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {syncInProgress ? 'Syncing...' : 'Sync Now'}
                        </button>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-white font-medium">Disconnect Wallet</div>
                          <div className="text-sm text-gray-400">Return to local-only mode</div>
                        </div>
                        <button
                          onClick={handleDisconnectWallet}
                          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                        >
                          Disconnect
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-700 rounded-lg p-6">
                    <h3 className="text-xl font-bold text-white mb-4">Transaction Sources</h3>
                    <div className="text-sm text-gray-400 mb-2">
                      Your transactions are now enhanced with blockchain verification
                    </div>
                    <div className="flex space-x-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                        <span className="text-blue-300">Blockchain Verified</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                        <span className="text-gray-300">Local Only</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BankingDashboard;