import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object for the sign-in screen.
 *
 * Selectors live here and nowhere else. When the UI changes, one file changes,
 * not fifty step definitions — that encapsulation is the whole reason page
 * objects exist. Steps read as intent ("sign in as Alice"); the how stays here.
 */
export class LoginPage {
  private readonly username: Locator;
  private readonly password: Locator;
  private readonly submit: Locator;
  private readonly error: Locator;

  constructor(private readonly page: Page, private readonly baseURL: string) {
    this.username = page.getByTestId('username');
    this.password = page.getByTestId('password');
    this.submit = page.getByTestId('login-submit');
    this.error = page.getByTestId('login-error');
  }

  async open(): Promise<void> {
    await this.page.goto(this.baseURL);
    await expect(this.page.getByTestId('login-view')).toBeVisible();
  }

  async signIn(username: string, password: string): Promise<void> {
    await this.username.fill(username);
    await this.password.fill(password);
    await this.submit.click();
  }

  async expectError(message: string | RegExp): Promise<void> {
    await expect(this.error).toBeVisible();
    await expect(this.error).toContainText(message);
  }
}
