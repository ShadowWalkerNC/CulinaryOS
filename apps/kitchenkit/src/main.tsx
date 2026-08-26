import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: {
              background: '#27272a',
              color: '#f4f4f5',
              border: '1px solid #3f3f46',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
            },
            success: {
              iconTheme: { primary: '#22c55e', secondary: '#27272a' },
            },
            error: {
              iconTheme: { primary: '#f87171', secondary: '#27272a' },
              duration: 5000,
            },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
