import React, {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import SEO from '../components/SEO';
import api from '../services/api';

export default function MarketplaceGuidePage({pricing=false}) {
  const [settings,setSettings]=useState(null);
  useEffect(()=>{let active=true;api.get('/public/commerce-status').then(r=>{if(active)setSettings(r.data);}).catch(()=>{});return()=>{active=false;};},[]);
  const steps=[['Explore and ask','Compare seller-provided details. Ask public questions or start a private inquiry. Request evidence of revenue, usage and ownership before you agree to buy.'],
    ['Agree what changes hands','Use the shared purchase agreement to record included assets, exclusions, ongoing costs, handover timing and support. Both sides approve the same version before checkout.'],
    ['Pay when checkout is available','Stripe handles card details. A project is reserved during its active checkout. A successful payment starts handover; it does not immediately release the seller payment.'],
    ['Transfer and review','The seller follows the agreed handover steps and marks delivery. Check access, files and the scope. Use Report an issue if something is missing. Confirm receipt only when you are satisfied: this releases the recorded seller payment and updates project ownership.']];
  return <div className="max-w-6xl mx-auto px-5 sm:px-8 py-14 sm:py-20">
    <SEO title={pricing?'Marketplace fees':'How SideBuilds works'} description="A clear path from discovery to an agreed scope and reviewed handover." />
    <p className="text-emerald-300 text-xs font-mono uppercase tracking-widest mb-5">The buying and selling guide</p>
    <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight max-w-3xl">{pricing?'Know the cost before you commit.':'A clear agreement. A considered handover.'}</h1>
    <p className="text-gray-400 mt-6 max-w-2xl text-lg leading-relaxed">SideBuilds connects project makers with buyers. Use the conversation and written scope to decide whether a project is right for you.</p>
    {settings?.checkout_available===false && <div role="status" className="mt-8 border border-amber-300/30 p-5 text-amber-100 max-w-3xl"><strong>Payments are currently paused.</strong><p className="mt-2 text-sm">You can browse, inquire and agree a scope. Checkout will become available after payment validation is complete.</p></div>}
    <section className="mt-12 border-y border-white/15 py-8 grid sm:grid-cols-2 gap-8"><div><h2 className="text-xl font-semibold">Marketplace fees</h2><p className="mt-3 text-gray-400">{settings?`${settings.platform_fee_percent}% of the agreed purchase price is the platform fee, deducted from seller proceeds.`:'The current platform fee is shown when the payment service is available.'} There is no listing fee.</p></div><div><h2 className="text-xl font-semibold">Before you pay</h2><p className="mt-3 text-gray-400">Confirm the assets, licenses, accounts and costs you will take on. Revenue and traffic are seller claims unless evidence is supplied. Stripe payment processing does not provide an escrow service.</p></div></section>
    <ol className="mt-6 grid md:grid-cols-2 gap-x-12">{steps.map(([title,text],i)=><li key={title} className="py-8 border-b border-white/15"><span className="font-mono text-emerald-300 text-xs">0{i+1}</span><h2 className="text-2xl mt-3 mb-3">{title}</h2><p className="text-gray-400 leading-relaxed">{text}</p></li>)}</ol>
    <div className="flex flex-wrap gap-4 mt-10"><Link className="bg-emerald-300 px-6 py-3 text-black font-semibold hover:bg-emerald-200" to="/marketplace">Explore projects</Link><Link className="border border-white/25 px-6 py-3 hover:border-white/60" to="/create">List a project</Link><Link className="px-2 py-3 underline underline-offset-4" to="/contact">Get help</Link></div>
  </div>;
}
