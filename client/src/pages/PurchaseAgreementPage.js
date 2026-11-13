import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import api, { createCheckoutSessionForPurchaseRequest } from '../services/api';
import SEO from '../components/SEO';
import PurchaseScope from '../components/PurchaseScope';
import PurchaseConversation from '../components/PurchaseConversation';
import HandoverFiles from '../components/HandoverFiles';
import ProjectFileUploader from '../components/ProjectFileUploader';
import { Button } from '../shadcn/ui/button';

const textFields = [['exclusions', 'Excluded from this purchase', 'List assets or rights that stay with you. Write None if nothing is excluded.'],
    ['running_costs', 'Ongoing costs & who pays', 'Hosting, services and subscriptions the buyer will need, or None.'],
    ['handover_steps', 'Handover steps & timing', 'How and when each deliverable will reach the buyer.'],
    ['support_terms', 'Support after handover', 'What help you will provide, for how long, or None.']];
const emptyDraft = { price: '', included_items: '', exclusions: '', running_costs: '', handover_steps: '', support_terms: '' };
const errorText = error => error.response?.data?.error || error.error || error.message || 'This action could not be completed. Please retry.';
function scopeDraft(data) {
    const scope = data.agreement;
    return scope ? { ...scope, price: (scope.price_cents / 100).toFixed(2), included_items: scope.included_items.join('\n') }
        : { ...emptyDraft, price: data.suggested_price ? Number(data.suggested_price).toFixed(2) : '' };
}

export default function PurchaseAgreementPage() {
    const { requestId } = useParams();
    const { hash } = useLocation();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [retry, setRetry] = useState(0);
    const [draft, setDraft] = useState(emptyDraft);
    const [editing, setEditing] = useState(false);
    const [acknowledged, setAcknowledged] = useState(false);
    const [pending, setPending] = useState('');
    const [actionError, setActionError] = useState('');
    const [notice, setNotice] = useState('');
    const lock = useRef(false);
    const pageTop = useRef(null);
    const validRequest = /^[1-9]\d*$/.test(requestId || '') && Number.isSafeInteger(Number(requestId));
    const loadedRequest = data?.request_id;
    const context = useRef(requestId);
    context.current = requestId;
    useEffect(() => { pageTop.current?.scrollIntoView?.({ block: 'start' }); }, [requestId]);
    useEffect(() => {
        if (!loading && loadedRequest && hash === '#purchase-conversation') document.getElementById('purchase-conversation')?.scrollIntoView?.({ block: 'start' });
    }, [loading, loadedRequest, hash]);
    useEffect(() => {
        let active = true;
        setData(null); setLoading(true); setLoadError(''); setActionError(''); setAcknowledged(false); setPending(''); lock.current = false;
        if (!validRequest) { setLoadError('Open a purchase agreement from your purchases or seller dashboard.'); setLoading(false); return; }
        api.get(`/purchase-requests/${requestId}/agreement`).then(({ data: result }) => {
            if (!active) return;
            if (String(result.request_id) !== requestId) throw new Error('The agreement does not match this purchase.');
            setData(result); setDraft(scopeDraft(result)); setEditing(result.role === 'seller' && !result.agreement && result.can_edit);
        }).catch(error => { if (active) setLoadError(errorText(error)); }).finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [requestId, validRequest, retry]);

    const action = async (name, work) => {
        if (lock.current) return;
        lock.current = true; setPending(name); setActionError(''); setNotice('');
        try { await work(); }
        catch (error) { if (context.current === requestId) setActionError(errorText(error)); }
        finally { if (context.current === requestId) { lock.current = false; setPending(''); } }
    };
    const publish = event => {
        event.preventDefault();
        const priceCents = Math.round(Number(draft.price) * 100);
        if (!/^\d+(\.\d{1,2})?$/.test(draft.price) || priceCents < 50 || priceCents > 99999999) { setActionError('Set a USD price between $0.50 and $999,999.99 with at most two decimal places.'); return; }
        action('publish', async () => {
            const { data: result } = await api.post(`/purchase-requests/${requestId}/agreement`, { ...draft, price_cents: priceCents,
                included_items: draft.included_items.split('\n').map(item => item.trim()).filter(Boolean), base_version: data.agreement?.version || 0 });
            if (context.current !== requestId) return;
            setData(current => ({ ...current, agreement: result.agreement, versions: [result.agreement, ...current.versions], can_checkout: false }));
            setEditing(false); setAcknowledged(false); setNotice('Scope published and approved by you. Waiting for the buyer to review this version.');
        });
    };
    const approve = () => {
        if (!acknowledged) return;
        action('approve', async () => {
            const { data: result } = await api.post(`/purchase-requests/${requestId}/agreement/approve`, { agreement_id: data.agreement.id, acknowledged: true });
            if (context.current !== requestId) return;
            setData(current => ({ ...current, agreement: result.agreement, versions: current.versions.map(version => version.id === result.agreement.id ? result.agreement : version), can_checkout: true }));
            setAcknowledged(false); setNotice('Both parties approved this version. You can continue to payment when ready.');
        });
    };
    const checkout = () => action('checkout', async () => {
        const result = await createCheckoutSessionForPurchaseRequest(requestId, window.crypto?.randomUUID?.(), data.agreement.id);
        if (context.current !== requestId) return;
        // A timed-out redirect must not leave a locally editable scope after the server starts checkout.
        setData(current => ({ ...current, can_edit: false, checkout_started: true }));
        if (!result.url) throw new Error('No checkout link was returned. Refresh the agreement before retrying.');
        window.location.assign(result.url);
    });

    return <div className="min-h-screen bg-black text-white px-4 py-10 sm:px-8"><SEO title="Purchase Agreement" description="Review the deliverables, costs and handover scope before payment." />
        <div ref={pageTop} className="max-w-5xl mx-auto scroll-mt-24">
            <Link to={data?.role === 'seller' ? '/dashboard' : '/purchases'} className="text-sm text-gray-300 underline underline-offset-4">{data?.role === 'seller' ? 'Back to seller dashboard' : 'Back to purchases'}</Link>
            <header className="mt-8 mb-8 border-b border-white/15 pb-7"><p className="text-emerald-300 font-mono text-xs uppercase tracking-widest mb-3">01 Agree scope · 02 Pay · 03 Review handover</p>
                <h1 className="text-3xl sm:text-4xl font-bold mb-3">Know what changes hands.</h1><p className="max-w-2xl text-gray-400">A shared record of this purchase. The seller publishes a scope; the buyer approves the same version before checkout.</p>
            </header>
            {loading ? <p role="status">Loading purchase agreement…</p> : loadError ? <div role="alert" className="border border-amber-300/30 p-5"><p>{loadError}</p>{validRequest && <Button className="mt-4" onClick={() => setRetry(value => value + 1)}>Retry agreement</Button>}</div> : data && <>
                <div className="grid md:grid-cols-[minmax(0,1fr)_260px] gap-6 items-start">
                    <div className="min-w-0 border border-white/15 p-5 sm:p-7">
                        <p className="text-sm text-gray-400 mb-2">{data.role === 'seller' ? `Buyer: ${data.buyer_username}` : `Seller: ${data.seller_username}`}</p>
                        <h2 className="text-2xl font-semibold break-words mb-6">{data.project_name}</h2>
                        {editing ? <form onSubmit={publish} className="space-y-5">
                            <p className="text-sm text-gray-400">Be specific. Publishing approves this version as the seller. Every revision needs a new buyer approval.</p>
                            <div><label htmlFor="agreement-price" className="block text-sm mb-2">Purchase price (USD)</label><input id="agreement-price" type="number" min="0.50" max="1000000" step="0.01" required value={draft.price} disabled={Boolean(pending)} onChange={event => setDraft(current => ({ ...current, price: event.target.value }))} className="w-full border border-white/20 bg-black p-3 focus:border-emerald-300 focus:outline-none" /></div>
                            <div><label htmlFor="agreement-items" className="block text-sm mb-2">Included deliverables — one per line</label><textarea id="agreement-items" rows={4} required maxLength={9029} disabled={Boolean(pending)} value={draft.included_items} onChange={event => setDraft(current => ({ ...current, included_items: event.target.value }))} placeholder="Source repository and commit history&#10;Deployment guide and configuration template" className="w-full border border-white/20 bg-black p-3 focus:border-emerald-300 focus:outline-none" /><p className="text-xs text-gray-400 mt-1">Up to 30 deliverables, 300 characters each. Keep passwords and access tokens out of the agreement.</p></div>
                            {textFields.map(([key, label, help]) => <div key={key}><label htmlFor={`agreement-${key}`} className="block text-sm mb-2">{label}</label><textarea id={`agreement-${key}`} rows={3} maxLength={2000} required value={draft[key]} disabled={Boolean(pending)} onChange={event => setDraft(current => ({ ...current, [key]: event.target.value }))} placeholder={help} className="w-full border border-white/20 bg-black p-3 focus:border-emerald-300 focus:outline-none" /></div>)}
                            <Button type="submit" disabled={Boolean(pending)} className="w-full h-auto whitespace-normal py-3">{pending === 'publish' ? 'Publishing…' : 'Publish scope & approve as seller'}</Button>
                            <button type="button" disabled={Boolean(pending)} className="text-sm text-gray-300 underline" onClick={() => { setDraft(scopeDraft(data)); setEditing(false); }}>Cancel editing</button>
                        </form> : data.agreement ? <PurchaseScope agreement={data.agreement} /> : <p className="text-gray-300">Waiting for the seller to publish an itemized scope. You can discuss what should be included below.</p>}
                    </div>
                    <aside className="border border-emerald-300/25 p-5 space-y-5">
                        <h2 className="text-lg font-semibold">Agreement status</h2>
                        <p className="text-sm text-gray-300">Seller: {data.agreement?.seller_approved_at ? `approved version ${data.agreement.version}` : 'not yet published'}</p>
                        <p className="text-sm text-gray-300">Buyer: {data.agreement?.buyer_approved_at ? `approved version ${data.agreement.version}` : 'approval pending'}</p>
                        {data.checkout_started && <p className="text-sm text-emerald-200">Checkout has started. This purchase scope is locked.</p>}
                        {!data.can_edit && !data.checkout_started && <p className="text-sm text-amber-200">{data.locked_reason || 'This purchase is closed or the listing is unavailable. Its scope cannot be changed.'}</p>}
                        {data.role === 'seller' && data.can_edit && !editing && <Button className="w-full" disabled={Boolean(pending)} onClick={() => { setDraft(scopeDraft(data)); setEditing(true); setNotice(''); }}>{data.agreement ? 'Revise scope' : 'Create scope'}</Button>}
                        {data.role === 'buyer' && data.agreement && !data.agreement.buyer_approved_at && data.can_edit && <div className="space-y-4">
                            <label className="flex items-start gap-3 text-sm leading-relaxed"><input type="checkbox" checked={acknowledged} disabled={Boolean(pending)} onChange={event => setAcknowledged(event.target.checked)} className="mt-1 accent-emerald-400" />I reviewed version {data.agreement.version}, including the price, deliverables, exclusions, costs and support.</label>
                            <Button disabled={!acknowledged || Boolean(pending)} onClick={approve} className="w-full h-auto whitespace-normal py-3">{pending === 'approve' ? 'Approving…' : `Approve version ${data.agreement.version}`}</Button>
                        </div>}
                        {data.checkout_available === false && <p role="status" className="border border-amber-300/30 p-3 text-sm text-amber-100">{data.checkout_message}</p>}
                        {data.role === 'buyer' && data.can_checkout && <Button disabled={Boolean(pending) || data.checkout_available === false} onClick={checkout} className="w-full h-auto whitespace-normal py-3">{pending === 'checkout' ? 'Opening checkout…' : 'Continue to payment'}</Button>}
                        <a href="#purchase-conversation" className="block text-sm text-emerald-300 underline underline-offset-4">Discuss or request changes</a>
                        <button type="button" disabled={Boolean(pending) || editing} onClick={() => setRetry(value => value + 1)} className="text-sm text-gray-300 underline">Refresh agreement status</button>
                        {editing && <p className="text-xs text-gray-400">Finish or cancel your revision before refreshing.</p>}
                        <Link to={`/projects/${data.project_id}`} className="block text-sm text-gray-300 underline">View project listing</Link>
                    </aside>
                </div>
                {notice && <p role="status" className="mt-5 border border-emerald-300/25 p-4 text-emerald-200">{notice}</p>}
                {actionError && <div role="alert" className="mt-5 border border-amber-300/30 p-4 text-amber-200"><p>{actionError}</p><p className="text-sm mt-2">Your entered scope is still here. If another version was published, copy your changes before refreshing.</p>{!pending && <button className="underline mt-3 text-sm" onClick={() => { setEditing(false); setRetry(value => value + 1); }}>Reload latest agreement</button>}</div>}
                {data.versions.length > 1 && <section className="border border-white/15 p-5 sm:p-7 mt-6"><h2 className="text-xl font-semibold mb-3">Earlier versions</h2><p className="text-sm text-gray-400 mb-4">These are historical records. Only the latest version can be approved or paid.</p>{data.versions.slice(1).map(version => <details key={version.id} className="border-t border-white/10 py-4"><summary className="cursor-pointer text-gray-300">Read version {version.version}{version.buyer_approved_at ? ' · previously approved by buyer' : ' · buyer did not approve'}</summary><div className="pt-5"><PurchaseScope agreement={version} /></div></details>)}</section>}
                {data.payment && <section className="mt-7 border border-emerald-300/25 p-5 sm:p-7"><h2 className="text-2xl font-semibold mb-3">Handover</h2><p className="text-gray-400 mb-4">Follow the approved scope. Use the conversation below to record access, timing and any remaining work.</p>
                    {data.role === 'seller' && data.payment.status === 'payment_completed' && data.payment.escrow_status === 'held' && <><ProjectFileUploader projectId={data.project_id} maxSize={10} showExistingFiles />
                        {data.status !== 'assets_transferred_pending_buyer_confirmation' && <Button className="mt-5 h-auto whitespace-normal py-3" disabled={Boolean(pending)} onClick={()=>action('delivery',async()=>{await api.put(`/purchase-requests/${requestId}/transfer-status`,{status:'assets_transferred_pending_buyer_confirmation'});setData(current=>({...current,status:'assets_transferred_pending_buyer_confirmation'}));setNotice('Handover marked delivered. The buyer must review it before confirming receipt.');})}>Mark agreed handover delivered</Button>}</>}
                    <HandoverFiles key={data.project_id} projectId={data.project_id} />
                    {data.role === 'buyer' && <Link className="text-emerald-300 underline underline-offset-4" to={`/project-transfer?transactionId=${data.payment.transaction_id}`}>Review handover and receipt</Link>}
                </section>}
                <PurchaseConversation key={requestId} requestId={requestId} />
            </>}
        </div>
    </div>;
}
