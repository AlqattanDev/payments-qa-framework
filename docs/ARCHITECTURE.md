# Architecture & design rationale

This framework is small on purpose, but every layer is a deliberate choice. This
document explains the *why* — the part an interviewer probes after the demo.

## Layered by responsibility

```
Gherkin (.feature)        WHAT the system should do — business language
   │
Step definitions          translate each sentence into actions/assertions
   │
Page Objects / API client / DB reader   HOW to talk to each interface
   │
System Under Test         the Ledgerline app (UI → API → ledger)
```

Each layer only knows about the one below it. A step definition never contains a
CSS selector; a page object never contains a Gherkin phrase. That separation is
what keeps the suite maintainable as the app grows.

## Isolation & determinism

Flaky tests are usually leaky tests. Three rules keep scenarios independent:

1. **Fresh browser context per scenario.** `Before` opens a new Playwright
   context (its own cookies/storage) and `After` closes it. No shared session.
2. **Reseeded ledger per scenario.** `Before` calls `POST /api/test/reset`, which
   restores the database to a fixed baseline. Run order never matters.
3. **Deterministic seed.** The app seeds the *same* accounts and balances every
   time, so assertions can use exact expected values (`4900.00`), not ranges.

Because scenarios share nothing, they are safe to parallelise (`--parallel N`)
without rework.

## The database layer opens read-only

`LedgerDb` opens the SQLite file with `{ readonly: true, fileMustExist: true }`.
A test must be able to *observe* the system of record but must never be able to
*mutate* it — otherwise a test could paper over a real bug by writing the state
it expects. Read-only makes that impossible by construction.

The DB layer also owns the ledger's global invariant:

```
total money across all accounts is constant across any transfer
```

Every transfer scenario asserts it. It's the cheapest, highest-value check on a
payments system — it catches a whole class of "money created or destroyed" bugs
that per-account assertions can miss.

## Multi-environment by config

`src/config/env.ts` defines three profiles selected by `TEST_ENV`:

| Env | Base URL | Ledger DB | Browser |
|---|---|---|---|
| `local` | localhost | local file | headed |
| `ci` | localhost | local file | headless |
| `uat` | deployed host | *none* | headless |

The same suite runs against a locally-booted app in CI or a deployed instance in
a shared environment — the `dev → sit → uat` progression a real SDLC needs. When
a profile has no local DB (`uat`), the DB-layer steps **skip themselves** rather
than fail, so the UI/API coverage still runs against the remote target.

## The suite owns its System Under Test

For the primary suite, `BeforeAll` boots the app as a child process and waits for
`/api/health`; `AfterAll` tears it down. This makes `npm test` a single
self-contained command with no "remember to start the server" footgun, locally
and in CI alike. The Cypress and Selenium runners get the same guarantee from
`scripts/with-app.js`.

## Reporting & evidence

- **HTML + JSON reports** from Cucumber (`reports/`), uploaded as a CI artifact.
- **Screenshot on failure** — the `After` hook captures a full-page screenshot
  and attaches it to the report, turning "a step failed" into "here is exactly
  what the user saw."
- **CI retry** — one automatic retry in CI only (`retry: CI ? 1 : 0`) absorbs
  genuine infrastructure blips without hiding real, reproducible failures locally.

## Extending it

- **New screen** → add a Page Object under `src/pages`, reference it from steps.
- **New rule** → add a row to the `Scenario Outline` in `payment_validation.feature`
  (UI) or `payments_api.feature` (API). No new code if the phrasing already exists.
- **New environment** → add a profile to `PROFILES` in `env.ts`.
- **New tool** → drop it beside `cypress/` or `selenium/`, reuse the same
  `data-testid` selectors and the `/api/test/reset` isolation hook.
