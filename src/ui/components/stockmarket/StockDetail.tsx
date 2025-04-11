import React from 'react';

interface Stock {
  id: string;
  name: string;
  currentPrice: number;
  priceHistory: number[];
  debtEquityRatio: number;
  businessGrowth: number;
  news: string[];
}

interface StockDetailProps {
  stock: Stock;
  onShowGraph: () => void;
  onShowNews: () => void;
}

const StockDetail: React.FC<StockDetailProps> = ({
  stock,
  onShowGraph,
  onShowNews
}) => {
  // Determine if business growth is positive, negative or neutral
  const getGrowthColor = (growth: number) => {
    if (growth > 0) return 'text-green-400';
    if (growth < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  // Get proper symbol for growth
  const getGrowthSymbol = (growth: number) => {
    if (growth > 0) return '↑';
    if (growth < 0) return '↓';
    return '→';
  };

  return (
    <tr className="border-t border-gray-700">
      <td className="p-4 font-medium text-blue-300">
        {stock.name}
      </td>
      <td className="p-4">
        ₹{stock.currentPrice.toLocaleString()}
      </td>
      <td className="p-4">
        {stock.debtEquityRatio.toFixed(1)}
      </td>
      <td className={`p-4 ${getGrowthColor(stock.businessGrowth)}`}>
        {getGrowthSymbol(stock.businessGrowth)} {Math.abs(stock.businessGrowth)}%
      </td>
      <td className="p-4 space-x-2">
        <button
          onClick={onShowGraph}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-md text-sm"
          title="View Stock Price History"
        >
          <span className="flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
            Graph
          </span>
        </button>
        <button
          onClick={onShowNews}
          className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 rounded-md text-sm"
          title="View Latest News"
        >
          <span className="flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
            News
          </span>
        </button>
      </td>
    </tr>
  );
};

export default StockDetail;