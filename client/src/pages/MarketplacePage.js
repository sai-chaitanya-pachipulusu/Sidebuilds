import React, { useState, useEffect } from 'react';
import { getMarketplaceProjects } from '../services/api';
import apiClient from '../services/api';
import { useStripe } from '@stripe/react-stripe-js';
import ProjectTable from '../components/ProjectTable';
import './MarketplacePage.css';

// Icons
const PriceIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 1V23" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M17 5H9.5C8.57174 5 7.6815 5.36875 7.02513 6.02513C6.36875 6.6815 6 7.57174 6 8.5C6 9.42826 6.36875 10.3185 7.02513 10.9749C7.6815 11.6313 8.57174 12 9.5 12H14.5C15.4283 12 16.3185 12.3687 16.9749 13.0251C17.6313 13.6815 18 14.5717 18 15.5C18 16.4283 17.6313 17.3185 16.9749 17.9749C16.3185 18.6313 15.4283 19 14.5 19H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const StatusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const DomainIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 12H22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 2C14.5013 4.73835 15.9228 8.29203 16 12C15.9228 15.708 14.5013 19.2616 12 22C9.49872 19.2616 8.07725 15.708 8 12C8.07725 8.29203 9.49872 4.73835 12 2V2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

function MarketplacePage() {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const stripe = useStripe();
    const [checkoutError, setCheckoutError] = useState('');
    const [processingPaymentId, setProcessingPaymentId] = useState(null);

    useEffect(() => {
        const fetchMarketplaceProjects = async () => {
            try {
                setError('');
                setLoading(true);
                const marketplaceProjects = await getMarketplaceProjects();
                setProjects(marketplaceProjects);
            } catch (err) {
                console.error("Failed to fetch marketplace projects:", err);
                setError(err.message || 'Failed to load marketplace projects.');
            } finally {
                setLoading(false);
            }
        };

        fetchMarketplaceProjects();
    }, []);

    const handlePurchase = async (projectId) => {
        if (!stripe) {
            console.error('Stripe.js has not yet loaded.');
            setCheckoutError('Payment system is not ready. Please try again in a moment.');
            return;
        }

        setProcessingPaymentId(projectId);
        setCheckoutError('');

        try {
            const response = await apiClient.post('/payments/create-checkout-session', { projectId });
            const session = response.data;

            const result = await stripe.redirectToCheckout({
                sessionId: session.id,
            });

            if (result.error) {
                console.error('Stripe redirect error:', result.error.message);
                setCheckoutError(result.error.message);
            }
        } catch (err) {
            console.error('Failed to initiate purchase:', err);
            setCheckoutError(err.message || 'Failed to start purchase process. Please try again.');
        } finally {
            setProcessingPaymentId(null);
        }
    };

    // Add Buy Now action buttons to the table
    const projectsWithActions = projects.map(project => {
        return {
            ...project,
            buy_action: (
                <button 
                    onClick={() => handlePurchase(project.project_id)}
                    disabled={!stripe || processingPaymentId === project.project_id}
                    className="buy-button"
                > 
                    {processingPaymentId === project.project_id ? 'Processing...' : 'Buy Now'}
                </button>
            )
        };
    });

    return (
        <div className="marketplace-page">
            <div className="marketplace-header">
                <div>
                    <div className="page-section-heading">MARKETPLACE</div>
                    <h2>Find Projects For Sale</h2>
                    <p className="subtitle">Browse side projects available for purchase. Each includes code, assets, and transfer assistance.</p>
                </div>
            </div>

            {checkoutError && <p className="error-message">Payment Error: {checkoutError}</p>}
            
            <div className="marketplace-table">
                <ProjectTable 
                    projects={projectsWithActions}
                    type="marketplace"
                    isLoading={loading}
                    error={error}
                />
            </div>
        </div>
    );
}

export default MarketplacePage; 