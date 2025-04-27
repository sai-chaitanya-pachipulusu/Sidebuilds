import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getProjects, deleteProject } from '../services/api'; // Import deleteProject

function DashboardPage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [deleteError, setDeleteError] = useState(''); // Separate error state for delete
    const [deletingId, setDeletingId] = useState(null); // Track which project is being deleted

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                setError('');
                setLoading(true);
                const userProjects = await getProjects(); // Call the API service
                setProjects(userProjects);
            } catch (err) {
                console.error("Failed to fetch projects:", err);
                setError(err.message || 'Failed to load projects.');
                // Handle specific errors, e.g., redirect if unauthorized (though ProtectedRoute should handle)
                if (err.message.includes('401') || err.message.includes('denied')) {
                    // Might indicate token expired or invalid
                    logout(); // Log out user if token is invalid
                    navigate('/login');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchProjects();
    }, [logout, navigate]); // Dependencies for useEffect

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleDelete = async (projectId) => {
        if (!window.confirm('Are you sure you want to delete this project?')) {
            return;
        }
        setDeletingId(projectId);
        setDeleteError('');
        try {
            await deleteProject(projectId);
            // Remove project from state to update UI immediately
            setProjects(prevProjects => prevProjects.filter(p => p.project_id !== projectId));
        } catch (err) {
            console.error("Failed to delete project:", err);
            setDeleteError(`Failed to delete project ${projectId}: ${err.message || 'Server error'}`);
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div>
            <h2>Dashboard</h2>
            {user && <p>Welcome, {user.username}!</p>}
            {/* Logout button can stay here or be moved solely to the main nav */}
            {/* <button onClick={handleLogout}>Logout</button> */}
            
            <h3>Your Projects</h3>

            {/* Button to add a new project */} 
            <Link to="/projects/new"> {/* We'll need to create this route/page */} 
                 <button>Add New Project</button>
            </Link>

            {loading && <p>Loading projects...</p>}
            {error && <p style={{ color: 'red' }}>Error loading projects: {error}</p>}
            {deleteError && <p style={{ color: 'red' }}>{deleteError}</p>} {/* Show delete errors */}
            
            {!loading && !error && (
                projects.length === 0 ? (
                    <p>You haven't added any projects yet.</p>
                ) : (
                    <ul>
                        {projects.map((project) => (
                            <li key={project.project_id}>
                                <Link to={`/projects/${project.project_id}`}> {/* Link to detail page */} 
                                    <strong>{project.name}</strong>
                                </Link>
                                <p>{project.description || 'No description'}</p>
                                <span>Status: {project.stage || 'N/A'}</span> 
                                {/* Add Delete Button */} 
                                <button 
                                    onClick={() => handleDelete(project.project_id)}
                                    disabled={deletingId === project.project_id} // Disable button while deleting this specific project
                                    style={{ marginLeft: '10px' }} // Basic styling
                                >
                                    {deletingId === project.project_id ? 'Deleting...' : 'Delete'}
                                </button>
                            </li>
                        ))}
                    </ul>
                )
            )}
        </div>
    );
}

export default DashboardPage; 