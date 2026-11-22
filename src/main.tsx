import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import './appCheck';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

// Unregister Service Workers to guarantee clean loading and prevent stale cache blocking
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  }).catch((err) => {
    console.log('Service Worker cleanup:', err);
  });
}

try {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
} catch (err) {
  console.error('Root Mount Error:', err);
}
