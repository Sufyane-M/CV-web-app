import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { register as registerSW } from './utils/serviceWorker';

// No dev-only debug imports in production build

// Register Service Worker after first paint to avoid competing with initial load
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  requestIdleCallback?.(() => {
    registerSW({
      onSuccess: () => {},
      onUpdate: () => {
        // Mostra update UI lato app se necessario
      }
    });
  });
}

// Render the app
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);