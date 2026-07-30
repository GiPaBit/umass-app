import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { applyAppearance } from './lib/theme.js';
import './index.css';

// Apply the saved theme, palette and typeface before first paint so there is no flash.
applyAppearance();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Register the offline shell once the page has settled.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // A failed registration only costs offline support; the app still works.
    });
  });
}
