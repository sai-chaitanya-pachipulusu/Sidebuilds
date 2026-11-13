import React from 'react';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import api from '../../services/api';
import Page from '../../pages/AdminOperationsPage';
import {MemoryRouter} from 'react-router-dom';
jest.mock('../../services/api',()=>({__esModule:true,default:{get:jest.fn(),post:jest.fn()}}));
jest.mock('../../components/SEO',()=>()=>null);
beforeEach(()=>{jest.clearAllMocks();});
const readiness={checkedAt:'2026-11-13T07:10:00Z',checkoutEnabled:false,providerConfigured:true,providerMode:'live',emailConfigured:false,listings:[],hasMore:false};
test('the operations view shows real queue data and sends only the selected original event for replay',async()=>{
 api.get.mockImplementation(path=>Promise.resolve({data:path.endsWith('/readiness')?readiness:path.endsWith('/events')?{events:[{event_id:'evt_test_1',event_type:'checkout.session.completed',status:'failed',error_code:'PROCESSING_FAILED'}]}:{issues:[{transaction_id:'t1',project_name:'Review purchase',buyer_username:'buyer',seller_username:'seller',amount:10.25,refunded_amount:10.25,status:'refund_review',escrow_status:'refunded',dispute_reason:'charge.refunded',stripe_payment_intent_id:'pi_test_1'}],reservations:[]}}));
 api.post.mockResolvedValue({data:{success:true}});render(<MemoryRouter><Page/></MemoryRouter>);
 expect(await screen.findByText('Review purchase')).toBeInTheDocument();expect(screen.getByRole('link',{name:'Open payment in Stripe'})).toHaveAttribute('href','https://dashboard.stripe.com/payments/pi_test_1');
 fireEvent.click(screen.getByRole('button',{name:'Retry original Stripe event'}));await waitFor(()=>expect(api.post).toHaveBeenCalledWith('/webhooks/replay/evt_test_1'));
});
test('ordinary accounts get a clear denied state without operational data',async()=>{
 api.get.mockRejectedValue({response:{status:403}});render(<MemoryRouter><Page/></MemoryRouter>);expect(await screen.findByRole('alert')).toHaveTextContent('Administrator access is required');expect(screen.queryByText('Purchase review queue')).not.toBeInTheDocument();
});
test('refund reconciliation requests verification of the selected purchase without a refund action',async()=>{
 api.get.mockImplementation(path=>Promise.resolve({data:path.endsWith('/readiness')?readiness:path.endsWith('/events')?{events:[]}:{issues:[{transaction_id:'refund-a',project_name:'Refund review',amount:10.25,refunded_amount:10.25,status:'refund_review',escrow_status:'refunded'}],reservations:[]}}));
 api.post.mockResolvedValue({data:{success:true}});render(<MemoryRouter><Page/></MemoryRouter>);fireEvent.click(await screen.findByRole('button',{name:'Verify refund and seller reversal'}));await waitFor(()=>expect(api.post).toHaveBeenCalledWith('/webhooks/issues/refund-a/reconcile'));
});

test('empty queues show a separate live readiness check and specific seller actions',async()=>{
 api.get.mockImplementation(path=>Promise.resolve({data:path.endsWith('/readiness')?{...readiness,listings:[
  {projectId:'live-project',name:'Live seller project',paymentStatus:'ready',missingInformation:[]},
  {projectId:'old-project',name:'Old seller project',paymentStatus:'reconnect_required',missingInformation:['Included assets','Running costs']}
 ]}:path.endsWith('/events')?{events:[]}:{issues:[],reservations:[]}}));
 render(<MemoryRouter><Page/></MemoryRouter>);
 expect(await screen.findByText('Reconnect required')).toBeInTheDocument();expect(screen.getByText('Paused')).toBeInTheDocument();
 expect(screen.getByText('Live payments')).toBeInTheDocument();expect(screen.getByText('Unavailable')).toBeInTheDocument();
 expect(screen.getByRole('link',{name:'Old seller project'})).toHaveAttribute('href','/projects/old-project');
 expect(screen.getByText(/Included assets · Running costs/)).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'Refresh checks'}));await waitFor(()=>expect(api.get.mock.calls.filter(([path])=>path==='/webhooks/readiness').length).toBe(2));
});
test('a failed readiness check keeps the review queues available and never claims a green launch',async()=>{
 api.get.mockImplementation(path=>path.endsWith('/readiness')?Promise.reject(new Error('Outage')):Promise.resolve({data:path.endsWith('/events')?{events:[]}:{issues:[],reservations:[]}}));
 render(<MemoryRouter><Page/></MemoryRouter>);
 expect(await screen.findByText(/Launch checks are unavailable/)).toBeInTheDocument();
 expect(screen.getByText('No purchases currently need issue review.')).toBeInTheDocument();expect(screen.queryByText('Ready')).not.toBeInTheDocument();
});
