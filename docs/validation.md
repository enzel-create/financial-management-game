# Release validation

Validated on 2026-11-03 with Node.js 24.22.1. Tests use invented companies and local room data only. The public source was copied into an independent directory with no inherited Git history, no credentials, no database, no course files and no removed edition implementation.

## Required checks

- `node --test tests/*.mjs`: **31 test files passed, 0 failed, 0 skipped**. Complete output: [unit and simulation evidence](test-results.txt).
- `node node_modules/typescript/bin/tsc --noEmit --incremental false`: passed.
- `node scripts/run-framework.mjs build`: passed in the independent public source directory without the original Site ID. The build reports a >500 kB client chunk warning, not an error. [Build output](build-results.txt).
- `node tests/integration/local-api.mjs`: passed against the actual loopback HTTP API and local D1 storage. [HTTP evidence](api-results.txt).

## New-mechanism coverage

`tests/institutions.mjs` verifies purchase/sale accounting, disposal gains, stale asset revisions, ownership, usage/lien restrictions, depreciation, maintenance, interest accrual, default and collateral sale, surety premiums, single claim payment, recourse, settlement and JSON save/reload. Reports must balance to exactly zero rounded cents.

`tests/institutions-rounds.mjs` runs fresh 2-, 6- and 12-company rooms with bank loans and equipment purchases while bots bid and build. It checks company accounting at every simulated second and nonnegative bank/surety cash. Actual public-work bonds and completed jobs are required. The tests found and fixed a preexisting joint-venture rounding mismatch: receivables now sum the same installment allocations used by cash receipts and revenue.

The HTTP suite races two buyers for one asset (exactly one succeeds), retries the same purchase ID (one financial effect), and races two different purchases against one company's limited cash (no double spending). It also checks unsupported-mode rejection, host borrowing denial, private loan data, reported balance and post-settlement action rejection.

## Browser acceptance

The real local application was opened and operated through its rendered interface. Verified: joining a company; completing all ten guide steps; borrowing 30; buying an excavator for cash; listing the asset; viewing the asset, debt and interest in statements with **Assets − liabilities − equity = 0.00**; automatic loan repayment at maturity; collapsible finance panels; and switching the institution panel among Chinese, English, Spanish, French and Hindi.

Screenshots: [bank and surety](screenshots/finance-market.jpg), [equipment market](screenshots/equipment-market.jpg). These depict a local test company, not a production room or a user account.

## Historical regressions

The untouched pre-change source was tested separately. Five test files reproduced failures; the earlier six-failure note was not assumed current. The release fixes untranslated messages, joint-venture receivable rounding and stale test assumptions about version flags, upgrade prices, bid-window timing and readiness. Removed-edition tests leave with their implementation. Historical full-game fixtures explicitly disable the new institutions to exercise saved-room compatibility; the new institution and HTTP suites exercise the public default rules without that override.

## Boundaries

No GitHub publication is implied by these local checks. The final GitHub commit must contain this tested source tree and be verified remotely. The browser checks cover desktop operation; no dedicated mobile viewport or assistive-technology audit is claimed. A clean-source build reused the installed, locked dependency tree; a separate from-scratch network dependency download was not performed.

## Final product presentation

The release removes the objective/module selector, course references, sector reference tables, revenue-method lesson, discussion questions and lesson-style debrief. Financial tools and operating history remain. The final targeted scope tests and TypeScript/build checks passed after this cleanup.

## Team roles and lobby update (2026-11-03)

33 test files passed, including 1–4 member role layouts, role reassignment, backend permission checks, independent approvals, stale revisions, expired requests, single-execution accounting and opening resources of 160 cash / 8 free points for every company size. Existing 2/6/12-company institution round simulations remain green. TypeScript checking passed.

Real loopback HTTP/D1 tests cover concurrent final-seat joins, simultaneous approvals, duplicate request IDs, role changes, public/private lobby discovery, safe room summaries and removal when starting. Browser QA confirmed lobby selection fills the join form, four distinct roles, disabled out-of-role bank/equipment buttons, and an operations purchase approved by the general manager with a single 64-unit debit and separate shared-log entries.

The free 8 points are separate from the company design's foundation abilities. The 50 entry-tier project base costs range from 39 to 117, with median 72; new equipment costs 40–64. Starting 160 cash provides working capital without making simultaneous expansion and equipment purchases free of funding tradeoffs. This is a game-balance choice, not a real-world funding estimate.
