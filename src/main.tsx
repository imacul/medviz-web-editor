import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { Analytics } from '@vercel/analytics/react';

import App from './App';
import { AuthProvider } from './features/auth/AuthProvider';
import './styles/tailwind.css';

createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <App />
        <Analytics />
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);
