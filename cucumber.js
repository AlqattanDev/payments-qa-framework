// Cucumber-JS runtime configuration. ts-node compiles the TypeScript step
// definitions and support code on the fly, so there is no build step to run
// the suite. The HTML and JSON formatters produce the shareable report.
module.exports = {
  default: {
    requireModule: ['ts-node/register'],
    require: ['src/support/**/*.ts', 'features/step_definitions/**/*.ts'],
    paths: ['features/**/*.feature'],
    format: [
      'summary',
      'progress',
      'html:reports/cucumber-report.html',
      'json:reports/cucumber-report.json',
    ],
    formatOptions: { snippetInterface: 'async-await' },
    retry: process.env.CI ? 1 : 0,
  },
};
