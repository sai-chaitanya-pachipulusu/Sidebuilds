import React, { useEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { expressInterestInProject } from '../services/api';

export default function ProjectInquiryModal({ open, onClose, projectId, projectName, onContinue }) {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const lock = useRef(false);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const send = async event => {
    event.preventDefault();
    if (lock.current) return;
    if (message.trim().length < 10 || message.trim().length > 2000) { setError('Write a message between 10 and 2000 characters.'); return; }
    lock.current = true; setPending(true); setError('');
    try {
      const result = await expressInterestInProject(projectId, [], message.trim());
      if (!alive.current) return;
      const id = result.purchase_request_id || result.id;
      if (!/^[1-9]\d*$/.test(String(id))) throw new Error('The conversation could not be opened. Retry to find your existing thread.');
      const draft = result.existing ? message.trim() : '';
      onContinue(id, draft);
      setMessage('');
    } catch (failure) {
      if (alive.current) setError(failure.response?.data?.error || failure.message || 'Your inquiry could not be sent. Your message is still here; retry shortly.');
    } finally { lock.current = false; if (alive.current) setPending(false); }
  };
  return <Dialog.Root open={open} onOpenChange={value => { if (!value && !lock.current) onClose(); }}>
    <Dialog.Portal><Dialog.Overlay className="fixed inset-0 bg-black/80 z-50" />
      <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-32px)] max-w-lg max-h-[90dvh] overflow-y-auto bg-[#121412] border border-[#3b4237] p-6 sm:p-8 z-50 text-white">
        <p className="font-mono text-xs uppercase tracking-widest text-[#bac5ae] mb-3">Private inquiry</p>
        <Dialog.Title className="text-2xl font-semibold pr-7 break-words">Contact {projectName}’s seller</Dialog.Title>
        <Dialog.Description className="text-sm text-gray-300 mt-3 leading-relaxed">Ask about the project, running costs or handover. No payment is taken at this step. You and the seller review the scope before checkout.</Dialog.Description>
        <Dialog.Close disabled={pending} aria-label="Close inquiry" className="absolute right-4 top-4 p-2 text-gray-300 hover:text-white focus-visible:outline focus-visible:outline-2"><X size={18}/></Dialog.Close>
        <form onSubmit={send} className="mt-6 space-y-4">
          <div><label htmlFor="inquiry-message" className="block text-sm font-medium mb-2">Your message</label>
            <textarea id="inquiry-message" autoFocus rows={5} maxLength={2000} value={message} disabled={pending} onChange={event => { setMessage(event.target.value); setError(''); }}
              aria-describedby="inquiry-help inquiry-count" aria-invalid={Boolean(error)} className="w-full bg-black border border-[#48523f] p-3 text-sm focus:outline focus:outline-2 focus:outline-[#d5efae]"
              placeholder="What would you like to understand before discussing a purchase?" />
            <div className="flex justify-between gap-4 mt-2 text-xs text-gray-400"><p id="inquiry-help">10–2000 characters. Keep passwords and access tokens out.</p><span id="inquiry-count" className="shrink-0">{message.length}/2000</span></div>
          </div>
          {error && <p role="alert" className="text-sm text-[#efcc8d]">{error}</p>}
          <button type="submit" disabled={pending} className="w-full bg-[#d5efae] text-[#141714] font-semibold py-3 disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">{pending ? 'Opening conversation…' : 'Send inquiry'}</button>
          <p className="text-xs text-gray-400 leading-relaxed">Already contacted this seller? We’ll open your existing conversation and keep this message as an unsent draft.</p>
        </form>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
