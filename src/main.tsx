import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import { initSentry } from './lib/sentry';
import SentryErrorBoundary from './components/ErrorBoundary';

// Initialize Sentry before rendering the app
try {
  initSentry();
} catch (error) {
  console.warn('Sentry initialization failed:', error);
}

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

try {
  createRoot(rootElement).render(
    <StrictMode>
      <BrowserRouter>
        <SentryErrorBoundary>
          <App />
        </SentryErrorBoundary>
      </BrowserRouter>
    </StrictMode>
  );
} catch (error) {
  console.error('Failed to render app:', error);
  // Fallback rendering
  rootElement.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; height: 100vh; background: #0a0a0a; color: #7C9A92; font-family: Inter, sans-serif;">
      <div style="text-align: center;">
        <h1>StyleDrop</h1>
        <p>Loading application...</p>
        <p style="font-size: 12px; opacity: 0.7;">If this persists, please refresh the page</p>
      </div>
    </div>
  `;
}