@ui
Feature: Payment validation
  Every payment is validated before any money moves. One row per rule that
  protects the ledger from an invalid or unauthorized transfer.

  Background:
    Given I am signed in as "alice"

  Scenario Outline: A payment that breaks a rule is rejected
    When I send a payment of "<amount>" <currency> from "<from>" to "<to>" with reference "<reference>"
    Then the payment should be rejected with "<message>"

    Examples:
      | from     | to       | amount    | currency | reference   | message                    |
      | ACC-1001 | ACC-1001 | 50.00     | USD      | self send   | Source and destination     |
      | ACC-1001 | ACC-9999 | 50.00     | USD      | ghost acct  | does not exist             |
      | ACC-1001 | ACC-2001 | 999999.99 | USD      | over budget | insufficient funds         |
      | ACC-1001 | ACC-1003 | 50.00     | USD      | fx mismatch | match the payment currency |
      | ACC-1001 | ACC-2001 | 0.00      | USD      | zero amount | positive                   |
