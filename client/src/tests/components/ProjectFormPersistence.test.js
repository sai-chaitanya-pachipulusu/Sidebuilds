import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProjectFormPage from '../../pages/ProjectFormPage';
import { getProjectById, checkStripeOnboardingStatus, updateProject } from '../../services/api';

const mockUser = { email: 'qa@example.com' };
jest.mock('../../services/api', () => ({ getProjectById: jest.fn(), checkStripeOnboardingStatus: jest.fn(), updateProject: jest.fn() }));
jest.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock('../../components/StripeConnectModal', () => () => null);
jest.mock('../../components/ProjectFileUploader', () => () => null);
const saved = { project_id: 'fixture', name: 'Saved listing', stage: 'mvp', category: 'productivity', subcategory: 'planning',
  tags: ['react', 'saas'], tech_stack: ['React'], stage_details: { must_have_features: ['Search', 'Export'] }, is_public: 1, is_for_sale: 0 };
const openEditor = () => render(<MemoryRouter initialEntries={['/projects/fixture/edit']}><Routes>
  <Route path="/projects/:id/edit" element={<ProjectFormPage />} />
  <Route path="/projects/:id" element={<p>Project saved</p>} />
</Routes></MemoryRouter>);
beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
  checkStripeOnboardingStatus.mockResolvedValue({ isOnboardingComplete: false });
  getProjectById.mockResolvedValue(saved);
  updateProject.mockResolvedValue(saved);
});
afterEach(() => jest.restoreAllMocks());

test('editing a listing preserves its saved category, tags and structured details', async () => {
  openEditor();
  expect(await screen.findByDisplayValue('Saved listing')).toBeInTheDocument();
  expect(screen.getByLabelText('Tags (Optional)')).toHaveValue('react, saas');
  expect(screen.getByLabelText('Make Project Publicly Visible')).toBeChecked();
  expect(screen.getByLabelText('List Project for Sale')).not.toBeChecked();
  expect(screen.getByDisplayValue('Search, Export')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('What is included?'), { target: { value: 'Source code and documentation ' } });
  expect(screen.getByLabelText('What is included?')).toHaveValue('Source code and documentation ');
  fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
  await waitFor(() => expect(updateProject).toHaveBeenCalledWith('fixture', expect.objectContaining({
    category: 'productivity', subcategory: 'planning', tags: 'react, saas', stage_details: { ...saved.stage_details, included_assets: 'Source code and documentation ' }
  })));
});

test('failed project loading cannot submit an empty editor and Retry restores the saved data', async () => {
  getProjectById.mockRejectedValueOnce(new Error('offline'));
  openEditor();
  expect(await screen.findByText('Project unavailable')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Save Changes' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect(await screen.findByDisplayValue('Saved listing')).toBeInTheDocument();
  expect(updateProject).not.toHaveBeenCalled();
});

test('a missing-detail link focuses the loaded field and an existing seller can save while reconnecting Stripe', async () => {
  checkStripeOnboardingStatus.mockResolvedValue({ requiresReconnect: true, isOnboardingComplete: false });
  getProjectById.mockResolvedValue({ ...saved, is_for_sale: true, sale_price: 5000 });
  render(<MemoryRouter initialEntries={['/projects/fixture/edit#brief-running_costs']}><Routes>
    <Route path="/projects/:id/edit" element={<ProjectFormPage />} />
    <Route path="/projects/:id" element={<p>Project saved</p>} />
  </Routes></MemoryRouter>);
  const costs = await screen.findByLabelText('What does it cost to run?');
  await waitFor(() => expect(costs).toHaveFocus());
  expect(screen.getByText(/You can save improvements to this listing/)).toBeInTheDocument();
  fireEvent.change(costs, { target: { value: '$12/month hosting' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
  await waitFor(() => expect(updateProject).toHaveBeenCalledWith('fixture', expect.objectContaining({ is_public: true, is_for_sale: true,
    stage_details: expect.objectContaining({ running_costs: '$12/month hosting' }) })));
});

test('an incomplete saved response cannot open an empty editor or overwrite a listing', async () => {
  getProjectById.mockResolvedValue([]); openEditor();
  expect(await screen.findByText('Project unavailable')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Save Changes' })).not.toBeInTheDocument();
  expect(updateProject).not.toHaveBeenCalled();
});
