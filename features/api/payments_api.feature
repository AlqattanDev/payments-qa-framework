@api
Feature: Payments API
  The HTTP API is the contract the web UI and any integration depends on.
  Hitting it directly is faster than driving a browser and pins the contract:
  status codes, error codes, and the ledger effect.

  Background:
    Given the API ledger is reset
    And I am authenticated via the API as "alice"

  @smoke
  Scenario: Create a payment over the API
    When I POST a payment of 25000 cents USD from "ACC-1001" to "ACC-2001" with reference "API transfer"
    Then the API responds with status 201
    And the response payment status is "COMPLETED"
    And the ledger balance of "ACC-1001" should be "4750.00" USD

  Scenario: An unauthenticated payment is refused
    Given I am not authenticated
    When I POST a payment of 1000 cents USD from "ACC-1001" to "ACC-2001" with reference "no auth"
    Then the API responds with status 401
    And the API error code is "UNAUTHORIZED"

  Scenario Outline: The API rejects invalid payments with the right code
    When I POST a payment of <amount> cents <currency> from "<from>" to "<to>" with reference "<reference>"
    Then the API responds with status <status>
    And the API error code is "<code>"

    Examples:
      | from     | to       | amount | currency | reference | status | code              |
      | ACC-1001 | ACC-1001 | 5000   | USD      | self send | 400    | SAME_ACCOUNT      |
      | ACC-1001 | ACC-2001 | -5     | USD      | negative  | 400    | INVALID_AMOUNT    |
      | ACC-1001 | ACC-2001 | 5000   | EUR      | fx swap   | 422    | CURRENCY_MISMATCH |
      | ACC-1001 | ACC-9999 | 5000   | USD      | ghost     | 404    | ACCOUNT_NOT_FOUND |
