import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import SEO from './SEO';

export default function RecoveryLayout({ title, description, children }) {
  return <div className="sb-page sb-recovery">
    <SEO title={title} description={description} noindex />
    <section className="sb-recovery-sheet" aria-labelledby="recovery-heading">
      <Link to="/login" className="sb-recovery-back"><ArrowLeft size={16} aria-hidden="true" />Back to sign in</Link>
      <header className="sb-recovery-heading">
        <p className="sb-eyebrow">Account access</p>
        <h1 id="recovery-heading">{title}</h1>
        <p>{description}</p>
      </header>
      {children}
      <p className="sb-recovery-footer">SideBuilds account recovery</p>
    </section>
  </div>;
}
