import React from 'react';
import { Link } from 'react-router-dom';
import './ProjectTable.css';

// Icons
const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
  </svg>
);

const DeleteIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
);

const ExternalLinkIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
    <polyline points="15 3 21 3 21 9"></polyline>
    <line x1="10" y1="14" x2="21" y2="3"></line>
  </svg>
);

const GithubIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
  </svg>
);

const EmailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
    <polyline points="22,6 12,13 2,6"></polyline>
  </svg>
);

const PhoneIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
  </svg>
);

/**
 * A reusable table component for displaying projects
 * 
 * @param {Object} props
 * @param {Array} props.projects - Array of project objects
 * @param {string} props.type - Type of table: 'dashboard', 'marketplace', or 'public'
 * @param {Function} props.onDelete - Optional callback for delete action
 * @param {boolean} props.isLoading - Loading state
 * @param {string} props.error - Error message if any
 */
const ProjectTable = ({ projects, type, onDelete, isLoading, error }) => {
  // Define columns based on table type
  const getColumns = () => {
    const common = [
      { id: 'name', label: 'Project' },
      { id: 'stage', label: 'Status' },
    ];

    if (type === 'dashboard') {
      return [
        ...common,
        { id: 'updated_at', label: 'Last Updated' },
        { id: 'domain', label: 'Domain' },
        { id: 'is_public', label: 'Public' },
        { id: 'is_for_sale', label: 'For Sale' },
        { id: 'actions', label: 'Actions' },
      ];
    } else if (type === 'marketplace') {
      return [
        ...common,
        { id: 'owner_username', label: 'Creator' },
        { id: 'sale_price', label: 'Price' },
        { id: 'domain', label: 'Domain' },
        { id: 'contact', label: 'Contact' },
        { id: 'buy_action', label: '' },
      ];
    } else if (type === 'public') {
      return [
        ...common,
        { id: 'owner_username', label: 'Creator' },
        { id: 'domain', label: 'Domain' },
        { id: 'github', label: 'GitHub' },
        { id: 'live', label: 'Live Demo' },
      ];
    }
    return common;
  };

  const columns = getColumns();

  // Handle empty state
  if (!isLoading && !error && (!projects || projects.length === 0)) {
    return (
      <div className="empty-table">
        {type === 'dashboard' && 'You haven\'t added any projects yet.'}
        {type === 'marketplace' && 'No projects currently listed for sale.'}
        {type === 'public' && 'No public projects found yet.'}
      </div>
    );
  }

  // Render cell content based on column ID
  const renderCell = (project, columnId) => {
    switch (columnId) {
      case 'name':
        return (
          <span className="project-name">
            {type === 'dashboard' ? (
              <Link to={`/projects/${project.project_id}`} className="project-link">
                {project.name}
              </Link>
            ) : (
              project.name
            )}
          </span>
        );
      case 'stage':
        return (
          <span className={`status-chip status-${project.stage || 'idea'}`}>
            {project.stage || 'Idea'}
          </span>
        );
      case 'updated_at':
      case 'created_at':
        return new Date(project[columnId]).toLocaleDateString();
      case 'domain':
        return project.domain ? (
          <a 
            href={`http://${project.domain}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="project-link"
          >
            {project.domain} <ExternalLinkIcon />
          </a>
        ) : (
          'N/A'
        );
      case 'is_public':
        return project.is_public ? 'Yes' : 'No';
      case 'is_for_sale':
        return project.is_for_sale ? 'Yes' : 'No';
      case 'owner_username':
        return project.owner_username || 'Anonymous';
      case 'sale_price':
        return `$${parseFloat(project.sale_price).toFixed(2)}`;
      case 'contact':
        return (
          <div className="contact-info">
            {project.contact_email && (
              <a 
                href={`mailto:${project.contact_email}`} 
                className="contact-link"
                title={`Email: ${project.contact_email}`}
              >
                <EmailIcon />
              </a>
            )}
            {project.contact_phone && (
              <a 
                href={`tel:${project.contact_phone}`} 
                className="contact-link"
                title={`Phone: ${project.contact_phone}`}
              >
                <PhoneIcon />
              </a>
            )}
            {!project.contact_email && !project.contact_phone && 'N/A'}
          </div>
        );
      case 'github':
        return project.github_url ? (
          <a 
            href={project.github_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="project-link"
          >
            <GithubIcon />
          </a>
        ) : (
          'N/A'
        );
      case 'live':
        return project.domain ? (
          <a 
            href={`http://${project.domain}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="project-link"
          >
            <ExternalLinkIcon />
          </a>
        ) : (
          'N/A'
        );
      case 'buy_action':
        return project.buy_action || null;
      case 'actions':
        return (
          <div className="action-cell">
            <Link 
              to={`/projects/${project.project_id}`}
              className="action-btn"
              title="Edit project"
            >
              <EditIcon />
            </Link>
            {onDelete && (
              <button
                onClick={() => onDelete(project.project_id)}
                className="action-btn"
                title="Delete project"
              >
                <DeleteIcon />
              </button>
            )}
          </div>
        );
      default:
        return project[columnId] || 'N/A';
    }
  };

  return (
    <div className="table-container">
      {isLoading && <p>Loading projects...</p>}
      {error && <p className="error-message">Error: {error}</p>}
      
      {!isLoading && !error && projects && projects.length > 0 && (
        <table className="project-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.id}>{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project.project_id}>
                {columns.map((column) => (
                  <td key={`${project.project_id}-${column.id}`}>
                    {renderCell(project, column.id)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ProjectTable; 