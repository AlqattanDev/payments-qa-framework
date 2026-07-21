import { World, IWorldOptions, setWorldConstructor } from '@cucumber/cucumber';
import { Browser, BrowserContext, Page, APIResponse } from '@playwright/test';
import { EnvConfig, loadEnv } from '../config/env';
import { PaymentsApiClient } from '../api/PaymentsApiClient';
import { LedgerDb } from '../db/LedgerDb';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';

/**
 * The Cucumber World is the per-scenario context. One fresh instance per
 * scenario keeps state from leaking between tests. It owns the browser page,
 * the page objects, the API client, and a scratch bag for values a scenario
 * needs to carry across steps (e.g. the ID of a payment it just created).
 */
export class PaymentsWorld extends World {
  readonly env: EnvConfig;

  // Set by hooks before each scenario.
  browser!: Browser;
  context!: BrowserContext;
  page!: Page;
  api!: PaymentsApiClient;

  // Page objects, lazily bound to the current page.
  login!: LoginPage;
  dashboard!: DashboardPage;

  // Scratch state shared across steps within one scenario.
  lastResponse: APIResponse | null = null;
  lastResponseBody: any = null;
  scratch: Record<string, string> = {};

  // The ledger total at scenario start; "unchanged" assertions compare to it.
  baselineTotalCents: number | null = null;

  constructor(options: IWorldOptions) {
    super(options);
    this.env = loadEnv();
  }

  bindPage(page: Page): void {
    this.page = page;
    this.login = new LoginPage(page, this.env.baseURL);
    this.dashboard = new DashboardPage(page);
  }

  /** True when this environment exposes the ledger file for DB assertions. */
  get hasDb(): boolean {
    return this.env.dbPath !== null;
  }

  /**
   * Run a query against a fresh read-only ledger connection and close it. A new
   * connection per assertion always sees the app's latest committed WAL state.
   */
  withLedger<T>(fn: (db: LedgerDb) => T): T {
    if (!this.env.dbPath) throw new Error('This environment has no local ledger for DB assertions.');
    const db = new LedgerDb(this.env.dbPath);
    try {
      return fn(db);
    } finally {
      db.close();
    }
  }
}

setWorldConstructor(PaymentsWorld);
