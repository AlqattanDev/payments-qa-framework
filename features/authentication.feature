@ui @smoke
Feature: Authentication
  As a Ledgerline customer
  I want to sign in securely
  So that only I can move money from my accounts

  Scenario: A customer signs in with valid credentials
    Given the sign-in page is open
    When I sign in as "alice"
    Then I should land on my dashboard

  Scenario: A wrong password is rejected
    Given the sign-in page is open
    When I sign in as "alice" with password "wrongpass"
    Then I should see the sign-in error "Invalid username or password"
