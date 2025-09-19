import React, { useEffect, useState } from 'react';
import type { Achievement } from './CanisterTypes';

const AchievementsPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const { stockCanisterClient } = await import('../../../services/stockCanister');
        // Try to use canister service via a safe wrapper or fallback to API
        await stockCanisterClient.ensureInitialized();
        // There's no dedicated get_achievements on the wrapper; try direct canisterService as fallback
        try {
          const { canisterService } = await import('../../../services/CanisterService');
          const res = await (canisterService as any).get_achievements?.(window.location?.hostname || '');
          if (res) setAchievements(res);
        } catch (e) {
          console.warn('Failed to fetch achievements from canister:', e);
        }
      } catch (e) {
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
        <h3 className="text-lg font-semibold text-white">Achievements</h3>
        <button onClick={onClose} className="text-gray-400">Close</button>
      </div>
      {loading && <div className="text-gray-400">Loading achievements…</div>}
      {error && <div className="text-red-400">{error}</div>}
      {!loading && !error && (
        <div className="space-y-3">
          {achievements.length === 0 && <div className="text-gray-400">No achievements found.</div>}
          {achievements.map(a => (
            <div key={a.id} className="bg-gray-800 p-3 rounded">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-medium">{a.title}</div>
                  <div className="text-sm text-gray-400">{a.description}</div>
                </div>
                <div className="text-sm text-yellow-400">{a.unlocked ? 'Unlocked' : 'Locked'}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AchievementsPanel;
