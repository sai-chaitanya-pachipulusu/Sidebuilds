import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom';
import PurchaseAgreementPage from '../../pages/PurchaseAgreementPage';
import api, { createCheckoutSessionForPurchaseRequest } from '../../services/api';

jest.mock('../../services/api', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(),put:jest.fn() }, createCheckoutSessionForPurchaseRequest: jest.fn() }));
jest.mock('../../components/ProjectFileUploader',()=>()=> <p>Private file uploader</p>);
jest.mock('../../components/SEO', () => () => null);
jest.mock('../../components/PurchaseConversation', () => () => <p id="purchase-conversation">Purchase conversation</p>);
const scope = { id: '11111111-1111-4111-8111-111111111111', version: 1, price_cents: 1025, included_items: ['Source code', 'Setup guide'],
    exclusions: 'No domain', running_costs: 'Buyer pays $12/month', handover_steps: 'Repository invite within two days', support_terms: 'Seven days of setup help', seller_approved_at: '2026-11-09', buyer_approved_at: null };
const review = { request_id: 12, role: 'buyer', project_id: 'project-a', project_name: 'Atlas', seller_username: 'seller', buyer_username: 'buyer',
    status: 'seller_accepted_pending_payment', suggested_price: 10.25, can_edit: true, can_checkout: false, checkout_started: false, agreement: scope, versions: [scope] };
const open = (path = '/purchase-agreement/12', controls = null) => render(<MemoryRouter initialEntries={[path]}>{controls}<Routes><Route path="/purchase-agreement/:requestId" element={<PurchaseAgreementPage />} /></Routes></MemoryRouter>);
beforeEach(() => { jest.clearAllMocks(); api.get.mockResolvedValue({ data: review }); api.post.mockResolvedValue({ data: { agreement: { ...scope, buyer_approved_at: '2026-11-09' } } }); });

test('buyer sees itemized scope and must explicitly approve before checkout appears', async () => {
    open(); await screen.findByText('Source code');
    expect(screen.getByText('$10.25')).toBeInTheDocument(); expect(screen.getByText('No domain')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Continue to payment' })).not.toBeInTheDocument();
    const approve = screen.getByRole('button', { name: 'Approve version 1' }); expect(approve).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox')); fireEvent.click(approve);
    expect(await screen.findByRole('button', { name: 'Continue to payment' })).toBeEnabled();
    expect(api.post).toHaveBeenCalledWith('/purchase-requests/12/agreement/approve', { agreement_id: scope.id, acknowledged: true });
    expect(createCheckoutSessionForPurchaseRequest).not.toHaveBeenCalled();
});

test('paused live checkout explains availability and cannot start a payment',async()=>{
    api.get.mockResolvedValue({data:{...review,can_checkout:true,checkout_available:false,checkout_message:'Payments are paused while we validate the purchase service.'}});
    open();expect(await screen.findByRole('button',{name:'Continue to payment'})).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Payments are paused');
    expect(createCheckoutSessionForPurchaseRequest).not.toHaveBeenCalled();
});

test('a paid seller can mark delivery without releasing the buyer funds',async()=>{
    api.get.mockResolvedValue({data:{...review,role:'seller',can_edit:false,status:'payment_completed_pending_transfer',payment:{transaction_id:'paid-transaction',status:'payment_completed',escrow_status:'held'}}});
    api.put.mockResolvedValue({data:{}});
    open();const button=await screen.findByRole('button',{name:'Mark agreed handover delivered'});fireEvent.click(button);
    expect(await screen.findByText(/Handover marked delivered/)).toBeInTheDocument();
    expect(api.put).toHaveBeenCalledWith('/purchase-requests/12/transfer-status',{status:'assets_transferred_pending_buyer_confirmation'});
    expect(api.post).not.toHaveBeenCalled();expect(createCheckoutSessionForPurchaseRequest).not.toHaveBeenCalled();
});

test('paid buyers have the exact receipt link and load private files on demand',async()=>{
    api.get.mockImplementation(path=>Promise.resolve({data:path.startsWith('/files/')?{files:[{file_id:'file-a',original_name:'handover.txt'}]}:{...review,can_edit:false,payment:{transaction_id:'paid-transaction',status:'payment_completed',escrow_status:'held'}}}));
    open();expect(await screen.findByRole('link',{name:'Review handover and receipt'})).toHaveAttribute('href','/project-transfer?transactionId=paid-transaction');
    expect(api.get).toHaveBeenCalledTimes(1);fireEvent.click(screen.getByRole('button',{name:'Show shared files'}));
    expect(await screen.findByText('handover.txt')).toBeInTheDocument();expect(api.get).toHaveBeenCalledWith('/files/project/project-a');
});

test('buyer without a seller scope has discussion and no approval or payment action', async () => {
    api.get.mockResolvedValue({ data: { ...review, agreement: null, versions: [] } });
    open(); await screen.findByText(/Waiting for the seller/);
    expect(screen.getByRole('link', { name: 'Discuss or request changes' })).toHaveAttribute('href', '#purchase-conversation');
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument(); expect(api.post).not.toHaveBeenCalled();
});

test('seller publishes itemized terms with price cents and does not fabricate buyer approval', async () => {
    api.get.mockResolvedValue({ data: { ...review, role: 'seller', agreement: null, versions: [] } });
    api.post.mockResolvedValue({ data: { agreement: scope } });
    open(); await screen.findByLabelText('Purchase price (USD)');
    fireEvent.change(screen.getByLabelText(/Included deliverables/), { target: { value: 'Source code\nSetup guide' } });
    for (const [label, value] of [['Excluded from this purchase', 'No domain'], ['Ongoing costs & who pays', '$12/month, buyer pays'], ['Handover steps & timing', 'Within two days'], ['Support after handover', 'None']]) {
        fireEvent.change(screen.getByLabelText(label), { target: { value } });
    }
    fireEvent.click(screen.getByRole('button', { name: 'Publish scope & approve as seller' }));
    expect(await screen.findByText(/Scope published and approved by you/)).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith('/purchase-requests/12/agreement', expect.objectContaining({ base_version: 0, price_cents: 1025, included_items: ['Source code', 'Setup guide'], support_terms: 'None' }));
    expect(screen.getByText('Buyer: approval pending')).toBeInTheDocument();
});

test('a failed revision retains the entered scope and repeated submission is prevented', async () => {
    api.get.mockResolvedValue({ data: { ...review, role: 'seller' } });
    let reject;
    api.post.mockImplementationOnce(() => new Promise((_, fail) => { reject = fail; }));
    open(); await screen.findByText('Source code'); fireEvent.click(screen.getByRole('button', { name: 'Revise scope' }));
    fireEvent.change(screen.getByLabelText('Support after handover'), { target: { value: 'Two weeks of support' } });
    fireEvent.click(screen.getByRole('button', { name: 'Publish scope & approve as seller' }));
    fireEvent.click(screen.getByRole('button', { name: 'Publishing…' })); expect(api.post).toHaveBeenCalledTimes(1);
    await act(async () => reject(new Error('Connection interrupted')));
    expect(await screen.findByRole('alert')).toHaveTextContent('Connection interrupted');
    expect(screen.getByLabelText('Support after handover')).toHaveValue('Two weeks of support');
});

test('stale approval is rejected without opening checkout and latest scope can be loaded', async () => {
    api.post.mockRejectedValueOnce({ response: { status: 409, data: { error: 'The agreement changed. Read the latest version before approving.' } } });
    open(); await screen.findByText('Source code'); fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Approve version 1' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('agreement changed');
    expect(screen.queryByRole('button', { name: 'Continue to payment' })).not.toBeInTheDocument();
    api.get.mockResolvedValueOnce({ data: { ...review, agreement: { ...scope, version: 2, id: 'version-2' }, versions: [{ ...scope, version: 2 }, scope] } });
    fireEvent.click(screen.getByRole('button', { name: 'Reload latest agreement' }));
    expect(await screen.findByRole('button', { name: 'Approve version 2' })).toBeDisabled();
});

test('checkout forwards the approved version, prevents duplicate clicks and exposes retry failures', async () => {
    api.get.mockResolvedValue({ data: { ...review, can_checkout: true, agreement: { ...scope, buyer_approved_at: '2026-11-09' } } });
    let reject;
    createCheckoutSessionForPurchaseRequest.mockImplementationOnce(() => new Promise((_, fail) => { reject = fail; }));
    open(); fireEvent.click(await screen.findByRole('button', { name: 'Continue to payment' }));
    fireEvent.click(screen.getByRole('button', { name: 'Opening checkout…' }));
    expect(createCheckoutSessionForPurchaseRequest).toHaveBeenCalledTimes(1);
    const args = createCheckoutSessionForPurchaseRequest.mock.calls[0];
    expect(args[0]).toBe('12'); expect(args[2]).toBe(scope.id);
    await act(async () => reject({ error: 'Refresh the agreement before payment.' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Refresh the agreement before payment.');
});

test('locked and historical scopes remain readable without revision or new approval controls', async () => {
    const latest = { ...scope, version: 2, buyer_approved_at: '2026-11-09' };
    api.get.mockResolvedValue({ data: { ...review, role: 'seller', can_edit: false, checkout_started: true, agreement: latest, versions: [latest, scope] } });
    open(); await screen.findByText('Checkout has started. This purchase scope is locked.');
    expect(screen.getByText('Read version 1 · buyer did not approve')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Revise scope' })).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
});

test('invalid links do not load a purchase; failed reads can be retried', async () => {
    const first = open('/purchase-agreement/invalid'); await screen.findByRole('alert'); expect(api.get).not.toHaveBeenCalled(); first.unmount();
    api.get.mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce({ data: review });
    open(); await screen.findByRole('alert'); fireEvent.click(screen.getByRole('button', { name: 'Retry agreement' }));
    expect(await screen.findByText('Source code')).toBeInTheDocument();
});

test('a stale response from another purchase cannot overwrite the current agreement', async () => {
    let resolveOld;
    api.get.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }));
    const Switch = () => { const navigate = useNavigate(); return <button onClick={() => navigate('/purchase-agreement/13')}>Switch purchase</button>; };
    api.get.mockResolvedValueOnce({ data: { ...review, request_id: 13, project_name: 'Current project' } });
    open('/purchase-agreement/12', <Switch />); fireEvent.click(screen.getByText('Switch purchase'));
    await screen.findByText('Current project'); await act(async () => resolveOld({ data: review }));
    expect(screen.queryByText('Atlas')).not.toBeInTheDocument();
});

test('conversation deep links scroll to the discussion after asynchronous loading', async () => {
    const original = Element.prototype.scrollIntoView;
    const scrolledIds = [];
    Element.prototype.scrollIntoView = jest.fn(function () { scrolledIds.push(this.id); });
    try {
        open('/purchase-agreement/12#purchase-conversation'); await screen.findByText('Source code');
        expect(scrolledIds).toContain('purchase-conversation');
    } finally { Element.prototype.scrollIntoView = original; }
});
