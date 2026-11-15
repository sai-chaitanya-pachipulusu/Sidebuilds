import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import SEO from '../components/SEO';
import { useAuth } from '../context/AuthContext';
import './InboxPage.css';

const statuses = { interest_expressed: 'Inquiry', seller_terms_proposed: 'Scope proposed', seller_accepted_pending_payment: 'Review scope',
  agreement_reached_pending_payment: 'Scope agreed', payment_processing: 'Payment in progress', payment_completed_pending_transfer: 'Handover pending',
  assets_transferred_pending_buyer_confirmation: 'Receipt review', transfer_completed_buyer_confirmed: 'Completed', seller_rejected: 'Declined',
  buyer_withdrew_interest: 'Withdrawn', payment_refunded: 'Refunded', payment_failed: 'Payment failed', expired: 'Expired', aborted_project_unavailable: 'Unavailable' };
const pageSize = 20;
export default function InboxPage() {
  const { user } = useAuth();
  const pageTop = useRef(null);
  useEffect(() => { pageTop.current?.scrollIntoView?.({ block: 'start' }); }, []);
  const [params, setParams] = useSearchParams();
  const role = ['selling', 'buying'].includes(params.get('role')) ? params.get('role') : 'all';
  const unread = params.get('unread') === 'true', search = params.get('q') || '';
  const rawOffset = Number(params.get('offset') || 0), offset = Number.isSafeInteger(rawOffset) && rawOffset >= 0 && rawOffset <= 100000 ? rawOffset : 0;
  const [draftSearch, setDraftSearch] = useState(search), [data, setData] = useState(null), [pending, setPending] = useState(true), [error, setError] = useState(''), [refresh, setRefresh] = useState(0);
  useEffect(() => { setDraftSearch(search); }, [search]);
  useEffect(() => {
    const reload = () => setRefresh(value => value + 1);
    window.addEventListener('focus', reload);
    return () => window.removeEventListener('focus', reload);
  }, []);
  useEffect(() => {
    let active = true; setPending(true); setError(''); setData(null);
    api.get('/purchase-requests/inbox', { params: { role, unread: String(unread), q: search, limit: pageSize, offset } })
      .then(response => { if (!Array.isArray(response.data?.threads)) throw new Error('Incomplete inbox response'); if (active) setData(response.data); })
      .catch(() => { if (active) setError('Your conversations could not be loaded. Retry to check for new inquiries and replies.'); })
      .finally(() => { if (active) setPending(false); });
    return () => { active = false; };
  }, [role, unread, search, offset, refresh, user?.user_id, user?.id]);
  const change = patch => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries({ offset: '', ...patch })) value === '' || value === false ? next.delete(key) : next.set(key, String(value));
    setParams(next);
  };
  return <div ref={pageTop} className="sb-inbox"><SEO title="Inbox" noindex/>
    <header className="sb-inbox-header"><div><p className="sb-inbox-eyebrow">Buying & selling</p><h1>Inbox</h1><p>Private conversations about your projects and purchases.</p></div>
      <button type="button" disabled={pending} onClick={() => setRefresh(value => value + 1)} className="sb-inbox-button">{pending ? 'Checking…' : 'Refresh inbox'}</button></header>
    <div className="sb-inbox-tools">
      <div role="group" aria-label="Conversation role" className="sb-inbox-roles">{[['all', 'All'], ['selling', 'Selling'], ['buying', 'Buying']].map(([value, label]) =>
        <button key={value} type="button" aria-pressed={role === value} onClick={() => change({ role: value === 'all' ? '' : value })}>{label}</button>)}</div>
      <label className="sb-inbox-unread"><input type="checkbox" checked={unread} onChange={event => change({ unread: event.target.checked })}/>Unread only</label>
      <form onSubmit={event => { event.preventDefault(); change({ q: draftSearch.trim() }); }} className="sb-inbox-search"><label htmlFor="inbox-search" className="sr-only">Search project or person</label>
        <input id="inbox-search" type="search" maxLength={100} placeholder="Project or person" value={draftSearch} onChange={event => setDraftSearch(event.target.value)}/><button type="submit">Search</button></form>
    </div>
    {pending ? <p role="status" className="sb-inbox-state">Loading conversations…</p> : error ? <div role="alert" className="sb-inbox-state"><p>{error}</p><button className="sb-inbox-button" onClick={() => setRefresh(value => value + 1)}>Retry inbox</button></div> : data && <>
      <p className="sb-inbox-count">{data.total} conversation{data.total === 1 ? '' : 's'} · {data.unread_threads} unread in these results</p>
      {data.threads.length ? <ul className="sb-inbox-list">{data.threads.map(thread => <li key={thread.request_id}>
        <div className="sb-inbox-row"><div className="sb-inbox-main"><p className="sb-inbox-meta">{thread.role === 'selling' ? 'Selling' : 'Buying'} · with {thread.participant}</p>
          <Link className="sb-inbox-title" to={`/purchase-agreement/${thread.request_id}#purchase-conversation`}>{thread.project_name}</Link>
          <p className="sb-inbox-preview">{thread.preview ? `${thread.from_you ? 'You: ' : ''}${thread.preview}` : 'No messages yet. Open the conversation.'}</p>
        </div><div className="sb-inbox-side">{thread.unread_count > 0 && <span className="sb-inbox-badge">{thread.unread_count} unread</span>}
          <time dateTime={thread.last_activity}>{thread.last_activity && !Number.isNaN(Date.parse(thread.last_activity)) ? new Date(thread.last_activity).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Date unavailable'}</time>
          <span>{statuses[thread.status] || 'Project discussion'}</span><Link to={`/purchase-agreement/${thread.request_id}`}>View scope & status</Link>
        </div></div>
      </li>)}</ul> : <div className="sb-inbox-state"><h2>{search || unread || role !== 'all' ? 'No conversations match these filters' : 'No conversations yet'}</h2>
        <p>{search || unread || role !== 'all' ? 'Try all conversations or a different search.' : 'Buyer inquiries and seller replies will appear here. Contact a seller from a project listing to start.'}</p>
        {search || unread || role !== 'all' ? <button className="sb-inbox-button" onClick={() => setParams({})}>Clear filters</button> : <Link to="/marketplace">Explore the marketplace</Link>}</div>}
      {(offset > 0 || data.has_more) && <nav className="sb-inbox-paging" aria-label="Inbox pages"><button disabled={offset === 0} onClick={() => change({ offset: Math.max(0, offset - pageSize) })}>Previous</button><span>Page {Math.floor(offset / pageSize) + 1}</span><button disabled={!data.has_more} onClick={() => change({ offset: offset + pageSize })}>Next</button></nav>}
    </>}
    <p className="sb-inbox-footnote">Opening a conversation updates the messages you have read. A message does not change an approved scope or release payment.</p>
  </div>;
}
