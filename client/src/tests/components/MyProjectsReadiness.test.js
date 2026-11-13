import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Page from '../../pages/MyProjectsPage';
import NextStep from '../../components/SellerListingNextStep';
import { getProjects } from '../../services/api';
jest.mock('../../services/api', () => ({ getProjects: jest.fn(), toggleHoldProject: jest.fn() }));
const mockOwner = { user_id: 'fixture' };
jest.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: mockOwner }) }));
jest.mock('../../components/SEO', () => () => null);
const project = { project_id: 'fixture', name: 'Seller listing', description: 'A useful project', stage: 'mvp', category: 'productivity',
  tech_stack: ['React'], demo_url: 'https://example.com', stage_details: { included_assets: 'Code' }, is_public: true, is_for_sale: true, is_on_hold: true, created_at: '2026-11-13' };
beforeEach(() => jest.clearAllMocks());
test('seller links lead to the exact missing buyer field and never claim payment readiness', () => {
  render(<MemoryRouter><NextStep project={project}/></MemoryRouter>);
  expect(screen.getByRole('link', { name: /What does it cost to run/ })).toHaveAttribute('href', '/projects/edit/fixture#brief-running_costs');
  expect(screen.getByText(/5\/7 details filled in/)).toBeInTheDocument();
  expect(screen.queryByText('Ready to sell')).not.toBeInTheDocument();
});
test('a failed owner-list request offers retry without claiming the projects are gone', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  getProjects.mockRejectedValueOnce(new Error('Outage')).mockResolvedValueOnce([project]);
  render(<MemoryRouter><Page/></MemoryRouter>);
  expect(await screen.findByRole('alert')).toHaveTextContent('could not be loaded');
  expect(screen.queryByText('No projects yet')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Retry loading projects' }));
  expect(await screen.findByText('Seller listing')).toBeInTheDocument();
  expect(screen.getByText('On Hold / Under Negotiation')).toBeInTheDocument();
  expect(document.querySelector('img')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'List view' }));
  expect(screen.getByRole('link', { name: /What does it cost to run/ })).toBeInTheDocument();
  console.error.mockRestore();
});
