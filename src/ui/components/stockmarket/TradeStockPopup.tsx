/**
 * TradeStockPopup - Refactored to use StockTransactionService
 * 
 * This component handles buying and selling stocks with:
 * - Real-time price updates
 * - Transaction validation
 * - Loading states
 * - Error handling
 * - Fee calculation display
 */

import React, { useState, useEffect } from 'react';
import { stockTransactionService } from '../../../services/StockTransactionService';
import { balanceManager } from '../../../services/BalanceManager';
import type { Stock } from '../../../types/stock.types';

interface StockHolding {
  symbol: string;
  quantity: number;
  averagePrice: number;
  totalCost: number;
}

interface TradeStockPopupProps {
  stock: Stock;
  onClose: () => void;
  onTransactionComplete?: () => void;
}

const TradeStockPopup: React.FC<TradeStockPopupProps> = ({
  stock,
  onClose,
  onTransactionComplete
}) => {
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [quantity, setQuantity] = useState<number>(1);
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [isProcessing, setIsProcessing] = useState(false);
  const [playerRupees, setPlayerRupees] = useState(0);
  const [holding, setHolding] = useState<StockHolding | null>(null);
  
  // Load balance and holding on mount
  useEffect(() => {
    const balance = balanceManager.getBalance();
    setPlayerRupees(balance.cash);
    
    const stockHolding = stockTransactionService.getHolding(stock.symbol);
    if (stockHolding) {
      setHolding({
        symbol: stockHolding.symbol,
        quantity: stockHolding.quantity,
        averagePrice: stockHolding.averagePrice,
        totalCost: stockHolding.totalCost,
      });
    }
    
    // Subscribe to balance changes
    const unsubscribe = balanceManager.onBalanceChange((newBalance) => {
      setPlayerRupees(newBalance.cash);
    });
    
    return () => {
      unsubscribe();
    };
  }, [stock.symbol]);
  
  const sharesOwned = holding?.quantity || 0;
  const averagePrice = holding?.averagePrice || 0;
  
  // Calculate transaction fee (0.1% with min ₹1)
  const transactionFee = Math.max(stock.currentPrice * quantity * 0.001, 1);
  
  // Calculate total cost/value for the transaction
  const totalAmount = stock.currentPrice * quantity;
  const totalWithFee = tradeType === 'buy' 
    ? totalAmount + transactionFee 
    : totalAmount - transactionFee;
  
  // Calculate profit/loss for selling
  const potentialProfit = tradeType === 'sell' && holding 
    ? (stock.currentPrice - averagePrice) * quantity
    : 0;
  
  // Calculate profit/loss percentage
  const profitPercentage = averagePrice > 0
    ? ((stock.currentPrice - averagePrice) / averagePrice) * 100
    : 0;
  
  // Check if player can afford to buy the selected quantity
  const canAfford = playerRupees >= totalWithFee;
  
  // Check if player owns enough shares to sell
  const canSell = sharesOwned >= quantity;

  // Handle quantity input change
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 1) {
      setQuantity(value);
      setMessage(''); // Clear any previous messages
    }
  };
  
  // Handle quick quantity selection
  const handleQuickQuantitySelect = (amount: number) => {
    if (amount > 0) {
      setQuantity(amount);
      setMessage('');
    }
  };
  
  // Generate quick quantity options based on affordability and shares owned
  const getQuantityOptions = () => {
    if (tradeType === 'buy') {
      const maxAffordable = Math.floor(playerRupees / stock.currentPrice);
      const options = [1, 5, 10, 25, 50, 100];
      return options.filter(opt => opt <= maxAffordable).slice(0, 6);
    } else {
      const options = [1, 5, 10, 25, 50, sharesOwned];
      return [...new Set(options)].filter(opt => opt > 0 && opt <= sharesOwned).slice(0, 6);
    }
  };

  // Execute the trade
  const handleTrade = async () => {
    if (quantity <= 0) {
      setMessage("Please enter a valid quantity.");
      setMessageType('error');
      return;
    }
    
    setIsProcessing(true);
    setMessage('');
    
    try {
      let result;
      
      if (tradeType === 'buy') {
        if (!canAfford) {
          setMessage(`You don't have enough rupees. Need ₹${totalWithFee.toLocaleString()}, have ₹${playerRupees.toLocaleString()}`);
          setMessageType('error');
          setIsProcessing(false);
          return;
        }
        
        result = await stockTransactionService.buyStock(stock.symbol, quantity);
      } else {
        if (!canSell) {
          setMessage(`You only have ${sharesOwned} shares to sell.`);
          setMessageType('error');
          setIsProcessing(false);
          return;
        }
        
        result = await stockTransactionService.sellStock(stock.symbol, quantity);
      }
      
      if (result.success) {
        setMessage(result.message || `Successfully ${tradeType === 'buy' ? 'purchased' : 'sold'} ${quantity} shares!`);
        setMessageType('success');
        
        // Update local holding
        const updatedHolding = stockTransactionService.getHolding(stock.symbol);
        if (updatedHolding) {
          setHolding({
            symbol: updatedHolding.symbol,
            quantity: updatedHolding.quantity,
            averagePrice: updatedHolding.averagePrice,
            totalCost: updatedHolding.totalCost,
          });
        } else {
          setHolding(null);
        }
        
        // Reset quantity after successful trade
        setQuantity(1);
        
        // Notify parent component
        if (onTransactionComplete) {
          onTransactionComplete();
        }
        
        // Auto-close after 2 seconds on success
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setMessage(result.error?.message || 'Transaction failed');
        setMessageType('error');
      }
    } catch (error) {
      console.error('Trade error:', error);
      setMessage("Network error occurred. Please try again.");
      setMessageType('error');
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <div className="fixed inset-0 flex items-center justify-center z-[60]">
      <div className="absolute inset-0 bg-black/50" onClick={onClose}></div>
      <div className="relative bg-gray-900 p-6 rounded-lg shadow-xl border border-blue-500 max-w-md w-full">
        {/* Close button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
          disabled={isProcessing}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <h3 className="text-xl font-semibold text-blue-400 mb-4 pr-6">
          Trade {stock.name} ({stock.symbol})
        </h3>
        
        {/* Stock info summary */}
        <div className="bg-gray-800 p-4 rounded-md mb-5">
          <div className="flex justify-between">
            <div>
              <div className="text-gray-400 text-sm">Current Price</div>
              <div className="text-xl font-bold text-blue-300">
                ₹{stock.currentPrice.toLocaleString()}
              </div>
              {stock.changePercent !== undefined && (
                <div className={`text-sm ${stock.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-gray-400 text-sm">Shares Owned</div>
              <div className="text-xl font-medium text-blue-300">{sharesOwned}</div>
            </div>
          </div>
          
          {holding && holding.quantity > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-700">
              <div className="flex justify-between text-sm">
                <div className="text-gray-400">Average Price</div>
                <div className="font-medium text-blue-300">
                  ₹{averagePrice.toFixed(2)}
                </div>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <div className="text-gray-400">Current P/L</div>
                <div className={`font-medium ${profitPercentage >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {profitPercentage >= 0 ? '+' : ''}{profitPercentage.toFixed(2)}%
                </div>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <div className="text-gray-400">Investment Value</div>
                <div className="font-medium text-blue-300">
                  ₹{holding.totalCost.toLocaleString()}
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Trade type selector */}
        <div className="flex space-x-2 mb-4">
          <button
            onClick={() => {
              setTradeType('buy');
              setMessage('');
            }}
            className={`flex-1 py-2 rounded-md font-medium ${
              tradeType === 'buy'
                ? 'bg-green-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            disabled={isProcessing}
          >
            Buy
          </button>
          <button
            onClick={() => {
              setTradeType('sell');
              setMessage('');
            }}
            className={`flex-1 py-2 rounded-md font-medium ${
              tradeType === 'sell'
                ? 'bg-red-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            disabled={isProcessing || !holding || sharesOwned === 0}
          >
            Sell
          </button>
        </div>
        
        {/* Quantity input */}
        <div className="mb-4">
          <label className="block text-gray-300 mb-2">
            Quantity
          </label>
          <input
            type="number"
            min="1"
            max={tradeType === 'sell' ? sharesOwned : undefined}
            value={quantity}
            onChange={handleQuantityChange}
            className="w-full bg-gray-800 border border-gray-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isProcessing}
          />
        </div>
        
        {/* Quick quantity selection */}
        {getQuantityOptions().length > 0 && (
          <div className="mb-5">
            <div className="text-sm text-gray-300 mb-2">Quick Select</div>
            <div className="flex flex-wrap gap-2">
              {getQuantityOptions().map((amt, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickQuantitySelect(amt)}
                  className={`px-3 py-1 text-sm rounded-md ${
                    quantity === amt
                      ? tradeType === 'buy' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                  disabled={isProcessing}
                >
                  {amt}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Transaction summary */}
        <div className="bg-gray-800 p-4 rounded-md mb-5">
          <div className="flex justify-between mb-2">
            <div className="text-gray-400">Amount</div>
            <div className="font-medium text-blue-300">₹{totalAmount.toLocaleString()}</div>
          </div>
          <div className="flex justify-between mb-2">
            <div className="text-gray-400">Transaction Fee (0.1%)</div>
            <div className="font-medium text-gray-400">₹{transactionFee.toFixed(2)}</div>
          </div>
          <div className="flex justify-between border-t border-gray-700 pt-2">
            <div className="text-gray-300 font-medium">Total</div>
            <div className="text-xl font-bold text-blue-300">
              ₹{totalWithFee.toLocaleString()}
            </div>
          </div>
          
          {tradeType === 'buy' && (
            <div className="flex justify-between text-sm mt-2">
              <div className="text-gray-400">Remaining Balance</div>
              <div className={`font-medium ${canAfford ? 'text-green-400' : 'text-red-400'}`}>
                ₹{Math.max(0, playerRupees - totalWithFee).toLocaleString()}
              </div>
            </div>
          )}
          
          {tradeType === 'sell' && holding && (
            <div className="flex justify-between text-sm mt-2">
              <div className="text-gray-400">Estimated Profit/Loss</div>
              <div className={`font-medium ${potentialProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {potentialProfit >= 0 ? '+' : ''}₹{potentialProfit.toLocaleString()}
              </div>
            </div>
          )}
        </div>
        
        {/* Action button */}
        <button
          onClick={handleTrade}
          className={`w-full py-3 font-medium rounded-md ${
            isProcessing 
              ? 'bg-gray-600 cursor-wait'
              : tradeType === 'buy'
                ? canAfford ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 cursor-not-allowed'
                : canSell ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-600 cursor-not-allowed'
          } text-white`}
          disabled={isProcessing || (tradeType === 'buy' && !canAfford) || (tradeType === 'sell' && !canSell)}
        >
          {isProcessing 
            ? 'Processing...' 
            : tradeType === 'buy' 
              ? 'Buy Shares' 
              : 'Sell Shares'
          }
        </button>
        
        {/* Message */}
        {message && (
          <div className={`mt-4 p-3 rounded-md ${
            messageType === 'success' ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
          }`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
};

export default TradeStockPopup;
