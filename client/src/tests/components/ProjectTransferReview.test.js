import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import ProjectTransferPage from '../../pages/ProjectTransferPage';
import api from '../../services/api';

jest.mock('../../services/api', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));
jest.mock('../../components/SEO', () => () => null);
const transactionId = '11111111-1111-4111-8111-111111111111';
const secondId = '22222222-2222-4222-8222-222222222222';
const review = { transaction_id: transactionId, project_id: 'project-a', project_name: 'Source-only project', seller_username: 'seller', amount: 10.25,
  status: 'payment_completed', escrow_status: 'held', can_confirm: true, completed: false, purchase_request_id: 12,
  agreement_message: 'Source code and documentation only. No domain, social accounts or customer data.' };
const open = (path = `/project-transfer?transactionId=${transactionId}`) => render(<MemoryRouter initialEntries={[path]}><ProjectTransferPage /></MemoryRouter>);
const acknowledge = () => screen.getAllByRole('checkbox').forEach(checkbox => fireEvent.click(checkbox));
beforeEach(() => { jest.clearAllMocks(); api.get.mockResolvedValue({ data: review }); api.post.mockResolvedValue({ data: { success: true } }); });

test('receipt review shows actual agreement and exact price without requiring excluded asset categories', async () => {
  open(); await screen.findByText('Source-only project');
  expect(screen.getByText(review.agreement_message)).toBeInTheDocument();
  expect(screen.getByText('Purchase amount: $10.25')).toBeInTheDocument();
  expect(screen.queryByRole('checkbox', { name: /Domain & DNS|Social Media Accounts|Customer List/ })).not.toBeInTheDocument();
  const confirm = screen.getByRole('button', { name: 'Confirm receipt & release funds' });
  expect(confirm).toBeDisabled(); acknowledge(); expect(confirm).toBeEnabled();
  fireEvent.click(confirm);
  expect(await screen.findByText('Receipt confirmed')).toBeInTheDocument();
  expect(api.post).toHaveBeenCalledWith('/payments/confirm-receipt', { transactionId, receiptAcknowledged: true });
});

test('receipt displays the frozen versioned scope when this payment has one', async () => {
  api.get.mockResolvedValue({ data: { ...review, agreement_message: null, purchase_agreement: { version: 2, price_cents: 1025, included_items: ['Frozen source deliverable'], exclusions: 'No domain', running_costs: 'Buyer pays hosting', handover_steps: 'Repository invitation', support_terms: 'None' } } });
  open(); await screen.findByText('Frozen source deliverable');
  expect(screen.getByText('VERSION 2')).toBeInTheDocument(); expect(screen.getByRole('link', { name: 'Discuss this purchase' })).toHaveAttribute('href', '/purchase-agreement/12#purchase-conversation');
  expect(screen.queryByText(/No saved agreement message/)).not.toBeInTheDocument();
});

test('missing transfer details offer purchase-history recovery and make no request', async () => {
  open('/project-transfer');
  expect(await screen.findByRole('alert')).toHaveTextContent('incomplete or invalid');
  expect(screen.getByRole('link', { name: 'Back to purchases' })).toHaveAttribute('href', '/purchases');
  expect(api.get).not.toHaveBeenCalled(); expect(api.post).not.toHaveBeenCalled();
});

test('loading failures can be retried and cannot expose a confirmation form', async () => {
  api.get.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ data: review });
  open(); await screen.findByRole('alert');
  expect(screen.queryByRole('button', { name: 'Confirm receipt & release funds' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Retry receipt review' }));
  expect(await screen.findByText('Source-only project')).toBeInTheDocument();
});

test.each(['Payment is still processing.', 'An issue is under review.'])('blocked purchase state prevents confirmation: %s', message => {
  api.get.mockResolvedValue({ data: { ...review, can_confirm: false, message } });
  return (async () => {
    open(); await screen.findByText(message); expect(screen.getByRole('status')).toHaveTextContent(message);
    expect(screen.queryByRole('button', { name: 'Confirm receipt & release funds' })).not.toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  })();
});

test('a mismatched project in an old transfer link cannot confirm the wrong purchase', async () => {
  open(`/project-transfer?transactionId=${transactionId}&projectId=other-project`);
  expect(await screen.findByRole('alert')).toHaveTextContent('does not match the purchased project');
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
});

test('repeated clicks submit once and a failed confirmation retains the review for retry', async () => {
  let reject;
  api.post.mockImplementationOnce(() => new Promise((_, fail) => { reject = fail; }));
  open(); await screen.findByText('Source-only project'); acknowledge();
  fireEvent.click(screen.getByRole('button', { name: 'Confirm receipt & release funds' }));
  const pending = screen.getByRole('button', { name: 'Confirming receipt…' });
  expect(pending).toBeDisabled(); fireEvent.click(pending); expect(api.post).toHaveBeenCalledTimes(1);
  await act(async () => reject(new Error('Connection interrupted. Check purchase status.')));
  expect(await screen.findByRole('alert')).toHaveTextContent('Connection interrupted');
  for (const checkbox of screen.getAllByRole('checkbox')) expect(checkbox).toBeChecked();
  fireEvent.click(screen.getByRole('button', { name: 'Confirm receipt & release funds' }));
  expect(await screen.findByText('Receipt confirmed')).toBeInTheDocument();
});

test('completed purchases show their completed state and cannot be resubmitted', async () => {
  api.get.mockResolvedValue({ data: { ...review, can_confirm: false, completed: true } });
  open(); expect(await screen.findByText('Receipt confirmed')).toBeInTheDocument();
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument(); expect(api.post).not.toHaveBeenCalled();
});

test('late receipt data from a previous transaction cannot replace the current purchase', async () => {
  let resolveOld;
  api.get.mockImplementation(url => url.includes(secondId) ? Promise.resolve({ data: { ...review, transaction_id: secondId, project_name: 'Second purchase' } }) : new Promise(resolve => { resolveOld = resolve; }));
  const Harness = () => { const navigate = useNavigate(); return <><button onClick={() => navigate(`/project-transfer?transactionId=${secondId}`)}>Open second purchase</button><ProjectTransferPage /></>; };
  render(<MemoryRouter initialEntries={[`/project-transfer?transactionId=${transactionId}`]}><Harness /></MemoryRouter>);
  await waitFor(() => expect(resolveOld).toBeDefined());
  fireEvent.click(screen.getByRole('button', { name: 'Open second purchase' }));
  await screen.findByText('Second purchase');
  await act(async () => resolveOld({ data: review }));
  expect(screen.queryByText('Source-only project')).not.toBeInTheDocument();
});
