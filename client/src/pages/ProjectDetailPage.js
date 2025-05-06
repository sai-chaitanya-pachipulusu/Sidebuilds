import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getProjectById, updateProject } from '../services/api';
import './ProjectDetailPage.css';

// Reuse stages from form or define centrally
const projectStages = ['idea', 'planning', 'mvp', 'development', 'launched', 'on_hold'];
const paymentMethods = ['direct', 'stripe', 'paypal'];

function ProjectDetailPage() {
    const { id: projectId } = useParams(); // Get project ID from URL
    const [project, setProject] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [saveLoading, setSaveLoading] = useState(false);

    useEffect(() => {
        const fetchProject = async () => {
            if (!projectId) return; // Should have ID
            setLoading(true);
            setError('');
            try {
                const data = await getProjectById(projectId);
                setProject(data);
                // Initialize form data for editing
                setFormData({
                    name: data.name || '',
                    description: data.description || '',
                    stage: data.stage || projectStages[0],
                    domain: data.domain || '',
                    revenue: data.revenue || 0,
                    user_growth: data.user_growth || 0,
                    is_public: data.is_public || false,
                    is_for_sale: data.is_for_sale || false,
                    sale_price: data.sale_price || '',
                    contact_email: data.contact_email || '',
                    contact_phone: data.contact_phone || '',
                    payment_method: data.payment_method || 'direct'
                });
            } catch (err) {
                console.error("Failed to fetch project:", err);
                setError(err.message || 'Failed to load project details.');
                if (err.message.includes('404')) {
                    setError('Project not found.'); // More specific error
                }
            } finally {
                setLoading(false);
            }
        };

        fetchProject();
    }, [projectId]);

    const handleEditToggle = () => {
        setIsEditing(!isEditing);
        // Reset form data to current project state if canceling edit
        if (isEditing && project) {
             setFormData({
                name: project.name || '',
                description: project.description || '',
                stage: project.stage || projectStages[0],
                domain: project.domain || '',
                revenue: project.revenue || 0,
                user_growth: project.user_growth || 0,
                is_public: project.is_public || false,
                is_for_sale: project.is_for_sale || false,
                sale_price: project.sale_price || '',
                contact_email: project.contact_email || '',
                contact_phone: project.contact_phone || '',
                payment_method: project.payment_method || 'direct'
            });
        }
        setError(''); // Clear errors when toggling edit mode
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSaveChanges = async (e) => {
        e.preventDefault();
        setError('');
        setSaveLoading(true);

        if (!formData.name) {
            setError('Project name is required.');
            setSaveLoading(false);
            return;
        }

        // Validate contact info if project is for sale
        if (formData.is_for_sale) {
            if (!formData.sale_price) {
                setError('Sale price is required for projects listed for sale.');
                setSaveLoading(false);
                return;
            }
            
            if (!formData.contact_email && !formData.contact_phone) {
                setError('At least one contact method (email or phone) is required for projects listed for sale.');
                setSaveLoading(false);
                return;
            }
        }

        const updatedData = {
             ...formData,
            revenue: parseFloat(formData.revenue) || 0,
            user_growth: parseInt(formData.user_growth, 10) || 0,
            sale_price: formData.is_for_sale && formData.sale_price ? parseFloat(formData.sale_price) : null
        };

        try {
            const updatedProjectData = await updateProject(projectId, updatedData);
            setProject(updatedProjectData); // Update local state with saved data
            setIsEditing(false); // Exit edit mode
        } catch (err) {
             console.error("Failed to update project:", err);
             setError(err.message || 'Failed to save changes.');
        } finally {
             setSaveLoading(false);
        }
    };

    if (loading) return <p>Loading project details...</p>;
    if (error) return <div className="error-message">Error: {error} <Link to="/dashboard">Go back to dashboard</Link></div>;
    if (!project) return <p>Project not found. <Link to="/dashboard">Go back to dashboard</Link></p>; // Should be caught by error usually

    return (
        <div className="project-detail-container">
            <div className="back-link">
                <Link to="/dashboard">Back to Dashboard</Link>
            </div>
            <hr />

            {!isEditing ? (
                // --- Display Mode --- 
                <div className="project-details">
                    <div className="project-header">
                        <h2>{project.name}</h2>
                        <button onClick={handleEditToggle} className="edit-button">Edit Project</button>
                    </div>
                    
                    <div className="detail-grid">
                        <div className="detail-item">
                            <span className="detail-label">Description:</span>
                            <div className="detail-value">{project.description || 'N/A'}</div>
                        </div>
                        
                        <div className="detail-item">
                            <span className="detail-label">Stage:</span>
                            <div className="detail-value">{project.stage || 'N/A'}</div>
                        </div>
                        
                        <div className="detail-item">
                            <span className="detail-label">Domain:</span>
                            <div className="detail-value">
                                {project.domain ? <a href={`http://${project.domain}`} target="_blank" rel="noopener noreferrer">{project.domain}</a> : 'N/A'}
                            </div>
                        </div>
                        
                        <div className="detail-item">
                            <span className="detail-label">Monthly Revenue:</span>
                            <div className="detail-value">${project.revenue != null ? parseFloat(project.revenue).toFixed(2) : '0.00'}</div>
                        </div>
                        
                        <div className="detail-item">
                            <span className="detail-label">User Growth:</span>
                            <div className="detail-value">{project.user_growth != null ? project.user_growth : 0}</div>
                        </div>
                        
                        <div className="detail-item">
                            <span className="detail-label">Public:</span>
                            <div className="detail-value">{project.is_public ? 'Yes' : 'No'}</div>
                        </div>
                        
                        <div className="detail-item">
                            <span className="detail-label">For Sale:</span>
                            <div className="detail-value">{project.is_for_sale ? `Yes ($${parseFloat(project.sale_price).toFixed(2)})` : 'No'}</div>
                        </div>
                        
                        {project.is_for_sale && (
                            <>
                                <div className="detail-item">
                                    <span className="detail-label">Contact Email:</span>
                                    <div className="detail-value">{project.contact_email || 'N/A'}</div>
                                </div>
                                
                                <div className="detail-item">
                                    <span className="detail-label">Contact Phone:</span>
                                    <div className="detail-value">{project.contact_phone || 'N/A'}</div>
                                </div>
                                
                                <div className="detail-item">
                                    <span className="detail-label">Payment Method:</span>
                                    <div className="detail-value">{project.payment_method || 'Direct'}</div>
                                </div>
                            </>
                        )}
                    </div>
                    
                    <div className="project-dates">
                        <div>Created: {new Date(project.created_at).toLocaleString()}</div>
                        <div>Last Updated: {new Date(project.updated_at).toLocaleString()}</div>
                    </div>
                </div>
            ) : (
                // --- Edit Mode --- 
                <div className="project-edit-form">
                    <h2>Edit Project: {project.name}</h2>
                    {error && <div className="error-message">{error}</div>}
                    
                    <form onSubmit={handleSaveChanges}>
                        <div className="form-group">
                            <label htmlFor="name">Project Name*</label>
                            <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required />
                        </div>
                        
                        <div className="form-group">
                            <label htmlFor="description">Description</label>
                            <textarea id="description" name="description" value={formData.description} onChange={handleChange}></textarea>
                        </div>
                        
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="stage">Stage</label>
                                <select id="stage" name="stage" value={formData.stage} onChange={handleChange}>
                                    {projectStages.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="domain">Domain</label>
                                <input type="text" id="domain" name="domain" value={formData.domain} onChange={handleChange} />
                            </div>
                        </div>
                        
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="revenue">Monthly Revenue ($)</label>
                                <input type="number" id="revenue" name="revenue" value={formData.revenue} onChange={handleChange} step="0.01" />
                            </div>
                            
                            <div className="form-group">
                                <label htmlFor="user_growth">User Growth</label>
                                <input type="number" id="user_growth" name="user_growth" value={formData.user_growth} onChange={handleChange} step="1" />
                            </div>
                        </div>
                        
                        <div className="form-row checkbox-row">
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
                            </div>
                        </div>
                        
                        {formData.is_for_sale && (
                            <div className="sale-options">
                                <div className="form-group">
                                    <label htmlFor="sale_price">Sale Price ($)</label>
                                    <input type="number" id="sale_price" name="sale_price" value={formData.sale_price} onChange={handleChange} step="0.01" required={formData.is_for_sale}/>
                                </div>
                                
                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="contact_email">Contact Email</label>
                                        <input type="email" id="contact_email" name="contact_email" value={formData.contact_email} onChange={handleChange} />
                                    </div>
                                    
                                    <div className="form-group">
                                        <label htmlFor="contact_phone">Contact Phone</label>
                                        <input type="tel" id="contact_phone" name="contact_phone" value={formData.contact_phone} onChange={handleChange} />
                                    </div>
                                </div>
                                
                                <div className="form-group">
                                    <label htmlFor="payment_method">Payment Method</label>
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
                                </div>
                            </div>
                        )}

                        <div className="form-actions">
                            <button type="submit" className="submit-button" disabled={saveLoading}>
                                {saveLoading ? 'Saving...' : 'Save Changes'}
                            </button>
                            <button type="button" className="cancel-button" onClick={handleEditToggle} disabled={saveLoading}>Cancel</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

export default ProjectDetailPage; 