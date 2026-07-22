import { APIRequestContext, request, APIResponse } from '@playwright/test';

// Typed client over the Ledgerline HTTP API. Backs the API-level scenarios and
// the out-of-band setup the UI scenarios need (reseeding, logging in).

export interface LoginResult {
  token: string;
  username: string;
  displayName: string;
}

export interface PaymentInput {
  fromAccount: string;
  toAccount: string;
  amountCents: number | null;
  currency: string;
  reference: string;
}

export class PaymentsApiClient {
  private constructor(
    private readonly ctx: APIRequestContext,
    private token: string | null = null
  ) {}

  static async create(baseURL: string): Promise<PaymentsApiClient> {
    const ctx = await request.newContext({ baseURL });
    return new PaymentsApiClient(ctx);
  }

  async dispose(): Promise<void> {
    await this.ctx.dispose();
  }

  withToken(token: string | null): this {
    this.token = token;
    return this;
  }

  private headers(): Record<string, string> {
    return this.token ? { Authorization: `Bearer ${this.token}` } : {};
  }

  /** Reseed the ledger to its baseline. Called from the Before hook. */
  async resetLedger(): Promise<void> {
    const res = await this.ctx.post('/api/test/reset');
    if (!res.ok()) throw new Error(`Ledger reset failed: HTTP ${res.status()}`);
  }

  async login(username: string, password: string): Promise<APIResponse> {
    return this.ctx.post('/api/login', { data: { username, password } });
  }

  async loginAs(username: string, password: string): Promise<LoginResult> {
    const res = await this.login(username, password);
    if (!res.ok()) throw new Error(`Login failed for ${username}: HTTP ${res.status()}`);
    const body = (await res.json()) as LoginResult;
    this.token = body.token;
    return body;
  }

  async getAccounts(): Promise<APIResponse> {
    return this.ctx.get('/api/accounts', { headers: this.headers() });
  }

  async createPayment(input: PaymentInput): Promise<APIResponse> {
    return this.ctx.post('/api/payments', { headers: this.headers(), data: input });
  }

  async getPayments(): Promise<APIResponse> {
    return this.ctx.get('/api/payments', { headers: this.headers() });
  }
}
