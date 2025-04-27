import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMarketplaceProjects } from '../services/api';
import apiClient from '../services/api';
import { useStripe } from '@stripe/react-stripe-js';

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

    return (
        <div>
            <h2>Side Project Marketplace</h2>
            <p>Browse side projects listed for sale by builders.</p>

            {loading && <p>Loading marketplace...</p>}
            {error && <p className="error-message">Error: {error}</p>}
            {checkoutError && <p className="error-message">Payment Error: {checkoutError}</p>}

            {!loading && !error && (
                projects.length === 0 ? (
                    <p>No projects currently listed for sale.</p>
                ) : (
                    <ul>
                        {projects.map((project) => (
                            <li key={project.project_id}>
                                <strong>{project.name}</strong> - ${parseFloat(project.sale_price).toFixed(2)}
                                <p><em>by {project.owner_username}</em></p>
                                <p>{project.description || 'No description'}</p>
                                <span>Status: {project.stage || 'N/A'}</span> 
                                {project.domain && 
                                    <span> | Domain: <a href={`http://${project.domain}`} target="_blank" rel="noopener noreferrer">{project.domain}</a></span>
                                }
                                <button 
                                    onClick={() => handlePurchase(project.project_id)}
                                    disabled={!stripe || processingPaymentId === project.project_id}
                                    style={{ marginLeft: '10px', marginTop: '10px'}}
                                > 
                                    {processingPaymentId === project.project_id ? 'Processing...' : 'Buy Now'}
                                </button>
                                <p><small>Last Updated: {new Date(project.updated_at).toLocaleString()}</small></p>
                            </li>
                        ))}
                    </ul>
                )
            )}
        </div>
    );
}

export default MarketplacePage; 