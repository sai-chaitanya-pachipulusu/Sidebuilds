import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getProjectById, updateProject } from '../services/api';

// Reuse stages from form or define centrally
const projectStages = ['idea', 'planning', 'mvp', 'development', 'launched', 'on_hold'];

function ProjectDetailPage() {
    const { id: projectId } = useParams(); // Get project ID from URL
    const navigate = useNavigate();
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
                    sale_price: data.sale_price || ''
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
                sale_price: project.sale_price || ''
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
    if (error) return <p style={{ color: 'red' }}>Error: {error} <Link to="/dashboard">Go back to dashboard</Link></p>;
    if (!project) return <p>Project not found. <Link to="/dashboard">Go back to dashboard</Link></p>; // Should be caught by error usually

    return (
        <div>
            <Link to="/dashboard"> &larr; Back to Dashboard</Link>
            <hr />

            {!isEditing ? (
                // --- Display Mode --- 
                <div>
                    <h2>{project.name}</h2>
                    <button onClick={handleEditToggle}>Edit Project</button>
                    <p><strong>Description:</strong> {project.description || 'N/A'}</p>
                    <p><strong>Stage:</strong> {project.stage || 'N/A'}</p>
                    <p><strong>Domain:</strong> {project.domain ? <a href={`http://${project.domain}`} target="_blank" rel="noopener noreferrer">{project.domain}</a> : 'N/A'}</p>
                    <p><strong>Monthly Revenue:</strong> ${project.revenue != null ? parseFloat(project.revenue).toFixed(2) : '0.00'}</p>
                    <p><strong>User Growth:</strong> {project.user_growth != null ? project.user_growth : 0}</p>
                    <p><strong>Public:</strong> {project.is_public ? 'Yes' : 'No'}</p>
                    <p><strong>For Sale:</strong> {project.is_for_sale ? `Yes ($${parseFloat(project.sale_price).toFixed(2)})` : 'No'}</p>
                    <p><small>Created: {new Date(project.created_at).toLocaleString()}</small></p>
                    <p><small>Last Updated: {new Date(project.updated_at).toLocaleString()}</small></p>
                    {/* Delete button will go here later */}
                </div>
            ) : (
                 // --- Edit Mode --- 
                <div>
                    <h2>Edit Project: {project.name}</h2>
                     {error && <p style={{ color: 'red' }}>{error}</p>} {/* Display save errors */} 
                    <form onSubmit={handleSaveChanges}>
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
                            <input type="text" id="domain" name="domain" value={formData.domain} onChange={handleChange} />
                        </div>
                         <div>
                            <label htmlFor="revenue">Monthly Revenue ($):</label>
                            <input type="number" id="revenue" name="revenue" value={formData.revenue} onChange={handleChange} step="0.01" />
                        </div>
                        <div>
                            <label htmlFor="user_growth">User Growth:</label>
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
                                <input type="number" id="sale_price" name="sale_price" value={formData.sale_price} onChange={handleChange} step="0.01" required={formData.is_for_sale}/>
                            </div>
                        )}

                        <button type="submit" disabled={saveLoading}>
                            {saveLoading ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button type="button" onClick={handleEditToggle} disabled={saveLoading}>Cancel</button>
                    </form>
                </div>
            )}
        </div>
    );
}

export default ProjectDetailPage; 