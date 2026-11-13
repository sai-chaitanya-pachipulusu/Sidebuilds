import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CheckCircle, ArrowLeft, AlertTriangle } from 'lucide-react';
import SEO from '../components/SEO';
import { Button } from '../shadcn/ui/button';
import { Checkbox } from '../shadcn/ui/checkbox';
import { Label } from '../shadcn/ui/label';
import api from '../services/api';
import PurchaseScope from '../components/PurchaseScope';
import HandoverFiles from '../components/HandoverFiles';

const receiptChecks = [
    { id: 'deliverables', label: 'I received all deliverables agreed with the seller.' },
    { id: 'access', label: 'I checked access and setup for the project as agreed.' },
    { id: 'responsibilities', label: 'I reviewed the agreed exclusions, ongoing costs and support responsibilities.' }
];
const validId = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const price = value => Number.isFinite(Number(value)) ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(Number(value)) : 'Needs review';

export default function ProjectTransferPage() {
    const location = useLocation();
    const query = new URLSearchParams(location.search);
    const transactionId = location.state?.transactionId || query.get('transactionId');
    const requestedProjectId = location.state?.projectId || query.get('projectId');
    const context = `${transactionId}:${requestedProjectId || ''}`;
    const currentContext = useRef(context);
    currentContext.current = context;
    const [review, setReview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [retry, setRetry] = useState(0);
    const [checks, setChecks] = useState({});
    const [acknowledged, setAcknowledged] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const submitLock = useRef(false);
    const pageTop = useRef(null);

    useEffect(() => {
        pageTop.current?.scrollIntoView?.({ block: 'start' });
    }, [context]);

    useEffect(() => {
        let active = true;
        setReview(null); setLoadError(''); setSubmitError(''); setChecks({}); setAcknowledged(false);
        setSubmitting(false); submitLock.current = false;
        if (!validId(transactionId)) {
            setLoadError('This transfer link is incomplete or invalid. Open the purchase from your purchase history.');
            setLoading(false);
            return () => { active = false; };
        }
        setLoading(true);
        api.get(`/payments/transactions/${transactionId}/receipt-review`).then(({ data }) => {
            if (!active) return;
            if (data?.transaction_id !== transactionId || !data?.project_id) throw new Error('The returned purchase does not match this transfer link.');
            if (requestedProjectId && requestedProjectId !== data.project_id) throw new Error('This transfer link does not match the purchased project. Open the purchase from your history.');
            setReview(data);
        }).catch(error => {
            if (active) setLoadError(error.response?.status === 404 ? 'This purchase could not be found for your account.' : error.response?.data?.error || error.message || 'Receipt review could not be loaded. Please retry.');
        }).finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [transactionId, requestedProjectId, retry]);

    const ready = review?.can_confirm === true && receiptChecks.every(item => checks[item.id] === true) && acknowledged;
    const confirmReceipt = async event => {
        event.preventDefault();
        if (!ready || submitLock.current) return;
        submitLock.current = true;
        setSubmitting(true); setSubmitError('');
        try {
            const { data } = await api.post('/payments/confirm-receipt', { transactionId: review.transaction_id, receiptAcknowledged: true });
            if (currentContext.current !== context) return;
            if (!data?.success) throw new Error('Receipt confirmation could not be verified. Check the purchase status before retrying.');
            setReview(current => ({ ...current, can_confirm: false, completed: true }));
        } catch (error) {
            if (currentContext.current === context) setSubmitError(error.response?.data?.error || error.message || 'Receipt could not be confirmed. Your review is still here.');
        } finally {
            if (currentContext.current === context) { submitLock.current = false; setSubmitting(false); }
        }
    };

    return <div className="min-h-screen bg-black text-white px-4 py-12 sm:px-8">
        <SEO title="Review Project Transfer" description="Review your purchase agreement and confirm receipt of the agreed deliverables." />
        <div ref={pageTop} className="max-w-3xl mx-auto scroll-mt-24">
            <Link to="/purchases" className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-white mb-6"><ArrowLeft className="w-4 h-4" />Back to purchases</Link>
            <div className="border border-white/15 bg-gray-900/40 p-5 sm:p-8">
                <p className="font-mono text-xs uppercase tracking-widest text-emerald-300 mb-3">Purchase handover</p>
                <h1 className="text-3xl font-bold mb-3">Review your project transfer</h1>
                <p className="text-gray-400 mb-7">Confirm receipt after you have received and checked what you agreed to buy. Confirmation releases funds to the seller and completes the transfer.</p>
                {loading ? <p role="status" className="text-gray-300">Loading your purchase…</p> : loadError ? <div role="alert" className="border border-amber-400/30 p-4 text-amber-200">
                    <p>{loadError}</p>{validId(transactionId) && <Button type="button" variant="outline" className="mt-4" onClick={() => setRetry(value => value + 1)}>Retry receipt review</Button>}
                </div> : review && <>
                    <div className="border border-white/10 p-4 mb-6">
                        <h2 className="text-xl font-semibold break-words">{review.project_name}</h2>
                        <div className="mt-3 flex flex-wrap gap-x-8 gap-y-2 text-sm text-gray-300"><span>Seller: {review.seller_username}</span><span>Purchase amount: {price(review.amount)}</span></div>
                    </div>
                    {review.purchase_agreement && <section className="border border-emerald-300/25 p-4 sm:p-5 mb-6"><h2 className="text-lg font-semibold mb-4">Agreed purchase scope</h2><PurchaseScope agreement={review.purchase_agreement} /></section>}
                    <HandoverFiles key={review.project_id} projectId={review.project_id} />
                    {review.completed ? <div role="status" className="border border-emerald-300/30 p-5">
                        <CheckCircle className="w-6 h-6 text-emerald-300 mb-3" /><h2 className="text-xl font-semibold mb-2">Receipt confirmed</h2>
                        <p className="text-gray-300">This purchase transfer is complete.</p><Link to={`/projects/${review.project_id}`} className="text-emerald-300 underline underline-offset-4 inline-block mt-4">Open your project</Link>
                    </div> : <>
                        <section className="mb-6" aria-labelledby="agreement-title"><h2 id="agreement-title" className="text-lg font-semibold mb-2">{review.purchase_agreement ? 'Purchase conversation' : 'Recorded purchase message'}</h2>
                            {review.agreement_message ? <><p className="text-sm text-gray-400 mb-3">{review.purchase_agreement ? 'Additional context from the linked purchase request. Messages do not change the approved scope above.' : 'From the purchase request linked to this payment. Check your purchase conversation for any additional agreed details.'}</p>
                                <blockquote className="border-l-2 border-emerald-300 pl-4 py-2 text-gray-200 whitespace-pre-wrap break-words">{review.agreement_message}</blockquote></>
                                : !review.purchase_agreement && <p className="text-sm text-amber-200">No saved agreement message is linked to this payment. Review the agreed scope in your purchase conversation before confirming receipt.</p>}
                            {review.purchase_request_id && <Link to={`/purchase-agreement/${review.purchase_request_id}#purchase-conversation`} className="text-sm text-emerald-300 underline underline-offset-4 mt-4 inline-block">Discuss this purchase</Link>}
                        </section>
                        {!review.can_confirm ? <div role="status" className="border border-amber-400/30 p-4 text-amber-200">
                            <AlertTriangle className="w-5 h-5 mb-2" /><p>{review.message || 'This purchase is not ready for receipt confirmation.'}</p>
                            <Button type="button" variant="outline" className="mt-4" onClick={() => setRetry(value => value + 1)}>Refresh purchase status</Button>
                        </div> : <form onSubmit={confirmReceipt} className="space-y-6">
                            <section aria-labelledby="receipt-checks-title" className="border border-white/15 p-4 sm:p-5 space-y-4">
                                <h2 id="receipt-checks-title" className="text-lg font-semibold">Check what you agreed to receive</h2>
                                <p className="text-sm text-gray-400">Confirm your actual agreement, including any excluded assets. A project may not include a domain, social accounts or customer data.</p>
                                {receiptChecks.map(item => <div key={item.id} className="flex items-start gap-3">
                                    <Checkbox id={`receipt-${item.id}`} checked={checks[item.id] === true} disabled={submitting} onCheckedChange={value => setChecks(current => ({ ...current, [item.id]: value === true }))} className="mt-1" />
                                    <Label htmlFor={`receipt-${item.id}`} className="text-sm leading-relaxed cursor-pointer">{item.label}</Label>
                                </div>)}
                            </section>
                            <div className="border border-amber-400/25 p-4 text-sm text-gray-300"><h2 className="font-semibold text-white mb-2">Something is missing?</h2>
                                <p>Keep receipt unconfirmed. Return to purchases and use Report Issue to describe the problem before releasing funds.</p><Link to="/purchases" className="text-emerald-300 underline underline-offset-4 inline-block mt-3">Return to purchases</Link>
                            </div>
                            <div className="flex items-start gap-3 border-t border-white/15 pt-5"><Checkbox id="receipt-acknowledgement" checked={acknowledged} disabled={submitting} onCheckedChange={value => setAcknowledged(value === true)} className="mt-1" />
                                <Label htmlFor="receipt-acknowledgement" className="text-sm leading-relaxed cursor-pointer">I understand that confirming receipt releases funds to the seller and completes this transfer.</Label>
                            </div>
                            {submitError && <div role="alert" className="border border-amber-400/30 p-4 text-amber-200 text-sm"><p>{submitError}</p><button type="button" disabled={submitting} onClick={() => setRetry(value => value + 1)} className="mt-3 underline underline-offset-4">Refresh purchase status</button></div>}
                            <Button type="submit" disabled={!ready || submitting} className="w-full h-auto min-h-12 whitespace-normal py-3 px-4">{submitting ? 'Confirming receipt…' : 'Confirm receipt & release funds'}</Button>
                        </form>}
                    </>}
                </>}
            </div>
        </div>
    </div>;
}
