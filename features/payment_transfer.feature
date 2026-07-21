@ui
Feature: Sending a payment
  A completed transfer must be true in two places at once: what the customer
  sees on screen, and what the ledger of record holds. These scenarios assert
  both — the UI outcome and the database state behind it.

  Background:
    Given I am signed in as "alice"

  @smoke
  Scenario: A valid transfer completes and moves money
    When I send a payment of "100.00" USD from "ACC-1001" to "ACC-2001" with reference "Invoice 4471"
    Then the payment should be accepted
    And the payment should appear in my history with reference "Invoice 4471"
    And the ledger balance of "ACC-1001" should be "4900.00" USD
    And the total balance across all accounts should be unchanged

  Scenario: Two transfers debit the source cumulatively
    When I send a payment of "100.00" USD from "ACC-1001" to "ACC-2001" with reference "First slice"
    And I send a payment of "50.00" USD from "ACC-1001" to "ACC-2001" with reference "Second slice"
    Then the ledger balance of "ACC-1001" should be "4850.00" USD
    And the total balance across all accounts should be unchanged
