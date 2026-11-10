# UI/UX refresh review — November 9, 2026

## Scope and coverage

Reviewed and rebuilt the homepage, marketplace, sign-in and registration forms, shared navigation/footer, and their loading, validation, empty and error states. Stack: React 18, React Router 6, existing Tailwind styles, and a scoped semantic-token stylesheet (`client/src/styles/interface.css`). Project conventions came from the user-supplied AGENTS.md: preserve .env files, use live statistics, update QA and roadmap records. The user's linked [interface guidance](https://github.com/jakubkrehel/skills) informed the review.

This is a focused entry-to-browse/account refresh. Dashboard, project details/editor, purchase/transfer, admin and informational-page bodies retain their existing implementations. Payment configuration and database schema are outside this release. Earlier unrelated workspace improvements remain separate.

| Domain | Evidence inspected | Result |
| --- | --- | --- |
| Accessibility | Native card links, labels/names, heading order, skip link, keyboard focus, mobile disclosure, JSDOM axe checks | Addressed findings below; full assistive-technology audit remains unverified |
| UI | Home, marketplace, account forms and shared chrome; actual screenshots | Consistent dark/amber design, restrained surfaces and clear actions |
| Layout | Browser at 1440, 390 and 320 CSS pixels; visible-control geometry | No observed horizontal overflow in reviewed layouts |
| Typography | Computed styles, responsive headings, metadata, price and input formatting | Roles simplified; phone inputs 16px; USD cents preserved |
| Colors | Computed browser colors and WCAG contrast calculation | Sampled text/action/control pairs pass; not a complete pixel-level audit |
| Writing | Previous homepage claims, actual public API shape, auth and filter state copy | Unsupported claims removed; counts and recovery messages reflect actual state |

## Findings

All rows describe fixes included in this refresh.

| Severity | Domain | Location | Before | After | Why |
| --- | --- | --- | --- | --- | --- |
| HIGH | Accessibility | Marketplace project cards | Clickable containers and large composite names hindered keyboard/link navigation | Native project links named by their headings; separate named save buttons | Users can open/copy links and operate saves independently |
| HIGH | Writing | Homepage statistics | Wrong response-field names displayed zero despite live inventory | Read snake_case API fields; show unavailable on failure | Do not represent a failed request as an empty marketplace |
| HIGH | UI | Marketplace search/filtering | Filtering a fetched page could hide matches elsewhere | Parameterized SQL filters before pagination; consistent totals and stable sort | The complete inventory must be searchable |
| HIGH | Accessibility | Account forms and navigation | Inconsistent labels, unnamed icon controls and weak error recovery | Associated labels, autocomplete, named password toggles, inline errors and first-error focus | Forms and navigation remain usable without visual/icon interpretation |
| MEDIUM | Layout | Shared page frame | Legacy root and main offsets produced a large duplicate gap | One fixed-header offset | Put useful content near the start of the page |
| MEDIUM | UI | Marketplace states | Failures and empty results were difficult to distinguish | Loading, outage/retry, invalid-budget and clear-filter states | Give a useful next action without losing inputs |
| MEDIUM | UI | Search and account return paths | Search state and intended destinations could be lost | URL-backed filters and safe post-login destination | Preserve progress through browsing and authentication |
| MEDIUM | Writing | Homepage and footer | Unsupported verification/support/global-reach claims; broken privacy destination | Supported handover guidance and a clearly named privacy-contact link | Set accurate expectations without inventing a policy |
| MEDIUM | Typography | Browse screens | Dense competing type treatments and rounded prices | Clear display/body/metadata hierarchy and localized USD values | Improve scanning and preserve purchase-relevant precision |
| MEDIUM | Layout | Phone marketplace | Desktop controls crowded narrow screens | Keyboard-operable filter disclosure, stacked controls and full-width actions | Keep the same capabilities at 320px |
| MEDIUM | Accessibility | Shared route transitions | Page changes did not announce the new main content | Focus main on pathname changes; query edits retain input focus | Orient keyboard users without disrupting filtering |

## Verification

Passed before the frontend release:

- `node node_modules/react-scripts/bin/react-scripts.js test --watchAll=false --runInBand --testMatch '**/BrowseExperience.test.js'` in `client`: **14/14**. Covers truthful counts, outage vs empty, URL/decimal filters, stale-request races, native links, shared save state, auth validation/failure/success and two JSDOM axe semantic checks. Color contrast is excluded from JSDOM checks and measured separately below.
- `node --test tests/production-hotfix.test.js tests/marketplace-query.test.js` in `server`: **10/10**, including four real SQL inventory/filter tests and six existing production-hotfix regressions. One restricted-environment attempt could not connect to its loopback test server; rerunning with local network access passed.
- Production build via `node client/scripts/build.cjs`: compiled successfully with exact lockfile client dependencies, isolated QA API and test publishable-key placeholder. Root-relative assets support direct nested routes. No .env file was edited.
- Browser: desktop 1440px homepage and marketplace; 390px search; expanded filters and account form at 320px. Visible controls and document width fit the viewport. Searching for fixture 03 found its listing beyond the unfiltered first page. A minimum price of 21.50 excluded its 20.50 listing; Clear all recovered inventory. Query edits retained field focus.
- Keyboard: Enter activated native links/disclosures/buttons; empty sign-in submission focused `auth-email` with a visible 2px focus ring. Existing local QA account signed in and reached its dashboard; account menu and sign-out worked.
- Actual computed color pairs: body #f3f1ec on #101113 **16.74:1**; secondary #b8bac2 on #191b1f **8.90:1**; muted #a1a4af on #191b1f **6.93:1**; primary-action #242018 on #f0b86c **9.10:1**; control border #737782 on #191b1f **3.85:1**; focus #f6c57f on #191b1f **10.85:1**. Error-token #ffb3ae on #191b1f calculates **10.11:1**. These are sampled pairs, not an assertion about every legacy surface.
- Live backend filtering release `b66d6de`: nonexistent search returned 0/HTTP 200, invalid budget HTTP 400, price sort 2 listings/HTTP 200; all responses no-store.

Not verified: full browser axe run (browser command timed out), real screen-reader use, 200% zoom, RTL and every legacy page. Browser signup submission/Terms acceptance and email delivery were not performed. Completed Stripe payments and transfers remain separate work. Reduced-motion support is implemented through MotionConfig/CSS but a full preference-driven browser audit was not performed.

Evidence: gitignored `.tmp/ux-evidence/client-tests.log`, `build.log`, `home-desktop.png`, and release evidence recorded in PRODUCTION_QA_REPORT.md. Production deployment and post-release checks are recorded there rather than assumed from a successful build.

## Verdict

**Approve** for the inspected homepage, marketplace, account forms and shared chrome: no HIGH findings remain in this scope. This is not approval of unreviewed legacy page bodies or an assertion of complete WCAG conformance. Next: carry the same system into project details, the seller editor and dashboard, then review informational claims and perform assistive-technology testing.
