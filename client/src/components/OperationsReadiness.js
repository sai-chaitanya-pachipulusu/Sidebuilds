import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import './OperationsReadiness.css';

const paymentLabels = {
  ready: ['Ready', 'Stripe payments, payouts and transfers are active.'],
  reconnect_required: ['Reconnect required', 'The seller must open payout settings and reconnect Stripe for this environment.'],
  onboarding_required: ['Setup incomplete', 'The seller must finish the requirements in Stripe.'],
  not_connected: ['Stripe not connected', 'The seller must connect Stripe in payout settings.'],
  unavailable: ['Not verified', 'Stripe could not verify this connection. Refresh before making a launch decision.']
};

export default function OperationsReadiness({ refresh }) {
  const [data, setData] = useState(null);
  const [pending, setPending] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setPending(true); setError(''); setData(null);
    api.get('/webhooks/readiness').then(response => { if (active) setData(response.data); })
      .catch(() => { if (active) setError('Launch checks are unavailable. Empty review queues do not confirm payment readiness.'); })
      .finally(() => { if (active) setPending(false); });
    return () => { active = false; };
  }, [refresh]);
  return <section className="ops-readiness" aria-labelledby="readiness-title" aria-busy={pending}>
    <div className="ops-readiness-heading"><div><p className="ops-eyebrow">Before accepting purchases</p>
      <h2 id="readiness-title">Launch checks</h2></div>
      {data && <p className="ops-check-time">Checked {new Date(data.checkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>}
    </div>
    {pending && <p role="status">Checking the payment setup and current sale listings…</p>}
    {error && <p role="status" className="ops-warning">{error}</p>}
    {data && <>
      <dl className="ops-facts">
        <div><dt>Checkout</dt><dd className={data.checkoutEnabled ? '' : 'ops-warning'}>{data.checkoutEnabled ? 'Enabled' : 'Paused'}</dd></div>
        <div><dt>Stripe environment</dt><dd>{data.providerConfigured ? (data.providerMode === 'live' ? 'Live payments' : 'Test payments') : 'Configuration needs review'}</dd></div>
        <div><dt>Email delivery</dt><dd>{data.emailConfigured ? 'Configured · delivery unverified' : 'Unavailable'}</dd></div>
      </dl>
      <p className="ops-explanation">{data.checkoutEnabled ? 'Checkout is enabled; each purchase still checks the seller’s current payment connection.' : 'Visitors can browse and inquire. Payments stay paused until launch review is complete.'} These checks do not verify ownership or prove a completed sale.</p>
      <div className="ops-listing-heading"><h3>Sale listings</h3><span>{data.listings.length} checked{data.hasMore ? ' · more listings remain' : ''}</span></div>
      {data.listings.length ? <ul className="ops-listings">{data.listings.map(listing => {
        const [label, action] = paymentLabels[listing.paymentStatus] || paymentLabels.unavailable;
        return <li key={listing.projectId}><div className="ops-listing-title"><Link to={`/projects/${listing.projectId}`}>{listing.name}</Link>
          <span className={`ops-payment-state ${listing.paymentStatus === 'ready' ? 'ops-ready' : 'ops-warning'}`}>{label}</span></div>
          <p>{action}</p>
          {!!listing.missingInformation.length && <p className="ops-missing"><span>Listing needs:</span> {listing.missingInformation.join(' · ')}</p>}
        </li>;
      })}</ul> : <p>No public projects are currently listed for sale.</p>}
      <p className="ops-footnote">Seller action: Profile settings → Payouts. A seller must complete their own Stripe verification.</p>
    </>}
  </section>;
}
