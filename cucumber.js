// ts-node compiles the step definitions and support code on the fly, so running
// the suite needs no build step.
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
