import {
  Before,
  After,
  BeforeAll,
  AfterAll,
  Status,
  setDefaultTimeout,
  ITestCaseHookParameter,
} from '@cucumber/cucumber';
import { chromium, Browser } from '@playwright/test';
import { PaymentsWorld } from './world';
import { PaymentsApiClient } from '../api/PaymentsApiClient';
import { loadEnv } from '../config/env';
import { startApp, stopApp } from './appServer';

setDefaultTimeout(30_000);

let browser: Browser;

BeforeAll(async function () {
  const env = loadEnv();
  await startApp(env.baseURL, env.name);
  browser = await chromium.launch({ headless: env.headless });
});

AfterAll(async function () {
  await browser?.close();
  await stopApp();
});

// Fresh browser context and a reseeded ledger before every scenario, which is
// what makes them order-independent and safe to run in parallel.
Before(async function (this: PaymentsWorld) {
  this.browser = browser;
  this.context = await browser.newContext();
  const page = await this.context.newPage();
  this.bindPage(page);

  this.api = await PaymentsApiClient.create(this.env.baseURL);
  await this.api.resetLedger();

  // Record the starting ledger total so "total unchanged" checks have a baseline.
  if (this.hasDb) {
    this.baselineTotalCents = this.withLedger((db) => db.totalBalanceCents());
  }
});

// On failure, attach a screenshot to the report so a red step comes with the
// screen that produced it.
After(async function (this: PaymentsWorld, scenario: ITestCaseHookParameter) {
  if (scenario.result?.status === Status.FAILED && this.page) {
    const png = await this.page.screenshot({ fullPage: true });
    this.attach(png, 'image/png');
  }
  await this.api?.dispose();
  await this.context?.close();
});
