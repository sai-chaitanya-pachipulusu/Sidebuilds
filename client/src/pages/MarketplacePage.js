import React, { useState, useEffect } from 'react';
import { getMarketplaceProjects } from '../services/api';
import apiClient from '../services/api';
// import { useStripe } from '@stripe/react-stripe-js'; // Removed
import { useAuth } from '../context/AuthContext'; // Import auth context to get current user
import ProjectTable from '../components/ProjectTable';
// import { createAndRedirectToCheckout } from '../utils/stripe-helper'; // Removed
import './MarketplacePage.css';

// Icons

function MarketplacePage() {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    // const stripe = useStripe(); // Removed
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

    // Pre-validate before even attempting to purchase/show interest
    const validateShowInterest = (project) => { // Renamed from validatePurchase for clarity
        // Check if user is logged in
        if (!user) {
            return "Please log in to show interest";
        }
        
        // Check if user is trying to show interest in their own project
        if (project.owner_id === user.id) {
            // This case is usually handled by disabling the button, but good to have a check.
            return "You cannot show interest in your own project";
        }
                
        return null; // No validation error
    };

    const handleShowInterest = async (projectId) => { // Renamed from handlePurchase
        const project = projects.find(p => p.project_id === projectId);
        if (!project) {
            setCheckoutError('Project not found'); // Keep error state for now, can be generalized
            return;
        }
        
        const validationError = validateShowInterest(project);
        if (validationError) {
            setCheckoutError(validationError);
            return;
        }
        
        // Stripe is not immediately needed for "Show Interest"
        // if (!stripe) {
        //     console.error('Stripe.js has not yet loaded.');
        //     setCheckoutError('Payment system is not ready. Please try again in a moment.');
        //     return;
        // }

        setProcessingPaymentId(projectId); // Indicates "Submitting interest..."
        setCheckoutError(''); // Clear previous errors

        try {
            console.log(`[CLIENT DEBUG] User ${user.email} showing interest in project ${projectId}`);
            
            // Call the existing endpoint to create a purchase request with 'pending_seller_approval'
            const response = await apiClient.post(
                `/purchase-requests/projects/${projectId}/request`, 
                { terms_agreed_version: 'v_show_interest_1.0' } // Example terms version
            );

            const newPurchaseRequest = response.data;
            // The response object structure might vary, ensure it includes a success indicator or the new request.
            // request_id is the alias used in some parts of purchaseRequests.js for purchase_request_id
            const createdRequestId = newPurchaseRequest.purchase_request_id || newPurchaseRequest.request_id;

            console.log(`[CLIENT DEBUG] "Show Interest" request successful for project ${projectId}. Request ID: ${createdRequestId}`);
            // Update UI - e.g., disable button, show "Interest Shown" or redirect/notify user.
            // For now, just log and clear processing state.
            // You might want to re-fetch projects or update the specific project's state
            // to reflect that interest has been shown.
            alert('Interest shown successfully! The seller will be notified.'); // Simple feedback

        } catch (err) {
            console.error('[CLIENT ERROR] Failed to show interest:', err);
            
            let errorMessage = 'Failed to submit interest. Please try again.';
            if (err.response && err.response.data && err.response.data.error) {
                errorMessage = err.response.data.error;
            } else if (err.message) {
                errorMessage = err.message;
            }
            
            setCheckoutError(errorMessage); // Display error
        } finally {
            setTimeout(() => {
                setProcessingPaymentId(null); // Clear processing state
            }, 1000);
        }
    };

    // Add Show Interest action buttons to the table
    const projectsWithActions = projects.map(project => {
        const isOwnProject = user && project.owner_id === user.id;
        // TODO: Add a check here if interest has already been shown for this project by this user
        // This would require fetching the user's purchase requests and checking against project_id.
        // For simplicity, this is omitted for now. A more robust solution would disable/change button text.
        
        return {
            ...project,
            buy_action: ( // Keep 'buy_action' key if ProjectTable expects it, or rename if ProjectTable is flexible
                <div className="action-buttons">
                    <button 
                        onClick={() => handleShowInterest(project.project_id)}
                        disabled={processingPaymentId === project.project_id || isOwnProject} // Stripe check removed for now
                        className={`buy-button ${isOwnProject ? 'disabled' : ''}`} // Class name can be updated
                        title={isOwnProject ? "This is your project" : "Show interest in this project"}
                    > 
                        {processingPaymentId === project.project_id ? 'Submitting...' : 
                         isOwnProject ? 'Your Project' : 'Show Interest'}
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
            
            <div className="faq-link-section">
                <h3>Have Questions?</h3>
                <p>Learn more about how purchasing projects, asset transfers, and payments work.</p>
                <a href="/faqs" className="faq-link-button">View Full FAQs</a>
            </div>
        </div>
    );
}

export default MarketplacePage; 