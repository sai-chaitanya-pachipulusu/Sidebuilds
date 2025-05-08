import React from 'react';
import { useLocation, Link } from 'react-router-dom';
// import { getTransactionStatus } from '../services/api'; // Temporarily comment out API call
import './PurchaseSuccessPage.css';

// Success icon - Temporarily comment out definition as it's unused in simplified component
/*
const SuccessIcon = () => (
  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);
*/

function PurchaseSuccessPage() {
  // const [transaction, setTransaction] = useState(null);
  // const [loading, setLoading] = useState(true);
  // const [error, setError] = useState('');
  
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const sessionId = queryParams.get('session_id');

  // Temporarily disable useEffect hook
  /*
  useEffect(() => {
    console.log('[PurchaseSuccessPage] useEffect triggered.');
    const fetchTransactionDetails = async () => {
      if (!sessionId) {
        console.error('No session ID provided');
        return;
      }

      try {
        const transactionData = await getTransactionStatus(sessionId);
        // setTransaction(transactionData);
      } catch (err) {
        console.error('Error fetching transaction details:', err);
        // setError('Failed to load transaction details');
      }
    };
    fetchTransactionDetails();
  }, [sessionId]);
  */

  // Directly render a simple success message for testing
  console.log(`[PurchaseSuccessPage] Rendering basic success message for session: ${sessionId}`);
  return (
    <div className="purchase-success-page">
      <div className="success-container">
        {/* <SuccessIcon /> */}
        <h1>Purchase Page Reached!</h1>
        <p className="success-message">
          Successfully redirected after payment.
        </p>
        <p>Session ID: {sessionId || 'Not Found'}</p>
        
        <div className="action-buttons">
          <Link to="/dashboard" className="action-button">Go to Dashboard</Link>
          <Link to="/marketplace" className="action-button secondary">Return to Marketplace</Link>
        </div>
      </div>
    </div>
  );
}

export default PurchaseSuccessPage; 