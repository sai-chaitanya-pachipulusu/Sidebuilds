import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Search,
  SlidersHorizontal,
  X,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import { useDebounce } from "../hooks/useDebounce";
import { useBrowseData } from "../hooks/useBrowseData";
import { readMarketplaceSearch } from "../utils/navigation";
import BrowseProjectCard, {
  stageLabels,
} from "../components/BrowseProjectCard";
import SEO from "../components/SEO";
const sortOptions = {
  newest: ["created_at", "desc"],
  "price-low": ["sale_price", "asc"],
  "price-high": ["sale_price", "desc"],
  revenue: ["monthly_revenue", "desc"],
  views: ["view_count", "desc"],
  score: ["overall_score", "desc"],
};
const filterNames = {
  q: "Search",
  stage: "Stage",
  minPrice: "Min price",
  maxPrice: "Max price",
  techStack: "Technology",
  category: "Category",
};
export default function Marketplace() {
  const [params, setParams] = useSearchParams();
  const state = useMemo(() => readMarketplaceSearch(params), [params]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterButton = useRef(null);
  const update = (changes, replace = true) =>
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        for (const [key, value] of Object.entries(changes)) {
          if (
            value === "" ||
            value == null ||
            (key === "page" && value === 1) ||
            (key === "sort" && value === "newest")
          )
            next.delete(key);
          else next.set(key, String(value));
        }
        return next;
      },
      { replace },
    );
  const query = useDebounce(state.search, 250),
    filters = useDebounce(JSON.stringify(state.filters), 250);
  const parsedFilters = JSON.parse(filters);
  const [sortBy, sortOrder] = sortOptions[state.sort];
  const priceValues = [state.filters.minPrice, state.filters.maxPrice];
  const invalidPrice = priceValues.some(
    (value) => value !== "" && !/^\d+(\.\d{1,2})?$/.test(value),
  );
  const invalidRange =
    priceValues.every((value) => value !== "") &&
    Number(priceValues[0]) > Number(priceValues[1]);
  const budgetError = invalidPrice
    ? "Use a non-negative price with up to 2 decimal places."
    : invalidRange
      ? "Set the minimum below the maximum price."
      : "";
  const invalidBudget = Boolean(budgetError);
  const queryUpdating =
    query !== state.search || filters !== JSON.stringify(state.filters);
  const listings = useBrowseData(
    {
      page: state.page,
      limit: 12,
      q: query,
      ...parsedFilters,
      sortBy,
      sortOrder,
    },
    !invalidBudget && !queryUpdating,
  );
  const busy = listings.loading || queryUpdating;
  const active = Object.entries({ q: state.search, ...state.filters }).filter(
    ([, value]) => value !== "",
  );
  const totalPages = Number(listings.pagination?.totalPages) || 1;
  useEffect(() => {
    if (!busy && !listings.error && state.page > totalPages)
      update({ page: totalPages });
  }, [busy, listings.error, state.page, totalPages]); // eslint-disable-line react-hooks/exhaustive-deps
  const clear = () =>
    update(
      Object.fromEntries([
        ...Object.keys(filterNames).map((key) => [key, ""]),
        ["page", 1],
      ]),
    );
  const page = (value) => {
    update({ page: value }, false);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const filter = (key, value) => update({ [key]: value, page: 1 });
  return (
    <div className="sb-page sb-marketplace">
      <SEO
        title="Browse side projects — SideBuilds"
        description="Find side projects by budget, technology and stage. Compare seller-provided details and start a conversation."
      />
      <div className="sb-container">
        <header className="sb-browse-heading">
          <div>
            <span className="sb-eyebrow">The marketplace</span>
            <h1>
              Make it your <em>next build.</em>
            </h1>
            <p>
              Find a starting point that fits your skills, ambition and budget.
            </p>
          </div>
          <Link className="sb-text-link" to="/how-it-works">
            New here? Start with the basics{" "}
            <ArrowUpRight size={17} aria-hidden="true" />
          </Link>
        </header>
        <div className="sb-search-bar">
          <div className="sb-search-field">
            <label htmlFor="marketplace-search" className="sb-sr-only">
              Search marketplace
            </label>
            <Search size={21} aria-hidden="true" />
            <input
              id="marketplace-search"
              type="search"
              placeholder="Search projects, technology, or an idea…"
              maxLength={200}
              value={state.search}
              onChange={(e) => filter("q", e.target.value)}
            />
            {state.search && (
              <button
                className="sb-icon-button"
                aria-label="Clear search"
                onClick={() => filter("q", "")}
              >
                <X size={17} aria-hidden="true" />
              </button>
            )}
          </div>
          <div className="sb-sort-field">
            <label htmlFor="browse-sort">Sort by</label>
            <select
              id="browse-sort"
              value={state.sort}
              onChange={(e) => update({ sort: e.target.value, page: 1 })}
            >
              <option value="newest">Newest listed</option>
              <option value="price-low">Price: low to high</option>
              <option value="price-high">Price: high to low</option>
              <option value="revenue">Highest revenue</option>
              <option value="views">Most viewed</option>
              <option value="score">AI score, when available</option>
            </select>
          </div>
          <button
            className="sb-button sb-button-secondary sb-mobile-filter-toggle"
            ref={filterButton}
            aria-expanded={filtersOpen}
            aria-controls="browse-filters"
            onClick={() => setFiltersOpen((value) => !value)}
          >
            <SlidersHorizontal size={18} aria-hidden="true" />
            Filters{active.length ? ` (${active.length})` : ""}
          </button>
        </div>
        <div className="sb-browse-layout">
          <aside
            className={`sb-filter-panel${filtersOpen ? " is-open" : ""}`}
            id="browse-filters"
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setFiltersOpen(false);
                filterButton.current?.focus();
              }
            }}
            aria-label="Filter projects"
          >
            <div className="sb-filter-title">
              <h2>
                <SlidersHorizontal size={16} aria-hidden="true" />
                Filters
              </h2>
              <button onClick={clear} disabled={!active.length}>
                Reset
              </button>
            </div>
            <div className="sb-filter-group">
              <label htmlFor="browse-stage">Project stage</label>
              <select
                id="browse-stage"
                value={state.filters.stage}
                onChange={(e) => filter("stage", e.target.value)}
              >
                <option value="">Any stage</option>
                {Object.entries(stageLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <fieldset className="sb-filter-group">
              <legend>Budget · USD</legend>
              <div className="sb-budget-inputs">
                <div>
                  <label htmlFor="browse-min">Minimum price</label>
                  <input
                    id="browse-min"
                    type="text"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    placeholder="No min"
                    value={state.filters.minPrice}
                    onChange={(e) => filter("minPrice", e.target.value)}
                    aria-invalid={invalidBudget}
                    aria-describedby={
                      invalidBudget ? "budget-error" : undefined
                    }
                  />
                </div>
                <span aria-hidden="true">–</span>
                <div>
                  <label htmlFor="browse-max">Maximum price</label>
                  <input
                    id="browse-max"
                    type="text"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    placeholder="No max"
                    value={state.filters.maxPrice}
                    onChange={(e) => filter("maxPrice", e.target.value)}
                    aria-invalid={invalidBudget}
                    aria-describedby={
                      invalidBudget ? "budget-error" : undefined
                    }
                  />
                </div>
              </div>
              {invalidBudget && (
                <p id="budget-error" className="sb-field-error" role="alert">
                  {budgetError}
                </p>
              )}
            </fieldset>
            <div className="sb-filter-group">
              <label htmlFor="browse-tech">Technology</label>
              <input
                id="browse-tech"
                placeholder="e.g. React, Python"
                maxLength={200}
                value={state.filters.techStack}
                onChange={(e) => filter("techStack", e.target.value)}
              />
              <p>Separate technologies with a comma.</p>
            </div>
            <div className="sb-filter-group">
              <label htmlFor="browse-category">Category</label>
              <input
                id="browse-category"
                list="browse-category-options"
                placeholder="Any category"
                maxLength={50}
                value={state.filters.category}
                onChange={(e) => filter("category", e.target.value)}
              />
              <datalist id="browse-category-options">
                {[
                  "analytics",
                  "saas",
                  "ai",
                  "developer_tools",
                  "productivity",
                  "ecommerce",
                  "education",
                  "mobile",
                ].map((value) => (
                  <option key={value} value={value} />
                ))}
              </datalist>
            </div>
            <div className="sb-filter-tip">
              <ArrowUpRight size={17} aria-hidden="true" />
              <p>
                Your filters stay in the address. Bookmark this page to pick up
                where you left off.
              </p>
            </div>
          </aside>
          <section
            className="sb-browse-results"
            aria-label="Project results"
            aria-busy={busy}
          >
            <h2 className="sb-sr-only">Project results</h2>
            <div className="sb-results-topline">
              <p role="status" aria-live="polite">
                {busy
                  ? "Finding your next project…"
                  : listings.error
                    ? "Listings unavailable"
                    : invalidBudget
                      ? "Adjust your budget to see matching projects"
                      : `${listings.pagination?.total || 0} ${listings.pagination?.total === 1 ? "project" : "projects"} available`}
              </p>
              <span className="sb-small">Direct from their builders</span>
            </div>
            {!!active.length && (
              <div className="sb-active-filters" aria-label="Active filters">
                {active.map(([key, value]) => (
                  <button
                    key={key}
                    onClick={() => filter(key, "")}
                    aria-label={`Remove ${filterNames[key]} filter: ${value}`}
                  >
                    {filterNames[key]}:{" "}
                    {key === "stage" ? stageLabels[value] || value : value}
                    <X size={13} aria-hidden="true" />
                  </button>
                ))}
                <button className="sb-clear-all" onClick={clear}>
                  Clear all
                </button>
              </div>
            )}
            {listings.error ? (
              <div className="sb-empty" role="alert">
                <Search size={28} aria-hidden="true" />
                <h2>The listings couldn’t load.</h2>
                <p>{listings.error}</p>
                <button
                  className="sb-button sb-button-secondary"
                  onClick={listings.retry}
                >
                  Try again
                </button>
              </div>
            ) : invalidBudget ? (
              <div className="sb-empty">
                <h2>Let’s adjust that budget.</h2>
                <p>
                  Use non-negative amounts with up to 2 decimals, with the
                  maximum at least the minimum. Your other filters will stay in
                  place.
                </p>
                <button
                  className="sb-button sb-button-secondary"
                  onClick={() =>
                    update({ minPrice: "", maxPrice: "", page: 1 })
                  }
                >
                  Clear budget
                </button>
              </div>
            ) : busy ? (
              <div
                className="sb-listing-grid sb-market-grid"
                aria-label="Loading projects"
              >
                {[1, 2, 3, 4].map((item) => (
                  <div key={item} className="sb-skeleton sb-card-skeleton" />
                ))}
              </div>
            ) : listings.projects.length ? (
              <>
                <div className="sb-listing-grid sb-market-grid">
                  {listings.projects.map((project) => (
                    <BrowseProjectCard
                      key={project.project_id}
                      project={project}
                    />
                  ))}
                </div>
                {totalPages > 1 && (
                  <nav className="sb-pagination" aria-label="Results pages">
                    <button
                      className="sb-icon-button"
                      aria-label="Previous page"
                      disabled={state.page === 1}
                      onClick={() => page(state.page - 1)}
                    >
                      <ChevronLeft size={20} aria-hidden="true" />
                    </button>
                    <span>
                      Page <strong>{state.page}</strong> of {totalPages}
                    </span>
                    <button
                      className="sb-icon-button"
                      aria-label="Next page"
                      disabled={state.page >= totalPages}
                      onClick={() => page(state.page + 1)}
                    >
                      <ChevronRight size={20} aria-hidden="true" />
                    </button>
                  </nav>
                )}
              </>
            ) : (
              <div className="sb-empty">
                <Search size={28} aria-hidden="true" />
                <h2>
                  {active.length
                    ? "No projects match just yet."
                    : "The next listing could be yours."}
                </h2>
                <p>
                  {active.length
                    ? "Try a broader search or remove a filter. You might find a different starting point."
                    : "Check back for new projects, or share something you’ve built."}
                </p>
                {active.length ? (
                  <button
                    className="sb-button sb-button-secondary"
                    onClick={clear}
                  >
                    Clear filters <ArrowRight size={17} aria-hidden="true" />
                  </button>
                ) : (
                  <Link
                    className="sb-button sb-button-secondary"
                    to="/register?next=%2Fcreate"
                  >
                    List a project
                  </Link>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
