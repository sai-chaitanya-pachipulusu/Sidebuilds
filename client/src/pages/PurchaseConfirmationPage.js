import React,{useEffect,useState} from 'react';
import {Link,useLocation} from 'react-router-dom';
import {getTransactionStatus} from '../services/api';
import SEO from '../components/SEO';
const money=value=>Number.isFinite(Number(value))?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(value)):'Awaiting confirmation';
export default function PurchaseConfirmationPage(){
 const session=new URLSearchParams(useLocation().search).get('session_id');
 const [transaction,setTransaction]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{let active=true,timer;let attempts=0;setLoading(true);setError('');setTransaction(null);
  async function load(){
   if(!/^cs_(test|live)_[A-Za-z0-9]+$/.test(session||'')){setError('Open this purchase from your purchase history. This payment link is incomplete.');setLoading(false);return;}
   try{const record=await getTransactionStatus(session);if(!record?.transaction_id)throw new Error('The purchase record could not be verified.');if(active){setTransaction(record);setLoading(false);}}
   catch(e){if(!active)return;if((e.response?.status||e.status)===404&&++attempts<5){timer=setTimeout(load,1500);return;}setLoading(false);setError('Payment confirmation is not available yet. Do not pay again. Refresh the status or check your purchases.');}
  }load();return()=>{active=false;clearTimeout(timer);};
 },[session,retry]);
 const completed=transaction?.status==='completed'&&transaction.escrow_status==='released'&&(transaction.transfer_completed===true||transaction.transfer_completed===1);
 const paid=transaction?.status==='payment_completed'&&transaction.escrow_status==='held';
 const refunded=transaction?.status==='refunded';
 return <div className="max-w-4xl mx-auto px-5 py-14 sm:py-20"><SEO title="Payment confirmation" noindex description="Check your payment status and continue the agreed handover."/>
 <p className="font-mono text-emerald-300 text-xs uppercase tracking-widest mb-5">Your purchase</p>
 <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">{loading?'Checking your payment…':completed?'Purchase completed':refunded?'Payment refunded':paid?'Payment confirmed. Handover comes next.':'Payment status needs review'}</h1>
 {loading?<p role="status" className="mt-6 text-gray-400">Waiting for the payment record. Please keep this page open; do not pay again.</p>:error?<div role="alert" className="mt-8 border border-amber-300/30 p-5 text-amber-100"><p>{error}</p><button className="mt-4 underline" onClick={()=>setRetry(value=>value+1)}>Refresh payment status</button></div>:transaction&&<>
 <p className="text-gray-400 mt-6 max-w-2xl">{completed?'Your receipt confirmation and seller transfer have been recorded.':refunded?'Stripe has recorded a refund for this purchase. Receipt confirmation is unavailable. Check your purchase conversation for the record.':paid?'The payment is recorded. Follow the approved purchase scope with the seller, review the handover and confirm receipt only after receiving what was agreed.':'This purchase needs review before it can continue. Keep receipt unconfirmed and check your purchase conversation.'}</p>
 <section className="mt-10 border-y border-white/15 py-7"><h2 className="text-2xl font-semibold mb-6">{transaction.project_name}</h2><dl className="grid sm:grid-cols-3 gap-6">{[['Purchase amount',transaction.amount],['Platform fee',transaction.commission_amount],['Recorded seller amount',transaction.seller_amount]].map(([label,value])=><div key={label}><dt className="text-sm text-gray-400">{label}</dt><dd className="text-xl mt-2">{money(value)}</dd></div>)}</dl></section>
 <p className="text-sm text-gray-400 mt-6">{completed?'You can return to the agreement for the purchase record and conversation.':'Use the agreement’s handover steps, timing, exclusions and support terms. A payment confirmation does not confirm delivery or transfer project ownership.'}</p>
 <div className="flex flex-wrap gap-4 mt-8">{transaction.purchase_request_id&&<Link className="bg-emerald-300 text-black font-semibold px-5 py-3" to={`/purchase-agreement/${transaction.purchase_request_id}`}>Continue agreed handover</Link>}<Link className="border border-white/25 px-5 py-3" to={`/project-transfer?transactionId=${transaction.transaction_id}`}>Review purchase and receipt</Link></div>
 </>}
 <Link to="/purchases" className="inline-block text-emerald-300 underline underline-offset-4 mt-9">Open purchase history</Link>
 </div>;
}
