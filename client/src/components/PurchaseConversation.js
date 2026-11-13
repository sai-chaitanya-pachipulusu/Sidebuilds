import React, { useEffect, useRef, useState } from 'react';
import api from '../services/api';
import { Button } from '../shadcn/ui/button';

export default function PurchaseConversation({ requestId }) {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [retry, setRetry] = useState(0);
    const [draft, setDraft] = useState('');
    const [sending, setSending] = useState(false);
    const [sendError, setSendError] = useState('');
    const lock = useRef(false);
    useEffect(() => {
        let active = true;
        setLoading(true); setError('');
        api.get(`/purchase-requests/${requestId}/messages`).then(({ data }) => {
            if (active) setMessages(data.messages || []);
        }).catch(() => { if (active) setError('The conversation could not be loaded.'); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [requestId, retry]);
    const send = async event => {
        event.preventDefault();
        if (lock.current || !draft.trim()) return;
        lock.current = true; setSending(true); setSendError('');
        try {
            const { data } = await api.post(`/purchase-requests/${requestId}/messages`, { content: draft.trim() });
            setMessages(current => [...current, data]); setDraft('');
        } catch (failure) { setSendError(failure.response?.data?.msg || 'Message could not be sent. Your draft is still here.'); }
        finally { lock.current = false; setSending(false); }
    };
    return <section id="purchase-conversation" aria-labelledby="conversation-heading" className="border border-white/15 p-5 sm:p-7 mt-6 scroll-mt-24">
        <h2 id="conversation-heading" className="text-xl font-semibold mb-2">Discuss this purchase</h2>
        <p className="text-sm text-gray-400 mb-5">Ask for changes here. Messages do not change an approved scope; the seller must publish a new version.</p>
        {loading ? <p role="status">Loading conversation…</p> : error ? <div role="alert"><p>{error}</p><button className="text-emerald-300 underline mt-2" onClick={() => setRetry(value => value + 1)}>Retry conversation</button></div>
            : <div className="space-y-4 max-h-80 overflow-y-auto mb-5">{messages.length ? messages.map(message => <article key={message.id} className="border-l border-white/20 pl-4">
                <p className="text-sm text-emerald-300 mb-1">{message.sender_username || 'Participant'}</p><p className="text-gray-300 whitespace-pre-wrap break-words">{message.content}</p>
            </article>) : <p className="text-sm text-gray-400">No messages yet.</p>}</div>}
        <form onSubmit={send} className="mt-4 space-y-3">
            <label htmlFor="purchase-message" className="block text-sm font-medium">Your message</label>
            <textarea id="purchase-message" value={draft} onChange={event => setDraft(event.target.value)} disabled={sending} maxLength={5000} required rows={3}
                className="w-full border border-white/20 bg-black p-3 text-white focus:border-emerald-300 focus:outline-none" />
            {sendError && <p role="alert" className="text-amber-200">{sendError}</p>}
            <Button type="submit" disabled={sending || !draft.trim()}>{sending ? 'Sending…' : 'Send message'}</Button>
            <button type="button" disabled={loading || sending} onClick={() => setRetry(value => value + 1)} className="ml-4 text-sm text-gray-300 underline">Refresh conversation</button>
        </form>
    </section>;
}
