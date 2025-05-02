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
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || 'YOUR_FALLBACK_PUBLISHABLE_KEY');

if (!process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY) {
    console.warn('Stripe Publishable Key not found in .env. Please set REACT_APP_STRIPE_PUBLISHABLE_KEY.');
}

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
