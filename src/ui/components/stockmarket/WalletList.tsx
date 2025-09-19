import React, { useEffect, useState } from 'react';
import type { WalletInfo } from './CanisterTypes';

const WalletList: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [wallets, setWallets] = useState<WalletInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const { canisterService } = await import('../../../services/CanisterService');
        if ((canisterService as any).get_available_wallets) {
          const res = await (canisterService as any).get_available_wallets();
          if (res) setWallets(res as WalletInfo[]);
        }
      } catch (e) {
        console.warn('WalletList: failed to fetch wallets', e);
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
        <h3 className="text-lg font-semibold text-white">Wallets</h3>
        <button onClick={onClose} className="text-gray-400">Close</button>
      </div>
      {loading && <div className="text-gray-400">Loading wallets…</div>}
      {error && <div className="text-red-400">{error}</div>}
      {!loading && !error && (
        <div className="space-y-3">
          {wallets.length === 0 && <div className="text-gray-400">No wallet integrations available.</div>}
          {wallets.map(w => (
            <div key={w.name} className="bg-gray-800 p-3 rounded flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={w.icon} alt={w.name} className="w-8 h-8 rounded" />
                <div>
                  <div className="text-white font-medium">{w.name}</div>
                  <div className="text-xs text-gray-400">{w.wallet_type}</div>
                </div>
              </div>
              <div className="text-sm text-gray-300">{w.installed ? 'Installed' : 'Not Installed'}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WalletList;
