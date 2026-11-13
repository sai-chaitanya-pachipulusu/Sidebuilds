import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import RecoveryLayout from '../components/RecoveryLayout';
import { resetPassword, validatePasswordResetLink } from '../services/api';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [linkState, setLinkState] = useState('checking');
  const [retry, setRetry] = useState(0);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const form = useRef(null);

  useEffect(() => {
    let active = true;
    setPassword(''); setConfirm(''); setErrors({}); setError('');
    if (!token) { setLinkState('invalid'); return; }
    setLinkState('checking');
    validatePasswordResetLink(token).then(result => {
      if (active) setLinkState(result.valid ? 'valid' : 'invalid');
    }).catch(failure => {
      if (active) setLinkState(failure.status === 400 ? 'invalid' : 'unavailable');
    });
    return () => { active = false; };
  }, [token, retry]);

  async function submit(event) {
    event.preventDefault();
    if (pending || linkState !== 'valid') return;
    const nextErrors = {};
    if (password.length < 8) nextErrors.password = 'Use at least 8 characters.';
    if (password !== confirm) nextErrors.confirm = 'The passwords do not match.';
    setErrors(nextErrors); setError('');
    if (Object.keys(nextErrors).length) {
      form.current?.querySelector(`[name="${Object.keys(nextErrors)[0]}"]`)?.focus();
      return;
    }
    setPending(true);
    try {
      await resetPassword({ token, password });
      setPassword(''); setConfirm(''); setLinkState('complete');
    } catch (failure) {
      if (failure.code === 'RESET_LINK_INVALID' || (failure.status === 400 && /invalid|expired/i.test(failure.message || ''))) {
        setPassword(''); setConfirm(''); setLinkState('invalid');
      } else setError(failure.status === 429 ? 'Too many attempts. Wait 15 minutes before trying again.' : 'Your password could not be changed. Please try again.');
    } finally { setPending(false); }
  }

  const field = (name, label, value, change, visible, toggle) => <div className="sb-auth-field">
    <label htmlFor={`recovery-${name}`}>{label}</label>
    <div className="sb-password-wrap">
      <input id={`recovery-${name}`} name={name} type={visible ? 'text' : 'password'} value={value}
        autoComplete="new-password" spellCheck={false} required minLength={8} disabled={pending}
        onChange={event => { change(event.target.value); setErrors(old => ({ ...old, [name]: undefined })); }}
        aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `${name}-error` : name === 'password' ? 'password-guidance' : undefined} />
      <button type="button" className="sb-recovery-show" aria-label={`${visible ? 'Hide' : 'Show'} ${name === 'confirm' ? 'confirmation password' : 'new password'}`} aria-pressed={visible} onClick={toggle}>{visible ? 'Hide' : 'Show'}</button>
    </div>
    {errors[name] && <p className="sb-field-error" id={`${name}-error`}>{errors[name]}</p>}
    {name === 'password' && <p className="sb-field-hint" id="password-guidance">At least 8 characters. Use a password you haven’t used elsewhere.</p>}
  </div>;

  return <RecoveryLayout title={linkState === 'complete' ? 'Password updated' : linkState === 'invalid' ? 'This link has expired' : 'Set a new password'}
    description={linkState === 'complete' ? 'Your new password is ready. Sign in to continue.' : linkState === 'invalid' ? 'Reset links expire after an hour and can only be used once. You’ll need a new link to continue.' : 'Choose a unique password for your SideBuilds account.'}>
    {linkState === 'checking' && <p className="sb-recovery-notice" role="status">Checking your reset link…</p>}
    {linkState === 'invalid' && <div className="sb-recovery-notice" role="alert"><p>The link may have expired, been replaced or already been used.</p><Link className="sb-button sb-recovery-submit" to="/forgot-password">Recovery options<ArrowRight size={17} aria-hidden="true" /></Link></div>}
    {linkState === 'unavailable' && <div className="sb-recovery-notice" role="alert"><p>We couldn’t check this link. Please try again before entering a password.</p><button className="sb-button sb-button-secondary" onClick={() => setRetry(value => value + 1)}>Check link again</button></div>}
    {linkState === 'complete' && <div className="sb-recovery-notice" role="status"><Link className="sb-button sb-recovery-submit" to="/login">Continue to sign in<ArrowRight size={17} aria-hidden="true" /></Link></div>}
    {linkState === 'valid' && <form ref={form} onSubmit={submit} noValidate aria-busy={pending}>
      {error && <p className="sb-form-error" role="alert">{error}</p>}
      {field('password', 'New password', password, setPassword, show, () => setShow(value => !value))}
      {field('confirm', 'Confirm new password', confirm, setConfirm, showConfirm, () => setShowConfirm(value => !value))}
      <button className="sb-button sb-recovery-submit" type="submit" disabled={pending}>{pending ? 'Updating password…' : 'Update password'}<ArrowRight size={17} aria-hidden="true" /></button>
    </form>}
  </RecoveryLayout>;
}
