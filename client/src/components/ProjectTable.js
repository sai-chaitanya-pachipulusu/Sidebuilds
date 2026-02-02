import React from 'react';
import { Link as RouterLink } from 'react-router-dom';

// Helper function to get stage color - monochrome
const getStageColor = (stage) => {
  const stageColors = {
    'idea': 'gray',
    'planning': 'gray',
    'mvp': 'white',
    'development': 'gray',
    'launched': 'white',
    'on_hold': 'gray',
    'scaling': 'white',
    'profitable': 'white',
    'viral': 'white'
  };
  return stageColors[stage?.toLowerCase()] || 'gray';
};

// Helper function to format price
const formatPrice = (price) => {
  if (!price) return 'Not for sale';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
};

const ProjectTable = ({ projects, loading, error }) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-none h-8 w-8 border-b-2 border-white"></div>
        <span className="ml-2 text-gray-300">Loading projects...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500/30 rounded-none p-4 mb-6">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-red-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span className="text-red-200">{error}</span>
        </div>
      </div>
    );
  }

  if (!projects || projects.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 mb-2">No projects found</div>
        <div className="text-sm text-gray-500">Start by creating your first project!</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-700 rounded-none overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-800/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Project
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Stage
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Revenue
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {projects.map((project) => (
              <tr key={project.project_id} className="hover:bg-gray-800/30 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-white">
                      {project.name}
                    </div>
                    <div className="text-sm text-gray-400 truncate max-w-xs">
                      {project.description}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-bold uppercase ${
                    project.stage === 'launched' || project.stage === 'mvp' || project.stage === 'scaling'
                      ? 'bg-white text-black'
                      : 'bg-white/10 text-gray-300 border border-white/20'
                  }`}>
                    {project.stage || 'Unknown'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                  {project.sale_price ? formatPrice(project.sale_price) : 'Not set'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                  {project.monthly_revenue ? formatPrice(project.monthly_revenue) : 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                  {new Date(project.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <RouterLink
                    to={`/projects/${project.project_id}`}
                    className="text-white hover:text-gray-300 transition-colors font-mono"
                  >
                    View →
                  </RouterLink>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProjectTable; 
