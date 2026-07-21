import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object for the authenticated dashboard: account balances, the payment
 * form, and the payment history table.
 */
export class DashboardPage {
  private readonly fromAccount: Locator;
  private readonly toAccount: Locator;
  private readonly amount: Locator;
  private readonly currency: Locator;
  private readonly reference: Locator;
  private readonly submit: Locator;
  private readonly error: Locator;
  private readonly success: Locator;

  constructor(private readonly page: Page) {
    this.fromAccount = page.getByTestId('from-account');
    this.toAccount = page.getByTestId('to-account');
    this.amount = page.getByTestId('amount');
    this.currency = page.getByTestId('currency');
    this.reference = page.getByTestId('reference');
    this.submit = page.getByTestId('pay-submit');
    this.error = page.getByTestId('payment-error');
    this.success = page.getByTestId('payment-success');
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page.getByTestId('dashboard-view')).toBeVisible();
  }

  async balanceText(accountId: string): Promise<string> {
    return (await this.page.getByTestId(`balance-${accountId}`).innerText()).trim();
  }

  async makePayment(input: {
    fromAccount: string;
    toAccount: string;
    amount: string;
    currency: string;
    reference: string;
  }): Promise<void> {
    await this.fromAccount.selectOption(input.fromAccount);
    await this.toAccount.fill(input.toAccount);
    await this.amount.fill(input.amount);
    await this.currency.selectOption(input.currency);
    await this.reference.fill(input.reference);
    await this.submit.click();
    // Settle on an outcome before returning. Without this, a following step
    // could interact while the async submit is still resetting the form.
    await Promise.race([
      this.success.waitFor({ state: 'visible' }),
      this.error.waitFor({ state: 'visible' }),
    ]);
  }

  async expectSuccess(): Promise<void> {
    await expect(this.success).toBeVisible();
    await expect(this.success).toContainText(/Payment .* sent/);
  }

  async expectError(message: string | RegExp): Promise<void> {
    await expect(this.error).toBeVisible();
    await expect(this.error).toContainText(message);
  }

  historyRow(paymentIdOrAccount: string): Locator {
    return this.page.getByTestId(`payment-row-${paymentIdOrAccount}`);
  }

  async expectHistoryContains(reference: string): Promise<void> {
    await expect(this.page.getByTestId('history-table')).toContainText(reference);
  }
}
