Feature: Per-query pagination cursors in FirebaseDatasource. Issue: #4

  Background:
    Given a FirebaseDatasource backed by the Firestore emulator
    And a "TestUser" collection containing ordered documents "user1" to "user6"

  Scenario: Continue a model's own query with next. Issue: #4 [REQ-1]
    Given a model for the "TestUser" collection
    When the model finds the first 2 documents
    And the model requests the next page
    Then the model receives documents "user3" and "user4"

  Scenario: Interleaved pagination on two models of one collection keeps each result set. Issue: #4 [REQ-2]
    Given two models for the "TestUser" collection
    When the first model finds the first 2 documents
    And the second model finds the first 3 documents
    And the first model requests the next page
    And the second model requests the next page
    Then the first model receives documents "user3" and "user4"
    And the second model receives documents "user4", "user5" and "user6"

  Scenario: Interleaved pagination across collections does not mix result sets. Issue: #4 [REQ-3]
    Given a model for the "TestUser" collection
    And a model for the "SubClass" collection
    When the "TestUser" model finds the first 2 documents
    And the "SubClass" model finds the first document
    And the "TestUser" model requests the next page
    Then the "TestUser" model receives documents "user3" and "user4"

  Scenario: Re-running a query resets pagination for that model only. Issue: #4 [REQ-4]
    Given two models for the "TestUser" collection
    When the first model finds the first 2 documents
    And the second model finds the first 2 documents
    And the first model finds all documents
    And the second model requests the next page
    Then the second model receives documents "user3" and "user4"
