import { Given, When, Then } from '@cucumber/cucumber';
import { PaymentsWorld } from '../../src/support/world';
import { CREDENTIALS } from '../../src/config/env';

type UserKey = keyof typeof CREDENTIALS;

Given('the sign-in page is open', async function (this: PaymentsWorld) {
  await this.login.open();
});

When('I sign in as {string}', async function (this: PaymentsWorld, user: string) {
  const cred = CREDENTIALS[user as UserKey];
  await this.login.signIn(cred.username, cred.password);
});

When(
  'I sign in as {string} with password {string}',
  async function (this: PaymentsWorld, user: string, password: string) {
    const cred = CREDENTIALS[user as UserKey];
    await this.login.signIn(cred.username, password);
  }
);

Then('I should land on my dashboard', async function (this: PaymentsWorld) {
  await this.dashboard.expectLoaded();
});

Then('I should see the sign-in error {string}', async function (this: PaymentsWorld, message: string) {
  await this.login.expectError(message);
});
