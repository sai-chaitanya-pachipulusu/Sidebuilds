import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { getTransactionStatus } from '../services/api';
import './PurchaseSuccessPage.css';

// Success icon
const SuccessIcon = () => (
  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);

function PurchaseSuccessPage() {
  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const sessionId = queryParams.get('session_id');

  useEffect(() => {
    console.log('[PurchaseSuccessPage] useEffect triggered.');
    const fetchTransactionDetails = async () => {
      setLoading(true); // Ensure loading is true at start
      setError(''); // Clear previous errors
      setTransaction(null); // Clear previous transaction data

      if (!sessionId) {
        console.error('[PurchaseSuccessPage] No session ID found in URL.');
        setError('No session ID provided');
        setLoading(false);
        return;
      }

      console.log(`[PurchaseSuccessPage] Attempting to fetch status for session: ${sessionId}`);
      try {
        const transactionData = await getTransactionStatus(sessionId);
        console.log('[PurchaseSuccessPage] API Response received:', transactionData);

        if (!transactionData) {
            console.error('[PurchaseSuccessPage] API returned null or undefined data.');
            throw new Error('API returned no transaction data');
        }
        
        // Add check for transaction status specifically
        if (transactionData.status !== 'completed') {
             console.warn(`[PurchaseSuccessPage] Transaction status is ${transactionData.status}, expected 'completed'. Displaying info anyway.`);
             // Decide if you want to show an error or just display the pending/other status
             // setError(`Transaction status is ${transactionData.status}. Please wait or contact support.`);
        }
        
        console.log('[PurchaseSuccessPage] Setting transaction state.');
        setTransaction(transactionData);

      } catch (err) {
        console.error('[PurchaseSuccessPage] Error fetching transaction details:', err);
        setError(err.response?.data?.error || err.message || 'Failed to load transaction details');
      } finally {
        console.log('[PurchaseSuccessPage] Setting loading to false.');
        setLoading(false);
      }
    };

    fetchTransactionDetails();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="purchase-success-page">
        <div className="loading-spinner">Loading transaction details...</div>
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="purchase-success-page">
        <div className="error-container">
          <h2>Transaction Error</h2>
          <p>{error || 'Transaction details not found'}</p>
          <Link to="/marketplace" className="action-button">Return to Marketplace</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="purchase-success-page">
      <div className="success-container">
        <SuccessIcon />
        <h1>Purchase Successful!</h1>
        <p className="success-message">
          Thank you for your purchase. The project is now yours!
        </p>
        
        <div className="transaction-details">
          <h3>Transaction Details</h3>
          <div className="detail-row">
            <span className="detail-label">Project:</span>
            <span className="detail-value">{transaction.project_name}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Total Amount:</span>
            <span className="detail-value">${parseFloat(transaction.amount).toFixed(2)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Platform Fee:</span>
            <span className="detail-value">${parseFloat(transaction.commission_amount).toFixed(2)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Seller Receives:</span>
            <span className="detail-value">${parseFloat(transaction.seller_amount).toFixed(2)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Status:</span>
            <span className={`detail-value status-badge ${transaction.status?.toLowerCase()}`}>{transaction.status}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Seller:</span>
            <span className="detail-value">{transaction.seller_username}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Purchase Date:</span>
            <span className="detail-value">{new Date(transaction.created_at).toLocaleString()}</span>
          </div>
        </div>

        <div className="next-steps">
          <h3>Next Steps</h3>
          <p>The seller has been notified of your purchase and will receive {parseFloat(transaction.seller_amount).toFixed(2)} USD (minus any payment processor fees). They will contact you with further instructions for transferring project assets.</p>
          <p>As the marketplace facilitator, SideBuilds takes a small {((parseFloat(transaction.commission_amount) / parseFloat(transaction.amount)) * 100).toFixed(0)}% fee to maintain our platform.</p>
          <p>You can contact the seller directly at <strong>{transaction.seller_email}</strong> to expedite the transfer process.</p>
        </div>
        
        <div className="action-buttons">
          <Link to="/dashboard?purchased=true" className="action-button">Go to Dashboard</Link>
          <Link to="/marketplace" className="action-button secondary">Return to Marketplace</Link>
        </div>
      </div>
    </div>
  );
}

export default PurchaseSuccessPage; 