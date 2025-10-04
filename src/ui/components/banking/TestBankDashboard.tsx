import React, { useState, useRef, useEffect } from 'react';

/**
 * TestBankDashboard - UI ONLY VERSION
 * Matches reference images exactly with proper scroll behavior
 */

interface TestBankDashboardProps {
  onClose?: () => void;
}

const TestBankDashboard: React.FC<TestBankDashboardProps> = ({ onClose }) => {
  const [scrollY, setScrollY] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const transactionBoxRef = useRef<HTMLDivElement>(null);

  // Mock data
  const bankMockData = {
    userName: 'Jashanjot Singh',
    accountNumber: 'DIN-006909',
    transactions: [
      { id: 1, type: 'Received From', from: 'M.A.Y.A.', date: '12/02/2025', amount: 2000, isPositive: true },
      { id: 2, type: 'Paid To', from: 'M.A.Y.A.', date: '12/02/2025', amount: 2000, isPositive: false },
      { id: 3, type: 'Received From', from: 'M.A.Y.A.', date: '12/02/2025', amount: 2000, isPositive: null },
      { id: 4, type: 'Received From', from: 'M.A.Y.A.', date: '12/02/2025', amount: 2000, isPositive: null },
      { id: 5, type: 'Received From', from: 'M.A.Y.A.', date: '12/02/2025', amount: 2000, isPositive: null },
      { id: 6, type: 'Received From', from: 'M.A.Y.A.', date: '12/02/2025', amount: 2000, isPositive: null },
      { id: 7, type: 'Received From', from: 'M.A.Y.A.', date: '12/02/2025', amount: 2000, isPositive: null },
      { id: 8, type: 'Received From', from: 'M.A.Y.A.', date: '12/02/2025', amount: 2000, isPositive: null },
    ],
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      window.history.back();
    }
  };

  // Handle scroll
  useEffect(() => {
    const handleScroll = () => {
      if (scrollContainerRef.current) {
        setScrollY(scrollContainerRef.current.scrollTop);
      }
    };

    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);

  // Calculate transform for elements - scroll naturally for first 10px
  const scrollThreshold = 10;
  const contentTransform = Math.min(scrollY, scrollThreshold); // Content moves max 10px then stops

  return (
    <div className="fixed inset-0 overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: "url('/UI/game/bankbg.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 top-60 w-full bg-gradient-to-b from-transparent via-black/80 to-black" />

      {/* Main Content - Scrollable */}
      <div 
        ref={scrollContainerRef}
        className="relative h-full overflow-y-auto scrollbar-hide"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {/* Fixed Header - Always visible */}
        <div 
          className="sticky top-0 px-8 pt-6 pb-4 z-50 backdrop-blur-sm"
          style={{
            backgroundImage: "url('/UI/game/bankbg.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed'
          }}
        >
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-white font-pixeloid text-base">{bankMockData.userName}</h2>
              <p className="text-white/60 font-pixeloid text-xs">A/c no: {bankMockData.accountNumber}</p>
            </div>
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-red-900/80 hover:bg-red-900 text-white font-pixeloid text-sm rounded-md border border-red-700 transition-colors flex items-center gap-2"
            >
              <span className="text-xs">⎋</span> Exit
            </button>
          </div>
        </div>

        {/* Welcome Title - Fixed, doesn't move */}
        <div 
          className="sticky top-[80px] text-center py-10 z-40 overflow-hidden"
          style={{
            backgroundImage: "url('/UI/game/bankbg.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundAttachment: 'fixed'
          }}
        >
          <h1 className="text-white font-pixeloid text-3xl tracking-wide">
            Welcome To Dhaniverse Bank
          </h1>
        </div>

        {/* Main Action Buttons - Fixed, no transform */}
        <div className="sticky top-[200px] px-8 z-35 overflow-hidden">
          <div className="flex items-center justify-center gap-6 max-w-3xl mx-auto">
            <button 
              onClick={() => console.log('Deposit clicked')}
              className="flex-1 px-12 py-3 bg-[#f4d03f] hover:bg-[#f9e076] text-black font-pixeloid text-lg rounded-md border-4 border-black shadow-lg transition-all transform hover:scale-105"
            >
              DEPOSIT
            </button>
            <button 
              onClick={() => console.log('Withdraw clicked')}
              className="flex-1 px-12 py-3 bg-[#f4d03f] hover:bg-[#f9e076] text-black font-pixeloid text-lg rounded-md border-4 border-black shadow-lg transition-all transform hover:scale-105"
            >
              WITHDRAW
            </button>
          </div>
        </div>

        {/* Tab Navigation - Fixed, no transform */}
        <div className="sticky top-[280px] px-8 mb-6 z-35 py-4 overflow-hidden">
          <div className="flex items-center justify-center gap-4 max-w-4xl mx-auto">
            {/* Overview Tab */}
            <button 
              onClick={() => console.log('Overview clicked')}
              className="flex flex-col items-center gap-1 px-6 py-3 bg-[#3a3a3a] hover:bg-[#4a4a4a] rounded-lg border-2 border-white/30 transition-all min-w-[110px]"
            >
              <div className="text-2xl">📈</div>
              <span className="text-white font-pixeloid text-xs">Overview</span>
            </button>

            {/* Bank Tab */}
            <button 
              onClick={() => console.log('Bank clicked')}
              className="flex flex-col items-center gap-1 px-6 py-3 bg-[#3a3a3a] hover:bg-[#4a4a4a] rounded-lg border-2 border-white/30 transition-all min-w-[110px]"
            >
              <div className="text-2xl">🏛️</div>
              <span className="text-white font-pixeloid text-xs">Bank</span>
            </button>

            {/* Fixed Deposit Tab */}
            <button 
              onClick={() => console.log('Fixed Deposit clicked')}
              className="flex flex-col items-center gap-1 px-6 py-3 bg-[#3a3a3a] hover:bg-[#4a4a4a] rounded-lg border-2 border-white/30 transition-all min-w-[110px]"
            >
              <div className="text-2xl">📊</div>
              <span className="text-white font-pixeloid text-xs">Fixed Deposit</span>
            </button>

            {/* NFT Tab */}
            <button 
              onClick={() => console.log('NFT clicked')}
              className="flex flex-col items-center gap-1 px-6 py-3 bg-[#3a3a3a] hover:bg-[#4a4a4a] rounded-lg border-2 border-white/30 transition-all min-w-[110px]"
            >
              <div className="text-2xl">🎨</div>
              <span className="text-white font-pixeloid text-xs">NFT</span>
            </button>
          </div>
        </div>

        {/* Transaction Container - Scrolls over buttons */}
        <div className="px-8 pb-8 max-w-7xl mx-auto">
          <div 
            ref={transactionBoxRef}
            className="bg-black backdrop-blur-sm rounded-t-2xl border-t-2 border-x-2 border-white/10 relative z-30"
            style={{
              clipPath: 'inset(0px 0px 0px 0px round 16px 16px 0px 0px)'
            }}
          >
            {/* Transaction Header - Sticks to top of container */}
            <div className="sticky top-[180px] bg-black/95 backdrop-blur-sm px-6 pt-6 pb-4 border-b border-white/10 z-10 rounded-t-2xl">
              <div className="flex items-center justify-between mb-2">
                <h1 className="text-white font-pixeloid text-2xl">Recent Transaction</h1>
                <select className="px-3 py-1.5 bg-[#1a1a1a] text-white font-pixeloid text-xs rounded border border-white/20 cursor-pointer">
                  <option>All time</option>
                  <option>Today</option>
                  <option>This Week</option>
                  <option>This Month</option>
                </select>
              </div>
            </div>

            {/* Transaction List - Scrollable content */}
            <div 
              className="px-6 py-4"
              style={{
                clipPath: 'inset(0px 0px 0px 0px)'
              }}
            >
              <div className="space-y-3">
                {bankMockData.transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between py-3 border-b border-white/5 hover:bg-white/5 transition-colors px-3 rounded-2xl"
                  >
                    <div>
                      <p className="text-white/50 font-pixeloid text-[10px] mb-0.5">{transaction.type}</p>
                      <p className="text-white font-pixeloid text-sm">
                        {transaction.from} on {transaction.date}
                      </p>
                    </div>
                    <div
                      className={`font-pixeloid text-base ${
                        transaction.isPositive === true
                          ? 'text-green-400'
                          : transaction.isPositive === false
                          ? 'text-red-400'
                          : 'text-white'
                      }`}
                    >
                      {transaction.isPositive === true ? '+ ' : transaction.isPositive === false ? '- ' : ''}
                      {transaction.amount.toLocaleString()}
                    </div>
                  </div>
                ))}

                {/* End Message */}
                <div className="text-center py-16">
                  <p className="text-white/30 font-pixeloid text-base">No more transaction MF!</p>
                </div>
              </div>
            </div>

            {/* Check Balance Footer */}
            <div className="sticky bottom-0 bg-black backdrop-blur-sm border-t border-white/10 px-6 py-4 flex items-center justify-center gap-3">
              <span className="text-white font-pixeloid text-sm">Check Balance:</span>
              <button 
                onClick={() => console.log('View Balance clicked')}
                className="px-5 py-2 bg-[#c45a28] hover:bg-[#d46a38] text-white font-pixeloid text-sm rounded border-2 border-[#a04818] transition-colors"
              >
                View Balance
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestBankDashboard;
