import React, { useEffect, useRef, useState } from 'react';
import api from '../services/api';
import { announceNotificationsChanged } from '../utils/notificationNavigation';

function newMessageId() {
    if (window.crypto.randomUUID) return window.crypto.randomUUID();
    const bytes = window.crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
    const hex = Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

export default function PurchaseConversation({ requestId, initialDraft = '', onDraftSent }) {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [readError, setReadError] = useState('');
    const [retry, setRetry] = useState(0);
    const [draft, setDraft] = useState(initialDraft);
    const [hasCarriedDraft, setHasCarriedDraft] = useState(Boolean(initialDraft));
    const [sending, setSending] = useState(false);
    const [sendError, setSendError] = useState('');
    const lock = useRef(false);
    const attempt = useRef(null);
    const alive = useRef(true);
    useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
    useEffect(() => {
        let active = true;
        setLoading(true); setError(''); setReadError('');
        api.get(`/purchase-requests/${requestId}/messages`).then(async ({ data }) => {
            if (!active) return;
            setMessages(data.messages || []);
            setLoading(false);
            const messageIds = data.read_receipt?.messageIds || [], notificationIds = data.read_receipt?.notificationIds || [];
            try {
                for (let offset = 0; active && offset < Math.max(messageIds.length, notificationIds.length); offset += 400)
                    await api.post(`/purchase-requests/${requestId}/messages/read`, { messageIds: messageIds.slice(offset, offset + 400), notificationIds: notificationIds.slice(offset, offset + 400) });
                if (active && (messageIds.length || notificationIds.length)) announceNotificationsChanged();
            } catch (_) { if (active) setReadError('Messages loaded, but unread status could not be updated. Refresh the conversation to retry.'); }
        }).catch(() => { if (active) setError('The conversation could not be loaded.'); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [requestId, retry]);
    const send = async event => {
        event.preventDefault();
        if (lock.current || !draft.trim()) return;
        lock.current = true; setSending(true); setSendError('');
        try {
            const content = draft.trim();
            if (!attempt.current || attempt.current.content !== content) attempt.current = { content, clientMessageId: newMessageId() };
            const { data } = await api.post(`/purchase-requests/${requestId}/messages`, attempt.current);
            if (!alive.current) return;
            setMessages(current => current.some(message => message.id === data.id) ? current : [...current, data]);
            attempt.current = null; setDraft(''); setHasCarriedDraft(false); onDraftSent?.();
        } catch (failure) { if (alive.current) setSendError(failure.response?.data?.msg || 'Message could not be sent. Your draft is still here.'); }
        finally { lock.current = false; if (alive.current) setSending(false); }
    };
    return <section id="purchase-conversation" aria-labelledby="conversation-heading" className="border border-white/15 p-5 sm:p-7 mt-6 scroll-mt-24">
        <h2 id="conversation-heading" className="text-xl font-semibold mb-2">Discuss this purchase</h2>
        <p className="text-sm text-gray-400 mb-5">Ask for changes here. Messages do not change an approved scope; the seller must publish a new version.</p>
        {readError && <p role="status" className="text-sm text-[#efcc8d] mb-4">{readError}</p>}
        {loading ? <p role="status">Loading conversation…</p> : error ? <div role="alert"><p>{error}</p><button className="text-emerald-300 underline mt-2" onClick={() => setRetry(value => value + 1)}>Retry conversation</button></div>
            : <div className="space-y-4 max-h-80 overflow-y-auto mb-5">{messages.length ? messages.map(message => <article key={message.id} className="border-l border-white/20 pl-4">
                <p className="text-sm text-emerald-300 mb-1">{message.sender_username || 'Participant'}</p><p className="text-gray-300 whitespace-pre-wrap break-words">{message.content}</p>
            </article>) : <p className="text-sm text-gray-400">No messages yet.</p>}</div>}
        <form onSubmit={send} className="mt-4 space-y-3">
            {hasCarriedDraft && <p className="text-sm text-[#efcc8d]">Your inquiry draft is here. Review it and send it when ready; it has not been sent to the seller.</p>}
            <label htmlFor="purchase-message" className="block text-sm font-medium">Your message</label>
            <textarea id="purchase-message" value={draft} onChange={event => setDraft(event.target.value)} disabled={sending} maxLength={5000} required rows={3}
                className="w-full border border-white/20 bg-black p-3 text-white focus:border-emerald-300 focus:outline-none" />
            {sendError && <p role="alert" className="text-amber-200">{sendError}</p>}
            <button type="submit" disabled={sending || !draft.trim()} className="border border-[#d5efae] bg-[#d5efae] text-[#141714] px-5 py-3 font-semibold disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">{sending ? 'Sending…' : 'Send message'}</button>
            <button type="button" disabled={loading || sending} onClick={() => setRetry(value => value + 1)} className="ml-4 text-sm text-gray-300 underline">Refresh conversation</button>
        </form>
    </section>;
}
