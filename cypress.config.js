const { defineConfig } = require('cypress');

// Cypress runs one cross-tool smoke against the same app. Its job in this repo
// is proficiency evidence, not primary coverage — the Playwright + Cucumber
// suite is where the real breadth lives.
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
