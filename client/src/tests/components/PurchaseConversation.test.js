import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import PurchaseConversation from '../../components/PurchaseConversation';
import api from '../../services/api';
jest.mock('../../services/api', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));
beforeEach(() => { jest.clearAllMocks(); api.get.mockResolvedValue({ data: { messages: [] } }); });

test('failed conversation load is explicit and can be refreshed', async () => {
    api.get.mockRejectedValueOnce(new Error('offline'));
    render(<PurchaseConversation requestId="12" />); await screen.findByRole('alert');
    expect(screen.queryByText('No messages yet.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Retry conversation')); expect(await screen.findByText('No messages yet.')).toBeInTheDocument();
});

test('sending a request for changes persists the message and prevents repeated clicks', async () => {
    let resolve;
    api.post.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    render(<PurchaseConversation requestId="12" />); await screen.findByText('No messages yet.');
    fireEvent.change(screen.getByLabelText('Your message'), { target: { value: 'Please clarify the hosting cost.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' })); fireEvent.click(screen.getByRole('button', { name: 'Sending…' }));
    expect(api.post).toHaveBeenCalledTimes(1);
    await act(async () => resolve({ data: { id: 'message-1', sender_username: 'buyer', content: 'Please clarify the hosting cost.' } }));
    expect(await screen.findByText('Please clarify the hosting cost.')).toBeInTheDocument(); expect(screen.getByLabelText('Your message')).toHaveValue('');
});

test('a failed message keeps the draft for retry', async () => {
    api.post.mockRejectedValueOnce(new Error('offline'));
    render(<PurchaseConversation requestId="12" />); await screen.findByText('No messages yet.');
    fireEvent.change(screen.getByLabelText('Your message'), { target: { value: 'Can you add deployment help?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' })); await screen.findByRole('alert');
    expect(screen.getByLabelText('Your message')).toHaveValue('Can you add deployment help?');
});
test('a reused inquiry carries its unsent message into the conversation without sending automatically', async () => {
    const sent = jest.fn();
    api.post.mockResolvedValue({ data: { id: 'new-message', content: 'Please explain the running costs.' } });
    render(<PurchaseConversation requestId="12" initialDraft="Please explain the running costs." onDraftSent={sent}/>);
    await screen.findByText('No messages yet.');
    expect(screen.getByLabelText('Your message')).toHaveValue('Please explain the running costs.'); expect(api.post).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Send message' })); await screen.findByText('Please explain the running costs.');
    await waitFor(() => expect(screen.getByLabelText('Your message')).toHaveValue('')); expect(sent).toHaveBeenCalledTimes(1);
});
test('retry after a lost response uses the same message ID and a changed draft gets a new ID', async () => {
    api.post.mockRejectedValueOnce(new Error('Lost response')).mockRejectedValueOnce(new Error('Still unavailable')).mockResolvedValueOnce({ data: { id: 'saved', content: 'Revised question about deployment.' } });
    render(<PurchaseConversation requestId="12" />); await screen.findByText('No messages yet.');
    fireEvent.change(screen.getByLabelText('Your message'), { target: { value: 'Can you explain deployment?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' })); await screen.findByRole('alert');
    const first = api.post.mock.calls[0][1]; expect(first.clientMessageId).toMatch(/^[a-f0-9-]{36}$/);
    fireEvent.click(screen.getByRole('button', { name: 'Send message' })); await waitFor(() => expect(api.post).toHaveBeenCalledTimes(2));
    await screen.findByRole('alert'); expect(api.post.mock.calls[1][1]).toEqual(first);
    fireEvent.change(screen.getByLabelText('Your message'), { target: { value: 'Revised question about deployment.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
    await waitFor(() => expect(screen.getByLabelText('Your message')).toHaveValue(''));
    expect(api.post.mock.calls[2][1].clientMessageId).not.toBe(first.clientMessageId);
});
test('a late message response cannot clear history or navigate after leaving the conversation', async () => {
    let finish; const sent = jest.fn(); api.post.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const page = render(<PurchaseConversation requestId="12" initialDraft="Please explain the hosting costs." onDraftSent={sent}/>);
    await screen.findByText('No messages yet.'); fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
    page.unmount(); await act(async () => finish({ data: { id: 'late-message', content: 'Please explain the hosting costs.' } })); expect(sent).not.toHaveBeenCalled();
});

test('read receipt acknowledges only IDs from the displayed load and does not block displaying messages', async () => {
    let finish; api.get.mockResolvedValue({ data: { messages: [{ id: 'm1', content: 'Visible reply' }], read_receipt: { messageIds: ['m1'], notificationIds: ['n1'] } } });
    api.post.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    render(<PurchaseConversation requestId="12"/>); await screen.findByText('Visible reply');
    expect(api.post).toHaveBeenCalledWith('/purchase-requests/12/messages/read', { messageIds: ['m1'], notificationIds: ['n1'] });
    await act(async () => finish({ data: {} }));
});
test('failed unread acknowledgement keeps the conversation visible and explains retry', async () => {
    api.get.mockResolvedValue({ data: { messages: [{ id: 'm1', content: 'Visible despite receipt failure' }], read_receipt: { messageIds: ['m1'], notificationIds: [] } } });
    api.post.mockRejectedValueOnce(new Error('offline')); render(<PurchaseConversation requestId="12"/>);
    await screen.findByText(/unread status could not be updated/); expect(screen.getByText('Visible despite receipt failure')).toBeInTheDocument(); expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
