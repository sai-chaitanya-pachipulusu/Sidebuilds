import React, { useState, useEffect } from 'react';
import { getMarketplaceProjects } from '../services/api';
import apiClient from '../services/api';
import { useStripe } from '@stripe/react-stripe-js';
import { useAuth } from '../context/AuthContext'; // Import auth context to get current user
import ProjectTable from '../components/ProjectTable';
import TrustBadges from '../components/TrustBadges';
import { createAndRedirectToCheckout } from '../utils/stripe-helper';
import './MarketplacePage.css';

// Icons

function MarketplacePage() {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const stripe = useStripe();
    const [checkoutError, setCheckoutError] = useState('');
    const [processingPaymentId, setProcessingPaymentId] = useState(null);
    const { user } = useAuth(); // Get the current user

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

    // Pre-validate before even attempting to purchase
    const validatePurchase = (project) => {
        // Check if user is logged in
        if (!user) {
            return "Please log in to purchase projects";
        }
        
        // Check if user is trying to buy their own project
        if (project.owner_id === user.id) {
            return "You cannot purchase your own project";
        }
        
        // Check price is valid
        if (!project.sale_price || project.sale_price <= 0) {
            return "Project has an invalid price";
        }
        
        return null; // No validation error
    };

    const handlePurchase = async (projectId) => {
        // Find the project in the list
        const project = projects.find(p => p.project_id === projectId);
        if (!project) {
            setCheckoutError('Project not found');
            return;
        }
        
        // Check if this is a seeded project
        const isSeededProject = projectId.includes('aaaaaaaa') || 
                              projectId.includes('bbbbbbbb') || 
                              projectId.includes('cccccccc') || 
                              projectId.includes('dddddddd') || 
                              projectId.includes('eeeeeeee') || 
                              projectId.includes('ffffffff') || 
                              projectId.includes('99999999') || 
                              projectId.includes('88888888') || 
                              projectId.includes('77777777');
        
        // Run validation
        const validationError = validatePurchase(project);
        if (validationError) {
            setCheckoutError(validationError);
            return;
        }
        
        if (!stripe) {
            console.error('Stripe.js has not yet loaded.');
            setCheckoutError('Payment system is not ready. Please try again in a moment.');
            return;
        }

        setProcessingPaymentId(projectId);
        setCheckoutError('');

        try {
            console.log(`[CLIENT DEBUG] Initiating purchase for project ${projectId}`);
            console.log(`[CLIENT DEBUG] Project details:`, {
                name: project.name,
                price: project.sale_price,
                owner_id: project.owner_id,
                is_for_sale: project.is_for_sale,
                isSeeded: isSeededProject
            });
            
            // Use the stripe helper to create checkout and redirect
            await createAndRedirectToCheckout({
                projectId,
                isSeeded: isSeededProject,
                stripe,
                api: apiClient
            });
            
        } catch (err) {
            console.error('[CLIENT ERROR] Failed to initiate purchase:', err);
            
            // Extract error message from the response if available
            let errorMessage = 'Failed to start purchase process. Please try again.';
            if (err.response && err.response.data && err.response.data.error) {
                errorMessage = err.response.data.error;
            } else if (err.message) {
                errorMessage = err.message;
            }
            
            setCheckoutError(errorMessage);
        } finally {
            // Add a slight delay so the user sees the processing state
            setTimeout(() => {
                setProcessingPaymentId(null);
            }, 1000);
        }
    };

    // Add Buy Now action buttons to the table
    const projectsWithActions = projects.map(project => {
        const isOwnProject = user && project.owner_id === user.id;
        
        return {
            ...project,
            buy_action: (
                <button 
                    onClick={() => handlePurchase(project.project_id)}
                    disabled={!stripe || processingPaymentId === project.project_id || isOwnProject}
                    className={`buy-button ${isOwnProject ? 'disabled' : ''}`}
                    title={isOwnProject ? "You cannot purchase your own project" : ""}
                > 
                    {processingPaymentId === project.project_id ? 'Processing...' : 
                     isOwnProject ? 'Your Project' : 'Buy Now'}
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
            
            {/* Trust Badges Section */}
            <TrustBadges type="marketplace" />
            
            <div className="secure-purchase-info">
                <div className="secure-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </div>
                <p>All purchases are processed securely via Stripe with encrypted payment information. We never store your card details.</p>
            </div>
            
            <div className="marketplace-table">
                <h3>Available Projects</h3>
                <ProjectTable 
                    projects={projectsWithActions}
                    type="marketplace"
                    isLoading={loading}
                    error={error}
                />
            </div>
            
            <div className="purchase-process">
                <h3>How Purchasing Works</h3>
                <div className="process-steps">
                    <div className="step">
                        <div className="step-number">1</div>
                        <h4>Purchase Project</h4>
                        <p>Complete secure payment via our Stripe checkout process.</p>
                    </div>
                    <div className="step">
                        <div className="step-number">2</div>
                        <h4>Transfer Coordination</h4>
                        <p>We coordinate code, domain, and asset transfers within 24 hours.</p>
                    </div>
                    <div className="step">
                        <div className="step-number">3</div>
                        <h4>Verification Period</h4>
                        <p>7-day verification period to ensure everything works as advertised.</p>
                    </div>
                    <div className="step">
                        <div className="step-number">4</div>
                        <h4>Final Handover</h4>
                        <p>Full ownership transfer complete. Enjoy your new project!</p>
                    </div>
                </div>
            </div>
            
            <div className="faq-section">
                <h3>Frequently Asked Questions</h3>
                
                <div className="faq-item">
                    <h4>What happens after I purchase?</h4>
                    <p>After purchase, you'll receive a confirmation email with next steps. Our transfer team will contact you within 24 hours to begin the transfer process.</p>
                </div>
                
                <div className="faq-item">
                    <h4>How does the money-back guarantee work?</h4>
                    <p>If the project doesn't match the description or you encounter significant issues during the 7-day verification period, contact us for a full refund.</p>
                </div>
                
                <div className="faq-item">
                    <h4>Is technical support included?</h4>
                    <p>Basic setup assistance is included with every purchase. Additional technical support can be arranged with the original developer at their discretion.</p>
                </div>
                
                <div className="faq-item">
                    <h4>Can I transfer the domain name?</h4>
                    <p>Yes, domain transfer is included when applicable. We'll guide you through the transfer process to ensure a smooth transition.</p>
                </div>
            </div>
        </div>
    );
}

export default MarketplacePage; 