const { defineConfig } = require('cypress');

// Cypress runs a cross-tool smoke against the same app. The Playwright +
// Cucumber suite carries the actual coverage.
module.exports = defineConfig({
  e2e: {
    baseUrl: process.env.BASE_URL || 'http://127.0.0.1:3300',
    supportFile: false,
    fixturesFolder: false,
    video: false,
    screenshotOnRunFailure: false,
    specPattern: 'cypress/e2e/**/*.cy.js',
  },
});
