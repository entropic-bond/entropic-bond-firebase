Feature: Bump entropic-bond to the latest v2.x release (2.0.4)

  Scenario: Root manifest declares the new entropic-bond range. [REQ-1]
    Given the root "package.json"
    Then the "entropic-bond" dependency range is "^2.0.4"

  Scenario: Root lockfile resolves the new entropic-bond version. [REQ-2]
    Given the root "package-lock.json"
    Then the locked "entropic-bond" version is "2.0.4"

  Scenario: Functions manifest declares the new entropic-bond range. [REQ-3]
    Given the "functions/package.json" manifest
    Then the "entropic-bond" dependency range is "^2.0.4"

  Scenario: Functions lockfile resolves the new entropic-bond version. [REQ-4]
    Given the "functions/package-lock.json" lockfile
    Then the locked "entropic-bond" version is "2.0.4"

  Scenario: No other dependency is modified. [REQ-5]
    Given the change set of both manifests and lockfiles
    Then only "entropic-bond" entries differ from the base branch

  Scenario: Test suite passes with the bumped dependency. [REQ-6]
    Given the working tree with "entropic-bond" resolved to "2.0.4"
    When "npm test" runs
    Then the test suite passes

  Scenario: Build passes with the bumped dependency. [REQ-7]
    Given the working tree with "entropic-bond" resolved to "2.0.4"
    When "npm run build" runs
    Then the build succeeds
