import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import ProjectCard from '../../components/ProjectCard';

jest.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: false }),
}));

jest.mock('../../services/api', () => ({
  getSavedProjectIds: jest.fn().mockResolvedValue([]),
  saveProject: jest.fn(),
  unsaveProject: jest.fn(),
}));

const project = {
  project_id: 'project-1',
  name: 'Launch Analytics',
  description: 'Privacy-friendly product analytics.',
  stage: 'launched',
  is_for_sale: true,
  sale_price: 12500,
  monthly_revenue: 850,
  tech_stack: ['React', 'Node.js', 'PostgreSQL', 'Redis', 'Docker'],
  view_count: 1500,
  github_url: 'https://github.com/example/launch-analytics',
  domain: 'launch-analytics.example',
};

const CurrentPath = () => {
  const location = useLocation();
  return <output data-testid="current-path">{location.pathname}</output>;
};

const renderCard = (overrides = {}) => render(
  <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <ProjectCard project={{ ...project, ...overrides }} />
    <CurrentPath />
  </MemoryRouter>,
);

describe('ProjectCard', () => {
  it('renders marketplace information using live project fields', () => {
    renderCard();
    expect(screen.getByText('Launch Analytics')).toBeInTheDocument();
    expect(screen.getByText('$12,500')).toBeInTheDocument();
    expect(screen.getByText('$850/mo')).toBeInTheDocument();
    expect(screen.getByText('1.5k')).toBeInTheDocument();
  });

  it('links the title to the project detail route', () => {
    renderCard();
    expect(screen.getByRole('link', { name: 'Launch Analytics' }))
      .toHaveAttribute('href', '/projects/project-1');
  });

  it('limits long technology lists while preserving the remainder count', () => {
    renderCard();
    for (const technology of ['React', 'Node.js', 'PostgreSQL', 'Redis']) {
      expect(screen.getByText(technology)).toBeInTheDocument();
    }
    expect(screen.getByText('+1')).toBeInTheDocument();
    expect(screen.queryByText('Docker')).not.toBeInTheDocument();
  });

  it('uses a clear fallback when no sale price exists', () => {
    renderCard({ sale_price: null });
    expect(screen.getByText('Contact for Price')).toBeInTheDocument();
  });

  it('preserves cents in listing prices and monthly revenue', () => {
    renderCard({ sale_price: '10.25', monthly_revenue: '20.50' });
    expect(screen.getByText('$10.25')).toBeInTheDocument();
    expect(screen.getByText('$20.50/mo')).toBeInTheDocument();
  });

  it('renders user-provided text as inert text content', () => {
    renderCard({
      name: '<script>alert("xss")</script>Safe Project',
      description: '<img src=x onerror=alert(1)>Safe description',
    });
    expect(screen.getByText(/Safe Project/)).toBeInTheDocument();
    expect(screen.getByText(/Safe description/)).toBeInTheDocument();
    expect(document.querySelector('script')).not.toBeInTheDocument();
  });

  it('secures external links opened in a new tab', () => {
    renderCard();
    for (const href of [new URL(project.github_url).href, new URL(`https://${project.domain}`).href]) {
      const link = document.querySelector(`a[href="${href}"]`);
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    }
  });

  it('sends unauthenticated save attempts to login', () => {
    renderCard();
    fireEvent.click(screen.getByTitle('Save project'));
    expect(screen.getByTestId('current-path')).toHaveTextContent('/login');
  });
});
