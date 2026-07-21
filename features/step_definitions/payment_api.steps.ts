import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { PaymentsWorld } from '../../src/support/world';
import { CREDENTIALS } from '../../src/config/env';

type UserKey = keyof typeof CREDENTIALS;

Given('the API ledger is reset', async function (this: PaymentsWorld) {
  await this.api.resetLedger();
  if (this.hasDb) this.baselineTotalCents = this.withLedger((db) => db.totalBalanceCents());
});

Given('I am authenticated via the API as {string}', async function (this: PaymentsWorld, user: string) {
  const cred = CREDENTIALS[user as UserKey];
  await this.api.loginAs(cred.username, cred.password);
});

Given('I am not authenticated', function (this: PaymentsWorld) {
  this.api.withToken(null);
});

When(
  'I POST a payment of {int} cents {word} from {string} to {string} with reference {string}',
  async function (
    this: PaymentsWorld,
    amountCents: number,
    currency: string,
    from: string,
    to: string,
    reference: string
  ) {
    this.lastResponse = await this.api.createPayment({
      fromAccount: from,
      toAccount: to,
      amountCents,
      currency,
      reference,
    });
    this.lastResponseBody = await this.lastResponse.json().catch(() => ({}));
  }
);

Then('the API responds with status {int}', function (this: PaymentsWorld, status: number) {
  expect(this.lastResponse, 'a request must have been sent').not.toBeNull();
  expect(this.lastResponse!.status()).toBe(status);
});

Then('the response payment status is {string}', function (this: PaymentsWorld, status: string) {
  expect(this.lastResponseBody?.payment?.status).toBe(status);
});

Then('the API error code is {string}', function (this: PaymentsWorld, code: string) {
  expect(this.lastResponseBody?.code).toBe(code);
});
