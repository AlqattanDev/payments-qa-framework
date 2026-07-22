'use strict';

/**
 * The same journey as the Cucumber and Cypress smokes, in Selenium WebDriver:
 * reset the ledger, sign in, send a payment, assert the on-screen result.
 * selenium-webdriver 4 resolves chromedriver itself. Plain script rather than a
 * test runner to keep the dependency surface small; exits non-zero on failure.
 */

const http = require('http');
const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3300';

function resetLedger() {
  return new Promise((resolve, reject) => {
    const url = new URL('/api/test/reset', BASE);
    const req = http.request(url, { method: 'POST' }, (res) => {
      res.resume();
      res.statusCode === 200 ? resolve() : reject(new Error(`reset HTTP ${res.statusCode}`));
    });
    req.on('error', reject);
    req.end();
  });
}

async function css(driver, testId) {
  return driver.findElement(By.css(`[data-testid=${testId}]`));
}

(async () => {
  await resetLedger();

  const options = new chrome.Options().addArguments(
    '--headless=new',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--window-size=1280,800'
  );
  if (process.env.CHROME_BIN) options.setChromeBinaryPath(process.env.CHROME_BIN);

  const driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
  try {
    await driver.get(BASE);

    await (await css(driver, 'username')).sendKeys('alice');
    await (await css(driver, 'password')).sendKeys('Password123!');
    await (await css(driver, 'login-submit')).click();

    const dashboard = await css(driver, 'dashboard-view');
    await driver.wait(until.elementIsVisible(dashboard), 10000);

    // The dashboard renders before its data arrives, so the account dropdown is
    // briefly empty. Typing into the form before then submits a blank source
    // account. This is the explicit wait Playwright would have done for us.
    const fromAccount = await css(driver, 'from-account');
    await driver.wait(
      async () => (await fromAccount.getAttribute('value')) !== '',
      10000,
      'accounts never loaded into the payment form'
    );

    await (await css(driver, 'to-account')).sendKeys('ACC-2001');
    await (await css(driver, 'amount')).sendKeys('60.00');
    await (await css(driver, 'reference')).sendKeys('Selenium smoke');
    await (await css(driver, 'pay-submit')).click();

    const success = await css(driver, 'payment-success');
    await driver.wait(until.elementIsVisible(success), 10000);
    const text = await success.getText();
    if (!/sent/i.test(text)) throw new Error(`unexpected success text: "${text}"`);

    console.log('Selenium smoke passed:', text);
  } finally {
    await driver.quit();
  }
})().catch((err) => {
  console.error('Selenium smoke FAILED:', err.message);
  process.exit(1);
});
