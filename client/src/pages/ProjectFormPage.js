import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createProject, getProjectById, updateProject } from '../services/api';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import StripeConnectModal from '../components/StripeConnectModal';
import './ProjectFormPage.css';

// Consider defining stages centrally if used elsewhere
const projectStages = ['idea', 'planning', 'mvp', 'development', 'launched', 'on_hold'];
const paymentMethods = ['direct', 'stripe', 'paypal'];

function ProjectFormPage() {
    const navigate = useNavigate();
    const { projectId } = useParams();
    const { user } = useAuth();
    
    const [editMode, setEditMode] = useState(false);
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
    const [pageLoading, setPageLoading] = useState(false);
    const [showStripeModal, setShowStripeModal] = useState(false);
    const [stripeAccountStatus, setStripeAccountStatus] = useState({
        hasStripeAccount: false,
        isOnboardingComplete: false
    });

    useEffect(() => {
        checkStripeConnectStatus();
        if (projectId) {
            setEditMode(true);
            setPageLoading(true);
            getProjectById(projectId)
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
                })
                .finally(() => setPageLoading(false));
        }
    }, [projectId, user?.email]);

    const checkStripeConnectStatus = async () => {
        try {
            const response = await axios.get('/api/projects/check-stripe-account');
            setStripeAccountStatus({
                hasStripeAccount: response.data.hasStripeAccount,
                isOnboardingComplete: response.data.isOnboardingComplete
            });
        } catch (err) {
            console.error("Failed to check Stripe account status:", err);
        }
    };

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
            
            if (!stripeAccountStatus.hasStripeAccount || !stripeAccountStatus.isOnboardingComplete) {
                setShowStripeModal(true);
                setLoading(false);
                return;
            }
        }

        const projectData = {
            ...formData,
            sale_price: formData.is_for_sale && formData.sale_price ? parseFloat(formData.sale_price) : 0
        };

        try {
            if (editMode && projectId) {
                await updateProject(projectId, projectData);
            } else {
                await createProject(projectData);
            }
            navigate('/dashboard'); 
        } catch (err) {
            console.error("Failed to create project:", err);
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
        setTimeout(async () => {
            await checkStripeConnectStatus();
            setShowStripeModal(false);
            if (stripeAccountStatus.hasStripeAccount && stripeAccountStatus.isOnboardingComplete) {
                handleSubmit({ preventDefault: () => {} });
            }
        }, 2000);
    };

    if (pageLoading) {
        return <div className="project-form-container"><p>Loading project details...</p></div>;
    }

    return (
        <div className="project-form-container">
            <h2>{editMode ? 'Edit Project' : 'Add New Project'}</h2>
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
                    {formData.is_for_sale && !stripeAccountStatus.hasStripeAccount && (
                        <div className="stripe-account-required">
                            <span className="stripe-warning">
                                Requires Stripe Connect
                                <button 
                                    type="button" 
                                    className="connect-stripe-btn"
                                    onClick={() => setShowStripeModal(true)}
                                >
                                    Connect Now
                                </button>
                            </span>
                        </div>
                    )}
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
                        {loading ? (editMode ? 'Saving...' : 'Creating...') : (editMode ? 'Save Changes' : 'Create Project')}
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