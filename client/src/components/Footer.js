import React from "react";
import { Link } from "react-router-dom";
import Logo from "./Logo";
export default function Footer() {
  return (
    <footer className="sb-footer">
      <div className="sb-container">
        <div className="sb-footer-main">
          <div>
            <Link className="sb-brand" to="/">
              <Logo size={26} />
              <span>
                SideBuilds<span className="sb-brand-dot">.</span>
              </span>
            </Link>
            <p>A next chapter for your side project.</p>
          </div>
          <nav aria-label="Footer navigation">
            <Link to="/marketplace">Marketplace</Link>
            <Link to="/how-it-works">How it works</Link>
            <Link to="/faq">Help</Link>
            <Link to="/contact">Contact</Link>
          </nav>
        </div>
        <div className="sb-footer-bottom">
          <span>© {new Date().getFullYear()} SideBuilds</span>
          <div>
            <Link to="/terms">Terms</Link>
            <a href="mailto:support@sidebuilds.online?subject=Privacy%20question">
              Privacy questions
            </a>
            <a href="mailto:support@sidebuilds.online">Support</a>
          </div>
          <span>Made for the next build.</span>
        </div>
      </div>
    </footer>
  );
}
