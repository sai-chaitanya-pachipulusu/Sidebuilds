import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
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
