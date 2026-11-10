import React, { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Menu,
  Plus,
  Bell,
  ArrowUpRight,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getNotifications } from "../services/api";
import Logo from "./Logo";
export default function NavBar() {
  const { user, isAuthenticated, logout } = useAuth();
  const [unread, setUnread] = useState(0);
  const mobile = useRef(null),
    account = useRef(null),
    location = useLocation(),
    navigate = useNavigate();
  useEffect(() => {
    if (mobile.current) mobile.current.open = false;
    if (account.current) account.current.open = false;
  }, [location.pathname, location.search]);
  useEffect(() => {
    let active = true;
    setUnread(0);
    if (isAuthenticated)
      getNotifications()
        .then((rows) => {
          if (active) setUnread(rows.filter((item) => !item.is_read).length);
        })
        .catch(() => {});
    return () => {
      active = false;
    };
  }, [isAuthenticated, user?.user_id]);
  const escape = (event) => {
    if (event.key === "Escape") {
      event.currentTarget.open = false;
      event.currentTarget.querySelector("summary")?.focus();
    }
  };
  const links = (
    <>
      <NavLink to="/marketplace">Marketplace</NavLink>
      <NavLink to="/how-it-works">How it works</NavLink>
      {isAuthenticated && <NavLink to="/dashboard">Dashboard</NavLink>}
    </>
  );
  return (
    <>
      <a className="sb-skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="sb-header">
        <div className="sb-container sb-nav">
          <Link to="/" className="sb-brand" aria-label="SideBuilds home">
            <Logo size={27} />
            <span>
              SideBuilds<span className="sb-brand-dot">.</span>
            </span>
          </Link>
          <nav className="sb-desktop-nav" aria-label="Main navigation">
            {links}
          </nav>
          <div className="sb-nav-actions">
            {isAuthenticated ? (
              <>
                <Link
                  className="sb-icon-button sb-notification-link"
                  to="/notifications"
                  aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
                >
                  <Bell size={19} aria-hidden="true" />
                  {unread > 0 && <span className="sb-notification-dot" />}
                </Link>
                <Link
                  className="sb-button sb-button-secondary sb-nav-list"
                  to="/create"
                >
                  <Plus size={16} aria-hidden="true" />
                  List a project
                </Link>
                <details
                  className="sb-account-menu"
                  ref={account}
                  onKeyDown={escape}
                >
                  <summary aria-label="Account menu">
                    <span className="sb-avatar">
                      {user?.username?.slice(0, 1).toUpperCase() || "A"}
                    </span>
                    <ChevronDown size={13} aria-hidden="true" />
                  </summary>
                  <div className="sb-dropdown">
                    <p className="sb-dropdown-name">
                      {user?.username || "Account"}
                    </p>
                    {[
                      ["My projects", "/my-projects"],
                      ["Saved projects", "/saved"],
                      ["Purchases", "/purchases"],
                      ["Profile settings", "/profile-settings"],
                      ...(user?.is_admin
                        ? [["Admin dashboard", "/admin"]]
                        : []),
                    ].map(([label, to]) => (
                      <Link key={to} to={to}>
                        {label}
                      </Link>
                    ))}
                    <button
                      onClick={async () => {
                        await logout();
                        navigate("/");
                      }}
                    >
                      <LogOut size={15} aria-hidden="true" />
                      Sign out
                    </button>
                  </div>
                </details>
              </>
            ) : (
              <>
                <Link className="sb-sign-in" to="/login">
                  Sign in
                </Link>
                <Link
                  className="sb-button sb-button-secondary sb-nav-list"
                  to="/register?next=%2Fcreate"
                >
                  List a project <ArrowUpRight size={15} aria-hidden="true" />
                </Link>
              </>
            )}
            <details className="sb-mobile-menu" ref={mobile} onKeyDown={escape}>
              <summary aria-label="Open navigation">
                <Menu size={22} aria-hidden="true" />
              </summary>
              <nav className="sb-dropdown" aria-label="Mobile navigation">
                {links}
                <Link
                  to={isAuthenticated ? "/create" : "/register?next=%2Fcreate"}
                >
                  List a project
                </Link>
              </nav>
            </details>
          </div>
        </div>
      </header>
    </>
  );
}
