import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { QueryProvider } from './providers/QueryProvider';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryProvider>
      <BrowserRouter>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            className: 'border border-primary/20 bg-white text-xs font-semibold text-brand-ink shadow-panel',
            success: {
              iconTheme: {
                primary: '#0f417c',
                secondary: '#ffc428',
              },
            },
            error: {
              iconTheme: {
                primary: '#b91c1c',
                secondary: '#fee2e2',
              },
            },
          }}
        />
      </BrowserRouter>
    </QueryProvider>
  </React.StrictMode>
);
