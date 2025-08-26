import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { animate, stagger } from 'motion';
import { bankingApi } from '../../../utils/api';
import { balanceManager } from '../../../services/BalanceManager';

interface CreatedAccountDetails {
  accountNumber: string;
  ifscCode: string;
  accountHolder: string;
  branchName: string;
  accountType: string;
  openingDate: string;
  balance: number;
}

type FlowStep = 'HIDDEN' | 'FORM' | 'PROCESSING' | 'DETAILS' | 'SUCCESS';

const MIN_DEPOSIT = 500;

const BankAccountCreationFlow: React.FC = () => {
  const [step, setStep] = useState<FlowStep>('HIDDEN');
  const [name, setName] = useState('');
  const [deposit, setDeposit] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [createdAccount, setCreatedAccount] = useState<CreatedAccountDetails | null>(null);
  const [currentBalance, setCurrentBalance] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Update current balance when component mounts or balance changes
  useEffect(() => {
    const updateBalance = () => {
      const balance = balanceManager.getBalance();
      console.log('Bank Account Creation: Balance update', balance);
      setCurrentBalance(balance.cash);
    };
    
    updateBalance();
    const unsubscribe = balanceManager.onBalanceChange(updateBalance);
    
    return () => {
      unsubscribe();
    };
  }, []);

  // Real-time validation when deposit amount or balance changes
  useEffect(() => {
    if (step === 'FORM' && deposit) {
      const num = Number(deposit);
      console.log('Bank Account Creation: Validating deposit', { deposit, num, currentBalance, step });
      if (num > 0 && currentBalance < num) {
        setErrors([`Insufficient balance. You have ₹${currentBalance.toLocaleString()}, but need ₹${num.toLocaleString()}`]);
      } else if (errors.some(err => err.includes('Insufficient balance'))) {
        // Clear the insufficient balance error if balance is now sufficient
        setErrors(errors.filter(err => !err.includes('Insufficient balance')));
      }
    }
  }, [deposit, currentBalance, step, errors]);

  // Open flow when event dispatched
  useEffect(() => {
    const openHandler = async () => {
      setStep('FORM');
      setErrors([]);
      setName('');
      setDeposit('');
      
      // Force refresh current balance when form opens to prevent race conditions
      try {
        const { playerStateApi } = await import('../../../utils/api');
        const response = await playerStateApi.get();
        if (response.success && response.data) {
          const backendCash = response.data.financial?.rupees || response.data.rupees || 0;
          console.log('Bank Account Creation: Opening form with refreshed balance from backend:', backendCash);
          balanceManager.updateCash(backendCash, true);
          setCurrentBalance(backendCash);
        } else {
          // Fallback to current balance manager balance
          const currentBalance = balanceManager.getBalance();
          console.log('Bank Account Creation: Opening form with balance manager balance:', currentBalance);
          setCurrentBalance(currentBalance.cash);
        }
      } catch (error) {
        console.warn('Failed to refresh balance from backend on form open:', error);
        // Fallback to current balance manager balance
        const currentBalance = balanceManager.getBalance();
        setCurrentBalance(currentBalance.cash);
      }
      
      // Freeze dialogue when UI opens
      window.dispatchEvent(new CustomEvent('freeze-dialogue'));
    };
    const createdHandler = (e: Event) => {
      const customEvent = e as CustomEvent;
      const accountData = customEvent.detail;
      if (accountData) { 
        setCreatedAccount(accountData); 
        setStep('DETAILS'); 
      }
    };
    window.addEventListener('open-bank-account-creation-flow', openHandler as EventListener);
    window.addEventListener('bank-account-created', createdHandler as EventListener);
    return () => {
      window.removeEventListener('open-bank-account-creation-flow', openHandler as EventListener);
      window.removeEventListener('bank-account-created', createdHandler as EventListener);
    };
  }, []);

  // Animate panel entry and morphing
  useEffect(() => {
    if (step === 'HIDDEN') return;
    if (!containerRef.current) return;
    const panel = containerRef.current.querySelector('[data-flow-panel]');
    if (panel) {
      if (step === 'FORM') {
        // Initial entry animation
        animate(panel as any, { 
          opacity: [0, 1], 
          transform: ['translateY(20px)', 'translateY(0)'] 
        } as any, { duration: 0.4 });
      } else if (step === 'PROCESSING') {
        // Morph to processing state
        animate(panel as any, { 
          opacity: [1, 0.8, 1],
          transform: ['scale(1)', 'scale(0.98)', 'scale(1)']
        } as any, { duration: 0.6 });
      } else {
        // Smooth transition for other steps
        animate(panel as any, { 
          opacity: [0.8, 1],
          transform: ['scale(0.98)', 'scale(1)']
        } as any, { duration: 0.3 });
      }
    }
  }, [step]);

  // Form validation
  const validate = (): boolean => {
    const errs: string[] = [];
    const trimmed = name.trim();
    if (!trimmed || trimmed.length < 2) errs.push('Enter your full name');
    const num = Number(deposit);
    if (!deposit || isNaN(num) || num < MIN_DEPOSIT) {
      errs.push(`Minimum deposit is ₹${MIN_DEPOSIT}`);
    }
    
    // Get fresh balance to avoid race conditions
    const freshBalance = balanceManager.getBalance().cash;
    setCurrentBalance(freshBalance);
    
    // Check if user has sufficient cash balance
    if (num > 0 && freshBalance < num) {
      errs.push(`Insufficient balance. You have ₹${freshBalance.toLocaleString()}, but need ₹${num.toLocaleString()}`);
    }
    
    setErrors(errs);
    return errs.length === 0;
  };

  const handleSubmit = async () => {
    // Force refresh balance from backend before validation to ensure accuracy
    try {
      const { playerStateApi } = await import('../../../utils/api');
      const response = await playerStateApi.get();
      if (response.success && response.data) {
        const backendCash = response.data.financial?.rupees || response.data.rupees || 0;
        console.log('Bank Account Creation: Refreshed balance from backend:', backendCash);
        balanceManager.updateCash(backendCash, true);
        setCurrentBalance(backendCash);
      }
    } catch (error) {
      console.warn('Failed to refresh balance from backend, using current balance:', error);
    }
    
    if (!validate()) return;
    const initialDeposit = Number(deposit);
    
    // Smooth transition to processing
    if (containerRef.current) {
      const content = containerRef.current.querySelector('[data-content]');
      if (content) {
        animate(content as any, {
          opacity: [1, 0]
        } as any, { 
          duration: 0.2,
          onComplete: () => {
            setStep('PROCESSING');
            // Fade in processing content
            setTimeout(() => {
              const newContent = containerRef.current?.querySelector('[data-content]');
              if (newContent) {
                animate(newContent as any, {
                  opacity: [0, 1]
                } as any, { duration: 0.3 });
              }
            }, 50);
          }
        });
      }
    }
    
    try {
      // Call actual API to create bank account with initial deposit
      const response = await bankingApi.createAccount(name.trim(), initialDeposit);
      
      if (response.success) {
        const accountData = response.data;
        
        // If onboarding was completed by the API, mark it in localStorage too
        if (response.onboardingCompleted) {
          localStorage.setItem('dhaniverse_bank_onboarding_completed', 'true');
          console.log('Bank onboarding marked as completed in database and localStorage');
        }
        
        // Update balance manager to reflect the deposit transaction
        if (initialDeposit > 0) {
          try {
            // Double-check balance before processing deposit
            const preDepositBalance = balanceManager.getBalance().cash;
            if (preDepositBalance >= initialDeposit) {
              balanceManager.processDeposit(initialDeposit, "Bank Account Creation");
            } else {
              console.warn(`Insufficient balance for deposit: have ${preDepositBalance}, need ${initialDeposit}. Updating manually.`);
              // Update balance manually if balance check fails
              balanceManager.updateCash(Math.max(0, preDepositBalance - initialDeposit));
              balanceManager.updateBankBalance(accountData.balance);
            }
          } catch (error) {
            console.warn('Balance manager deposit failed, updating manually:', error);
            const currentBalance = balanceManager.getBalance();
            balanceManager.updateCash(Math.max(0, currentBalance.cash - initialDeposit));
            balanceManager.updateBankBalance(accountData.balance);
          }
        }
        
        setCreatedAccount({
          accountNumber: accountData.accountNumber || accountData._id,
          accountHolder: accountData.accountHolder,
          balance: accountData.balance,
          openingDate: accountData.createdAt,
          branchName: 'Dhaniverse Central Branch',
          accountType: 'Savings Account',
          ifscCode: ''
        });
        
        // Save to localStorage for local persistence
        localStorage.setItem('dhaniverse_bank_account_details', JSON.stringify({
          accountNumber: accountData.accountNumber || accountData._id,
          accountHolder: accountData.accountHolder,
          balance: accountData.balance,
          openingDate: accountData.createdAt
        }));
        localStorage.setItem('dhaniverse_bank_account_holder_name', name.trim());
        
        // Smooth transition to details after brief processing
        setTimeout(() => {
          if (containerRef.current) {
            const content = containerRef.current.querySelector('[data-content]');
            if (content) {
              animate(content as any, {
                opacity: [1, 0]
              } as any, { 
                duration: 0.2,
                onComplete: () => {
                  setStep('DETAILS');
                  setTimeout(() => {
                    const newContent = containerRef.current?.querySelector('[data-content]');
                    if (newContent) {
                      animate(newContent as any, {
                        opacity: [0, 1]
                      } as any, { duration: 0.3 });
                    }
                  }, 50);
                }
              });
            }
          }
        }, 2000);
        
      } else {
        throw new Error(response.error || 'Failed to create account');
      }
    } catch (error) {
      console.error('Bank account creation failed:', error);
      
      // Smooth transition back to form
      if (containerRef.current) {
        const content = containerRef.current.querySelector('[data-content]');
        if (content) {
          animate(content as any, {
            opacity: [1, 0]
          } as any, { 
            duration: 0.2,
            onComplete: () => {
              // Extract error message and set errors
              let errorMessage = 'Account creation failed';
              if (error instanceof Error) {
                if (error.message.includes('Insufficient')) {
                  errorMessage = error.message;
                } else {
                  errorMessage = `Account creation failed: ${error.message}`;
                }
              }
              setErrors([errorMessage]);
              setStep('FORM');
              
              // Fade in form content
              setTimeout(() => {
                const newContent = containerRef.current?.querySelector('[data-content]');
                if (newContent) {
                  animate(newContent as any, {
                    opacity: [0, 1]
                  } as any, { duration: 0.3 });
                }
              }, 50);
            }
          });
        }
      } else {
        // Fallback if animation fails
        let errorMessage = 'Account creation failed';
        if (error instanceof Error) {
          if (error.message.includes('Insufficient')) {
            errorMessage = error.message;
          } else {
            errorMessage = `Account creation failed: ${error.message}`;
          }
        }
        setErrors([errorMessage]);
        setStep('FORM');
      }
    }
  };

  const handleNextFromDetails = () => setStep('SUCCESS');
  
  const handleConfirmSuccess = () => {
    // Unfreeze dialogue and notify completion
    window.dispatchEvent(new CustomEvent('unfreeze-dialogue'));
    window.dispatchEvent(new CustomEvent('bank-account-creation-finished', { 
      detail: { name, account: createdAccount } 
    }));
    setStep('HIDDEN');
  };

  if (step === 'HIDDEN') return null;

  return (
    <div ref={containerRef} className="fixed inset-0 z-[1700] flex items-center justify-center px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80" />
      
      {/* Panel */}
      <div data-flow-panel className="relative w-[500px] max-w-full bg-black text-white rounded-2xl p-10 flex flex-col gap-8 min-h-[450px] shadow-2xl">
        <div data-content className="flex flex-col gap-8 flex-1">
          {step === 'FORM' && (
            <>
              <h2 className="text-center text-2xl font-bold tracking-wide text-[#EFC94C]" style={{ fontFamily: 'VCR OSD Mono, monospace' }}>
                Create Bank Account
              </h2>
              
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-3">
                  <label className="text-sm font-medium tracking-wide text-white/90">ACCOUNT HOLDER NAME</label>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onFocus={() => {
                      // Send typing-start to disable game controls
                      window.dispatchEvent(new Event("typing-start"));
                    }}
                    onBlur={() => {
                      // Send typing-end to re-enable game controls
                      window.dispatchEvent(new Event("typing-end"));
                    }}
                    onKeyDown={(e) => {
                      // Allow all game control keys to be typed in the input
                      const gameControlKeys = ["w","a","s","d","e","t","W","A","S","D","E","T"," "];
                      if (gameControlKeys.includes(e.key)) {
                        // Stop propagation to prevent game from handling these keys
                        e.stopPropagation();
                      }
                    }}
                    placeholder="Enter your full name"
                    className="bg-black text-white placeholder:text-white/50 border border-white/20 rounded-lg px-5 py-4 text-base tracking-wide outline-none focus:border-white/40 transition-colors"
                    maxLength={60}
                    autoFocus
                  />
                </div>
                
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium tracking-wide text-white/90">INITIAL DEPOSIT (₹{MIN_DEPOSIT} minimum)</label>
                    <span className="text-xs text-white/60">Available: ₹{currentBalance.toLocaleString()}</span>
                  </div>
                  <input
                    value={deposit}
                    onChange={e => setDeposit(e.target.value.replace(/[^0-9]/g, ''))}
                    onFocus={() => {
                      // Send typing-start to disable game controls
                      window.dispatchEvent(new Event("typing-start"));
                    }}
                    onBlur={() => {
                      // Send typing-end to re-enable game controls
                      window.dispatchEvent(new Event("typing-end"));
                    }}
                    onKeyDown={(e) => {
                      // Allow all game control keys to be typed in the input
                      const gameControlKeys = ["w","a","s","d","e","t","W","A","S","D","E","T"," "];
                      if (gameControlKeys.includes(e.key)) {
                        // Stop propagation to prevent game from handling these keys
                        e.stopPropagation();
                      }
                    }}
                    placeholder="Enter amount"
                    className="bg-black text-white placeholder:text-white/50 border border-white/20 rounded-lg px-5 py-4 text-base tracking-wide outline-none focus:border-white/40 transition-colors"
                    inputMode="numeric"
                  />
                </div>
                
                {errors.length > 0 && (
                  <div className="text-red-400 text-sm bg-red-400/10 rounded-lg p-4">
                    {errors.map(err => <div key={err}>⚠ {err}</div>)}
                  </div>
                )}
              </div>
              
              <button
                onClick={handleSubmit}
                className="bg-[#EFC94C] text-black font-bold tracking-wide py-4 px-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#EFC94C]/90 transition-colors mt-auto"
                disabled={!name.trim() || !deposit}
              >
                CREATE ACCOUNT
              </button>
            </>
          )}

          {step === 'PROCESSING' && (
            <div className="flex flex-col items-center justify-center py-20 gap-8 min-h-[350px]">
              <h2 className="text-xl font-bold tracking-wide text-center text-[#EFC94C]" style={{ fontFamily: 'VCR OSD Mono, monospace' }}>
                Processing Account Creation
              </h2>
              <div className="flex justify-center gap-4">
                {[0,1,2].map(i => (
                  <div 
                    key={i} 
                    className="w-6 h-6 bg-[#EFC94C] rounded-sm animate-pulse" 
                    style={{ 
                      animationDelay: `${i*200}ms`,
                      animationDuration: '1s'
                    }} 
                  />
                ))}
              </div>
            </div>
          )}

          {step === 'DETAILS' && createdAccount && (
            <>
              <h2 className="text-center text-xl font-bold tracking-wide mb-6 text-[#EFC94C]" style={{ fontFamily: 'VCR OSD Mono, monospace' }}>
                Account Created Successfully
              </h2>
              
              <div className="bg-white/5 rounded-xl p-6 flex flex-col gap-4 text-base">
                <div className="flex flex-col gap-2">
                  <span className="text-white/70 text-sm font-medium">Account Holder</span>
                  <span className="text-white text-lg font-semibold">{createdAccount.accountHolder}</span>
                </div>
                
                <div className="flex flex-col gap-2">
                  <span className="text-white/70 text-sm font-medium">Account Number</span>
                  <span className="text-white text-lg font-mono tracking-wider">{createdAccount.accountNumber}</span>
                </div>
                
                <div className="flex flex-col gap-2">
                  <span className="text-white/70 text-sm font-medium">Current Balance</span>
                  <span className="text-[#EFC94C] text-xl font-bold">₹{createdAccount.balance.toLocaleString()}</span>
                </div>
                
                <div className="flex flex-col gap-2">
                  <span className="text-white/70 text-sm font-medium">Created On</span>
                  <span className="text-white">{new Date(createdAccount.openingDate).toLocaleDateString('en-GB')}</span>
                </div>
              </div>
              
              <button
                onClick={handleNextFromDetails}
                className="bg-[#EFC94C] text-black font-bold tracking-wide py-4 px-6 rounded-lg mt-4 hover:bg-[#EFC94C]/90 transition-colors"
              >
                Continue
              </button>
            </>
          )}

          {step === 'SUCCESS' && (
            <div className="text-center py-12 flex flex-col gap-6">
              <h2 className="text-2xl font-bold tracking-wide text-[#EFC94C]" style={{ fontFamily: 'VCR OSD Mono, monospace' }}>
                Welcome to Dhaniverse Bank!
              </h2>
              <p className="text-lg leading-relaxed text-white/90 px-4">
                Your account is now active and ready to use. All details have been saved to your profile.
              </p>
              <button
                onClick={handleConfirmSuccess}
                className="bg-[#EFC94C] text-black font-bold tracking-wide py-4 px-8 rounded-lg hover:bg-[#EFC94C]/90 transition-colors mx-auto"
              >
                FINISH
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Mount logic invoked from main.ts
export function initializeBankAccountCreationFlow() {
  const id = 'bank-account-creation-flow-root';
  if (document.getElementById(id)) return; // already mounted
  const el = document.createElement('div');
  el.id = id;
  document.body.appendChild(el);
  const root = createRoot(el);
  root.render(<BankAccountCreationFlow />);
}

export default BankAccountCreationFlow;
