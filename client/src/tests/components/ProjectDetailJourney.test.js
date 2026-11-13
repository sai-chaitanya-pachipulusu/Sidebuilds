import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import ProjectDetailPage from '../../pages/ProjectDetailPage';
import { getProjectById, getDueDiligenceReport, initiateProjectCheckout } from '../../services/api';

let mockUser = null;
jest.mock('../../services/api', () => ({ getProjectById: jest.fn(), getDueDiligenceReport: jest.fn().mockResolvedValue({}), initiateProjectCheckout: jest.fn() }));
jest.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock('../../components/SEO', () => () => null);
jest.mock('../../components/ProjectQA', () => () => null);
jest.mock('../../components/ProjectReviews', () => () => null);
jest.mock('../../components/PaymentMethodSelector', () => () => null);
const Position = () => { const location = useLocation(); return <output data-testid="destination">{location.pathname + location.search}</output>; };
const open = () => render(<MemoryRouter initialEntries={[{ pathname: '/projects/fixture', state: { marketplaceSearch: '/marketplace?q=Atlas&minPrice=10.25' } }]}>
  <Position /><Routes><Route path="/projects/:id" element={<ProjectDetailPage />} /><Route path="*" element={<p>Destination</p>} /></Routes>
</MemoryRouter>);
beforeEach(() => {
  mockUser = null;
  getDueDiligenceReport.mockResolvedValue({});
  jest.clearAllMocks();
  getProjectById.mockResolvedValue({ project_id: 'fixture', name: 'Atlas', owner_id: 'seller', is_public: true, is_for_sale: true, sale_price: '10.25', is_verified: 0,
    tech_stack: ['React'], stage_details: { included_assets: 'Source and docs', running_costs: '$12/month', setup_handoff: 'Use the README' } });
});

test('detail price keeps cents and Back to results restores the exact search', async () => {
  open(); await screen.findByRole('heading', { name: 'Atlas' });
  expect(screen.getByText('$10.25', { exact: true })).toBeInTheDocument();
  expect(screen.getByText('Source and docs')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Back to results' }));
  expect(screen.getByTestId('destination')).toHaveTextContent('/marketplace?q=Atlas&minPrice=10.25');
});

test('a guest signs in before composing an offer and retains the project destination', async () => {
  open(); await screen.findByRole('heading', { name: 'Atlas' });
  fireEvent.click(screen.getByRole('button', { name: 'Make Offer' }));
  expect(screen.getByTestId('destination')).toHaveTextContent('/login?next=%2Fprojects%2Ffixture%3FshowInterest%3Dtrue');
});

test('starting a purchase opens the shared agreement without requesting a payment method', async () => {
  mockUser = { user_id: 'buyer' }; initiateProjectCheckout.mockResolvedValueOnce({ purchase_request_id: 12 });
  open(); await screen.findByRole('heading', { name: 'Atlas' });
  fireEvent.click(screen.getByRole('button', { name: 'Start purchase • $10.25' }));
  await waitFor(() => expect(screen.getByTestId('destination')).toHaveTextContent('/purchase-agreement/12'));
  expect(initiateProjectCheckout).toHaveBeenCalledTimes(1);
});

test('a PostgreSQL boolean hold blocks a new checkout and offers the existing purchase route',async()=>{
  getProjectById.mockResolvedValue({project_id:'fixture',name:'Reserved project',owner_id:'seller',is_public:true,is_for_sale:true,is_on_hold:true,sale_price:10.25});
  open();await screen.findByRole('heading',{name:'Reserved project'});
  expect(screen.getByText('Checkout or handover in progress')).toBeInTheDocument();
  expect(screen.queryByRole('button',{name:/Start purchase/})).not.toBeInTheDocument();
  expect(screen.getByRole('link',{name:'Open my purchases'})).toHaveAttribute('href','/purchases');
});

test('public buyer reports load on demand and remain available when switching tabs', async () => {
  getDueDiligenceReport.mockResolvedValue({ strengths: ['Clear handover scope'] });
  open(); await screen.findByRole('heading', { name: 'Atlas' });
  expect(getDueDiligenceReport).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'AI Insights' }));
  expect(await screen.findByText('Clear handover scope')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Overview' }));
  fireEvent.click(screen.getByRole('button', { name: 'AI Insights' }));
  await screen.findByText('Clear handover scope');
  expect(getDueDiligenceReport).toHaveBeenCalledTimes(1);
});

test('private projects explain report availability without making a public report request', async () => {
  getProjectById.mockResolvedValue({ project_id: 'fixture', name: 'Private draft', is_public: 0 });
  open(); await screen.findByRole('heading', { name: 'Private draft' });
  fireEvent.click(screen.getByRole('button', { name: 'AI Insights' }));
  expect(await screen.findByText(/Buyer reports are available for public listings/)).toBeInTheDocument();
  expect(getDueDiligenceReport).not.toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: 'Retry report' })).not.toBeInTheDocument();
});

test('a failed buyer report can be retried without hiding the project', async () => {
  getDueDiligenceReport.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ strengths: ['Recovered report'] });
  open(); await screen.findByRole('heading', { name: 'Atlas' });
  fireEvent.click(screen.getByRole('button', { name: 'AI Insights' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('project details are still available');
  fireEvent.click(screen.getByRole('button', { name: 'Retry report' }));
  expect(await screen.findByText('Recovered report')).toBeInTheDocument();
  await waitFor(() => expect(getDueDiligenceReport).toHaveBeenCalledTimes(2));
});
