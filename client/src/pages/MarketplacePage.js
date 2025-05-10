import React, { useState, useEffect } from 'react';
import { getMarketplaceProjects } from '../services/api';
import apiClient from '../services/api';
import { useStripe } from '@stripe/react-stripe-js';
import { useAuth } from '../context/AuthContext'; // Import auth context to get current user
import ProjectTable from '../components/ProjectTable';
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
                <div className="action-buttons">
                    <button 
                        onClick={() => handlePurchase(project.project_id)}
                        disabled={!stripe || processingPaymentId === project.project_id || isOwnProject}
                        className={`buy-button ${isOwnProject ? 'disabled' : ''}`}
                        title={isOwnProject ? "You cannot purchase your own project" : ""}
                    > 
                        {processingPaymentId === project.project_id ? 'Processing...' : 
                         isOwnProject ? 'Your Project' : 'Buy Now'}
                    </button>
                </div>
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
                        <p>Complete secure payment via our Stripe checkout process. Ownership is immediately updated in your dashboard.</p>
                    </div>
                    <div className="step">
                        <div className="step-number">2</div>
                        <h4>Transfer Coordination</h4>
                        <p>Within 24 hours, we coordinate the transfer of code, domain, and assets between you and the seller. All transfers are tracked in your dashboard.</p>
                    </div>
                    <div className="step">
                        <div className="step-number">3</div>
                        <h4>Verification Period</h4>
                        <p>7-day verification period begins once transfers are complete, ensuring everything works as advertised. Seller support is available during this time.</p>
                    </div>
                    <div className="step">
                        <div className="step-number">4</div>
                        <h4>Final Handover</h4>
                        <p>After verification, the sale is finalized with a transfer certificate. You'll have full ownership and control of all project assets.</p>
                    </div>
                </div>
            </div>
            
            <div className="faq-section">
                <h3>Frequently Asked Questions</h3>
                
                <div className="faq-item">
                    <h4>What happens after I purchase?</h4>
                    <p>After purchase, you'll receive a confirmation email with next steps. Our transfer team will contact you within 24 hours to begin the transfer process. The project will immediately appear in your dashboard marked as "Purchased".</p>
                </div>
                
                <div className="faq-item">
                    <h4>How are project assets transferred?</h4>
                    <p>The transfer process is semi-manual and coordinated between buyer and seller:</p>
                    <div className="transfer-steps">
                        <div className="transfer-step">
                            <span className="step-label">Code Transfer:</span> 
                            <span className="step-text">The seller shares repository access, transfers GitHub ownership, or provides a download link within 48 hours.</span>
                        </div>
                        <div className="transfer-step">
                            <span className="step-label">Domain Transfer:</span> 
                            <span className="step-text">Domain ownership is transferred through the domain registrar (GoDaddy, Namecheap, etc.) using their standard transfer process.</span>
                        </div>
                        <div className="transfer-step">
                            <span className="step-label">Design Assets:</span> 
                            <span className="step-text">Additional assets like design files, documentation, and credentials are shared via secure file transfer.</span>
                        </div>
                    </div>
                    <p>You can track the progress of these transfers in your dashboard.</p>
                </div>
                
                <div className="faq-item">
                    <h4>Is there a verification period?</h4>
                    <p>Yes, a 7-day verification period begins once all assets are transferred. During this time, you can confirm everything works as advertised and request support from the seller if needed. If significant issues are discovered, you may be eligible for a refund.</p>
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
                    <h4>How long does the full transfer process take?</h4>
                    <p>While ownership is updated immediately in your dashboard, the complete transfer typically takes 2-7 days depending on the complexity of the project and responsiveness of both parties.</p>
                </div>
            </div>
        </div>
    );
}

export default MarketplacePage; 