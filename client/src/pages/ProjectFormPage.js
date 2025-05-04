import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createProject } from '../services/api';
import { useAuth } from '../context/AuthContext';

// Consider defining stages centrally if used elsewhere
const projectStages = ['idea', 'planning', 'mvp', 'development', 'launched', 'on_hold'];
const paymentMethods = ['direct', 'stripe', 'paypal'];

function ProjectFormPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    
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

        // Validate contact info if project is for sale
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
        }

        // Prepare data for API (e.g., convert numbers)
        const projectData = {
            ...formData,
            sale_price: formData.is_for_sale && formData.sale_price ? parseFloat(formData.sale_price) : 0
        };

        try {
            await createProject(projectData);
            navigate('/dashboard'); // Go back to dashboard after creation
        } catch (err) {
            console.error("Failed to create project:", err);
            setError(err.message || 'Failed to create project. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h2>Add New Project</h2>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <form onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="name">Project Name*:</label>
                    <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required />
                </div>
                <div>
                    <label htmlFor="description">Description:</label>
                    <textarea id="description" name="description" value={formData.description} onChange={handleChange}></textarea>
                </div>
                <div>
                    <label htmlFor="stage">Stage:</label>
                    <select id="stage" name="stage" value={formData.stage} onChange={handleChange}>
                        {projectStages.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="domain">Domain:</label>
                    <input type="text" id="domain" name="domain" value={formData.domain} onChange={handleChange} placeholder="e.g., sidebuilds.com" />
                </div>
                <div>
                    <label htmlFor="is_public">Make Public?</label>
                    <input type="checkbox" id="is_public" name="is_public" checked={formData.is_public} onChange={handleChange} />
                </div>
                <div>
                    <label htmlFor="is_for_sale">List for Sale?</label>
                    <input type="checkbox" id="is_for_sale" name="is_for_sale" checked={formData.is_for_sale} onChange={handleChange} />
                </div>
                
                {/* Additional fields for projects listed for sale */}
                {formData.is_for_sale && (
                    <>
                        <div>
                            <label htmlFor="sale_price">Sale Price ($):</label>
                            <input type="number" id="sale_price" name="sale_price" value={formData.sale_price} onChange={handleChange} step="0.01" required={formData.is_for_sale} />
                        </div>
                        <div>
                            <label htmlFor="contact_email">Contact Email:</label>
                            <input type="email" id="contact_email" name="contact_email" value={formData.contact_email} onChange={handleChange} />
                        </div>
                        <div>
                            <label htmlFor="contact_phone">Contact Phone:</label>
                            <input type="tel" id="contact_phone" name="contact_phone" value={formData.contact_phone} onChange={handleChange} />
                        </div>
                        <div>
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
                                <p>Stripe integration will be set up after project creation.</p>
                            )}
                        </div>
                    </>
                )}

                <button type="submit" disabled={loading}>
                    {loading ? 'Creating...' : 'Create Project'}
                </button>
                <button type="button" onClick={() => navigate('/dashboard')} disabled={loading}>Cancel</button>
            </form>
        </div>
    );
}

export default ProjectFormPage; 