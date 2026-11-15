import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import InboxPage from '../../pages/InboxPage';
import NotificationsPage from '../../pages/NotificationsPage';
import NavBar from '../../components/NavBar';
import api, { getNotifications, markNotificationAsRead } from '../../services/api';
import { notificationDestination } from '../../utils/notificationNavigation';
const mockUser = { user_id: 'seller', username: 'seller' };
jest.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: mockUser, isAuthenticated: true }) }));
jest.mock('../../components/SEO', () => () => null);
jest.mock('../../services/api', () => ({ __esModule: true, default: { get: jest.fn() }, getNotifications: jest.fn(), markNotificationAsRead: jest.fn(), markAllNotificationsAsRead: jest.fn() }));
const thread = { request_id: 42, project_name: 'Independent store', role: 'selling', participant: 'buyer', unread_count: 2, preview: 'What is included?', last_activity: '2026-11-15T12:00:00Z', status: 'interest_expressed' };
const result = (threads = [thread], extra = {}) => ({ data: { threads, total: threads.length, unread_threads: threads.length, has_more: false, ...extra } });
const Position = () => { const l = useLocation(); return <output data-testid="position">{l.pathname + l.search + l.hash}</output>; };
const open = (element = <InboxPage/>, path = '/inbox') => render(<MemoryRouter initialEntries={[path]}><Position/>{element}</MemoryRouter>);
beforeEach(() => { jest.clearAllMocks(); api.get.mockResolvedValue(result()); getNotifications.mockResolvedValue([]); markNotificationAsRead.mockResolvedValue({}); });
test('inbox links to exact conversation and filters/paginates through the API without marking anything read', async () => {
  open(); const link = await screen.findByRole('link', { name: 'Independent store' }); expect(link).toHaveAttribute('href', '/purchase-agreement/42#purchase-conversation');
  fireEvent.click(screen.getByRole('button', { name: 'Selling', exact: true }));
  await waitFor(() => expect(api.get).toHaveBeenLastCalledWith('/purchase-requests/inbox', { params: { role: 'selling', unread: 'false', q: '', offset: 0, limit: 20 } }));
  fireEvent.click(screen.getByLabelText('Unread only')); await waitFor(() => expect(api.get.mock.calls.at(-1)[1].params.unread).toBe('true'));
  api.get.mockResolvedValue(result([thread], { total: 21, unread_threads: 21, has_more: true }));
  fireEvent.change(screen.getByLabelText('Search project or person'), { target: { value: 'store' } }); fireEvent.click(screen.getByRole('button', { name: 'Search' }));
  await screen.findByRole('button', { name: 'Next' }); fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  await waitFor(() => expect(api.get.mock.calls.at(-1)[1].params).toEqual({ role: 'selling', unread: 'true', q: 'store', offset: 20, limit: 20 }));
  expect(markNotificationAsRead).not.toHaveBeenCalled();
});
test('offline inbox shows retry, never a fake empty inbox; filtered empty state can clear filters', async () => {
  api.get.mockRejectedValueOnce(new Error('offline')); open(<InboxPage/>, '/inbox?role=buying&q=missing');
  await screen.findByRole('alert'); expect(screen.queryByText('No conversations yet')).not.toBeInTheDocument();
  api.get.mockResolvedValue(result([])); fireEvent.click(screen.getByRole('button', { name: 'Retry inbox' }));
  await screen.findByText('No conversations match these filters'); fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
  await screen.findByText('No conversations yet'); expect(screen.getByTestId('position')).toHaveTextContent('/inbox');
});
test('an old inbox response cannot overwrite a newer filtered result', async () => {
  let finish; api.get.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })); open();
  api.get.mockResolvedValue(result([{ ...thread, project_name: 'New filtered result' }])); fireEvent.click(screen.getByRole('button', { name: 'Buying', exact: true }));
  await screen.findByText('New filtered result'); await act(async () => finish(result())); expect(screen.queryByText('Independent store')).not.toBeInTheDocument();
});
test('notification routing prefers action_url and rejects unsafe destinations', () => {
  expect(notificationDestination({ action_url: '/purchase-agreement/42#purchase-conversation', link: '/old' })).toBe('/purchase-agreement/42#purchase-conversation');
  for (const url of ['https://outside.invalid', '//outside.invalid', 'javascript:alert(1)', '/\\outside.invalid']) expect(notificationDestination({ action_url: url, type: 'new_interest' })).toBe('/inbox');
  expect(notificationDestination({ link: '/purchases' })).toBe('/purchases');
});
test('keyboard opens the exact notification destination even when marking read fails', async () => {
  const error = jest.spyOn(console, 'error').mockImplementation(() => {});
  getNotifications.mockResolvedValue([{ notification_id: 'n1', type: 'new_message', message: 'A private reply', is_read: false, action_url: '/purchase-agreement/42#purchase-conversation', created_at: new Date().toISOString() }]);
  markNotificationAsRead.mockRejectedValue(new Error('offline')); open(<NotificationsPage/>, '/notifications');
  const link = await screen.findByRole('link', { name: /A private reply/ }); fireEvent.keyDown(link, { key: 'Enter' });
  await waitFor(() => expect(screen.getByTestId('position')).toHaveTextContent('/purchase-agreement/42#purchase-conversation')); expect(markNotificationAsRead).toHaveBeenCalledWith('n1'); error.mockRestore();
});
test('notification bell refreshes after reads and focus without showing an invented global count', async () => {
  getNotifications.mockResolvedValue([{ is_read: false }]); open(<NavBar/>); await screen.findByRole('link', { name: 'Notifications, unread activity' });
  getNotifications.mockResolvedValue([]); act(() => window.dispatchEvent(new Event('sidebuilds:notifications-updated')));
  await screen.findByRole('link', { name: 'Notifications', exact: true });
  getNotifications.mockResolvedValue([{ is_read: false }]); act(() => window.dispatchEvent(new Event('focus'))); await screen.findByRole('link', { name: 'Notifications, unread activity' });
});
