import React, { useState } from 'react';
import StockDetail from './StockDetail.tsx';
import StockGraph from './StockGraph.tsx';
import NewsPopup from './NewsPopup.tsx';
import HelpPanel from './HelpPanel.tsx';

interface Stock {
  id: string;
  name: string;
  currentPrice: number;
  priceHistory: number[];
  debtEquityRatio: number;
  businessGrowth: number;
  news: string[];
}

interface StockMarketDashboardProps {
  onClose: () => void;
  playerRupees: number;
  stocks: Stock[];
}

const StockMarketDashboard: React.FC<StockMarketDashboardProps> = ({
  onClose,
  playerRupees,
  stocks
}) => {
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [showGraph, setShowGraph] = useState(false);
  const [showNews, setShowNews] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Handle showing stock graph
  const handleShowGraph = (stock: Stock) => {
    setSelectedStock(stock);
    setShowGraph(true);
    setShowNews(false);
  };

  // Handle showing news for a stock
  const handleShowNews = (stock: Stock) => {
    setSelectedStock(stock);
    setShowNews(true);
    setShowGraph(false);
  };

  // Toggle help panel
  const toggleHelp = () => {
    setShowHelp(!showHelp);
    // Close other popups when help is opened
    if (!showHelp) {
      setShowGraph(false);
      setShowNews(false);
    }
  };

  // Close all popups
  const closeAllPopups = () => {
    setShowGraph(false);
    setShowNews(false);
    setShowHelp(false);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      {/* Semi-transparent overlay */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
      
      {/* Stock Market UI */}
      <div className="relative w-4/5 max-w-5xl max-h-[90vh] bg-gray-900 text-white rounded-lg shadow-xl border border-blue-600 overflow-auto">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-blue-800 to-blue-600 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Dhaniverse Stock Exchange</h1>
          
          {/* Player's rupees */}
          <div className="flex items-center space-x-4">
            <div className="bg-gray-800 rounded-full px-4 py-2 text-yellow-300 font-medium">
              Your Rupees: ₹{playerRupees.toLocaleString()}
            </div>
            <button
              onClick={toggleHelp}
              className="bg-blue-700 hover:bg-blue-800 text-white p-2 rounded-full"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="p-6">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-blue-400">Market Overview</h2>
              <div className="text-sm text-gray-400">
                Last updated: {new Date().toLocaleString()}
              </div>
            </div>
            
            {/* Stock listings */}
            <div className="overflow-x-auto">
              <table className="w-full bg-gray-800 rounded-lg">
                <thead>
                  <tr className="bg-gray-700 text-left">
                    <th className="p-4 rounded-tl-lg">Company Name</th>
                    <th className="p-4">Current Price</th>
                    <th className="p-4">Debt-Equity</th>
                    <th className="p-4">Business Growth</th>
                    <th className="p-4 rounded-tr-lg">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {stocks.map((stock) => (
                    <StockDetail
                      key={stock.id}
                      stock={stock}
                      onShowGraph={() => handleShowGraph(stock)}
                      onShowNews={() => handleShowNews(stock)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="border-t border-gray-700 p-4 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-red-700 hover:bg-red-800 text-white rounded-md transition-colors duration-200"
          >
            Exit Stock Market
          </button>
        </div>
      </div>
      
      {/* Popups */}
      {showGraph && selectedStock && (
        <StockGraph
          stock={selectedStock}
          onClose={() => setShowGraph(false)}
        />
      )}
      
      {showNews && selectedStock && (
        <NewsPopup
          stock={selectedStock}
          onClose={() => setShowNews(false)}
        />
      )}
      
      {showHelp && (
        <HelpPanel onClose={() => setShowHelp(false)} />
      )}
    </div>
  );
};

export default StockMarketDashboard;