import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { applyAppearance } from './lib/theme.js';
import './index.css';

// Apply the saved theme, palette and typeface before first paint so there is no flash.
applyAppearance();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

// Register the offline shell once the page has settled.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    const base = import.meta.env.BASE_URL; // "/" self-hosted, "/umass-app/" on GitHub Pages
    // updateViaCache:'none' because Pages serves everything with a ten-minute max-age and
    // gives no way to override it — without this the browser can keep handing back a stale
    // worker script for that long, pinning an old build.
    navigator.serviceWorker.register(`${base}sw.js`, { scope: base, updateViaCache: 'none' }).catch(() => {
      // A failed registration only costs offline support; the app still works.
    });
  });
}
