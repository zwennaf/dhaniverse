import React, { useState, useEffect } from 'react';
import DepositWithdrawPanel from './DepositWithdrawPanel';
import FixedDepositPanel from './FixedDepositPanel';
import { bankingApi, fixedDepositApi, playerStateApi } from '../../../utils/api';

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
        setBankBalance(result.data.balance);
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
          <h2 className="text-2xl font-bold text-white">Dhaniverse Banking</h2>          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

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
                <DepositWithdrawPanel
                  playerRupees={playerRupees + totalRupeesChange}
                  bankBalance={bankBalance}
                  onDeposit={handleDeposit}
                  onWithdraw={handleWithdraw}
                />
              )}
              
              {activeTab === 'fd' && (
                <FixedDepositPanel
                  bankBalance={bankBalance}
                  fixedDeposits={fixedDeposits}
                  onCreateFD={handleCreateFD}
                  onClaimFD={handleClaimFD}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BankingDashboard;