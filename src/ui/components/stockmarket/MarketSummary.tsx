import React, { useEffect, useState } from 'react';
import type { PriceEntry } from './CanisterTypes';

const MarketSummary: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [summary, setSummary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const { canisterService } = await import('../../../services/CanisterService');
        if ((canisterService as any).get_market_summary) {
          const res = await (canisterService as any).get_market_summary();
          if (res && res.Ok) {
            if (mounted) setSummary(res.Ok as any[]);
          }
        }
      } catch (e) {
        console.warn('MarketSummary: failed to fetch market summary from canister', e);
        setError(String(e));
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="p-4 bg-gray-900/80 rounded">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Market Summary</h3>
        <button onClick={onClose} className="text-gray-400">Close</button>
      </div>
      {loading && <div className="text-gray-400">Loading market summary…</div>}
      {error && <div className="text-red-400">{error}</div>}
      {!loading && !error && (
        <div className="space-y-3">
          {summary.length === 0 && <div className="text-gray-400">No market summary available</div>}
          {summary.map((s, idx) => (
            <div key={idx} className="bg-gray-800 p-3 rounded">
              <div className="text-white font-medium">{s[0] || s.id} — ₹{(s[1]?.current_price || s[1]?.current_price || s.current_price || 0).toLocaleString()}</div>
              <div className="text-sm text-gray-400">{s[1]?.metrics?.market_cap ? `Market cap: ₹${(s[1].metrics.market_cap || 0).toLocaleString()}` : ''}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MarketSummary;
