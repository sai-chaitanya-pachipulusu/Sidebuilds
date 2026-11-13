import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import RecoveryLayout from '../components/RecoveryLayout';
import api, { requestPasswordReset } from '../services/api';

export default function ForgotPasswordPage() {
  const [available, setAvailable] = useState(null);
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    api.get('/public/commerce-status').then(result => { if (active) setAvailable(result.data.email_available === true); })
      .catch(() => { if (active) setAvailable('unknown'); });
    return () => { active = false; };
  }, []);
  async function submit(event) {
    event.preventDefault();
    if (pending || available === false) return;
    setPending(true); setError('');
    try { await requestPasswordReset(email.trim()); setSubmitted(true); }
    catch (failure) {
      if (['EMAIL_NOT_CONFIGURED', 'EMAIL_SEND_FAILED'].includes(failure.code)) setAvailable(false);
      else setError(failure.status === 429 ? 'Too many attempts. Wait 15 minutes before trying again.' : 'We couldn’t request a reset link. Please try again.');
    } finally { setPending(false); }
  }
  return <RecoveryLayout title="Reset your password" description={available === false ? 'Email reset links can’t be sent right now.' : 'Enter your account email to request a single-use reset link.'}>
    {available === null ? <p className="sb-recovery-notice" role="status">Checking recovery availability…</p>
      : available === false ? <div className="sb-recovery-notice" role="alert"><h2>Email recovery is temporarily unavailable</h2><p>We can’t send reset links right now. If you have a newer setup link, use that link. You can still sign in with your current password.</p><Link className="sb-button sb-button-secondary" to="/login">Back to sign in</Link></div>
      : submitted ? <div className="sb-recovery-notice" role="status"><h2>Check your inbox</h2><p>If that address has an account, you’ll receive a reset link. The link expires in one hour.</p><button className="sb-text-link" onClick={() => setSubmitted(false)}>Use a different email</button></div>
      : <form onSubmit={submit} aria-busy={pending}>
        {error && <p className="sb-form-error" role="alert">{error}</p>}
        <div className="sb-auth-field"><label htmlFor="recovery-email">Email address</label><input id="recovery-email" name="email" type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" placeholder="you@example.com" required disabled={pending} /></div>
        <button className="sb-button sb-recovery-submit" type="submit" disabled={pending}>{pending ? 'Requesting link…' : 'Send reset link'}<ArrowRight size={17} aria-hidden="true" /></button>
        <p className="sb-field-hint">Use the latest link you receive. Each link works once.</p>
      </form>}
  </RecoveryLayout>;
}
