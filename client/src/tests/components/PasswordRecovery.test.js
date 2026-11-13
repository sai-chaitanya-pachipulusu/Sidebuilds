import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Reset from '../../pages/ResetPasswordPage';
import Forgot from '../../pages/ForgotPasswordPage';
import api, { resetPassword, validatePasswordResetLink, requestPasswordReset } from '../../services/api';
jest.mock('../../services/api', () => ({ __esModule: true, default: { get: jest.fn() }, resetPassword: jest.fn(), validatePasswordResetLink: jest.fn(), requestPasswordReset: jest.fn() }));
jest.mock('../../components/SEO', () => () => null);
const open = (Page = Reset, route = '/reset-password?token=synthetic-link') => render(<MemoryRouter initialEntries={[route]}><Page /></MemoryRouter>);
const fill = (confirmation = 'Synthetic-password-2026!') => {
  fireEvent.change(screen.getByLabelText('New password', { exact: true }), { target: { value: 'Synthetic-password-2026!' } });
  fireEvent.change(screen.getByLabelText('Confirm new password', { exact: true }), { target: { value: confirmation } });
};
beforeEach(() => { jest.resetAllMocks(); validatePasswordResetLink.mockResolvedValue({ valid: true }); api.get.mockResolvedValue({ data: { email_available: true } }); });
test('checks the link before asking for passwords', async () => {
  let resolve; validatePasswordResetLink.mockReturnValue(new Promise(done => { resolve = done; })); open();
  expect(screen.getByRole('status')).toHaveTextContent('Checking your reset link'); expect(screen.queryByLabelText('New password', { exact: true })).not.toBeInTheDocument();
  resolve({ valid: true }); expect(await screen.findByLabelText('New password', { exact: true })).toHaveAttribute('autocomplete', 'new-password');
  expect(validatePasswordResetLink).toHaveBeenCalledWith('synthetic-link');
});
test('expired links replace password fields with recovery options', async () => {
  validatePasswordResetLink.mockRejectedValue({ status: 400 }); open();
  expect(await screen.findByRole('heading', { name: 'This link has expired' })).toBeInTheDocument(); expect(screen.queryByLabelText('New password', { exact: true })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Recovery options' })).toHaveAttribute('href', '/forgot-password'); expect(resetPassword).not.toHaveBeenCalled();
});
test('missing tokens are rejected without a request', () => {
  open(Reset, '/reset-password'); expect(screen.getByRole('alert')).toHaveTextContent('link'); expect(validatePasswordResetLink).not.toHaveBeenCalled();
});
test('a temporary check failure offers a retry before password entry', async () => {
  validatePasswordResetLink.mockRejectedValueOnce({ status: 503 }).mockResolvedValueOnce({ valid: true }); open();
  fireEvent.click(await screen.findByRole('button', { name: 'Check link again' })); expect(await screen.findByLabelText('New password', { exact: true })).toBeInTheDocument();
});
test('mismatched passwords stay local with focused guidance', async () => {
  open(); await screen.findByLabelText('New password', { exact: true }); fill('Different-password!'); fireEvent.click(screen.getByRole('button', { name: 'Update password' }));
  expect(screen.getByText('The passwords do not match.')).toBeInTheDocument(); expect(screen.getByLabelText('Confirm new password', { exact: true })).toHaveFocus(); expect(resetPassword).not.toHaveBeenCalled();
});
test('success clears passwords and offers sign-in', async () => {
  resetPassword.mockResolvedValue({}); open(); await screen.findByLabelText('New password', { exact: true }); fill(); fireEvent.click(screen.getByRole('button', { name: 'Update password' }));
  expect(await screen.findByRole('heading', { name: 'Password updated' })).toBeInTheDocument(); expect(screen.getByRole('link', { name: 'Continue to sign in' })).toHaveAttribute('href', '/login'); expect(screen.queryByLabelText('New password', { exact: true })).not.toBeInTheDocument(); expect(resetPassword).toHaveBeenCalledTimes(1);
});
test('expiry during entry removes passwords and offers recovery', async () => {
  resetPassword.mockRejectedValue({ status: 400, message: 'Invalid or expired reset link.' }); open(); await screen.findByLabelText('New password', { exact: true }); fill(); fireEvent.click(screen.getByRole('button', { name: 'Update password' }));
  expect(await screen.findByRole('heading', { name: 'This link has expired' })).toBeInTheDocument(); expect(screen.queryByLabelText('New password', { exact: true })).not.toBeInTheDocument();
});
test('email outage is explained before asking for an address', async () => {
  api.get.mockResolvedValue({ data: { email_available: false } }); open(Forgot, '/forgot-password'); expect(await screen.findByRole('alert')).toHaveTextContent('Email recovery is temporarily unavailable'); expect(screen.queryByLabelText('Email address')).not.toBeInTheDocument(); expect(requestPasswordReset).not.toHaveBeenCalled();
});
test('available recovery confirms a request without revealing account existence', async () => {
  requestPasswordReset.mockResolvedValue({}); open(Forgot, '/forgot-password'); fireEvent.change(await screen.findByLabelText('Email address'), { target: { value: 'dummy@example.com' } }); fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }));
  expect(await screen.findByRole('status')).toHaveTextContent('If that address has an account'); expect(requestPasswordReset).toHaveBeenCalledWith('dummy@example.com');
});
test('delivery failure never claims a reset link was sent', async () => {
  requestPasswordReset.mockRejectedValue({ code: 'EMAIL_SEND_FAILED' }); open(Forgot, '/forgot-password'); fireEvent.change(await screen.findByLabelText('Email address'), { target: { value: 'dummy@example.com' } }); fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('temporarily unavailable')); expect(screen.queryByText('Check your inbox')).not.toBeInTheDocument();
});
