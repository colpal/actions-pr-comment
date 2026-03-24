# actions-pr-comment Test Suite

## Test Coverage

- **Coverage Reports:** The test suite generates coverage reports using Jest.
- **Metrics Provided:** Reports include line coverage, function coverage, branch coverage, and statement coverage.
- **Viewing Coverage:** After running tests, view the coverage summary in the terminal or open the `coverage/lcov-report/index.html` file for a detailed report.
- **Test Count:** The suite currently contains multiple test files, with each file comprising several individual tests.
- **Suite Count:** Tests are organized into suites using Jest's `describe` blocks, allowing for grouped functionality checks.
- **Maintaining Coverage:** Aim to keep line coverage above 95% to ensure reliability. Add tests for new features and edge cases to maintain high coverage.

## Current Test Coverage and Status

- **Coverage Level:** The latest coverage report shows 100% for lines, statements, branches, and functions across all files.
- **Test Suite Count:** There are 8 test suites in the project.
- **Test Count:** The test suite contains a total of 81 individual tests.
- **Passing Tests:** All tests are currently passing, with no failing or skipped tests.
- **Recent Changes:** Coverage has been maintained at 100% after recent updates.
- **Continuous Integration:** Tests and coverage checks are run automatically on each pull request to ensure code quality.

## Continuous Integration Workflow

The [.github/workflows/test-and-coverage.yaml](../.github/workflows/test-and-coverage.yaml) workflow runs on pull requests targeting `main`. It:

- installs dependencies with `npm ci` on `ubuntu-latest`
- executes the Jest suite with a 95% minimum threshold for branches, functions, lines, and statements
- uploads the generated `coverage/` directory as a build artifact for review

The workflow fails if tests break or coverage drops below the enforced threshold, keeping the action codebase healthy.

## How to Run Tests

1. **Install Dependencies:**  
    Run `npm install` to install all required packages.

2. **Run Tests:**  
    Execute `npm run test` to run the test suite.

3. **View Coverage:**  
    After tests complete, open `coverage/lcov-report/index.html` in your browser for a detailed coverage report.
    - `npm run test -- --coverage` to view coverage overview in terminal

## Adding New Tests

- Place new test files in the `tests` directory.
- Use Jest's `describe` and `it` blocks to organize and write tests.
- Ensure new features and edge cases are covered to maintain high coverage.

## Troubleshooting

- If tests fail, check error messages in the terminal for details.
- Ensure all dependencies are installed and up to date.
- For coverage issues, verify that all code paths are tested.

## Manual Testing
Within the [.github/workflows](.github/workflows) directory, there are test workflows that demonstrate most configurations of this action. They are grouped by functionality and can be added to an open pull request by attaching a matching label to it. The workflow will run and post comments to the pull request on label attachment, pushes to the branch, and when the pull request is opened (such that closing and reopening will maintain the label and trigger a pull-request open event). There is no automatic mechanism for reading the output and ensuring it is correct, it is up to the tester to verify the output.
- [Test Comment Conclusions](.github/workflows/test-comment-conclusions.yaml)
  - Tests `conclusion` functionality
  - Label: `test-conclusions`
- [Test Comment Inputs](.github/workflows/test-comment-inputs.yaml)
  - Tests `comment-body`, `comment-body-path`, and `render-markdown` functionality
  - Label: `test-inputs`
- [Test Comment Sync Conclusions](.github/workflows/test-comment-sync-conclusions.yaml)
  - Tests `sync-conclusion` functionality
  - Label: `test-sync-conclusions`
- [Test Update Mode](.github/workflows/test-comment-update-mode.yaml)
  - Tests `update-mode` functionality
  - Label: `test-update-mode`