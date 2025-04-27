import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getPublicProjects } from '../services/api';

function PublicProjectsPage() {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchPublicProjects = async () => {
            try {
                setError('');
                setLoading(true);
                const publicProjects = await getPublicProjects();
                setProjects(publicProjects);
            } catch (err) {
                console.error("Failed to fetch public projects:", err);
                setError(err.message || 'Failed to load public projects.');
            } finally {
                setLoading(false);
            }
        };

        fetchPublicProjects();
    }, []); // Fetch only once on mount

    return (
        <div>
            <h2>Publicly Shared Projects</h2>
            <p>Discover projects shared by other builders!</p>

            {loading && <p>Loading projects...</p>}
            {error && <p className="error-message">Error: {error}</p>}

            {!loading && !error && (
                projects.length === 0 ? (
                    <p>No public projects found yet.</p>
                ) : (
                    <ul>
                        {projects.map((project) => (
                            <li key={project.project_id}>
                                {/* Maybe link to a public detail view later? For now, just display info */}
                                <strong>{project.name}</strong> by {project.owner_username}
                                <p>{project.description || 'No description'}</p>
                                <span>Status: {project.stage || 'N/A'}</span> 
                                {project.domain && 
                                    <span> | Domain: <a href={`http://${project.domain}`} target="_blank" rel="noopener noreferrer">{project.domain}</a></span>
                                }
                                <p><small>Last Updated: {new Date(project.updated_at).toLocaleString()}</small></p>
                            </li>
                        ))}
                    </ul>
                )
            )}
        </div>
    );
}

export default PublicProjectsPage; 