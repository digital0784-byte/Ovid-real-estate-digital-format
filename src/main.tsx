import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import './appCheck';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

import {registerSW} from 'virtual:pwa-register';

// Register PWA Service Worker for offline app-shell precaching in browsers and Android WebView
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  try {
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        updateSW(true).catch(() => {});
      },
      onOfflineReady() {
        console.info('[PWA] App shell cached and ready for offline use.');
      },
      onRegisterError(err) {
        console.warn('[PWA] Service Worker registration notice:', err);
      },
    });
  } catch (err) {
    console.warn('[PWA] Service Worker init skipped:', err);
  }
}

try {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
  (window as any).__ERP_MARK_APP_RENDERED__?.();
} catch (err) {
  console.error('Root Mount Error:', err);
}
