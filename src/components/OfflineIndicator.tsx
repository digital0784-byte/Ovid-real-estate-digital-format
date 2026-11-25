import React, { useEffect, useState } from 'react';
import { RefreshCw, WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { offlineSyncService, SyncStats } from '../services/offlineSyncService';

export const OfflineIndicator: React.FC<{ isAmharic?: boolean }> = ({ isAmharic = false }) => {
  const isOnline = useOnlineStatus();
  const [stats, setStats] = useState<SyncStats>(() => offlineSyncService.getStats());

  useEffect(() => {
    const onSyncChange = (ev: Event) => {
      const customEv = ev as CustomEvent<SyncStats>;
      if (customEv?.detail) {
        setStats(customEv.detail);
      } else {
        setStats(offlineSyncService.getStats());
      }
    };
    window.addEventListener('offline_sync_status_changed', onSyncChange);
    return () => {
      window.removeEventListener('offline_sync_status_changed', onSyncChange);
    };
  }, []);

  if (isOnline && stats.pendingCount === 0 && !stats.isSyncing) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-7 left-4 z-50 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold shadow-lg border no-print ${
        !isOnline
          ? 'bg-amber-500 text-slate-950 border-amber-300'
          : 'bg-slate-900 text-white border-slate-700'
      }`}
    >
      {!isOnline ? (
        <>
          <WifiOff size={14} className="shrink-0" />
          <span>
            {isAmharic
              ? `ከመስመር ውጭ ሞድ — የተቀመጠ መረጃ በመጠቀም ላይ${stats.pendingCount > 0 ? ` (${stats.pendingCount} ለማመሳሰል የተያዙ)` : ''}`
              : `Offline Mode — Cached data active${stats.pendingCount > 0 ? ` (${stats.pendingCount} queued)` : ''}`}
          </span>
        </>
      ) : (
        <>
          <RefreshCw size={14} className={stats.isSyncing ? 'animate-spin text-emerald-400' : 'text-amber-400'} />
          <span>
            {isAmharic
              ? `${stats.pendingCount} መረጃዎች ወደ ደመና በማመሳሰል ላይ...`
              : `Syncing ${stats.pendingCount} offline record(s)...`}
          </span>
          {!stats.isSyncing && (
            <button
              type="button"
              onClick={() => offlineSyncService.processQueue().catch(() => {})}
              className="ml-1 rounded-md bg-emerald-600 hover:bg-emerald-500 px-2 py-0.5 text-[11px] font-bold text-white cursor-pointer"
            >
              {isAmharic ? 'አሁን ላክ' : 'Sync Now'}
            </button>
          )}
        </>
      )}
    </div>
  );
};
