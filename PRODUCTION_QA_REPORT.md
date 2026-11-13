# SideBuilds production audit and improvement plan

## FR7 — Password recovery and solid styling — November 13, 2026

The original operations setup invitation expired after its one-hour window; read-only renewal rehearsal confirmed the recorded account is still unclaimed, its password fingerprint is unchanged and the token is unused. A guarded renewal script now refuses activated accounts, replaced/used/unexpired invitations and identity/role mismatches. It does not change passwords or create administrators. The renewed private invitation will be issued after deployment, so its full one-hour lifetime is available to the owner.

Redesigned reset and forgot-password pages as a narrow, flat charcoal/cream form with a serif heading, visible labels, accessible show/hide buttons, inline validation and a clear completion state. Removed duplicate gradient branding, gradient buttons, glow and entrance motion. Public recovery explains unavailable email before collecting an address; no false sent-email confirmation. Expired or used links are checked before password entry, remove the form and offer recovery options. Temporary validation failures can be retried. Reset HTML uses no-referrer and account metadata stays noindex.

Added a rate-limited, no-store POST /auth/reset-password/validate that reads only bearer-link validity without returning identity or consuming the token. Its 30/15-minute read bucket is independent from login attempts. The actual password change remains server-validated and single-use.

Applied the no-gradient preference across authored UI: legacy Tailwind fills, text treatments, overlays, radial/conic glows, placeholders and chart fills now use solid colors. Numeric chart/score information remains. Source audit found no authored gradient functions/utility backgrounds; compiled CSS contains zero gradient functions. Preference is recorded in AGENTS.md.

Validation: 128/128 client tests, 86/86 server tests and 17/17 isolated PostgreSQL scenarios pass; production build succeeds. Ten recovery-state cases and three invitation-guard cases were added. PostgreSQL auth acceptance now includes non-consuming preflight and used-token rejection. Disposable schema removed. Visual preview uses synthetic read-only responses, never accepts password changes; desktop and real 390px viewport checked, no horizontal overflow, zero computed gradient backgrounds. Expired and email-unavailable screens observed; viewport restored. Screenshots: .tmp/recovery-ui/desktop.jpg and mobile.jpg. Deployment and actual invitation renewal remain pending until observed below. No .env or Stripe settings changed; live payments remain paused and email remains pending by user choice.

## FR6 — Production repair deployed; operator setup pending — November 12, 2026

Application release `114f776` is live on Vercel production deployment `dpl_E4WcYGP6CJmz74jB1io8TL22qRRq` (READY, public aliases assigned). Backend repair `4593147` was observed Live on Render deployment `dep-dbr88kh42hec73baf1p0`; subsequent application changes concern frontend hosting only. Fresh `/api/ready` and `/api/payments/health` both return 200: PostgreSQL connected, Stripe connected, mode live. Checkout still returns `503 LIVE_COMMERCE_PAUSED` for an authenticated QA account and creates no financial objects. No .env files or key values changed.

Validated: **82/82 server tests, 118/118 interface tests, 17/17 isolated PostgreSQL acceptance scenarios, 53/53 production synthetic feature checks, and 20/20 production page/asset/SEO checks**. Production build succeeds and explicitly packages 42 manifest-checked browser assets plus the private HTML renderer. The paid sandbox browser lifecycle passed through inquiry, agreed scope, hosted Checkout, webhook processing, private files, delivery, receipt, seller transfer and buyer ownership. Test money was reversed/refunded and the isolated schema removed. This is not a real production sale or proof of externally delivered production payment events.

Fixed release discoveries: the unresolved legacy API hostname caused listing/sitemap 503s; all hosted public reads/proxies now use the working Render host. Automatic function detection had omitted the browser assets; one explicit Build Output package now serves scripts/styles and the renderer. Both main assets, home, marketplace, listing, robots, sitemap, reset page and share image return 200; missing project/page URLs return 404 with noindex. Account pages are noindex. Chrome visibly loads both sale listings, accepts the existing dummy login, renders the authenticated dashboard and listing/buyer brief, and opens the mobile filter panel. The requested 390px viewport measured 520px in the connected Chrome surface, with no horizontal overflow; smaller device widths were not established. Viewport and temporary per-tab cache overrides were restored. Browser screenshot capture was unavailable in minimized Chrome; the in-app preview showed only initial HTML. Existing sandbox receipt screenshots remain the visual evidence, not a claim about a current production screenshot.

Live synthetic tests removed their temporary project/file/save/follow. Final read-only database observation: **37 accounts = 3 tagged QA + 1 new internal administrator + 33 other registrations**, 3 original projects (2 for sale), zero transactions, inquiries or files. The other registrations include 3 likely tests and 30 unverified accounts; there is no established genuine-active-user count. All **55 public tables have RLS enabled**, with zero anon/authenticated direct SELECT grants.

Created only the requested new operations identity: **sidebuilds_ops_191b0b**. No existing customer was promoted. Its random unusable initial password was discarded. The owner chooses a password using the private, single-use link in `.tmp/production-admin/ADMIN_SETUP.md`; it expires November 13 at 12:37 a.m. Eastern (05:37 UTC). Verified role=true, test=false, link unused/unexpired. No setup credential is included in this report, chat or Git. Owner sign-in to `/admin` remains pending; no real administrator password was entered by automation.

**Launch decision:** browsing and account/project workflows are available. Keep live monetary actions paused until the owner activates the operations account and is ready to handle purchase issues. Email recovery and purchase emails remain unavailable by the user's free-hosting/email-pending decision; no provider or paid plan was added. Free hosting can cold-start. Existing sellers still need current ownership/demo/repository/transfer evidence; the release does not certify listing quality, guarantee payment delivery, or establish visibility/conversion gains.

Evidence: `.tmp/repair-server-release.log`, `.tmp/repair-client-shipping.log`, `.tmp/repair-postgres-commerce.json`, `.tmp/production-audit/workflow-report.json`, `.tmp/repair-production-pages.json`, `.tmp/repair-live-gate.json`, `.tmp/repair-final-observation.json`, `.tmp/repair-browser/report.json`. Earlier sections are historical snapshots; this FR6 entry supersedes their release/test counts and pending-source status.

## FR3 — Release validation and operations handoff — November 12, 2026

The full Stripe sandbox browser journey passed: buyer/seller sign-in, public question, private inquiry/reply, both scope approvals, Stripe-hosted payment, signed raw webhook processing, private file upload/download, seller delivery, explicit receipt, seller transfer and buyer ownership. Payment $10.25, platform fee $0.51, seller transfer $9.74; the transfer was reversed and payment refunded. The isolated schema and local acceptance process were removed. Provider events were retrieved from Stripe's authenticated API and forwarded through a locally signed webhook; this does not claim an externally delivered production payment event. Evidence: .tmp/repair-browser/report.json and screenshots.

Current validation: 81 server tests and 118 interface tests in 19 suites pass; the production build compiles successfully. PostgreSQL acceptance passes 17 scenarios, including refunds, expired payout retry, QA/live separation, operator authorization and one-time password setup. Public signup cannot grant administrator access. All test schemas were removed. Migration rehearsal preserves 36 accounts and 3 projects with 55 public tables protected and zero anonymous/authenticated table access. Migrations 010, 011, 013, 014 and security migration 012 have been applied; existing account/project counts were preserved.

Production baseline remains 36 accounts: 3 explicitly tagged QA and 33 other registrations (including 3 likely tests and 30 unverified registrations); 3 projects, 2 for sale, zero paid transactions. No genuine active-user count is established. Internal administrator accounts are excluded from public customer counts.

The user requested a new operations identity instead of elevating an existing customer. A create-only bootstrap has passed a rollback rehearsal using an alias of the existing configured Gmail mailbox. A random unusable initial password is discarded; a single-use, 60-minute setup link will be written only to .tmp/production-admin/ADMIN_SETUP.md after deployment. No existing customer is promoted, and no password or key is sent in chat or committed. The owner must choose the password and sign in to /admin.

Refunds now retain their recorded amount. Full refunds before release close the unpaid request and release its reservation; refunds after seller release enter a review state. An administrator can close that review only after read-only Stripe verification of both a full refund and full seller-transfer reversal, with an audit timestamp/operator. No admin screen initiates refunds or payouts. Tagged QA accounts cannot initiate live checkout. Live commerce remains paused through release and operator setup.

The live Stripe destination was checked on November 10: active, correct backend URL, platform-account scope, and 25 subscribed events including checkout completion, refunds and dispute creation/update/closure. Its signing secret and scope were not changed. Connected-account account.updated coverage remains an optional separate destination; checkout/status perform fresh capability reads.

User decisions persist: keep free Render hosting and leave Gmail delivery pending; no .env edits, provider creation or paid hosting upgrade. Email recovery/notifications and free-plan cold-start reliability remain explicit limitations. Deployment identifiers, current production smoke, SEO responses and final handoff are appended after observation.

## FR2 — Full repair implementation and release validation — November 9, 2026

Implementation is in the isolated release checkout. Payments now require an approved itemized agreement, a committed single-project reservation, immutable fee/price snapshots, verified paid provider data, delivered handover and explicit buyer receipt. Durable webhook claims commit with business writes; failures are visible and return HTTP 500 for provider redelivery. Refunds/disputes block release. A durable payout-attempt marker blocks uncertain retries after 23 hours, before Stripe’s idempotency window can lapse. Exact request/session links replace ownership shortcuts.

Private uploads persist as capped PostgreSQL blobs (10 MB/file, 50 MB/project), with authenticated owner/paid-buyer access and downloads. The seller agreement page supports handover files and marking delivery; the buyer has a receipt review link. Public listing reads are restricted to intended public fields, and active checkout/hold states are explained. Login activity is recorded; QA classification and verified-transaction business metrics replace misleading status-only sales.

Search repair adds initial public listing HTML, canonical metadata, a genuine sitemap/robots response, correct missing/private 404s, noindex account pages and a share image. The guide/pricing/contact copy removes unsupported escrow, traction, support-time and paid-plan claims. An unrelated ebook was removed from release assets; its local copy is preserved.

Validation so far: 79 server checks passed before the last hold-state/profile refinements; 109 interface checks passed before the last hold-state refinement. Eleven real PostgreSQL acceptance scenarios pass in a disposable schema with a fake provider, including concurrency, rollback/retry, refund ordering and private-file persistence; the schema was removed. Five real Stripe test-ledger checks pass, including a test card payment and idempotent source-charge seller transfer; the test transfer was reversed and payment refunded. This is not proof of a fully paid hosted Checkout journey or a real sale. Latest complete-suite/build/deployment and production smoke results will be recorded below after verification.

Hosted settings saved: STRIPE_MODE=live and LIVE_COMMERCE_ENABLED=false. No .env file changed and no live financial operation was sent. The user chose to keep free Render hosting and leave Gmail delivery pending; password recovery and email notifications remain unavailable, and free hosting can cold-start. Keep checkout paused until the remaining commercial acceptance/operations requirements are met. See docs/FULL_REPAIR_2026-11-09.md for evidence and the remaining owner decisions.

## FR1 — Full marketplace repair underway — November 9, 2026

The user authorized full repair of PM1. Work proceeds on `codex/marketplace-full-repair` in `.tmp/ux`, preserving the original worktree and refreshed UI. First safeguard: live checkout/fund release require `LIVE_COMMERCE_ENABLED=true`; legacy request-only receipt/ownership actions are retired. Twelve focused server regressions pass, including the live-mode gate and existing marketplace/H1 checks. Safeguard f88ff090 is live on Render (dep-dbp93595efls73av78k0); authenticated production checkout returned 503 LIVE_COMMERCE_PAUSED without creating a financial object. No .env files or key values changed, and no financial operation was submitted. Inquiries, transaction lifecycle/schema, privacy, durable storage, email integration, SEO and accurate public copy are being repaired before a commercial launch sign-off.

## PM1 — Commercial launch and visibility review — November 9, 2026

**Decision: no unrestricted paid relaunch yet.** The site is already public and uses live Stripe keys. The green 53/53 workflow result establishes the tested basic account/project/file/Q&A/save/follow boundaries; it does not establish a complete payable inquiry → seller acceptance → checkout → paid webhook → handover → receipt → seller transfer journey. The UI approval covered entry/browse/account screens, not the remaining commercial pages.

Reviewed the clean release checkout at 123906a and confirmed the matching Vercel production deployment remains READY. Current read-only readiness/payment-health checks return 200 with PostgreSQL and Stripe connected. The new database snapshot still has 2 sale listings, 3 public projects, 36 registrations and zero purchase requests/private messages/transactions/public questions/saves after QA cleanup. Both sale listings ask $5,000 but have missing category/technology/demo/repository evidence and empty transferable-assets objects. Their stored seller onboarding flags disagree; actual current provider capabilities were not queried in this review.

Source/schema blockers: Buy Now constructs a default-exported singleton as a class and calls missing checkout/availability routes; receipt/dispute URLs duplicate the /api segment. Two ownership-confirmation routes lack a consistent paid-transaction prerequisite. The active webhook records status completed while the release route interprets that as already released and expects escrow/transfer fields absent from the live schema. Fee accounting derives a separate-charge commission from application_fee_amount even though this checkout does not set it. Competing sessions, release idempotency, failure/restart recovery and refund/dispute paths need isolated validation. The main seller inquiry modal receives mismatched message/date/status fields and has nonfunctional response controls; private-message notification links point to an unmounted route. Existing U1 public-detail privacy/cache repairs remain unreleased. No production exploit or financial action was attempted to demonstrate these paths.

Live visibility observations: /robots.txt and /sitemap.xml return the same HTML app shell as the homepage; /og-image.png is 404; homepage/marketplace/listing initial HTML contains generic metadata and no listing content/canonical. Rendered metadata exists, but one listing scrape captured only its loading state; this is not proof of Google deindexing. A missing-page URL returns 200. How It Works still advertises an escrow vault, verified projects and thousands of users, conflicting with current evidence. Search Console, traffic, rankings and conversion were not available for measurement. Local upload storage, the previously observed Free Render service and real email delivery remain operational launch gates.

Full findings, exact source locations, primary documentation, acceptance criteria and proposed 30-day supply/discovery plan: `docs/PRODUCT_LAUNCH_REVIEW_2026-11-09.md`. Exact read-only queries and public HTTP evidence: `.tmp/pm-readiness-audit.cjs` and `.tmp/pm-readiness/*`. Recommendation: limit promotion to a supported discovery beta; gate checkout until the paid-launch criteria pass, fix the seller inbox, curate 10–20 evidence-complete available listings as a proposed pilot target, repair public indexing/share output, and measure qualified inquiry-to-handover rather than raw registrations. No app code, hosted settings, .env, data, payments, emails or deployments changed in this review. Checkout gating and fixes are recommendations, not applied changes.

## V3 — Project and account provenance check — November 9, 2026

Read-only production snapshot at approximately 8:55 p.m. EST: **36 registered accounts**, comprising **3 confirmed QA accounts** (exact username/email matches to the three retained production-QA credential records), **3 additional likely test accounts** (test.com email addresses, not confirmed as QA) and **30 accounts not identified as tests**. No stored account matched the reviewed repository seed identities. These are account classifications, not a count of verified unique humans or active customers. No case-insensitive duplicate email addresses were found, but distinct email addresses do not establish distinct people. All account `is_verified` flags are false; `last_login_at` is empty and `login_count` is zero for every account, despite successful live sign-in tests, so those fields cannot establish activity.

There are **3 existing public projects, owned by 3 separate accounts not identified as tests**: RAG academy (for sale, created December 20, 2025), Pitchoo (not for sale, created December 26, 2025) and Mira AI (for sale, created February 22, 2026). They predate the production QA accounts, have stored external website links and do not match the reviewed local QA/seed listings. No temporary QA project remains. This establishes pre-existing user listings; it does not independently verify repository/domain ownership, working product functionality, revenue or sale readiness. There are zero recorded project transactions.

The homepage's 36 is correctly labelled registered accounts, and includes QA/test registrations. A defensible genuine-user count remains unverified. Follow-up: explicitly tag confirmed QA accounts and exclude them from business metrics, review the three likely tests without automatically deleting them, and record successful login/activity before publishing active-user claims. No production rows, settings, .env files or application code changed in this check; no deployment was performed. Exact read-only queries and sanitized evidence: `.tmp/audit-marketplace-provenance.cjs` and `.tmp/provenance-audit/report.json`. No passwords, private emails or session tokens are included in the evidence report.

## UX1 — Homepage, marketplace and account experience refresh — November 9, 2026

**Live on the production domains.** Released from isolated `codex/ui-ux-refresh`: backend inventory filtering `b66d6de0105ba83aa74621969bc6a3941c473612` is Render deployment `dep-dbp766h5efls73at52ug`; final frontend `123906a89d56be71b696b9f7b7527df44a90a1bb` is Vercel deployment `dpl_CzLydjA5SvNs9fw4LBJH4p3udUin`, READY with www.sidebuilds.online and sidebuilds.online aliases. The frontend-only follow-ups require no further backend release. Backend live probes confirm search returns matching totals, invalid budgets return 400, and sorting works with no-store responses. The main visual release was 3f777d0; follow-ups b24296e/c8cba7b/123906a complete session, search-control and page-load recovery.

The refresh keeps the dark/amber identity while simplifying navigation, showing real listings early and explaining supported buying/selling steps. Homepage counts now read the API's actual snake_case fields and show unavailable on failure. Native card links, separate named saves, URL-backed filters, decimal budgets, mobile filter disclosure, distinct error/empty/retry states, labelled account forms, password visibility, inline first-error focus and safe post-login return paths address observed friction. The footer contains working destinations; its privacy link explicitly opens a privacy question rather than claiming an absent policy.

Validation before frontend deployment: **14/14 UI regressions**, including two JSDOM axe semantic checks, and **10/10 server regressions** (four real SQL filter tests and six H1 regressions). The exact-lockfile production build passes. Browser checks cover 1440px desktop, 390px phone and 320px narrow layouts with no observed control overflow, full-inventory fixture search, decimal filtering/clear recovery, retained query focus, local QA sign-in to dashboard, account menu and sign-out. Sampled computed-color contrast: body 16.74:1, secondary card text 8.90:1, muted metadata 6.93:1, action 9.10:1, control boundary 3.85:1 and focus ring 10.85:1. Full browser axe timed out; real assistive technology, zoom/RTL, live signup submission/email and completed payments are not newly verified.

Final validation is **22/22 UI regressions**, plus the same **10/10 server regressions**, and a successful final production build. The live review found two existing recovery defects: recursively refreshing an expired refresh request consumed the authentication rate limit and forced public visitors to sign-in; a stale lazy-loaded route across deployments could be hidden by a permanent spinner. The release now shares one bounded refresh, retains public browsing, preserves private destinations, safely reads a corrupted saved profile and provides explicit Refresh page/homepage actions on a missing page file. Eight additional tests cover session recovery and genuine rejected React.lazy imports with an ordinary-error control. Local browser sign-in resumed `/saved?from=marketplace`; live guest search found RAG academy, direct project reload loaded, mobile navigation opened the signup form, and all four signup text fields fit at 320px with 16px text and associated labels. Terms were not accepted/submitted. The duplicate native search-clear icon was removed, retaining the labelled clear button.

**The final live workflow rerun passes 53/53 checks**, completed around 8:49 p.m. EST. The first attempt stopped at initial QA login HTTP 429 before mutations; after allowing the normal cooldown to expire, the existing dummy accounts signed in and completed the full workflow. Profile/dashboard, project creation/editing/visibility, owner boundaries, private upload/download, saves, question/answer persistence/privacy, follows/retries, notification reads and basic authenticated/anonymous socket boundaries pass. Cleanup returned HTTP 200 for the temporary file, save, follow and project. The limit was respected and no rate-limit settings were changed.

The final post-cleanup read-only audit passes **7/7 API checks** and **6/6 integrity checks**, with 36 users, 3 projects, 2 listings and zero remaining fixture files/saves/follows/questions/purchases/transactions. Three new notifications remain on the existing QA accounts (21 total), and their synthetic profile/read state was exercised; non-QA accounts were not edited. Metadata confirms **48 protected public tables, zero RLS-disabled tables and zero direct browser-role table access**. A final browser-bundle check found the matching live publishable key, zero server API-key patterns and healthy payment/database connectivity. The client guard allowed the intended live configuration and rejected server credentials in browser variables, mixed modes and test settings targeting the production API. No completed payment or provider operation was submitted.

Review and scope: `docs/UI_UX_REVIEW.md`. Runtime source is in `.tmp/ux`; original workspace changes remain untouched. Screenshots/logs are in `.tmp/ux-evidence`, including `client-tests-final.log`, `build-final.log`, `workflow-final.json`, `production-audit.json`, `rls-recheck.json`, `public-release-check.json`, `live-home-desktop.png`, `live-marketplace-mobile.png` and `live-signup-320.png`. No .env files, Stripe keys/settings or database schema were changed. The server-side U12 release remains separate. Project details/editor, dashboard and informational bodies are the next design scope; this refresh does not ship all earlier U1–U13 work. Resume UI development from `.tmp/ux` to avoid accidentally releasing the unrelated original-workspace changes.

## S1 — Supabase public-table access secured in production — November 9, 2026

Log follow-up: the user's pasted 6:34 p.m. log contains exactly 98 expected permission-denied entries and one rolled-back QA table creation, matching this verification. A metadata-only recheck confirmed `public.__qa_rls_defaults_7eee98efb9` does not exist and zero public tables have RLS disabled. Fresh readiness and marketplace requests return HTTP 200. No permissions were reopened or application changes made. Evidence: `.tmp/rls-audit/log-followup.json`; expected log behavior is documented in the access runbook.

**Applied and verified in Supabase at approximately 6:32–6:36 p.m. EST.** The metadata review found all **48** public application tables with RLS disabled and grants for both `anon` and `authenticated`, covering all 17 tables reported by the user plus account, notification, reset-token and payment tables. There were no existing public policies or public security-definer functions. The `user_dashboard` view also had browser-role SELECT grants and default owner-based access. No user rows were retrieved to demonstrate exposure, and no historical-access or breach conclusion is made.

SideBuilds uses custom JWT authentication in Express and a trusted `postgres` connection; the browser does not use Supabase client/Auth/Data API access. The current database role already owns the application objects and has BYPASSRLS. Migration `012_backend_only_public_rls.sql` therefore enables RLS with no permissive policies, revokes direct table/sequence grants from PUBLIC/anon/authenticated, makes the ordinary view use invoker security, and removes browser grants from future postgres-created public tables/sequences. The backend role, managed schemas and existing service-role SELECT access were not changed. This preserves access through the app's existing API authorization.

Validation: the full migration and assertions passed inside a rolled-back rehearsal, then committed atomically. A second application also passed and rolled back, verifying idempotence. All **48 tables** now have RLS enabled; the **one view** is secured; effective browser-role object/column grants and sequence grants are absent; future application table/sequence default grants are closed. Actual SELECT authorization attempts against all 49 objects as each browser role were denied with PostgreSQL 42501: **98/98 denial checks**, using LIMIT 0 without reading rows. A synthetic future-table/identity-sequence test was rolled back and its table's absence confirmed afterward.

After the change, **53/53 live workflow checks** still pass, including login, dashboard, project CRUD/visibility, private file access, saves, Q&A, follows and socket access boundaries. The final seven read-only API checks and six data-integrity checks pass. Counts remain 36 users and 3 projects, with zero remaining fixture files/saves/follows/questions/purchases/transactions. Three new notifications remain on the existing QA accounts (18 total), and those accounts' test profile/read state was exercised; non-QA accounts were not edited. This run did not newly test signup-form submission, email delivery or a completed payment.

No `.env` files or payment settings changed. No application redeployment was required: the running application remains H1 commit `bc048a1`. The security migration and repeatable runner are saved locally, with usage in `docs/SUPABASE_ACCESS.md`. New tables must explicitly enable RLS; rerun migration 012 after future feature migrations 010/011. The managed supabase_admin defaults were not changed. The database catalog now reports zero RLS-disabled public application tables; the dashboard advisor itself was not opened/refreshed in this run.

Evidence: `.tmp/rls-audit/before.json`, `security-before-apply.json`, `rehearsal.json`, `applied.json`, `role-verification.json`, `.tmp/production-audit/workflow-before-rls-2026-11-09.json`, the latest `workflow-report.json` and `report.json`. Supabase documents [RLS and views](https://supabase.com/docs/guides/database/postgres/row-level-security) and [grants/default privileges](https://supabase.com/docs/guides/api/securing-your-api).

## V2 — Production login and registration verification — November 9, 2026

Fresh registration at approximately 6:17 p.m. EST returned HTTP 201 with a valid session and no password/hash fields in the returned user. The new account could read its own profile and dashboard statistics (HTTP 200). Signing in through the production website with the same credentials opened the authenticated dashboard, showing the account's empty portfolio and activity state. Registration was exercised through the live API; the signup form's terms-acceptance/submission flow was not exercised in the browser.

One additional synthetic QA account was created and retained for repeat testing, increasing the total user count from the previous 35 to an expected 36. Its generated credentials are in gitignored `.tmp/production-auth/credentials.json`; no password, session token or credential value is included in the report. Existing user accounts, payment settings and `.env` files were not changed. Registration does not invoke an email provider in the inspected deployed handler; email verification/reset delivery was not tested. This was verification only, with no source-code changes or deployment. Evidence: `.tmp/production-auth/report.json` and the observed production browser dashboard.

## H1 — Three production defects fixed and deployed — November 9, 2026

**All 53 live workflow checks now pass.** Commit `bc048a125880eabe4fdfd8e42e4f27c240714d9a` was released from the isolated `codex/production-hotfix-nov9` branch to production `main`. Render marks deployment `dep-dbp52nm417fc7398p9mg` live; Vercel deployment `dpl_7iSpaBEkPfethnMp6aHFoE3nj9x8` is READY with the same commit and production domains. Verification finished around 6:06 p.m. EST.

The focused release changes only three route files, the server test command and a regression test file. The seller payment-status route now precedes the project-ID route and returns HTTP 200 for a signed-in QA account. Follow retries use the result of the atomic insert to create a notification only for a newly inserted relationship. Public Q&A joins the current project and requires public visibility, so making a project private or deleting it removes its questions from anonymous reads immediately.

Six release regressions use an in-memory SQL database, real HTTP requests and synthetic authentication, with upload/notification side effects stubbed. Against the previous deployed source, five failed and the ordinary-project-read control passed. All six pass with the patch, including concurrent follow retries, unfollow/refollow, privacy changes, deleted projects and individually private questions. These tests are committed at `server/tests/production-hotfix.test.js`; `npm test` from `server` runs them. The broader local feature branch and its existing 169-test baseline were not included in this focused release.

Live validation improved from 50/53 to **53/53**, including all three previously failing checks. Cleanup returned HTTP 200 for the temporary file, save, follow and project. The final strict-TLS read-only audit passed all seven API checks and six integrity checks, with 35 users, 3 projects, 2 sale listings and zero remaining files/saves/follows/questions/purchases/transactions. Three new QA notifications remain, bringing their total from 12 to 15. The reusable dummy accounts and their test profile/read-state changes remain; no non-QA accounts were edited.

The public website returns HTTP 200. Its inspected entrypoint still contains the matching live publishable key and no server API-key patterns. Payment health is healthy with PostgreSQL and Stripe connected. **No Stripe keys/settings, `.env` files or database schema were changed.** No financial operation or webhook delivery was submitted. Migrations 010/011, U1–U13's broader feature release, Connect-event coverage, explicit mode for the future U12 guard and complete sandbox/live payment validation remain separate pending work. This entry supersedes earlier statements that the three live defects await deployment.

Evidence: `.tmp/production-audit/workflow-before-hotfix-2026-11-09.json` (50/53), `.tmp/production-audit/workflow-report.json` (53/53), `.tmp/production-audit/report.json` (post-cleanup), `.tmp/stripe-audit/public-production-report.json` and `.tmp/production-audit/hotfix-release.json`. Source/rollback reference: prior commit `79381c8a506d130b65d2930f8e4414c74866f676`. Existing unrelated local changes were preserved in the original workspace; the release checkout is `.tmp/hf`.

## Restored production verification — November 9, 2026

**Database readiness has recovered.** Checks from 5:37–5:40 p.m. EST returned readiness HTTP 200 with PostgreSQL connected, marketplace HTTP 200, and healthy payment status with both database and Stripe connected. All seven public health/read/access-boundary audit checks passed. This supersedes the restoration/outage status below; it does not establish a completed payment.

The strict-TLS, read-only database audit found **35 users, 3 projects and 2 active listings**. All 12 audited table counts matched the September 9 inventory before the synthetic workflow run, including 8 notifications and no purchase requests or transactions. Six integrity checks found no orphan project/question/purchase relationships or missing password hashes. Matching counts support continuity with that inventory; no row-level backup comparison or restart/restore file-durability test was performed.

The live workflow rerun used the two existing QA accounts and passed **50 of 53 checks**. Profile persistence, project creation/editing, owner boundaries, upload/download/access checks, saves, question/answer persistence, follow persistence and basic socket authentication passed. Three known deployed failures were reproduced: `/projects/check-stripe-account` is interpreted as a project ID and returns 400; retrying a follow creates duplicate notifications; Q&A remains publicly readable after its project becomes private. Existing local fixes cover these failures. A fresh local workflow/security regression run passed **43 of 43 tests** with isolated storage and provider stubs. The basic production socket check does not prove the complete U13 handshake or event delivery.

Cleanup returned HTTP 200 for the temporary file, save, follow and project. A second read-only audit confirmed 35 users/3 projects, zero files/saves/follows/questions/purchases/transactions, and all six integrity checks clear. Four new notifications remain on QA accounts, bringing the total from 8 to 12; the dummy seller profile/read state was also exercised. No non-QA account was edited. No real payment, transfer, refund, provider-account creation or webhook delivery was submitted. No hosted settings, migrations or `.env` files changed, and no application deployment was performed.

Release preflight confirms migration **010** (`projects.stage_details`) and migration **011** (purchase agreements/request agreement link) are absent. Next: prepare the backup/release, resolve live Connect-event coverage and explicit live-mode prerequisites, apply the additive migrations and deploy the tested backend/frontend together. A separate sandbox payment lifecycle and completed live purchase remain unverified. Prior full local validation remains 169 tests; this follow-up reran the 43 workflow/security tests only.

Evidence: `.tmp/stripe-audit/restoration-complete-check.json`, `.tmp/production-audit/restoration-inventory-before-smoke.json`, `.tmp/production-audit/restoration-release-preflight.json`, `.tmp/production-audit/workflow-report.json` and post-cleanup `.tmp/production-audit/report.json`. Regression command: `node --test tests/security.test.js tests/workflows.test.js` from `server` (exit 0).

## Database restoration follow-up — November 9, 2026

The user confirmed the **original Supabase project is still restoring**, correcting the earlier indication that it was already live. Production verification is waiting for restoration to complete; the connection failures during this interval do not establish a configuration mismatch or data loss.

Read-only checks at 22:34 UTC returned liveness HTTP 200, readiness HTTP 503 with the database disconnected, payment health HTTP 200 with degraded status and Stripe connected, and marketplace HTTP 500. The existing local saved database connection also returned a tenant/user lookup failure. No connection settings were changed, no restart or deployment was triggered, and no test accounts or payment objects were created in this follow-up. The Render environment page was inspected without revealing or editing database credentials. All `.env` files remain unchanged.

After Supabase reports restoration complete, repeat readiness and marketplace checks. If connectivity recovers, continue the read-only record/integrity audit and compare available backup evidence. If it still fails, compare the hosted connection with the restored project's current connection settings before changing anything. Stripe configuration review remains valid as recorded below; a completed purchase remains unverified. Evidence: `.tmp/stripe-audit/database-recovery-check.json` and `.tmp/stripe-audit/database-ping-report.json`. Documentation/status update only; no application changes or deployment in this follow-up.

## Hosted live-payment review — November 9, 2026

**Production is not payment-ready: database readiness returns HTTP 503 and the public marketplace returns HTTP 500.** Process liveness still returns HTTP 200, and Stripe connectivity succeeds; those signals do not establish that the application can complete a purchase.

Read-only checks against the hosted configuration and Stripe verified:

- Render's configured secret and publishable keys are both live and match the production Vercel settings by SHA-256 comparison. The published browser entrypoint uses the same publishable key. No key values were printed or written to the audit artifacts.
- Stripe authenticated that live secret successfully. Its account reports charges and payouts enabled and details submitted. These are platform-account flags, not verification of every seller's connected account.
- The live account has one enabled webhook endpoint at `https://sidebuilds.onrender.com/api/payments/webhook`. The Stripe Dashboard confirms it is active, listens to 25 events from “Your account” and uses API version `2025-03-31.basil`. It includes checkout, payment-intent and dispute subscriptions but omits `account.updated`, which the application handles. Review connected-account destination coverage and automatic seller-onboarding updates.
- Stripe returned zero live PaymentIntents and zero live Checkout sessions, with no further pages. There is no existing completed live purchase in those resources to validate end to end. No charges or payment objects were created.
- Render has `NODE_ENV=production`, `CLIENT_URL=https://sidebuilds.online/`, Express Connect and a 5% commission in both commission settings. `STRIPE_MODE` is absent from the visible service variables, and no environment groups are linked. Set explicit live mode before deploying U12's stricter configuration guard.
- **The registered live endpoint signing secret exactly matches Render’s configured signing secret.** The comparison used SHA-256 fingerprints in memory after the user signed in to Stripe. The revealed value was hidden again; neither signing secret nor its fingerprint was saved in the report. This verifies configuration equality, not actual event delivery or a completed payment.

The deployed payment-health response reports `database=disconnected`, `stripe=connected` and `status=degraded`. A separate readiness request confirms the database failure, and a public marketplace read fails. A strict-TLS, SELECT-only connection attempt using the existing `server/.env` also failed with `XX000`, classified as a database tenant/user lookup failure. That saved URL has not yet been compared with Render's database URL, so this is supporting evidence, not proof of the hosted root cause or data loss. Verify the restored Supabase project's status and connection settings against Render before payment validation.

Chrome now permits the Render review. The user signed in themselves. Keys were revealed only for in-memory comparisons and hidden again; hosted values, Stripe subscriptions, database records and `.env` files were not changed. The user also completed Stripe sign-in, and the signing-secret comparison is complete. No secret was rolled or rotated. Application safeguards and pending migrations were not deployed by this review.

Evidence: `.tmp/stripe-audit/live-hosted-report.json`, `.tmp/stripe-audit/hosted-settings-review.json`, `.tmp/stripe-audit/public-production-report.json`, `.tmp/stripe-audit/live-backend-checks.json` and `.tmp/stripe-audit/database-ping-report.json`. Current findings supersede the earlier uncertainty about live Render key mode and endpoint signing-secret equality; the September database inventory remains historical and does not prove current reachability or completeness.

## Stripe setup and safety update — November 9, 2026

### U12 — Keep Stripe test and live environments separate

The intended production mode is **live payments**, explicitly confirmed by the user. At the initial U12 check, the local server's configured API keys were test mode; Stripe accepted the test key on read-only balance/account requests and returned test mode. No balances or key values were printed. Production's inspected browser entrypoint contains a live publishable key, and the production payment health endpoint reports connected. That deployed endpoint does not expose backend mode. The initial U12 check could not verify Render's key pairing or endpoint signing secret; the completed hosted review above subsequently verified both. The initial frontend hosting listing returned only variable names, and Render required the separate Chrome review.

The test account has an enabled webhook at `https://api.sidebuilds.space/api/payments/webhook`, differing from the current documented production API. It lacks subscriptions for `account.updated` and `charge.dispute.created`, which the app handles. Real test payments were deliberately not created because they could send events to this existing endpoint. Use a separate Stripe sandbox and app/database for the next financial workflow test. Do not assume a test key makes an attached application database disposable.

All server Stripe callers now share one guarded SDK client. It rejects missing/malformed credentials, mixed key modes, live keys outside a production runtime, test keys targeting the production website and missing signing secrets. Production runtimes require an explicit `STRIPE_MODE`; the Render blueprint selects live mode and names its secret settings. Invalid/disabled setup blocks checkout, release and Connect mutations before their database changes. Dispute reporting keeps its normal authentication path during a provider outage. Local QA explicitly disables all provider access, including startup and health probes, and overrides inherited keys with placeholders.

Webhooks require raw-body signature verification and matching live/test mode. Mode is checked again before queued/internal processing. Browser builds now use a common preflight that rejects secret/restricted/webhook credentials in browser-prefixed settings (including JSON/whitespace), mismatched modes and test settings targeting the known production API. Existing non-browser-prefixed Stripe values in `client/.env` exactly duplicate the server settings. The user explicitly chose to leave all `.env` files unchanged; those values remain in place. They were not found in the inspected public entrypoint. No `.env` files or hosted configuration were changed.

Validation: **169 automated tests pass: 61 server and 108 client**. Fourteen new server tests cover configuration policy, SDK blocking, browser build checks and real installed-SDK signature verification with synthetic credentials: missing/wrong signatures, wrong secrets, changed bodies, expired timestamps, parsed JSON and wrong/missing/nested event modes. Disabled checkout/release/Connect/webhook routes make no payment-data changes in these tests. The optimized guarded build passes, and a deliberately unsafe build is rejected before compilation without exposing its synthetic secret.

All 11 full-server local smoke checks pass. Four additional checks against the running QA app confirm an approved checkout remains unlocked/unmodified after rejection, receipt release stays held/uncompleted, disabled webhooks cannot process and health makes no provider request. These tests use isolated storage or stubs. They do not validate real webhook delivery, Connect onboarding, refunds or payouts.

Evidence: `.tmp/stripe-audit/setup-report.json`, `.tmp/stripe-audit/runtime-report.json`, `.tmp/stripe-safety-server.log`, `.tmp/stripe-safety-client.log`, `.tmp/stripe-safety-build.log`, `.tmp/stripe-safety-negative-build.log` and `.tmp/stripe-safety-smoke.log`. Read-only setup checks are repeatable with `scripts/check-stripe-setup.cjs`; production setup/release instructions are in [the Stripe runbook](docs/STRIPE_SETUP.md). Stripe documents separate API environments and endpoint-specific signing secrets in [API keys](https://docs.stripe.com/keys) and [webhook verification](https://docs.stripe.com/webhooks).

**Not deployed.** The hosted review above verified live keys and the endpoint signing secret. Restore database readiness, review connected-account webhook coverage and set explicit live mode before releasing these guards. Migrations 010/011 and coordinated backend/frontend deployment remain pending. No live Stripe payment, transfer, refund, account creation or webhook delivery was performed, and no Stripe endpoint settings were changed.

### U13 — Finish authenticated notification connection setup

The full-server log exposed an existing connection exception: the main Socket.IO authentication path set a user but omitted the normalized ID and verified-token expiry expected by the extended connection handler. Notifications could still arrive through a room joined earlier, allowing the old smoke check to pass despite the incomplete setup.

The authenticated socket now receives the canonical user ID and token metadata from the verified JWT. The smoke check requires `connection_confirmed` for both seller and buyer, checks the seller's expiry metadata and still verifies anonymous rejection and real notification delivery. The strengthened check reproduced `connection_confirmed timed out` before the repair, then all 11 checks passed with no uncaught server exception. The four disabled-payment runtime checks also pass afterward. Evidence: `.tmp/stripe-safety-socket-before.log`, `.tmp/stripe-safety-smoke.log`, `.tmp/stripe-safety-qa.log` and `.tmp/stripe-audit/runtime-report.json`. Local only; deployment pending. No authentication policy, `.env` files or production records changed.

## Purchase agreement update — November 9, 2026

### U11 — Approve the same itemized scope before payment

Starting a purchase now opens a shared agreement instead of asking for a payment method before terms are ready. Sellers publish a USD price, individual deliverables, exclusions, ongoing costs and who pays them, handover steps/timing and support. Publishing explicitly approves that version as the seller. Buyers review and acknowledge the same version separately. An inline private conversation supports change requests without silently changing agreed terms. Purchases, seller interests, dashboard activity and new notifications link to the agreement.

Terms are append-only through the API. Seller revisions require the current version number, retain earlier versions and need a fresh buyer approval. Stale approvals and stale editor submissions return HTTP 409. Participants can read their history; outsiders cannot read, publish or approve it. Failed saves/messages retain entered writing, pending actions reject repeated clicks, load errors support Retry, and late responses from another purchase are ignored. Status changes from another session appear after using Refresh or reloading; checkout always revalidates the current server version.

Checkout requires the latest agreement ID, both approvals, the stored agreed price and unchanged seller ownership. Old message-only acceptance endpoints cannot satisfy this gate. Provider sessions carry the agreement ID, use server-controlled cents and retain provider idempotency/session reuse. The request records the approved agreement when checkout starts, after which scope revisions are blocked. Receipt review shows this frozen scope independently of later listing edits; existing paid receipts without an itemized agreement retain their explicitly labeled legacy message context.

Validation: **155 automated tests pass: 47 server and 108 client**. Added seven HTTP workflows for participant boundaries, scope validation, optimistic revisions, historical approval retention, explicit/repeated buyer approval, stale checkout blocking, exact prices, checkout locking, ownership/availability and frozen receipt scope. Added UI coverage for editing, failed-write recovery, duplicate clicks, approval gating, stale/missing links, history, purchase navigation and the private conversation. The optimized client build and all 11 full-server/API/WebSocket smoke checks pass.

Browser validation used two separate local dummy-account sessions: seller published version 1, buyer sent a support change request and approved version 1, seller received the message and published version 2, and buyer saw the earlier approval retained but version 2 requiring a fresh acknowledgement. Version 2 approval survived refresh and exposed Continue to payment. The buyer page fits a 390-pixel viewport with a 390-pixel content width; desktop and mobile screenshots were inspected. Conversation deep links scroll below the navigation bar after loading, and sellers return to their seller dashboard. No checkout or financial operation was submitted in the browser. Stripe behavior remains simulated in the disposable server tests.

Evidence: `.tmp/pm-u11-server.log`, `.tmp/pm-u11-client.log`, `.tmp/pm-u11-agreement-final.log`, `.tmp/pm-u11-receipt-final.log`, `.tmp/pm-u11-build.log`, `.tmp/pm-u11-smoke.log`, `.tmp/local-qa/agreement-browser-report.json`, `output/playwright/agreement-mobile-review.png` and `output/playwright/agreement-desktop.png`. `scripts/seed-local-agreement.cjs` creates one isolated unpaid fixture and refuses a connected QA seller. The fixture and its two approved scope versions remain available locally for inspection.

**Deployment pending.** Apply additive migration `011_purchase_agreements.sql` alongside pending migration 010 before deploying the coordinated API/client. Inspect existing unpaid requests with provider sessions first: they are intentionally locked and are not backfilled with invented approvals. Reconcile or expire those sessions in an isolated, reviewed release procedure before allowing a new scope. Already issued provider payment links cannot be revoked by an application-only agreement check. The migration has not been applied to production, and PostgreSQL locking/concurrency and a real Stripe test-mode lifecycle still require verification. No production data or `.env` files were changed.

## Transfer update — November 9, 2026

### U10 — Review the actual purchase before confirming receipt

Purchases now opens a dedicated receipt review instead of immediately releasing funds from a browser confirmation dialog. The review loads a buyer-authorized transaction, exact amount, seller and agreement message linked through that transaction's Checkout session. It does not infer an itemized contract from the current listing. Missing or ambiguous saved terms are explicit. The blanket requirement to receive a domain, social accounts and customer data is replaced by confirmation of the agreed deliverables, access/setup and responsibilities. Incomplete links, loading failures, pending payments, disputes and completed purchases have recovery states.

Receipt confirmation now requires explicit acknowledgement and checks paid status, a recorded payment reference, held/unreleased funds, valid amounts and unchanged seller ownership. Repeated completed confirmations return success without another provider transfer. Release updates both escrow representations, transfers ownership and updates only the purchase request linked to that payment. Older request-only endpoints return a receipt-review link instead of changing ownership without a verified transaction. Buyer purchase history matches exact checkout sessions and reports the transaction's actual held/released/disputed state.

Release review must check stored checkout-session links for existing transactions. The new flow intentionally avoids attaching a transaction to an unrelated negotiation by project/buyer alone; unmatched or ambiguous legacy records need review rather than a guessed association.

Purchase cards and summaries now preserve cents, use actual paid transaction amounts, deduplicate repeated negotiation references and recognize completed transfers from the transaction state. Completed purchases open a read-only transfer view instead of offering a nonfunctional receipt-download button. Receipt review resets its scroll position when entering another transaction so the purchase context is visible.

Validation: **131 automated tests pass: 40 server and 91 client**, including six new fake-provider HTTP workflows, nine receipt-review UI tests and three purchase-history tests. They cover role boundaries, payment/ownership guards, required acknowledgement, exact amounts, repeated confirmation, distinct purchase attempts, legacy-route blocking, loading/retry, stale responses, incomplete/mismatched links, purchase totals and review navigation. The optimized build and all 11 full-server/API/WebSocket smoke checks pass.

Browser checks use three synthetic local receipt states. Purchases opens the source-only receipt review with its saved exclusions and $10.25 amount. The final button requires all three receipt checks plus explicit acknowledgement. Pending and disputed transactions expose no release controls. Purchase history shows cents and excludes the pending payment from paid totals. Receipt and purchase pages fit a 390-pixel viewport. No final release was submitted in the browser; successful release and repeat-confirmation behavior were tested only with the fake provider. Real Stripe, webhook/refund/payout behavior and PostgreSQL concurrency still need end-to-end validation.

Evidence: `.tmp/local-qa/receipt-review-browser-report.json`, `.tmp/pm-u10-server.log`, `.tmp/pm-u10-all-client.log`, `.tmp/pm-u10-purchases-final.log`, `.tmp/pm-u10-build.log`, `.tmp/pm-u10-smoke.log` and `output/playwright/receipt-review-mobile.png`. `scripts/seed-local-receipts.cjs` creates only isolated SQLite fixtures and refuses a connected QA seller. The ready/pending/disputed fixtures remain in `.tmp/local-qa/receipt-fixtures.json`. No production records, `.env` files or live payment providers were changed. Migration 010 and deployment remain pending; U10 uses existing schema fields.

## Product update — November 7, 2026

### U9 — Explain the platform with supported capabilities

The homepage now describes private drafts, buyer briefs, search, saved projects, seller Q&A and buyer checklists. Removed unsupported blanket promises about escrow, bank-verified revenue, worldwide coverage, instant valuations and around-the-clock support from this page. The old jargon and simulated terminal were replaced by a practical handover guide. Live statistics still use their existing APIs. Feature cards span multiple columns only at wider breakpoints, avoiding an implicit extra mobile column.

Validation: the optimized build and all 79 client tests pass. A 390-pixel browser walkthrough confirmed the updated features/handover copy, removal of the old promises and a 390-pixel content width without horizontal overflow. The mobile feature-card screenshot was visually inspected. No payment or provider behavior was changed by U9. Other informational pages still need a separate claims/content review. Local only; deployment pending.

### U8 — Turn missing listing facts into useful seller questions

Missing buyer-brief answers now offer specific questions about included assets, running costs and handover. Selecting one focuses public Q&A and preserves existing writing. A guest's question and original marketplace destination survive sign-in; the question is restored for review instead of posted automatically. Q&A labels its public visibility, distinguishes loading errors from an empty discussion and supports Retry. Private drafts explain that public Q&A becomes available after publishing. Posting controls prevent repeated clicks while requests are pending, retain failed drafts and ignore late responses from another project.

Validation: **113 automated tests pass: 34 server and 79 client**, including seven Q&A tests and a new buyer-brief action test. They cover outages/Retry, late responses, question handoff through sign-in, suggested-question focus without losing writing, pending-submit protection, failed-draft retention and private-project guidance. All 11 full-server smoke checks and the optimized client build pass.

Browser verification: a guest added writing to a suggested cost question, signed in and returned to the same project with the complete draft focused. It was not posted automatically. The QA buyer then posted one question; the QA seller posted an answer through the new controls. Both remain on the synthetic local listing `76e45cbf-b60d-45d8-8479-879ed747c926` for repeat checks. Q&A fitted a 390-pixel viewport without horizontal overflow. Evidence: `.tmp/local-qa/questions-homepage-browser-report.json`, `.tmp/pm-u8-u9-client.log`, `.tmp/pm-u8-u9-server.log`, `.tmp/pm-u8-u9-build.log`, and `output/playwright/homepage-features-mobile.png`. U8 is local; migration 010 and production deployment remain outstanding. No `.env` files or production records were changed.

U4–U6 have now been checked in a fresh local browser session. A guest selected a listing from a filtered search, signed in, returned to the same project with its offer form open, then returned to the original search and refreshed with its filters intact. Draft content survived refresh; a private save with sale setup unfinished opened the saved project's file uploader; all buyer-brief answers appeared on the saved project. At a 390 × 844 browser viewport, the seller form's content width was 390 pixels with no horizontal overflow. The synthetic private fixture `4857202b-97d7-46d7-b910-bf156e13a231` remains in the isolated local database. No offer was sent.

### U7 — Buyer reports when requested

The walkthrough exposed a confusing error on private projects: opening their detail page automatically requested a public-only due-diligence report. Reports now load when a user opens AI Insights on a public listing. Private drafts explain availability without calling that endpoint. A loaded report is reused across tab switches; failed requests offer Retry and keep project details available. Public project details now explicitly include `is_public`, so report eligibility and the editor's visibility checkbox use the actual stored value. This avoids unnecessary background report requests and preserves public/private editing intent.

Validation: **105 automated tests pass: 34 server and 71 client**, plus **11 full-server/API/WebSocket smoke checks**. The optimized client build compiled successfully. Five detail-journey tests cover report loading on demand, reuse, private-project guidance and failure/retry recovery; the server suite checks the public visibility field. Browser network inspection confirmed no report call on public overview, one successful report request after opening AI Insights, and no report request from the private draft's overview or AI tab. The public report used the local provider-disabled fallback; external AI quality remains unverified.

Evidence: `.tmp/local-qa/product-journey-browser-report.json`, `.tmp/pm-resume-server.log`, `.tmp/pm-november-client.log`, `.tmp/pm-november-build.log` and `.tmp/local-qa/smoke-report.json`. Mobile layout screenshot: `output/playwright/seller-guide-mobile.png`. U4–U7 and the earlier application changes remain local. Migration 010 and production deployment are pending; production availability and historical completeness have not been re-audited on November 7. No `.env` files were changed.

The product roadmap now includes observation and measurement plans for first-project creation, listing completion, buyer enquiries and handover success. Conversion gains have not been measured.

## Improvement log — September 10, 2026

The production results below remain the September 9 snapshot. New application changes are local until explicitly marked deployed. The living [improvement roadmap](IMPROVEMENT_ROADMAP.md) tracks completion and remaining work.

### U4 — Start privately and keep your work (September 10)

Project creation opens without waiting for the payment-status request. New projects default to private. Account-scoped browser drafts restore after leaving or refreshing; failed server saves keep them, and successful creation removes them. The page explains browser-only storage and offers a private save without payment onboarding. File attachment now starts after a private project exists, with a direct route into its uploader. Added an editable technology field and demo URLs at every stage, decimal input support and actionable assistant/payment failures. Early-stage projects can retain repository evidence instead of being rejected for their stage.

Validation: initial coverage included 33 server tests and six targeted seller-editor tests. The November 7 browser run also passed draft refresh/recovery, private creation with sale setup unfinished and the handoff to the saved project's uploader. Application changes remain local; migration 010 and deployment are still pending.

### U5 — A buyer brief and actionable listing guidance (September 10)

Sellers now get an optional checklist driven by their actual inputs; each item focuses the corresponding field. A buyer brief records included assets, operating costs and setup/handover expectations at every project stage. The overview displays this brief as seller-provided information and makes missing answers explicit. No verification badge or valuation is inferred from completing fields. Existing stage-details storage carries the brief, so migration 010 is still the only required schema addition for these updates.

Validation: 34 server tests and eight targeted editor/guidance tests pass. The November 7 browser run confirmed the saved brief's assets, costs and handover answers. The brief follows project privacy, preserves typed spaces in the editor and renders text safely. Not deployed.

### U6 — Keep buyer journeys intact (September 10)

Marketplace search, filters, sort and pagination now live in the URL, so links can be bookmarked/shared and browser navigation restores the selected results. Project cards carry a return-to-results destination; direct project links have a useful fallback instead of navigating outside the app. Login and registration retain a validated same-app destination, and registration updates the shared auth state without a forced reload. The offer journey requests sign-in before the buyer composes an offer. Removed a nonfunctional login checkbox and invented signup sales/scale claims; community size uses the live count or an explicit unavailable state.

The live local walkthrough additionally found a guest browsing gate: the homepage's Enter Marketplace button sent guests to signup. It now opens the public marketplace. Project detail prices also preserve cents to match marketplace cards, and stored false flags no longer render stray zeros in the editor and hero badges.

Validation: journey regressions cover page/filter restoration, browser Back, login/signup continuation with the original search, registration auth state, unsafe/looping redirect rejection, guest offers, decimal detail prices and the homepage browsing entry. The November 7 browser run confirmed guest offer → login → same project/open offer form → original filtered results → refresh. No production changes.

### U1 — Immediate project privacy

Reproduced a disclosure: after reading a public sale listing, making it private still returned its details. The public-detail condition allowed the sale flag to override privacy, and response caches retained listing contents. Public details, marketplace, public-project lists and trending now read current visibility; public responses tell downstream caches not to store them. Aggregate statistics retain their bounded server cache.

Validation: the new HTTP regression failed before the fix, then passed for public → private → public → deleted transitions, including warmed listing endpoints and buyer denial. **28 server tests pass.** No production deployment or data changes were made for U1.

### U2 — Listing details survive editing

Category, subcategory, tags, technologies and stage-specific details now survive create/read/edit cycles. Tags accept comma-separated input, trim whitespace and remove duplicates. Partial edits preserve omitted fields, while explicit empty values clear them. Invalid types, excessive lengths and unknown stages return validation errors before stored data changes. The editor reloads category/tags and structured stage details, and a failed load shows Retry instead of an empty editable form. Inputs now have associated labels.

Validation: **30 server tests pass**, including metadata round trips, partial updates, clearing and rejected invalid input. **Two new client tests pass**, covering editor persistence and load-failure recovery. Browser editing also preserved category, deduplicated tags and stage details after saving, refreshing the nested detail URL and reopening the editor. Production deployment requires the additive `010_project_stage_details.sql` migration first; it is prepared but not applied. No existing `.env` files or production records were changed for U2.

### U3 — Search the whole marketplace

Search, category, stage, technology and decimal price filters now run in SQL before pagination. Results and totals use the same conditions. Sorting has a stable project-ID tie breaker; unavailable scores sort last. Search treats `%` and `_` literally and binds all user input. Invalid ranges return actionable validation feedback.

The marketplace sends its filters to the API, resets to page one when criteria change, keeps controls available while loading, and ignores late responses from older searches. It no longer reuses stale page caches or filters just the fetched page. Added the category filter, accessible input/pagination labels and readable active-page contrast; removed the blanket claim that all projects are verified.

Browser testing exposed two additional response/display gaps: missing sale flags hid prices, and serialized technologies appeared as raw JSON. Marketplace responses now include sale visibility and normalized listing fields; cards preserve cents in prices and monthly revenue.

Validation: **80 automated tests pass: 32 server and 48 client**. Fixtures place matching listings beyond the initial 20 rows and verify combined filters, page totals, decimal boundaries, literal wildcard handling, privacy and sorting. Client tests cover page reset, all filters, clearing, out-of-order responses, shrinking result sets and price precision. The optimized build passes. Browser checks confirmed search from page two finds both older Atlas listings, and combined search/stage/category/technology filters with a $10.25 minimum and maximum return the single correct listing, with $10.25 and separate React/Node.js labels. The full local API/WebSocket smoke also passes all 11 checks. U3 is local; production has not been redeployed.

Added `scripts/seed-local-marketplace.cjs` to create 24 reusable synthetic listings in the isolated SQLite QA database only. It validates the QA seller and reuses its own fixture manifest; it does not connect to production. Local QA startup now reuses existing accounts rather than attempting registration on every restart.

Checked September 9, 2026. Supabase became reachable at 21:18 UTC after the user restored it. Final read-only production inventory: **21:30 UTC**.

## Production verdict

**The restored production database is reachable and the main application APIs work. Existing records are readable, but completeness against a historical backup has not been established. Some production features still need the prepared application fixes deployed.**

The final inventory found **35 users: 33 created before this audit's registrations, plus two generated QA accounts; three projects; two active public sale listings; zero purchase requests and transactions**. The audit found zero orphaned projects, orphaned questions, purchase requests with missing projects/buyers/sellers, or missing password hashes. These checks establish current consistency, not that historical data was never lost. No earlier backup or expected record baseline was available for comparison.

The missing `project_files` table caused the live upload failure. The existing additive migration `003_create_project_files_table.sql` was applied in a transaction at 21:26 UTC, with user/project counts unchanged. Upload, byte-for-byte download, buyer access denial and file deletion then passed in production. This creates the required table; it does not recover historical uploaded files. Storage durability across a Render restart has not been verified.

Production's `project_questions` table also lacked its project relationship. A question from our deleted fixture remained orphaned. Only that known synthetic question was removed, and `009_question_project_integrity.sql` added the validated cascading relationship at 21:27 UTC. The next live run confirmed its question disappeared when its fixture project was deleted.

Initial direct PostgreSQL checks failed certificate validation. Using Supabase's published CA resolved this with certificate and hostname verification retained; no system trust settings or `.env` files were changed. [Supabase SSL guidance](https://supabase.com/docs/guides/platform/ssl-enforcement).

| Production check | Latest result |
|---|---|
| Website, API liveness and database readiness | Online; readiness HTTP 200 |
| Marketplace, public projects, statistics and trending | HTTP 200; two sale listings, three public projects |
| Signup, login, profile and dashboard | Passed with generated QA accounts; browser login/dashboard also passed |
| Project create/edit/read/delete and owner boundaries | API checks passed; browser creation persisted |
| Files | Repaired in production; upload/download/access/delete passed |
| Saves, follow persistence, Q&A, notifications, WebSocket access | Basic flows passed; exceptions below |
| Unauthenticated profile/socket, non-owner project access, non-buyer review, sale without onboarding | Correctly rejected |
| Full paid purchase, transfer, refund, payout, real email and AI providers | Not verified end to end |

**Latest live workflow run: 50 of 53 API checks passed. Three failures remain:**

1. `GET /api/projects/check-stripe-account` returns HTTP 400. The corrected route order is already in the local workspace; the alternative `/api/users/stripe-status` passes.
2. Retrying a follow creates duplicate notifications. Local fix and regression coverage pass.
3. Public Q&A remains readable after its project becomes private. Reproduced with synthetic content; a new local regression test failed before the fix and passes after adding project visibility to the query.

**Separate browser failure:** creating a project navigates to a blank detail page because production requests a lazy-loaded script under `/projects/static/js/...`. The root asset-path fix has passed the local browser check and optimized build but is not deployed.

All temporary production projects, the successfully uploaded file, saves, follows and questions were removed. The **two reusable QA accounts and their eight test notifications remain**. Existing user records were not edited. Repeated successful test logins eventually exhausted the production authentication limit; no limits were disabled or bypassed. The browser's signed-in session remains usable.

Private, gitignored artifacts under `.tmp/production-audit/`:

- `credentials.json`: seller test email/password; `accountCreated: true`.
- `buyer-credentials.json`: buyer test email/password; `accountCreated: true`.
- `report.json`: final successful read-only health/inventory audit.
- `authenticated-report.json`: earlier successful authenticated reads and inventory before repairs.
- `workflow-report.json`: 53 checks after the database repairs; three known failures.
- `workflow-before-repair.json`, `browser-report.json`: original workflow findings and browser evidence.
- `file-table-repair.json`, `question-relation-repair.json`: committed migration records.

## Database inventory after fixture cleanup

| Table | Rows |
|---|---:|
| users | 35, including two QA accounts |
| projects | 3 |
| notifications | 8 |
| purchase_requests, purchase_request_messages, project_transactions | 0 each |
| project_files, project_saves, user_follows | 0 each |
| project_questions, project_reviews, ai_project_analysis | 0 each |

## Completed fixes in this workspace

The application code changes below are local and have **not been deployed**. The two additive database repairs described above **were applied to production**. Pre-existing workspace edits were retained. No `.env` files were edited.

1. Marketplace and public-project API errors now reach the UI instead of returning a misleading empty list. The active marketplace page distinguishes an outage from zero results and supports retry.
2. Home statistics show an unavailable state instead of invented zero counts. Home requests use the shared API URL resolver, including its existing legacy-domain fallback.
3. Marketplace statistics now map PostgreSQL-style API field names to the client fields correctly. Sales volume uses the agreed purchase price. About-page figures use actual completed sales and active listings instead of an unsupported response-time claim and misleading success percentage.
4. Root-based asset URLs fix lazy-loaded page failures after navigation to, or refresh of, nested project routes. This failure was reproduced after creating a project in the browser.
5. Public pagination rejects unsafe bounds by applying validated, capped defaults.
6. SQLite development setup now supports an isolated database path, optional demo seeding, and an initialization signal. Local startup no longer requires PostgreSQL credentials when explicitly using SQLite.
7. Local schema gaps affecting project lists and conversation messages are repaired through additive initialization changes. Uploads can use an isolated directory.
8. Notifications work with the local integer-key schema. Retrying an existing follow no longer creates duplicate follow notifications. Notification update checks handle PostgreSQL row counts.
9. Checkout validates the agreed price before changing request state. Stable Stripe idempotency keys protect the interval between committing the database transaction and saving the checkout session. An existing open session is still reused.
10. Readiness handles database failures with HTTP 503 and does not expose connection details. The Render configuration now selects `/api/ready` as its health-check path.
11. Added repeatable production auditing, guarded synthetic production workflow checks, local QA startup, and live local API/WebSocket smoke scripts.
12. Public Q&A now requires a public project, closing the reproduced privacy leak. Added an additive project-question relationship migration and a guarded missing-file-table repair runner.

## Validation and feature coverage

**As of November 9, 169 automated tests pass: 61 server tests and 108 client tests.** The initial baseline was 36 passing tests. The optimized client build and 11 full-server smoke checks also pass. Testing used the installed Node.js 25.4 runtime; the repository's existing CI configuration uses Node.js 20. The product updates record local browser results separately from the historical production audit.

The workflow suite makes HTTP requests to real route handlers against a fresh SQLite database, checks stored data and ownership boundaries, and cleans up only its temporary test directory. Stripe checkout uses a fake provider in the test process. Password reset email is captured locally. These are not production PostgreSQL or paid-provider end-to-end tests.

| Feature | Local result | Production coverage remaining |
|---|---|---|
| Signup/login | Registration/login, safe destination continuation, auth-state updates without reload and guest browsing entry pass | Production registration/login/browser dashboard passed previously; new continuation changes await deployment |
| Profile | Edits persist; cannot grant oneself admin; public profile excludes email/hash | Production profile edit/read passed |
| Project creation/edit/delete/privacy | Ownership/privacy, metadata and buyer brief persistence, recoverable browser drafts and private save-before-files pass | New privacy/persistence and guided creation changes await migration and deployment; production browser detail loading fails pending deployment |
| Dashboard | Stored project counts verified; browser count changed from 0 to 1 | Production dashboard API and browser passed |
| Marketplace/public listings/trending | Server filtering, accurate totals, privacy and outage/retry pass; shareable URL state, browser Back and decimal prices covered | Production reads passed after restoration; search/navigation changes await deployment |
| Saves | Save, duplicate save, user isolation, and unsave pass | Live save/retry/read/unsave and privacy change passed |
| Follow sellers | Follow, retry, self-follow rejection, unfollow pass | Live follow works; duplicate notification fix awaits deployment |
| Questions and answers | API ownership/privacy checks, UI failure/retry, sign-in draft restoration, suggested questions and pending-click protection pass. Local browser buyer-question/seller-answer round trip passed | Earlier live Q&A worked; privacy and new UI fixes await deployment; deletion relationship repaired |
| Purchase agreement | Private itemized scope, both approvals, append-only versions, stale-write/approval rejection, checkout locking and frozen receipt scope pass | Migration 011 and coordinated deployment pending; existing provider sessions need reconciliation |
| Messages | Persistence, buyer/seller visibility, inline change requests, failed-draft recovery and duplicate-click protection pass; outsider denied | Real production negotiation not created |
| Reviews | Non-buyer denial, verified-purchase review, duplicate denial pass | Production non-buyer denial passed; real purchased review untested |
| Notifications and real-time access | Local delivery and anonymous rejection pass | Live authenticated connection/anonymous rejection and stored notifications pass; live event delivery untested |
| Files | Actual synthetic text upload/download/delete and owner restrictions pass | Live file round trip and buyer denial passed after repair; historical storage unverified |
| Password reset | Captured reset token works once and changes the stored password | Real email delivery and production reset not verified |
| Stripe setup and webhooks | Key-mode policy, disabled SDK, browser-secret build rejection, raw signatures and wrong-mode event rejection pass; read-only test-key authentication succeeds | Verify actual live Render key/endpoint pairing; existing test webhook targets another hostname and omits account/dispute subscriptions |
| Checkout | Buyer authorization, latest approved agreement, server price, retry key, session reuse and invalid-price state checks pass using fake Stripe | Real Stripe onboarding, payment, webhook, refund and payout cycle not verified |
| Receipt review and confirmation | Buyer-only context, exact linked purchase message, explicit acknowledgement, paid/held/ownership guards, blocked legacy routes, repeat-confirmation safety and purchase summaries pass. Browser verified ready/pending/disputed screens without release | Real Stripe release, error recovery and PostgreSQL concurrency remain unverified; backend/frontend must be released together |
| AI | Private-project denial, on-demand report loading/reuse/retry, clear private-draft guidance and provider-disabled fallback pass | External AI scoring and provider quality not verified |
| Certificates, admin, disputes and full transfer/settlement | Not covered end to end | Still require dedicated scenarios |

The separate local smoke script passed 11 checks against the running full server, including delivery of a follow notification to the seller's connected browser account. Details are in `.tmp/local-qa/smoke-report.json`.

Browser verification: seller sign-in → create private “QA Browser Smoke Project” → refresh nested detail URL → edit description → dashboard showing one stored project. September 10 checks additionally saved and reloaded category, tags and stage details, searched from marketplace page two, and combined all filters around an exact decimal price. The private project and 24 synthetic marketplace listings remain in the local QA database. Evidence: `.tmp/local-qa/improvement-browser-report.json`.

November 7 verification additionally covers guest offer/login continuation, restored search after return/refresh, browser drafts, private save-to-files, the persisted buyer brief, the 390-pixel editor layout and AI report availability. The local synthetic project “QA Product Journey November” remains available under the QA buyer account. Evidence: `.tmp/local-qa/product-journey-browser-report.json`.

Repository-wide whitespace inspection also reports an existing trailing-space issue in `server/services/webhookService.js`, outside the changes made here.

## Use the local test accounts

- App: [local QA](http://localhost:3009).
- Seller: `qa.seller@example.com`.
- Buyer: `qa.buyer@example.com`.
- Random passwords: `.tmp/local-qa/credentials.json` (gitignored; local only).
- Local database and uploaded fixtures: `.tmp/local-qa/`.
- Payments and external AI are not configured for this QA environment. Local email is logged; no real payment was submitted.

```powershell
node scripts/start-qa.cjs --build
node scripts/seed-local-marketplace.cjs
node scripts/seed-local-receipts.cjs
node scripts/smoke-local-qa.cjs
npm run test:server
npm run test:client
```

The QA server is already running for this session. Stop it before starting another copy on ports 3009/5009. The script refuses occupied ports.

The September npm/npx wrapper failure was no longer present on November 7. Tests still ran directly with the installed Node runtime. Equivalent commands from each application directory are:

```powershell
# From server/
node --test tests/*.test.js
# From client/
node node_modules/react-scripts/bin/react-scripts.js test --watchAll=false --runInBand
```

## Repeat the audit and finish release validation

Restoration and the two targeted additive database migrations are complete. Do not rerun the guarded file-table repair on an existing table, and do not run the destructive unified schema reset.

1. For read-only checks, set `AUDIT_DATABASE_CA_FILE` to the downloaded Supabase CA file in the current process, then run `node scripts/production-audit.cjs`. An alternate verified connection can be supplied through `AUDIT_DATABASE_URL`; no `.env` edit is required.
2. Review the combined workspace changes, verify the production schema and apply additive migrations `010_project_stage_details.sql` and `011_purchase_agreements.sql`, then deploy backend and frontend together through the existing Vercel/Render process. Include agreement APIs, `agreement_id` in checkout, receipt-review/paid-amount fields, required `receiptAcknowledged: true` and public visibility. Legacy request-only receipt routes return HTTP 409 with a review URL. Inspect exact checkout-session links and reconcile existing unpaid provider sessions before release; do not invent approvals or assume previously issued links have been revoked. Verify live Render API keys, explicit `STRIPE_MODE=live`, the matching signing secret and live endpoint subscriptions before deploying the new Stripe guards. Browser builds now require the guarded build entrypoint. The suite has 169 passing automated tests and 11 passing full-server smoke checks; see U4–U12 for browser/build verification. Production still runs the earlier code. Migrations 010 and 011 have not been applied to production.
3. Run `node scripts/smoke-production.cjs --allow-synthetic-writes` once against that release. It uses only the generated QA accounts, creates and removes a synthetic non-sale project, and records exact failures. Avoid frequent reruns because login attempts count toward production rate limits.
4. Verify browser project creation → detail → edit → nested URL refresh. The current production browser fails at detail loading.
5. Use a Stripe test environment for the complete payment/webhook/transfer/refund/payout cycle and verify real email delivery separately. The live smoke script does not invoke paid providers or email.
6. Compare aggregate inventory with a known backup or expected baseline and perform a separate file-storage restore/durability check before certifying historical completeness.

## Product direction

The category remains active. Acquire already offers vetted listings, live metrics, matching and transaction tools; Microns positions around micro-startups and verified metrics. A generic project marketplace has little differentiation. [Acquire](https://acquire.com/), [Microns](https://www.microns.io/).

My recommendation is to focus SideBuilds on **small, transferable projects whose next owner can actually run them**. Validate this positioning with sellers and buyers before building a large new feature set.

| Priority | Improvement | Practical first version | Measure |
|---|---|---|---|
| Now | Reliability and honest claims | Keep readiness healthy, verify backups and file durability, remove unsupported verification/support promises | Error rate, recovery time, successful restore test |
| Next | Evidence for each listing | Working demo, repository ownership, last successful build, license, running costs and dependency inventory; label evidence and its date | Share of listings with complete evidence; buyer-to-conversation rate |
| Release U2, then validate categories | Clear project categories | Category/tags/stage-detail persistence is implemented locally; evaluate grouping ideas, runnable products and revenue businesses with users | Listing completion and useful buyer enquiries |
| Release U3 | Full marketplace search | Server-side search, filters, totals and stable pagination are implemented locally | Searches yielding relevant results across all listings |
| Next | Reliable transfer process | Shared code/domain/assets checklist, deployment instructions, acceptance milestones and optional seller support period | Time to transfer and support/dispute rate |
| After demand is proven | Better buyer matching | Saved searches for budget, stack, business type and effort required; opt-in alerts | Relevant-match response rate |
| After evidence is available | Useful AI assistance | Explain missing evidence, operating costs and deployment risks; show a valuation range and assumptions | Buyer usefulness feedback and correction rate |

Acquire's January 2026 report emphasizes profit, clear economics and lower perceived risk in its SaaS acquisition market. That supports emphasizing verified operating facts rather than adding another opaque AI score. It does not establish a valuation model for pre-revenue side projects. [Acquire January 2026 report](https://blog.acquire.com/acquire-com-biannual-acquisition-multiples-report-jan-2026/).

A focused first month: finish release validation and test the purchase journey; manually onboard a small set of credible sellers; interview prospective buyers; publish evidence-rich listings; then build matching based on observed demand. Track qualified buyer conversations and completed handovers instead of headline user counts.

Remaining engineering issues include real-provider payment/mail tests, claims on other informational pages, privacy-page links, physical mobile-device usability and PostgreSQL integration tests against a disposable database with the production schema. U10 replaces blanket asset confirmations with receipt review and U11 adds a shared versioned scope before payment. Remaining transfer work is real-provider lifecycle testing and evidence of delivery against that scope. U8 improves seller questions and U9 corrects homepage promises and mobile feature cards; release remains pending, including migrations 010 and 011. Product experiments and success measures are in the roadmap. Conversion gains have not been measured, and no usage telemetry was added in this pass.

### FR4 — Production host routing repair (2026-11-12)
- Released application commit 4593147: Vercel dpl_D88mKGZgrDiYN7qdwvjSpJ7xDheR READY and Render dep-dbr88kh42hec73baf1p0 Live. QA login HTTP 200; live checkout HTTP 503 LIVE_COMMERCE_PAUSED; no financial objects created.
- Live discovery found the legacy api.sidebuilds.online hostname returns ENOTFOUND. The Render public API returns HTTP 200, while initial listing HTML and sitemap returned 503 through the legacy hostname.
- Changed server-rendered public reads, Vercel API/socket proxies and public build defaults to the working Render host. Local settings files remain unchanged. Search-rendering tests: 6/6 pass. Follow-up production deployment and checks pending.

### FR5 — Browser asset packaging repair (2026-11-12)
- Production synthetic workflow: 53/53 checks passed, with all disposable project/file/save/follow fixtures removed. Existing public counts remained 3 projects, 2 sale listings, 33 accounts excluding tagged QA/internal roles, and zero completed sales.
- Host fix 7de9554 is READY on Vercel dpl_Bokx3nRqDhSCBL5ibCci7M8mesBu: marketplace, public listing and sitemap now return HTTP 200 with real content. Browser verification then found published main JS/CSS returning 404 despite successful compilation.
- Added explicit Vercel Build Output packaging for browser assets and the private HTML renderer, using the documented filesystem routing phase. Checks every manifest file before publishing; missing files abort packaging. No source settings or server credentials are included.
- Validation: 42 real browser build assets checked and packaged; packaged homepage handler HTTP 200 with its script reference; template remains private. Rendering/package tests 7/7 passed (one new regression case; server suite total now 82). Production deployment verification pending.
- Hosting specification references: https://vercel.com/docs/build-output-api and https://vercel.com/docs/build-output-api/primitives .

### FR5 follow-up — Align hosted build entrypoint (2026-11-12)
- Vercel build logs showed automatic API-function detection using the legacy root vercel-build command rather than the configured packaging command. Moved renderer source out of the auto-detected api directory; its generated private function path stays internal to the deployment.
- Unified both hosting build entrypoints to compile the browser and emit the same checked Build Output package. This removes the competing automatic function/static build paths.
- Full server suite: 82/82 passed with localhost test connections enabled. After the source move, all seven affected rendering/package checks passed and the real 42-asset package was regenerated successfully. Deployment verification remains pending.

- FR5 build follow-up: the unified build reached normal browser compilation, but the hosting CI default treated existing lint warnings as fatal. Restored the already validated build:vercel-deploy wrapper (explicit CI=false and Stripe build validation) before packaging. This preserves baseline lint policy; no source settings changed. Production release still pending verification.

### FR7 completion — Live verification and restored expiry correction

Redesign release 3c5beda is READY on Vercel dpl_ApCLto5yGogUfvccxgWmSHJgU2JA; the live backend exposes the new validity endpoint. Chrome observed the actual redesigned expired-link page, zero password fields, zero computed gradient backgrounds, and the live email-unavailable recovery state. Live screenshot: .tmp/recovery-ui/live-expired.jpg. The form screenshot uses the same built components with a synthetic valid link: .tmp/recovery-ui/desktop.jpg. No real password was entered.

The first renewed invitation failed live preflight despite matching its saved token. Read-only diagnostics established the real cause: restored password_reset_tokens.expires_at was TIMESTAMP WITHOUT TIME ZONE. A local Date write stored 02:38 while the intended UTC instant was 07:38, so the server correctly rejected it. This supersedes the earlier expiry-only diagnosis. Migration 015 interprets legacy server-written expiries as UTC and stores future values as TIMESTAMPTZ. Both operator scripts now write explicit ISO UTC strings. A rollback rehearsal and an additional real PostgreSQL scenario proved exact-instant preservation and idempotence; all 18 PostgreSQL scenarios pass and their schema was removed.

Migration 015 is applied: all 3 existing reset records preserved; reset-table RLS and revoked client access preserved. Old unusable invitations were then replaced using the guarded renewal. The fresh invitation passed actual production preflight (HTTP 200 valid=true), remains unused, and expires November 13 at 2:44 a.m. Eastern (07:44 UTC). Private delivery: .tmp/production-admin/ADMIN_SETUP_2026-11-13.md; the canonical ADMIN_SETUP.md also contains the replacement. No token, login email or password is included in this report or Git. The account password remains unchanged for the owner to choose.

Final verification: 128 interface tests, 86 server tests, 18 PostgreSQL scenarios, build and 12 targeted live recovery checks pass. Database counts remain 37 accounts (3 QA, 1 internal operator), 3 projects, zero transactions/inquiries/files; all 55 public tables protected. Live checkout remains paused, Stripe mode/settings unchanged and email remains pending by user choice. Owner password entry and activation are the remaining access step.
