Feature: Full query snapshot in onCollectionChange (gh-issue-3)

  Scenario: Deliver the full current query result as the second listener argument. Issue: #3. [REQ-1]
    Given a model subscribed via onCollectionChange to a query
    When the query result set is notified to the listener
    Then the listener receives the delta changes as first argument
    And the listener receives the full current query result as second argument

  Scenario: Report a document removed from the query as a delete change. Issue: #3. [REQ-2]
    Given a model subscribed via onCollectionChange to a query containing a document
    When the document is deleted
    Then the listener receives a change with type 'delete' for that document

  Scenario: Exclude a removed document from the snapshot of the delete change. Issue: #3. [REQ-3]
    Given a model subscribed via onCollectionChange to a query containing a document
    When the document is deleted
    Then the snapshot received with the delete change does not contain the document

  Scenario: Document the change notification semantics for consumers. Issue: #3. [REQ-4]
    Given the public documentation of the change listener methods
    Then it states the before/after semantics of document changes
    And it states that the collection snapshot is the full current query result
