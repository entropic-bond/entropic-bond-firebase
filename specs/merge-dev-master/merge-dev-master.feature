Feature: Merge development into master (fb-merge-dev-master)

  Scenario: Keep the entropic-bond dependency at the master release version. [REQ-1]
    Given the merged package manifest
    Then it declares the entropic-bond dependency as '^2.0.5'
    And it does not declare the development-side '^1.61.1' downgrade

  Scenario: Keep the lockfile consistent with the kept manifest. [REQ-2]
    Given the merged lockfile
    When a clean install is performed from it
    Then the install succeeds without modifying it
    And it resolves entropic-bond to a version satisfying '^2.0.5'

  Scenario: Keep the cursor-based 2.0 pagination behavior. [REQ-3]
    Given the merged FirebaseDatasource
    When the pagination scenarios run
    Then each model's next page continues its own query position
    And re-running a query resets pagination for that model only

  Scenario: Bring over the gh-issue-3 spec artifacts missing on master. [REQ-4]
    Given the merged working tree
    Then the gh-issue-3 feature file is present
    And the gh-issue-3 design document is present

  Scenario: Port the gh-issue-3 listener coverage against the merged API. [REQ-5]
    Given the merged change listener implementation
    When the test suite runs
    Then every gh-issue-3 scenario's test passes against the merged QueryCursor-era API

  Scenario: Typecheck the merged tree cleanly. [REQ-6]
    Given the merged sources
    When 'npx tsc --noEmit' runs
    Then it reports no errors

  Scenario: Build the merged tree cleanly. [REQ-7]
    Given the merged sources
    When 'npm run build' runs
    Then it completes without errors

  Scenario: Run the full test suite green. [REQ-8]
    Given the merged tree
    When 'npm test' runs
    Then the whole suite passes, master's baseline plus the ported coverage

  Scenario: Preserve both branch histories in the integration. [REQ-9]
    Given the integration commit on the task branch
    Then it is a merge commit with development and master as parents
