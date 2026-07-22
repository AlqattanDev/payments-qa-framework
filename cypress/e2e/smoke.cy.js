/// <reference types="cypress" />

// The same sign-in, pay, verify journey the Cucumber suite owns, written in
// Cypress. The shared data-testid selectors and the ledger-reset endpoint carry
// straight across runners.

describe('Ledgerline payments (Cypress smoke)', () => {
  beforeEach(() => {
    cy.request('POST', '/api/test/reset'); // isolate every test from the last
  });

  it('signs in and completes a payment', () => {
    cy.visit('/');

    cy.get('[data-testid=username]').type('alice');
    cy.get('[data-testid=password]').type('Password123!');
    cy.get('[data-testid=login-submit]').click();
    cy.get('[data-testid=dashboard-view]').should('be.visible');

    cy.get('[data-testid=from-account]').select('ACC-1001');
    cy.get('[data-testid=to-account]').clear().type('ACC-2001');
    cy.get('[data-testid=amount]').type('75.00');
    cy.get('[data-testid=currency]').select('USD');
    cy.get('[data-testid=reference]').type('Cypress smoke');
    cy.get('[data-testid=pay-submit]').click();

    cy.get('[data-testid=payment-success]').should('contain.text', 'sent');
    cy.get('[data-testid=history-table]').should('contain.text', 'Cypress smoke');
  });

  it('rejects an underfunded transfer', () => {
    cy.visit('/');
    cy.get('[data-testid=username]').type('alice');
    cy.get('[data-testid=password]').type('Password123!');
    cy.get('[data-testid=login-submit]').click();

    cy.get('[data-testid=from-account]').select('ACC-1001');
    cy.get('[data-testid=to-account]').clear().type('ACC-2001');
    cy.get('[data-testid=amount]').type('999999.99');
    cy.get('[data-testid=currency]').select('USD');
    cy.get('[data-testid=reference]').type('over budget');
    cy.get('[data-testid=pay-submit]').click();

    cy.get('[data-testid=payment-error]').should('contain.text', 'insufficient funds');
  });
});
