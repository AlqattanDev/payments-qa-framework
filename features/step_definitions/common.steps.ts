import { Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { PaymentsWorld } from '../../src/support/world';

/** "100.00" -> 10000 cents. Kept in one place so money math never drifts. */
export function dollarsToCents(amount: string): number {
  return Math.round(parseFloat(amount) * 100);
}

// Database-of-record assertions. Shared by UI and API features: whichever path
// created the payment, the ledger must agree.

Then(
  'the ledger balance of {string} should be {string} {word}',
  function (this: PaymentsWorld, accountId: string, amount: string, _currency: string) {
    if (!this.hasDb) return 'skipped';
    const expected = dollarsToCents(amount);
    const actual = this.withLedger((db) => db.balanceCents(accountId));
    expect(actual, `ledger balance of ${accountId}`).toBe(expected);
    return undefined;
  }
);

Then('the total balance across all accounts should be unchanged', function (this: PaymentsWorld) {
  if (!this.hasDb) return 'skipped';
  const total = this.withLedger((db) => db.totalBalanceCents());
  expect(total, 'total ledger balance').toBe(this.baselineTotalCents);
  return undefined;
});
