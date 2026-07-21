import { Given, When, Then } from '@cucumber/cucumber';
import { PaymentsWorld } from '../../src/support/world';
import { CREDENTIALS } from '../../src/config/env';

type UserKey = keyof typeof CREDENTIALS;

Given('I am signed in as {string}', async function (this: PaymentsWorld, user: string) {
  const cred = CREDENTIALS[user as UserKey];
  await this.login.open();
  await this.login.signIn(cred.username, cred.password);
  await this.dashboard.expectLoaded();
});

When(
  'I send a payment of {string} {word} from {string} to {string} with reference {string}',
  async function (
    this: PaymentsWorld,
    amount: string,
    currency: string,
    from: string,
    to: string,
    reference: string
  ) {
    await this.dashboard.makePayment({ fromAccount: from, toAccount: to, amount, currency, reference });
  }
);

Then('the payment should be accepted', async function (this: PaymentsWorld) {
  await this.dashboard.expectSuccess();
});

Then('the payment should be rejected with {string}', async function (this: PaymentsWorld, message: string) {
  await this.dashboard.expectError(message);
});

Then(
  'the payment should appear in my history with reference {string}',
  async function (this: PaymentsWorld, reference: string) {
    await this.dashboard.expectHistoryContains(reference);
  }
);
