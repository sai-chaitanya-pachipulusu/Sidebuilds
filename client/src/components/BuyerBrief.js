import React from 'react';
import { buyerBriefFields, briefText } from '../utils/listingGuidance';

export default function BuyerBrief({ details, onAsk }) {
  return <section aria-labelledby="buyer-brief-title" className="border-t border-white/10 pt-6">
    <p className="font-mono text-xs uppercase tracking-widest text-emerald-300 mb-2">Plan your takeover</p>
    <h2 id="buyer-brief-title" className="text-xl font-semibold text-white mb-2">Buyer brief</h2>
    <p className="text-sm text-gray-400 mb-5">Seller-provided details. Confirm the scope and costs with the seller before agreeing to a purchase.</p>
    <dl className="space-y-5">{buyerBriefFields.map(field => {
      const text = briefText(details?.[field.key]);
      return <div key={field.key}><dt className="text-sm font-semibold text-white mb-1">{field.label}</dt>
        <dd className={`text-sm whitespace-pre-wrap break-words leading-relaxed ${text ? 'text-gray-300' : 'text-amber-200/80'}`}>{text || 'Not provided yet — ask the seller.'}</dd>
        {!text && onAsk && <button type="button" onClick={() => onAsk(field.question)} className="mt-2 text-sm text-emerald-300 underline underline-offset-4 hover:text-emerald-200">{field.askLabel}</button>}
      </div>;
    })}</dl>
  </section>;
}
