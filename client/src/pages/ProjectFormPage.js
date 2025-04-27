import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createProject } from '../services/api';

// Consider defining stages centrally if used elsewhere
const projectStages = ['idea', 'planning', 'mvp', 'development', 'launched', 'on_hold'];

function ProjectFormPage() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        stage: projectStages[0], // Default stage
        domain: '',
        revenue: 0,
        user_growth: 0,
        is_public: false,
        is_for_sale: false,
        sale_price: '' // Keep as string for input, convert later if needed
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

        // Prepare data for API (e.g., convert numbers)
        const projectData = {
            ...formData,
            revenue: parseFloat(formData.revenue) || 0,
            user_growth: parseInt(formData.user_growth, 10) || 0,
            sale_price: formData.is_for_sale && formData.sale_price ? parseFloat(formData.sale_price) : null
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
                    <label htmlFor="revenue">Monthly Revenue ($):</label>
                    <input type="number" id="revenue" name="revenue" value={formData.revenue} onChange={handleChange} step="0.01" />
                </div>
                 <div>
                    <label htmlFor="user_growth">User Growth (e.g., signups/month):</label>
                    <input type="number" id="user_growth" name="user_growth" value={formData.user_growth} onChange={handleChange} step="1" />
                </div>
                 <div>
                    <label htmlFor="is_public">Make Public?</label>
                    <input type="checkbox" id="is_public" name="is_public" checked={formData.is_public} onChange={handleChange} />
                </div>
                <div>
                    <label htmlFor="is_for_sale">List for Sale?</label>
                    <input type="checkbox" id="is_for_sale" name="is_for_sale" checked={formData.is_for_sale} onChange={handleChange} />
                </div>
                {formData.is_for_sale && (
                    <div>
                        <label htmlFor="sale_price">Sale Price ($):</label>
                        <input type="number" id="sale_price" name="sale_price" value={formData.sale_price} onChange={handleChange} step="0.01" required={formData.is_for_sale} />
                    </div>
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