import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Search,
  MessageSquare,
  PackageCheck,
  Plus,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import SEO from "../components/SEO";
import BrowseProjectCard from "../components/BrowseProjectCard";
import { useBrowseData, useBrowseStats } from "../hooks/useBrowseData";
function Stats() {
  const { loading, values } = useBrowseStats();
  if (!loading && !values)
    return (
      <p className="sb-stats-note" role="status">
        Live marketplace counts are unavailable. You can still browse the
        listings.
      </p>
    );
  return (
    <dl className="sb-market-stats" aria-label="Live marketplace statistics">
      {["Projects for sale", "Shared projects", "Registered accounts"].map(
        (label, index) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>
              {loading ? (
                <span
                  className="sb-skeleton sb-stat-skeleton"
                  aria-label="Loading"
                />
              ) : (
                new Intl.NumberFormat("en-US").format(values[index])
              )}
            </dd>
          </div>
        ),
      )}
    </dl>
  );
}
export default function HomePage() {
  const { isAuthenticated } = useAuth();
  const listings = useBrowseData({ page: 1, limit: 3 });
  const create = isAuthenticated ? "/create" : "/register?next=%2Fcreate";
  return (
    <div className="sb-page sb-home">
      <SEO
        title="SideBuilds — A next chapter for your side project"
        description="Find a side project to make your own, or find its next owner. Explore listings by stage, technology and asking price."
      />
      <section className="sb-container sb-hero" aria-labelledby="home-heading">
        <div className="sb-hero-copy">
          <span className="sb-eyebrow">
            <span className="sb-status-dot" />
            Built by people who build.
          </span>
          <h1 className="sb-display" id="home-heading">
            Good projects deserve
            <br />a <em>next chapter.</em>
          </h1>
          <p className="sb-hero-description">
            Find a side project to make your own. Or find the right next owner
            for something you’ve built.
          </p>
          <div className="sb-actions">
            <Link className="sb-button sb-button-primary" to="/marketplace">
              Browse projects <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link className="sb-button sb-button-secondary" to={create}>
              <Plus size={18} aria-hidden="true" />
              List a project
            </Link>
          </div>
          <p className="sb-quiet-note">
            Explore freely. Start a conversation when you find a fit.
          </p>
          <Stats />
        </div>
        <div className="sb-hero-preview">
          <div className="sb-preview-label">
            <span>On the marketplace</span>
            <span className="sb-tiny-index">01 / Explore</span>
          </div>
          {listings.loading ? (
            <div
              className="sb-skeleton sb-preview-skeleton"
              role="status"
              aria-label="Loading a project"
            />
          ) : listings.projects[0] ? (
            <BrowseProjectCard project={listings.projects[0]} featured />
          ) : (
            <div className="sb-preview-empty">
              <PackageCheck size={32} aria-hidden="true" />
              <h2>A place for your next build.</h2>
              <p>
                {listings.error
                  ? "Listings are temporarily unavailable. Try the marketplace again."
                  : "Share a project and help its next chapter begin."}
              </p>
              <Link to={listings.error ? "/marketplace" : create}>
                Explore SideBuilds <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          )}
          <div className="sb-preview-footnote">
            <span className="sb-status-dot" />
            <p>Real projects. Direct conversations with their builders.</p>
          </div>
        </div>
      </section>
      <section
        className="sb-container sb-section"
        aria-labelledby="latest-heading"
      >
        <div className="sb-section-heading">
          <div>
            <span className="sb-eyebrow">The marketplace</span>
            <h2 id="latest-heading">Your next starting point.</h2>
            <p>Explore what’s available. Make it something of your own.</p>
          </div>
          <Link className="sb-text-link" to="/marketplace">
            View all projects <ArrowUpRight size={18} aria-hidden="true" />
          </Link>
        </div>
        {listings.error ? (
          <div className="sb-notice" role="alert">
            <p>{listings.error}</p>
            <button
              className="sb-button sb-button-secondary"
              onClick={listings.retry}
            >
              Try again
            </button>
          </div>
        ) : listings.loading ? (
          <div className="sb-listing-grid" aria-label="Loading projects">
            {[1, 2, 3].map((item) => (
              <div key={item} className="sb-skeleton sb-card-skeleton" />
            ))}
          </div>
        ) : listings.projects.length ? (
          <div className="sb-listing-grid">
            {listings.projects.map((project) => (
              <BrowseProjectCard key={project.project_id} project={project} />
            ))}
          </div>
        ) : (
          <div className="sb-empty">
            <h3>The next listing could be yours.</h3>
            <p>Have a project ready for a new owner? Start with a draft.</p>
            <Link className="sb-button sb-button-secondary" to={create}>
              List a project
            </Link>
          </div>
        )}
      </section>
      <section className="sb-process-section">
        <div className="sb-container">
          <div className="sb-section-heading">
            <div>
              <span className="sb-eyebrow">A clearer way forward</span>
              <h2>From a good fit to a clear handover.</h2>
            </div>
            <Link className="sb-text-link" to="/how-it-works">
              How it works <ArrowUpRight size={18} aria-hidden="true" />
            </Link>
          </div>
          <ol className="sb-process-grid">
            {[
              {
                icon: Search,
                title: "Find your fit",
                text: "Compare the asking price, stage and technology. Open a listing to see what the seller has shared.",
              },
              {
                icon: MessageSquare,
                title: "Get on the same page",
                text: "Ask questions and discuss the project. Clarify the assets, costs and support you expect.",
              },
              {
                icon: PackageCheck,
                title: "Plan the handover",
                text: "Agree on what changes hands and how. Keep the details clear before you move forward.",
              },
            ].map(({ icon: Icon, title, text }, index) => (
              <li key={title}>
                <span className="sb-step-number">0{index + 1}</span>
                <Icon size={23} aria-hidden="true" />
                <h3>{title}</h3>
                <p>{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <section className="sb-container sb-seller-note">
        <div>
          <span className="sb-eyebrow">Built something worth passing on?</span>
          <h2>Give it room to grow.</h2>
          <p>
            Keep building what’s next. Help someone else take this one further.
          </p>
        </div>
        <Link className="sb-button sb-button-secondary" to={create}>
          List your project <ArrowUpRight size={18} aria-hidden="true" />
        </Link>
      </section>
    </div>
  );
}
