import React, { useState } from 'react';
import { StatusIndicator, StatusBadge, LoadingState, ProgressBar } from '../feedback/StatusIndicators';
import { AccessibleButton, AccessibleInput } from '../accessibility/AccessibleComponents';

interface FixedDeposit {
  id?: string;
  _id?: string;
  amount: number;
  interestRate: number;
  startDate: number;
  duration: number;
  maturityDate: number;
  matured: boolean;
  status?: 'active' | 'matured' | 'claimed';
}

interface FixedDepositPanelProps {
  bankBalance: number;
  fixedDeposits: FixedDeposit[];
  onCreateFD: (amount: number, duration: number) => Promise<boolean>;
  onClaimFD: (id: string) => Promise<boolean>;
}

const FixedDepositPanel: React.FC<FixedDepositPanelProps> = ({
  bankBalance,
  fixedDeposits,
  onCreateFD,
  onClaimFD
}) => {
  const [amount, setAmount] = useState('5000');
  const [duration, setDuration] = useState(90); // Days
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [isCreatingFD, setIsCreatingFD] = useState(false);
  const [claimingFDs, setClaimingFDs] = useState<Set<string>>(new Set());
  const [validationError, setValidationError] = useState('');
  
  // Predefined durations in days
  const durations = [
    { label: '3 Months (5.0%)', value: 90 },
    { label: '6 Months (6.5%)', value: 180 },
    { label: '1 Year (7.5%)', value: 365 },
    { label: '2 Years (8.5%)', value: 730 },
    { label: '3+ Years (9.5%)', value: 1095 }
  ];
  
  // Get the interest rate for the selected duration
  const getInterestRate = (durationDays: number) => {
    if (durationDays >= 1095) return 9.5;
    if (durationDays >= 730) return 8.5;
    if (durationDays >= 365) return 7.5;
    if (durationDays >= 180) return 6.5;
    return 5.0;
  };
  
  // Format a timestamp as a date string
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };
  
  // Calculate days remaining until maturity
  const getDaysRemaining = (maturityDate: number) => {
    const now = Date.now();
    const daysRemaining = Math.ceil((maturityDate - now) / (1000 * 60 * 60 * 24));
    return daysRemaining > 0 ? daysRemaining : 0;
  };
  
  // Calculate maturity amount
  const getMaturityAmount = (amount: number, rate: number, durationDays: number) => {
    const durationYears = durationDays / 365;
    const interest = amount * (rate / 100) * durationYears;
    return Math.round(amount + interest);
  };
  
  const handleAmountChange = (value: string) => {
    setAmount(value);
    setValidationError('');
    setMessage('');
    
    const numValue = parseInt(value);
    if (value && (isNaN(numValue) || numValue <= 0)) {
      setValidationError('Please enter a valid amount greater than 0');
    } else if (numValue < 1000) {
      setValidationError('Minimum deposit amount is ₹1,000');
    } else if (numValue > bankBalance) {
      setValidationError('Amount exceeds available bank balance');
    }
  };
  
  const handleDurationChange = (newDuration: number) => {
    setDuration(newDuration);
    setMessage('');
  };
  const handleCreateFD = async () => {
    const numAmount = parseInt(amount);
    
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setMessage('Please enter a valid amount');
      setMessageType('error');
      return;
    }
    
    if (validationError) {
      return;
    }
    
    setIsCreatingFD(true);
    setMessage('');
    
    try {
      const success = await onCreateFD(numAmount, duration);
      if (success) {
        setMessage(`Fixed deposit of ₹${numAmount.toLocaleString()} created successfully!`);
        setMessageType('success');
        setAmount('5000'); // Reset to default
      } else {
        setMessage('Failed to create fixed deposit. Please try again.');
        setMessageType('error');
      }
    } catch (error) {
      setMessage(`Failed to create fixed deposit: ${error}`);
      setMessageType('error');
    } finally {
      setIsCreatingFD(false);
    }
  };
  
  const handleClaimFD = async (id: string) => {
    const fdId = id || '';
    if (!fdId) return;
    
    const fd = fixedDeposits.find(d => (d.id || d._id) === fdId);
    if (!fd) return;
    
    setClaimingFDs(prev => new Set([...prev, fdId]));
    setMessage('');
    
    try {
      const success = await onClaimFD(fdId);
      if (success) {
        setMessage(`Successfully claimed fixed deposit with interest!`);
        setMessageType('success');
      } else {
        setMessage('Failed to claim fixed deposit. Please try again.');
        setMessageType('error');
      }
    } catch (error) {
      setMessage(`Failed to claim fixed deposit: ${error}`);
      setMessageType('error');
    } finally {
      setClaimingFDs(prev => {
        const newSet = new Set(prev);
        newSet.delete(fdId);
        return newSet;
      });
    }
  };
  
  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header with Status */}
      <div className="flex items-center justify-between">
        <h2 className="text-dhani-gold font-vcr font-bold text-xl tracking-wider flex items-center">
          <span className="mr-3">📈</span>
          FIXED DEPOSITS
        </h2>
        <StatusBadge 
          type={fixedDeposits.some(fd => fd.matured) ? 'success' : 'info'} 
          text={`${fixedDeposits.length} Active`} 
        />
      </div>
      
      {/* Create New FD Section */}
      <div className="bg-white/5 border-2 border-white/20 p-6 animate-slide-in-left" style={{ imageRendering: 'pixelated' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-dhani-gold font-vcr font-bold text-lg tracking-wider">
            CREATE NEW FIXED DEPOSIT
          </h3>
          <StatusIndicator type="info" size="md" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Amount Input */}
          <div>
            <AccessibleInput
              label="Deposit Amount"
              type="number"
              value={amount}
              onChange={handleAmountChange}
              placeholder="Minimum ₹1,000"
              required
              error={validationError}
              helpText={`Available: ₹${bankBalance.toLocaleString()}`}
            />
          </div>
          
          {/* Duration Selection */}
          <div className="space-y-2">
            <div className="text-white font-vcr font-bold text-sm tracking-wider">
              DURATION & INTEREST RATE
            </div>
            <div className="space-y-2">
              {durations.map(option => (
                <button
                  key={option.value}
                  onClick={() => handleDurationChange(option.value)}
                  className={`
                    w-full p-3 text-left border-2 font-vcr text-sm transition-all duration-200
                    ${duration === option.value 
                      ? 'bg-dhani-gold text-black border-dhani-gold animate-pixel-glow' 
                      : 'bg-transparent text-white border-white/20 hover:border-dhani-gold hover:text-dhani-gold'
                    }
                  `}
                  style={{ imageRendering: 'pixelated' }}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold tracking-wider">
                      {option.label.split('(')[0].trim().toUpperCase()}
                    </span>
                    <span className={duration === option.value ? 'text-black' : 'text-dhani-gold'}>
                      {option.label.match(/\((.*?)\)/)?.[1]}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Investment Summary */}
        {amount && !validationError && (
          <div className="mt-6 bg-dhani-gold/10 border-2 border-dhani-gold p-4 animate-bounce-in" style={{ imageRendering: 'pixelated' }}>
            <div className="text-dhani-gold font-vcr font-bold text-sm tracking-wider mb-3">
              INVESTMENT SUMMARY
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm font-vcr">
              <div>
                <div className="text-gray-400 tracking-wider">PRINCIPAL</div>
                <div className="text-white font-bold">₹{parseInt(amount).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-gray-400 tracking-wider">INTEREST RATE</div>
                <div className="text-dhani-gold font-bold">{getInterestRate(duration)}% P.A.</div>
              </div>
              <div>
                <div className="text-gray-400 tracking-wider">DURATION</div>
                <div className="text-white font-bold">{Math.round(duration / 30.44)} MONTHS</div>
              </div>
              <div>
                <div className="text-gray-400 tracking-wider">MATURITY DATE</div>
                <div className="text-white font-bold">{formatDate(Date.now() + duration * 24 * 60 * 60 * 1000)}</div>
              </div>
              <div>
                <div className="text-gray-400 tracking-wider">INTEREST EARNED</div>
                <div className="text-dhani-green font-bold">
                  ₹{(getMaturityAmount(parseInt(amount), getInterestRate(duration), duration) - parseInt(amount)).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-gray-400 tracking-wider">MATURITY AMOUNT</div>
                <div className="text-dhani-gold font-bold text-lg">
                  ₹{getMaturityAmount(parseInt(amount), getInterestRate(duration), duration).toLocaleString()}
                </div>
              </div>
            </div>
            
            {/* ROI Progress Bar */}
            <div className="mt-4">
              <ProgressBar
                progress={(getInterestRate(duration) / 10) * 100}
                label="Interest Rate"
                color="gold"
                showPercentage={false}
              />
            </div>
          </div>
        )}
        
        {/* Create FD Button */}
        <div className="mt-6">
          {isCreatingFD ? (
            <LoadingState message="Creating Fixed Deposit..." className="py-4" />
          ) : (
            <AccessibleButton
              onClick={handleCreateFD}
              variant="primary"
              size="lg"
              disabled={!!validationError || !amount || parseInt(amount) < 1000}
              ariaLabel={`Create fixed deposit of ₹${amount || '0'} for ${Math.round(duration / 30.44)} months`}
              className="w-full animate-pixel-glow"
            >
              <span className="mr-2">📈</span>
              CREATE FIXED DEPOSIT
              {amount && !validationError && (
                <span className="ml-2 text-black/70">
                  (₹{parseInt(amount).toLocaleString()})
                </span>
              )}
            </AccessibleButton>
          )}
        </div>
      </div>
      
      {/* Existing FDs Section */}
      <div className="space-y-4 animate-slide-in-right">
        <div className="flex items-center justify-between">
          <h3 className="text-dhani-gold font-vcr font-bold text-lg tracking-wider">
            YOUR FIXED DEPOSITS
          </h3>
          {fixedDeposits.length > 0 && (
            <div className="text-white font-vcr text-sm">
              Total Value: ₹{fixedDeposits.reduce((sum, fd) => 
                sum + getMaturityAmount(fd.amount, fd.interestRate, fd.duration), 0
              ).toLocaleString()}
            </div>
          )}
        </div>
        
        {fixedDeposits.length > 0 ? (
          <div className="space-y-4">
            {fixedDeposits.map(fd => {
              const fdId = fd.id || fd._id || '';
              const isClaimingThis = claimingFDs.has(fdId);
              const daysRemaining = getDaysRemaining(fd.maturityDate);
              const maturityAmount = getMaturityAmount(fd.amount, fd.interestRate, fd.duration);
              const progressPercentage = fd.matured ? 100 : Math.max(0, 100 - (daysRemaining / (fd.duration)) * 100);
              
              return (
                <div 
                  key={fdId} 
                  className={`
                    p-4 border-2 transition-all duration-300 hover:scale-105
                    ${fd.matured 
                      ? 'bg-dhani-green/20 border-dhani-green animate-pixel-glow' 
                      : 'bg-white/5 border-white/20 hover:border-dhani-gold'
                    }
                  `}
                  style={{ imageRendering: 'pixelated' }}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="text-dhani-gold font-vcr font-bold text-lg">
                        ₹{fd.amount.toLocaleString()}
                      </h4>
                      <div className="text-white font-vcr text-sm">
                        {fd.interestRate}% P.A. • {Math.round(fd.duration / 30.44)} MONTHS
                      </div>
                      <div className="text-gray-400 font-vcr text-xs mt-1">
                        CREATED: {formatDate(fd.startDate)}
                      </div>
                    </div>
                    
                    <StatusBadge
                      type={fd.matured ? 'success' : 'info'}
                      text={fd.matured ? 'Matured' : `${daysRemaining} Days Left`}
                      size="sm"
                    />
                  </div>
                  
                  {/* Progress Bar for Maturity */}
                  <div className="mb-4">
                    <ProgressBar
                      progress={progressPercentage}
                      label="Maturity Progress"
                      color={fd.matured ? 'green' : progressPercentage > 75 ? 'gold' : 'blue'}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm font-vcr mb-4">
                    <div>
                      <div className="text-gray-400 tracking-wider">MATURITY DATE</div>
                      <div className="text-white font-bold">{formatDate(fd.maturityDate)}</div>
                    </div>
                    <div>
                      <div className="text-gray-400 tracking-wider">INTEREST EARNED</div>
                      <div className="text-dhani-green font-bold">
                        ₹{(maturityAmount - fd.amount).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-400 tracking-wider">MATURITY AMOUNT</div>
                      <div className="text-dhani-gold font-bold text-lg">
                        ₹{maturityAmount.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-400 tracking-wider">STATUS</div>
                      <div className={`font-bold ${fd.matured ? 'text-dhani-green' : 'text-blue-400'}`}>
                        {fd.matured ? 'READY TO CLAIM' : 'ACTIVE'}
                      </div>
                    </div>
                  </div>
                  
                  {fd.matured && (
                    <div className="mt-4">
                      {isClaimingThis ? (
                        <LoadingState message="Claiming FD..." className="py-2" />
                      ) : (
                        <AccessibleButton
                          onClick={() => handleClaimFD(fdId)}
                          variant="primary"
                          size="md"
                          ariaLabel={`Claim fixed deposit of ₹${maturityAmount.toLocaleString()}`}
                          className="w-full animate-pixel-glow"
                        >
                          <span className="mr-2">💰</span>
                          CLAIM WITH INTEREST
                          <span className="ml-2 text-black/70">
                            (₹{maturityAmount.toLocaleString()})
                          </span>
                        </AccessibleButton>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white/5 border-2 border-white/20 p-8 text-center animate-fade-in-up" style={{ imageRendering: 'pixelated' }}>
            <div className="text-6xl mb-4">📈</div>
            <div className="text-white font-vcr font-bold text-lg tracking-wider mb-2">
              NO FIXED DEPOSITS YET
            </div>
            <div className="text-gray-400 font-vcr text-sm tracking-wider">
              CREATE YOUR FIRST FIXED DEPOSIT TO START EARNING GUARANTEED RETURNS
            </div>
          </div>
        )}
      </div>
      
      {/* Enhanced Message Display */}
      {message && (
        <div className={`
          p-4 border-2 font-vcr animate-bounce-in
          ${messageType === 'success' 
            ? 'bg-dhani-green/20 border-dhani-green text-dhani-green' 
            : 'bg-red-500/20 border-red-500 text-red-400'
          }
        `} style={{ imageRendering: 'pixelated' }}>
          <div className="flex items-center space-x-3">
            <StatusIndicator 
              type={messageType === 'success' ? 'success' : 'error'} 
              size="md" 
            />
            <div>
              <div className="font-bold tracking-wider text-sm">
                {messageType === 'success' ? 'FIXED DEPOSIT SUCCESS' : 'FIXED DEPOSIT ERROR'}
              </div>
              <div className="text-sm opacity-90">
                {message}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FixedDepositPanel;