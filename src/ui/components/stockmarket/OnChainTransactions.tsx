import React, { useEffect, useState } from 'react';
import type { Web3Transaction } from './CanisterTypes';

const OnChainTransactions: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [txs, setTxs] = useState<Web3Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const { canisterService } = await import('../../../services/CanisterService');
        if ((canisterService as any).get_transaction_history) {
          // In absence of wallet address argument, pass a fallback (empty) or try current user
          const result = await (canisterService as any).get_transaction_history('');
          if (result) setTxs(result as Web3Transaction[]);
        }
      } catch (e) {
        console.warn('OnChainTransactions: failed to fetch', e);
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
        <h3 className="text-lg font-semibold text-white">On-Chain Transactions</h3>
        <button onClick={onClose} className="text-gray-400">Close</button>
      </div>
      {loading && <div className="text-gray-400">Loading transactions…</div>}
      {error && <div className="text-red-400">{error}</div>}
      {!loading && !error && (
        <div className="space-y-3">
          {txs.length === 0 && <div className="text-gray-400">No transactions found.</div>}
          {txs.map(tx => (
            <div key={tx.id} className="bg-gray-800 p-3 rounded">
              <div className="text-white">{tx.transaction_type} — ₹{tx.amount.toLocaleString()}</div>
              <div className="text-xs text-gray-400">{new Date(Number(tx.timestamp) || Date.now()).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OnChainTransactions;
