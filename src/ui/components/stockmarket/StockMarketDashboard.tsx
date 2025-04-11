import React, { useState, useEffect } from 'react';
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
  marketCap: number;
  peRatio: number;
  eps: number;
  industryAvgPE: number;
  outstandingShares: number;
  volatility: number;
  lastUpdate: number;
}

interface StockMarketDashboardProps {
  onClose: () => void;
  playerRupees: number;
  stocks: Stock[];
}

// Sort types for column headers
type SortField = 'name' | 'price' | 'marketCap' | 'peRatio' | 'debtEquity' | 'eps' | 'growth';
type SortDirection = 'asc' | 'desc';

// Filter options
type FilterOption = 'all' | 'undervalued' | 'highGrowth' | 'lowRisk' | 'highRisk';

const StockMarketDashboard: React.FC<StockMarketDashboardProps> = ({
  onClose,
  playerRupees,
  stocks
}) => {
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [showGraph, setShowGraph] = useState(false);
  const [showNews, setShowNews] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filterOption, setFilterOption] = useState<FilterOption>('all');
  const [filteredStocks, setFilteredStocks] = useState<Stock[]>(stocks);

  // Apply sorting and filtering whenever related states change
  useEffect(() => {
    let result = [...stocks];
    
    // Apply filters
    if (filterOption !== 'all') {
      result = result.filter(stock => {
        switch(filterOption) {
          case 'undervalued':
            return stock.peRatio < stock.industryAvgPE && stock.eps > 30;
          case 'highGrowth':
            return stock.businessGrowth > 3;
          case 'lowRisk':
            return stock.debtEquityRatio < 0.8 && stock.marketCap > 1000000000;
          case 'highRisk':
            return stock.debtEquityRatio > 1.5 || stock.volatility > 2.5;
          default:
            return true;
        }
      });
    }
    
    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'price':
          comparison = a.currentPrice - b.currentPrice;
          break;
        case 'marketCap':
          comparison = a.marketCap - b.marketCap;
          break;
        case 'peRatio':
          comparison = a.peRatio - b.peRatio;
          break;
        case 'debtEquity':
          comparison = a.debtEquityRatio - b.debtEquityRatio;
          break;
        case 'eps':
          comparison = a.eps - b.eps;
          break;
        case 'growth':
          comparison = a.businessGrowth - b.businessGrowth;
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    setFilteredStocks(result);
  }, [stocks, sortField, sortDirection, filterOption]);

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
  
  // Handle sorting when column header is clicked
  const handleSort = (field: SortField) => {
    if (field === sortField) {
      // Toggle sort direction if same field is clicked
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  // Render sort indicator
  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) return null;
    
    return (
      <span className="ml-1">
        {sortDirection === 'asc' ? '↑' : '↓'}
      </span>
    );
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
              title="Show Help"
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
              
              {/* Filtering options */}
              <div className="flex items-center space-x-3">
                <label className="text-sm text-gray-400">Filter by:</label>
                <select 
                  className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm"
                  value={filterOption}
                  onChange={(e) => setFilterOption(e.target.value as FilterOption)}
                >
                  <option value="all">All Stocks</option>
                  <option value="undervalued">Undervalued Gems</option>
                  <option value="highGrowth">High Growth</option>
                  <option value="lowRisk">Low Risk</option>
                  <option value="highRisk">High Risk/Reward</option>
                </select>
                
                <span className="text-sm text-gray-400">
                  Last updated: {new Date().toLocaleString()}
                </span>
              </div>
            </div>
            
            {/* Stock listings */}
            <div className="overflow-x-auto">
              <table className="w-full bg-gray-800 rounded-lg">
                <thead>
                  <tr className="bg-gray-700 text-left text-sm">
                    <th className="p-4 rounded-tl-lg cursor-pointer hover:bg-gray-600" onClick={() => handleSort('name')}>
                      Company Name {renderSortIndicator('name')}
                    </th>
                    <th className="p-4 cursor-pointer hover:bg-gray-600" onClick={() => handleSort('price')}>
                      Current Price {renderSortIndicator('price')}
                    </th>
                    <th className="p-4 cursor-pointer hover:bg-gray-600" onClick={() => handleSort('marketCap')}>
                      Market Cap {renderSortIndicator('marketCap')}
                    </th>
                    <th className="p-4 cursor-pointer hover:bg-gray-600" onClick={() => handleSort('peRatio')}>
                      P/E Ratio {renderSortIndicator('peRatio')}
                    </th>
                    <th className="p-4 cursor-pointer hover:bg-gray-600" onClick={() => handleSort('debtEquity')}>
                      Debt/Equity {renderSortIndicator('debtEquity')}
                    </th>
                    <th className="p-4 cursor-pointer hover:bg-gray-600" onClick={() => handleSort('eps')}>
                      EPS {renderSortIndicator('eps')}
                    </th>
                    <th className="p-4 cursor-pointer hover:bg-gray-600" onClick={() => handleSort('growth')}>
                      Growth {renderSortIndicator('growth')}
                    </th>
                    <th className="p-4 rounded-tr-lg">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStocks.length > 0 ? (
                    filteredStocks.map((stock) => (
                      <StockDetail
                        key={stock.id}
                        stock={stock}
                        onShowGraph={() => handleShowGraph(stock)}
                        onShowNews={() => handleShowNews(stock)}
                      />
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="p-4 text-center text-gray-400">
                        No stocks match the selected filter.
                      </td>
                    </tr>
                  )}
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