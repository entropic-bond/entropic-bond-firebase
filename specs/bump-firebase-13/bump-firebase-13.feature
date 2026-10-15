Feature: Bump firebase to ^13 (bump-firebase-13)

  Scenario: Declare the firebase dependency as ^13. [REQ-1]
    Given the package manifest
    Then it declares the firebase dependency as '^13.0.0'

  Scenario: Resolve firebase to a v13 release from the lockfile. [REQ-2]
    Given the lockfile
    Then it pins the firebase package to a 13.x version
    And its root dependency map matches the package manifest

  Scenario: Leave every other dependency untouched. [REQ-3]
    Given the package manifest before the bump
    When the firebase dependency is bumped to ^13
    Then every other declared dependency keeps its pre-bump version

  Scenario: Typecheck the bumped sources cleanly. [REQ-4]
    Given the sources importing firebase v13
    When 'npx tsc --noEmit' runs
    Then it reports no errors

  Scenario: Run the emulator test suite green against v13. [REQ-5]
    Given the bumped sources
    When 'npm test' runs against the firebase emulators
    Then the whole suite passes

  Scenario: Build the library cleanly against v13. [REQ-6]
    Given the bumped sources
    When 'npm run build' runs
    Then it completes without errors
