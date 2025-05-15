import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ChakraProvider } from '@chakra-ui/react';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext'; // Always provides dark mode
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import theme from './theme';
import './index.css';
import './black-override.css'; // Import black override CSS last to ensure it takes precedence
import App from './App';

// Load Stripe outside of component render to avoid recreating on every render
// Ensure your publishable key is in client/.env as REACT_APP_STRIPE_PUBLISHABLE_KEY
const STRIPE_PUBLISHABLE_KEY = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY;
let stripePromise = null; // Initialize to null

// Log the value of the Stripe key attempt
console.log("Attempting to load Stripe. REACT_APP_STRIPE_PUBLISHABLE_KEY:", STRIPE_PUBLISHABLE_KEY);

if (STRIPE_PUBLISHABLE_KEY) {
  try {
    stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
    console.log('Stripe initialized successfully.');
  } catch (error) {
    console.error('Error initializing Stripe:', error);
    // stripePromise remains null
  }
} else {
  console.error('ERROR: REACT_APP_STRIPE_PUBLISHABLE_KEY is not set or not found in the environment. Stripe payments will not be available. Please check your client/.env file and ensure the development server has been restarted.');
}

// Log Stripe configuration status
console.log('Stripe configuration status:', {
  publishableKeyAvailable: !!STRIPE_PUBLISHABLE_KEY,
  isStripePromiseSet: !!stripePromise,
  keyPrefix: STRIPE_PUBLISHABLE_KEY ? STRIPE_PUBLISHABLE_KEY.substring(0, 10) + "..." : "N/A" // Log a prefix for verification
});

// For development debugging - expose utils globally if not in production
if (process.env.NODE_ENV !== 'production') {
  // Import dynamic modules for debugging
  import('./utils/test-transfer.js')
    .then(module => {
      // Expose the debug functions to the window object
      window.debugUtils = {
        testProjectTransfer: module.testProjectTransfer,
        runDebugTransfer: module.runDebugTransfer
      };
      console.log('Debug utilities loaded. Available as window.debugUtils');
    })
    .catch(err => console.error('Failed to load debug utilities:', err));
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ChakraProvider theme={theme}>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <Elements stripe={stripePromise}>
              <App />
            </Elements>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ChakraProvider>
  </React.StrictMode>
);
