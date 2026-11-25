import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ isAmharic?: boolean }> = ({ isAmharic = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="flex items-center gap-1.5 rounded-xl bg-red-600 px-2.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-red-700 transition cursor-pointer shrink-0"
        title={isAmharic ? 'መተግበሪያውን በስልክዎ ላይ ይጫኑ' : 'Install App for Offline Access'}
      >
        <Download size={14} />
        <span className="hidden sm:inline">{isAmharic ? 'አፕ ጫን' : 'Install App'}</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer shrink-0"
        >
          <Download size={13} />
          <span className="hidden sm:inline">{isAmharic ? 'በiPhone ጫን' : 'Install on iOS'}</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100">
              <h3 className="text-base font-bold text-white">
                {isAmharic ? 'በiPhone / iPad ላይ መጫኛ' : 'Install on iPhone / iPad'}
              </h3>
              <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                {isAmharic ? (
                  <>
                    1. በSafari ላይ <strong>Share</strong> ቁልፍን ይጫኑ።<br />
                    2. ወደ ታች አንሸራትተው <strong>Add to Home Screen</strong> ይምረጡ።
                  </>
                ) : (
                  <>
                    1. Tap the <strong>Share</strong> button in Safari toolbar.<br />
                    2. Scroll down and tap <strong>Add to Home Screen</strong>.
                  </>
                )}
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full rounded-xl bg-red-600 hover:bg-red-500 py-2 text-xs font-bold text-white cursor-pointer"
              >
                {isAmharic ? 'ዝጋ' : 'Close'}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
