import React, { useState, useEffect } from 'react';
import { getPublicProjects } from '../services/api';
import ProjectTable from '../components/ProjectTable';
import './PublicProjectsPage.css';

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
    }, []);

    return (
        <div className="public-projects-page">
            <div className="public-header">
                <div>
                    <div className="page-section-heading">PUBLIC PROJECTS</div>
                    <h2>Discover Shared Projects</h2>
                    <p className="subtitle">Browse side projects shared by the community.</p>
                </div>
            </div>

            <div className="public-table">
                <ProjectTable 
                    projects={projects}
                    type="public"
                    isLoading={loading}
                    error={error}
                />
            </div>
        </div>
    );
}

export default PublicProjectsPage; 