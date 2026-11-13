import React from 'react';

export const formatAgreementPrice = cents => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

export default function PurchaseScope({ agreement }) {
    return <div className="space-y-5 break-words">
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-white/15 pb-4">
            <h3 className="font-mono text-sm text-emerald-300">VERSION {agreement.version}</h3>
            <p className="text-2xl font-semibold">{formatAgreementPrice(agreement.price_cents)} <span className="text-sm text-gray-400">USD</span></p>
        </div>
        <section><h4 className="font-semibold mb-2">Included deliverables</h4><ol className="list-decimal pl-5 space-y-2 text-gray-300">{agreement.included_items.map((item, index) => <li key={index} className="whitespace-pre-wrap">{item}</li>)}</ol></section>
        {[
            ['exclusions', 'Excluded from this purchase'], ['running_costs', 'Ongoing costs & who pays'],
            ['handover_steps', 'Handover steps & timing'], ['support_terms', 'Support after handover']
        ].map(([key, title]) => <section key={key}><h4 className="font-semibold mb-2">{title}</h4><p className="text-gray-300 whitespace-pre-wrap">{agreement[key]}</p></section>)}
    </div>;
}
