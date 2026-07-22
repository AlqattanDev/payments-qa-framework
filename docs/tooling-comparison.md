# Selenium vs Cypress vs Playwright, and where Cucumber fits

Notes on why this repo is built the way it is.

## The distinction people get wrong

Selenium, Cypress and Playwright are all ways to drive a browser. You pick one.
Cucumber is how you describe the test in business language, and it sits on top
of whichever driver you chose. It is not an alternative to them.

So a real stack is "Cucumber + Playwright" or "Cucumber + Selenium", never
"Cucumber vs Playwright". This repo pairs Cucumber with Playwright and adds a
Cypress and a Selenium smoke to show the same journey ports across drivers.

## The three drivers

| | Selenium | Cypress | Playwright |
|---|---|---|---|
| Architecture | W3C WebDriver, out of process | Runs inside the browser event loop | CDP, out of process |
| Languages | Java, C#, Python, JS, Ruby | JavaScript/TypeScript only | JS/TS, Python, Java, C# |
| Browsers | All major, plus older estates | Chromium, Firefox, WebKit-ish | Chromium, Firefox, WebKit |
| Waiting | Manual or explicit waits | Auto-retries commands | Auto-waits on actionability |
| Cross-origin and tabs | Full support | Historically limited | Full support |
| API testing | Separate library | Yes (`cy.request`) | Yes (built-in request context) |
| Parallelism | Grid or runner | Paid dashboard or plugins | Built in, free |
| Best when | Broad browser/language matrix, legacy | Fast dev feedback, component tests | New suites wanting speed and breadth |

## Why Playwright is the default here

One library drives the browser and makes the HTTP calls, so the UI and API
layers share a dependency and a mental model. Auto-waiting removes the biggest
single source of flake, with no `sleep` and no hand-tuned explicit waits. And
parallelism and tracing come for free.

## Where the other two still win

Selenium: enterprises, banks especially, run large legacy estates and need a
broad browser and language matrix. Knowing it means you can maintain and migrate
what exists rather than rewrite it blindly. The cost is manual waits and more
setup, which is exactly the flake the newer tools designed away.

Cypress: excellent developer experience for fast feedback and component tests,
with time-travel debugging. Being JS-only, single-tab, and historically weaker
on cross-origin is why it's a smoke here rather than the backbone.

## Picking one for a new payments suite

Playwright plus Cucumber: Cucumber so QA and business can read and review the
scenarios, Playwright for fast, low-flake execution across UI and API in one
tool. An org with a large Selenium estate is better served by modernising it
than rewriting it, and Cypress earns its place where developers want quick
component-level feedback. The driver is an implementation detail below the
Gherkin, which is rather the point of BDD.
