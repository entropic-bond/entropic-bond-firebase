Feature: Document change existence semantics (gh-issue-2)

  Scenario: Do not emit a change for a not-yet-created document REQ-1
    Given a model subscribed via onDocumentChange to a document id that has never been created
    When the initial snapshot is delivered and the document is later created
    Then the listener receives no change for the empty initial snapshot
    And the listener only receives changes once the document exists

  Scenario: Emit delete when an existing document is deleted REQ-2
    Given a model subscribed to existing document 'user6' via onDocumentChange
    When the document is deleted
    Then the listener receives a change with type 'delete'
    And after is undefined

  Scenario: Keep update type for existing documents REQ-3
    Given a model subscribed to existing document 'user6' via onDocumentChange
    When the document is saved
    Then the listener receives a change with type 'update'
    And after contains the saved document

  Scenario: Expose existence state on emitted changes REQ-4
    Given a model subscribed to existing document 'user6' via onDocumentChange
    When the document is updated
    Then the change exposes params.exists equal to true
    When the document is deleted
    Then the change exposes params.exists equal to false