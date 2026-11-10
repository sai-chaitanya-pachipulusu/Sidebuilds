import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import axios from 'axios';
import api from '../services/api';
import { AuthProvider, useAuth } from '../context/AuthContext';
import ProtectedRoute from '../components/ProtectedRoute';
import { ComponentErrorBoundary } from '../components/ProductionErrorBoundary';

jest.mock('axios', () => {
  const client = Object.assign(jest.fn(), {
    defaults: { baseURL: 'https://api.example.test/api', headers: { common: {} } },
    get: jest.fn(), post: jest.fn(),
    interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } }
  });
  return { create: jest.fn(() => client), post: jest.fn() };
});
jest.mock('../utils/socket', () => ({ initializeSocket: jest.fn(() => ({ on: jest.fn() })), disconnectSocket: jest.fn() }));
jest.mock('react-hot-toast', () => ({ error: jest.fn() }));
const recover = api.interceptors.response.use.mock.calls[0][1];
const expired = (config = {}) => ({ response: { status: 401, data: { message: 'Token expired' } }, config: { url: '/users/profile', headers: {}, ...config } });
beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  delete api.defaults.headers.common.Authorization;
});

test('a failed refresh is bounded and clears the session with one recoverable event', async () => {
  localStorage.setItem('token', 'expired.token.value');
  api.defaults.headers.common.Authorization = 'Bearer expired.token.value';
  axios.post.mockRejectedValue({ response: { status: 401 } });
  const listener = jest.fn(); window.addEventListener('tokenExpired', listener);
  const failure = expired();
  await expect(recover(failure)).rejects.toBe(failure);
  expect(axios.post).toHaveBeenCalledTimes(1);
  expect(api.post).not.toHaveBeenCalled();
  expect(localStorage.getItem('token')).toBeNull();
  expect(api.defaults.headers.common.Authorization).toBeUndefined();
  expect(listener).toHaveBeenCalledTimes(1);
  window.removeEventListener('tokenExpired', listener);
});

test('concurrent expired requests share one refresh and announce failure only once', async () => {
  localStorage.setItem('token', 'expired.token.value');
  let rejectRefresh;
  axios.post.mockImplementation(() => new Promise((_, reject) => { rejectRefresh = reject; }));
  const listener = jest.fn(); window.addEventListener('tokenExpired', listener);
  const requests = Promise.allSettled([recover(expired()), recover(expired({ url: '/notifications' }))]);
  expect(axios.post).toHaveBeenCalledTimes(1);
  rejectRefresh(new Error('Refresh rejected'));
  const results = await requests;
  expect(results.every(item => item.status === 'rejected')).toBe(true);
  expect(listener).toHaveBeenCalledTimes(1);
  window.removeEventListener('tokenExpired', listener);
});

test('successful refresh retries once with the new token; a second denial does not refresh again', async () => {
  localStorage.setItem('token', 'expired.token.value');
  axios.post.mockResolvedValue({ data: { token: 'fresh.token.value', user: { user_id: 'qa' } } });
  api.mockResolvedValue({ data: { user_id: 'qa' } });
  const failure = expired();
  await recover(failure);
  expect(localStorage.getItem('token')).toBe('fresh.token.value');
  expect(api).toHaveBeenCalledWith(expect.objectContaining({ _retry: true, headers: { Authorization: 'Bearer fresh.token.value' } }));
  const again = expired({ ...failure.config });
  await expect(recover(again)).rejects.toBe(again);
  expect(axios.post).toHaveBeenCalledTimes(1);
  expect(localStorage.getItem('token')).toBeNull();
});

test('invalid sign-in credentials never trigger background session refresh', async () => {
  localStorage.setItem('token', 'existing.token.value');
  const failure = expired({ url: '/auth/login' });
  await expect(recover(failure)).rejects.toBe(failure);
  expect(axios.post).not.toHaveBeenCalled();
  expect(localStorage.getItem('token')).toBe('existing.token.value');
});

function SessionLocation() {
  const auth = useAuth(), location = useLocation();
  return <p>{`${auth.isAuthenticated ? 'member' : 'guest'} ${location.pathname}${location.search}${location.hash}`}</p>;
}
test('session expiration preserves public browsing and does not schedule a forced redirect', async () => {
  render(<MemoryRouter initialEntries={['/marketplace?q=vue']}><AuthProvider><SessionLocation /></AuthProvider></MemoryRouter>);
  await screen.findByText('guest /marketplace?q=vue');
  const timer = jest.spyOn(window, 'setTimeout');
  act(() => window.dispatchEvent(new CustomEvent('tokenExpired', { detail: { message: 'Expired' } })));
  expect(screen.getByText('guest /marketplace?q=vue')).toBeInTheDocument();
  expect(timer).not.toHaveBeenCalled();
  timer.mockRestore();
});

test('a private destination resumes after sign-in and corrupted saved profile does not crash', async () => {
  localStorage.setItem('user', '{invalid json');
  render(<MemoryRouter initialEntries={['/create?draft=1#details']}><AuthProvider><Routes>
    <Route element={<ProtectedRoute />}><Route path='/create' element={<p>Editor</p>} /></Route>
    <Route path='/login' element={<SessionLocation />} />
  </Routes></AuthProvider></MemoryRouter>);
  await waitFor(() => expect(screen.getByText('guest /login?next=%2Fcreate%3Fdraft%3D1%23details')).toBeInTheDocument());
  expect(localStorage.getItem('user')).toBeNull();
});

test('an unavailable lazy page offers an accessible refresh instead of a permanent loading fallback', async () => {
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  const MissingPage = React.lazy(() => Promise.reject(Object.assign(new Error('Loading chunk 801 failed.'), { name: 'ChunkLoadError' })));
  try {
    render(<ComponentErrorBoundary fallback={<p>Loading forever</p>}><React.Suspense fallback={<p>Loading route</p>}><MissingPage /></React.Suspense></ComponentErrorBoundary>);
    expect(await screen.findByRole('heading', { name: 'This page needs a refresh.' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('A page file could not load.');
    expect(screen.getByRole('button', { name: 'Refresh page' })).toBeEnabled();
    expect(screen.getByRole('link', { name: 'Go to homepage' })).toHaveAttribute('href', '/');
    expect(screen.queryByText('Loading forever')).not.toBeInTheDocument();
  } finally { log.mockRestore(); }
});

test('ordinary component failures retain their provided fallback', () => {
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  const Broken = () => { throw new Error('Ordinary component failure'); };
  try {
    render(<ComponentErrorBoundary fallback={<p>Local component recovery</p>}><Broken /></ComponentErrorBoundary>);
    expect(screen.getByText('Local component recovery')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Refresh page' })).not.toBeInTheDocument();
  } finally { log.mockRestore(); }
});
