import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import PurchasesPage from '../../pages/PurchasesPage';
import api, { getBuyerPurchaseRequests } from '../../services/api';

const mockUser = { user_id: 'buyer' };
jest.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock('../../components/SEO', () => () => null);
jest.mock('../../services/api', () => ({ __esModule: true, default: { post: jest.fn() }, getBuyerPurchaseRequests: jest.fn(), createCheckoutSessionForPurchaseRequest: jest.fn() }));
const purchase = { purchase_request_id: 1, project_id: 'project-a', project_name: 'Source-only purchase', seller_username: 'seller', offer_amount: 10.25,
  transaction_id: '11111111-1111-4111-8111-111111111111', status: 'assets_transferred_pending_buyer_confirmation', transaction_status: 'payment_completed', paid_amount: 10.25, escrow_status: 'held', request_date: '2026-11-09T12:00:00Z' };
const Position = () => { const location = useLocation(); return <output data-testid="position">{location.pathname + location.search}</output>; };
const open = () => render(<MemoryRouter initialEntries={['/purchases']}><Position /><Routes>
  <Route path="/purchases" element={<PurchasesPage />} /><Route path="/project-transfer" element={<p>Receipt review opened</p>} />
  <Route path="/purchase-agreement/:requestId" element={<p>Agreement opened</p>} />
</Routes></MemoryRouter>);
beforeEach(() => { jest.clearAllMocks(); getBuyerPurchaseRequests.mockResolvedValue([purchase]); });

test('purchase cards preserve cents and open receipt review without releasing funds', async () => {
  open(); await screen.findByText('Source-only purchase'); expect(screen.getAllByText('$10.25').length).toBeGreaterThan(0);
  fireEvent.click(screen.getByRole('button', { name: 'Review Transfer' }));
  expect(await screen.findByText('Receipt review opened')).toBeInTheDocument();
  expect(screen.getByTestId('position')).toHaveTextContent(`/project-transfer?transactionId=${purchase.transaction_id}`);
  expect(api.post).not.toHaveBeenCalled();
});

test('purchase statistics use paid transactions, count completed receipts and deduplicate negotiation attempts', async () => {
  const completed = { ...purchase, status: 'transfer_completed_buyer_confirmed', transaction_status: 'completed', escrow_status: 'released', transfer_completed: 1 };
  getBuyerPurchaseRequests.mockResolvedValue([completed, { ...completed, purchase_request_id: 4 },
    { ...purchase, purchase_request_id: 5, project_name: 'Unpaid', transaction_id: 'another-transaction', transaction_status: 'pending', status: 'payment_processing', escrow_status: null, paid_amount: 100 }]);
  open(); await screen.findByText('Unpaid');
  expect(screen.getByText('Total Spent').parentElement.parentElement).toHaveTextContent('$10.25');
  expect(screen.getByText('Completed Purchases').parentElement.parentElement).toHaveTextContent('1');
  expect(screen.getByText('Active / In Escrow').parentElement.parentElement).toHaveTextContent('1');
  fireEvent.click(screen.getAllByRole('button', { name: 'View transfer' })[0]);
  expect(await screen.findByText('Receipt review opened')).toBeInTheDocument();
  expect(api.post).not.toHaveBeenCalled();
});

test('pending and disputed purchases do not offer receipt release actions', async () => {
  getBuyerPurchaseRequests.mockResolvedValue([{ ...purchase, purchase_request_id: 2, project_name: 'Pending purchase', status: 'payment_processing', escrow_status: null },
    { ...purchase, purchase_request_id: 3, project_name: 'Disputed purchase', escrow_status: 'disputed' }]);
  open(); await screen.findByText('Pending purchase');
  expect(screen.queryByRole('button', { name: 'Review Transfer' })).not.toBeInTheDocument();
  expect(api.post).not.toHaveBeenCalled();
});

test('unpaid purchase actions open the agreement instead of creating a checkout session', async () => {
  getBuyerPurchaseRequests.mockResolvedValue([{ ...purchase, status: 'interest_expressed', escrow_status: null }]);
  open(); await screen.findByText('Source-only purchase'); fireEvent.click(screen.getByRole('button', { name: 'Review agreement' }));
  expect(await screen.findByText('Agreement opened')).toBeInTheDocument(); expect(api.post).not.toHaveBeenCalled();
});
