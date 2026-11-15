import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import Detail from '../../pages/ProjectDetailPage';
import Agreement from '../../pages/PurchaseAgreementPage';
import api, { getProjectById, expressInterestInProject } from '../../services/api';
jest.mock('../../services/api', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() }, getProjectById: jest.fn(), expressInterestInProject: jest.fn(), getDueDiligenceReport: jest.fn(), initiateProjectCheckout: jest.fn(), createCheckoutSessionForPurchaseRequest: jest.fn() }));
const mockBuyer = { user_id: 'buyer' };
jest.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: mockBuyer }) }));
jest.mock('../../components/SEO', () => () => null);
jest.mock('../../components/ProjectQA', () => () => null);
jest.mock('../../components/ProjectReviews', () => () => null);
const Position = () => { const location = useLocation(); return <output data-testid="position">{location.pathname + location.hash} {location.state?.inquiryDraft ? 'draft carried' : 'no carried draft'}</output>; };
test('an existing inquiry opens its exact conversation with an unsent draft, and sending clears the carried draft', async () => {
  getProjectById.mockResolvedValue({ project_id: 'fixture', name: 'Atlas', owner_id: 'seller', is_public: true, is_for_sale: true, sale_price: 5000 });
  expressInterestInProject.mockResolvedValue({ id: 12, existing: true });
  api.get.mockImplementation(path => Promise.resolve({ data: path.endsWith('/messages') ? { messages: [{ id: 'intro', content: 'Original inquiry', sender_username: 'buyer' }] } :
    { request_id: 12, role: 'buyer', project_id: 'fixture', project_name: 'Atlas', seller_username: 'seller', status: 'interest_expressed', can_edit: true, agreement: null, versions: [], checkout_available: false } }));
  api.post.mockResolvedValue({ data: { id: 'reply', content: 'Please explain the running costs.', sender_username: 'buyer' } });
  render(<MemoryRouter initialEntries={['/projects/fixture']}><Position/><Routes>
    <Route path="/projects/:id" element={<Detail/>}/><Route path="/purchase-agreement/:requestId" element={<Agreement/>}/>
  </Routes></MemoryRouter>);
  await screen.findByRole('heading', { name: 'Atlas' }); fireEvent.click(screen.getByRole('button', { name: 'Contact seller' }));
  fireEvent.change(screen.getByLabelText('Your message'), { target: { value: 'Please explain the running costs.' } }); fireEvent.click(screen.getByRole('button', { name: 'Send inquiry' }));
  await screen.findByText('Original inquiry');
  expect(screen.getByTestId('position')).toHaveTextContent('/purchase-agreement/12#purchase-conversation draft carried');
  expect(screen.getByLabelText('Your message')).toHaveValue('Please explain the running costs.'); expect(api.post).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
  await waitFor(() => expect(screen.getByTestId('position')).toHaveTextContent('no carried draft'));
  expect(screen.getByLabelText('Your message')).toHaveValue('');
  expect(api.post).toHaveBeenCalledTimes(1);
});
