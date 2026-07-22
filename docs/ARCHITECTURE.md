# Architecture and design decisions

The framework is small, but the layering is deliberate. This is the reasoning
behind it.

## Layers

```
Gherkin (.feature)        what the system should do, in business language
   │
Step definitions          translate each sentence into actions and assertions
   │
Page Objects / API client / DB reader   how to talk to each interface
   │
System under test         the Ledgerline app (UI → API → ledger)
```

Each layer only knows about the one below it. A step definition never contains a
CSS selector; a page object never contains a Gherkin phrase. That's what keeps
the suite maintainable as the app grows.

## Isolation and determinism

Flaky tests are usually leaky tests. Three rules keep scenarios independent:

1. **Fresh browser context per scenario.** `Before` opens a new Playwright
   context with its own cookies and storage; `After` closes it.
2. **Reseeded ledger per scenario.** `Before` calls `POST /api/test/reset`,
   which restores the database to a fixed baseline, so run order never matters.
3. **Deterministic seed.** The app seeds the same accounts and balances every
   time, so assertions use exact expected values (`4900.00`) rather than ranges.

Because scenarios share nothing, they are safe to run with `--parallel N`
without rework.

## The database layer opens read-only

`LedgerDb` opens the SQLite file with `{ readonly: true, fileMustExist: true }`.
A test should be able to observe the system of record but never mutate it,
otherwise a test could paper over a real bug by writing the state it expects.
Read-only rules that out.

The same layer owns the ledger's global invariant:

```
total money across all accounts is constant across any transfer
```

Every transfer scenario asserts it. It is the cheapest useful check on a
payments system, and it catches the class of "money created or destroyed" bugs
that per-account assertions miss.

## Environments

`src/config/env.ts` defines three profiles, selected by `TEST_ENV`:

| Env | Base URL | Ledger DB | Browser |
|---|---|---|---|
| `local` | localhost | local file | headed |
| `ci` | localhost | local file | headless |
| `uat` | deployed host | none | headless |

The same suite runs against a locally booted app in CI or a deployed instance in
a shared environment. When a profile has no local DB (`uat`), the DB-layer steps
report themselves as skipped rather than failing, so UI and API coverage still
runs against the remote target.

## The suite boots its own app

`BeforeAll` starts the app as a child process and waits for `/api/health`;
`AfterAll` kills it. That makes `npm test` self-contained locally and in CI. The
Cypress and Selenium runners get the same behaviour from `scripts/with-app.js`.

## Reporting

Cucumber writes HTML and JSON reports to `reports/`, uploaded as a CI artifact.
The `After` hook attaches a full-page screenshot on failure, so a red step comes
with the screen that produced it. CI gets one automatic retry
(`retry: CI ? 1 : 0`) to absorb infrastructure blips, while local runs never
retry and stay reproducible.

## Extending it

- New screen: add a Page Object under `src/pages` and reference it from steps.
- New rule: add a row to the `Scenario Outline` in `payment_validation.feature`
  (UI) or `payments_api.feature` (API). No new code if the phrasing exists.
- New environment: add a profile to `PROFILES` in `env.ts`.
- New tool: put it beside `cypress/` or `selenium/` and reuse the same
  `data-testid` selectors and the `/api/test/reset` isolation hook.
