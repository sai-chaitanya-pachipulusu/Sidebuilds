import React from 'react';
import {render,screen,act} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import Page from '../../pages/PurchaseConfirmationPage';
import {getTransactionStatus} from '../../services/api';
jest.mock('../../services/api',()=>({getTransactionStatus:jest.fn()}));
jest.mock('../../components/SEO',()=>()=>null);
const record={transaction_id:'transaction-a',purchase_request_id:7,project_name:'Synthetic project',amount:10.25,commission_amount:.51,seller_amount:9.74,status:'payment_completed',escrow_status:'held',transfer_completed:false};
const open=()=>render(<MemoryRouter initialEntries={['/purchase/success?session_id=cs_test_fixture']}><Page/></MemoryRouter>);
beforeEach(()=>{getTransactionStatus.mockReset();});
test('verified payment leads to the exact agreement and does not claim completed ownership',async()=>{
 getTransactionStatus.mockResolvedValue(record);open();await screen.findByRole('heading',{name:'Payment confirmed. Handover comes next.'});
 expect(screen.getByRole('link',{name:'Continue agreed handover'})).toHaveAttribute('href','/purchase-agreement/7');
 expect(screen.getByRole('link',{name:'Review purchase and receipt'})).toHaveAttribute('href','/project-transfer?transactionId=transaction-a');
 expect(screen.getByText('$10.25')).toBeInTheDocument();expect(screen.getByText('$9.74')).toBeInTheDocument();expect(screen.queryByRole('heading',{name:'Purchase completed'})).not.toBeInTheDocument();
});
test('only a released, completed transfer is shown as a completed purchase',async()=>{
 getTransactionStatus.mockResolvedValue({...record,status:'completed',escrow_status:'released',transfer_completed:true});open();expect(await screen.findByRole('heading',{name:'Purchase completed'})).toBeInTheDocument();
});
test('a refunded purchase never offers receipt completion as its payment outcome',async()=>{
 getTransactionStatus.mockResolvedValue({...record,status:'refunded',escrow_status:'refunded',refunded_amount:10.25});open();expect(await screen.findByRole('heading',{name:'Payment refunded'})).toBeInTheDocument();expect(screen.queryByRole('heading',{name:'Purchase completed'})).not.toBeInTheDocument();
});
test('a delayed webhook is retried without treating the return URL as payment proof',async()=>{
 jest.useFakeTimers();getTransactionStatus.mockRejectedValueOnce({status:404}).mockResolvedValueOnce(record);
 try{open();await act(async()=>{});expect(screen.getByRole('status')).toHaveTextContent('do not pay again');await act(async()=>{jest.advanceTimersByTime(1500);});expect(screen.getByRole('heading',{name:'Payment confirmed. Handover comes next.'})).toBeInTheDocument();expect(getTransactionStatus).toHaveBeenCalledTimes(2);}
 finally{jest.useRealTimers();}
});
test('a provider/status error offers recovery without offering a second payment',async()=>{
 getTransactionStatus.mockRejectedValue({status:503});open();expect(await screen.findByRole('alert')).toHaveTextContent('Do not pay again');expect(screen.getByRole('button',{name:'Refresh payment status'})).toBeInTheDocument();expect(screen.queryByRole('button',{name:/pay now/i})).not.toBeInTheDocument();
});
