import React from 'react';
import { Check, ArrowUpRight } from 'lucide-react';
import { listingChecklist } from '../utils/listingGuidance';

export default function ListingChecklist({ project }) {
  const items = listingChecklist(project);
  const complete = items.filter(item => item.done).length;
  const goToField = id => {
    const field = document.getElementById(id);
    field?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    field?.focus({ preventScroll: true });
  };
  return <section aria-labelledby="listing-guidance-title" className="border border-emerald-400/25 bg-emerald-400/[0.04] p-5 mb-8">
    <div className="flex flex-wrap justify-between gap-3 items-start mb-3">
      <div><p className="font-mono text-xs uppercase tracking-widest text-emerald-300 mb-2">Your next steps</p>
        <h2 id="listing-guidance-title" className="text-lg font-semibold text-white">Make your project easier to evaluate</h2>
      </div>
      <span className="font-mono text-sm text-emerald-200">{complete}/{items.length} filled in</span>
    </div>
    <p className="text-sm text-gray-400 mb-4">Optional guidance. Save at any time. Buyers will see these details as information you provide.</p>
    <div className="grid gap-2 sm:grid-cols-2">
      {items.map(item => <button key={item.id} type="button" onClick={() => goToField(item.id)}
        className="text-left flex items-center gap-3 p-2 border border-transparent hover:border-emerald-400/30 focus-visible:outline focus-visible:outline-emerald-300 text-sm text-gray-200">
        {item.done ? <Check aria-label="Filled in" className="w-4 h-4 text-emerald-300 shrink-0" /> : <ArrowUpRight className="w-4 h-4 text-gray-500 shrink-0" />}
        {item.label}
      </button>)}
    </div>
  </section>;
}
