import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProjectFormPage from '../../pages/ProjectFormPage';
import { createProject, checkStripeOnboardingStatus } from '../../services/api';

const mockUser = { user_id: 'seller-one', email: 'qa@example.com' };
jest.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock('../../services/api', () => ({ createProject: jest.fn(), checkStripeOnboardingStatus: jest.fn() }));
jest.mock('../../components/StripeConnectModal', () => () => null);
jest.mock('../../components/ProjectFileUploader', () => () => <p>Uploader mounted</p>);
const open = () => render(<MemoryRouter initialEntries={['/create']}><Routes>
  <Route path="/create" element={<ProjectFormPage editMode={false} />} />
  <Route path="/projects/:id" element={<p>Created project</p>} />
  <Route path="/projects/edit/:id" element={<p>Attach files to saved project</p>} />
</Routes></MemoryRouter>);
beforeEach(() => {
  jest.clearAllMocks(); localStorage.clear(); mockUser.user_id = 'seller-one';
  checkStripeOnboardingStatus.mockResolvedValue({ isOnboardingComplete: false });
  createProject.mockResolvedValue({ project_id: 'created' });
});

test('a pending payment check does not block writing and a browser draft survives remount', async () => {
  checkStripeOnboardingStatus.mockReturnValue(new Promise(() => {}));
  const view = open();
  fireEvent.change(screen.getByLabelText('Project Name'), { target: { value: 'Unfinished prototype' } });
  fireEvent.change(screen.getByLabelText('Technologies'), { target: { value: 'React, Node.js' } });
  expect(screen.getByLabelText('Make Project Publicly Visible')).not.toBeChecked();
  await screen.findByText('Draft saved on this browser');
  view.unmount(); open();
  expect(screen.getByLabelText('Project Name')).toHaveValue('Unfinished prototype');
  expect(screen.getByLabelText('Technologies')).toHaveValue('React, Node.js');
  expect(screen.getByRole('status')).toHaveTextContent('Draft restored');
  expect(createProject).not.toHaveBeenCalled();
});

test('drafts are isolated by account and malformed storage does not block creation', async () => {
  localStorage.setItem('sidebuilds:project-draft:v1:seller-one', JSON.stringify({ version: 1, fields: { name: 'Private account draft' } }));
  mockUser.user_id = 'seller-two';
  localStorage.setItem('sidebuilds:project-draft:v1:seller-two', '{broken');
  await act(async () => open());
  expect(screen.getByLabelText('Project Name')).toHaveValue('');
});

test('save privately bypasses sale setup, clears the browser draft and opens file attachment only after creation', async () => {
  open();
  fireEvent.change(screen.getByLabelText('Project Name'), { target: { value: 'Save first' } });
  fireEvent.click(screen.getByLabelText('List Project for Sale'));
  expect(screen.queryByText('Uploader mounted')).not.toBeInTheDocument();
  const button = screen.getByRole('button', { name: 'Save privately & add files' });
  const event = new Event('submit', { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'submitter', { value: button });
  fireEvent(button.closest('form'), event);
  await waitFor(() => expect(createProject).toHaveBeenCalledWith(expect.objectContaining({ name: 'Save first', is_public: false, is_for_sale: false })));
  expect(await screen.findByText('Attach files to saved project')).toBeInTheDocument();
  expect(localStorage.getItem('sidebuilds:project-draft:v1:seller-one')).toBeNull();
});

test('failed saves retain the draft for retry', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  createProject.mockRejectedValue(new Error('offline'));
  open();
  fireEvent.change(screen.getByLabelText('Project Name'), { target: { value: 'Keep my work' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create private project' }));
  await waitFor(() => expect(createProject).toHaveBeenCalled());
  expect(JSON.parse(localStorage.getItem('sidebuilds:project-draft:v1:seller-one')).fields.name).toBe('Keep my work');
  jest.restoreAllMocks();
});
