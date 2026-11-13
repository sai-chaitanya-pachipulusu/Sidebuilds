import React from 'react';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import api from '../../services/api';
import Page from '../../pages/AdminOperationsPage';
jest.mock('../../services/api',()=>({__esModule:true,default:{get:jest.fn(),post:jest.fn()}}));
jest.mock('../../components/SEO',()=>()=>null);
beforeEach(()=>{jest.clearAllMocks();});
test('the operations view shows real queue data and sends only the selected original event for replay',async()=>{
 api.get.mockImplementation(path=>Promise.resolve({data:path.endsWith('/events')?{events:[{event_id:'evt_test_1',event_type:'checkout.session.completed',status:'failed',error_code:'PROCESSING_FAILED'}]}:{issues:[{transaction_id:'t1',project_name:'Review purchase',buyer_username:'buyer',seller_username:'seller',amount:10.25,refunded_amount:10.25,status:'refund_review',escrow_status:'refunded',dispute_reason:'charge.refunded',stripe_payment_intent_id:'pi_test_1'}],reservations:[]}}));
 api.post.mockResolvedValue({data:{success:true}});render(<Page/>);
 expect(await screen.findByText('Review purchase')).toBeInTheDocument();expect(screen.getByRole('link',{name:'Open payment in Stripe'})).toHaveAttribute('href','https://dashboard.stripe.com/payments/pi_test_1');
 fireEvent.click(screen.getByRole('button',{name:'Retry original Stripe event'}));await waitFor(()=>expect(api.post).toHaveBeenCalledWith('/webhooks/replay/evt_test_1'));
});
test('ordinary accounts get a clear denied state without operational data',async()=>{
 api.get.mockRejectedValue({response:{status:403}});render(<Page/>);expect(await screen.findByRole('alert')).toHaveTextContent('Administrator access is required');expect(screen.queryByText('Purchase review queue')).not.toBeInTheDocument();
});
test('refund reconciliation requests verification of the selected purchase without a refund action',async()=>{
 api.get.mockImplementation(path=>Promise.resolve({data:path.endsWith('/events')?{events:[]}:{issues:[{transaction_id:'refund-a',project_name:'Refund review',amount:10.25,refunded_amount:10.25,status:'refund_review',escrow_status:'refunded'}],reservations:[]}}));
 api.post.mockResolvedValue({data:{success:true}});render(<Page/>);fireEvent.click(await screen.findByRole('button',{name:'Verify refund and seller reversal'}));await waitFor(()=>expect(api.post).toHaveBeenCalledWith('/webhooks/issues/refund-a/reconcile'));
});
