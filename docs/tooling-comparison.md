# Selenium vs Cypress vs Playwright — and where Cucumber fits

An interview cheat-sheet. The role names all four; here's how they actually
relate and how to talk about them without hand-waving.

## The one-line mental model

- **Selenium, Cypress, Playwright** are *how you drive the browser*. Pick one.
- **Cucumber** is *how you describe the test in business language* (BDD). It sits
  **on top of** whichever driver you chose — it is not an alternative to them.

So a real stack is "**Cucumber + Playwright**" or "**Cucumber + Selenium**", never
"Cucumber vs Playwright." This repo pairs Cucumber with Playwright, and adds a
Cypress and a Selenium smoke to show the same journey ports across drivers.

## The three drivers, head to head

| | Selenium | Cypress | Playwright |
|---|---|---|---|
| **Architecture** | W3C WebDriver, out-of-process | Runs inside the browser event loop | Chrome DevTools Protocol, out-of-process |
| **Languages** | Java, C#, Python, JS, Ruby… | JavaScript/TypeScript only | JS/TS, Python, Java, C# |
| **Browsers** | All major + real Safari/IE-era estates | Chromium, Firefox, WebKit-ish | Chromium, Firefox, WebKit |
| **Waiting** | Manual/explicit waits (classic flake source) | Auto-retries commands | Auto-waits on actionability |
| **Cross-origin / tabs** | Full support | Historically limited | Full support |
| **API testing** | No (separate lib) | Yes (`cy.request`) | Yes (built-in request context) |
| **Parallelism** | Via Grid / runner | Paid dashboard or plugins | Built-in, free |
| **Best when** | Broad browser/language matrix, legacy | Fast dev feedback, component tests | New suites wanting speed + breadth |

## Why Playwright is the default here

1. **One tool, UI + API.** The same library drives the browser *and* makes HTTP
   calls, so the UI and API layers share one dependency and one mental model.
2. **Auto-waiting kills the #1 flake source.** No `sleep`, no brittle explicit
   waits — it waits for elements to be actionable.
3. **Free parallelism and tracing** out of the box.

## Why Selenium still matters

Enterprises (banks especially) run large **legacy** Selenium estates and need a
broad browser/language matrix. Knowing Selenium means you can maintain what
exists and migrate it deliberately — not rewrite blindly. Its cost is manual
waits and more setup, which is exactly the flake Playwright/Cypress designed away.

## Why Cypress earns its place

Superb developer experience for fast feedback and component testing, with
time-travel debugging. Its trade-offs — JS-only, one browser tab, historically
weaker cross-origin — are why it's a smoke here rather than the backbone.

## How to answer "which would you pick?"

> "For a new payments suite I'd default to **Playwright + Cucumber**: Cucumber so
> QA and business can read and review the scenarios, Playwright for fast,
> low-flake execution across UI and API in one tool. If the org already had a big
> **Selenium** estate I'd keep and modernise it rather than rewrite, and lean on
> **Cypress** where developers want quick component-level feedback. The driver is
> an implementation detail below the Gherkin — which is the point of BDD."
