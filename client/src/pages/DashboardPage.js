import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getProjects, deleteProject } from '../services/api';
import ProjectTable from '../components/ProjectTable';
import './DashboardPage.css';

function DashboardPage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [deleteError, setDeleteError] = useState('');
    const [deletingId, setDeletingId] = useState(null);

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                setError('');
                setLoading(true);
                const userProjects = await getProjects();
                setProjects(userProjects);
            } catch (err) {
                console.error("Failed to fetch projects:", err);
                setError(err.message || 'Failed to load projects.');
                if (err.message.includes('401') || err.message.includes('denied')) {
                    logout();
                    navigate('/login');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchProjects();
    }, [logout, navigate]);

    const handleDelete = async (projectId) => {
        if (!window.confirm('Are you sure you want to delete this project?')) {
            return;
        }
        setDeletingId(projectId);
        setDeleteError('');
        try {
            await deleteProject(projectId);
            setProjects(prevProjects => prevProjects.filter(p => p.project_id !== projectId));
        } catch (err) {
            console.error("Failed to delete project:", err);
            setDeleteError(`Failed to delete project: ${err.message || 'Server error'}`);
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="dashboard-page">
            <div className="dashboard-header">
                <div>
                    <div className="page-section-heading">DASHBOARD</div>
                    <h2>Your Projects</h2>
                    {user && <p className="welcome-text">Welcome back, {user.username}!</p>}
                </div>
                <Link to="/projects/new" className="add-project-btn">
                    + New Project
                </Link>
            </div>

            {deleteError && <p className="error-message">{deleteError}</p>}
            
            <ProjectTable 
                projects={projects}
                type="dashboard"
                onDelete={handleDelete}
                isLoading={loading}
                error={error}
            />
        </div>
    );
}

export default DashboardPage; 