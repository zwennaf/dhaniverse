import React, { useEffect, useRef } from 'react';

interface Stock {
  id: string;
  name: string;
  currentPrice: number;
  priceHistory: number[];
  debtEquityRatio: number;
  businessGrowth: number;
  news: string[];
}

interface StockGraphProps {
  stock: Stock;
  onClose: () => void;
}

const StockGraph: React.FC<StockGraphProps> = ({
  stock,
  onClose
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Get price history data
    const prices = [...stock.priceHistory];
    if (prices.length === 0) return;
    
    // Find min and max values
    const minPrice = Math.min(...prices) * 0.95;
    const maxPrice = Math.max(...prices) * 1.05;
    const priceRange = maxPrice - minPrice;
    
    // Graph dimensions
    const padding = 40;
    const graphWidth = canvas.width - padding * 2;
    const graphHeight = canvas.height - padding * 2;
    
    // Draw background
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw axes
    ctx.strokeStyle = '#6b7280';
    ctx.lineWidth = 1;
    ctx.beginPath();
    
    // X-axis
    ctx.moveTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    
    // Y-axis
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, canvas.height - padding);
    ctx.stroke();
    
    // Draw grid lines
    ctx.strokeStyle = '#374151';
    ctx.beginPath();
    
    // Horizontal grid lines (5 lines)
    for (let i = 1; i <= 5; i++) {
      const y = padding + (graphHeight * i / 5);
      ctx.moveTo(padding, y);
      ctx.lineTo(canvas.width - padding, y);
    }
    
    // Vertical grid lines (based on data points)
    const totalPoints = prices.length;
    for (let i = 1; i < totalPoints; i++) {
      const x = padding + (graphWidth * i / (totalPoints - 1));
      ctx.moveTo(x, padding);
      ctx.lineTo(x, canvas.height - padding);
    }
    ctx.stroke();
    
    // Draw price labels
    ctx.fillStyle = '#d1d5db';
    ctx.font = '12px Arial';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    
    // Y-axis labels
    for (let i = 0; i <= 5; i++) {
      const price = minPrice + (priceRange * i / 5);
      const y = canvas.height - padding - (graphHeight * i / 5);
      ctx.fillText(`₹${Math.round(price).toLocaleString()}`, padding - 10, y);
    }
    
    // X-axis labels (show only a few dates for readability)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    // Show dates at regular intervals
    const labelInterval = Math.max(1, Math.floor(totalPoints / 5));
    for (let i = 0; i < totalPoints; i += labelInterval) {
      const x = padding + (graphWidth * i / (totalPoints - 1));
      const daysAgo = totalPoints - i - 1;
      let label = daysAgo === 0 ? 'Today' : `${daysAgo}d ago`;
      ctx.fillText(label, x, canvas.height - padding + 10);
    }
    
    // Draw the price line
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    // Draw each data point
    prices.forEach((price, index) => {
      const x = padding + (graphWidth * index / (totalPoints - 1));
      const y = canvas.height - padding - ((price - minPrice) / priceRange * graphHeight);
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
    
    // Draw points at each data point
    prices.forEach((price, index) => {
      const x = padding + (graphWidth * index / (totalPoints - 1));
      const y = canvas.height - padding - ((price - minPrice) / priceRange * graphHeight);
      
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw point outline
      ctx.strokeStyle = '#1f2937';
      ctx.lineWidth = 1;
      ctx.stroke();
    });
    
    // Add price change percentage label
    const firstPrice = prices[0];
    const lastPrice = prices[prices.length - 1];
    const changePercent = ((lastPrice - firstPrice) / firstPrice) * 100;
    
    ctx.font = '14px Arial';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    
    if (changePercent >= 0) {
      ctx.fillStyle = '#10b981'; // Green for positive change
      ctx.fillText(`+${changePercent.toFixed(2)}%`, canvas.width - padding, padding);
    } else {
      ctx.fillStyle = '#ef4444'; // Red for negative change
      ctx.fillText(`${changePercent.toFixed(2)}%`, canvas.width - padding, padding);
    }
  }, [stock]);

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[60]">
      <div className="absolute inset-0 bg-black/50" onClick={onClose}></div>
      <div className="relative bg-gray-900 p-6 rounded-lg shadow-xl border border-blue-500 max-w-3xl w-full">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <h3 className="text-xl font-semibold text-blue-400 mb-4">
          {stock.name} - Price History
        </h3>
        
        <div className="bg-gray-800 p-4 rounded-lg mb-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <div className="text-gray-400">Current Price</div>
              <div className="text-2xl font-bold text-blue-300">₹{stock.currentPrice.toLocaleString()}</div>
            </div>
            <div className="text-right">
              <div className="text-gray-400">Debt-Equity Ratio</div>
              <div className="text-lg font-medium text-blue-300">{stock.debtEquityRatio.toFixed(1)}</div>
            </div>
          </div>
          
          <div className="bg-gray-900 rounded-md p-3 mb-4">
            <canvas 
              ref={canvasRef} 
              width={600} 
              height={300}
              className="w-full h-auto"
            ></canvas>
          </div>
          
          <div className="text-sm text-gray-400">
            <p>This chart shows the stock price movement over the last {stock.priceHistory.length} days.</p>
            <p>Past performance is not indicative of future results. Market prices can fluctuate significantly.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockGraph;