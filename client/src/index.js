import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import './index.css';
import App from './App';

// Load Stripe outside of component render to avoid recreating on every render
// Ensure your publishable key is in client/.env as REACT_APP_STRIPE_PUBLISHABLE_KEY
const STRIPE_PUBLISHABLE_KEY = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || 'pk_test_51PKEjRSEygEn8yvgmYyp7mMlSKK9f5zVzZ2bEPYAZBXpdLTLWbLcPV2j5Hk3LoYCNPiJ6F3Z03WzTJNvMkXzFqHu00WIcSYcj5';
const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);

// Log Stripe configuration status
console.log('Stripe configuration status:', {
  publishableKeyAvailable: !!STRIPE_PUBLISHABLE_KEY,
  source: process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY ? 'environment' : 'fallback'
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Elements stripe={stripePromise}>
            <App />
          </Elements>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
