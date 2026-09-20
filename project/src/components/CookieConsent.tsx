import React, { useState, useEffect } from 'react';
import { Cookie, X } from 'lucide-react';

interface CookieConsentProps {
  onOpenPrivacy: () => void;
}

export const CookieConsent: React.FC<CookieConsentProps> = ({ onOpenPrivacy }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('producthub_cookie_consent');
    if (!consent) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  function handleAccept() {
    localStorage.setItem('producthub_cookie_consent', 'accepted');
    setVisible(false);
  }

  function handleNecessary() {
    localStorage.setItem('producthub_cookie_consent', 'essential_only');
    setVisible(false);
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 sm:left-auto sm:right-6 sm:max-w-md">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-md">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Cookie className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h4 className="text-xs font-semibold text-white">Privacy & Storage Notice</h4>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
              We use local storage and essential session tokens to preserve your login gate status and offline workspace state.{' '}
              <button
                onClick={onOpenPrivacy}
                className="text-cyan-400 hover:text-cyan-300 underline"
              >
                Learn more
              </button>
            </p>
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={handleAccept}
                className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-500 transition-colors"
              >
                Accept All
              </button>
              <button
                onClick={handleNecessary}
                className="rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 transition-colors"
              >
                Essential Only
              </button>
            </div>
          </div>
          <button
            onClick={() => setVisible(false)}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
