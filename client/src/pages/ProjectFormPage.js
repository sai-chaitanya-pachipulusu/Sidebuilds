import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { createProject, getProjectById, updateProject, checkStripeOnboardingStatus } from '../services/api';
import { useAuth } from '../context/AuthContext';
// import axios from 'axios'; // No longer needed for direct call
import StripeConnectModal from '../components/StripeConnectModal';
import './ProjectFormPage.css';

// Consider defining stages centrally if used elsewhere
const projectStages = ['idea', 'planning', 'mvp', 'development', 'launched', 'on_hold'];
const paymentMethods = ['direct', 'stripe', 'paypal'];

function ProjectFormPage({ editMode: propEditMode }) {
    const navigate = useNavigate();
    const { id: projectIdFromParams } = useParams();
    const { user } = useAuth();
    
    const isEditMode = propEditMode || !!projectIdFromParams;
    
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        stage: projectStages[0], // Default stage
        domain: '',
        is_public: false,
        is_for_sale: false,
        sale_price: '', // Keep as string for input, convert later if needed
        contact_email: user?.email || '',
        contact_phone: '',
        payment_method: 'direct'
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(isEditMode);
    const [showStripeModal, setShowStripeModal] = useState(false);
    const [stripeStatus, setStripeStatus] = useState(null);
    const [isStripeStatusLoading, setIsStripeStatusLoading] = useState(true);


    const fetchProjectAndStripeStatus = useCallback(async () => {
        setIsStripeStatusLoading(true);
        if (user) { // Ensure user context is available
            try {
                const status = await checkStripeOnboardingStatus();
                setStripeStatus(status);
            } catch (err) {
                console.error("Failed to check Stripe account status:", err);
                setError(err.message || "Could not verify Stripe account status. Please try again.");
                // Set a default status to allow form rendering but block sales
                setStripeStatus({ accountId: null, isOnboardingComplete: false, arePayoutsEnabled: false, needsAttention: true });
            }
        }
        setIsStripeStatusLoading(false);

        if (isEditMode && projectIdFromParams) {
            getProjectById(projectIdFromParams)
                .then(data => {
                    setFormData({
                        name: data.name || '',
                        description: data.description || '',
                        stage: data.stage || projectStages[0],
                        domain: data.domain || '',
                        is_public: data.is_public || false,
                        is_for_sale: data.is_for_sale || false,
                        sale_price: data.sale_price ? String(data.sale_price) : '',
                        contact_email: data.contact_email || user?.email || '',
                        contact_phone: data.contact_phone || '',
                        payment_method: data.payment_method || 'direct'
                    });
                })
                .catch(err => {
                    console.error("Failed to fetch project for editing:", err);
                    setError('Failed to load project data. Please try again.');
                    navigate('/dashboard');
                })
                .finally(() => setPageLoading(false));
        } else if (!isEditMode) {
            setPageLoading(false);
        }
    }, [isEditMode, projectIdFromParams, user, navigate]);

    useEffect(() => {
        fetchProjectAndStripeStatus();
    }, [fetchProjectAndStripeStatus]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (!formData.name) {
            setError('Project name is required.');
            setLoading(false);
            return;
        }

        if (formData.is_for_sale) {
            if (!formData.sale_price) {
                setError('Sale price is required for projects listed for sale.');
                setLoading(false);
                return;
            }
            
            if (!formData.contact_email && !formData.contact_phone) {
                setError('At least one contact method (email or phone) is required for projects listed for sale.');
                setLoading(false);
                return;
            }
            
            if (isStripeStatusLoading) {
                setError('Stripe status is still loading. Please wait a moment.');
                setLoading(false);
                return;
            }

            if (!stripeStatus || !stripeStatus.accountId || !stripeStatus.isOnboardingComplete || !stripeStatus.arePayoutsEnabled) {
                setError('Your Stripe account is not fully set up for payouts. Please complete your Stripe onboarding in Profile Settings.');
                // Optionally, direct them or show modal:
                // setShowStripeModal(true); // Or navigate them: navigate('/profile-settings');
                setLoading(false);
                return;
            }
        }

        const projectData = {
            ...formData,
            sale_price: formData.is_for_sale && formData.sale_price ? parseFloat(formData.sale_price) : 0
        };

        try {
            if (isEditMode && projectIdFromParams) {
                await updateProject(projectIdFromParams, projectData);
                navigate(`/projects/${projectIdFromParams}`);
            } else {
                const newProject = await createProject(projectData);
                navigate(`/projects/${newProject.project_id}`);
            }
        } catch (err) {
            console.error(`Failed to ${isEditMode ? 'update' : 'create'} project:`, err);
            if (err.response && err.response.data && err.response.data.error_code === 'stripe_account_required') {
                setShowStripeModal(true);
            } else {
                setError(err.message || 'Failed to create project. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };
    
    const handleStripeModalClose = () => {
        setShowStripeModal(false);
    };
    
    const handleStripeConnectSuccess = async () => {
        // After Stripe modal interaction, re-check status
        setShowStripeModal(false);
        setIsStripeStatusLoading(true);
        try {
            const status = await checkStripeOnboardingStatus();
            setStripeStatus(status);
            if (status.isOnboardingComplete && status.arePayoutsEnabled) {
                 // Automatically try to submit the form again if Stripe setup is now complete
                handleSubmit({ preventDefault: () => {} });
            } else {
                setError('Stripe setup is still not complete. Please ensure payouts are enabled.');
            }
        } catch (err) {
            setError(err.message || "Could not re-verify Stripe account status.");
        } finally {
            setIsStripeStatusLoading(false);
        }
    };

    if (pageLoading) {
        return <div className="project-form-container"><p>Loading project details...</p></div>;
    }
    
    const renderStripeWarning = () => {
        if (isStripeStatusLoading) {
            return <p className="info-text">Checking Stripe account status...</p>;
        }
        if (!stripeStatus) {
            return <p className="error-message">Could not load Stripe status. Cannot list project for sale.</p>;
        }
        if (!stripeStatus.accountId || !stripeStatus.isOnboardingComplete || !stripeStatus.arePayoutsEnabled) {
            return (
                <div className="stripe-account-required">
                    <span className="stripe-warning">
                        To sell projects, please complete your Stripe account setup for payouts.
                        <Link to="/profile-settings" className="stripe-setup-link">Go to Profile Settings</Link>
                    </span>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="project-form-container">
            <h2>{isEditMode ? 'Edit Project' : 'Add New Project'}</h2>
            {error && <div className="error-message">{error}</div>}
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="name">Project Name*:</label>
                    <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required />
                </div>
                <div className="form-group">
                    <label htmlFor="description">Description:</label>
                    <textarea id="description" name="description" value={formData.description} onChange={handleChange}></textarea>
                </div>
                <div className="form-group">
                    <label htmlFor="stage">Stage:</label>
                    <select id="stage" name="stage" value={formData.stage} onChange={handleChange}>
                        {projectStages.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div className="form-group">
                    <label htmlFor="domain">Domain:</label>
                    <input type="text" id="domain" name="domain" value={formData.domain} onChange={handleChange} placeholder="e.g., sidebuilds.com" />
                </div>
                <div className="form-group checkbox-group">
                    <label htmlFor="is_public" className="checkbox-label">
                        <input type="checkbox" id="is_public" name="is_public" checked={formData.is_public} onChange={handleChange} />
                        <span>Make Public?</span>
                    </label>
                </div>
                <div className="form-group checkbox-group">
                    <label htmlFor="is_for_sale" className="checkbox-label">
                        <input type="checkbox" id="is_for_sale" name="is_for_sale" checked={formData.is_for_sale} onChange={handleChange} />
                        <span>List for Sale?</span>
                    </label>
                    {formData.is_for_sale && renderStripeWarning()}
                </div>
                
                {formData.is_for_sale && (
                    <div className="sale-options">
                        <div className="form-group">
                            <label htmlFor="sale_price">Sale Price ($):</label>
                            <input type="number" id="sale_price" name="sale_price" value={formData.sale_price} onChange={handleChange} step="0.01" required={formData.is_for_sale} />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="contact_email">Contact Email:</label>
                                <input type="email" id="contact_email" name="contact_email" value={formData.contact_email} onChange={handleChange} />
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="contact_phone">Contact Phone:</label>
                                <input type="tel" id="contact_phone" name="contact_phone" value={formData.contact_phone} onChange={handleChange} />
                            </div>
                        </div>
                        <div className="form-group">
                            <label htmlFor="payment_method">Payment Method:</label>
                            <select id="payment_method" name="payment_method" value={formData.payment_method} onChange={handleChange}>
                                {paymentMethods.map(method => (
                                    <option key={method} value={method}>
                                        {method.charAt(0).toUpperCase() + method.slice(1)}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="info-text">
                            <p>At least one contact method is required for projects listed for sale.</p>
                            {formData.payment_method === 'stripe' && (
                                <p className="stripe-info">
                                    <strong>Note:</strong> Stripe payments require you to connect your Stripe account to receive funds directly.
                                </p>
                            )}
                        </div>
                    </div>
                )}

                <div className="form-actions">
                    <button type="submit" className="submit-button" disabled={loading || pageLoading}>
                        {loading ? (isEditMode ? 'Saving...' : 'Creating...') : (isEditMode ? 'Save Changes' : 'Create Project')}
                    </button>
                    <button type="button" className="cancel-button" onClick={() => navigate('/dashboard')} disabled={loading || pageLoading}>Cancel</button>
                </div>
            </form>
            
            <StripeConnectModal 
                isOpen={showStripeModal} 
                onClose={handleStripeModalClose} 
                onSuccess={handleStripeConnectSuccess} 
            />
        </div>
    );
}

export default ProjectFormPage; 